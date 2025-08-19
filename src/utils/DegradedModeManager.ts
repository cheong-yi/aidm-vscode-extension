/**
 * Degraded Mode Manager
 * Handles fallback mechanisms for degraded mode operation
 */

import {
  AuditLogger,
  AuditSeverity,
  AuditOutcome,
  AuditCategory,
} from "../security/AuditLogger";
import { BusinessContext, CodeLocation, Requirement } from "../types/business";
import { ConnectionStatus } from "../types/extension";

export interface DegradedModeConfig {
  enabled: boolean;
  fallbackDataEnabled: boolean;
  cacheEnabled: boolean;
  maxCacheAge: number;
  staticFallbackEnabled: boolean;
  notificationEnabled: boolean;
}

export interface ServiceHealth {
  mcpServer: boolean;
  dataProvider: boolean;
  cache: boolean;
  auditLogger: boolean;
}

export enum DegradedModeLevel {
  NORMAL = "normal",
  PARTIAL = "partial",
  MINIMAL = "minimal",
  OFFLINE = "offline",
}

export class DegradedModeManager {
  private auditLogger: AuditLogger;
  private config: DegradedModeConfig;
  private currentMode: DegradedModeLevel = DegradedModeLevel.NORMAL;
  private serviceHealth: ServiceHealth = {
    mcpServer: true,
    dataProvider: true,
    cache: true,
    auditLogger: true,
  };
  private fallbackCache: Map<string, { data: any; timestamp: number }> =
    new Map();
  private statusChangeListeners: ((
    status: ConnectionStatus,
    mode: DegradedModeLevel
  ) => void)[] = [];
  private healthCheckInterval: NodeJS.Timeout | null = null;

  constructor(auditLogger: AuditLogger, config?: Partial<DegradedModeConfig>) {
    this.auditLogger = auditLogger;
    this.config = {
      enabled: true,
      fallbackDataEnabled: true,
      cacheEnabled: true,
      maxCacheAge: 300000, // 5 minutes
      staticFallbackEnabled: true,
      notificationEnabled: true,
      ...config,
    };

    this.startHealthMonitoring();
  }

  /**
   * Get business context with degraded mode fallbacks
   */
  async getBusinessContextWithFallback(
    codeLocation: CodeLocation,
    primaryProvider: () => Promise<BusinessContext>
  ): Promise<BusinessContext | null> {
    const cacheKey = this.getCacheKey(codeLocation);

    try {
      // Try primary provider first
      if (this.currentMode === DegradedModeLevel.NORMAL) {
        const result = await primaryProvider();

        // Cache successful result
        if (this.config.cacheEnabled) {
          this.fallbackCache.set(cacheKey, {
            data: result,
            timestamp: Date.now(),
          });
        }

        return result;
      }
    } catch (error) {
      await this.auditLogger.logError(
        "degraded_mode.primary_provider_failed",
        error instanceof Error ? error : new Error(String(error)),
        {
          codeLocation,
          currentMode: this.currentMode,
        },
        AuditSeverity.HIGH
      );

      // Update service health
      this.updateServiceHealth("dataProvider", false);
    }

    // Try fallback mechanisms
    return await this.getFallbackBusinessContext(codeLocation, cacheKey);
  }

  /**
   * Get requirement details with fallback
   */
  async getRequirementWithFallback(
    requirementId: string,
    primaryProvider: () => Promise<any>
  ): Promise<any | null> {
    const cacheKey = `requirement_${requirementId}`;

    try {
      if (this.currentMode === DegradedModeLevel.NORMAL) {
        const result = await primaryProvider();

        if (this.config.cacheEnabled) {
          this.fallbackCache.set(cacheKey, {
            data: result,
            timestamp: Date.now(),
          });
        }

        return result;
      }
    } catch (error) {
      await this.auditLogger.logError(
        "degraded_mode.requirement_provider_failed",
        error instanceof Error ? error : new Error(String(error)),
        {
          requirementId,
          currentMode: this.currentMode,
        },
        AuditSeverity.HIGH
      );
    }

    // Try fallback mechanisms
    return await this.getFallbackRequirement(requirementId, cacheKey);
  }

  /**
   * Update service health status
   */
  updateServiceHealth(service: keyof ServiceHealth, isHealthy: boolean): void {
    const wasHealthy = this.serviceHealth[service];
    this.serviceHealth[service] = isHealthy;

    if (wasHealthy !== isHealthy) {
      this.evaluateDegradedMode();

      this.auditLogger.logEvent({
        action: `degraded_mode.service_health_changed`,
        category: AuditCategory.SYSTEM_EVENT,
        severity: isHealthy ? AuditSeverity.MEDIUM : AuditSeverity.HIGH,
        outcome: isHealthy ? AuditOutcome.SUCCESS : AuditOutcome.FAILURE,
        metadata: {
          service,
          isHealthy,
          currentMode: this.currentMode,
          serviceHealth: this.serviceHealth,
        },
      });
    }
  }

  /**
   * Get current degraded mode level
   */
  getCurrentMode(): DegradedModeLevel {
    return this.currentMode;
  }

