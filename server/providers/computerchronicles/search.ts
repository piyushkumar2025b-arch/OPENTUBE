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

export class ComputerChroniclesProvider implements ProviderAdapter {
  readonly id = 'computerchronicles';
  readonly name = 'Computer Chronicles & Tech Vault';
  readonly description = 'Historic computing TV episodes (1983–2002) showcasing early Apple, Silicon Graphics, Commodore Amiga, ARPANET, and Internet pioneers';
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
    return true; // 100% open public computing history archive
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
      const solrQuery = `collection:(computerchronicles) AND mediatype:(movies) AND ${queryFilter}`;

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
          error: `Computer Chronicles returned HTTP ${res.status}`,
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
          : `The Computer Chronicles TV series episode${year}.`;

        return {
          id: `computerchronicles:${id}`,
          provider: 'computerchronicles',
          providerId: id,
          providerHost: 'archive.org',
          title: `${title}${year}`,
          description,
          mediaType: 'video',
          thumbnailUrl: `https://archive.org/services/img/${id}`,
          sourceUrl: `https://archive.org/details/${id}`,
          playbackUrl: `https://archive.org/download/${id}/${id}.mp4`,
          embedUrl: `https://archive.org/embed/${id}`,
          duration: 1740, // ~29 min episode
          publishedAt: doc.year ? `${doc.year}-01-01T00:00:00Z` : new Date().toISOString(),
          creator: 'Stewart Cheifet Productions',
          channel: 'The Computer Chronicles',
          license: {
            name: 'Creative Commons Attribution / Public Broadcast',
            commercialUse: false,
            attributionRequired: true,
          },
          metadata: {
            identifier: id,
            downloads: doc.downloads,
            year: doc.year,
            collection: 'computerchronicles',
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
        return { items: [], status: 'timeout', error: 'Computer Chronicles search timed out' };
      }
      return { items: [], status: 'error', error: err.message || 'Computer Chronicles search failed' };
    } finally {
      cleanup();
    }
  }

  async getDetails(id: string): Promise<MediaItem | null> {
    const cleanId = id.replace(/^computerchronicles:/, '');
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
        id: `computerchronicles:${cleanId}`,
        provider: 'computerchronicles',
        providerId: cleanId,
        providerHost: 'archive.org',
        title: `${title}${year}`,
        description: cleanDescription(meta.description).slice(0, 300) || 'The Computer Chronicles broadcast episode.',
        mediaType: 'video',
        thumbnailUrl: `https://archive.org/services/img/${cleanId}`,
        sourceUrl: `https://archive.org/details/${cleanId}`,
        playbackUrl: `https://archive.org/download/${cleanId}/${cleanId}.mp4`,
        embedUrl: `https://archive.org/embed/${cleanId}`,
        duration: 1740,
        publishedAt: meta.publicdate || new Date().toISOString(),
        creator: 'Stewart Cheifet Productions',
        channel: 'The Computer Chronicles',
        license: {
          name: 'Creative Commons Attribution / Public Broadcast',
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
    const cleanId = id.replace(/^computerchronicles:/, '');
    const embedUrl = `https://archive.org/embed/${cleanId}`;
    const directUrl = `https://archive.org/download/${cleanId}/${cleanId}.mp4`;

    return {
      id: `computerchronicles:${cleanId}`,
      provider: 'computerchronicles',
      candidates: [
        {
          kind: 'embed',
          url: embedUrl,
        },
        {
          kind: 'direct',
          url: directUrl,
          mimeType: 'video/mp4',
        },
      ],
      selectedCandidateIndex: 0,
      hasDirectStream: true,
      playbackUrl: directUrl,
      embedUrl,
      sourceUrl: `https://archive.org/details/${cleanId}`,
    };
  }
}
