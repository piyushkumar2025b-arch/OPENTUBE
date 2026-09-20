import { ProviderAdapter, PlaybackResolution } from '../types';
import { ProviderSearchOptions, ProviderSearchResult, MediaItem } from '../../types/media';
import { createCombinedSignal } from '../../engine/controller/signalUtils';

export class DailymotionProvider implements ProviderAdapter {
  readonly id = 'dailymotion';
  readonly name = 'Dailymotion';
  readonly description = 'Global video sharing platform with news, entertainment, creative cinema, and creator videos';
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

  isConfigured(): boolean {
    return true; // 100% free open REST API, optional key
  }

  getStatus(): 'healthy' {
    return 'healthy';
  }

  async search(options: ProviderSearchOptions): Promise<ProviderSearchResult> {
    const query = (options.query || '').trim();
    if (!query) {
      return { items: [], status: 'ok', total: 0 };
    }

    const page = Math.max(1, options.page || 1);
    const limit = Math.min(Math.max(1, options.limit || 20), 40);
    const timeoutMs = options.timeoutMs || 2500;

    const fields = [
      'id',
      'title',
      'description',
      'duration',
      'thumbnail_360_url',
      'thumbnail_720_url',
      'embed_url',
      'owner.screenname',
      'created_time',
      'url',
    ].join(',');

    const url = `https://api.dailymotion.com/videos?search=${encodeURIComponent(query)}&page=${page}&limit=${limit}&fields=${fields}`;
    const { signal, cleanup } = createCombinedSignal(timeoutMs, options.signal);

    try {
      const headers: Record<string, string> = {
        'User-Agent': 'Mozilla/5.0 (compatible; OpenTube/2.0; +https://opentube.app)',
      };

      const customKey = process.env.DAILYMOTION_API_KEY?.trim();
      if (customKey && customKey.length > 5) {
        headers['Authorization'] = `Bearer ${customKey}`;
      }

      const res = await fetch(url, { headers, signal });
      if (!res.ok) {
        return {
          items: [],
          status: 'error',
          error: `Dailymotion API returned HTTP ${res.status}`,
        };
      }

      const data = await res.json();
      const list = data.list || [];
      const items: MediaItem[] = [];

      for (const item of list) {
        if (!item.id || !item.title) continue;

        const thumb =
          item.thumbnail_720_url ||
          item.thumbnail_360_url ||
          `https://www.dailymotion.com/thumbnail/video/${item.id}`;

        const embedUrl =
          item.embed_url ||
          `https://geo.dailymotion.com/player.html?video=${item.id}`;

        items.push({
          id: `dailymotion:${item.id}`,
          provider: 'dailymotion',
          providerId: item.id,
          title: item.title,
          description: item.description || '',
          mediaType: 'video',
          thumbnailUrl: thumb,
          sourceUrl: item.url || `https://www.dailymotion.com/video/${item.id}`,
          playbackUrl: null,
          embedUrl,
          duration: typeof item.duration === 'number' ? item.duration : 0,
          publishedAt: item.created_time
            ? new Date(item.created_time * 1000).toISOString()
            : undefined,
          creator: item['owner.screenname'] || 'Dailymotion Creator',
          channel: item['owner.screenname'] || 'Dailymotion',
          license: {
            name: 'Standard Dailymotion License',
            url: 'https://www.dailymotion.com/legal/terms',
            commercialUse: false,
            attributionRequired: true,
          },
          metadata: {
            playerType: 'embed',
            isEmbedOnly: true,
          },
        });
      }

      return {
        items,
        total: data.total || items.length,
        nextPage: data.has_more ? page + 1 : null,
        status: 'ok',
      };
    } catch (err: any) {
      if (err.name === 'AbortError') {
        return { items: [], status: 'timeout', error: 'Dailymotion request timed out' };
      }
      return { items: [], status: 'error', error: err.message || 'Dailymotion search failed' };
    } finally {
      cleanup();
    }
  }

  async getDetails(id: string): Promise<MediaItem | null> {
    const cleanId = id.replace(/^(dailymotion:|dm-)/, '').trim();
    if (!cleanId) return null;

    const fields = [
      'id',
      'title',
      'description',
      'duration',
      'thumbnail_720_url',
      'thumbnail_360_url',
      'embed_url',
      'owner.screenname',
      'created_time',
      'url',
    ].join(',');

    try {
      const res = await fetch(`https://api.dailymotion.com/video/${cleanId}?fields=${fields}`, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; OpenTube/2.0; +https://opentube.app)',
        },
        signal: AbortSignal.timeout(3000),
      });

      if (res.ok) {
        const item = await res.json();
        const thumb =
          item.thumbnail_720_url ||
          item.thumbnail_360_url ||
          `https://www.dailymotion.com/thumbnail/video/${cleanId}`;

        return {
          id: `dailymotion:${cleanId}`,
          provider: 'dailymotion',
          providerId: cleanId,
          title: item.title || `Dailymotion Video (${cleanId})`,
          description: item.description || '',
          mediaType: 'video',
          thumbnailUrl: thumb,
          sourceUrl: item.url || `https://www.dailymotion.com/video/${cleanId}`,
          playbackUrl: null,
          embedUrl: item.embed_url || `https://geo.dailymotion.com/player.html?video=${cleanId}`,
          duration: typeof item.duration === 'number' ? item.duration : 0,
          publishedAt: item.created_time
            ? new Date(item.created_time * 1000).toISOString()
            : undefined,
          creator: item['owner.screenname'] || 'Dailymotion Creator',
          channel: item['owner.screenname'] || 'Dailymotion',
          license: {
            name: 'Standard Dailymotion License',
            url: 'https://www.dailymotion.com/legal/terms',
          },
          metadata: { playerType: 'embed', isEmbedOnly: true },
        };
      }
    } catch {
      // Fallback
    }

    return {
      id: `dailymotion:${cleanId}`,
      provider: 'dailymotion',
      providerId: cleanId,
      title: `Dailymotion Video (${cleanId})`,
      mediaType: 'video',
      thumbnailUrl: `https://www.dailymotion.com/thumbnail/video/${cleanId}`,
      sourceUrl: `https://www.dailymotion.com/video/${cleanId}`,
      playbackUrl: null,
      embedUrl: `https://geo.dailymotion.com/player.html?video=${cleanId}`,
      creator: 'Dailymotion Creator',
      channel: 'Dailymotion',
      metadata: { playerType: 'embed', isEmbedOnly: true },
    };
  }

  async resolvePlayback(id: string): Promise<PlaybackResolution | null> {
    const cleanId = id.replace(/^(dailymotion:|dm-)/, '').trim();
    if (!cleanId) return null;

    const embedUrl = `https://geo.dailymotion.com/player.html?video=${cleanId}`;
    return {
      id: cleanId,
      provider: 'dailymotion',
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
      sourceUrl: `https://www.dailymotion.com/video/${cleanId}`,
    };
  }
}
