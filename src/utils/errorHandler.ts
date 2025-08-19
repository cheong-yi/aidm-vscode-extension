/**
 * Comprehensive Error Handling System
 * Centralized error handling with recovery strategies and audit logging
 */

import {
  AuditLogger,
  AuditSeverity,
  AuditOutcome,
  AuditCategory,
} from "../security/AuditLogger";
import { ErrorCode, ErrorResponse } from "../types/extension";

export interface ErrorContext {
  operation: string;
  component: string;
  userId?: string;
  sessionId?: string;
  requestId?: string;
  metadata?: Record<string, any>;
}

export interface ErrorRecoveryStrategy {
  canRecover(error: Error, context: ErrorContext): boolean;
  recover(error: Error, context: ErrorContext): Promise<any>;
  maxRetries: number;
  retryDelay: number;
}

export interface ErrorHandlerConfig {
  enableRecovery: boolean;
  enableAuditLogging: boolean;
  maxRetryAttempts: number;
  defaultRetryDelay: number;
  circuitBreakerThreshold: number;
  circuitBreakerTimeout: number;
}

export class ErrorHandler {
  private auditLogger: AuditLogger;
  private config: ErrorHandlerConfig;
  private recoveryStrategies: Map<string, ErrorRecoveryStrategy> = new Map();
  private circuitBreakers: Map<string, CircuitBreaker> = new Map();
  private errorCounts: Map<string, number> = new Map();

  constructor(auditLogger: AuditLogger, config?: Partial<ErrorHandlerConfig>) {
    this.auditLogger = auditLogger;
    this.config = {
      enableRecovery: true,
      enableAuditLogging: true,
      maxRetryAttempts: 3,
      defaultRetryDelay: 1000,
      circuitBreakerThreshold: 5,
      circuitBreakerTimeout: 30000,
      ...config,
    };

    this.initializeDefaultRecoveryStrategies();
  }

  /**
   * Handle error with comprehensive logging and recovery
   */
  async handleError(
    error: Error | string,
    context: ErrorContext,
    options?: {
      enableRecovery?: boolean;
      maxRetries?: number;
      retryDelay?: number;
    }
  ): Promise<ErrorResponse> {
    const errorObj = typeof error === "string" ? new Error(error) : error;
    const errorCode = this.classifyError(errorObj);
    const requestId = context.requestId || this.generateRequestId();

    // Log error to audit system
    if (this.config.enableAuditLogging) {
      await this.auditLogger.logError(
        `${context.component}.${context.operation}`,
        errorObj,
        {
          ...context.metadata,
          errorCode,
          component: context.component,
          operation: context.operation,
          userId: context.userId,
          sessionId: context.sessionId,
        },
        this.getErrorSeverity(errorCode)
      );
    }

    // Check circuit breaker
    const circuitBreakerKey = `${context.component}.${context.operation}`;
    const circuitBreaker = this.getCircuitBreaker(circuitBreakerKey);

    if (circuitBreaker.isOpen()) {
      return this.createErrorResponse(
        ErrorCode.INTERNAL_ERROR,
        "Service temporarily unavailable due to repeated failures",
        requestId,
        { circuitBreakerOpen: true }
      );
    }

    // Attempt recovery if enabled
    if (this.config.enableRecovery && options?.enableRecovery !== false) {
      try {
        const recoveryResult = await this.attemptRecovery(
          errorObj,
          context,
          options
        );
        if (recoveryResult.success) {
          // Log successful recovery
          await this.auditLogger.logEvent({
            action: `${context.component}.${context.operation}.recovery_success`,
            category: AuditCategory.SYSTEM_EVENT,
            severity: AuditSeverity.MEDIUM,
            outcome: AuditOutcome.SUCCESS,
            metadata: {
              originalError: errorObj.message,
              recoveryStrategy: recoveryResult.strategy,
              attempts: recoveryResult.attempts,
            },
          });

          return recoveryResult.result;
        }
      } catch (recoveryError) {
        // Log recovery failure
        await this.auditLogger.logError(
          `${context.component}.${context.operation}.recovery_failed`,
          recoveryError instanceof Error
            ? recoveryError
            : new Error(String(recoveryError)),
          {
            originalError: errorObj.message,
            ...context.metadata,
          },
          AuditSeverity.HIGH
        );
      }
    }

    // Record failure for circuit breaker
    circuitBreaker.recordFailure();

    // Create error response
    const errorResponse = this.createErrorResponse(
      errorCode,
      this.sanitizeErrorMessage(errorObj.message),
      requestId,
      {
        component: context.component,
        operation: context.operation,
        recoverable: this.isRecoverable(errorObj, context),
      }
    );

    return errorResponse;
  }

