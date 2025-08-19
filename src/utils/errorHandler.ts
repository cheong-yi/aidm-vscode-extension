/**
 * Enhanced Error Handling System
 * Provides error boundaries, recovery strategies, and fallback mechanisms
 */

import * as vscode from "vscode";
import { Logger, LoggerFactory } from "./logger";
import { auditTrail, AuditAction, AuditEventType } from "./auditTrail";
import { ErrorCode, ErrorResponse } from "../types/extension";

export interface ErrorContext {
  component: string;
  operation: string;
  requestId?: string;
  userId?: string;
  metadata?: Record<string, any>;
}

export interface RecoveryStrategy {
  name: string;
  canRecover: (error: Error, context: ErrorContext) => boolean;
  recover: (error: Error, context: ErrorContext) => Promise<any>;
  maxAttempts: number;
}

export interface FallbackData {
  type: "cached" | "mock" | "empty";
  data: any;
  timestamp: Date;
  source: string;
}

export interface ErrorBoundaryConfig {
  maxRetries: number;
  retryDelay: number;
  enableFallbacks: boolean;
  enableRecovery: boolean;
  notifyUser: boolean;
}

/**
 * Enhanced error handler with recovery strategies and fallbacks
 */
export class ErrorHandler {
  private logger: Logger;
  private recoveryStrategies: RecoveryStrategy[] = [];
  private fallbackCache = new Map<string, FallbackData>();
  private config: ErrorBoundaryConfig;

  constructor(component: string, config: Partial<ErrorBoundaryConfig> = {}) {
    this.logger = LoggerFactory.getLogger(`ErrorHandler:${component}`);
    this.config = {
      maxRetries: 3,
      retryDelay: 1000,
      enableFallbacks: true,
      enableRecovery: true,
      notifyUser: true,
      ...config,
    };

    this.initializeDefaultStrategies();
  }

  /**
   * Handle an error with recovery and fallback strategies
   */
  async handleError<T>(
    error: Error,
    context: ErrorContext,
    fallbackFn?: () => Promise<T> | T
  ): Promise<T | null> {
    const startTime = Date.now();

    // Log the error
    this.logger.error(
      `Error in ${context.component}.${context.operation}`,
      error,
      context.metadata,
      context.requestId
    );

    // Record audit event
    auditTrail.recordError(
      this.mapOperationToAuditAction(context.operation),
      context.component,
      error,
      {
        userId: context.userId,
        requestId: context.requestId,
        metadata: context.metadata,
      }
    );

    try {
      // Try recovery strategies if enabled
      if (this.config.enableRecovery) {
        const recoveryResult = await this.attemptRecovery(error, context);
        if (recoveryResult !== null) {
          const duration = Date.now() - startTime;
          this.logger.info(
            `Recovery successful for ${context.component}.${context.operation}`,
            { duration, strategy: recoveryResult.strategy },
            context.requestId
          );
          return recoveryResult.data;
        }
      }

      // Try fallback mechanisms if enabled
      if (this.config.enableFallbacks) {
        const fallbackResult = await this.attemptFallback(context, fallbackFn);
        if (fallbackResult !== null) {
          const duration = Date.now() - startTime;
          this.logger.info(
            `Fallback successful for ${context.component}.${context.operation}`,
            { duration, fallbackType: fallbackResult.type },
            context.requestId
          );
          return fallbackResult.data;
        }
      }

      // Notify user if configured
      if (this.config.notifyUser) {
        this.notifyUser(error, context);
      }

      return null;
    } catch (handlingError) {
      this.logger.error(
        `Error handling failed for ${context.component}.${context.operation}`,
        handlingError instanceof Error
          ? handlingError
          : new Error(String(handlingError)),
        { originalError: error.message },
        context.requestId
      );
      return null;
    }
  }

