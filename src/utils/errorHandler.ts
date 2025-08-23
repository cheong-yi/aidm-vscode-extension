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
import {
  ErrorCode,
  ErrorResponse,
  ErrorRecoveryStrategy,
} from "../types/extension";
import { auditTrail, AuditAction, AuditEventType } from "./auditTrail";

export interface ErrorContext {
  operation: string;
  component: string;
  userId?: string;
  sessionId?: string;
  requestId?: string;
  metadata?: Record<string, any>;
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
  private fallbackCache: Map<
    string,
    { data: any; source?: string; timestamp: number }
  > | null = null;

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
      fallback?: () => Promise<any>;
      skipCircuitBreakerFailure?: boolean;
    }
  ): Promise<ErrorResponse | any> {
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

      // Also record in audit trail for test integration
      try {
        auditTrail.recordError(
          AuditAction.REQUEST_FAILED,
          context.component,
          errorObj,
          {
            userId: context.userId,
            requestId: requestId,
            metadata: {
              operation: context.operation,
              errorCode: errorCode,
              ...context.metadata,
            },
          }
        );
      } catch (auditTrailError) {
        // Don't let audit trail failures break error handling
        console.warn("Failed to record error in audit trail:", auditTrailError);
      }
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

          // Record recovery success in audit trail
          try {
            auditTrail.recordSystemEvent(
              AuditAction.SERVER_RESTART,
              context.component,
              {
                requestId: requestId,
                metadata: {
                  operation: context.operation,
                  recoveryStrategy: recoveryResult.strategy,
                  attempts: recoveryResult.attempts,
                  originalError: errorObj.message,
                },
                success: true,
              }
            );
          } catch (auditTrailError) {
            console.warn(
              "Failed to record recovery success in audit trail:",
              auditTrailError
            );
          }

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

        // Record recovery failure in audit trail
        try {
          auditTrail.recordError(
            AuditAction.SERVER_ERROR,
            context.component,
            recoveryError instanceof Error
              ? recoveryError
              : new Error(String(recoveryError)),
            {
              userId: context.userId,
              requestId: requestId,
              metadata: {
                operation: context.operation,
                originalError: errorObj.message,
                ...context.metadata,
              },
            }
          );
        } catch (auditTrailError) {
          console.warn(
            "Failed to record recovery failure in audit trail:",
            auditTrailError
          );
        }

        // Increment error count for recovery failure
        const recoveryErrorKey = `${context.component}.${context.operation}.recovery_failed`;
        const currentRecoveryCount =
          this.errorCounts.get(recoveryErrorKey) || 0;
        this.errorCounts.set(recoveryErrorKey, currentRecoveryCount + 1);
      }
    }

    // Try fallback if provided
    if (options?.fallback) {
      try {
        const fallbackResult = await options.fallback();

        // Log fallback success
        await this.auditLogger.logEvent({
          action: `${context.component}.${context.operation}.fallback_success`,
          category: AuditCategory.SYSTEM_EVENT,
          severity: AuditSeverity.MEDIUM,
          outcome: AuditOutcome.PARTIAL,
          metadata: {
            originalError: errorObj.message,
            fallbackUsed: true,
          },
        });

        // Record fallback success in audit trail
        try {
          auditTrail.recordSystemEvent(
            AuditAction.CACHE_INVALIDATION,
            context.component,
            {
              requestId: requestId,
              metadata: {
                operation: context.operation,
                originalError: errorObj.message,
                fallbackUsed: true,
              },
              success: true,
            }
          );
        } catch (auditTrailError) {
          console.warn(
            "Failed to record fallback success in audit trail:",
            auditTrailError
          );
        }

        return fallbackResult;
      } catch (fallbackError) {
        // Log fallback failure
        await this.auditLogger.logError(
          `${context.component}.${context.operation}.fallback_failed`,
          fallbackError instanceof Error
            ? fallbackError
            : new Error(String(fallbackError)),
          {
            originalError: errorObj.message,
            ...context.metadata,
          },
          AuditSeverity.HIGH
        );

        // Record fallback failure in audit trail
        try {
          auditTrail.recordError(
            AuditAction.SERVER_ERROR,
            context.component,
            fallbackError instanceof Error
              ? fallbackError
              : new Error(String(fallbackError)),
            {
              userId: context.userId,
              requestId: requestId,
              metadata: {
                operation: context.operation,
                originalError: errorObj.message,
                ...context.metadata,
              },
            }
          );
        } catch (auditTrailError) {
          console.warn(
            "Failed to record fallback failure in audit trail:",
            auditTrailError
          );
        }

        // Increment error count for fallback failure
        const fallbackErrorKey = `${context.component}.${context.operation}.fallback_failed`;
        const currentFallbackCount =
          this.errorCounts.get(fallbackErrorKey) || 0;
        this.errorCounts.set(fallbackErrorKey, currentFallbackCount + 1);
      }
    }

    // Record failure for circuit breaker (unless skipped)
    if (!options?.skipCircuitBreakerFailure) {
      circuitBreaker.recordFailure();
    }

    // Increment error count for this component.operation
    const errorKey = `${context.component}.${context.operation}`;
    const currentCount = this.errorCounts.get(errorKey) || 0;
    this.errorCounts.set(errorKey, currentCount + 1);

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
   * Execute async operation with automatic error handling
   */
  async executeWithErrorHandling<T>(
    operation: () => Promise<T>,
    context: ErrorContext,
    options?: {
      enableRecovery?: boolean;
      maxRetries?: number;
      retryDelay?: number;
      fallbackValue?: T;
      disableRetries?: boolean; // New option to disable retries
      skipRetries?: boolean; // New option to skip retries for immediate fallback
    }
  ): Promise<T> {
    const tracker = this.auditLogger.createPerformanceTracker(
      `${context.component}.${context.operation}`
    );

    try {
      const result = await operation();
      await tracker.finish(AuditOutcome.SUCCESS);

      // Record success for circuit breaker
      const circuitBreakerKey = `${context.component}.${context.operation}`;
      const circuitBreaker = this.getCircuitBreaker(circuitBreakerKey);
      circuitBreaker.recordSuccess();

      return result;
    } catch (error) {
      await tracker.finish(AuditOutcome.FAILURE);

      // Record failure for circuit breaker immediately
      const circuitBreakerKey = `${context.component}.${context.operation}`;
      const circuitBreaker = this.getCircuitBreaker(circuitBreakerKey);
      circuitBreaker.recordFailure();

      // Try to retry the operation if it's a retryable error and retries are not disabled
      // Only disable retries when explicitly requested or when the operation is expected to always fail
      if (
        !options?.disableRetries &&
        !options?.skipRetries &&
        this.isRetryableError(
          error instanceof Error ? error : new Error(String(error))
        )
      ) {
        const maxRetries = options?.maxRetries ?? this.config.maxRetryAttempts;
        const retryDelay = options?.retryDelay ?? this.config.defaultRetryDelay;

        // Only retry if maxRetries > 0
        if (maxRetries > 0) {
          const retryResult = await this.retryOperationWithBackoff(
            operation,
            context,
            maxRetries,
            retryDelay
          );
          if (retryResult.success && retryResult.result !== undefined) {
            await tracker.finish(AuditOutcome.SUCCESS);
            // Record success after successful retry
            circuitBreaker.recordSuccess();
            return retryResult.result;
          }
        }
      }

      const errorResponse = await this.handleError(
        error instanceof Error ? error : new Error(String(error)),
        context,
        {
          ...options,
          skipCircuitBreakerFailure: true, // Skip recording failure since we already did
        }
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

        // Record fallback usage in audit trail
        try {
          auditTrail.recordSystemEvent(
            AuditAction.CACHE_INVALIDATION,
            context.component,
            {
              requestId: context.requestId,
              metadata: {
                operation: context.operation,
                originalError: errorResponse.message,
                fallbackProvided: true,
              },
              success: true,
            }
          );
        } catch (auditTrailError) {
          console.warn(
            "Failed to record fallback usage in audit trail:",
            auditTrailError
          );
        }

        return options.fallbackValue;
      }

      throw new Error(errorResponse.message);
    }
  }

  /**
   * Retry operation with exponential backoff
   */
  private async retryOperationWithBackoff<T>(
    operation: () => Promise<T>,
    context: ErrorContext,
    maxRetries: number,
    baseDelay: number
  ): Promise<{ success: boolean; result?: T; attempts: number }> {
    let lastError: Error = new Error("Unknown error");

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const result = await operation();

        // Log successful retry
        if (attempt > 1) {
          await this.auditLogger.logEvent({
            action: `${context.component}.${context.operation}.retry_success`,
            category: AuditCategory.SYSTEM_EVENT,
            severity: AuditSeverity.MEDIUM,
            outcome: AuditOutcome.SUCCESS,
            metadata: {
              attempts: attempt,
              retryDelay: baseDelay * attempt,
            },
          });
        }

        return { success: true, result, attempts: attempt };
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        // Log retry attempt
        if (attempt <= maxRetries) {
          await this.auditLogger.logEvent({
            action: `${context.component}.${context.operation}.retry_attempt`,
            category: AuditCategory.SYSTEM_EVENT,
            severity: AuditSeverity.MEDIUM,
            outcome: AuditOutcome.FAILURE,
            metadata: {
              attempt,
              maxRetries,
              error: lastError.message,
              retryDelay: baseDelay * attempt,
            },
          });
        }

        // If this was the last attempt, don't wait
        if (attempt < maxRetries) {
          const delay = baseDelay * attempt; // Exponential backoff
          await this.delay(delay);
        }
      }
    }

    // All retries failed
    await this.auditLogger.logEvent({
      action: `${context.component}.${context.operation}.retry_exhausted`,
      category: AuditCategory.SYSTEM_EVENT,
      severity: AuditSeverity.HIGH,
      outcome: AuditOutcome.FAILURE,
      metadata: {
        attempts: maxRetries,
        finalError: lastError.message,
      },
    });

    return { success: false, attempts: maxRetries };
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
    circuitBreakerStatus: Record<
      string,
      { isOpen: boolean; failures: number; state: string }
    >;
  } {
    const errorsByComponent: Record<string, number> = {};
    for (const [key, count] of this.errorCounts.entries()) {
      errorsByComponent[key] = count;
    }

    const circuitBreakerStatus: Record<
      string,
      { isOpen: boolean; failures: number; state: string }
    > = {};
    for (const [key, breaker] of this.circuitBreakers.entries()) {
      circuitBreakerStatus[key] = {
        isOpen: breaker.isOpen(),
        failures: breaker.getFailureCount(),
        state: breaker.getState(),
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
   * Cache fallback data for later retrieval
   */
  cacheFallbackData(key: string, data: any, source?: string): void {
    const cacheEntry = {
      data,
      source: source || "unknown",
      timestamp: Date.now(),
    };

    // Store in a separate fallback cache
    if (!this.fallbackCache) {
      this.fallbackCache = new Map();
    }

    this.fallbackCache.set(key, cacheEntry);

    // Log cache operation
    if (this.config.enableAuditLogging) {
      this.auditLogger.logEvent({
        action: "error_handler.cache_fallback_data",
        category: AuditCategory.SYSTEM_EVENT,
        severity: AuditSeverity.LOW,
        outcome: AuditOutcome.SUCCESS,
        metadata: {
          key,
          source,
          dataSize: JSON.stringify(data).length,
        },
      });

      // Record cache operation in audit trail
      try {
        auditTrail.recordDataAccess(
          AuditAction.CACHE_ACCESS,
          "ErrorHandler",
          key,
          {
            metadata: {
              source,
              dataSize: JSON.stringify(data).length,
              operation: "cache_fallback_data",
            },
            success: true,
          }
        );
      } catch (auditTrailError) {
        console.warn(
          "Failed to record cache operation in audit trail:",
          auditTrailError
        );
      }
    }
  }

  /**
   * Retrieve cached fallback data
   */
  getCachedFallbackData(
    key: string
  ): { data: any; source?: string; timestamp: number } | null {
    if (!this.fallbackCache) {
      return null;
    }

    const cached = this.fallbackCache.get(key);
    if (!cached) {
      return null;
    }

    // Check if cache is still valid (5 minutes TTL)
    const cacheAge = Date.now() - cached.timestamp;
    if (cacheAge > 300000) {
      // 5 minutes
      this.fallbackCache.delete(key);
      return null;
    }

    return cached;
  }

  /**
   * Execute operation with error boundary protection
   */
  withErrorBoundary<T>(
    operation: () => Promise<T>,
    context: ErrorContext,
    fallback?: () => Promise<T>
  ): Promise<T> {
    return this.executeWithErrorHandling(operation, context, {
      fallbackValue: fallback ? undefined : (null as any),
      enableRecovery: false,
      // Don't disable retries - let the operation try to succeed first
      // Only use fallback if the operation completely fails
    })
      .then((result) => {
        if (result === null && fallback) {
          return fallback();
        }
        return result;
      })
      .catch(async (error) => {
        // If the operation fails and we have a fallback, use it
        if (fallback) {
          try {
            return await fallback();
          } catch (fallbackError) {
            // Log fallback failure
            await this.auditLogger.logError(
              "error_handler.fallback_failed",
              fallbackError instanceof Error
                ? fallbackError
                : new Error(String(fallbackError)),
              {
                ...context,
                originalError:
                  error instanceof Error ? error.message : String(error),
              },
              AuditSeverity.HIGH
            );

            // Record fallback failure in audit trail
            try {
              auditTrail.recordError(
                AuditAction.SERVER_ERROR,
                context.component,
                fallbackError instanceof Error
                  ? fallbackError
                  : new Error(String(fallbackError)),
                {
                  userId: context.userId,
                  requestId: context.requestId,
                  metadata: {
                    operation: context.operation,
                    originalError:
                      error instanceof Error ? error.message : String(error),
                    ...context.metadata,
                  },
                }
              );
            } catch (auditTrailError) {
              console.warn(
                "Failed to record fallback failure in audit trail:",
                auditTrailError
              );
            }

            throw fallbackError;
          }
        }
        throw error;
      });
  }

  /**
   * Add custom recovery strategy for specific error types
   */
  addRecoveryStrategy(strategy: {
    name: string;
    canRecover: (error: Error) => boolean;
    recover: (error: Error) => Promise<any>;
    maxAttempts: number;
  }): void {
    const recoveryStrategy: ErrorRecoveryStrategy = {
      canRecover: strategy.canRecover,
      recover: strategy.recover,
      maxRetries: strategy.maxAttempts,
      retryDelay: this.config.defaultRetryDelay,
    };

    this.recoveryStrategies.set(strategy.name, recoveryStrategy);

    // Log strategy registration
    if (this.config.enableAuditLogging) {
      this.auditLogger.logEvent({
        action: "error_handler.recovery_strategy_added",
        category: AuditCategory.SYSTEM_EVENT,
        severity: AuditSeverity.LOW,
        outcome: AuditOutcome.SUCCESS,
        metadata: {
          strategyName: strategy.name,
          maxAttempts: strategy.maxAttempts,
        },
      });

      // Record strategy registration in audit trail
      try {
        auditTrail.recordSystemEvent(
          AuditAction.CONFIG_UPDATE,
          "ErrorHandler",
          {
            metadata: {
              strategyName: strategy.name,
              maxAttempts: strategy.maxAttempts,
              operation: "recovery_strategy_added",
            },
            success: true,
          }
        );
      } catch (auditTrailError) {
        console.warn(
          "Failed to record strategy registration in audit trail:",
          auditTrailError
        );
      }
    }
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

    // First, try to retry the original operation if it's a retryable error
    if (this.isRetryableError(error)) {
      const retryResult = await this.retryOriginalOperation(
        error,
        context,
        maxRetries,
        retryDelay
      );
      if (retryResult.success) {
        return retryResult;
      }
    }

    // Then try each recovery strategy
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
   * Retry the original operation that failed
   */
  private async retryOriginalOperation(
    error: Error,
    context: ErrorContext,
    maxRetries: number,
    retryDelay: number
  ): Promise<{
    success: boolean;
    result?: any;
    strategy?: string;
    attempts: number;
  }> {
    // This method will be called by handleError when it has access to the original operation
    // For now, return false to indicate no retry was attempted
    return { success: false, attempts: 0 };
  }

  /**
   * Check if error is retryable (should retry the original operation)
   */
  private isRetryableError(error: Error): boolean {
    const message = error.message.toLowerCase();
    return (
      message.includes("connection") ||
      message.includes("network") ||
      message.includes("econnrefused") ||
      message.includes("timeout") ||
      message.includes("timed out") ||
      message.includes("temporary") ||
      message.includes("retry") ||
      message.includes("server temporarily unavailable") ||
      message.includes("connection lost") ||
      message.includes("connection refused")
    );
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
  getCircuitBreaker(key: string): CircuitBreaker {
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
   * Get circuit breaker configuration for testing
   */
  getCircuitBreakerConfig(): { threshold: number; timeout: number } {
    return {
      threshold: this.config.circuitBreakerThreshold,
      timeout: this.config.circuitBreakerTimeout,
    };
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

  getState(): string {
    return this.state;
  }

  reset(): void {
    this.failures = 0;
    this.lastFailureTime = 0;
    this.state = "closed";
  }
}
