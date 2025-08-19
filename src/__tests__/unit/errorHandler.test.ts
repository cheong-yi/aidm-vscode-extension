/**
 * Error Handler Unit Tests
 * Tests for comprehensive error handling and recovery strategies
 */

import {
  ErrorHandler,
  ErrorContext,
  ErrorRecoveryStrategy,
} from "../../utils/ErrorHandler";
import {
  auditTrail,
  AuditAction,
  AuditEventType,
} from "../../utils/auditTrail";
import { ErrorCode } from "../../types/extension";

// Mock the logger
jest.mock("../../utils/logger", () => ({
  LoggerFactory: {
    getLogger: jest.fn(() => ({
      error: jest.fn(),
      warn: jest.fn(),
      info: jest.fn(),
      debug: jest.fn(),
    })),
  },
}));

// Mock VSCode
jest.mock("vscode", () => ({
  window: {
    showErrorMessage: jest.fn(),
    showWarningMessage: jest.fn(),
    showInformationMessage: jest.fn(),
  },
}));

// Mock audit trail
jest.mock("../../utils/auditTrail", () => ({
  auditTrail: {
    recordError: jest.fn(),
    recordEvent: jest.fn(),
  },
  AuditAction: {
    HOVER_REQUEST: "hover_request",
    SEARCH_REQUEST: "search_request",
    CONTEXT_RETRIEVAL: "context_retrieval",
    REQUIREMENT_ACCESS: "requirement_access",
    STATUS_CHECK: "status_check",
    REQUEST_FAILED: "request_failed",
  },
  AuditEventType: {
    SYSTEM_EVENT: "system_event",
  },
}));

