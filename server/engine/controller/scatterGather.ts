/**
 * Scatter-Gather Multi-Provider Orchestrator
 * Implements:
 *   1. Progressive Aggregation with strict First-Result Deadline (700ms)
 *   2. Fast-Provider-First Scheduling
 *   3. End-to-End AbortSignal Propagation & Bounded Worker Queue
 *   4. Cacheability Rules (Never cache operational failures)
 *   5. Cheap O(N) Ranking & Deduplication
 */

import { ProviderAdapter } from '../../providers/types';
import {
  MediaItem,
  ProviderSearchOptions,
  ProviderSearchResult,
  ProviderStatusInfo,
  UnifiedSearchResponse,
} from '../../types/media';
import { circuitBreakerRegistry } from './circuitBreaker';
import { rateLimiterManager } from './rateLimiter';
import { multiTierCache } from './multiTierCache';
import { rankAndDeduplicate } from './qualityRanker';
import { providerQueue } from './boundedQueue';
import { selectProviders } from './providerRouter';

export interface ScatterGatherOptions {
  query: string;
  source?: string;
  page?: number;
  limit?: number;
  timeoutMs?: number;
  mediaType?: string;
  signal?: AbortSignal;
}

interface ProviderExecutionResult {
  providerId: string;
  items: MediaItem[];
  status: ProviderStatusInfo['status'];
  error?: string;
  latencyMs: number;
}

/**
 * Evaluates whether a search response is cacheable.
 * Must have at least one successful provider with items,
 * OR all queried providers genuinely responded with 0 items ('ok').
 * Never cache if composed entirely of operational failures (error, timeout, rate_limited, unconfigured).
 */
export function isCacheableSearchResponse(res: UnifiedSearchResponse): boolean {
  if (!res || !res.providers) return false;
  const providers = Object.values(res.providers);
  if (providers.length === 0) return false;

  const hasSuccessWithItems = providers.some(
    (p) => p.status === 'ok' && (p.count || 0) > 0
  );
  if (hasSuccessWithItems) return true;

  // Genuine zero-results: all queried providers responded with status 'ok' and 0 items
  const allGenuineOk = providers.every((p) => p.status === 'ok');
  if (allGenuineOk) return true;

  return false;
}

export class ScatterGatherEngine {
  /**
   * Executes unified search across target providers with progressive aggregation.
   */
  public async search(
    targetProviders: ProviderAdapter[],
    options: ScatterGatherOptions
  ): Promise<UnifiedSearchResponse> {
    const rawQuery = options.query || '';
    const query = rawQuery.trim();
    const source = (options.source || 'all').toLowerCase().trim();
    const page = Math.max(1, options.page || 1);
    const limit = Math.min(Math.max(1, options.limit || 24), 60);
    const defaultTimeoutMs = options.timeoutMs || (source === 'all' ? 2000 : 3500);

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

    // Check Multi-Tier Cache with Stale-While-Revalidate
    const targetKey = targetProviders.map((p) => p.id).sort().join(',');
    const cacheKey = `search:${targetKey}:${query.toLowerCase().replace(/\s+/g, ' ')}:${page}:${limit}:${options.mediaType || 'all'}`;
    const cachedResult = multiTierCache.get<UnifiedSearchResponse>(cacheKey, async () => {
      // Background revalidation fetcher (priority 20)
      const res = await this.executeDirectSearch(
        targetProviders,
        options,
        query,
        page,
        limit,
        defaultTimeoutMs,
        20
      );
      return isCacheableSearchResponse(res) ? res : (null as any);
    });

    if (cachedResult.data) {
      return cachedResult.data;
    }

    // Execute fresh search across providers (interactive priority 100)
    const freshResult = await this.executeDirectSearch(
      targetProviders,
      options,
      query,
      page,
      limit,
      defaultTimeoutMs,
      100
    );

    // Write to Multi-Tier Cache ONLY if valid canonical results exist
    if (isCacheableSearchResponse(freshResult)) {
      multiTierCache.set(cacheKey, freshResult, 300, 1800);
    }

    return freshResult;
  }

