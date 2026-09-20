import { ProviderAdapter, PlaybackResolution } from '../types';
import { ProviderSearchOptions, ProviderSearchResult, MediaItem } from '../../types/media';
import { createCombinedSignal } from '../../engine/controller/signalUtils';

export class NasaSvsProvider implements ProviderAdapter {
  readonly id = 'nasasvs';
  readonly name = 'NASA Scientific Visualization Studio';
  readonly description = 'Over 10,000 4K NASA space visualizations, astrophysics simulations, planetary flights & Earth climate models';
  readonly requiresApiKey = false;
  readonly latencyClass = 'medium' as const;
  readonly defaultBudgetMs = 3500;
  readonly capabilities = {
    search: true,
    metadata: true,
    directPlayback: false,
    hls: false,
    embed: true,
  };

  isConfigured(): boolean {
    return true; // 100% open public NASA SVS API
  }

  getStatus(): 'healthy' {
    return 'healthy';
  }

  async search(options: ProviderSearchOptions): Promise<ProviderSearchResult> {
    const rawQuery = (options.query || '').trim();
    if (!rawQuery) {
      return { items: [], status: 'ok', total: 0 };
    }

    const page = Math.max(1, options.page || 1);
    const timeoutMs = options.timeoutMs || 4500;
    const { signal, cleanup } = createCombinedSignal(timeoutMs, options.signal);

    try {
      const url = `https://svs.gsfc.nasa.gov/api/search/?q=${encodeURIComponent(rawQuery)}&page=${page}`;

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
          error: `NASA SVS API returned HTTP ${res.status}`,
        };
      }

      const data = await res.json();
      const results = Array.isArray(data.results) ? data.results : [];
      const total = Number(data.count) || results.length;
      const limit = Math.min(Math.max(options.limit || 20, 1), 30);
      const chosen = results.slice(0, limit);

      const items: MediaItem[] = chosen.map((r: any) => {
        const id = String(r.id);
        const title = r.title || `NASA SVS Animation #${id}`;
        const description = r.description
          ? r.description.replace(/<[^>]+>/g, '').slice(0, 260)
          : 'High-definition astrophysics and planetary visualization produced by NASA Goddard Space Flight Center.';

        // SVS has structured preview image URLs
        const paddedId = id.padStart(6, '0');
        const folder1 = `a0${paddedId.slice(0, 2)}0000`;
        const folder2 = `a0${paddedId.slice(0, 4)}00`;
        const fallbackThumb = `https://svs.gsfc.nasa.gov/vis/${folder1}/${folder2}/a0${paddedId}/frames/1920x1080_16x9_30p/`;

        return {
          id: `nasasvs:${id}`,
          provider: 'nasasvs',
          providerId: id,
          providerHost: 'svs.gsfc.nasa.gov',
          title,
          description: `${description} • ${r.result_type || 'Produced Video'}`,
          mediaType: 'video',
          thumbnailUrl: r.main_image?.url || 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=600&auto=format&fit=crop&q=80',
          sourceUrl: r.url || `https://svs.gsfc.nasa.gov/${id}/`,
          playbackUrl: null,
          embedUrl: `https://svs.gsfc.nasa.gov/${id}/`,
          duration: 180,
          publishedAt: r.release_date || new Date().toISOString(),
          creator: 'NASA Goddard Scientific Visualization Studio',
          channel: 'NASA Goddard SVS',
          license: {
            name: 'NASA Public Domain Media',
            commercialUse: true,
            attributionRequired: true,
          },
          metadata: {
            id,
            pageType: r.result_type || r.page_type,
            hits: r.hits,
            releaseDate: r.release_date,
          },
        };
      });

      return {
        items,
        total,
        status: 'ok',
      };
    } catch (err: any) {
      if (err.name === 'AbortError') {
        return { items: [], status: 'timeout', error: 'NASA SVS search timed out' };
      }
      return { items: [], status: 'error', error: err.message || 'NASA SVS search failed' };
    } finally {
      cleanup();
    }
  }

  async getDetails(id: string): Promise<MediaItem | null> {
    const cleanId = id.replace(/^nasasvs:/, '');
    const url = `https://svs.gsfc.nasa.gov/api/${encodeURIComponent(cleanId)}/`;

    try {
      const res = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; OpenTube/2.0; +https://opentube.app)',
        },
      });

      if (!res.ok) return null;
      const data = await res.json();
      if (!data) return null;

      const title = data.title || `NASA SVS #${cleanId}`;
      const description = data.description
        ? data.description.replace(/<[^>]+>/g, '').slice(0, 320)
        : 'Scientific visualization produced by NASA Goddard Space Flight Center.';

      return {
        id: `nasasvs:${cleanId}`,
        provider: 'nasasvs',
        providerId: cleanId,
        providerHost: 'svs.gsfc.nasa.gov',
        title,
        description,
        mediaType: 'video',
        thumbnailUrl: data.main_image?.url || `https://images.nasa.gov/images/nasa_logo.png`,
        sourceUrl: data.url || `https://svs.gsfc.nasa.gov/${cleanId}/`,
        playbackUrl: null,
        embedUrl: `https://svs.gsfc.nasa.gov/${cleanId}/`,
        duration: 180,
        publishedAt: data.release_date || new Date().toISOString(),
        creator: 'NASA Goddard Scientific Visualization Studio',
        channel: 'NASA Goddard SVS',
        license: {
          name: 'NASA Public Domain Media',
          commercialUse: true,
          attributionRequired: true,
        },
        metadata: {
          id: cleanId,
          pageType: data.page_type,
          studio: data.studio,
          missions: data.missions,
        },
      };
    } catch {
      return null;
    }
  }

  async resolvePlayback(id: string): Promise<PlaybackResolution | null> {
    const cleanId = id.replace(/^nasasvs:/, '');
    const embedUrl = `https://svs.gsfc.nasa.gov/${cleanId}/`;

    return {
      id: `nasasvs:${cleanId}`,
      provider: 'nasasvs',
      candidates: [
        {
          kind: 'embed',
          url: embedUrl,
        },
      ],
      selectedCandidateIndex: 0,
      hasDirectStream: false,
      playbackUrl: null,
      embedUrl,
      sourceUrl: `https://svs.gsfc.nasa.gov/${cleanId}/`,
    };
  }
}
