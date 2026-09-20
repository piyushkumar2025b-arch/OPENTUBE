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

export class OtRadioProvider implements ProviderAdapter {
  readonly id = 'otradio';
  readonly name = 'Old Time Radio (OTR)';
  readonly description = 'Golden Age vintage radio dramas (1930s-1950s: Sherlock Holmes, The Shadow, War of the Worlds, Dimension X, Suspense, Dragnet & Abbott & Costello)';
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
    return true; // 100% public domain audio history
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
      const solrQuery = `collection:(oldtimeradio) AND mediatype:(audio) AND ${queryFilter}`;

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
          error: `Old Time Radio archive returned HTTP ${res.status}`,
        };
      }

      const data = await res.json();
      const docs = Array.isArray(data.response?.docs) ? data.response.docs : [];
      const total = Number(data.response?.numFound) || docs.length;

      const items: MediaItem[] = docs.map((doc: any) => {
        const id = doc.identifier;
        const title = doc.title || id;
        const broadcaster = doc.creator || 'OTR Golden Age Broadcast';
        const year = doc.year ? ` (${doc.year})` : '';
        const runtime = doc.runtime ? ` • ${doc.runtime}` : '';
        const descClean = cleanDescription(doc.description);
        const description = descClean
          ? descClean.slice(0, 260)
          : `Original golden age radio broadcast from the 1930s-1950s public domain sound archive${year}.`;

        return {
          id: `otradio:${id}`,
          provider: 'otradio',
          title: `📻 ${title}`,
          description,
          thumbnail: `https://archive.org/services/img/${id}`,
          thumbnailUrl: `https://archive.org/services/img/${id}`,
          videoUrl: `https://archive.org/download/${id}/${id}.mp3`,
          playbackUrl: `https://archive.org/download/${id}/${id}.mp3`,
          audioUrl: `https://archive.org/download/${id}/${id}.mp3`,
          embedUrl: `https://archive.org/embed/${id}`,
          channel: `${broadcaster}${year}${runtime}`,
          publishedAt: doc.year ? `${doc.year}-01-01` : '1945-06-01',
          views: Number(doc.downloads) || 0,
          likes: Math.round((Number(doc.downloads) || 50) * 0.15),
          playerType: 'audio',
          audioGenre: 'Vintage Radio Drama',
          bitrate: 128,
          license: {
            name: 'Public Domain / Open Historic Broadcast',
            commercialUse: true,
            attributionRequired: false,
          },
          tags: ['OTR', 'Radio Drama', 'Vintage', 'Mystery', 'Audiobook'],
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
        error: err.message || 'Old Time Radio query failed',
      };
    } finally {
      cleanup();
    }
  }

  async resolvePlayback(id: string): Promise<PlaybackResolution | null> {
    const cleanId = id.replace(/^otradio:/, '');
    const directUrl = `https://archive.org/download/${cleanId}/${cleanId}.mp3`;
    const embedUrl = `https://archive.org/embed/${cleanId}`;

    return {
      id: `otradio:${cleanId}`,
      provider: 'otradio',
      candidates: [
        {
          kind: 'direct',
          url: directUrl,
          mimeType: 'audio/mpeg',
          quality: '128 kbps MP3',
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
      sourceUrl: `https://archive.org/details/${cleanId}`,
    };
  }
}
