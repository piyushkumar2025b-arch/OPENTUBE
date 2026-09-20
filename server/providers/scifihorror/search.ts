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

export class SciFiHorrorProvider implements ProviderAdapter {
  readonly id = 'scifihorror';
  readonly name = 'Sci-Fi & Horror Vault';
  readonly description = 'Legendary sci-fi, cult horror, monster cinema, and vintage alien epics (Night of the Living Dead, Plan 9, House on Haunted Hill, White Zombie)';
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
      const solrQuery = `collection:(SciFi_Horror OR b_movies) AND mediatype:(movies) AND ${queryFilter}`;

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
          error: `SciFi/Horror archive returned HTTP ${res.status}`,
        };
      }

      const data = await res.json();
      const docs = Array.isArray(data.response?.docs) ? data.response.docs : [];
      const total = Number(data.response?.numFound) || docs.length;

      const items: MediaItem[] = docs.map((doc: any) => {
        const id = doc.identifier;
        const title = doc.title || id;
        const creator = doc.creator || 'Cult Cinema Masters';
        const year = doc.year ? ` (${doc.year})` : '';
        const runtime = doc.runtime ? ` • ${doc.runtime}` : '';
        const descClean = cleanDescription(doc.description);
        const description = descClean
          ? descClean.slice(0, 260)
          : `Restored public domain sci-fi & horror classic directed by ${creator}${year}.`;

        return {
          id: `scifihorror:${id}`,
          provider: 'scifihorror',
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
          likes: Math.round((Number(doc.downloads) || 100) * 0.14),
          playerType: 'html5',
          license: {
            name: 'Public Domain Mark 1.0',
            url: 'https://creativecommons.org/publicdomain/mark/1.0/',
            commercialUse: true,
            attributionRequired: false,
          },
          tags: ['Sci-Fi', 'Horror', 'Cult Classic', 'B-Movie', 'Vintage Cinema'],
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
        error: err.message || 'Sci-Fi & Horror query failed',
      };
    } finally {
      cleanup();
    }
  }

  async resolvePlayback(id: string): Promise<PlaybackResolution | null> {
    const rawId = id.replace(/^scifihorror:/, '');
    const directUrl = `https://archive.org/download/${rawId}/${rawId}.mp4`;
    const embedUrl = `https://archive.org/embed/${rawId}`;
    return {
      id: `scifihorror:${rawId}`,
      provider: 'scifihorror',
      candidates: [
        {
          kind: 'direct',
          url: directUrl,
          mimeType: 'video/mp4',
          quality: 'Archive Direct MP4',
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
