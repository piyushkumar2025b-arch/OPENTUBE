/**
 * Multi-Tier Hierarchical Cache with Stale-While-Revalidate
 * - L1: In-memory LRU Cache with O(1) eviction
 * - L2: Persistent JSON cache store with TTL and background asynchronous revalidation
 */

import fs from 'fs';
import path from 'path';

interface CacheEntry<T> {
  key: string;
  data: T;
  expiresAt: number;        // Absolute timestamp when entry expires
  staleUntil: number;       // Stale-while-revalidate window
  updatedAt: number;
}

// Doubly linked list node for O(1) LRU eviction
interface LRUNode<T> {
  key: string;
  value: CacheEntry<T>;
  prev: LRUNode<T> | null;
  next: LRUNode<T> | null;
}

export class MemoryLRUCache<T = unknown> {
  private capacity: number;
  private map = new Map<string, LRUNode<T>>();
  private head: LRUNode<T> | null = null;
  private tail: LRUNode<T> | null = null;

  constructor(capacity = 500) {
    this.capacity = capacity;
  }

  private removeNode(node: LRUNode<T>) {
    if (node.prev) {
      node.prev.next = node.next;
    } else {
      this.head = node.next;
    }
    if (node.next) {
      node.next.prev = node.prev;
    } else {
      this.tail = node.prev;
    }
  }

  private moveToHead(node: LRUNode<T>) {
    this.removeNode(node);
    node.prev = null;
    node.next = this.head;
    if (this.head) {
      this.head.prev = node;
    }
    this.head = node;
    if (!this.tail) {
      this.tail = node;
    }
  }

  public get(key: string): CacheEntry<T> | null {
    const node = this.map.get(key);
    if (!node) return null;
    this.moveToHead(node);
    return node.value;
  }

  public set(key: string, entry: CacheEntry<T>): void {
    const existing = this.map.get(key);
    if (existing) {
      existing.value = entry;
      this.moveToHead(existing);
      return;
    }

    const newNode: LRUNode<T> = {
      key,
      value: entry,
      prev: null,
      next: this.head,
    };

    if (this.head) {
      this.head.prev = newNode;
    }
    this.head = newNode;
    if (!this.tail) {
      this.tail = newNode;
    }
    this.map.set(key, newNode);

    // Evict least recently used if over capacity
    if (this.map.size > this.capacity && this.tail) {
      const lruKey = this.tail.key;
      this.removeNode(this.tail);
      this.map.delete(lruKey);
    }
  }

  public delete(key: string): boolean {
    const node = this.map.get(key);
    if (!node) return false;
    this.removeNode(node);
    this.map.delete(key);
    return true;
  }

  public clear(): void {
    this.map.clear();
    this.head = null;
    this.tail = null;
  }

  public size(): number {
    return this.map.size;
  }
}

export class MultiTierCache {
  private l1 = new MemoryLRUCache<any>(1000);
  private l2FilePath: string;
  private l2Cache = new Map<string, CacheEntry<any>>();
  private inFlightRevalidations = new Map<string, Promise<any>>();
  private stats = {
    l1Hits: 0,
    l2Hits: 0,
    misses: 0,
    revalidations: 0,
    writes: 0,
  };
  private isSaving = false;
  private pendingSave = false;

  constructor(dbDir: string) {
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }
    this.l2FilePath = path.join(dbDir, 'cache.db.json');
    this.loadL2FromDisk();

