/**
 * Degraded Mode Manager
 * Handles system operation when services are unavailable or degraded
 */

import * as vscode from "vscode";
import { Logger, LoggerFactory } from "./logger";
import { auditTrail, AuditAction, AuditEventType } from "./auditTrail";
import { ConnectionStatus } from "../types/extension";
import {
  BusinessContext,
  CodeLocation,
  Requirement,
  Change,
  ImplementationStatus,
} from "../types/business";

export enum DegradedModeLevel {
  NORMAL = 0,
  PARTIAL = 1,
  MINIMAL = 2,
  OFFLINE = 3,
}

export interface DegradedModeConfig {
  enableCaching: boolean;
  enableMockData: boolean;
  enableUserNotifications: boolean;
  cacheRetentionTime: number;
  maxRetryAttempts: number;
  fallbackDataSource: "cache" | "mock" | "static";
}

export interface ServiceHealth {
  mcpServer: boolean;
  dataProvider: boolean;
  cache: boolean;
  network: boolean;
}

export interface DegradedModeState {
  level: DegradedModeLevel;
  activeServices: ServiceHealth;
  lastHealthCheck: Date;
  degradationReason: string;
  estimatedRecoveryTime?: Date;
}

/**
 * Manages system operation in degraded conditions
 */
export class DegradedModeManager {
  private logger: Logger;
  private config: DegradedModeConfig;
  private currentState: DegradedModeState;
  private healthCheckInterval?: NodeJS.Timeout;
  private statusBarItem?: vscode.StatusBarItem;

  constructor(config: Partial<DegradedModeConfig> = {}) {
    this.logger = LoggerFactory.getLogger("DegradedModeManager");
    this.config = {
      enableCaching: true,
      enableMockData: true,
      enableUserNotifications: true,
      cacheRetentionTime: 300000, // 5 minutes
      maxRetryAttempts: 3,
      fallbackDataSource: "cache",
      ...config,
    };

    this.currentState = {
      level: DegradedModeLevel.NORMAL,
      activeServices: {
        mcpServer: true,
        dataProvider: true,
        cache: true,
        network: true,
      },
      lastHealthCheck: new Date(),
      degradationReason: "System operating normally",
    };

    this.initializeStatusBar();
    this.startHealthMonitoring();
  }

  /**
   * Check system health and update degraded mode level
   */
  async checkSystemHealth(): Promise<DegradedModeState> {
    const startTime = Date.now();

    try {
      const health = await this.performHealthChecks();
      const newLevel = this.calculateDegradationLevel(health);

      if (newLevel !== this.currentState.level) {
        await this.transitionToLevel(newLevel, health);
      }

      this.currentState = {
        ...this.currentState,
        activeServices: health,
        lastHealthCheck: new Date(),
      };

      const duration = Date.now() - startTime;
      auditTrail.recordSystemEvent(
        AuditAction.STATUS_CHECK,
        "DegradedModeManager",
        {
          metadata: {
            level: DegradedModeLevel[this.currentState.level],
            services: health,
            duration,
          },
          success: true,
        }
      );

      return this.currentState;
    } catch (error) {
      this.logger.error(
        "Health check failed",
        error instanceof Error ? error : new Error(String(error))
      );

      auditTrail.recordError(
        AuditAction.STATUS_CHECK,
        "DegradedModeManager",
        error instanceof Error ? error : new Error(String(error))
      );

      return this.currentState;
    }
  }

  /**
   * Get fallback data when primary services are unavailable
   */
  async getFallbackBusinessContext(
    codeLocation: CodeLocation
  ): Promise<BusinessContext | null> {
    try {
      switch (this.config.fallbackDataSource) {
        case "cache":
          return await this.getCachedContext(codeLocation);
        case "mock":
          return this.generateMockContext(codeLocation);
        case "static":
          return this.getStaticFallbackContext();
        default:
          return null;
      }
    } catch (error) {
      this.logger.error(
        "Fallback data retrieval failed",
        error instanceof Error ? error : new Error(String(error))
      );
      return this.getStaticFallbackContext();
    }
  }

  /**
   * Execute operation with degraded mode awareness
   */
  async executeWithDegradation<T>(
    operation: () => Promise<T>,
    fallback: () => Promise<T> | T,
    context: { component: string; operation: string }
  ): Promise<T> {
    if (this.currentState.level === DegradedModeLevel.NORMAL) {
      try {
        return await operation();
      } catch (error) {
        this.logger.warn(
          `Operation failed, attempting fallback: ${context.component}.${context.operation}`,
          error instanceof Error ? error : new Error(String(error))
        );
        return await fallback();
      }
    }

    // In degraded mode, use fallback directly
    this.logger.info(
      `Using fallback for ${context.component}.${
        context.operation
      } (degraded mode: ${DegradedModeLevel[this.currentState.level]})`
    );
    return await fallback();
  }

