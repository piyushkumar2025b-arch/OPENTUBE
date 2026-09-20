/**
 * Bounded Worker Priority Queue
 * Controls upstream provider execution with configurable global concurrency,
 * per-provider concurrency limits, maximum queue depth, request timeouts, and cancellation.
 */

export interface QueueJob<T> {
  id: string;
  providerId: string;
  priority: number; // Higher number = higher priority (e.g. user search: 100, playback: 120, revalidate: 20)
  createdAt: number;
  timeoutMs: number;
  run: (signal: AbortSignal) => Promise<T>;
  resolve: (value: T) => void;
  reject: (err: any) => void;
  signal?: AbortSignal;
}

export interface BoundedQueueConfig {
  maxGlobalConcurrency?: number;
  maxProviderConcurrency?: number;
  maxQueueDepth?: number;
}

export class BoundedWorkerQueue {
  private queue: QueueJob<any>[] = [];
  private activeJobsCount = 0;
  private activeByProvider = new Map<string, number>();

  private maxGlobalConcurrency: number;
  private maxProviderConcurrency: number;
  private maxQueueDepth: number;

  private stats = {
    totalEnqueued: 0,
    totalCompleted: 0,
    totalFailed: 0,
    totalRejected: 0,
    totalTimedOut: 0,
    totalCancelled: 0,
  };

  constructor(config?: BoundedQueueConfig) {
    this.maxGlobalConcurrency = config?.maxGlobalConcurrency || 8;
    this.maxProviderConcurrency = config?.maxProviderConcurrency || 3;
    this.maxQueueDepth = config?.maxQueueDepth || 100;
  }

  /**
   * Enqueues a provider job with bounded concurrency and priority execution
   */
  public enqueue<T>(
    providerId: string,
    run: (signal: AbortSignal) => Promise<T>,
    options?: { priority?: number; timeoutMs?: number; signal?: AbortSignal }
  ): Promise<T> {
    if (this.queue.length >= this.maxQueueDepth) {
      this.stats.totalRejected++;
      return Promise.reject(
        new Error(`Queue capacity exceeded (${this.maxQueueDepth} jobs waiting). System under high load.`)
      );
    }

    this.stats.totalEnqueued++;

    return new Promise<T>((resolve, reject) => {
      const job: QueueJob<T> = {
        id: `${providerId}:${Date.now()}:${Math.random().toString(36).slice(2, 7)}`,
        providerId,
        priority: options?.priority ?? 100,
        createdAt: Date.now(),
        timeoutMs: options?.timeoutMs || 8000,
        run,
        resolve,
        reject,
        signal: options?.signal,
      };

      // Handle caller-side early abort
      if (job.signal?.aborted) {
        this.stats.totalCancelled++;
        return reject(new Error('Job aborted before queue execution'));
      }

      // Insert by priority (descending order: higher priority first, FIFO for equal priority)
      let insertIdx = this.queue.length;
      for (let i = 0; i < this.queue.length; i++) {
        if (this.queue[i].priority < job.priority) {
          insertIdx = i;
          break;
        }
      }
      this.queue.splice(insertIdx, 0, job);

      // Trigger worker pump
      this.pump();
    });
  }

  private pump(): void {
    if (this.activeJobsCount >= this.maxGlobalConcurrency) {
      return;
    }

    for (let i = 0; i < this.queue.length; i++) {
      if (this.activeJobsCount >= this.maxGlobalConcurrency) break;

      const job = this.queue[i];
      const providerActive = this.activeByProvider.get(job.providerId) || 0;

      if (providerActive < this.maxProviderConcurrency) {
        // Remove from queue and run
        this.queue.splice(i, 1);
        i--; // Adjust index after splice

        this.executeJob(job);
      }
    }
  }

  private async executeJob<T>(job: QueueJob<T>): Promise<void> {
    this.activeJobsCount++;
    const currentProviderCount = this.activeByProvider.get(job.providerId) || 0;
    this.activeByProvider.set(job.providerId, currentProviderCount + 1);

    const abortController = new AbortController();
    let isFinished = false;

    // Hook caller cancellation
    const onCallerAbort = () => {
      if (!isFinished) {
        this.stats.totalCancelled++;
        abortController.abort();
      }
    };
    if (job.signal) {
      job.signal.addEventListener('abort', onCallerAbort);
    }

    // Job timeout
    const timeoutHandle = setTimeout(() => {
      if (!isFinished) {
        this.stats.totalTimedOut++;
        abortController.abort();
      }
    }, job.timeoutMs);

    try {
      const result = await job.run(abortController.signal);
      isFinished = true;
      clearTimeout(timeoutHandle);
      this.stats.totalCompleted++;
      job.resolve(result);
    } catch (err: any) {
      isFinished = true;
      clearTimeout(timeoutHandle);
      this.stats.totalFailed++;
      job.reject(err);
    } finally {
      if (job.signal) {
        job.signal.removeEventListener('abort', onCallerAbort);
      }

      this.activeJobsCount--;
      const pCount = this.activeByProvider.get(job.providerId) || 1;
      if (pCount <= 1) {
        this.activeByProvider.delete(job.providerId);
      } else {
        this.activeByProvider.set(job.providerId, pCount - 1);
      }

      // Continue pumping remaining queued jobs
      this.pump();
    }
  }

  public getStats() {
    return {
      activeJobs: this.activeJobsCount,
      queuedJobs: this.queue.length,
      maxGlobalConcurrency: this.maxGlobalConcurrency,
      maxProviderConcurrency: this.maxProviderConcurrency,
      maxQueueDepth: this.maxQueueDepth,
      activeByProvider: Object.fromEntries(this.activeByProvider.entries()),
      ...this.stats,
    };
  }
}

export const providerQueue = new BoundedWorkerQueue({
  maxGlobalConcurrency: 8,
  maxProviderConcurrency: 3,
  maxQueueDepth: 100,
});