describe("ErrorHandler", () => {
  let errorHandler: ErrorHandler;
  let mockContext: ErrorContext;

  beforeEach(() => {
    jest.clearAllMocks();
    errorHandler = new ErrorHandler("TestComponent");
    mockContext = {
      component: "TestComponent",
      operation: "testOperation",
      requestId: "test-request-123",
      userId: "test-user",
      metadata: { test: "data" },
    };
  });

  describe("handleError", () => {
    it("should log error and record audit event", async () => {
      const testError = new Error("Test error");

      const result = await errorHandler.handleError(testError, mockContext);

      expect(result).toBeNull();
      expect(auditTrail.recordError).toHaveBeenCalledWith(
        AuditAction.REQUEST_FAILED,
        "TestComponent",
        testError,
        {
          userId: "test-user",
          requestId: "test-request-123",
          metadata: { test: "data" },
        }
      );
    });

    it("should use fallback function when provided", async () => {
      const testError = new Error("Test error");
      const fallbackData = { fallback: true };
      const fallbackFn = jest.fn().mockResolvedValue(fallbackData);

      const result = await errorHandler.handleError(
        testError,
        mockContext,
        fallbackFn
      );

      expect(result).toEqual(fallbackData);
      expect(fallbackFn).toHaveBeenCalled();
    });

    it("should generate mock fallback data for context operations", async () => {
      const testError = new Error("Test error");
      const contextOperation = {
        ...mockContext,
        operation: "contextRetrieval",
      };

      const result = await errorHandler.handleError(
        testError,
        contextOperation
      );

      expect(result).toHaveProperty("requirements");
      expect(result).toHaveProperty("implementationStatus");
      expect(result).toHaveProperty("source", "fallback");
    });

    it("should handle recovery strategies", async () => {
      const testError = new Error("ECONNREFUSED");
      const recoveryStrategy: RecoveryStrategy = {
        name: "test-recovery",
        canRecover: jest.fn().mockReturnValue(true),
        recover: jest.fn().mockResolvedValue({ recovered: true }),
        maxAttempts: 3,
      };

      errorHandler.addRecoveryStrategy(recoveryStrategy);

      const result = await errorHandler.handleError(testError, mockContext);

      expect(recoveryStrategy.canRecover).toHaveBeenCalledWith(
        testError,
        mockContext
      );
      expect(recoveryStrategy.recover).toHaveBeenCalledWith(
        testError,
        mockContext
      );
      expect(result).toEqual({ recovered: true });
    });
  });

  describe("withErrorBoundary", () => {
    it("should execute operation successfully on first try", async () => {
      const operation = jest.fn().mockResolvedValue("success");
      const fallback = jest.fn();

      const result = await errorHandler.withErrorBoundary(
        operation,
        mockContext,
        fallback
      );

      expect(result).toBe("success");
      expect(operation).toHaveBeenCalledTimes(1);
      expect(fallback).not.toHaveBeenCalled();
      expect(auditTrail.recordEvent).toHaveBeenCalledWith(
        AuditEventType.SYSTEM_EVENT,
        AuditAction.REQUEST_FAILED,
        "TestComponent",
        expect.objectContaining({
          success: true,
        })
      );
    });

    it("should retry operation on failure", async () => {
      const operation = jest
        .fn()
        .mockRejectedValueOnce(new Error("First failure"))
        .mockRejectedValueOnce(new Error("Second failure"))
        .mockResolvedValue("success");
      const fallback = jest.fn();

      const result = await errorHandler.withErrorBoundary(
        operation,
        mockContext,
        fallback
      );

      expect(result).toBe("success");
      expect(operation).toHaveBeenCalledTimes(3);
      expect(fallback).not.toHaveBeenCalled();
    });

    it("should use fallback after max retries", async () => {
      const operation = jest
        .fn()
        .mockRejectedValue(new Error("Persistent failure"));
      const fallback = jest.fn().mockResolvedValue("fallback-result");

      const result = await errorHandler.withErrorBoundary(
        operation,
        mockContext,
        fallback
      );

      expect(result).toBe("fallback-result");
      expect(operation).toHaveBeenCalledTimes(3); // Default max retries
      expect(fallback).toHaveBeenCalled();
    });
  });

  describe("isRecoverableError", () => {
    it("should identify connection errors as recoverable", () => {
      const connectionError = new Error("ECONNREFUSED");
      expect(errorHandler.isRecoverableError(connectionError)).toBe(true);
    });

    it("should identify timeout errors as recoverable", () => {
      const timeoutError = new Error("Request timeout");
      expect(errorHandler.isRecoverableError(timeoutError)).toBe(true);
    });

    it("should identify server errors as recoverable", () => {
      const serverError = new Error("500 Internal Server Error");
      expect(errorHandler.isRecoverableError(serverError)).toBe(true);
    });

    it("should identify client errors as non-recoverable", () => {
      const clientError = new Error("400 Bad Request");
      expect(errorHandler.isRecoverableError(clientError)).toBe(false);
    });
  });

  describe("createErrorResponse", () => {
    it("should create standardized error response", () => {
      const response = errorHandler.createErrorResponse(
        ErrorCode.CONNECTION_FAILED,
        "Connection failed",
        { details: "test" },
        "req-123"
      );

      expect(response).toMatchObject({
        code: ErrorCode.CONNECTION_FAILED,
        message: "Connection failed",
        details: { details: "test" },
        requestId: "req-123",
      });
      expect(response.timestamp).toBeInstanceOf(Date);
    });

    it("should generate request ID if not provided", () => {
      const response = errorHandler.createErrorResponse(
        ErrorCode.INTERNAL_ERROR,
        "Internal error"
      );

      expect(response.requestId).toMatch(/^req_\d+_[a-z0-9]+$/);
    });
  });

  describe("cacheFallbackData", () => {
    it("should cache and retrieve fallback data", () => {
      const testData = { cached: true };

      errorHandler.cacheFallbackData("test-key", testData, "test-source");
      const retrieved = errorHandler.getCachedFallbackData("test-key");

      expect(retrieved).toMatchObject({
        type: "cached",
        data: testData,
        source: "test-source",
      });
      expect(retrieved?.timestamp).toBeInstanceOf(Date);
    });

    it("should return null for expired cache data", async () => {
      const testData = { cached: true };

      errorHandler.cacheFallbackData("test-key", testData, "test-source");

      // Wait a small amount to ensure time has passed
      await new Promise((resolve) => setTimeout(resolve, 10));

      const retrieved = errorHandler.getCachedFallbackData("test-key", 5); // 5ms max age

      expect(retrieved).toBeNull();
    });

    it("should return null for non-existent cache data", () => {
      const retrieved = errorHandler.getCachedFallbackData("non-existent-key");
      expect(retrieved).toBeNull();
    });
  });
});

describe("ErrorHandlerFactory", () => {
  beforeEach(() => {
    ErrorHandlerFactory.clearHandlers();
  });

  it("should create and cache error handlers", () => {
    const handler1 = ErrorHandlerFactory.getHandler("Component1");
    const handler2 = ErrorHandlerFactory.getHandler("Component1");
    const handler3 = ErrorHandlerFactory.getHandler("Component2");

    expect(handler1).toBe(handler2); // Same instance for same component
    expect(handler1).not.toBe(handler3); // Different instance for different component
  });

  it("should clear all handlers", () => {
    const handler1 = ErrorHandlerFactory.getHandler("Component1");
    ErrorHandlerFactory.clearHandlers();
    const handler2 = ErrorHandlerFactory.getHandler("Component1");

    expect(handler1).not.toBe(handler2); // New instance after clearing
  });
});
