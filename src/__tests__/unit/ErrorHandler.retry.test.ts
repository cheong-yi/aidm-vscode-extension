/**
 * ErrorHandler Retry Logic Unit Tests
 * Tests for the retry mechanism in ErrorHandler
 */

import { ErrorHandler } from "../../utils/ErrorHandler";
import { AuditLogger } from "../../security/AuditLogger";

// Mock VSCode
jest.mock("vscode", () => ({
  window: {
    createStatusBarItem: jest.fn(() => ({
      show: jest.fn(),
      dispose: jest.fn(),
      text: "",
      backgroundColor: undefined,
      tooltip: "",
      command: "",
    })),
    showErrorMessage: jest.fn(),
    showWarningMessage: jest.fn(),
    showInformationMessage: jest.fn(),
  },
  StatusBarAlignment: {
    Right: 2,
  },
  ThemeColor: jest.fn(),
}));

describe("ErrorHandler Retry Logic", () => {
  let errorHandler: ErrorHandler;
  let auditLogger: AuditLogger;

  beforeEach(() => {
    jest.clearAllMocks();
    auditLogger = new AuditLogger();
    errorHandler = new ErrorHandler(auditLogger);
  });

  afterEach(async () => {
    if (auditLogger) {
      await auditLogger.shutdown();
    }
  });

  describe("retryOperationWithBackoff", () => {
    it("should retry operation and succeed on retry", async () => {
      let callCount = 0;
      const operation = jest.fn().mockImplementation(() => {
        callCount++;
        if (callCount <= 2) {
          throw new Error("Network timeout");
        }
        return Promise.resolve("success");
      });

      const result = await errorHandler.executeWithErrorHandling(
        operation,
        {
          component: "TestComponent",
          operation: "testOperation",
          requestId: "test-123",
        },
        { maxRetries: 3, retryDelay: 100 }
      );

      expect(result).toBe("success");
      expect(operation).toHaveBeenCalledTimes(3);
    });

    it("should retry operation and eventually fail after max retries", async () => {
      const operation = jest
        .fn()
        .mockRejectedValue(new Error("Connection refused"));

      const result = await errorHandler.executeWithErrorHandling(
        operation,
        {
          component: "TestComponent",
          operation: "testOperation",
          requestId: "test-456",
        },
        { maxRetries: 2, retryDelay: 50, fallbackValue: "fallback" }
      );

      expect(result).toBe("fallback");
      expect(operation).toHaveBeenCalledTimes(3); // Initial + 2 retries
    });

    it("should not retry non-retryable errors", async () => {
      const operation = jest
        .fn()
        .mockRejectedValue(new Error("Invalid request"));

      const result = await errorHandler.executeWithErrorHandling(
        operation,
        {
          component: "TestComponent",
          operation: "testOperation",
          requestId: "test-789",
        },
        { fallbackValue: "fallback" }
      );

      expect(result).toBe("fallback");
      expect(operation).toHaveBeenCalledTimes(1); // Only called once, no retries
    });

    it("should apply exponential backoff between retries", async () => {
      const startTime = Date.now();
      let callCount = 0;

      const operation = jest.fn().mockImplementation(() => {
        callCount++;
        if (callCount <= 2) {
          throw new Error("Connection refused");
        }
        return Promise.resolve("success");
      });

      await errorHandler.executeWithErrorHandling(
        operation,
        {
          component: "TestComponent",
          operation: "testOperation",
          requestId: "test-backoff",
        },
        { maxRetries: 3, retryDelay: 100 }
      );

      const totalTime = Date.now() - startTime;

      // Should take at least 100ms (delay for first retry)
      expect(totalTime).toBeGreaterThanOrEqual(100);
      expect(operation).toHaveBeenCalledTimes(3);
    });

    it("should handle zero retries correctly", async () => {
      const operation = jest.fn().mockRejectedValue(new Error("Network error"));

      const result = await errorHandler.executeWithErrorHandling(
        operation,
        {
          component: "TestComponent",
          operation: "testOperation",
          requestId: "test-zero-retries",
        },
        { maxRetries: 0, fallbackValue: "fallback" }
      );

      expect(result).toBe("fallback");
      // With zero retries, it should not retry at all
      expect(operation).toHaveBeenCalledTimes(1); // Only initial call
    });

    it("should retry connection-related errors", async () => {
      const connectionErrors = [
        "ECONNREFUSED: Connection refused",
        "Network timeout",
        "Connection lost",
        "Temporary network issue",
        "Retry after connection reset",
      ];

      for (const errorMessage of connectionErrors) {
        let callCount = 0;
        const operation = jest.fn().mockImplementation(() => {
          callCount++;
          if (callCount <= 1) {
            throw new Error(errorMessage);
          }
          return Promise.resolve("success");
        });

        const result = await errorHandler.executeWithErrorHandling(
          operation,
          {
            component: "TestComponent",
            operation: "testOperation",
            requestId: `test-${errorMessage}`,
          },
          { maxRetries: 2, retryDelay: 50 }
        );

        expect(result).toBe("success");
        expect(operation).toHaveBeenCalledTimes(2); // Initial + 1 retry
      }
    });

    it("should not retry non-network errors", async () => {
      const nonRetryableErrors = [
        "Invalid request",
        "Permission denied",
        "File not found",
        "Validation error",
        "Business logic error",
      ];

      for (const errorMessage of nonRetryableErrors) {
        const operation = jest.fn().mockRejectedValue(new Error(errorMessage));

        const result = await errorHandler.executeWithErrorHandling(
          operation,
          {
            component: "TestComponent",
            operation: "testOperation",
            requestId: `test-${errorMessage}`,
          },
          { fallbackValue: "fallback" }
        );

        expect(result).toBe("fallback");
        expect(operation).toHaveBeenCalledTimes(1); // Only initial call
      }
    });
  });

  describe("retry configuration", () => {
    it("should use default retry configuration when not specified", async () => {
      let callCount = 0;
      const operation = jest.fn().mockImplementation(() => {
        callCount++;
        if (callCount <= 2) {
          throw new Error("Connection refused");
        }
        return Promise.resolve("success");
      });

      const result = await errorHandler.executeWithErrorHandling(operation, {
        component: "TestComponent",
        operation: "testOperation",
        requestId: "test-default-config",
      });

      expect(result).toBe("success");
      expect(operation).toHaveBeenCalledTimes(3);
    });

    it("should respect custom retry configuration", async () => {
      let callCount = 0;
      const operation = jest.fn().mockImplementation(() => {
        callCount++;
        if (callCount <= 1) {
          throw new Error("Network timeout");
        }
        return Promise.resolve("success");
      });

      const result = await errorHandler.executeWithErrorHandling(
        operation,
        {
          component: "TestComponent",
          operation: "testOperation",
          requestId: "test-custom-config",
        },
        { maxRetries: 1, retryDelay: 200 }
      );

      expect(result).toBe("success");
      expect(operation).toHaveBeenCalledTimes(2); // Initial + 1 retry
    });
  });

  describe("retry with fallback integration", () => {
    it("should use fallback only after retries are exhausted", async () => {
      const operation = jest
        .fn()
        .mockRejectedValue(new Error("Connection refused"));

      const result = await errorHandler.executeWithErrorHandling(
        operation,
        {
          component: "TestComponent",
          operation: "testOperation",
          requestId: "test-fallback-integration",
        },
        { maxRetries: 2, retryDelay: 50, fallbackValue: "fallback" }
      );

      expect(result).toBe("fallback");
      expect(operation).toHaveBeenCalledTimes(3); // Initial + 2 retries
    });

    it("should not use fallback when retry succeeds", async () => {
      let callCount = 0;
      const operation = jest.fn().mockImplementation(() => {
        callCount++;
        if (callCount <= 1) {
          throw new Error("Network timeout");
        }
        return Promise.resolve("success");
      });

      const result = await errorHandler.executeWithErrorHandling(
        operation,
        {
          component: "TestComponent",
          operation: "testOperation",
          requestId: "test-fallback-success",
        },
        { maxRetries: 2, retryDelay: 50, fallbackValue: "fallback" }
      );

      expect(result).toBe("success");
      expect(operation).toHaveBeenCalledTimes(2); // Initial + 1 retry
    });
  });

  describe("error classification for retry", () => {
    it("should correctly identify retryable errors", async () => {
      const retryableErrors = [
        "ECONNREFUSED: Connection refused",
        "Network timeout after 30 seconds",
        "Connection lost during operation",
        "Temporary network issue, please retry",
        "Server temporarily unavailable",
      ];

      for (const errorMessage of retryableErrors) {
        let callCount = 0;
        const operation = jest.fn().mockImplementation(() => {
          callCount++;
          if (callCount <= 1) {
            throw new Error(errorMessage);
          }
          return Promise.resolve("success");
        });

        const result = await errorHandler.executeWithErrorHandling(
          operation,
          {
            component: "TestComponent",
            operation: "testOperation",
            requestId: `test-${errorMessage}`,
          },
          { maxRetries: 1, retryDelay: 50, fallbackValue: "fallback" }
        );

        // All these errors should be retryable and succeed on retry
        expect(result).toBe("success");
        expect(operation).toHaveBeenCalledTimes(2); // Should retry
      }
    });

    it("should correctly identify non-retryable errors", async () => {
      const nonRetryableErrors = [
        "Invalid input parameters",
        "User not authorized",
        "Resource not found",
        "Business rule violation",
        "Configuration error",
      ];

      for (const errorMessage of nonRetryableErrors) {
        const operation = jest.fn().mockRejectedValue(new Error(errorMessage));

        const result = await errorHandler.executeWithErrorHandling(
          operation,
          {
            component: "TestComponent",
            operation: "testOperation",
            requestId: `test-${errorMessage}`,
          },
          { fallbackValue: "fallback" }
        );

        expect(result).toBe("fallback");
        expect(operation).toHaveBeenCalledTimes(1); // Should not retry
      }
    });
  });
});
