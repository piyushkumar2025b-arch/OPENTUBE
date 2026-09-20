/**
 * Token Bucket Rate Limiter
 * Implements token bucket algorithm with configurable capacity and refill rate per second.
 * Provides rate limiting with exponential backoff and jitter for upstream providers.
 */

export interface RateLimiterConfig {
  capacity: number;       // Maximum tokens in bucket (burst limit)
  refillRate: number;     // Tokens replenished per second
}

export class TokenBucket {
  private capacity: number;
  private refillRate: number;
  private tokens: number;
  private lastRefill: number;
  private totalRequested: number = 0;
  private totalThrottled: number = 0;

  constructor(config: RateLimiterConfig) {
    this.capacity = config.capacity;
    this.refillRate = config.refillRate;
    this.tokens = config.capacity;
    this.lastRefill = Date.now();
  }

  private refill(): void {
    const now = Date.now();
    const elapsedSeconds = (now - this.lastRefill) / 1000;
    this.tokens = Math.min(this.capacity, this.tokens + elapsedSeconds * this.refillRate);
    this.lastRefill = now;
  }

  /**
   * Checks if tokens are currently available without consuming them.
   */
  public canConsume(tokens = 1): boolean {
    this.refill();
    return this.tokens >= tokens;
  }

  /**
   * Attempts to consume tokens. Returns true if allowed, false if rate limited.
   */
  public tryConsume(tokens = 1): boolean {
    this.refill();
    this.totalRequested++;

    if (this.tokens >= tokens) {
      this.tokens -= tokens;
      return true;
    }

    this.totalThrottled++;
    return false;
  }

  /**
   * Waits until tokens are available or timeout occurs.
   */
  public async acquire(tokens = 1, timeoutMs = 2000): Promise<boolean> {
    const startTime = Date.now();

    while (Date.now() - startTime < timeoutMs) {
      if (this.tryConsume(tokens)) {
        return true;
      }
      // Calculate delay until 1 token is refilled
      const waitTime = Math.min(200, Math.max(25, (1 / this.refillRate) * 1000));
      // Add slight jitter (0-20ms) to avoid synchronization spikes
      const jitter = Math.floor(Math.random() * 20);
      await new Promise((resolve) => setTimeout(resolve, waitTime + jitter));
    }

    return false;
  }

  public getStats() {
    this.refill();
    return {
      availableTokens: Math.floor(this.tokens * 100) / 100,
      capacity: this.capacity,
      refillRate: this.refillRate,
      totalRequested: this.totalRequested,
      totalThrottled: this.totalThrottled,
      throttledPercentage:
        this.totalRequested > 0
          ? Math.round((this.totalThrottled / this.totalRequested) * 100)
          : 0,
    };
  }
}

export class RateLimiterManager {
  private buckets = new Map<string, TokenBucket>();

  private defaultConfigs: Record<string, RateLimiterConfig> = {
    archive: { capacity: 15, refillRate: 5 },       // Internet Archive: gentle refill
    nasa: { capacity: 20, refillRate: 6 },          // NASA Video API: 6 req/s
    wikimedia: { capacity: 25, refillRate: 8 },     // Wikimedia: 8 req/s
    openverse: { capacity: 30, refillRate: 8 },     // Openverse: 8 req/s (Authenticated Bearer token)
    peertube: { capacity: 20, refillRate: 6 },      // PeerTube Sepia Search: 6 req/s
    radio: { capacity: 30, refillRate: 10 },        // Radio Browser: 10 req/s
    livetv: { capacity: 50, refillRate: 20 },       // Live TV: fast local memory lookup
    mux: { capacity: 40, refillRate: 15 },          // Mux Video: High-speed edge streaming & analytics
    youtube: { capacity: 20, refillRate: 5 },       // YouTube: quota-guarded
    pexels: { capacity: 10, refillRate: 2 },        // Pexels: 200/hr limit
    pixabay: { capacity: 15, refillRate: 3 },       // Pixabay: 5000/hr limit
    vimeo: { capacity: 10, refillRate: 2 },         // Vimeo: quota-guarded
  };

  public getBucket(providerId: string): TokenBucket {
    let bucket = this.buckets.get(providerId);
    if (!bucket) {
      const config = this.defaultConfigs[providerId] || { capacity: 20, refillRate: 5 };
      bucket = new TokenBucket(config);
      this.buckets.set(providerId, bucket);
    }
    return bucket;
  }

  public getAllStats() {
    const stats: Record<string, ReturnType<TokenBucket['getStats']>> = {};
    for (const [provider, bucket] of this.buckets.entries()) {
      stats[provider] = bucket.getStats();
    }
    return stats;
  }
}

export const rateLimiterManager = new RateLimiterManager();
export const getRateLimiter = (providerId: string) => rateLimiterManager.getBucket(providerId);
