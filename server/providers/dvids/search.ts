import { ProviderAdapter, PlaybackResolution } from '../types';
import { ProviderSearchOptions, ProviderSearchResult, MediaItem } from '../../types/media';
import { createCombinedSignal } from '../../engine/controller/signalUtils';

function cleanDescription(desc: any): string {
  if (typeof desc === 'string') {
    return desc.replace(/<[^>]+>/g, '').trim();
  }
  if (Array.isArray(desc)) {
    return desc.map((d: any) => String(d).replace(/<[^>]+>/g, '')).join(' ').trim();
  }
  return '';
}

export class DvidsProvider implements ProviderAdapter {
  readonly id = 'dvids';
  readonly name = 'DVIDS & Aerospace Media';
  readonly description = 'Defense Visual Information Distribution Service — public domain aerospace missions, flight tests, naval engineering & historic expeditions';
  readonly requiresApiKey = false;
  readonly latencyClass = 'fast' as const;
  readonly defaultBudgetMs = 1600;
  readonly capabilities = {
    search: true,
    metadata: true,
    directPlayback: true,
    hls: false,
    embed: true,
  };

  isConfigured(): boolean {
    return true; // 100% open public domain government media
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
    const limit = Math.min(Math.max(options.limit || 20, 1), 50);
    const timeoutMs = options.timeoutMs || 2500;
    const { signal, cleanup } = createCombinedSignal(timeoutMs, options.signal);

    try {
      const cleanTokens = rawQuery
        .replace(/[:"()]/g, ' ')
        .split(/\s+/)
        .filter(Boolean);

      const queryFilter = cleanTokens.length > 0 ? `(${cleanTokens.join(' AND ')})` : '*:*';
      const solrQuery = `collection:(gov.dod.dimoc OR fedflix) AND mediatype:(movies) AND ${queryFilter}`;

      const params = new URLSearchParams({
        q: solrQuery,
        fl: 'identifier,title,creator,description,downloads,year,runtime',
        rows: String(limit),
        page: String(page),
        output: 'json',
      });

      const url = `https://archive.org/advancedsearch.php?${params.toString()}`;

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
          error: `DVIDS archive returned HTTP ${res.status}`,
        };
      }

      const data = await res.json();
      const docs = Array.isArray(data.response?.docs) ? data.response.docs : [];
      const total = Number(data.response?.numFound) || docs.length;

      const items: MediaItem[] = docs.map((doc: any) => {
        const id = doc.identifier;
        const title = doc.title || id;
        const creator = doc.creator || 'Aerospace & Exploration Command';
        const year = doc.year ? ` (${doc.year})` : '';
        const runtime = doc.runtime ? ` • ${doc.runtime}` : '';
        const descClean = cleanDescription(doc.description);
        const description = descClean
          ? descClean.slice(0, 260)
          : `Official public domain government & aerospace video recording${year}.`;

        return {
          id: `dvids:${id}`,
          provider: 'dvids',
          title: `${title}`,
          description,
          mediaType: 'video' as const,
          sourceUrl: `https://archive.org/details/${id}`,
          thumbnail: `https://archive.org/services/img/${id}`,
          thumbnailUrl: `https://archive.org/services/img/${id}`,
          videoUrl: `https://archive.org/download/${id}/${id}.mp4`,
          playbackUrl: `https://archive.org/download/${id}/${id}.mp4`,
          embedUrl: `https://archive.org/embed/${id}`,
          channel: `${creator}${year}${runtime}`,
          publishedAt: doc.year ? `${doc.year}-01-01` : new Date().toISOString(),
          views: Number(doc.downloads) || 0,
          likes: Math.round((Number(doc.downloads) || 100) * 0.12),
          playerType: 'html5',
          license: {
            name: 'Public Domain / U.S. Government Work',
            url: 'https://www.dimoc.mil/',
            commercialUse: true,
            attributionRequired: false,
          },
          tags: ['Aerospace', 'Aviation', 'Exploration', 'Government', 'Documentary', 'Space'],
        };
      });

      return {
        items,
        status: 'ok',
        total,
        nextPage: page * limit < total ? page + 1 : null,
      };
    } catch (err: any) {
      if (err.name === 'AbortError') {
        return { items: [], status: 'timeout', error: 'Search timed out or aborted' };
      }
      return {
        items: [],
        status: 'error',
        error: err.message || 'DVIDS query failed',
      };
    } finally {
      cleanup();
    }
  }

  async resolvePlayback(id: string): Promise<PlaybackResolution | null> {
    const rawId = id.replace(/^dvids:/, '');
    const directUrl = `https://archive.org/download/${rawId}/${rawId}.mp4`;
    const embedUrl = `https://archive.org/embed/${rawId}`;
    return {
      id: `dvids:${rawId}`,
      provider: 'dvids',
      candidates: [
        {
          kind: 'direct',
          url: directUrl,
          mimeType: 'video/mp4',
          quality: 'Direct Archive MP4',
        },
        {
          kind: 'embed',
          url: embedUrl,
        },
      ],
      selectedCandidateIndex: 0,
      hasDirectStream: true,
      playbackUrl: directUrl,
      embedUrl,
      sourceUrl: `https://archive.org/details/${rawId}`,
    };
  }
}
