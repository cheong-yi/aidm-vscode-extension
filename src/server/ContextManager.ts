/**
 * Context Manager Implementation
 * Manages business context retrieval with caching layer, error handling, and audit logging
 */

import { ContextManager as IContextManager } from "../types/extension";
import { BusinessContext, CodeLocation } from "../types/business";
import { MockDataProvider } from "../mock/MockDataProvider";
import { ErrorHandler, ErrorContext } from "../utils/errorHandler";
import { MockCache } from "./MockCache";

interface CacheEntry {
  data: BusinessContext;
  timestamp: Date;
  ttl: number;
}

export class ContextManager implements IContextManager {
  private mockDataProvider: MockDataProvider;
  private cache: Map<string, CacheEntry> = new Map();
  private defaultTTL: number = 5 * 60 * 1000; // 5 minutes
  private errorHandler: ErrorHandler;
  private cleanupInterval: NodeJS.Timeout | null = null;
  private mockCache?: MockCache;

  constructor(mockDataProvider: MockDataProvider, mockCache?: MockCache) {
    this.mockDataProvider = mockDataProvider;
    this.mockCache = mockCache;
    this.errorHandler = new ErrorHandler();

    // Start cache cleanup
    this.startCacheCleanup();
  }

  /**
   * Get business context for a code location with comprehensive error handling
   */
  async getBusinessContext(
    codeLocation: CodeLocation
  ): Promise<BusinessContext> {
    const context: ErrorContext = {
      operation: "getBusinessContext",
      component: "ContextManager",
      requestId: this.generateRequestId(),
      metadata: {
        filePath: codeLocation.filePath,
        startLine: codeLocation.startLine,
        endLine: codeLocation.endLine,
        symbolName: codeLocation.symbolName,
      },
    };

    // Log data access
    console.log(`Business context requested for ${codeLocation.filePath}:${codeLocation.startLine}-${codeLocation.endLine}`);

    const result = await this.errorHandler.executeWithErrorHandling(
      async () => {
        return await this.getBusinessContextInternal(codeLocation);
      },
      context,
      {
        enableRecovery: true,
        maxRetries: 2,
        fallbackValue: this.createEmptyContext(codeLocation),
      }
    );

    return result || this.createEmptyContext(codeLocation);
  }

  /**
   * Get requirement by ID with error handling and audit logging
   */
  async getRequirementById(id: string): Promise<any> {
    const context: ErrorContext = {
      operation: "getRequirementById",
      component: "ContextManager",
      requestId: this.generateRequestId(),
      metadata: { requirementId: id },
    };

    // Log data access
    console.log(`Requirement requested: ${id}`);

    return await this.errorHandler.executeWithErrorHandling(
      async () => {
        // Mock business requirement lookup removed - return null
        return null;
      },
      context,
      {
        enableRecovery: true,
        maxRetries: 2,
        fallbackValue: null,
      }
    );
  }

  /**
   * Invalidate cache entries with audit logging
   */
  invalidateCache(pattern?: string): void {
    try {
      if (!pattern) {
        // Clear all cache
        this.cache.clear();
        // Degraded mode cache clearing removed
      } else {
        // Clear cache entries matching pattern
        const keysToDelete: string[] = [];
        for (const key of this.cache.keys()) {
          if (key.includes(pattern)) {
            keysToDelete.push(key);
          }
        }
        keysToDelete.forEach((key) => this.cache.delete(key));
      }

      console.log(`Cache invalidated successfully, pattern: ${pattern || 'all entries'}`);
    } catch (error) {
      console.error('Cache invalidation failed:', error);
    }
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
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }

