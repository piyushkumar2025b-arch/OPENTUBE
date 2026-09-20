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

export class FeatureFilmsProvider implements ProviderAdapter {
  readonly id = 'featurefilms';
  readonly name = 'Classic Feature Films';
  readonly description = 'Over 25,000 full-length restored movies (Charlie Chaplin, Buster Keaton, Hitchcock, Film Noir, Horror, Westerns & Silent Classics)';
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
    return true; // 100% open public domain cinema archive
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
      const solrQuery = `collection:(feature_films) AND mediatype:(movies) AND ${queryFilter}`;

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
          error: `Archive.org Feature Films returned HTTP ${res.status}`,
        };
      }

      const data = await res.json();
      const docs = Array.isArray(data.response?.docs) ? data.response.docs : [];
      const total = Number(data.response?.numFound) || docs.length;

      const items: MediaItem[] = docs.map((doc: any) => {
        const id = doc.identifier;
        const title = doc.title || id;
        const creator = doc.creator || 'Classic Cinema Archives';
        const year = doc.year ? ` (${doc.year})` : '';
        const runtime = doc.runtime ? ` • ${doc.runtime}` : '';
        const descClean = cleanDescription(doc.description);
        const description = descClean
          ? descClean.slice(0, 260)
          : `Full-length classic movie from the public domain feature films archive${year}.`;

        return {
          id: `featurefilms:${id}`,
          provider: 'featurefilms',
          providerId: id,
          providerHost: 'archive.org',
          title: `${title}${year}`,
          description: `${description}${runtime}`,
          mediaType: 'movie',
          thumbnailUrl: `https://archive.org/services/img/${id}`,
          sourceUrl: `https://archive.org/details/${id}`,
          playbackUrl: `https://archive.org/download/${id}/${id}.mp4`,
          embedUrl: `https://archive.org/embed/${id}`,
          duration: doc.runtime ? parseInt(doc.runtime, 10) * 60 : 5400,
          publishedAt: doc.year ? `${doc.year}-01-01T00:00:00Z` : new Date().toISOString(),
          creator,
          channel: 'Classic Feature Films',
          license: {
            name: 'Public Domain / Creative Commons CC0',
            commercialUse: true,
            attributionRequired: false,
          },
          metadata: {
            identifier: id,
            downloads: doc.downloads,
            year: doc.year,
            runtime: doc.runtime,
            collection: 'feature_films',
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
        return { items: [], status: 'timeout', error: 'Feature Films search timed out' };
      }
      return { items: [], status: 'error', error: err.message || 'Feature Films search failed' };
    } finally {
      cleanup();
    }
  }

  async getDetails(id: string): Promise<MediaItem | null> {
    const cleanId = id.replace(/^featurefilms:/, '');
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
      const creator = meta.creator || 'Classic Cinema Archives';
      const year = meta.year ? ` (${meta.year})` : '';

      return {
        id: `featurefilms:${cleanId}`,
        provider: 'featurefilms',
        providerId: cleanId,
        providerHost: 'archive.org',
        title: `${title}${year}`,
        description: cleanDescription(meta.description).slice(0, 320) || 'Full-length classic movie from the public domain feature films archive.',
        mediaType: 'movie',
        thumbnailUrl: `https://archive.org/services/img/${cleanId}`,
        sourceUrl: `https://archive.org/details/${cleanId}`,
        playbackUrl: `https://archive.org/download/${cleanId}/${cleanId}.mp4`,
        embedUrl: `https://archive.org/embed/${cleanId}`,
        duration: meta.runtime ? parseInt(meta.runtime, 10) * 60 : 5400,
        publishedAt: meta.publicdate || new Date().toISOString(),
        creator,
        channel: 'Classic Feature Films',
        license: {
          name: 'Public Domain / Creative Commons CC0',
          commercialUse: true,
          attributionRequired: false,
        },
        metadata: {
          identifier: cleanId,
          year: meta.year,
          runtime: meta.runtime,
          collection: meta.collection,
        },
      };
    } catch {
      return null;
    }
  }

  async resolvePlayback(id: string): Promise<PlaybackResolution | null> {
    const cleanId = id.replace(/^featurefilms:/, '');
    const embedUrl = `https://archive.org/embed/${cleanId}`;
    const directUrl = `https://archive.org/download/${cleanId}/${cleanId}.mp4`;

    return {
      id: `featurefilms:${cleanId}`,
      provider: 'featurefilms',
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