  private async executeDirectSearch(
    targetProviders: ProviderAdapter[],
    options: ScatterGatherOptions,
    query: string,
    page: number,
    limit: number,
    timeoutMs: number,
    priority = 100
  ): Promise<UnifiedSearchResponse> {
    const startTime = Date.now();
    const isMultiProvider = options.source === 'all' || !options.source;

    // Use intelligent provider relevance routing ONLY when unrestricted 'all' is requested
    let targetList: ProviderAdapter[];
    if (options.source === 'all') {
      const routed = selectProviders(query, options.source, options.mediaType as any);
      targetList = routed.allSelected.length > 0 ? routed.allSelected : targetProviders;
    } else {
      targetList = targetProviders;
    }

    const configuredCount = Math.max(1, targetList.filter((p) => p.isConfigured()).length);
    // Allow each provider to contribute up to 12 items (or full limit for single provider), ensuring a rich video pool
    const perProviderLimit = isMultiProvider
      ? Math.max(8, Math.min(24, Math.ceil(limit / Math.min(configuredCount, 4))))
      : limit;

    // Fast-provider-first sorting
    targetList.sort((a, b) => {
      const order = { fast: 0, medium: 1, slow: 2 };
      const aVal = order[a.latencyClass || 'medium'];
      const bVal = order[b.latencyClass || 'medium'];
      return aVal - bVal;
    });

    // Launch provider tasks
    const searchPromises = targetList.map((provider) => {
      const providerBudgetMs = isMultiProvider
        ? (provider.defaultBudgetMs || (provider.latencyClass === 'fast' ? 2000 : provider.latencyClass === 'medium' ? 3000 : 4000))
        : timeoutMs;

      const effectiveTimeoutMs = isMultiProvider ? Math.min(timeoutMs, providerBudgetMs) : timeoutMs;
      return this.dispatchProvider(
        provider,
        query,
        page,
        perProviderLimit,
        effectiveTimeoutMs,
        priority,
        options.signal
      );
    });

    // Progressive Aggregation:
    // We don't wait for the slowest provider if enough results have arrived or deadline has passed
    const providerStatuses: Record<string, ProviderStatusInfo> = {};
    const errors: Array<{ provider: string; error: string }> = [];
    const rawAccumulated: MediaItem[] = [];

    // Allow more providers to respond: min items raised to full limit or at least 24
    const FIRST_RESULT_DEADLINE = isMultiProvider ? 1100 : timeoutMs;
    const MIN_SATISFACTORY_ITEMS = isMultiProvider ? Math.max(limit, 24) : limit;

    let settledCount = 0;
    const totalCount = targetList.length;

    const processResult = (res: ProviderExecutionResult) => {
      settledCount++;
      providerStatuses[res.providerId] = {
        status: res.status,
        message: res.error,
        count: res.items.length,
        latencyMs: res.latencyMs,
      };

      if (res.error && res.status !== 'unconfigured') {
        errors.push({ provider: res.providerId, error: res.error });
      }

      if (res.items.length > 0) {
        rawAccumulated.push(...res.items);
      }
    };

    await new Promise<void>((resolve) => {
      let resolved = false;
      let earlyResolutionTimer: NodeJS.Timeout | null = null;

      const tryResolve = (force = false) => {
        if (resolved) return;
        if (force || settledCount >= totalCount) {
          resolved = true;
          if (earlyResolutionTimer) clearTimeout(earlyResolutionTimer);
          resolve();
        } else if (rawAccumulated.length >= MIN_SATISFACTORY_ITEMS) {
          resolved = true;
          if (earlyResolutionTimer) clearTimeout(earlyResolutionTimer);
          resolve();
        } else if (rawAccumulated.length >= 16 && !earlyResolutionTimer) {
          // Once 16+ quality items have arrived, give remaining providers 400ms more to finish
          earlyResolutionTimer = setTimeout(() => {
            if (!resolved) {
              resolved = true;
              resolve();
            }
          }, 400);
        }
      };

      for (const promise of searchPromises) {
        promise
          .then((res) => {
            processResult(res);
            tryResolve();
          })
          .catch(() => {
            settledCount++;
            tryResolve();
          });
      }

      // First-Result Deadline Timer: allow at least 1100ms for wave-1 and wave-2 providers to return
      const deadlineTimer = setTimeout(() => {
        if (!resolved && rawAccumulated.length >= 12) {
          tryResolve(true);
        }
      }, FIRST_RESULT_DEADLINE);

      // Hard timeout upper bound (3.5s max)
      const hardTimeoutTimer = setTimeout(() => {
        if (!resolved) {
          tryResolve(true);
        }
      }, isMultiProvider ? Math.min(timeoutMs, 3500) : timeoutMs);

      // End-to-end caller cancellation
      if (options.signal) {
        if (options.signal.aborted) {
          tryResolve(true);
        } else {
          options.signal.addEventListener(
            'abort',
            () => {
              clearTimeout(deadlineTimer);
              clearTimeout(hardTimeoutTimer);
              tryResolve(true);
            },
            { once: true }
          );
        }
      }
    });

    const isPartial = settledCount < totalCount;
    const providersSucceeded = Object.values(providerStatuses).filter(
      (p) => p.status === 'ok'
    ).length;
    const providersFailed = Object.values(providerStatuses).filter(
      (p) => p.status === 'error' || p.status === 'timeout'
    ).length;

    // Multi-Signal Ranking & Cheap Deduplication
    const ranked = rankAndDeduplicate(rawAccumulated, query);
    const sliced = ranked.slice(0, limit);
    const durationMs = Date.now() - startTime;

    return {
      query,
      total: ranked.length,
      page,
      limit,
      results: sliced,
      providers: providerStatuses,
      pagination: {
        page,
        limit,
        hasMore: ranked.length > limit,
      },
      errors,
      meta: {
        partial: isPartial,
        providersQueried: totalCount,
        providersSucceeded,
        providersFailed,
        durationMs,
      },
      timing: {
        providers: durationMs,
        total: durationMs,
      },
    };
  }

