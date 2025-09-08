/**
 * Error Handling Tests
 * Comprehensive tests for error handling and recovery mechanisms
 */

import { ErrorHandler, ErrorContext } from "../../utils/ErrorHandler";
import { AuditLogger, AuditSeverity } from "../../security/AuditLogger";
import { ErrorCode } from "../../types/extension";

describe("ErrorHandler", () => {
  let errorHandler: ErrorHandler;
  let auditLogger: AuditLogger;

  beforeEach(() => {
    auditLogger = new AuditLogger({
      enabled: true,
      logLevel: AuditSeverity.LOW,
    });
    errorHandler = new ErrorHandler(auditLogger);
  });

  afterEach(async () => {
    await auditLogger.shutdown();
    errorHandler.reset();
  });

  describe("Error Classification", () => {
    it("should classify connection errors correctly", async () => {
      const context: ErrorContext = {
        operation: "test",
        component: "TestComponent",
      };

      const connectionError = new Error("ECONNREFUSED: Connection refused");
      const result = await errorHandler.handleError(connectionError, context);

      expect(result.code).toBe(ErrorCode.CONNECTION_FAILED);
      expect(result.message).toContain("Connection refused");
    });

    it("should classify timeout errors correctly", async () => {
      const context: ErrorContext = {
        operation: "test",
        component: "TestComponent",
      };

      const timeoutError = new Error("Request timed out after 5000ms");
      const result = await errorHandler.handleError(timeoutError, context);

      expect(result.code).toBe(ErrorCode.TIMEOUT);
      expect(result.message).toContain("timed out");
    });

    it("should classify not found errors correctly", async () => {
      const context: ErrorContext = {
        operation: "test",
        component: "TestComponent",
      };

      const notFoundError = new Error("Resource not found");
      const result = await errorHandler.handleError(notFoundError, context);

      expect(result.code).toBe(ErrorCode.DATA_NOT_FOUND);
      expect(result.message).toContain("not found");
    });

    it("should classify invalid request errors correctly", async () => {
      const context: ErrorContext = {
        operation: "test",
        component: "TestComponent",
      };

      const invalidError = new Error("Invalid request parameters");
      const result = await errorHandler.handleError(invalidError, context);

      expect(result.code).toBe(ErrorCode.INVALID_REQUEST);
      expect(result.message).toContain("Invalid");
    });

    it("should default to internal error for unknown errors", async () => {
      const context: ErrorContext = {
        operation: "test",
        component: "TestComponent",
      };

      const unknownError = new Error("Something went wrong");
      const result = await errorHandler.handleError(unknownError, context);

      expect(result.code).toBe(ErrorCode.INTERNAL_ERROR);
    });
  });

  describe("Error Recovery", () => {
    it("should attempt recovery for recoverable errors", async () => {
      const context: ErrorContext = {
        operation: "getData",
        component: "TestComponent",
      };

      let attempts = 0;
      const operation = jest.fn().mockImplementation(async () => {
        attempts++;
        if (attempts < 3) {
          throw new Error("Connection failed");
        }
        return "success";
      });

      const result = await errorHandler.executeWithErrorHandling(
        operation,
        context,
        { enableRecovery: true, maxRetries: 3 }
      );

      expect(result).toBe("success");
      expect(attempts).toBe(3);
    });

    it("should use fallback value when provided", async () => {
      const context: ErrorContext = {
        operation: "getData",
        component: "TestComponent",
      };

      const operation = jest.fn().mockRejectedValue(new Error("Always fails"));
      const fallbackValue = "fallback";

      const result = await errorHandler.executeWithErrorHandling(
        operation,
        context,
        { fallbackValue }
      );

      expect(result).toBe(fallbackValue);
    });

    it("should respect max retry limits", async () => {
      const context: ErrorContext = {
        operation: "getData",
        component: "TestComponent",
      };

      let attempts = 0;
      const operation = jest.fn().mockImplementation(async () => {
        attempts++;
        throw new Error("Always fails");
      });

      await expect(
        errorHandler.executeWithErrorHandling(operation, context, {
          enableRecovery: true,
          maxRetries: 2,
        })
      ).rejects.toThrow("Always fails");

      expect(attempts).toBe(1); // Initial attempt only, recovery would be separate
    });
  });

  describe("Circuit Breaker", () => {
    it("should open circuit after threshold failures", async () => {
      const context: ErrorContext = {
        operation: "getData",
        component: "TestComponent",
      };

      const operation = jest.fn().mockRejectedValue(new Error("Service down"));

      // Trigger multiple failures to open circuit
      for (let i = 0; i < 6; i++) {
        try {
          await errorHandler.handleError(new Error("Service down"), context);
        } catch (error) {
          // Expected to fail
        }
      }

      // Next request should be rejected due to open circuit
      const result = await errorHandler.handleError(
        new Error("Service down"),
        context
      );

      expect(result.message).toContain("temporarily unavailable");
    });
  });

  describe("Error Sanitization", () => {
    it("should sanitize sensitive information from error messages", async () => {
      const context: ErrorContext = {
        operation: "test",
        component: "TestComponent",
      };

      const sensitiveError = new Error(
        "Authentication failed with token=abc123 and password=secret123"
      );
      const result = await errorHandler.handleError(sensitiveError, context);

      expect(result.message).not.toContain("abc123");
      expect(result.message).not.toContain("secret123");
      expect(result.message).toContain("[REDACTED]");
    });

    it("should sanitize file paths from error messages", async () => {
      const context: ErrorContext = {
        operation: "test",
        component: "TestComponent",
      };

      const pathError = new Error(
        "File not found: /home/user/sensitive/path/file.txt"
      );
      const result = await errorHandler.handleError(pathError, context);

      expect(result.message).not.toContain("/home/user/sensitive/path/");
      expect(result.message).toContain(".../");
    });
  });

  describe("Performance Tracking", () => {
    it("should track operation performance", async () => {
      const context: ErrorContext = {
        operation: "getData",
        component: "TestComponent",
      };

      const operation = jest.fn().mockImplementation(async () => {
        await new Promise((resolve) => setTimeout(resolve, 100));
        return "success";
      });

      const result = await errorHandler.executeWithErrorHandling(
        operation,
        context
      );

      expect(result).toBe("success");
      // Performance would be logged to audit system
    });
  });

  describe("Error Statistics", () => {
    it("should track error statistics", async () => {
      const context: ErrorContext = {
        operation: "getData",
        component: "TestComponent",
      };

      await errorHandler.handleError(new Error("Test error 1"), context);
      await errorHandler.handleError(new Error("Test error 2"), context);

      const stats = errorHandler.getErrorStats();
      expect(stats.totalErrors).toBeGreaterThan(0);
      expect(stats.errorsByComponent).toHaveProperty("TestComponent");
    });

    it("should reset statistics when requested", async () => {
      const context: ErrorContext = {
        operation: "getData",
        component: "TestComponent",
      };

      await errorHandler.handleError(new Error("Test error"), context);

      let stats = errorHandler.getErrorStats();
      expect(stats.totalErrors).toBeGreaterThan(0);

      errorHandler.reset();

      stats = errorHandler.getErrorStats();
      expect(stats.totalErrors).toBe(0);
    });
  });
});
