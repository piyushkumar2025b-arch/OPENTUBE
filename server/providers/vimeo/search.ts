import { ProviderAdapter } from '../types';
import { ProviderSearchOptions, ProviderSearchResult, MediaItem } from '../../types/media';
import { mapVimeoVideo } from './mapper';
import { createCombinedSignal } from '../../engine/controller/signalUtils';

export class VimeoProvider implements ProviderAdapter {
  readonly id = 'vimeo';
  readonly name = 'Vimeo';
  readonly description = 'High-quality filmmaking, animation, and indie video creator community';
  readonly requiresApiKey = true;
  readonly latencyClass = 'medium' as const;
  readonly defaultBudgetMs = 1200;

  private getAccessToken(): string | undefined {
    return process.env.VIMEO_ACCESS_TOKEN;
  }

  isConfigured(): boolean {
    return Boolean(this.getAccessToken() && this.getAccessToken()?.trim().length! > 5);
  }

  async search(options: ProviderSearchOptions): Promise<ProviderSearchResult> {
    const token = this.getAccessToken();
    if (!token) {
      return {
        items: [],
        status: 'unconfigured',
        error: 'VIMEO_ACCESS_TOKEN not configured in environment',
      };
    }

    const query = options.query.trim();
    if (!query) {
      return { items: [], status: 'ok', total: 0 };
    }

    const page = options.page || 1;
    const limit = Math.min(options.limit || 12, 25);
    const timeoutMs = options.timeoutMs || 2000;
    const url = `https://api.vimeo.com/videos?query=${encodeURIComponent(query)}&per_page=${limit}&page=${page}`;

    const { signal, cleanup } = createCombinedSignal(timeoutMs, options.signal);

    try {
      const res = await fetch(url, {
        headers: {
          Authorization: `bearer ${token}`,
          Accept: 'application/vnd.vimeo.*+json;version=3.4',
        },
        signal,
      });

      if (res.status === 429) {
        return {
          items: [],
          status: 'rate_limited',
          error: 'Vimeo API rate limit reached (429)',
        };
      }

      if (!res.ok) {
        return {
          items: [],
          status: 'error',
          error: `Vimeo API returned status ${res.status}`,
        };
      }

      const data = await res.json();
      const rawList: any[] = data.data || [];
      const items: MediaItem[] = [];

      for (const item of rawList) {
        const mapped = mapVimeoVideo(item);
        if (mapped) items.push(mapped);
      }

      return {
        items,
        total: data.total || items.length,
        nextPage: data.paging?.next ? page + 1 : null,
        status: 'ok',
      };
    } catch (err: any) {
      if (err.name === 'AbortError') {
        return { items: [], status: 'timeout', error: 'Vimeo API request timed out' };
      }
      return { items: [], status: 'error', error: err.message || 'Vimeo search failed' };
    } finally {
      cleanup();
    }
  }
}