  /**
   * Handle async operation with automatic error handling
   */
  async executeWithErrorHandling<T>(
    operation: () => Promise<T>,
    context: ErrorContext,
    options?: {
      enableRecovery?: boolean;
      maxRetries?: number;
      retryDelay?: number;
      fallbackValue?: T;
    }
  ): Promise<T> {
    const tracker = this.auditLogger.createPerformanceTracker(
      `${context.component}.${context.operation}`
    );

    try {
      const result = await operation();
      await tracker.finish(AuditOutcome.SUCCESS);
      return result;
    } catch (error) {
      await tracker.finish(AuditOutcome.FAILURE);

      const errorResponse = await this.handleError(
        error instanceof Error ? error : new Error(String(error)),
        context,
        options
      );

      // Return fallback value if provided
      if (options?.fallbackValue !== undefined) {
        await this.auditLogger.logEvent({
          action: `${context.component}.${context.operation}.fallback_used`,
          category: AuditCategory.SYSTEM_EVENT,
          severity: AuditSeverity.MEDIUM,
          outcome: AuditOutcome.PARTIAL,
          metadata: {
            originalError: errorResponse.message,
            fallbackProvided: true,
          },
        });
        return options.fallbackValue;
      }

      throw new Error(errorResponse.message);
    }
  }

  /**
   * Register custom recovery strategy
   */
  registerRecoveryStrategy(
    name: string,
    strategy: ErrorRecoveryStrategy
  ): void {
    this.recoveryStrategies.set(name, strategy);
  }

  /**
   * Get error statistics
   */
  getErrorStats(): {
    totalErrors: number;
    errorsByComponent: Record<string, number>;
    circuitBreakerStatus: Record<string, { isOpen: boolean; failures: number }>;
  } {
    const errorsByComponent: Record<string, number> = {};
    for (const [key, count] of this.errorCounts.entries()) {
      errorsByComponent[key] = count;
    }

    const circuitBreakerStatus: Record<
      string,
      { isOpen: boolean; failures: number }
    > = {};
    for (const [key, breaker] of this.circuitBreakers.entries()) {
      circuitBreakerStatus[key] = {
        isOpen: breaker.isOpen(),
        failures: breaker.getFailureCount(),
      };
    }

    return {
      totalErrors: Array.from(this.errorCounts.values()).reduce(
        (sum, count) => sum + count,
        0
      ),
      errorsByComponent,
      circuitBreakerStatus,
    };
  }

  /**
   * Reset error statistics and circuit breakers
   */
  reset(): void {
    this.errorCounts.clear();
    this.circuitBreakers.clear();
  }

  /**
   * Classify error into appropriate error code
   */
  private classifyError(error: Error): ErrorCode {
    const message = error.message.toLowerCase();

    if (message.includes("timeout") || message.includes("timed out")) {
      return ErrorCode.TIMEOUT;
    }
    if (
      message.includes("connection") ||
      message.includes("network") ||
      message.includes("econnrefused")
    ) {
      return ErrorCode.CONNECTION_FAILED;
    }
    if (message.includes("not found") || message.includes("404")) {
      return ErrorCode.DATA_NOT_FOUND;
    }
    if (
      message.includes("invalid") ||
      message.includes("bad request") ||
      message.includes("400")
    ) {
      return ErrorCode.INVALID_REQUEST;
    }

    return ErrorCode.INTERNAL_ERROR;
  }

  /**
   * Get error severity based on error code
   */
  private getErrorSeverity(errorCode: ErrorCode): AuditSeverity {
    switch (errorCode) {
      case ErrorCode.CONNECTION_FAILED:
      case ErrorCode.TIMEOUT:
        return AuditSeverity.HIGH;
      case ErrorCode.INTERNAL_ERROR:
        return AuditSeverity.CRITICAL;
      case ErrorCode.DATA_NOT_FOUND:
        return AuditSeverity.MEDIUM;
      case ErrorCode.INVALID_REQUEST:
        return AuditSeverity.LOW;
      default:
        return AuditSeverity.MEDIUM;
    }
  }

