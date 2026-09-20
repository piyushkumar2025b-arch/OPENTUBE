import { ProviderAdapter, PlaybackResolution } from '../types';
import { ProviderSearchOptions, ProviderSearchResult, MediaItem } from '../../types/media';
import { createCombinedSignal } from '../../engine/controller/signalUtils';

export class AudiusProvider implements ProviderAdapter {
  readonly id = 'audius';
  readonly name = 'Audius Music';
  readonly description = 'Decentralized open streaming catalog with 1M+ independent artist tracks, electronic, hip-hop & remixes';
  readonly requiresApiKey = false;
  readonly latencyClass = 'medium' as const;
  readonly defaultBudgetMs = 2000;
  readonly capabilities = {
    search: true,
    metadata: true,
    directPlayback: true,
    hls: false,
    embed: false,
  };

  isConfigured(): boolean {
    return true; // 100% free open decentralized Audius API
  }

  getStatus(): 'healthy' {
    return 'healthy';
  }

  async search(options: ProviderSearchOptions): Promise<ProviderSearchResult> {
    const query = (options.query || '').trim();
    if (!query) {
      return { items: [], status: 'ok', total: 0 };
    }

    const timeoutMs = options.timeoutMs || 2500;
    const { signal, cleanup } = createCombinedSignal(timeoutMs, options.signal);

    try {
      const url = `https://api.audius.co/v1/tracks/search?query=${encodeURIComponent(query)}&app_name=OPENTUBE`;

      const res = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; OpenTube/2.0; +https://opentube.app)',
        },
        signal,
      });

      if (!res.ok) {
        return {
          items: [],
          status: 'error',
          error: `Audius API returned HTTP ${res.status}`,
        };
      }

      const data = await res.json();
      const rawTracks = Array.isArray(data.data) ? data.data : [];
      const limit = Math.min(Math.max(options.limit || 20, 1), 50);
      const tracks = rawTracks.slice(0, limit);
      const items: MediaItem[] = [];

      for (const track of tracks) {
        const trackId = track.track_id || track.id;
        if (!trackId) continue;

        const title = track.title || 'Untitled Track';
        const artist = track.user?.name || track.user?.handle || 'Audius Artist';
        const duration = track.duration ? Math.round(track.duration) : 180;
        const genre = track.genre || 'Electronic';
        const mood = track.mood ? ` • ${track.mood}` : '';

        // Extract best artwork
        const artwork = track.artwork;
        const thumbnailUrl =
          artwork?.['480x480'] ||
          artwork?.['1000x1000'] ||
          artwork?.['150x150'] ||
          'https://audius.co/static/audius_og_image.png';

        const streamUrl = `https://api.audius.co/v1/tracks/${trackId}/stream?app_name=OPENTUBE`;
        const webUrl = track.permalink ? `https://audius.co${track.permalink}` : `https://audius.co/tracks/${trackId}`;

        items.push({
          id: `audius:${trackId}`,
          provider: 'audius',
          providerId: String(trackId),
          providerHost: 'audius.co',
          title,
          description: `${artist} • ${genre}${mood} • ${track.play_count ? `${track.play_count.toLocaleString()} plays` : 'Audius Release'}`,
          mediaType: 'audio',
          thumbnailUrl,
          sourceUrl: webUrl,
          playbackUrl: streamUrl,
          embedUrl: null,
          duration,
          publishedAt: track.release_date || new Date().toISOString(),
          creator: artist,
          channel: artist,
          license: {
            name: 'Audius Open Streaming / Creator Commons',
            commercialUse: false,
            attributionRequired: true,
          },
          metadata: {
            trackId,
            genre: track.genre,
            mood: track.mood,
            favoriteCount: track.favorite_count,
            repostCount: track.repost_count,
            tags: track.tags,
            isrc: track.isrc,
          },
        });
      }

      return {
        items,
        total: items.length,
        status: 'ok',
      };
    } catch (err: any) {
      if (err.name === 'AbortError') {
        return { items: [], status: 'timeout', error: 'Audius search timed out' };
      }
      return { items: [], status: 'error', error: err.message || 'Audius search failed' };
    } finally {
      cleanup();
    }
  }

  async getDetails(id: string): Promise<MediaItem | null> {
    const cleanId = id.replace(/^audius:/, '');
    const url = `https://api.audius.co/v1/tracks/${encodeURIComponent(cleanId)}?app_name=OPENTUBE`;

    try {
      const res = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; OpenTube/2.0; +https://opentube.app)',
        },
      });

      if (!res.ok) return null;
      const json = await res.json();
      const track = json.data;
      if (!track) return null;

      const trackId = track.track_id || track.id || cleanId;
      const title = track.title || 'Untitled Track';
      const artist = track.user?.name || track.user?.handle || 'Audius Artist';
      const duration = track.duration ? Math.round(track.duration) : 180;
      const genre = track.genre || 'Electronic';
      const mood = track.mood ? ` • ${track.mood}` : '';

      const artwork = track.artwork;
      const thumbnailUrl =
        artwork?.['480x480'] ||
        artwork?.['1000x1000'] ||
        artwork?.['150x150'] ||
        'https://audius.co/static/audius_og_image.png';

      const streamUrl = `https://api.audius.co/v1/tracks/${trackId}/stream?app_name=OPENTUBE`;
      const webUrl = track.permalink ? `https://audius.co${track.permalink}` : `https://audius.co/tracks/${trackId}`;

      return {
        id: `audius:${trackId}`,
        provider: 'audius',
        providerId: String(trackId),
        providerHost: 'audius.co',
        title,
        description: `${artist} • ${genre}${mood}`,
        mediaType: 'audio',
        thumbnailUrl,
        sourceUrl: webUrl,
        playbackUrl: streamUrl,
        embedUrl: null,
        duration,
        publishedAt: track.release_date || new Date().toISOString(),
        creator: artist,
        channel: artist,
        license: {
          name: 'Audius Open Streaming / Creator Commons',
          commercialUse: false,
          attributionRequired: true,
        },
        metadata: {
          trackId,
          genre: track.genre,
          mood: track.mood,
          favoriteCount: track.favorite_count,
        },
      };
    } catch {
      return null;
    }
  }

  async resolvePlayback(id: string): Promise<PlaybackResolution | null> {
    const details = await this.getDetails(id);
    if (!details || !details.playbackUrl) return null;

    return {
      id: details.id,
      provider: 'audius',
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
