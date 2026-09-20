import { ProviderAdapter } from '../types';
import { ProviderSearchOptions, ProviderSearchResult, MediaItem } from '../../types/media';
import { mapWikimediaPage } from './mapper';
import { createCombinedSignal } from '../../engine/controller/signalUtils';

export class WikimediaProvider implements ProviderAdapter {
  readonly id = 'wikimedia';
  readonly name = 'Wikimedia Commons';
  readonly description = 'Freely usable media files, public-domain footage, documentaries, and community videos';
  readonly requiresApiKey = false;
  readonly latencyClass = 'medium' as const;
  readonly defaultBudgetMs = 1200;

  isConfigured(): boolean {
    return true; // 100% open public API, no key required
  }

  async search(options: ProviderSearchOptions): Promise<ProviderSearchResult> {
    const query = options.query.trim();
    if (!query) {
      return { items: [], status: 'ok', total: 0 };
    }

    const page = options.page || 1;
    const limit = Math.min(options.limit || 12, 25);
    const offset = (page - 1) * limit;
    const timeoutMs = options.timeoutMs || 2500;

    // Search specifically in media namespace (6) for videos
    const gsrsearch = `${query} filetype:video`;
    const url = `https://commons.wikimedia.org/w/api.php?action=query&format=json&generator=search&gsrsearch=${encodeURIComponent(gsrsearch)}&gsrnamespace=6&gsrlimit=${limit}&gsroffset=${offset}&prop=imageinfo&iiprop=url|size|extmetadata|mime`;

    const { signal, cleanup } = createCombinedSignal(timeoutMs, options.signal);

    try {
      const res = await fetch(url, {
        headers: {
          'User-Agent': 'OpenTube/1.0 (https://github.com/opentube; contact@opentube.org)',
        },
        signal,
      });

      if (!res.ok) {
        return {
          items: [],
          status: 'error',
          error: `Wikimedia Commons API returned HTTP ${res.status}`,
        };
      }

      const data = await res.json();
      const pages = data.query?.pages || {};
      const items: MediaItem[] = [];

      for (const p of Object.values(pages)) {
        const item = mapWikimediaPage(p);
        if (item) items.push(item);
      }

      const hasMore = Boolean(data.continue);

      return {
        items,
        total: items.length,
        nextPage: hasMore ? page + 1 : null,
        status: 'ok',
      };
    } catch (err: any) {
      if (err.name === 'AbortError') {
        return { items: [], status: 'timeout', error: 'Wikimedia Commons request timed out' };
      }
      return { items: [], status: 'error', error: err.message || 'Wikimedia search failed' };
    } finally {
      cleanup();
    }
  }

  async getDetails(id: string): Promise<MediaItem | null> {
    const pageId = id.replace(/^wikimedia:/, '');
    const url = `https://commons.wikimedia.org/w/api.php?action=query&format=json&pageids=${encodeURIComponent(pageId)}&prop=imageinfo&iiprop=url|size|extmetadata|mime`;

    try {
      const res = await fetch(url, {
        headers: { 'User-Agent': 'OpenTube/1.0' },
      });
      if (!res.ok) return null;
      const data = await res.json();
      const page = data.query?.pages?.[pageId];
      return mapWikimediaPage(page);
    } catch {
      return null;
    }
  }
}
