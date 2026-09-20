/**
 * Recents Database (Separate Small Database 1)
 * Stores playback history, resume points, and watch completion percentages.
 */

import { FileDb } from './fileDb';
import { MediaItem } from '../types/media';

export interface RecentItem {
  id: string;
  mediaItem: MediaItem;
  currentTime: number;        // Position in seconds
  duration: number;           // Total duration in seconds
  progressPercent: number;    // 0 to 100
  lastPlayedAt: string;       // ISO Timestamp
  completed: boolean;
}

export class RecentsDb {
  private db: FileDb<RecentItem[]>;

  constructor() {
    this.db = new FileDb<RecentItem[]>('recents.db.json', () => []);
  }

  public getAll(limit = 30): RecentItem[] {
    const list = this.db.get();
    return list
      .sort((a, b) => new Date(b.lastPlayedAt).getTime() - new Date(a.lastPlayedAt).getTime())
      .slice(0, limit);
  }

  public getById(id: string): RecentItem | null {
    const list = this.db.get();
    return list.find((item) => item.id === id) || null;
  }

  public record(
    mediaItem: MediaItem,
    currentTime: number,
    duration: number
  ): RecentItem {
    const validDuration = duration > 0 ? duration : (mediaItem.duration || 0);
    const progressPercent =
      validDuration > 0 ? Math.min(100, Math.round((currentTime / validDuration) * 100)) : 0;
    const completed = progressPercent >= 90;

    const recordItem: RecentItem = {
      id: mediaItem.id,
      mediaItem,
      currentTime: Math.max(0, currentTime),
      duration: validDuration,
      progressPercent,
      lastPlayedAt: new Date().toISOString(),
      completed,
    };

    this.db.update((current) => {
      // Remove previous entry of this item if exists
      const filtered = current.filter((item) => item.id !== mediaItem.id);
      // Prepend newest to top, max 60 records
      return [recordItem, ...filtered].slice(0, 60);
    });

    return recordItem;
  }

  public remove(id: string): boolean {
    let removed = false;
    this.db.update((current) => {
      const filtered = current.filter((item) => item.id !== id);
      if (filtered.length !== current.length) {
        removed = true;
      }
      return filtered;
    });
    return removed;
  }

  public clear(): void {
    this.db.update(() => []);
  }
}

export const recentsDb = new RecentsDb();
