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

export class PrelingerProvider implements ProviderAdapter {
  readonly id = 'prelinger';
  readonly name = 'Prelinger Archives';
  readonly description = 'Over 60,000 ephemeral historic films: mid-century Americana, atomic age educational reels, vintage automotive design, drive-in theater culture & retro industry';
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
    return true; // 100% public domain historical film collection
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
      const solrQuery = `collection:(prelinger) AND mediatype:(movies) AND ${queryFilter}`;

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
          error: `Prelinger Archives returned HTTP ${res.status}`,
        };
      }

      const data = await res.json();
      const docs = Array.isArray(data.response?.docs) ? data.response.docs : [];
      const total = Number(data.response?.numFound) || docs.length;

      const items: MediaItem[] = docs.map((doc: any) => {
        const id = doc.identifier;
        const title = doc.title || id;
        const creator = doc.creator || 'Prelinger Archives / Library of Congress';
        const year = doc.year ? ` (${doc.year})` : '';
        const runtime = doc.runtime ? ` • ${doc.runtime}` : '';
        const descClean = cleanDescription(doc.description);
        const description = descClean
          ? descClean.slice(0, 260)
          : `Historical ephemeral film from Rick Prelinger's celebrated public domain collection${year}.`;

        return {
          id: `prelinger:${id}`,
          provider: 'prelinger',
          title: `🎞️ ${title}`,
          description,
          thumbnail: `https://archive.org/services/img/${id}`,
          thumbnailUrl: `https://archive.org/services/img/${id}`,
          videoUrl: `https://archive.org/download/${id}/${id}.mp4`,
          playbackUrl: `https://archive.org/download/${id}/${id}.mp4`,
          embedUrl: `https://archive.org/embed/${id}`,
          channel: `${creator}${year}${runtime}`,
          publishedAt: doc.year ? `${doc.year}-01-01` : '1955-01-01',
          views: Number(doc.downloads) || 0,
          likes: Math.round((Number(doc.downloads) || 80) * 0.1),
          playerType: 'html5',
          license: {
            name: 'Public Domain / Prelinger Collection',
            url: 'https://archive.org/details/prelinger',
            commercialUse: true,
            attributionRequired: false,
          },
          tags: ['Prelinger', 'Vintage', 'Retro Americana', 'History', 'Educational Film'],
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
        error: err.message || 'Prelinger Archives query failed',
      };
    } finally {
      cleanup();
    }
  }

  async resolvePlayback(id: string): Promise<PlaybackResolution | null> {
    const cleanId = id.replace(/^prelinger:/, '');
    const directUrl = `https://archive.org/download/${cleanId}/${cleanId}.mp4`;
    const embedUrl = `https://archive.org/embed/${cleanId}`;

    return {
      id: `prelinger:${cleanId}`,
      provider: 'prelinger',
      candidates: [
        {
          kind: 'direct',
          url: directUrl,
          mimeType: 'video/mp4',
          quality: '720p Restored',
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