  /**
   * Attempt error recovery using registered strategies
   */
  private async attemptRecovery(
    error: Error,
    context: ErrorContext,
    options?: { maxRetries?: number; retryDelay?: number }
  ): Promise<{
    success: boolean;
    result?: any;
    strategy?: string;
    attempts: number;
  }> {
    const maxRetries = options?.maxRetries || this.config.maxRetryAttempts;
    const retryDelay = options?.retryDelay || this.config.defaultRetryDelay;

    // Try each recovery strategy
    for (const [strategyName, strategy] of this.recoveryStrategies.entries()) {
      if (strategy.canRecover(error, context)) {
        let attempts = 0;
        const maxStrategyRetries = Math.min(maxRetries, strategy.maxRetries);

        while (attempts < maxStrategyRetries) {
          attempts++;
          try {
            const result = await strategy.recover(error, context);
            return { success: true, result, strategy: strategyName, attempts };
          } catch (recoveryError) {
            if (attempts < maxStrategyRetries) {
              await this.delay(
                Math.min(retryDelay * attempts, strategy.retryDelay)
              );
            }
          }
        }
      }
    }

    return { success: false, attempts: 0 };
  }

  /**
   * Check if error is recoverable
   */
  private isRecoverable(error: Error, context: ErrorContext): boolean {
    for (const strategy of this.recoveryStrategies.values()) {
      if (strategy.canRecover(error, context)) {
        return true;
      }
    }
    return false;
  }

  /**
   * Get or create circuit breaker for operation
   */
  private getCircuitBreaker(key: string): CircuitBreaker {
    if (!this.circuitBreakers.has(key)) {
      this.circuitBreakers.set(
        key,
        new CircuitBreaker(
          this.config.circuitBreakerThreshold,
          this.config.circuitBreakerTimeout
        )
      );
    }
    return this.circuitBreakers.get(key)!;
  }

  /**
   * Create standardized error response
   */
  private createErrorResponse(
    code: ErrorCode,
    message: string,
    requestId: string,
    details?: any
  ): ErrorResponse {
    return {
      code,
      message,
      details,
      timestamp: new Date(),
      requestId,
    };
  }

  /**
   * Sanitize error message to remove sensitive information
   */
  private sanitizeErrorMessage(message: string): string {
    // Remove file paths, tokens, and other sensitive data
    return message
      .replace(/\/[^\s]+\//g, ".../") // Remove absolute paths
      .replace(/token[=:\s]+[^\s]+/gi, "token=[REDACTED]") // Remove tokens
      .replace(/key[=:\s]+[^\s]+/gi, "key=[REDACTED]") // Remove keys
      .replace(/password[=:\s]+[^\s]+/gi, "password=[REDACTED]"); // Remove passwords
  }

  /**
   * Generate unique request ID
   */
  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Initialize default recovery strategies
   */
  private initializeDefaultRecoveryStrategies(): void {
    // Connection retry strategy
    this.registerRecoveryStrategy("connection_retry", {
      canRecover: (error) => error.message.toLowerCase().includes("connection"),
      recover: async (error, context) => {
        // Simulate connection retry
        await this.delay(1000);
        throw error; // Would implement actual reconnection logic
      },
      maxRetries: 3,
      retryDelay: 2000,
    });

    // Timeout retry strategy
    this.registerRecoveryStrategy("timeout_retry", {
      canRecover: (error) => error.message.toLowerCase().includes("timeout"),
      recover: async (error, context) => {
        // Simulate timeout retry with longer timeout
        await this.delay(500);
        throw error; // Would implement actual retry with extended timeout
      },
      maxRetries: 2,
      retryDelay: 3000,
    });

    // Cache fallback strategy
    this.registerRecoveryStrategy("cache_fallback", {
      canRecover: (error, context) =>
        context.operation.includes("get") && !error.message.includes("cache"),
      recover: async (error, context) => {
        // Would implement cache fallback logic
        throw error;
      },
      maxRetries: 1,
      retryDelay: 100,
    });
  }

  /**
   * Utility delay function
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

/**
 * Circuit Breaker implementation for preventing cascading failures
 */
class CircuitBreaker {
  private failures: number = 0;
  private lastFailureTime: number = 0;
  private state: "closed" | "open" | "half-open" = "closed";

  constructor(private threshold: number, private timeout: number) {}

  isOpen(): boolean {
    if (this.state === "open") {
      if (Date.now() - this.lastFailureTime > this.timeout) {
        this.state = "half-open";
        return false;
      }
      return true;
    }
    return false;
  }

  recordSuccess(): void {
    this.failures = 0;
    this.state = "closed";
  }

  recordFailure(): void {
    this.failures++;
    this.lastFailureTime = Date.now();

    if (this.failures >= this.threshold) {
      this.state = "open";
    }
  }

  getFailureCount(): number {
    return this.failures;
  }

  reset(): void {
    this.failures = 0;
    this.lastFailureTime = 0;
    this.state = "closed";
  }
}
