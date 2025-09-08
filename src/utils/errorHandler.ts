/**
 * Simplified Error Handler
 * Basic error logging with console output
 */

export interface ErrorContext {
  operation: string;
  component: string;
  requestId?: string;
  metadata?: Record<string, any>;
}

export class ErrorHandler {
  /**
   * Handle error with basic console logging
   */
  async handleError(error: Error | string, context: ErrorContext): Promise<void> {
    const errorObj = typeof error === 'string' ? new Error(error) : error;
    
    console.error(`[${context.component}.${context.operation}] Error:`, {
      error: errorObj.message,
      stack: errorObj.stack,
      metadata: context.metadata
    });
  }

  /**
   * Execute async operation with basic error handling
   */
  async executeWithErrorHandling<T>(
    operation: () => Promise<T>,
    context: ErrorContext,
    options?: {
      fallbackValue?: T;
      enableRecovery?: boolean;
      maxRetries?: number;
      [key: string]: any;
    }
  ): Promise<T> {
    try {
      return await operation();
    } catch (error) {
      await this.handleError(error instanceof Error ? error : new Error(String(error)), context);
      
      if (options?.fallbackValue !== undefined) {
        console.log(`[${context.component}.${context.operation}] Using fallback value`);
        return options.fallbackValue;
      }
      
      throw error instanceof Error ? error : new Error(String(error));
    }
  }

  /**
   * Simple try-catch wrapper with console logging
   */
  withErrorBoundary<T>(
    operation: () => Promise<T>,
    context: ErrorContext,
    fallback?: () => Promise<T>
  ): Promise<T> {
    return this.executeWithErrorHandling(operation, context)
      .catch(async (error) => {
        if (fallback) {
          try {
            return await fallback();
          } catch (fallbackError) {
            console.error(`[${context.component}] Fallback failed:`, fallbackError);
            throw fallbackError;
          }
        }
        throw error;
      });
  }

  /**
   * Get basic error statistics (simplified for compatibility)
   */
  getErrorStats(): {
    totalErrors: number;
    errorsByComponent: Record<string, number>;
  } {
    return {
      totalErrors: 0,
      errorsByComponent: {}
    };
  }
}