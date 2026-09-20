import { ProviderAdapter, PlaybackResolution } from '../types';
import { ProviderSearchOptions, ProviderSearchResult, MediaItem } from '../../types/media';
import {
  YouTubeSearchListResponse,
  YouTubeVideoListResponse,
  YouTubeVideoItem,
  YouTubeQuotaTracker,
} from './youtubeTypes';
import { mapYouTubeItem, mapYouTubeVideoDetail } from './youtubeMapper';
import { createCombinedSignal } from '../../engine/controller/signalUtils';
import { validateMediaItem } from '../../engine/validator';

export class YouTubeProvider implements ProviderAdapter {
  readonly id = 'youtube';
  readonly name = 'YouTube';
  readonly description = 'Official YouTube Data API v3 with resilient direct gateway fallback';
  readonly requiresApiKey = false;
  readonly latencyClass = 'fast' as const;
  readonly defaultBudgetMs = 1500;
  readonly capabilities = {
    search: true,
    metadata: true,
    directPlayback: false,
    hls: false,
    embed: true,
  };

  private quotaTracker: YouTubeQuotaTracker = {
    totalRequests: 0,
    estimatedUnitsUsed: 0,
    isQuotaExhausted: false,
    consecutiveErrors: 0,
  };

  public officialKeyStatus: 'not_configured' | 'verified_active' | 'invalid_key' | 'quota_exhausted' = 'not_configured';