  /**
   * Execute an operation with error boundary protection
   */
  async withErrorBoundary<T>(
    operation: () => Promise<T>,
    context: ErrorContext,
    fallbackFn?: () => Promise<T> | T
  ): Promise<T | null> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= this.config.maxRetries; attempt++) {
      try {
        const result = await operation();

        // Record successful operation
        auditTrail.recordEvent(
          AuditEventType.SYSTEM_EVENT,
          this.mapOperationToAuditAction(context.operation),
          context.component,
          {
            userId: context.userId,
            requestId: context.requestId,
            metadata: { ...context.metadata, attempt },
            success: true,
          }
        );

        return result;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        this.logger.warn(
          `Operation failed (attempt ${attempt}/${this.config.maxRetries})`,
          { ...context.metadata, attempt },
          context.requestId
        );

        // Wait before retry (except on last attempt)
        if (attempt < this.config.maxRetries) {
          await this.delay(this.config.retryDelay * attempt);
        }
      }
    }

    // All retries failed, handle the error
    return this.handleError(lastError!, context, fallbackFn);
  }

  /**
   * Add a custom recovery strategy
   */
  addRecoveryStrategy(strategy: RecoveryStrategy): void {
    this.recoveryStrategies.push(strategy);
    this.logger.debug(`Added recovery strategy: ${strategy.name}`);
  }

  /**
   * Cache fallback data for later use
   */
  cacheFallbackData(key: string, data: any, source: string): void {
    this.fallbackCache.set(key, {
      type: "cached",
      data,
      timestamp: new Date(),
      source,
    });
  }

  /**
   * Get cached fallback data
   */
  getCachedFallbackData(
    key: string,
    maxAge: number = 300000
  ): FallbackData | null {
    const cached = this.fallbackCache.get(key);
    if (!cached) return null;

    const age = Date.now() - cached.timestamp.getTime();
    if (age > maxAge) {
      this.fallbackCache.delete(key);
      return null;
    }

    return cached;
  }

  /**
   * Create a standardized error response
   */
  createErrorResponse(
    code: ErrorCode,
    message: string,
    details?: any,
    requestId?: string
  ): ErrorResponse {
    return {
      code,
      message,
      details,
      timestamp: new Date(),
      requestId: requestId || this.generateRequestId(),
    };
  }

  /**
   * Check if an error is recoverable
   */
  isRecoverableError(error: Error): boolean {
    // Network errors are often recoverable
    if (
      error.message.includes("ECONNREFUSED") ||
      error.message.includes("ECONNABORTED") ||
      error.message.includes("timeout")
    ) {
      return true;
    }

    // Server errors might be recoverable
    if (
      error.message.includes("500") ||
      error.message.includes("502") ||
      error.message.includes("503")
    ) {
      return true;
    }

    return false;
  }

  private async attemptRecovery(
    error: Error,
    context: ErrorContext
  ): Promise<{ data: any; strategy: string } | null> {
    for (const strategy of this.recoveryStrategies) {
      if (strategy.canRecover(error, context)) {
        try {
          this.logger.debug(
            `Attempting recovery with strategy: ${strategy.name}`,
            undefined,
            context.requestId
          );

          const data = await strategy.recover(error, context);
          return { data, strategy: strategy.name };
        } catch (recoveryError) {
          this.logger.warn(
            `Recovery strategy ${strategy.name} failed`,
            undefined,
            context.requestId
          );
        }
      }
    }
    return null;
  }

  private async attemptFallback<T>(
    context: ErrorContext,
    fallbackFn?: () => Promise<T> | T
  ): Promise<{ data: T; type: string } | null> {
    // Try custom fallback function first
    if (fallbackFn) {
      try {
        const data = await fallbackFn();
        return { data, type: "custom" };
      } catch (fallbackError) {
        this.logger.warn(
          "Custom fallback failed",
          undefined,
          context.requestId
        );
      }
    }

    // Try cached data
    const cacheKey = `${context.component}.${context.operation}`;
    const cached = this.getCachedFallbackData(cacheKey);
    if (cached) {
      return { data: cached.data, type: "cached" };
    }

    // Try mock data for specific operations
    if (
      context.operation.includes("context") ||
      context.operation.includes("requirement")
    ) {
      const mockData = this.generateMockFallbackData(context.operation);
      if (mockData) {
        return { data: mockData, type: "mock" };
      }
    }

    return null;
  }

  private generateMockFallbackData(operation: string): any {
    if (operation.includes("context")) {
      return {
        requirements: [],
        implementationStatus: "unknown",
        relatedChanges: [],
        lastUpdated: new Date(),
        source: "fallback",
        message: "Service temporarily unavailable. Showing fallback data.",
      };
    }

    if (operation.includes("requirement")) {
      return {
        id: "fallback-req",
        title: "Service Unavailable",
        description: "Unable to retrieve requirement details at this time.",
        status: "unknown",
        source: "fallback",
      };
    }

    return null;
  }

  private notifyUser(error: Error, context: ErrorContext): void {
    const userMessage = this.getUserFriendlyMessage(error, context);

    if (this.isRecoverableError(error)) {
      vscode.window
        .showWarningMessage(userMessage, "Retry", "Show Details")
        .then((selection) => {
          if (selection === "Show Details") {
            this.showErrorDetails(error, context);
          }
        });
    } else {
      vscode.window
        .showErrorMessage(userMessage, "Show Details")
        .then((selection) => {
          if (selection === "Show Details") {
            this.showErrorDetails(error, context);
          }
        });
    }
  }

  private getUserFriendlyMessage(error: Error, context: ErrorContext): string {
    if (error.message.includes("ECONNREFUSED")) {
      return "Unable to connect to the context service. Please check if the service is running.";
    }

    if (error.message.includes("timeout")) {
      return "The request timed out. The service may be experiencing high load.";
    }

    if (error.message.includes("404")) {
      return "The requested information was not found.";
    }

    return `An error occurred in ${context.component}: ${error.message}`;
  }

  private showErrorDetails(error: Error, context: ErrorContext): void {
    const details = {
      component: context.component,
      operation: context.operation,
      error: error.message,
      timestamp: new Date().toISOString(),
      requestId: context.requestId,
    };

    vscode.window.showInformationMessage("Error Details", {
      modal: true,
      detail: JSON.stringify(details, null, 2),
    });
  }

  private initializeDefaultStrategies(): void {
    // Connection retry strategy
    this.addRecoveryStrategy({
      name: "connection-retry",
      canRecover: (error) => error.message.includes("ECONNREFUSED"),
      recover: async (error, context) => {
        await this.delay(2000);
        throw error; // Let the retry mechanism handle it
      },
      maxAttempts: 3,
    });

    // Timeout retry strategy
    this.addRecoveryStrategy({
      name: "timeout-retry",
      canRecover: (error) => error.message.includes("timeout"),
      recover: async (error, context) => {
        await this.delay(1000);
        throw error; // Let the retry mechanism handle it
      },
      maxAttempts: 2,
    });
  }

  private mapOperationToAuditAction(operation: string): AuditAction {
    if (operation.includes("hover")) return AuditAction.HOVER_REQUEST;
    if (operation.includes("search")) return AuditAction.SEARCH_REQUEST;
    if (operation.includes("context")) return AuditAction.CONTEXT_RETRIEVAL;
    if (operation.includes("requirement"))
      return AuditAction.REQUIREMENT_ACCESS;
    if (operation.includes("status")) return AuditAction.STATUS_CHECK;
    return AuditAction.REQUEST_FAILED;
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
  }
}

/**
 * Global error handler factory
 */
export class ErrorHandlerFactory {
  private static handlers = new Map<string, ErrorHandler>();

  static getHandler(
    component: string,
    config?: Partial<ErrorBoundaryConfig>
  ): ErrorHandler {
    if (!this.handlers.has(component)) {
      this.handlers.set(component, new ErrorHandler(component, config));
    }
    return this.handlers.get(component)!;
  }

  static clearHandlers(): void {
    this.handlers.clear();
  }
}