  private async dispatchProvider(
    provider: ProviderAdapter,
    query: string,
    page: number,
    limit: number,
    timeoutMs: number,
    priority: number,
    callerSignal?: AbortSignal
  ): Promise<ProviderExecutionResult> {
    const start = Date.now();
    const cb = circuitBreakerRegistry.get(provider.id);
    const limiter = rateLimiterManager.getBucket(provider.id);

    // Circuit Breaker pre-check: skip unhealthy providers immediately
    if (!cb.isAllowed()) {
      return {
        providerId: provider.id,
        items: [] as MediaItem[],
        status: 'error',
        error: `Circuit breaker open for provider '${provider.id}'`,
        latencyMs: 0,
      };
    }

    // Configuration check: unconfigured keyed providers return immediately
    if (provider.requiresApiKey && !provider.isConfigured()) {
      return {
        providerId: provider.id,
        items: [] as MediaItem[],
        status: 'unconfigured',
        error: `API key not configured for ${provider.name}`,
        latencyMs: 0,
      };
    }

    // Token Bucket Rate Limiter check
    const acquired = limiter.tryConsume(1) || (await limiter.acquire(1, 100));
    if (!acquired) {
      return {
        providerId: provider.id,
        items: [] as MediaItem[],
        status: 'rate_limited',
        error: `Rate limit throttled for provider '${provider.id}'`,
        latencyMs: Date.now() - start,
      };
    }

    // Enqueue with Bounded Worker Queue, passing priority, timeout, and caller signal
    return providerQueue.enqueue<ProviderExecutionResult>(
      provider.id,
      async (queueSignal: AbortSignal) => {
        try {
          const searchOpts: ProviderSearchOptions = {
            query,
            page,
            limit,
            timeoutMs,
            signal: queueSignal, // End-to-end signal propagation to provider fetch!
          };

          const result: ProviderSearchResult = await provider.search(searchOpts);
          const latencyMs = Date.now() - start;

          if (result.status === 'ok') {
            cb.recordSuccess();
          } else if (result.status === 'error' || result.status === 'timeout') {
            cb.recordFailure();
          }

          return {
            providerId: provider.id,
            items: result.items || [],
            status: result.status,
            error: result.error,
            latencyMs,
          };
        } catch (err: any) {
          const latencyMs = Date.now() - start;
          cb.recordFailure();
          return {
            providerId: provider.id,
            items: [] as MediaItem[],
            status: queueSignal.aborted || err.name === 'AbortError' ? 'timeout' : 'error',
            error: err.message || 'Provider execution error',
            latencyMs,
          };
        }
      },
      { priority, timeoutMs: timeoutMs + 300, signal: callerSignal }
    );
  }
}

export const scatterGatherEngine = new ScatterGatherEngine();
