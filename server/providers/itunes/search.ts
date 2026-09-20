import { ProviderAdapter, PlaybackResolution } from '../types';
import { ProviderSearchOptions, ProviderSearchResult, MediaItem } from '../../types/media';
import { createCombinedSignal } from '../../engine/controller/signalUtils';

export class ITunesProvider implements ProviderAdapter {
  readonly id = 'itunes';
  readonly name = 'Apple Music Videos';
  readonly description = 'Official HD music videos, artist tracks, and podcasts with direct streaming playback';
  readonly requiresApiKey = false;
  readonly latencyClass = 'fast' as const;
  readonly defaultBudgetMs = 1500;
  readonly capabilities = {
    search: true,
    metadata: true,
    directPlayback: true,
    hls: false,
    embed: false,
  };

  isConfigured(): boolean {
    return true; // 100% free open Apple Search API, no key required
  }

  getStatus(): 'healthy' {
    return 'healthy';
  }

  async search(options: ProviderSearchOptions): Promise<ProviderSearchResult> {
    const query = (options.query || '').trim();
    if (!query) {
      return { items: [], status: 'ok', total: 0 };
    }

    const limit = Math.min(Math.max(options.limit || 20, 1), 50);
    const timeoutMs = options.timeoutMs || 2500;
    const { signal, cleanup } = createCombinedSignal(timeoutMs, options.signal);

    try {
      // Search music videos by default, or podcasts if query suggests talk/podcast
      const isPodcast = /podcast|talk|interview|show|audiobook|lecture/i.test(query);
      const entity = isPodcast ? 'podcast' : 'musicVideo';

      const url = `https://itunes.apple.com/search?term=${encodeURIComponent(query)}&entity=${entity}&limit=${limit}`;

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
          error: `iTunes Search API returned HTTP ${res.status}`,
        };
      }

      const data = await res.json();
      const results = Array.isArray(data.results) ? data.results : [];
      const items: MediaItem[] = [];

      for (const entry of results) {
        const trackId = entry.trackId || entry.collectionId;
        if (!trackId) continue;

        const title = entry.trackName || entry.collectionName || 'Untitled Track';
        const artist = entry.artistName || 'Unknown Artist';
        const rawArtwork = entry.artworkUrl100 || entry.artworkUrl60;
        const thumbnail = rawArtwork ? rawArtwork.replace('100x100bb', '600x600bb') : '';
        const previewUrl = entry.previewUrl || null;
        const durationSec = entry.trackTimeMillis ? Math.round(entry.trackTimeMillis / 1000) : 30;

        items.push({
          id: `itunes:${trackId}`,
          provider: 'itunes',
          providerId: String(trackId),
          providerHost: 'itunes.apple.com',
          title,
          description: `${artist} • ${entry.primaryGenreName || 'Music'} (${entry.releaseDate ? entry.releaseDate.slice(0, 4) : 'Catalog'})`,
          mediaType: isPodcast ? 'audio' : 'video',
          thumbnailUrl: thumbnail,
          sourceUrl: entry.trackViewUrl || entry.collectionViewUrl || entry.artistViewUrl || `https://music.apple.com/song/${trackId}`,
          playbackUrl: previewUrl,
          embedUrl: null,
          duration: durationSec,
          publishedAt: entry.releaseDate || new Date().toISOString(),
          creator: artist,
          channel: artist,
          license: {
            name: 'Apple Free Preview / Promotional Media Stream',
            commercialUse: false,
            attributionRequired: true,
          },
          metadata: {
            trackId,
            artistId: entry.artistId,
            collectionName: entry.collectionName,
            genre: entry.primaryGenreName,
            country: entry.country,
            explicit: entry.trackExplicitness === 'explicit',
            kind: entry.kind,
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
        return { items: [], status: 'timeout', error: 'iTunes search timed out' };
      }
      return { items: [], status: 'error', error: err.message || 'iTunes search failed' };
    } finally {
      cleanup();
    }
  }

  async getDetails(id: string): Promise<MediaItem | null> {
    const cleanId = id.replace(/^itunes:/, '');
    const url = `https://itunes.apple.com/lookup?id=${encodeURIComponent(cleanId)}`;

    try {
      const res = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; OpenTube/2.0; +https://opentube.app)',
        },
      });

      if (!res.ok) return null;
      const data = await res.json();
      const entry = data.results?.[0];
      if (!entry) return null;

      const trackId = entry.trackId || entry.collectionId || cleanId;
      const title = entry.trackName || entry.collectionName || 'Untitled Track';
      const artist = entry.artistName || 'Unknown Artist';
      const rawArtwork = entry.artworkUrl100 || entry.artworkUrl60;
      const thumbnail = rawArtwork ? rawArtwork.replace('100x100bb', '600x600bb') : '';
      const previewUrl = entry.previewUrl || null;
      const durationSec = entry.trackTimeMillis ? Math.round(entry.trackTimeMillis / 1000) : 30;

      return {
        id: `itunes:${trackId}`,
        provider: 'itunes',
        providerId: String(trackId),
        providerHost: 'itunes.apple.com',
        title,
        description: `${artist} • ${entry.primaryGenreName || 'Music'} (${entry.releaseDate ? entry.releaseDate.slice(0, 4) : 'Catalog'})`,
        mediaType: entry.kind === 'podcast' ? 'audio' : 'video',
        thumbnailUrl: thumbnail,
        sourceUrl: entry.trackViewUrl || entry.collectionViewUrl || entry.artistViewUrl || `https://music.apple.com/song/${trackId}`,
        playbackUrl: previewUrl,
        embedUrl: null,
        duration: durationSec,
        publishedAt: entry.releaseDate || new Date().toISOString(),
        creator: artist,
        channel: artist,
        license: {
          name: 'Apple Free Preview / Promotional Media Stream',
          commercialUse: false,
          attributionRequired: true,
        },
        metadata: {
          trackId,
          artistId: entry.artistId,
          collectionName: entry.collectionName,
          genre: entry.primaryGenreName,
          country: entry.country,
          explicit: entry.trackExplicitness === 'explicit',
          kind: entry.kind,
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
      provider: 'itunes',
      candidates: [
        {
          kind: 'direct',
          url: details.playbackUrl,
          mimeType: details.mediaType === 'audio' ? 'audio/x-m4a' : 'video/mp4',
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
