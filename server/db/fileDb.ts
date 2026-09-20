/**
 * Atomic File-Backed JSON Database
 * Provides ACID-like durability for lightweight stores:
 *  - Writes are atomic via write-to-temp and rename
 *  - In-memory cache for ultra-fast O(1) synchronous reads
 *  - Automatic directory creation and corruption recovery
 */

import fs from 'fs';
import path from 'path';

export class FileDb<T> {
  private filePath: string;
  private data: T;
  private isWriting = false;
  private pendingWrite = false;

  constructor(filename: string, private defaultFactory: () => T) {
    const dataDir = path.join(process.cwd(), 'data');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    this.filePath = path.join(dataDir, filename);
    this.data = this.readFromDisk();
  }

  private readFromDisk(): T {
    try {
      if (fs.existsSync(this.filePath)) {
        const raw = fs.readFileSync(this.filePath, 'utf-8');
        return JSON.parse(raw);
      }
    } catch (err) {
      console.warn(`[FileDb] Error reading ${this.filePath}, initializing with defaults`);
    }
    const initial = this.defaultFactory();
    this.writeToDisk(initial);
    return initial;
  }

  private writeToDisk(content: T): void {
    if (this.isWriting) {
      this.pendingWrite = true;
      return;
    }
    this.isWriting = true;
    try {
      const tmpPath = `${this.filePath}.tmp.${Date.now()}`;
      fs.writeFileSync(tmpPath, JSON.stringify(content, null, 2), 'utf-8');
      fs.renameSync(tmpPath, this.filePath);
    } catch (err) {
      console.error(`[FileDb] Failed writing ${this.filePath}:`, err);
    } finally {
      this.isWriting = false;
      if (this.pendingWrite) {
        this.pendingWrite = false;
        this.writeToDisk(this.data);
      }
    }
  }

  public get(): T {
    return this.data;
  }

  public size(): number {
    if (Array.isArray(this.data)) {
      return this.data.length;
    }
    if (this.data && typeof this.data === 'object') {
      return Object.keys(this.data).length;
    }
    return 0;
  }

  public update(updater: (current: T) => T): T {
    this.data = updater(this.data);
    this.writeToDisk(this.data);
    return this.data;
  }
}
