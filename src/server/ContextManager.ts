/**
 * Context Manager Implementation
 * Manages business context retrieval with caching layer, error handling, and audit logging
 */

import { ContextManager as IContextManager } from "../types/extension";
import { BusinessContext, CodeLocation } from "../types/business";
import { MockDataProvider } from "../mock/MockDataProvider";
import {
  AuditLogger,
  AuditSeverity,
  AuditOutcome,
  AuditCategory,
} from "../security/AuditLogger";
import { ErrorHandler, ErrorContext } from "../utils/ErrorHandler";
import { DegradedModeManager } from "../utils/DegradedModeManager";
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
  private auditLogger: AuditLogger;
  private errorHandler: ErrorHandler;
  private degradedModeManager: DegradedModeManager;
  private cleanupInterval: NodeJS.Timeout | null = null;
  private mockCache?: MockCache;

  constructor(mockDataProvider: MockDataProvider, mockCache?: MockCache) {
    this.mockDataProvider = mockDataProvider;
    this.mockCache = mockCache;
    this.auditLogger = new AuditLogger({
      enabled: true,
      logLevel: AuditSeverity.LOW,
      enablePerformanceTracking: true,
    });
    this.errorHandler = new ErrorHandler(this.auditLogger);
    this.degradedModeManager = new DegradedModeManager(this.auditLogger);

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
    await this.auditLogger.logDataAccess(
      "business_context_requested",
      `${codeLocation.filePath}:${codeLocation.startLine}-${codeLocation.endLine}`,
      context.metadata
    );

    const result = await this.errorHandler.executeWithErrorHandling(
      async () => {
        return await this.degradedModeManager.getBusinessContextWithFallback(
          codeLocation,
          async () => await this.getBusinessContextInternal(codeLocation)
        );
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
    await this.auditLogger.logDataAccess(
      "requirement_requested",
      id,
      context.metadata
    );

    return await this.errorHandler.executeWithErrorHandling(
      async () => {
        return await this.degradedModeManager.getRequirementWithFallback(
          id,
          async () => await this.mockDataProvider.getRequirementById(id)
        );
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
        this.degradedModeManager.clearCache();
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

      this.auditLogger.logEvent({
        action: "cache_invalidated",
        category: AuditCategory.SYSTEM_EVENT,
        severity: AuditSeverity.LOW,
        outcome: AuditOutcome.SUCCESS,
        metadata: {
          pattern,
          entriesCleared: pattern ? "pattern-based" : "all",
        },
      });
    } catch (error) {
      this.auditLogger.logError(
        "cache_invalidation_failed",
        error instanceof Error ? error : new Error(String(error)),
        { pattern },
        AuditSeverity.MEDIUM
      );
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
    const tracker = this.auditLogger.createPerformanceTracker(
      "get_business_context_internal"
    );

    try {
      console.log(
        `ContextManager.getBusinessContextInternal() called for: ${codeLocation.filePath}:${codeLocation.startLine}`
      );

      // 1) Check explicit mock cache first (line-aware)
      if (this.mockCache) {
        console.log("MockCache is available, checking for cached data...");
        const cachedFromMock = this.mockCache.get(
          codeLocation.filePath,
          codeLocation.startLine
        );
        if (cachedFromMock) {
          console.log("✅ Found data in MockCache!");
          await tracker.finish(AuditOutcome.SUCCESS);
          return cachedFromMock;
        } else {
          console.log(
            "❌ No data found in MockCache, falling back to MockDataProvider..."
          );
        }
      } else {
        console.log("❌ No MockCache available");
      }

      // Check cache first
      const cachedEntry = this.cache.get(cacheKey);
      if (cachedEntry && this.isCacheValid(cachedEntry)) {
        await tracker.finish(AuditOutcome.SUCCESS);
        await this.auditLogger.logEvent({
          action: "cache_hit",
          category: AuditCategory.PERFORMANCE_EVENT,
          severity: AuditSeverity.LOW,
          outcome: AuditOutcome.SUCCESS,
          metadata: { cacheKey },
        });
        return cachedEntry.data;
      }

      // 2) Fallback to mock data provider mapping
      const contexts = await this.mockDataProvider.getContextForFile(
        codeLocation.filePath
      );

      // Find the most relevant context for the specific location
      const relevantContext = this.findRelevantContext(contexts, codeLocation);

      // Cache the result (in-memory)
      try {
        this.cache.set(cacheKey, {
          data: relevantContext,
          timestamp: new Date(),
          ttl: this.defaultTTL,
        });
        this.degradedModeManager.updateServiceHealth("cache", true);
      } catch (cacheError) {
        this.degradedModeManager.updateServiceHealth("cache", false);
        await this.auditLogger.logError(
          "cache_write_failed",
          cacheError instanceof Error
            ? cacheError
            : new Error(String(cacheError)),
          { cacheKey },
          AuditSeverity.MEDIUM
        );
      }

      await tracker.finish(AuditOutcome.SUCCESS);
      return relevantContext;
    } catch (error) {
      await tracker.finish(AuditOutcome.FAILURE);
      this.degradedModeManager.updateServiceHealth("dataProvider", false);
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
    if (!this.mockCache) return;
    this.mockCache.upsert(filePath, startLine, endLine, context);
  }

  /**
   * Admin: clear mock cache (optionally by path substring)
   */
  clearMockCache(pattern?: string): void {
    if (!this.mockCache) return;
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
    degradedMode: string;
    cacheStats: any;
    errorStats: any;
  } {
    return {
      isHealthy: !this.degradedModeManager.isDegraded(),
      degradedMode: this.degradedModeManager.getCurrentMode(),
      cacheStats: this.degradedModeManager.getCacheStats(),
      errorStats: this.errorHandler.getErrorStats(),
    };
  }

  /**
   * Update service health status
   */
  updateServiceHealth(service: string, isHealthy: boolean): void {
    if (service === "dataProvider") {
      this.degradedModeManager.updateServiceHealth("dataProvider", isHealthy);
    } else if (service === "cache") {
      this.degradedModeManager.updateServiceHealth("cache", isHealthy);
    }
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

      await this.auditLogger.shutdown();
      await this.degradedModeManager.shutdown();

      await this.auditLogger.logEvent({
        action: "context_manager_shutdown",
        category: AuditCategory.SYSTEM_EVENT,
        severity: AuditSeverity.LOW,
        outcome: AuditOutcome.SUCCESS,
      });
    } catch (error) {
      console.error("Error during context manager shutdown:", error);
    }
  }
}
