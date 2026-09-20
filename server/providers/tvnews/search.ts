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

export class TvNewsProvider implements ProviderAdapter {
  readonly id = 'tvnews';
  readonly name = 'Global TV News Archive';
  readonly description = 'Over 2 million historic broadcast television clips, network investigations, and world news journalism archives';
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
    return true; // 100% open public TV News Archive
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
      const solrQuery = `collection:(tvnews) AND mediatype:(movies) AND ${queryFilter}`;

      const params = new URLSearchParams({
        q: solrQuery,
        fl: 'identifier,title,creator,description,downloads,year',
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
          error: `Archive.org TV News returned HTTP ${res.status}`,
        };
      }

      const data = await res.json();
      const docs = Array.isArray(data.response?.docs) ? data.response.docs : [];
      const total = Number(data.response?.numFound) || docs.length;

      const items: MediaItem[] = docs.map((doc: any) => {
        const id = doc.identifier;
        const title = doc.title || id;
        const year = doc.year ? ` (${doc.year})` : '';
        const descClean = cleanDescription(doc.description);
        const description = descClean
          ? descClean.slice(0, 240)
          : `Broadcast television news archive recording${year}.`;

        return {
          id: `tvnews:${id}`,
          provider: 'tvnews',
          providerId: id,
          providerHost: 'archive.org',
          title: `${title}${year}`,
          description,
          mediaType: 'tv',
          thumbnailUrl: `https://archive.org/services/img/${id}`,
          sourceUrl: `https://archive.org/details/${id}`,
          playbackUrl: null,
          embedUrl: `https://archive.org/embed/${id}`,
          duration: 1800, // ~30 min broadcast
          publishedAt: doc.year ? `${doc.year}-01-01T00:00:00Z` : new Date().toISOString(),
          creator: 'Television News Archive',
          channel: 'Global TV News Archive',
          license: {
            name: 'Fair Use News & Educational Archival Public Access',
            commercialUse: false,
            attributionRequired: true,
          },
          metadata: {
            identifier: id,
            downloads: doc.downloads,
            year: doc.year,
            collection: 'tvnews',
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
        return { items: [], status: 'timeout', error: 'TV News search timed out' };
      }
      return { items: [], status: 'error', error: err.message || 'TV News search failed' };
    } finally {
      cleanup();
    }
  }

  async getDetails(id: string): Promise<MediaItem | null> {
    const cleanId = id.replace(/^tvnews:/, '');
    const url = `https://archive.org/metadata/${encodeURIComponent(cleanId)}`;

    try {
      const res = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; OpenTube/2.0; +https://opentube.app)',
        },
      });

      if (!res.ok) return null;
      const data = await res.json();
      const meta = data.metadata;
      if (!meta) return null;

      const title = meta.title || cleanId;
      const year = meta.year ? ` (${meta.year})` : '';

      return {
        id: `tvnews:${cleanId}`,
        provider: 'tvnews',
        providerId: cleanId,
        providerHost: 'archive.org',
        title: `${title}${year}`,
        description: cleanDescription(meta.description).slice(0, 300) || 'Broadcast television news recording from the global archive.',
        mediaType: 'tv',
        thumbnailUrl: `https://archive.org/services/img/${cleanId}`,
        sourceUrl: `https://archive.org/details/${cleanId}`,
        playbackUrl: null,
        embedUrl: `https://archive.org/embed/${cleanId}`,
        duration: 1800,
        publishedAt: meta.publicdate || new Date().toISOString(),
        creator: 'Television News Archive',
        channel: 'Global TV News Archive',
        license: {
          name: 'Fair Use News & Educational Archival Public Access',
          commercialUse: false,
          attributionRequired: true,
        },
        metadata: {
          identifier: cleanId,
          year: meta.year,
          collection: meta.collection,
        },
      };
    } catch {
      return null;
    }
  }

  async resolvePlayback(id: string): Promise<PlaybackResolution | null> {
    const cleanId = id.replace(/^tvnews:/, '');
    const embedUrl = `https://archive.org/embed/${cleanId}`;

    return {
      id: `tvnews:${cleanId}`,
      provider: 'tvnews',
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
      sourceUrl: `https://archive.org/details/${cleanId}`,
    };
  }
}