  /**
   * Get service health status
   */
  getServiceHealth(): ServiceHealth {
    return { ...this.serviceHealth };
  }

  /**
   * Check if service is operating in degraded mode
   */
  isDegraded(): boolean {
    return this.currentMode !== DegradedModeLevel.NORMAL;
  }

  /**
   * Force degraded mode (for testing or maintenance)
   */
  async forceDegradedMode(
    mode: DegradedModeLevel,
    reason: string
  ): Promise<void> {
    const previousMode = this.currentMode;
    this.currentMode = mode;

    await this.auditLogger.logEvent({
      action: "degraded_mode.forced",
      category: AuditCategory.SYSTEM_EVENT,
      severity: AuditSeverity.HIGH,
      outcome: AuditOutcome.SUCCESS,
      metadata: {
        previousMode,
        newMode: mode,
        reason,
        forced: true,
      },
    });

    this.notifyStatusChange();
  }

  /**
   * Restore normal mode
   */
  async restoreNormalMode(): Promise<void> {
    const previousMode = this.currentMode;

    // Reset service health to healthy
    this.serviceHealth = {
      mcpServer: true,
      dataProvider: true,
      cache: true,
      auditLogger: true,
    };

    this.currentMode = DegradedModeLevel.NORMAL;

    await this.auditLogger.logEvent({
      action: "degraded_mode.restored",
      category: AuditCategory.SYSTEM_EVENT,
      severity: AuditSeverity.MEDIUM,
      outcome: AuditOutcome.SUCCESS,
      metadata: {
        previousMode,
        newMode: this.currentMode,
      },
    });

    this.notifyStatusChange();
  }

  /**
   * Add status change listener
   */
  onStatusChange(
    listener: (status: ConnectionStatus, mode: DegradedModeLevel) => void
  ): void {
    this.statusChangeListeners.push(listener);
  }

  /**
   * Clear fallback cache
   */
  clearCache(): void {
    this.fallbackCache.clear();

    this.auditLogger.logEvent({
      action: "degraded_mode.cache_cleared",
      category: AuditCategory.SYSTEM_EVENT,
      severity: AuditSeverity.LOW,
      outcome: AuditOutcome.SUCCESS,
      metadata: {
        currentMode: this.currentMode,
      },
    });
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): {
    size: number;
    oldestEntry: number | null;
    newestEntry: number | null;
  } {
    const timestamps = Array.from(this.fallbackCache.values()).map(
      (entry) => entry.timestamp
    );

    return {
      size: this.fallbackCache.size,
      oldestEntry: timestamps.length > 0 ? Math.min(...timestamps) : null,
      newestEntry: timestamps.length > 0 ? Math.max(...timestamps) : null,
    };
  }

  /**
   * Shutdown degraded mode manager
   */
  async shutdown(): Promise<void> {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }

    this.clearCache();
    this.statusChangeListeners = [];

