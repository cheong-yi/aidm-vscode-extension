/**
 * Context Manager Implementation
 * Manages business context retrieval with caching layer
 */

import { ContextManager as IContextManager } from "../types/extension";
import { BusinessContext, CodeLocation } from "../types/business";
import { MockDataProvider } from "../mock/MockDataProvider";

interface CacheEntry {
  data: BusinessContext;
  timestamp: Date;
  ttl: number;
}

export class ContextManager implements IContextManager {
  private mockDataProvider: MockDataProvider;
  private cache: Map<string, CacheEntry> = new Map();
  private defaultTTL: number = 5 * 60 * 1000; // 5 minutes

  constructor(mockDataProvider: MockDataProvider) {
    this.mockDataProvider = mockDataProvider;
  }

  /**
   * Get business context for a code location
   */
  async getBusinessContext(
    codeLocation: CodeLocation
  ): Promise<BusinessContext> {
    const cacheKey = this.generateCacheKey(codeLocation);

    // Check cache first
    const cachedEntry = this.cache.get(cacheKey);
    if (cachedEntry && this.isCacheValid(cachedEntry)) {
      return cachedEntry.data;
    }

    try {
      // Get context from mock data provider
      const contexts = await this.mockDataProvider.getContextForFile(
        codeLocation.filePath
      );

      // Find the most relevant context for the specific location
      const relevantContext = this.findRelevantContext(contexts, codeLocation);

      // Cache the result
      this.cache.set(cacheKey, {
        data: relevantContext,
        timestamp: new Date(),
        ttl: this.defaultTTL,
      });

      return relevantContext;
    } catch (error) {
      console.error("Error getting business context:", error);

      // Return empty context if no data found
      return {
        requirements: [],
        implementationStatus: {
          completionPercentage: 0,
          lastVerified: new Date(),
          verifiedBy: "System",
        },
        relatedChanges: [],
        lastUpdated: new Date(),
      };
    }
  }

  /**
   * Get requirement by ID
   */
  async getRequirementById(id: string): Promise<any> {
    try {
      return await this.mockDataProvider.getRequirementById(id);
    } catch (error) {
      console.error("Error getting requirement by ID:", error);
      return null;
    }
  }

  /**
   * Invalidate cache entries
   */
  invalidateCache(pattern?: string): void {
    if (!pattern) {
      // Clear all cache
      this.cache.clear();
      return;
    }

    // Clear cache entries matching pattern
    const keysToDelete: string[] = [];
    for (const key of this.cache.keys()) {
      if (key.includes(pattern)) {
        keysToDelete.push(key);
      }
    }

    keysToDelete.forEach((key) => this.cache.delete(key));
  }

  /**
   * Generate cache key for code location
   */
  private generateCacheKey(codeLocation: CodeLocation): string {
    return `${codeLocation.filePath}:${codeLocation.startLine}-${
      codeLocation.endLine
    }:${codeLocation.symbolName || "unknown"}`;
  }

  /**
   * Check if cache entry is still valid
   */
  private isCacheValid(entry: CacheEntry): boolean {
    const now = new Date();
    return now.getTime() - entry.timestamp.getTime() < entry.ttl;
  }

  /**
   * Find the most relevant context for a specific code location
   */
  private findRelevantContext(
    contexts: BusinessContext[],
    codeLocation: CodeLocation
  ): BusinessContext {
    if (contexts.length === 0) {
      return {
        requirements: [],
        implementationStatus: {
          completionPercentage: 0,
          lastVerified: new Date(),
          verifiedBy: "System",
        },
        relatedChanges: [],
        lastUpdated: new Date(),
      };
    }

    // For now, return the first context
    // In a real implementation, this would use more sophisticated matching
    // based on line numbers, symbol names, etc.
    return contexts[0];
  }

  /**
   * Clean up expired cache entries
   */
  private cleanupExpiredCache(): void {
    const now = new Date();
    const keysToDelete: string[] = [];

    for (const [key, entry] of this.cache.entries()) {
      if (!this.isCacheValid(entry)) {
        keysToDelete.push(key);
      }
    }

    keysToDelete.forEach((key) => this.cache.delete(key));
  }

  /**
   * Start periodic cache cleanup
   */
  startCacheCleanup(intervalMs: number = 60000): void {
    setInterval(() => {
      this.cleanupExpiredCache();
    }, intervalMs);
  }
}