    this.cleanupInterval = setInterval(() => {
      this.cleanupExpiredCache();
    }, intervalMs);
  }

  /**
   * Internal method to get business context
   */
  private async getBusinessContextInternal(
    codeLocation: CodeLocation
  ): Promise<BusinessContext> {
    const cacheKey = this.generateCacheKey(codeLocation);
    const startTime = Date.now();
    console.log(`Starting context retrieval for ${codeLocation.filePath}:${codeLocation.startLine}`);

    try {
      console.log(
        `ContextManager.getBusinessContextInternal() called for: ${codeLocation.filePath}:${codeLocation.startLine}`
      );

      // 1) Check explicit mock cache first (line-aware)
      if (this.mockCache && !process.env.DEMO_MODE) {
        console.log("MockCache is available, checking for cached data...");
        const cachedFromMock = this.mockCache.get(
          codeLocation.filePath,
          codeLocation.startLine
        );
        if (cachedFromMock) {
          console.log("✅ Found data in MockCache!");
          console.log(`Context retrieval completed in ${Date.now() - startTime}ms`);
          return cachedFromMock;
        } else {
          console.log(
            "❌ No data found in MockCache, falling back to MockDataProvider..."
          );
        }
      } else {
        if (process.env.DEMO_MODE) {
          // Demo mode: MockCache disabled (no console output)
        } else {
          console.log("❌ No MockCache available");
        }
      }

      // Check cache first
      const cachedEntry = this.cache.get(cacheKey);
      if (cachedEntry && this.isCacheValid(cachedEntry)) {
        console.log(`Context retrieval completed in ${Date.now() - startTime}ms`);
        console.log(`Cache hit for key: ${cacheKey}`);
        return cachedEntry.data;
      }

      // 2) Mock business context lookup removed - return empty array
      const contexts: any[] = [];

      // Find the most relevant context for the specific location
      const relevantContext = this.findRelevantContext(contexts, codeLocation);

      // Cache the result (in-memory)
      try {
        this.cache.set(cacheKey, {
          data: relevantContext,
          timestamp: new Date(),
          ttl: this.defaultTTL,
        });
        // Cache health monitoring removed
      } catch (cacheError) {
        // Cache health monitoring removed
        console.error('Cache write failed:', cacheError);
      }

      console.log(`Context retrieval completed in ${Date.now() - startTime}ms`);
      return relevantContext;
    } catch (error) {
      console.log(`Context retrieval failed after ${Date.now() - startTime}ms`);
      // Data provider health monitoring removed
      throw error;
    }
  }

  /**
   * Admin: upsert explicit mock cache entry
   */
  upsertMockCache(
    filePath: string,
    startLine: number,
    endLine: number,
    context: BusinessContext
  ): void {
    if (!this.mockCache || process.env.DEMO_MODE) return;
    this.mockCache.upsert(filePath, startLine, endLine, context);
  }

  /**
   * Admin: clear mock cache (optionally by path substring)
   */
  clearMockCache(pattern?: string): void {
    if (!this.mockCache || process.env.DEMO_MODE) return;
    this.mockCache.clear(pattern);
  }

  /**
   * Create empty context for fallback scenarios
   */
  private createEmptyContext(codeLocation: CodeLocation): BusinessContext {
    return {
      requirements: [],
      implementationStatus: {
        completionPercentage: 0,
        lastVerified: new Date(),
        verifiedBy: "System",
        notes: `No business context found for ${codeLocation.filePath}:${codeLocation.startLine}-${codeLocation.endLine}`,
      },
      relatedChanges: [],
      lastUpdated: new Date(),
    };
  }

  /**
   * Generate unique request ID
   */
  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get context manager health status
   */
  getHealthStatus(): {
    isHealthy: boolean;
    cacheStats: any;
    errorStats: any;
  } {
    return {
      isHealthy: true, // Always healthy without degraded mode
      cacheStats: {
        size: this.cache.size,
        oldestEntry: null,
        newestEntry: null,
      },
      errorStats: this.errorHandler.getErrorStats(),
    };
  }

  /**
   * Update service health status (simplified - no degraded mode)
   */
  updateServiceHealth(service: string, isHealthy: boolean): void {
    // Service health monitoring removed with degraded mode
    console.log(`Service ${service} health: ${isHealthy}`);
  }

  /**
   * Shutdown context manager gracefully
   */
  async shutdown(): Promise<void> {
    try {
      if (this.cleanupInterval) {
        clearInterval(this.cleanupInterval);
        this.cleanupInterval = null;
      }

      console.log('ContextManager shutting down');
      // Degraded mode manager shutdown removed

      console.log(`ContextManager shutdown completed, cleared ${this.cache.size} cache entries`);
    } catch (error) {
      console.error("Error during context manager shutdown:", error);
    }
  }
}
