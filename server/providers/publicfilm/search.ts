import { ProviderAdapter, PlaybackResolution } from '../types';
import { ProviderSearchOptions, ProviderSearchResult, MediaItem } from '../../types/media';
import { createCombinedSignal } from '../../engine/controller/signalUtils';

function cleanDescription(desc: any): string {
  if (typeof desc === 'string') return desc.replace(/<[^>]+>/g, '').trim();
  if (Array.isArray(desc)) return desc.map((d: any) => String(d).replace(/<[^>]+>/g, '')).join(' ').trim();
  return '';
}

export class PublicFilmProvider implements ProviderAdapter {
  readonly id = 'publicfilm';
  readonly name = 'Classic Cinema & Public Movies';
  readonly description = 'Historic feature-length cinema, dramatic epics, mystery films, Westerns and vintage studio motion pictures in public domain';
  readonly requiresApiKey = false;
  readonly latencyClass = 'fast' as const;
  readonly defaultBudgetMs = 1500;
  readonly capabilities = {
    search: true,
    metadata: true,
    directPlayback: true,
    hls: false,
    embed: true,
  };

  isConfigured(): boolean {
    return true;
  }

  getStatus(): 'healthy' {
    return 'healthy';
  }

  async search(options: ProviderSearchOptions): Promise<ProviderSearchResult> {
    const rawQuery = (options.query || '').trim();
    if (!rawQuery) return { items: [], status: 'ok', total: 0 };

    const page = Math.max(1, options.page || 1);
    const limit = Math.min(Math.max(options.limit || 20, 1), 50);
    const timeoutMs = options.timeoutMs || 2500;
    const { signal, cleanup } = createCombinedSignal(timeoutMs, options.signal);

    try {
      const cleanTokens = rawQuery.replace(/[:"()]/g, ' ').split(/\s+/).filter(Boolean);
      const queryFilter = cleanTokens.length > 0 ? `(${cleanTokens.join(' AND ')})` : '*:*';
      const solrQuery = `collection:(feature_films OR movie_trailers OR film_noir OR vintage_cartoons) AND mediatype:(movies) AND ${queryFilter}`;

      const params = new URLSearchParams({
        q: solrQuery,
        fl: 'identifier,title,creator,description,downloads,year,runtime',
        rows: String(limit),
        page: String(page),
        output: 'json',
      });

      const res = await fetch(`https://archive.org/advancedsearch.php?${params.toString()}`, {
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; OpenTube/2.0)' },
        signal,
      });

      if (!res.ok) {
        return { items: [], status: 'error', error: `Archive returned HTTP ${res.status}` };
      }

      const data = await res.json();
      const docs = Array.isArray(data.response?.docs) ? data.response.docs : [];
      const total = Number(data.response?.numFound) || docs.length;

      const items: MediaItem[] = docs.map((doc: any) => {
        const id = doc.identifier;
        const title = doc.title || id;
        const year = doc.year ? ` (${doc.year})` : '';
        const runtime = doc.runtime ? ` • ${doc.runtime}` : '';
        const descClean = cleanDescription(doc.description);

        return {
          id: `publicfilm:${id}`,
          provider: 'publicfilm',
          title,
          description: descClean ? descClean.slice(0, 260) : `Public domain classic cinema feature film${year}${runtime}.`,
          mediaType: 'video' as const,
          sourceUrl: `https://archive.org/details/${id}`,
          thumbnailUrl: `https://archive.org/services/img/${id}`,
          playbackUrl: `https://archive.org/download/${id}/${id}.mp4`,
          embedUrl: `https://archive.org/embed/${id}`,
          channel: `${doc.creator || 'Classic Cinema'}${year}${runtime}`,
          publishedAt: doc.year ? `${doc.year}-01-01` : new Date().toISOString(),
          playerType: 'video',
          license: { name: 'Public Domain', commercialUse: true, attributionRequired: false },
          metadata: {
            downloads: Number(doc.downloads) || 0,
            tags: ['Cinema', 'Feature Film', 'Classic Movie', 'Hollywood', 'Drama'],
          },
        };
      });

      return { items, status: 'ok', total, nextPage: page * limit < total ? page + 1 : null };
    } catch (err: any) {
      return { items: [], status: err.name === 'AbortError' ? 'timeout' : 'error', error: err.message };
    } finally {
      cleanup();
    }
  }

  async getVideo(id: string): Promise<MediaItem | null> {
    const rawId = id.startsWith('publicfilm:') ? id.replace('publicfilm:', '') : id;
    return {
      id: `publicfilm:${rawId}`,
      provider: 'publicfilm',
      title: rawId,
      description: 'Classic cinema public motion picture print.',
      mediaType: 'video',
      sourceUrl: `https://archive.org/details/${rawId}`,
      thumbnailUrl: `https://archive.org/services/img/${rawId}`,
      playbackUrl: `https://archive.org/download/${rawId}/${rawId}.mp4`,
      embedUrl: `https://archive.org/embed/${rawId}`,
      channel: 'Public Domain Cinema',
      playerType: 'video',
      metadata: {},
    };
  }

  async resolvePlayback(id: string): Promise<PlaybackResolution | null> {
    const rawId = id.startsWith('publicfilm:') ? id.replace('publicfilm:', '') : id;
    const directUrl = `https://archive.org/download/${rawId}/${rawId}.mp4`;
    return {
      id,
      provider: 'publicfilm',
      candidates: [{ kind: 'direct', url: directUrl, mimeType: 'video/mp4' }],
      selectedCandidateIndex: 0,
      hasDirectStream: true,
      playbackUrl: directUrl,
      embedUrl: `https://archive.org/embed/${rawId}`,
      sourceUrl: `https://archive.org/details/${rawId}`,
    };
  }
}
