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

    // If in offline mode, return null (no fallbacks available)
    if (this.currentMode === DegradedModeLevel.OFFLINE) {
      await this.auditLogger.logEvent({
        action: "degraded_mode.business_context_offline",
        category: AuditCategory.SYSTEM_EVENT,
        severity: AuditSeverity.HIGH,
        outcome: AuditOutcome.FAILURE,
        metadata: {
          codeLocation,
          currentMode: this.currentMode,
          reason: "Operating in offline mode - no fallbacks available",
        },
      });
      return null;
    }

    // If in minimal mode, try only cache fallback (no primary provider, no static fallback)
    if (this.currentMode === DegradedModeLevel.MINIMAL) {
      if (this.config.cacheEnabled) {
        const cached = this.fallbackCache.get(cacheKey);
        if (cached && this.isCacheValid(cached.timestamp)) {
          await this.auditLogger.logEvent({
            action: "degraded_mode.business_context_cache_hit",
            category: AuditCategory.SYSTEM_EVENT,
            severity: AuditSeverity.MEDIUM,
            outcome: AuditOutcome.PARTIAL,
            metadata: {
              codeLocation,
              currentMode: this.currentMode,
              reason: "Using cached data in minimal mode",
            },
          });
          return cached.data;
        }
      }
      
      await this.auditLogger.logEvent({
        action: "degraded_mode.business_context_minimal_no_cache",
        category: AuditCategory.SYSTEM_EVENT,
        severity: AuditSeverity.MEDIUM,
        outcome: AuditOutcome.FAILURE,
        metadata: {
          codeLocation,
          currentMode: this.currentMode,
          reason: "No cached data available in minimal mode",
        },
      });
      return null;
    }

    // In normal or partial mode, try primary provider first
    if (this.currentMode === DegradedModeLevel.NORMAL) {
      try {
        const result = await primaryProvider();

        // Cache successful result
        if (this.config.cacheEnabled) {
          this.fallbackCache.set(cacheKey, {
            data: result,
            timestamp: Date.now(),
          });
        }

        return result;
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
    }

    // Try fallback mechanisms (for both normal and partial modes)
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

    // If in offline mode, return null (no fallbacks available)
    if (this.currentMode === DegradedModeLevel.OFFLINE) {
      await this.auditLogger.logEvent({
        action: "degraded_mode.requirement_offline",
        category: AuditCategory.SYSTEM_EVENT,
        severity: AuditSeverity.HIGH,
        outcome: AuditOutcome.FAILURE,
        metadata: {
          requirementId,
          currentMode: this.currentMode,
          reason: "Operating in offline mode - no fallbacks available",
        },
      });
      return null;
    }

    // If in minimal mode, try only cache fallback (no primary provider, no static fallback)
    if (this.currentMode === DegradedModeLevel.MINIMAL) {
      if (this.config.cacheEnabled) {
        const cached = this.fallbackCache.get(cacheKey);
        if (cached && this.isCacheValid(cached.timestamp)) {
          await this.auditLogger.logEvent({
            action: "degraded_mode.requirement_cache_hit",
            category: AuditCategory.SYSTEM_EVENT,
            severity: AuditSeverity.MEDIUM,
            outcome: AuditOutcome.PARTIAL,
            metadata: {
              requirementId,
              currentMode: this.currentMode,
              reason: "Using cached data in minimal mode",
            },
          });
          return cached.data;
        }
      }
      
      await this.auditLogger.logEvent({
        action: "degraded_mode.requirement_minimal_no_cache",
        category: AuditCategory.SYSTEM_EVENT,
        severity: AuditSeverity.MEDIUM,
        outcome: AuditOutcome.FAILURE,
        metadata: {
          requirementId,
          currentMode: this.currentMode,
          reason: "No cached data available in minimal mode",
        },
      });
      return null;
    }

    // In normal or partial mode, try primary provider first
    if (this.currentMode === DegradedModeLevel.NORMAL) {
      try {
        const result = await primaryProvider();

        if (this.config.cacheEnabled) {
          this.fallbackCache.set(cacheKey, {
            data: result,
            timestamp: Date.now(),
          });
        }

        return result;
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
    }

    // Try fallback mechanisms (for both normal and partial modes)
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
   * Execute operation with degradation handling and fallback
   */
  executeWithDegradation<T>(
    operation: () => Promise<T>,
    fallback: () => Promise<T>,
    context?: { component: string; operation: string }
  ): Promise<T> {
    // If in degraded mode, skip primary operation and use fallback
    if (this.currentMode !== DegradedModeLevel.NORMAL) {
      this.auditLogger.logEvent({
        action: "degraded_mode.fallback_used",
        category: AuditCategory.SYSTEM_EVENT,
        severity: AuditSeverity.MEDIUM,
        outcome: AuditOutcome.PARTIAL,
        metadata: {
          component: context?.component || "unknown",
          operation: context?.operation || "unknown",
          currentMode: this.currentMode,
          reason: "Operating in degraded mode",
        },
      });

      return fallback();
    }

    // Try primary operation first
    return operation().catch(async (error) => {
      // Log the failure
      await this.auditLogger.logError(
        "degraded_mode.operation_failed",
        error instanceof Error ? error : new Error(String(error)),
        {
          component: context?.component || "unknown",
          operation: context?.operation || "unknown",
          currentMode: this.currentMode,
        },
        AuditSeverity.MEDIUM
      );

      // Use fallback
      this.auditLogger.logEvent({
        action: "degraded_mode.fallback_triggered",
        category: AuditCategory.SYSTEM_EVENT,
        severity: AuditSeverity.MEDIUM,
        outcome: AuditOutcome.PARTIAL,
        metadata: {
          component: context?.component || "unknown",
          operation: context?.operation || "unknown",
          error: error instanceof Error ? error.message : String(error),
        },
      });

      return fallback();
    });
  }

  /**
   * Force degradation to a specific level
   */
  async forceDegradationLevel(
    level: DegradedModeLevel,
    reason: string
  ): Promise<void> {
    const previousMode = this.currentMode;
    this.currentMode = level;

    // Update service health based on degradation level
    if (level === DegradedModeLevel.OFFLINE) {
      this.serviceHealth = {
        mcpServer: false,
        dataProvider: false,
        cache: false,
        auditLogger: false,
      };
    } else if (level === DegradedModeLevel.MINIMAL) {
      this.serviceHealth = {
        mcpServer: false,
        dataProvider: false,
        cache: true,
        auditLogger: true,
      };
    } else if (level === DegradedModeLevel.PARTIAL) {
      this.serviceHealth = {
        mcpServer: false,
        dataProvider: true,
        cache: true,
        auditLogger: true,
      };
    }

    await this.auditLogger.logEvent({
      action: "degraded_mode.level_forced",
      category: AuditCategory.SYSTEM_EVENT,
      severity: AuditSeverity.HIGH,
      outcome: AuditOutcome.SUCCESS,
      metadata: {
        previousMode,
        newMode: level,
        reason,
        forced: true,
        serviceHealth: this.serviceHealth,
      },
    });

    this.notifyStatusChange();
  }

  /**
   * Attempt to recover from degraded mode
   */
  async attemptRecovery(): Promise<boolean> {
    const previousMode = this.currentMode;

    try {
      // Perform health checks
      const healthStatus = await this.performHealthChecks();

      // Evaluate if we can recover
      const healthyServices =
        Object.values(healthStatus).filter(Boolean).length;
      const totalServices = Object.keys(healthStatus).length;

      if (healthyServices === totalServices) {
        this.currentMode = DegradedModeLevel.NORMAL;
        this.serviceHealth = {
          mcpServer: true,
          dataProvider: true,
          cache: true,
          auditLogger: true,
        };

        await this.auditLogger.logEvent({
          action: "degraded_mode.recovery_successful",
          category: AuditCategory.SYSTEM_EVENT,
          severity: AuditSeverity.MEDIUM,
          outcome: AuditOutcome.SUCCESS,
          metadata: {
            previousMode,
            newMode: this.currentMode,
            healthStatus,
          },
        });

        this.notifyStatusChange();
        return true;
      } else if (healthyServices >= totalServices * 0.75) {
        this.currentMode = DegradedModeLevel.PARTIAL;
      } else if (healthyServices >= totalServices * 0.5) {
        this.currentMode = DegradedModeLevel.MINIMAL;
      } else {
        this.currentMode = DegradedModeLevel.OFFLINE;
      }

      // Update service health based on health check results
      this.serviceHealth = healthStatus;

      await this.auditLogger.logEvent({
        action: "degraded_mode.recovery_partial",
        category: AuditCategory.SYSTEM_EVENT,
        severity: AuditSeverity.MEDIUM,
        outcome: AuditOutcome.PARTIAL,
        metadata: {
          previousMode,
          newMode: this.currentMode,
          healthStatus,
        },
      });

      this.notifyStatusChange();
      return false;
    } catch (error) {
      await this.auditLogger.logError(
        "degraded_mode.recovery_failed",
        error instanceof Error ? error : new Error(String(error)),
        {
          previousMode,
          currentMode: this.currentMode,
        },
        AuditSeverity.HIGH
      );

      return false;
    }
  }

  /**
   * Get current degradation state
   */
  getCurrentState(): {
    level: DegradedModeLevel;
    isActive: boolean;
    lastError?: Error;
    serviceHealth: ServiceHealth;
  } {
    return {
      level: this.currentMode,
      isActive: this.currentMode !== DegradedModeLevel.NORMAL,
      serviceHealth: { ...this.serviceHealth },
    };
  }

  /**
   * Perform health checks on all services
   */
  async performHealthChecks(): Promise<ServiceHealth> {
    const healthStatus: ServiceHealth = {
      mcpServer: true,
      dataProvider: true,
      cache: true,
      auditLogger: true,
    };

    try {
      // Check MCP server health (simplified check)
      // In a real implementation, this would make an actual health check request
      healthStatus.mcpServer = this.serviceHealth.mcpServer;

      // Check data provider health
      healthStatus.dataProvider = this.serviceHealth.dataProvider;

      // Check cache health
      healthStatus.cache = this.config.cacheEnabled;

      // Check audit logger health
      healthStatus.auditLogger = this.auditLogger !== null;
    } catch (error) {
      // If health checks fail, assume all services are unhealthy
      healthStatus.mcpServer = false;
      healthStatus.dataProvider = false;
      healthStatus.cache = false;
      healthStatus.auditLogger = false;

      await this.auditLogger.logError(
        "degraded_mode.health_check_failed",
        error instanceof Error ? error : new Error(String(error)),
        {
          currentMode: this.currentMode,
        },
        AuditSeverity.HIGH
      );
    }

    return healthStatus;
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