  private getApiKey(): string | undefined {
    const raw = process.env.YOUTUBE_API_KEY;
    if (!raw) return undefined;
    const clean = raw.trim().replace(/^['"]|['"]$/g, '');
    return clean.length > 5 ? clean : undefined;
  }

  isConfigured(): boolean {
    return true;
  }

  /**
   * Returns current health/quota status:
   * 'healthy' | 'degraded' | 'quota_exhausted' | 'unconfigured'
   */
  getStatus(): 'unconfigured' | 'quota_exhausted' | 'rate_limited' | 'degraded' | 'healthy' {
    if (this.quotaTracker.isQuotaExhausted && this.quotaTracker.cooldownUntil && Date.now() < this.quotaTracker.cooldownUntil) {
      return 'quota_exhausted';
    }
    if (this.quotaTracker.consecutiveErrors >= 5) {
      return 'degraded';
    }
    return 'healthy';
  }

  /**
   * Execute YouTube Search with 2-tier pipeline:
   * Tier 1: If official YOUTUBE_API_KEY is available, attempt official YouTube Data API v3
   * Tier 2: If official API returns 400 (API_KEY_INVALID), 403 (quota exceeded), or key is missing,
   *         seamlessly execute YouTube Direct Web Gateway search to always return authentic videos.
   */
  async search(options: ProviderSearchOptions): Promise<ProviderSearchResult> {
    const query = options.query.trim();
    if (!query) {
      return { items: [], status: 'ok', total: 0 };
    }

    const apiKey = this.getApiKey();
    const limit = Math.min(Math.max(options.limit || 12, 1), 24);
    const timeoutMs = options.timeoutMs || 2500;
    const { signal, cleanup } = createCombinedSignal(timeoutMs, options.signal);

    try {
      // Tier 1: Try official YouTube Data API if key exists and isn't known invalid
      if (apiKey && this.officialKeyStatus !== 'invalid_key' && !this.quotaTracker.isQuotaExhausted) {
        try {
          const officialResult = await this.searchOfficialApi(query, limit, apiKey, signal);
          if (officialResult && officialResult.items.length > 0) {
            this.officialKeyStatus = 'verified_active';
            this.quotaTracker.consecutiveErrors = 0;
            return officialResult;
          }
        } catch (officialErr: any) {
          console.warn(`[YouTubeProvider] Official API attempt failed: ${officialErr.message}. Transitioning to Direct Gateway.`);
        }
      }

      // Tier 2: Seamless resilient fallback via YouTube Direct Web Gateway
      return await this.searchDirectGateway(query, limit, signal);
    } finally {
      cleanup();
    }
  }

  /**
   * Official YouTube Data API v3 search
   */
  private async searchOfficialApi(
    query: string,
    limit: number,
    apiKey: string,
    signal: AbortSignal
  ): Promise<ProviderSearchResult | null> {
    const searchUrl = new URL('https://www.googleapis.com/youtube/v3/search');
    searchUrl.searchParams.set('part', 'snippet');
    searchUrl.searchParams.set('type', 'video');
    searchUrl.searchParams.set('maxResults', String(limit));
    searchUrl.searchParams.set('q', query);
    searchUrl.searchParams.set('key', apiKey);

    this.quotaTracker.totalRequests++;
    this.quotaTracker.estimatedUnitsUsed += 100;

    const searchRes = await fetch(searchUrl.toString(), {
      signal,
      headers: { Accept: 'application/json' },
    });

    if (searchRes.status === 400) {
      this.officialKeyStatus = 'invalid_key';
      console.warn('[YouTubeProvider] Official API key returned 400 API_KEY_INVALID. Using Direct Gateway.');
      return null;
    }

    if (searchRes.status === 403) {
      this.officialKeyStatus = 'quota_exhausted';
      this.markQuotaExhausted('YouTube quotaExceeded (403)');
      return null;
    }

    if (!searchRes.ok) {
      console.warn(`[YouTubeProvider] Official API returned HTTP ${searchRes.status}`);
      return null;
    }

    const searchData: YouTubeSearchListResponse = await searchRes.json();
    const rawSearchItems = searchData.items || [];
    if (rawSearchItems.length === 0) {
      return { items: [], total: 0, status: 'ok' };
    }

    // Collect all video IDs for batched metadata request
    const videoIds: string[] = [];
    for (const item of rawSearchItems) {
      const vid = item.id?.videoId;
      if (vid && typeof vid === 'string') {
        videoIds.push(vid);
      }
    }

    const videoDetailsMap = new Map<string, YouTubeVideoItem>();
    if (videoIds.length > 0) {
      try {
        const videosUrl = new URL('https://www.googleapis.com/youtube/v3/videos');
        videosUrl.searchParams.set('part', 'snippet,contentDetails,statistics,status');
        videosUrl.searchParams.set('id', videoIds.join(','));
        videosUrl.searchParams.set('key', apiKey);

        this.quotaTracker.totalRequests++;
        this.quotaTracker.estimatedUnitsUsed += 1;

        const videosRes = await fetch(videosUrl.toString(), {
          signal,
          headers: { Accept: 'application/json' },
        });

        if (videosRes.ok) {
          const videosData: YouTubeVideoListResponse = await videosRes.json();
          for (const vItem of videosData.items || []) {
            videoDetailsMap.set(vItem.id, vItem);
          }
        }
      } catch {
        // Fall back to snippets
      }
    }

    const items: MediaItem[] = [];
    for (const searchItem of rawSearchItems) {
      const vid = searchItem.id?.videoId;
      if (!vid) continue;
      const detail = videoDetailsMap.get(vid);
      const mapped = mapYouTubeItem(searchItem, detail);
      if (mapped) {
        items.push(mapped);
      }
    }

    return {
      items,
      total: searchData.pageInfo?.totalResults || items.length,
      nextPage: searchData.nextPageToken || null,
      status: 'ok',
    };
  }

  /**
   * Resilient Direct Gateway: extracts authentic YouTube video results
   */
  private async searchDirectGateway(
    query: string,
    limit: number,
    signal: AbortSignal
  ): Promise<ProviderSearchResult> {
    const url = `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`;

    try {
      const res = await fetch(url, {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
          'Accept-Language': 'en-US,en;q=0.9',
          Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        },
        signal,
      });

      if (!res.ok) {
        return {
          items: [],
          status: 'error',
          error: `YouTube Direct Gateway HTTP ${res.status}`,
        };
      }

      const html = await res.text();
      const match =
        html.match(/ytInitialData\s*=\s*({.+?});\s*(?:<\/script>|var)/s) ||
        html.match(/var ytInitialData\s*=\s*({.+?});/s);

      if (!match) {
        return {
          items: [],
          status: 'error',
          error: 'Could not parse YouTube web response structure',
        };
      }

      const data = JSON.parse(match[1]);
      const contents =
        data.contents?.twoColumnSearchResultsRenderer?.primaryContents?.sectionListRenderer?.contents || [];

      const items: MediaItem[] = [];

      for (const section of contents) {
        const rawItems = section.itemSectionRenderer?.contents || [];
        for (const raw of rawItems) {
          const v = raw.videoRenderer;
          if (!v || !v.videoId) continue;

          const vid = v.videoId;
          const title =
            v.title?.runs?.map((r: any) => r.text).join('') || v.title?.simpleText || 'YouTube Video';
          const description =
            v.detailedMetadataSnippets?.[0]?.snippetText?.runs?.map((r: any) => r.text).join('') || '';
          const channel = v.ownerText?.runs?.[0]?.text || 'YouTube Creator';

          const durationText = v.lengthText?.simpleText || '';
          let duration = 0;
          if (durationText) {
            const parts = durationText.split(':').map(Number);
            if (parts.length === 3) {
              duration = parts[0] * 3600 + parts[1] * 60 + parts[2];
            } else if (parts.length === 2) {
              duration = parts[0] * 60 + parts[1];
            }
          }

          const thumbs = v.thumbnail?.thumbnails || [];
          const thumbUrl =
            thumbs[thumbs.length - 1]?.url || `https://i.ytimg.com/vi/${vid}/hqdefault.jpg`;

          const publishedTimeText =
            v.publishedTimeText?.simpleText ||
            v.publishedTimeText?.runs?.map((r: any) => r.text).join('') ||
            undefined;

          const rawItem: Partial<MediaItem> = {
            id: `youtube:${vid}`,
            provider: 'youtube',
            providerId: vid,
            title,
            description: description || undefined,
            mediaType: 'video',
            thumbnailUrl: thumbUrl,
            sourceUrl: `https://www.youtube.com/watch?v=${vid}`,
            playbackUrl: null,
            embedUrl: `https://www.youtube-nocookie.com/embed/${vid}?autoplay=1&rel=0`,
            duration: duration > 0 ? duration : undefined,
            publishedAt: publishedTimeText,
            creator: channel,
            channel,
            license: {
              name: 'YouTube Standard License',
              url: 'https://www.youtube.com/t/terms',
              commercialUse: false,
              attributionRequired: true,
            },
            metadata: {
              isEmbedOnly: true,
              playerType: 'embed',
              gatewayMode: 'direct_web',
              publishedTimeText,
            },
          };

          const validated = validateMediaItem(rawItem, 'youtube');
          if (validated) {
            items.push(validated);
          }

          if (items.length >= limit) break;
        }
        if (items.length >= limit) break;
      }

      this.quotaTracker.consecutiveErrors = 0;
      return {
        items,
        total: items.length,
        status: 'ok',
      };
    } catch (err: any) {
      if (err.name === 'AbortError') {
        return { items: [], status: 'timeout', error: 'YouTube search timed out' };
      }
      return { items: [], status: 'error', error: err.message || 'YouTube search failed' };
    }
  }

  /**
   * Single video lookup
   */
  async getVideo(providerId: string): Promise<MediaItem | null> {
    return this.getDetails(providerId);
  }

  /**
   * Detailed metadata retrieval for a single YouTube video
   */
  async getDetails(id: string): Promise<MediaItem | null> {
    const cleanId = id.replace(/^youtube:/, '').trim();
    if (!cleanId) return null;

    const apiKey = this.getApiKey();

    // 1. Try official API if configured
    if (apiKey && this.officialKeyStatus !== 'invalid_key') {
      try {
        const url = new URL('https://www.googleapis.com/youtube/v3/videos');
        url.searchParams.set('part', 'snippet,contentDetails,statistics,status');
        url.searchParams.set('id', cleanId);
        url.searchParams.set('key', apiKey);

        const res = await fetch(url.toString(), {
          headers: { Accept: 'application/json' },
        });

        if (res.ok) {
          const data: YouTubeVideoListResponse = await res.json();
          const videoItem = data.items?.[0];
          if (videoItem) {
            return mapYouTubeVideoDetail(videoItem);
          }
        }
      } catch {
        // Fall back to oEmbed
      }
    }

    // 2. Resilient fallback via YouTube oEmbed
    try {
      const oembedUrl = `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${encodeURIComponent(cleanId)}&format=json`;
      const res = await fetch(oembedUrl);
      if (res.ok) {
        const data = await res.json();
        const rawItem: Partial<MediaItem> = {
          id: `youtube:${cleanId}`,
          provider: 'youtube',
          providerId: cleanId,
          title: data.title || 'YouTube Video',
          description: `Video by ${data.author_name || 'YouTube Creator'} on YouTube.`,
          mediaType: 'video',
          thumbnailUrl: data.thumbnail_url || `https://i.ytimg.com/vi/${cleanId}/hqdefault.jpg`,
          sourceUrl: `https://www.youtube.com/watch?v=${cleanId}`,
          playbackUrl: null,
          embedUrl: `https://www.youtube-nocookie.com/embed/${cleanId}?autoplay=1&rel=0`,
          creator: data.author_name || 'YouTube Creator',
          channel: data.author_name || 'YouTube',
          license: {
            name: 'YouTube Standard License',
            url: 'https://www.youtube.com/t/terms',
            commercialUse: false,
            attributionRequired: true,
          },
          metadata: {
            isEmbedOnly: true,
            playerType: 'embed',
            authorUrl: data.author_url,
          },
        };

        return validateMediaItem(rawItem, 'youtube');
      }
    } catch {
      // Return synthetic embed
    }

    return {
      id: `youtube:${cleanId}`,
      provider: 'youtube',
      providerId: cleanId,
      title: `YouTube Video (${cleanId})`,
      mediaType: 'video',
      thumbnailUrl: `https://i.ytimg.com/vi/${cleanId}/hqdefault.jpg`,
      sourceUrl: `https://www.youtube.com/watch?v=${cleanId}`,
      playbackUrl: null,
      embedUrl: `https://www.youtube-nocookie.com/embed/${cleanId}?autoplay=1&rel=0`,
      creator: 'YouTube Creator',
      channel: 'YouTube',
      metadata: { isEmbedOnly: true, playerType: 'embed' },
    };
  }

  /**
   * Playback resolver: YouTube supplies official privacy-enhanced embeds.
   */
  async resolvePlayback(providerId: string): Promise<PlaybackResolution | null> {
    const cleanId = providerId.replace(/^youtube:/, '').trim();
    if (!cleanId) return null;

    const embedUrl = `https://www.youtube-nocookie.com/embed/${cleanId}?autoplay=1&rel=0`;
    const sourceUrl = `https://www.youtube.com/watch?v=${cleanId}`;

    return {
      id: cleanId,
      provider: 'youtube',
      candidates: [
        {
          kind: 'embed',
          url: embedUrl,
          quality: 'auto',
        },
      ],
      selectedCandidateIndex: 0,
      hasDirectStream: false,
      playbackUrl: null,
      embedUrl,
      sourceUrl,
    };
  }

  private markQuotaExhausted(reason: string) {
    this.quotaTracker.isQuotaExhausted = true;
    this.quotaTracker.quotaExhaustedAt = Date.now();
    this.quotaTracker.cooldownUntil = Date.now() + 15 * 60 * 1000;
    this.quotaTracker.lastError = reason;
    console.warn(`[YouTubeProvider] Official quota notice: ${reason}.`);
  }
}
