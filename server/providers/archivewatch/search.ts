import { ProviderAdapter, PlaybackResolution } from '../types';
import { ProviderSearchOptions, ProviderSearchResult, MediaItem } from '../../types/media';
import { createCombinedSignal } from '../../engine/controller/signalUtils';

export class ArchiveWatchProvider implements ProviderAdapter {
  readonly id = 'archivewatch';
  readonly name = 'Archive Watch (Prelinger Cinema)';
  readonly description = 'Over 10,000 classic, public domain vintage films, cultural reels, retro commercials, and mid-century cinema';
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
    return true; // 100% free open Archive.org Prelinger collection
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
      // Clean query tokens for Solr syntax
      const cleanTokens = rawQuery
        .replace(/[:"()]/g, ' ')
        .split(/\s+/)
        .filter(Boolean);

      const queryFilter = cleanTokens.length > 0 ? `(${cleanTokens.join(' AND ')})` : '*:*';
      const solrQuery = `collection:(prelinger) AND mediatype:(movies) AND ${queryFilter}`;

      const params = new URLSearchParams({
        q: solrQuery,
        fl: 'identifier,title,creator,description,downloads,year,mediatype',
        sort: 'downloads desc',
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
          error: `Archive.org Prelinger API returned HTTP ${res.status}`,
        };
      }

      const data = await res.json();
      const docs = Array.isArray(data.response?.docs) ? data.response.docs : [];
      const total = Number(data.response?.numFound) || docs.length;

      const items: MediaItem[] = docs.map((doc: any) => {
        const id = doc.identifier;
        const title = doc.title || id;
        const creator = doc.creator || 'Prelinger Archives Collection';
        const year = doc.year ? ` (${doc.year})` : '';
        const description = doc.description
          ? doc.description.replace(/<[^>]+>/g, '').slice(0, 240)
          : `Historic archival footage from the Prelinger Archives Collection${year}.`;

        return {
          id: `archivewatch:${id}`,
          provider: 'archivewatch',
          providerId: id,
          providerHost: 'archive.org',
          title: `${title}${year}`,
          description,
          mediaType: 'video',
          thumbnailUrl: `https://archive.org/services/img/${id}`,
          sourceUrl: `https://archive.org/details/${id}`,
          playbackUrl: null,
          embedUrl: `https://archive.org/embed/${id}`,
          duration: 0,
          publishedAt: doc.year ? `${doc.year}-01-01T00:00:00Z` : new Date().toISOString(),
          creator,
          channel: 'Prelinger Archives',
          license: {
            name: 'Public Domain / Creative Commons CC0',
            commercialUse: true,
            attributionRequired: false,
          },
          metadata: {
            identifier: id,
            downloads: doc.downloads,
            year: doc.year,
            collection: 'prelinger',
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
        return { items: [], status: 'timeout', error: 'Archive Watch search timed out' };
      }
      return { items: [], status: 'error', error: err.message || 'Archive Watch search failed' };
    } finally {
      cleanup();
    }
  }

  async getDetails(id: string): Promise<MediaItem | null> {
    const cleanId = id.replace(/^archivewatch:/, '');
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
      const creator = meta.creator || 'Prelinger Archives Collection';
      const year = meta.year ? ` (${meta.year})` : '';

      return {
        id: `archivewatch:${cleanId}`,
        provider: 'archivewatch',
        providerId: cleanId,
        providerHost: 'archive.org',
        title: `${title}${year}`,
        description: meta.description
          ? meta.description.replace(/<[^>]+>/g, '').slice(0, 300)
          : 'Historic cultural cinema and educational archive.',
        mediaType: 'video',
        thumbnailUrl: `https://archive.org/services/img/${cleanId}`,
        sourceUrl: `https://archive.org/details/${cleanId}`,
        playbackUrl: null,
        embedUrl: `https://archive.org/embed/${cleanId}`,
        duration: meta.runtime ? parseInt(meta.runtime, 10) * 60 : 0,
        publishedAt: meta.publicdate || new Date().toISOString(),
        creator,
        channel: 'Prelinger Archives',
        license: {
          name: 'Public Domain / Creative Commons CC0',
          commercialUse: true,
          attributionRequired: false,
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
    const cleanId = id.replace(/^archivewatch:/, '');
    const embedUrl = `https://archive.org/embed/${cleanId}`;

    return {
      id: `archivewatch:${cleanId}`,
      provider: 'archivewatch',
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