  /**
   * Get current degraded mode state
   */
  getCurrentState(): DegradedModeState {
    return { ...this.currentState };
  }

  /**
   * Force transition to specific degradation level
   */
  async forceDegradationLevel(
    level: DegradedModeLevel,
    reason: string
  ): Promise<void> {
    this.logger.warn(
      `Forcing degradation to level ${DegradedModeLevel[level]}: ${reason}`
    );

    await this.transitionToLevel(
      level,
      this.currentState.activeServices,
      reason
    );

    auditTrail.recordSystemEvent(
      AuditAction.CONFIG_UPDATE,
      "DegradedModeManager",
      {
        metadata: {
          forcedLevel: DegradedModeLevel[level],
          reason,
        },
        success: true,
      }
    );
  }

  /**
   * Attempt to recover from degraded mode
   */
  async attemptRecovery(): Promise<boolean> {
    this.logger.info("Attempting recovery from degraded mode");

    try {
      const health = await this.performHealthChecks();
      const newLevel = this.calculateDegradationLevel(health);

      if (newLevel < this.currentState.level) {
        await this.transitionToLevel(newLevel, health, "Recovery successful");
        return true;
      }

      return false;
    } catch (error) {
      this.logger.error(
        "Recovery attempt failed",
        error instanceof Error ? error : new Error(String(error))
      );
      return false;
    }
  }

