import { ProviderAdapter, PlaybackResolution, PlaybackCandidate } from '../types';
import { ProviderSearchOptions, ProviderSearchResult, MediaItem } from '../../types/media';
import { mapPexelsVideo } from './mapper';
import { createCombinedSignal } from '../../engine/controller/signalUtils';

export class PexelsProvider implements ProviderAdapter {
  readonly id = 'pexels';
  readonly name = 'Pexels';
  readonly description = 'Free high-definition stock videos for creative & commercial projects';
  readonly requiresApiKey = true;
  readonly latencyClass = 'medium' as const;
  readonly defaultBudgetMs = 1500;
  readonly capabilities = {
    search: true,
    metadata: true,
    directPlayback: true,
    hls: false,
    embed: false,
  };

  private getApiKey(): string | undefined {
    const raw = process.env.PEXELS_API_KEY;
    if (!raw) return undefined;
    const clean = raw.trim().replace(/^['"]|['"]$/g, '');
    return clean.length > 5 ? clean : undefined;
  }

  isConfigured(): boolean {
    return Boolean(this.getApiKey());
  }

  getStatus(): 'unconfigured' | 'healthy' {
    return this.isConfigured() ? 'healthy' : 'unconfigured';
  }

  async search(options: ProviderSearchOptions): Promise<ProviderSearchResult> {
    const apiKey = this.getApiKey();
    if (!apiKey) {
      return {
        items: [],
        status: 'unconfigured',
        error: 'PEXELS_API_KEY not configured in environment',
      };
    }

    const query = options.query.trim();
    if (!query) {
      return { items: [], status: 'ok', total: 0 };
    }

    const page = options.page || 1;
    const limit = Math.min(Math.max(options.limit || 12, 1), 30);
    const timeoutMs = options.timeoutMs || 2500;
    const url = `https://api.pexels.com/videos/search?query=${encodeURIComponent(query)}&per_page=${limit}&page=${page}`;

    const { signal, cleanup } = createCombinedSignal(timeoutMs, options.signal);

    try {
      const res = await fetch(url, {
        headers: {
          Authorization: apiKey,
          'User-Agent': 'OpenTube/1.0',
        },
        signal,
      });

      if (res.status === 429) {
        return {
          items: [],
          status: 'rate_limited',
          error: 'Pexels API rate limit exceeded (429)',
        };
      }

      if (!res.ok) {
        return {
          items: [],
          status: 'error',
          error: `Pexels API returned status ${res.status}`,
        };
      }

      const data = await res.json();
      const rawVideos: any[] = data.videos || [];
      const items: MediaItem[] = [];

      for (const v of rawVideos) {
        const item = mapPexelsVideo(v);
        if (item) items.push(item);
      }

      return {
        items,
        total: data.total_results || items.length,
        nextPage: data.next_page ? page + 1 : null,
        status: 'ok',
      };
    } catch (err: any) {
      if (err.name === 'AbortError') {
        return { items: [], status: 'timeout', error: 'Pexels API request timed out' };
      }
      return { items: [], status: 'error', error: err.message || 'Pexels search failed' };
    } finally {
      cleanup();
    }
  }

  async getDetails(id: string): Promise<MediaItem | null> {
    const apiKey = this.getApiKey();
    if (!apiKey) return null;

    const cleanId = id.replace(/^pexels:/, '').trim();
    const url = `https://api.pexels.com/videos/videos/${encodeURIComponent(cleanId)}`;

    try {
      const res = await fetch(url, {
        headers: { Authorization: apiKey },
      });
      if (!res.ok) return null;
      const data = await res.json();
      return mapPexelsVideo(data);
    } catch {
      return null;
    }
  }

  async resolvePlayback(providerId: string): Promise<PlaybackResolution | null> {
    const apiKey = this.getApiKey();
    const cleanId = providerId.replace(/^pexels:/, '').trim();
    if (!cleanId) return null;

    try {
      let videoData: any = null;
      if (apiKey) {
        const res = await fetch(`https://api.pexels.com/videos/videos/${encodeURIComponent(cleanId)}`, {
          headers: { Authorization: apiKey },
        });
        if (res.ok) {
          videoData = await res.json();
        }
      }

      const rawFiles: any[] = videoData?.video_files || [];
      const candidates: PlaybackCandidate[] = [];

      // Sort files by width/height descending (4K -> 1080p -> 720p -> 360p)
      const sortedFiles = [...rawFiles].sort((a, b) => (b.height || 0) - (a.height || 0));

      for (const f of sortedFiles) {
        if (f.link && (!f.file_type || f.file_type.includes('mp4'))) {
          const label = f.height ? `${f.height}p ${f.quality?.toUpperCase() || 'MP4'}` : f.quality || 'MP4';
          candidates.push({
            kind: 'direct',
            url: f.link,
            mimeType: 'video/mp4',
            quality: label,
            width: f.width,
            height: f.height,
            bitrate: f.fps,
          });
        }
      }

      const sourceUrl = videoData?.url || `https://www.pexels.com/video/${cleanId}/`;
      const bestCandidate = candidates[0] || null;

      if (bestCandidate) {
        return {
          id: cleanId,
          provider: 'pexels',
          candidates,
          selectedCandidateIndex: 0,
          hasDirectStream: true,
          playbackUrl: bestCandidate.url,
          embedUrl: null,
          sourceUrl,
        };
      }

      // Fallback to getDetails
      const details = await this.getDetails(cleanId);
      if (details?.playbackUrl) {
        return {
          id: cleanId,
          provider: 'pexels',
          candidates: [
            {
              kind: 'direct',
              url: details.playbackUrl,
              mimeType: 'video/mp4',
              quality: 'HD Direct MP4',
            },
          ],
          selectedCandidateIndex: 0,
          hasDirectStream: true,
          playbackUrl: details.playbackUrl,
          embedUrl: null,
          sourceUrl: details.sourceUrl,
        };
      }

      return null;
    } catch (err) {
      return null;
    }
  }
}
