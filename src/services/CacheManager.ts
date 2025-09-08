/**
 * Basic TTL Cache Manager
 * Simple in-memory cache with time-to-live expiration
 */

export class CacheManager {
  private cache = new Map<string, { data: any; expiry: number }>();

  async get<T>(key: string): Promise<T | null> {
    const item = this.cache.get(key);
    if (!item) return null;

    if (Date.now() > item.expiry) {
      this.cache.delete(key);
      return null;
    }

    return item.data as T;
  }

  async set<T>(key: string, data: T, ttlMs: number): Promise<void> {
    if (ttlMs <= 0) {
      throw new Error('TTL must be positive');
    }
    
    this.cache.set(key, {
      data,
      expiry: Date.now() + ttlMs,
    });
  }

  async delete(key: string): Promise<void> {
    this.cache.delete(key);
  }

  async clear(): Promise<void> {
    this.cache.clear();
  }

  /**
   * Get cache size (number of items)
   */
  size(): number {
    return this.cache.size;
  }

  /**
   * Cleanup expired entries manually
   */
  cleanup(): number {
    const now = Date.now();
    let removed = 0;
    
    for (const [key, item] of this.cache.entries()) {
      if (now > item.expiry) {
        this.cache.delete(key);
        removed++;
      }
    }
    
    return removed;
  }
}
