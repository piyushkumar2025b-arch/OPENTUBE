import { ProviderAdapter, PlaybackResolution } from '../types';
import { ProviderSearchOptions, ProviderSearchResult, MediaItem } from '../../types/media';

interface SomaChannel {
  id: string;
  title: string;
  description: string;
  dj: string;
  genre: string;
  image?: string;
  largeimage?: string;
  listeners?: string;
  lastPlaying?: string;
}

export class SomaFmProvider implements ProviderAdapter {
  readonly id = 'somafm';
  readonly name = 'SomaFM Radio';
  readonly description = 'Iconic commercial-free listener-supported radio channels (Groove Salad, Drone Zone, Secret Agent, DEF CON)';
  readonly requiresApiKey = false;
  readonly latencyClass = 'fast' as const;
  readonly defaultBudgetMs = 1000;
  readonly capabilities = {
    search: true,
    metadata: true,
    directPlayback: true,
    hls: false,
    embed: false,
  };

  private cachedChannels: SomaChannel[] = [];
  private cacheExpiresAt = 0;

  isConfigured(): boolean {
    return true; // 100% free open public radio streams
  }

  getStatus(): 'healthy' {
    return 'healthy';
  }

  private async getChannels(): Promise<SomaChannel[]> {
    if (this.cachedChannels.length > 0 && Date.now() < this.cacheExpiresAt) {
      return this.cachedChannels;
    }

    try {
      const res = await fetch('https://somafm.com/channels.json', {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; OpenTube/2.0; +https://opentube.app)',
        },
      });

      if (!res.ok) return this.cachedChannels;
      const data = await res.json();
      if (Array.isArray(data.channels)) {
        this.cachedChannels = data.channels;
        this.cacheExpiresAt = Date.now() + 5 * 60 * 1000; // 5 minute TTL
      }
      return this.cachedChannels;
    } catch {
      return this.cachedChannels;
    }
  }

  async search(options: ProviderSearchOptions): Promise<ProviderSearchResult> {
    const query = (options.query || '').toLowerCase().trim();
    if (!query) {
      return { items: [], status: 'ok', total: 0 };
    }

    try {
      const channels = await this.getChannels();
      const tokens = query.split(/\s+/).filter(Boolean);

      // Filter channels matching query
      const matches = channels.filter((c) => {
        const text = `${c.title} ${c.description} ${c.genre} ${c.dj} ${c.id}`.toLowerCase();
        // Match if any token is included or if generic radio query
        if (['radio', 'music', 'live', 'stream', 'audio'].includes(query)) return true;
        return tokens.some((t) => text.includes(t));
      });

      const limit = Math.min(Math.max(options.limit || 20, 1), 40);
      const items: MediaItem[] = matches.slice(0, limit).map((c) => {
        const streamUrl = `https://ice1.somafm.com/${c.id}-128-mp3`;
        const artwork = c.largeimage || c.image || `https://api.somafm.com/logos/256/${c.id}256.png`;

        return {
          id: `somafm:${c.id}`,
          provider: 'somafm',
          providerId: c.id,
          providerHost: 'somafm.com',
          title: `${c.title} • SomaFM Live`,
          description: `${c.description} • DJ: ${c.dj || 'SomaFM Resident'} • Genre: ${c.genre.toUpperCase()}`,
          mediaType: 'audio',
          thumbnailUrl: artwork,
          sourceUrl: `https://somafm.com/${c.id}/`,
          playbackUrl: streamUrl,
          embedUrl: null,
          duration: 0, // live stream
          publishedAt: new Date().toISOString(),
          creator: 'SomaFM Listener-Supported Radio',
          channel: c.title,
          license: {
            name: 'Commercial-Free Public Broadcast Stream',
            commercialUse: false,
            attributionRequired: true,
          },
          metadata: {
            channelId: c.id,
            genre: c.genre,
            dj: c.dj,
            listeners: c.listeners,
            isLive: true,
          },
        };
      });

      return {
        items,
        total: items.length,
        status: 'ok',
      };
    } catch (err: any) {
      return { items: [], status: 'error', error: err.message || 'SomaFM lookup failed' };
    }
  }

  async getDetails(id: string): Promise<MediaItem | null> {
    const cleanId = id.replace(/^somafm:/, '');
    const channels = await this.getChannels();
    const c = channels.find((ch) => ch.id === cleanId);
    if (!c) return null;

    const streamUrl = `https://ice1.somafm.com/${c.id}-128-mp3`;
    const artwork = c.largeimage || c.image || `https://api.somafm.com/logos/256/${c.id}256.png`;

    return {
      id: `somafm:${c.id}`,
      provider: 'somafm',
      providerId: c.id,
      providerHost: 'somafm.com',
      title: `${c.title} • SomaFM Live`,
      description: `${c.description} • DJ: ${c.dj || 'SomaFM Resident'} • Genre: ${c.genre.toUpperCase()}`,
      mediaType: 'audio',
      thumbnailUrl: artwork,
      sourceUrl: `https://somafm.com/${c.id}/`,
      playbackUrl: streamUrl,
      embedUrl: null,
      duration: 0,
      publishedAt: new Date().toISOString(),
      creator: 'SomaFM Listener-Supported Radio',
      channel: c.title,
      license: {
        name: 'Commercial-Free Public Broadcast Stream',
        commercialUse: false,
        attributionRequired: true,
      },
      metadata: {
        channelId: c.id,
        genre: c.genre,
        dj: c.dj,
        isLive: true,
      },
    };
  }

  async resolvePlayback(id: string): Promise<PlaybackResolution | null> {
    const details = await this.getDetails(id);
    if (!details || !details.playbackUrl) return null;

    return {
      id: details.id,
      provider: 'somafm',
      candidates: [
        {
          kind: 'direct',
          url: details.playbackUrl,
          mimeType: 'audio/mpeg',
        },
      ],
      selectedCandidateIndex: 0,
      hasDirectStream: true,
      playbackUrl: details.playbackUrl,
      embedUrl: null,
      sourceUrl: details.sourceUrl,
    };
  }
}