    await this.auditLogger.logEvent({
      action: "degraded_mode.shutdown",
      category: AuditCategory.SYSTEM_EVENT,
      severity: AuditSeverity.LOW,
      outcome: AuditOutcome.SUCCESS,
      metadata: {
        finalMode: this.currentMode,
      },
    });
  }

  /**
   * Get fallback business context from cache or static data
   */
  private async getFallbackBusinessContext(
    codeLocation: CodeLocation,
    cacheKey: string
  ): Promise<BusinessContext | null> {
    // Try cache first
    if (this.config.cacheEnabled) {
      const cached = this.fallbackCache.get(cacheKey);
      if (cached && this.isCacheValid(cached.timestamp)) {
        await this.auditLogger.logEvent({
          action: "degraded_mode.cache_hit",
          category: AuditCategory.SYSTEM_EVENT,
          severity: AuditSeverity.LOW,
          outcome: AuditOutcome.SUCCESS,
          metadata: {
            cacheKey,
            cacheAge: Date.now() - cached.timestamp,
          },
        });

        return cached.data;
      }
    }

    // Try static fallback data
    if (this.config.staticFallbackEnabled) {
      const staticData = this.getStaticFallbackData(codeLocation);
      if (staticData) {
        await this.auditLogger.logEvent({
          action: "degraded_mode.static_fallback_used",
          category: AuditCategory.SYSTEM_EVENT,
          severity: AuditSeverity.MEDIUM,
          outcome: AuditOutcome.PARTIAL,
          metadata: {
            codeLocation,
            currentMode: this.currentMode,
          },
        });

        return staticData;
      }
    }

    // No fallback available
    await this.auditLogger.logEvent({
      action: "degraded_mode.no_fallback_available",
      category: AuditCategory.SYSTEM_EVENT,
      severity: AuditSeverity.HIGH,
      outcome: AuditOutcome.FAILURE,
      metadata: {
        codeLocation,
        currentMode: this.currentMode,
        cacheEnabled: this.config.cacheEnabled,
        staticFallbackEnabled: this.config.staticFallbackEnabled,
      },
    });

    return null;
  }

  /**
   * Get fallback requirement from cache or static data
   */
  private async getFallbackRequirement(
    requirementId: string,
    cacheKey: string
  ): Promise<any | null> {
    // Try cache first
    if (this.config.cacheEnabled) {
      const cached = this.fallbackCache.get(cacheKey);
      if (cached && this.isCacheValid(cached.timestamp)) {
        return cached.data;
      }
    }

    // Try static fallback
    if (this.config.staticFallbackEnabled) {
      return this.getStaticRequirementFallback(requirementId);
    }

    return null;
  }

  /**
   * Generate static fallback business context
   */
  private getStaticFallbackData(
    codeLocation: CodeLocation
  ): BusinessContext | null {
    // Generate minimal static context based on file path patterns
    const fileName = codeLocation.filePath.split("/").pop() || "";

    if (fileName.toLowerCase().includes("test")) {
      return null; // No context for test files
    }

    const staticRequirement: Requirement = {
      id: `static_${Date.now()}`,
      title: `Static Context for ${fileName}`,
      description:
        "This is fallback context data provided during degraded mode operation. Actual business requirements may differ.",
      type: "functional" as any,
      priority: "medium" as any,
      status: "draft" as any,
      stakeholders: ["System"],
      createdDate: new Date(),
      lastModified: new Date(),
      tags: ["fallback", "degraded-mode"],
    };

    return {
      requirements: [staticRequirement],
      implementationStatus: {
        completionPercentage: 0,
        lastVerified: new Date(),
        verifiedBy: "System (Degraded Mode)",
        notes:
          "This is fallback data. Actual implementation status may differ.",
      },
      relatedChanges: [],
      lastUpdated: new Date(),
    };
  }

  /**
   * Generate static requirement fallback
   */
  private getStaticRequirementFallback(requirementId: string): any {
    return {
      id: requirementId,
      title: "Fallback Requirement",
      description:
        "This is fallback requirement data provided during degraded mode operation.",
      type: "functional",
      priority: "medium",
      status: "draft",
      stakeholders: ["System"],
      createdDate: new Date(),
      lastModified: new Date(),
      tags: ["fallback", "degraded-mode"],
    };
  }

  /**
   * Check if cached data is still valid
   */
  private isCacheValid(timestamp: number): boolean {
    return Date.now() - timestamp < this.config.maxCacheAge;
  }

  /**
   * Generate cache key for code location
   */
  private getCacheKey(codeLocation: CodeLocation): string {
    return `context_${codeLocation.filePath}_${codeLocation.startLine}_${codeLocation.endLine}`;
  }

  /**
   * Evaluate and update degraded mode based on service health
   */
  private evaluateDegradedMode(): void {
    const previousMode = this.currentMode;
    const healthyServices = Object.values(this.serviceHealth).filter(
      Boolean
    ).length;
    const totalServices = Object.keys(this.serviceHealth).length;

    if (healthyServices === totalServices) {
      this.currentMode = DegradedModeLevel.NORMAL;
    } else if (healthyServices >= totalServices * 0.75) {
      this.currentMode = DegradedModeLevel.PARTIAL;
    } else if (healthyServices >= totalServices * 0.5) {
      this.currentMode = DegradedModeLevel.MINIMAL;
    } else {
      this.currentMode = DegradedModeLevel.OFFLINE;
    }

    if (previousMode !== this.currentMode) {
      this.notifyStatusChange();
    }
  }

  /**
   * Notify status change listeners
   */
  private notifyStatusChange(): void {
    const connectionStatus = this.getConnectionStatus();

    this.statusChangeListeners.forEach((listener) => {
      try {
        listener(connectionStatus, this.currentMode);
      } catch (error) {
        console.error("Error in degraded mode status change listener:", error);
      }
    });
  }

  /**
   * Convert degraded mode to connection status
   */
  private getConnectionStatus(): ConnectionStatus {
    switch (this.currentMode) {
      case DegradedModeLevel.NORMAL:
        return ConnectionStatus.Connected;
      case DegradedModeLevel.PARTIAL:
      case DegradedModeLevel.MINIMAL:
        return ConnectionStatus.Connecting; // Partial functionality
      case DegradedModeLevel.OFFLINE:
        return ConnectionStatus.Disconnected;
      default:
        return ConnectionStatus.Error;
    }
  }

  /**
   * Start health monitoring
   */
  private startHealthMonitoring(): void {
    this.healthCheckInterval = setInterval(() => {
      this.performHealthCheck();
    }, 30000); // Check every 30 seconds
  }

  /**
   * Perform periodic health check
   */
  private performHealthCheck(): void {
    // Clean up expired cache entries
    if (this.config.cacheEnabled) {
      const now = Date.now();
      for (const [key, entry] of this.fallbackCache.entries()) {
        if (!this.isCacheValid(entry.timestamp)) {
          this.fallbackCache.delete(key);
        }
      }
    }

    // Log health status
    this.auditLogger.logEvent({
      action: "degraded_mode.health_check",
      category: AuditCategory.SYSTEM_EVENT,
      severity: AuditSeverity.LOW,
      outcome: AuditOutcome.SUCCESS,
      metadata: {
        currentMode: this.currentMode,
        serviceHealth: this.serviceHealth,
        cacheStats: this.getCacheStats(),
      },
    });
  }
}