  /**
   * Dispose resources
   */
  dispose(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }
    if (this.statusBarItem) {
      this.statusBarItem.dispose();
    }
  }

  private async performHealthChecks(): Promise<ServiceHealth> {
    // Simulate health checks - in real implementation, these would be actual service calls
    return {
      mcpServer: await this.checkMCPServerHealth(),
      dataProvider: await this.checkDataProviderHealth(),
      cache: await this.checkCacheHealth(),
      network: await this.checkNetworkHealth(),
    };
  }

  private async checkMCPServerHealth(): Promise<boolean> {
    try {
      // Simulate MCP server health check
      // In real implementation, this would make an actual health check request
      return true;
    } catch {
      return false;
    }
  }

  private async checkDataProviderHealth(): Promise<boolean> {
    try {
      // Simulate data provider health check
      return true;
    } catch {
      return false;
    }
  }

  private async checkCacheHealth(): Promise<boolean> {
    try {
      // Simulate cache health check
      return true;
    } catch {
      return false;
    }
  }

  private async checkNetworkHealth(): Promise<boolean> {
    try {
      // Simulate network health check
      return true;
    } catch {
      return false;
    }
  }

  private calculateDegradationLevel(health: ServiceHealth): DegradedModeLevel {
    const healthyServices = Object.values(health).filter(Boolean).length;
    const totalServices = Object.keys(health).length;
    const healthPercentage = (healthyServices / totalServices) * 100;

    if (healthPercentage >= 100) return DegradedModeLevel.NORMAL;
    if (healthPercentage >= 75) return DegradedModeLevel.PARTIAL;
    if (healthPercentage >= 25) return DegradedModeLevel.MINIMAL;
    return DegradedModeLevel.OFFLINE;
  }

  private async transitionToLevel(
    newLevel: DegradedModeLevel,
    health: ServiceHealth,
    customReason?: string
  ): Promise<void> {
    const oldLevel = this.currentState.level;
    const reason = customReason || this.generateDegradationReason(health);

    this.currentState = {
      ...this.currentState,
      level: newLevel,
      degradationReason: reason,
      estimatedRecoveryTime:
        newLevel > DegradedModeLevel.NORMAL
          ? new Date(Date.now() + 300000) // 5 minutes
          : undefined,
    };

    this.logger.info(
      `Degradation level changed: ${DegradedModeLevel[oldLevel]} -> ${DegradedModeLevel[newLevel]}`,
      {
        reason,
        health,
      }
    );

    this.updateStatusBar();

    if (this.config.enableUserNotifications) {
      await this.notifyUser(oldLevel, newLevel, reason);
    }

    auditTrail.recordSystemEvent(
      AuditAction.CONFIG_UPDATE,
      "DegradedModeManager",
      {
        metadata: {
          oldLevel: DegradedModeLevel[oldLevel],
          newLevel: DegradedModeLevel[newLevel],
          reason,
          health,
        },
        success: true,
      }
    );
  }

  private generateDegradationReason(health: ServiceHealth): string {
    const failedServices = Object.entries(health)
      .filter(([, isHealthy]) => !isHealthy)
      .map(([service]) => service);

    if (failedServices.length === 0) {
      return "System operating normally";
    }

    return `Services unavailable: ${failedServices.join(", ")}`;
  }

  private async getCachedContext(
    codeLocation: CodeLocation
  ): Promise<BusinessContext | null> {
    // Simulate cache lookup
    // In real implementation, this would check actual cache
    return null;
  }

  private generateMockContext(codeLocation: CodeLocation): BusinessContext {
    return {
      requirements: [
        {
          id: "mock-req-1",
          title: "Mock Requirement (Degraded Mode)",
          description: "This is mock data provided during service degradation.",
          type: "functional" as any,
          priority: "medium" as any,
          status: "in_progress" as any,
          stakeholders: ["System"],
          createdDate: new Date(),
          lastModified: new Date(),
          tags: ["mock", "degraded"],
        },
      ],
      implementationStatus: {
        completionPercentage: 0,
        lastVerified: new Date(),
        verifiedBy: "System (Degraded Mode)",
        notes: "Data unavailable - showing mock information",
      },
      relatedChanges: [],
      lastUpdated: new Date(),
    };
  }

  private getStaticFallbackContext(): BusinessContext {
    return {
      requirements: [],
      implementationStatus: {
        completionPercentage: 0,
        lastVerified: new Date(),
        verifiedBy: "System",
        notes: "Service temporarily unavailable",
      },
      relatedChanges: [],
      lastUpdated: new Date(),
    };
  }

  private initializeStatusBar(): void {
    this.statusBarItem = vscode.window.createStatusBarItem(
      vscode.StatusBarAlignment.Right,
      100
    );
    this.statusBarItem.command = "enterpriseAiContext.showDegradedModeStatus";
    this.updateStatusBar();
    this.statusBarItem.show();
  }

  private updateStatusBar(): void {
    if (!this.statusBarItem) return;

    const level = this.currentState.level;
    const levelName = DegradedModeLevel[level];

    switch (level) {
      case DegradedModeLevel.NORMAL:
        this.statusBarItem.text = "$(check) Context";
        this.statusBarItem.backgroundColor = undefined;
        this.statusBarItem.tooltip = "Enterprise AI Context: Normal operation";
        break;
      case DegradedModeLevel.PARTIAL:
        this.statusBarItem.text = "$(warning) Context";
        this.statusBarItem.backgroundColor = new vscode.ThemeColor(
          "statusBarItem.warningBackground"
        );
        this.statusBarItem.tooltip = `Enterprise AI Context: Partial degradation - ${this.currentState.degradationReason}`;
        break;
      case DegradedModeLevel.MINIMAL:
        this.statusBarItem.text = "$(error) Context";
        this.statusBarItem.backgroundColor = new vscode.ThemeColor(
          "statusBarItem.errorBackground"
        );
        this.statusBarItem.tooltip = `Enterprise AI Context: Minimal operation - ${this.currentState.degradationReason}`;
        break;
      case DegradedModeLevel.OFFLINE:
        this.statusBarItem.text = "$(x) Context";
        this.statusBarItem.backgroundColor = new vscode.ThemeColor(
          "statusBarItem.errorBackground"
        );
        this.statusBarItem.tooltip = `Enterprise AI Context: Offline - ${this.currentState.degradationReason}`;
        break;
    }
  }

  private async notifyUser(
    oldLevel: DegradedModeLevel,
    newLevel: DegradedModeLevel,
    reason: string
  ): Promise<void> {
    if (newLevel > oldLevel) {
      // Degradation
      const message = `Enterprise AI Context: Service degraded to ${DegradedModeLevel[newLevel]} mode. ${reason}`;

      if (newLevel >= DegradedModeLevel.MINIMAL) {
        vscode.window
          .showErrorMessage(message, "Show Details")
          .then((selection) => {
            if (selection === "Show Details") {
              this.showDegradedModeDetails();
            }
          });
      } else {
        vscode.window.showWarningMessage(message);
      }
    } else if (newLevel < oldLevel && newLevel === DegradedModeLevel.NORMAL) {
      // Recovery
      vscode.window.showInformationMessage(
        "Enterprise AI Context: Service restored to normal operation"
      );
    }
  }

  private showDegradedModeDetails(): void {
    const details = {
      level: DegradedModeLevel[this.currentState.level],
      reason: this.currentState.degradationReason,
      services: this.currentState.activeServices,
      lastCheck: this.currentState.lastHealthCheck.toISOString(),
      estimatedRecovery: this.currentState.estimatedRecoveryTime?.toISOString(),
    };

    vscode.window.showInformationMessage("Degraded Mode Details", {
      modal: true,
      detail: JSON.stringify(details, null, 2),
    });
  }

  private startHealthMonitoring(): void {
    // Check health every 30 seconds
    this.healthCheckInterval = setInterval(() => {
      this.checkSystemHealth().catch((error) => {
        this.logger.error(
          "Scheduled health check failed",
          error instanceof Error ? error : new Error(String(error))
        );
      });
    }, 30000);
  }
}

/**
 * Global degraded mode manager instance
 */
export const degradedModeManager = new DegradedModeManager();
