/**
 * Live TV Provider Adapter
 * Delivers real public-domain and free-to-air international live television broadcasts.
 * Streams are authenticated live HLS (.m3u8) feeds with EPG metadata and categories.
 */

import { ProviderAdapter } from '../types';
import {
  MediaItem,
  ProviderSearchOptions,
  ProviderSearchResult,
} from '../../types/media';
import { liveTvDirectory } from './directory';

export class LiveTvProvider implements ProviderAdapter {
  readonly id = 'livetv';
  readonly name = 'Live TV Channels';
  readonly description = 'Free-to-air international live television streams (NASA TV, France 24, Bloomberg, DW, Euronews, IPTV-org)';
  readonly requiresApiKey = false;
  readonly latencyClass = 'fast' as const;
  readonly defaultBudgetMs = 600;

  isConfigured(): boolean {
    return true;
  }

  async search(options: ProviderSearchOptions): Promise<ProviderSearchResult> {
    try {
      const limit = options.limit || 20;
      const items = liveTvDirectory.search(options.query || '', limit);

      return {
        items,
        total: items.length,
        status: 'ok',
      };
    } catch (err: any) {
      return {
        items: [],
        total: 0,
        status: 'error',
        error: err.message || 'Live TV lookup failed',
      };
    }
  }

  async getDetails(id: string): Promise<MediaItem | null> {
    return liveTvDirectory.getById(id);
  }
}

export const liveTvProvider = new LiveTvProvider();

