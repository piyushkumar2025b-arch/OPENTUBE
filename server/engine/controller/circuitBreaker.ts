/**
 * Adaptive Circuit Breaker State Machine
 * States:
 *   - CLOSED: Normal operation, all requests pass through.
 *   - OPEN: Upstream service has failed repeatedly; fast-fail immediately without network calls.
 *   - HALF_OPEN: Cooldown period expired, single probe request allowed to test recovery.
 */

export type CircuitState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

export interface CircuitBreakerOptions {
  failureThreshold?: number;      // Consecutive failures to trip (default: 4)
  resetTimeoutMs?: number;        // Cooldown before half-open probe (default: 20000ms)
  halfOpenMaxProbes?: number;     // Successful probes to fully close (default: 2)
}

export class CircuitBreaker {
  private state: CircuitState = 'CLOSED';
  private failureCount = 0;
  private successCount = 0;
  private lastFailureTime = 0;
  private lastStateChange = Date.now();
  private readonly failureThreshold: number;
  private readonly resetTimeoutMs: number;
  private readonly halfOpenMaxProbes: number;
  private totalCalls = 0;
  private totalTripped = 0;

  constructor(
    public readonly name: string,
    options: CircuitBreakerOptions = {}
  ) {
    this.failureThreshold = options.failureThreshold ?? 4;
    this.resetTimeoutMs = options.resetTimeoutMs ?? 20000;
    this.halfOpenMaxProbes = options.halfOpenMaxProbes ?? 2;
  }

  public getState(): CircuitState {
    // Check if cooldown has elapsed while OPEN
    if (this.state === 'OPEN') {
      const now = Date.now();
      if (now - this.lastFailureTime >= this.resetTimeoutMs) {
        this.state = 'HALF_OPEN';
        this.lastStateChange = now;
        this.successCount = 0;
      }
    }
    return this.state;
  }

  /**
   * Returns whether a request is allowed to proceed.
   */
  public isAllowed(): boolean {
    const currentState = this.getState();
    this.totalCalls++;

    if (currentState === 'CLOSED' || currentState === 'HALF_OPEN') {
      return true;
    }

    this.totalTripped++;
    return false;
  }

  /**
   * Record successful call to reset or close circuit.
   */
  public recordSuccess(): void {
    if (this.state === 'HALF_OPEN') {
      this.successCount++;
      if (this.successCount >= this.halfOpenMaxProbes) {
        this.state = 'CLOSED';
        this.lastStateChange = Date.now();
        this.failureCount = 0;
      }
    } else if (this.state === 'CLOSED') {
      // Slowly decay failure count on success
      this.failureCount = Math.max(0, this.failureCount - 1);
    }
  }

  /**
   * Record failure to trip circuit if threshold exceeded.
   */
  public recordFailure(): void {
    this.lastFailureTime = Date.now();
    this.failureCount++;

    if (this.state === 'HALF_OPEN') {
      // Re-trip immediately if probe fails
      this.state = 'OPEN';
      this.lastStateChange = Date.now();
    } else if (this.failureCount >= this.failureThreshold) {
      this.state = 'OPEN';
      this.lastStateChange = Date.now();
    }
  }

  public getStats() {
    return {
      name: this.name,
      state: this.getState(),
      failureCount: this.failureCount,
      successCount: this.successCount,
      lastFailureTime: this.lastFailureTime > 0 ? new Date(this.lastFailureTime).toISOString() : null,
      totalCalls: this.totalCalls,
      totalTripped: this.totalTripped,
    };
  }
}

export class CircuitBreakerRegistry {
  private breakers = new Map<string, CircuitBreaker>();

  public get(providerId: string): CircuitBreaker {
    let cb = this.breakers.get(providerId);
    if (!cb) {
      cb = new CircuitBreaker(providerId);
      this.breakers.set(providerId, cb);
    }
    return cb;
  }

  public getAllStats() {
    const stats: Record<string, ReturnType<CircuitBreaker['getStats']>> = {};
    for (const [name, cb] of this.breakers.entries()) {
      stats[name] = cb.getStats();
    }
    return stats;
  }
}

export const circuitBreakerRegistry = new CircuitBreakerRegistry();
export const getCircuitBreaker = (providerId: string) => circuitBreakerRegistry.get(providerId);
