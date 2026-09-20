/**
 * Unified Search Engine & Media Gateway
 * Coordinates:
 * - Single-flight request deduplication (prevents thundering herd / stampedes)
 * - End-to-end cancellation propagation (AbortSignal)
 * - Multi-layer scatter-gather progressive aggregation
 * - Protected details lookup via provider control plane
 */

import { providerRegistry } from '../providers/registry';
import { ProviderAdapter } from '../providers/types';
import {
  MediaItem,
  UnifiedSearchResponse,
} from '../types/media';
import { scatterGatherEngine } from './controller/scatterGather';
import { multiTierCache } from './controller/multiTierCache';
import { providerQueue } from './controller/boundedQueue';
import { circuitBreakerRegistry } from './controller/circuitBreaker';

export interface UnifiedSearchOptions {
  query: string;
  source?: string;
  sources?: string[] | string;
  page?: number;
  limit?: number;
  timeoutMs?: number;
  mediaType?: string;
  signal?: AbortSignal;
}

// Single-flight in-flight request deduplication maps
const inFlightSearches = new Map<string, Promise<UnifiedSearchResponse>>();
const inFlightDetails = new Map<string, Promise<MediaItem | null>>();

export async function executeUnifiedSearch(
  options: UnifiedSearchOptions
): Promise<UnifiedSearchResponse> {
  const rawQuery = options.query || '';
  const query = rawQuery.trim();
  const source = (options.source || 'all').toLowerCase().trim();
  const page = Math.max(1, options.page || 1);
  const limit = Math.min(Math.max(1, options.limit || 24), 60);

  // Zero-query rule: return empty results directly
  if (!query) {
    return {
      query: '',
      total: 0,
      page,
      limit,
      results: [],
      providers: {},
      pagination: { page, limit, hasMore: false },
      errors: [],
      meta: {
        partial: false,
        providersQueried: 0,
        providersSucceeded: 0,
        providersFailed: 0,
        durationMs: 0,
      },
    };
  }

  // Determine target providers based on user explicit selection
  const allProviders = providerRegistry.getAll();
  let targetProviders: ProviderAdapter[] = [];

  const rawSourcesParam = options.sources || (source.includes(',') ? source : null);
  if (rawSourcesParam) {
    const list = Array.isArray(rawSourcesParam)
      ? rawSourcesParam
      : rawSourcesParam.split(',').map((s) => s.trim().toLowerCase());
    const validSet = new Set(list.filter(Boolean));
    targetProviders = allProviders.filter((p) => validSet.has(p.id));
  } else if (source === 'all') {
    targetProviders = allProviders;
  } else {
    targetProviders = allProviders.filter((p) => p.id === source);
  }

  if (targetProviders.length === 0) {
    return {
      query,
      total: 0,
      page,
      limit,
      results: [],
      providers: {
        [source]: { status: 'error', message: `No active providers selected for '${source}'`, count: 0 },
      },
      pagination: { page, limit, hasMore: false },
      errors: [{ provider: source, error: `No active providers selected for '${source}'` }],
      meta: {
        partial: false,
        providersQueried: 0,
        providersSucceeded: 0,
        providersFailed: 0,
        durationMs: 0,
      },
    };
  }

  const sourcesKey = targetProviders.map((p) => p.id).sort().join(',');
  // Single-flight key: deduplicate concurrent identical searches
  const singleFlightKey = `${sourcesKey}:${query.toLowerCase()}:${page}:${limit}:${options.mediaType || 'all'}`;
  const existingFlight = inFlightSearches.get(singleFlightKey);
  if (existingFlight) {
    return existingFlight;
  }

  const searchPromise = (async () => {
    try {
      return await scatterGatherEngine.search(targetProviders, {
        query,
        source: targetProviders.length === 1 ? targetProviders[0].id : sourcesKey,
        page,
        limit,
        timeoutMs: options.timeoutMs,
        mediaType: options.mediaType,
        signal: options.signal,
      });
    } finally {
      inFlightSearches.delete(singleFlightKey);
    }
  })();

  inFlightSearches.set(singleFlightKey, searchPromise);
  return searchPromise;
}

export async function getMediaItemDetails(
  providerId: string,
  id: string,
  signal?: AbortSignal
): Promise<MediaItem | null> {
  const cleanProvider = providerId.toLowerCase().trim();
  const cleanId = id.trim();
  const cacheKey = `details:${cleanProvider}:${cleanId}`;

  // Multi-tier cache lookup
  const cached = multiTierCache.get<MediaItem>(cacheKey);
  if (cached.data) return cached.data;

  const provider = providerRegistry.get(cleanProvider);
  if (!provider || !provider.getDetails) return null;

  // Single-flight deduplication
  const flightKey = `details:${cleanProvider}:${cleanId}`;
  const existingFlight = inFlightDetails.get(flightKey);
  if (existingFlight) return existingFlight;

  const cb = circuitBreakerRegistry.get(cleanProvider);
  if (!cb.isAllowed()) return null;

  const detailsPromise = (async () => {
    try {
      // Execute through bounded worker queue with high priority (110)
      return await providerQueue.enqueue<MediaItem | null>(
        cleanProvider,
        async (queueSignal: AbortSignal) => {
          try {
            const item = await provider.getDetails!(cleanId);
            if (item) {
              cb.recordSuccess();
              multiTierCache.set(cacheKey, item, 600, 1800); // 10 min fresh, 30 min stale
              return item;
            }
            return null;
          } catch (err) {
            cb.recordFailure();
            return null;
          }
        },
        { priority: 110, timeoutMs: 4000, signal }
      );
    } finally {
      inFlightDetails.delete(flightKey);
    }
  })();

  inFlightDetails.set(flightKey, detailsPromise);
  return detailsPromise;
}
