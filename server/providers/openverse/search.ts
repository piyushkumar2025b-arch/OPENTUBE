import { ProviderAdapter } from '../types';
import { ProviderSearchOptions, ProviderSearchResult, MediaItem } from '../../types/media';
import { mapOpenverseAudio } from './mapper';
import { createCombinedSignal } from '../../engine/controller/signalUtils';
import { openverseAuth } from './auth';

export class OpenverseProvider implements ProviderAdapter {
  readonly id = 'openverse';
  readonly name = 'Openverse';
  readonly description = 'Extensive catalog of freely usable Creative Commons audio, soundscapes & public-domain recordings';
  readonly requiresApiKey = false;
  readonly latencyClass = 'medium' as const;
  readonly defaultBudgetMs = 1500;

  isConfigured(): boolean {
    return true; // Configured with client credentials & auto-token acquisition
  }

  async search(options: ProviderSearchOptions): Promise<ProviderSearchResult> {
    const query = options.query.trim();
    if (!query) {
      return { items: [], status: 'ok', total: 0 };
    }

    const page = options.page || 1;
    const limit = Math.min(options.limit || 12, 25);
    const timeoutMs = options.timeoutMs || 2000;
    const url = `https://api.openverse.org/v1/audio/?q=${encodeURIComponent(query)}&page=${page}&page_size=${limit}`;

    const { signal, cleanup } = createCombinedSignal(timeoutMs, options.signal);

    try {
      let token = await openverseAuth.fetchAccessToken();

      const headers: Record<string, string> = {
        'User-Agent': 'OpenTube/1.0 (https://github.com/opentube)',
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      let res = await fetch(url, { headers, signal });

      // If token expired (401), invalidate and retry once with fresh token
      if (res.status === 401) {
        openverseAuth.invalidateToken();
        token = await openverseAuth.fetchAccessToken(true);
        if (token) {
          headers['Authorization'] = `Bearer ${token}`;
          res = await fetch(url, { headers, signal });
        }
      }

      if (res.status === 429 || res.status === 403) {
        return {
          items: [],
          status: 'rate_limited',
          error: `Openverse API access throttled or token required (${res.status})`,
        };
      }

      if (!res.ok) {
        return {
          items: [],
          status: 'error',
          error: `Openverse API returned HTTP ${res.status}`,
        };
      }

      const data = await res.json();
      const rawResults: any[] = data.results || [];
      const items: MediaItem[] = [];

      for (const r of rawResults) {
        const item = mapOpenverseAudio(r);
        if (item) items.push(item);
      }

      const total = data.result_count || items.length;

      return {
        items,
        total,
        nextPage: page * limit < total ? page + 1 : null,
        status: 'ok',
      };
    } catch (err: any) {
      if (err.name === 'AbortError') {
        return { items: [], status: 'timeout', error: 'Openverse API request timed out' };
      }
      return { items: [], status: 'error', error: err.message || 'Openverse search failed' };
    } finally {
      cleanup();
    }
  }

  async getDetails(id: string): Promise<MediaItem | null> {
    const cleanId = id.replace(/^openverse:/, '');
    const url = `https://api.openverse.org/v1/audio/${encodeURIComponent(cleanId)}/`;

    try {
      const token = await openverseAuth.fetchAccessToken();
      const headers: Record<string, string> = {
        'User-Agent': 'OpenTube/1.0 (https://github.com/opentube)',
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const res = await fetch(url, { headers });
      if (!res.ok) return null;
      const data = await res.json();
      return mapOpenverseAudio(data);
    } catch {
      return null;
    }
  }
}
