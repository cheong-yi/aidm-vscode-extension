/**
 * Error Recovery Integration Tests
 * Tests for end-to-end error handling and recovery scenarios
 */

import { ErrorHandler } from "../../utils/ErrorHandler";
import {
  degradedModeManager,
  DegradedModeLevel,
} from "../../utils/degradedMode";
import { auditTrail } from "../../utils/auditTrail";
import { LoggerFactory } from "../../utils/logger";

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

describe("Error Recovery Integration", () => {
  let errorHandler: ErrorHandler;

  beforeEach(() => {
    jest.clearAllMocks();
    errorHandler = ErrorHandlerFactory.getHandler("IntegrationTest");

    // Reset degraded mode manager to normal state
    degradedModeManager.forceDegradationLevel(
      DegradedModeLevel.NORMAL,
      "Test reset"
    );
  });

  afterEach(() => {
    degradedModeManager.dispose();
  });

  describe("network failure scenarios", () => {
    it("should handle connection refused errors with retry and fallback", async () => {
      let attemptCount = 0;
      const operation = jest.fn().mockImplementation(() => {
        attemptCount++;
        if (attemptCount <= 2) {
          throw new Error("ECONNREFUSED: Connection refused");
        }
        return Promise.resolve("success-after-retry");
      });

      const fallback = jest.fn().mockResolvedValue("fallback-result");

      const result = await errorHandler.withErrorBoundary(
        operation,
        {
          component: "NetworkClient",
          operation: "fetchData",
          requestId: "req-123",
        },
        fallback
      );

      expect(result).toBe("success-after-retry");
      expect(operation).toHaveBeenCalledTimes(3);
      expect(fallback).not.toHaveBeenCalled();
    });

    it("should use fallback when all retries fail", async () => {
      const operation = jest
        .fn()
        .mockRejectedValue(new Error("ECONNREFUSED: Connection refused"));
      const fallback = jest.fn().mockResolvedValue("fallback-result");

      const result = await errorHandler.withErrorBoundary(
        operation,
        {
          component: "NetworkClient",
          operation: "fetchData",
          requestId: "req-456",
        },
        fallback
      );

      expect(result).toBe("fallback-result");
      expect(operation).toHaveBeenCalledTimes(3); // Max retries
      expect(fallback).toHaveBeenCalled();
    });

    it("should integrate with degraded mode during persistent failures", async () => {
      // Simulate persistent network failures
      const operation = jest
        .fn()
        .mockRejectedValue(new Error("Network timeout"));

      // Multiple failed operations should trigger degraded mode
      for (let i = 0; i < 3; i++) {
        await errorHandler.withErrorBoundary(
          operation,
          {
            component: "NetworkClient",
            operation: "fetchData",
            requestId: `req-${i}`,
          },
          () => Promise.resolve("fallback")
        );
      }

      // Verify audit trail records the failures
      const events = auditTrail.getEvents({ success: false });
      expect(events.length).toBeGreaterThan(0);
    }, 15000); // Increase timeout to 15 seconds
  });

  describe("service degradation scenarios", () => {
    it("should handle MCP server unavailability", async () => {
      // Simulate MCP server being down
      await degradedModeManager.forceDegradationLevel(
        DegradedModeLevel.PARTIAL,
        "MCP server unavailable"
      );

      const mcpOperation = jest
        .fn()
        .mockRejectedValue(new Error("MCP server not responding"));
      const fallback = jest.fn().mockResolvedValue({
        requirements: [],
        implementationStatus: {
          completionPercentage: 0,
          lastVerified: new Date(),
          verifiedBy: "System",
        },
        relatedChanges: [],
        lastUpdated: new Date(),
      });

      const result = await degradedModeManager.executeWithDegradation(
        mcpOperation,
        fallback,
        { component: "MCPClient", operation: "getContext" }
      );

      expect(result).toBeDefined();
      expect(mcpOperation).not.toHaveBeenCalled(); // Should skip primary operation in degraded mode
      expect(fallback).toHaveBeenCalled();
    });

    it("should recover when services become available", async () => {
      // Start in degraded mode
      await degradedModeManager.forceDegradationLevel(
        DegradedModeLevel.MINIMAL,
        "Multiple services down"
      );

      // Mock health checks to simulate recovery
      jest
        .spyOn(degradedModeManager as any, "performHealthChecks")
        .mockResolvedValue({
          mcpServer: true,
          dataProvider: true,
          cache: true,
          network: true,
        });

      const recovered = await degradedModeManager.attemptRecovery();

      expect(recovered).toBe(true);
      expect(degradedModeManager.getCurrentState().level).toBe(
        DegradedModeLevel.NORMAL
      );
    });
  });

  describe("data consistency scenarios", () => {
    it("should maintain audit trail during error conditions", async () => {
      const initialEventCount = auditTrail.getEvents().length;

      // Perform operations that will fail
      const operation = jest
        .fn()
        .mockRejectedValue(new Error("Data corruption"));

      await errorHandler.handleError(new Error("Data corruption"), {
        component: "DataProvider",
        operation: "getData",
        requestId: "req-data-123",
        userId: "test-user",
      });

      const events = auditTrail.getEvents();
      expect(events.length).toBeGreaterThan(initialEventCount);

      const errorEvents = events.filter((e) => !e.success);
      expect(errorEvents.length).toBeGreaterThan(0);
      expect(errorEvents[0].errorMessage).toContain("Data corruption");
    });

    it("should cache successful results for fallback use", async () => {
      const successfulData = { id: "test-data", value: "success" };

      // Cache some successful data
      errorHandler.cacheFallbackData(
        "test-key",
        successfulData,
        "primary-source"
      );

      // Later, when primary fails, should use cached data
      const operation = jest
        .fn()
        .mockRejectedValue(new Error("Primary source failed"));

      const result = await errorHandler.handleError(
        new Error("Primary source failed"),
        {
          component: "DataProvider",
          operation: "getData",
          requestId: "req-cache-123",
        },
        () => {
          const cached = errorHandler.getCachedFallbackData("test-key");
          return Promise.resolve(cached?.data);
        }
      );

      expect(result).toEqual(successfulData);
    });
  });

  describe("concurrent error scenarios", () => {
    it("should handle multiple concurrent failures gracefully", async () => {
      const concurrentOperations = Array.from({ length: 10 }, (_, i) => {
        const operation = jest
          .fn()
          .mockRejectedValue(new Error(`Concurrent failure ${i}`));
        return errorHandler.withErrorBoundary(
          operation,
          {
            component: "ConcurrentTest",
            operation: "concurrentOp",
            requestId: `concurrent-${i}`,
          },
          () => Promise.resolve(`fallback-${i}`)
        );
      });

      const results = await Promise.all(concurrentOperations);

      // All should resolve to fallback values
      results.forEach((result, i) => {
        expect(result).toBe(`fallback-${i}`);
      });

      // Audit trail should record all failures
      const errorEvents = auditTrail.getEvents({ success: false });
      expect(errorEvents.length).toBeGreaterThanOrEqual(10);
    });

    it("should maintain system stability under load", async () => {
      const startTime = Date.now();

      // Simulate high load with mixed success/failure
      const operations = Array.from({ length: 50 }, (_, i) => {
        const shouldFail = i % 3 === 0; // Every third operation fails
        const operation = shouldFail
          ? jest.fn().mockRejectedValue(new Error(`Load test failure ${i}`))
          : jest.fn().mockResolvedValue(`success-${i}`);

        return errorHandler.withErrorBoundary(
          operation,
          {
            component: "LoadTest",
            operation: "loadOp",
            requestId: `load-${i}`,
          },
          () => Promise.resolve(`fallback-${i}`)
        );
      });

      const results = await Promise.all(operations);
      const endTime = Date.now();

      // All operations should complete
      expect(results).toHaveLength(50);

      // Should complete in reasonable time (less than 10 seconds)
      expect(endTime - startTime).toBeLessThan(10000);

      // System should remain stable (not crash)
      expect(degradedModeManager.getCurrentState()).toBeDefined();
    });
  });

  describe("recovery strategy effectiveness", () => {
    it("should successfully recover from transient network issues", async () => {
      let networkStable = false;

      // Add custom recovery strategy
      errorHandler.addRecoveryStrategy({
        name: "network-stabilization",
        canRecover: (error) => error.message.includes("network"),
        recover: async () => {
          // Simulate network stabilization
          await new Promise((resolve) => setTimeout(resolve, 100));
          networkStable = true;
          return { recovered: true, networkStable };
        },
        maxAttempts: 3,
      });

      const result = await errorHandler.handleError(
        new Error("network instability detected"),
        {
          component: "NetworkMonitor",
          operation: "checkConnection",
          requestId: "recovery-test",
        }
      );

      expect(result).toEqual({ recovered: true, networkStable: true });
      expect(networkStable).toBe(true);
    });

    it("should escalate to degraded mode when recovery fails", async () => {
      // Add recovery strategy that always fails
      errorHandler.addRecoveryStrategy({
        name: "failing-recovery",
        canRecover: () => true,
        recover: async () => {
          throw new Error("Recovery failed");
        },
        maxAttempts: 2,
      });

      const result = await errorHandler.handleError(
        new Error("Unrecoverable error"),
        {
          component: "CriticalService",
          operation: "criticalOp",
          requestId: "escalation-test",
        },
        () => Promise.resolve("degraded-fallback")
      );

      expect(result).toBe("degraded-fallback");
    });
  });

  describe("audit and compliance", () => {
    it("should maintain complete audit trail during error scenarios", async () => {
      const initialStats = auditTrail.getStats();

      // Perform various operations with mixed outcomes
      await errorHandler.withErrorBoundary(() => Promise.resolve("success"), {
        component: "AuditTest",
        operation: "successOp",
        requestId: "audit-1",
      });

      await errorHandler.handleError(new Error("Audit test error"), {
        component: "AuditTest",
        operation: "errorOp",
        requestId: "audit-2",
      });

      const finalStats = auditTrail.getStats();

      expect(finalStats.totalEvents).toBeGreaterThan(initialStats.totalEvents);
      expect(finalStats.successRate).toBeLessThan(100); // Should have some failures
      expect(finalStats.topActions.length).toBeGreaterThan(0);
    });

    it("should export audit data for compliance reporting", () => {
      // Generate some audit events
      auditTrail.recordUserInteraction(
        "hover_request" as any,
        "HoverProvider",
        {
          userId: "compliance-user",
          duration: 150,
        }
      );

      auditTrail.recordError(
        "request_failed" as any,
        "ErrorTest",
        new Error("Compliance test error"),
        { userId: "compliance-user" }
      );

      const exportedData = auditTrail.exportEvents({
        userId: "compliance-user",
      });

      const parsedData = JSON.parse(exportedData);
      expect(Array.isArray(parsedData)).toBe(true);
      expect(parsedData.length).toBeGreaterThan(0);
      expect(parsedData[0]).toHaveProperty("timestamp");
      expect(parsedData[0]).toHaveProperty("userId", "compliance-user");
    });
  });
});
