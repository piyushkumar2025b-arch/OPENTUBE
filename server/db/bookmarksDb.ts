/**
 * Bookmarks / Watchlist Database (Separate Small Database 2)
 * Stores saved media items, user tags, and timestamps.
 */

import { FileDb } from './fileDb';
import { MediaItem } from '../types/media';

export interface BookmarkItem {
  id: string;
  mediaItem: MediaItem;
  savedAt: string;
  tag?: string;
}

export class BookmarksDb {
  private db: FileDb<BookmarkItem[]>;

  constructor() {
    this.db = new FileDb<BookmarkItem[]>('bookmarks.db.json', () => []);
  }

  public getAll(): BookmarkItem[] {
    const list = this.db.get();
    return list.sort(
      (a, b) => new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime()
    );
  }

  public has(id: string): boolean {
    return this.db.get().some((item) => item.id === id);
  }

  public toggle(mediaItem: MediaItem, tag?: string): { isBookmarked: boolean } {
    let isBookmarked = false;

    this.db.update((current) => {
      const existingIndex = current.findIndex((item) => item.id === mediaItem.id);
      if (existingIndex >= 0) {
        // Remove bookmark
        isBookmarked = false;
        return current.filter((item) => item.id !== mediaItem.id);
      } else {
        // Add bookmark
        isBookmarked = true;
        const newBookmark: BookmarkItem = {
          id: mediaItem.id,
          mediaItem,
          savedAt: new Date().toISOString(),
          tag,
        };
        return [newBookmark, ...current];
      }
    });

    return { isBookmarked };
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
}

export const bookmarksDb = new BookmarksDb();
