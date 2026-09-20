import { ProviderAdapter } from '../types';
import { ProviderSearchOptions, ProviderSearchResult, MediaItem } from '../../types/media';
import { mapPixabayHit } from './mapper';
import { createCombinedSignal } from '../../engine/controller/signalUtils';

export class PixabayProvider implements ProviderAdapter {
  readonly id = 'pixabay';
  readonly name = 'Pixabay';
  readonly description = 'Royalty-free stock videos and b-roll clips from the Pixabay community';
  readonly requiresApiKey = true;
  readonly latencyClass = 'medium' as const;
  readonly defaultBudgetMs = 1200;

  private getApiKey(): string | undefined {
    return process.env.PIXABAY_API_KEY;
  }

  isConfigured(): boolean {
    return Boolean(this.getApiKey() && this.getApiKey()?.trim().length! > 5);
  }

  async search(options: ProviderSearchOptions): Promise<ProviderSearchResult> {
    const apiKey = this.getApiKey();
    if (!apiKey) {
      return {
        items: [],
        status: 'unconfigured',
        error: 'PIXABAY_API_KEY not configured in environment',
      };
    }

    const query = options.query.trim();
    if (!query) {
      return { items: [], status: 'ok', total: 0 };
    }

    const page = options.page || 1;
    const limit = Math.min(options.limit || 12, 30);
    const timeoutMs = options.timeoutMs || 2000;
    const url = `https://pixabay.com/api/videos/?key=${encodeURIComponent(apiKey)}&q=${encodeURIComponent(query)}&per_page=${limit}&page=${page}`;

    const { signal, cleanup } = createCombinedSignal(timeoutMs, options.signal);

    try {
      const res = await fetch(url, { signal });

      if (res.status === 429) {
        return {
          items: [],
          status: 'rate_limited',
          error: 'Pixabay API rate limit exceeded (429)',
        };
      }

      if (!res.ok) {
        return {
          items: [],
          status: 'error',
          error: `Pixabay API returned status ${res.status}`,
        };
      }

      const data = await res.json();
      const hits: any[] = data.hits || [];
      const items: MediaItem[] = [];

      for (const h of hits) {
        const item = mapPixabayHit(h);
        if (item) items.push(item);
      }

      const totalHits = data.totalHits || data.total || items.length;

      return {
        items,
        total: totalHits,
        nextPage: page * limit < totalHits ? page + 1 : null,
        status: 'ok',
      };
    } catch (err: any) {
      if (err.name === 'AbortError') {
        return { items: [], status: 'timeout', error: 'Pixabay API request timed out' };
      }
      return { items: [], status: 'error', error: err.message || 'Pixabay search failed' };
    } finally {
      cleanup();
    }
  }
}