    // Periodic disk flush every 30 seconds
    setInterval(() => {
      this.flushToDisk();
      this.pruneExpired();
    }, 30000).unref();
  }

  private loadL2FromDisk(): void {
    try {
      if (fs.existsSync(this.l2FilePath)) {
        const raw = fs.readFileSync(this.l2FilePath, 'utf-8');
        const parsed = JSON.parse(raw);
        const now = Date.now();
        for (const [k, v] of Object.entries(parsed)) {
          const entry = v as CacheEntry<any>;
          // Keep only unexpired or still stale-revalidatable
          if (entry.staleUntil > now) {
            // Sanitize cached media items if needed
            if (entry.data && Array.isArray(entry.data.results)) {
              for (const item of entry.data.results) {
                if (item.playbackUrl && typeof item.playbackUrl === 'string') {
                  if (!item.playbackUrl.startsWith('http://') && !item.playbackUrl.startsWith('https://') && !item.playbackUrl.startsWith('/')) {
                    item.playbackUrl = `https://${item.playbackUrl}`;
                  }
                  if (item.playbackUrl.includes('/embed/') || item.playbackUrl.includes('/videos/embed/')) {
                    if (!item.embedUrl) item.embedUrl = item.playbackUrl;
                    item.playbackUrl = null;
                  }
                }
                if (item.embedUrl && typeof item.embedUrl === 'string' && !item.embedUrl.startsWith('http://') && !item.embedUrl.startsWith('https://')) {
                  item.embedUrl = `https://${item.embedUrl}`;
                }
                if (item.thumbnailUrl && typeof item.thumbnailUrl === 'string' && !item.thumbnailUrl.startsWith('http://') && !item.thumbnailUrl.startsWith('https://') && !item.thumbnailUrl.startsWith('/')) {
                  item.thumbnailUrl = `https://${item.thumbnailUrl}`;
                }
              }
            }
            this.l2Cache.set(k, entry);
          }
        }
      }
    } catch {
      this.l2Cache.clear();
    }
  }

  private flushToDisk(): void {
    if (this.isSaving) {
      this.pendingSave = true;
      return;
    }
    this.isSaving = true;
    try {
      const obj: Record<string, CacheEntry<any>> = {};
      const now = Date.now();
      for (const [k, entry] of this.l2Cache.entries()) {
        if (entry.staleUntil > now) {
          obj[k] = entry;
        }
      }
      const tmpPath = `${this.l2FilePath}.tmp`;
      fs.writeFileSync(tmpPath, JSON.stringify(obj, null, 2), 'utf-8');
      fs.renameSync(tmpPath, this.l2FilePath);
    } catch (err) {
      // Ignored disk flush error
    } finally {
      this.isSaving = false;
      if (this.pendingSave) {
        this.pendingSave = false;
        this.flushToDisk();
      }
    }
  }

  private pruneExpired(): void {
    const now = Date.now();
    for (const [key, entry] of this.l2Cache.entries()) {
      if (entry.staleUntil <= now) {
        this.l2Cache.delete(key);
      }
    }
  }

  /**
   * Get item with Stale-While-Revalidate support
   */
  public get<T>(
    key: string,
    revalidateFn?: () => Promise<T>
  ): { data: T | null; isStale: boolean } {
    const now = Date.now();

    // Check L1
    const l1Entry = this.l1.get(key) as CacheEntry<T> | null;
    if (l1Entry) {
      if (now < l1Entry.expiresAt) {
        this.stats.l1Hits++;
        return { data: l1Entry.data, isStale: false };
      }
      if (now < l1Entry.staleUntil) {
        this.stats.l1Hits++;
        if (revalidateFn) {
          this.triggerBackgroundRevalidate(key, revalidateFn, l1Entry.expiresAt - l1Entry.updatedAt);
        }
        return { data: l1Entry.data, isStale: true };
      }
    }

    // Check L2
    const l2Entry = this.l2Cache.get(key) as CacheEntry<T> | undefined;
    if (l2Entry) {
      // Populate back to L1
      this.l1.set(key, l2Entry);

      if (now < l2Entry.expiresAt) {
        this.stats.l2Hits++;
        return { data: l2Entry.data, isStale: false };
      }
      if (now < l2Entry.staleUntil) {
        this.stats.l2Hits++;
        if (revalidateFn) {
          this.triggerBackgroundRevalidate(key, revalidateFn, l2Entry.expiresAt - l2Entry.updatedAt);
        }
        return { data: l2Entry.data, isStale: true };
      }
    }

    this.stats.misses++;
    return { data: null, isStale: false };
  }

  public set<T>(key: string, data: T, ttlSeconds = 300, staleGraceSeconds = 600): void {
    const now = Date.now();
    const entry: CacheEntry<T> = {
      key,
      data,
      expiresAt: now + ttlSeconds * 1000,
      staleUntil: now + (ttlSeconds + staleGraceSeconds) * 1000,
      updatedAt: now,
    };

    this.l1.set(key, entry);
    this.l2Cache.set(key, entry);
    this.stats.writes++;
  }

  private triggerBackgroundRevalidate<T>(
    key: string,
    revalidateFn: () => Promise<T>,
    ttlMs: number
  ): void {
    // Single-flight stampede protection: if already revalidating this key, do not launch another job
    if (this.inFlightRevalidations.has(key)) {
      return;
    }

    this.stats.revalidations++;

    const promise = Promise.resolve()
      .then(revalidateFn)
      .then((freshData) => {
        if (freshData !== null && freshData !== undefined) {
          this.set(key, freshData, Math.max(60, Math.floor(ttlMs / 1000)));
        }
        return freshData;
      })
      .catch(() => {
        // Background revalidation failures are silent to preserve current cache
        return null;
      })
      .finally(() => {
        this.inFlightRevalidations.delete(key);
      });

    this.inFlightRevalidations.set(key, promise);
  }

  public delete(key: string): void {
    this.l1.delete(key);
    this.l2Cache.delete(key);
  }

  public getStats() {
    const totalLookups = this.stats.l1Hits + this.stats.l2Hits + this.stats.misses;
    const hitRate =
      totalLookups > 0
        ? Math.round(((this.stats.l1Hits + this.stats.l2Hits) / totalLookups) * 100)
        : 0;

    return {
      l1Size: this.l1.size(),
      l2Size: this.l2Cache.size,
      l1Hits: this.stats.l1Hits,
      l2Hits: this.stats.l2Hits,
      misses: this.stats.misses,
      writes: this.stats.writes,
      revalidations: this.stats.revalidations,
      hitRatePercent: hitRate,
    };
  }
}

const defaultDbDir = path.join(process.cwd(), 'data');
export const multiTierCache = new MultiTierCache(defaultDbDir);
