/**
 * Context Manager Implementation
 * Consolidated implementation with single caching mechanism
 */

import { ContextManager as IContextManager } from "../types/extension";
// Inline business types (removed business.ts dependency)
interface CodeLocation {
  filePath: string;
  startLine: number;
  endLine: number;
  symbolName?: string;
  symbolType?: string;
}

interface BusinessContext {
  requirements: any[];
  implementationStatus: any;
  relatedChanges: any[];
  lastUpdated: Date;
  functionMappings?: Record<string, any>;
}
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
    this.startCacheCleanup();
  }

  /**
   * Get business context for a code location
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

    console.log(`Business context requested for ${codeLocation.filePath}:${codeLocation.startLine}-${codeLocation.endLine}`);

    const result = await this.errorHandler.executeWithErrorHandling(
      async () => {
        return await this.getContextFromCache(codeLocation);
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
   * Get requirement by ID - simplified implementation
   */
  async getRequirementById(id: string): Promise<any> {
    console.log(`Requirement requested: ${id}`);
    return null; // Simplified - no business requirements in current implementation
  }

  /**
   * Invalidate cache entries
   */
  invalidateCache(pattern?: string): void {
    try {
      if (!pattern) {
        this.cache.clear();
      } else {
        const keysToDelete = Array.from(this.cache.keys()).filter(key => key.includes(pattern));
        keysToDelete.forEach(key => this.cache.delete(key));
      }
      console.log(`Cache invalidated: ${pattern || 'all entries'}`);
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
   * Get context from cache with consolidated caching logic
   */
  private async getContextFromCache(
    codeLocation: CodeLocation
  ): Promise<BusinessContext> {
    const cacheKey = this.generateCacheKey(codeLocation);
    console.log(`Context retrieval for ${codeLocation.filePath}:${codeLocation.startLine}`);

    // Check MockCache first if available
    if (this.mockCache && !process.env.DEMO_MODE) {
      const cachedFromMock = this.mockCache.get(
        codeLocation.filePath,
        codeLocation.startLine
      );
      if (cachedFromMock) {
        console.log("Found data in MockCache");
        return cachedFromMock;
      }
    }

    // Check internal cache
    const cachedEntry = this.cache.get(cacheKey);
    if (cachedEntry && this.isCacheValid(cachedEntry)) {
      console.log(`Cache hit for key: ${cacheKey}`);
      return cachedEntry.data;
    }

    // Create empty context and cache it
    const emptyContext = this.createEmptyContext(codeLocation);
    
    try {
      this.cache.set(cacheKey, {
        data: emptyContext,
        timestamp: new Date(),
        ttl: this.defaultTTL,
      });
    } catch (cacheError) {
      console.error('Cache write failed:', cacheError);
    }

    return emptyContext;
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
    if (!this.mockCache || process.env.DEMO_MODE) {return;}
    this.mockCache.upsert(filePath, startLine, endLine, context);
  }

  /**
   * Admin: clear mock cache (optionally by path substring)
   */
  clearMockCache(pattern?: string): void {
    if (!this.mockCache || process.env.DEMO_MODE) {return;}
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
      isHealthy: true,
      cacheStats: { size: this.cache.size },
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
      const cacheSize = this.cache.size;
      this.cache.clear();
      console.log(`ContextManager shutdown completed, cleared ${cacheSize} cache entries`);
    } catch (error) {
      console.error("Error during context manager shutdown:", error);
    }
  }
}
