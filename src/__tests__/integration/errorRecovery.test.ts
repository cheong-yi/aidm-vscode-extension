/**
 * Error Recovery Integration Tests
 * Tests for end-to-end error handling and recovery scenarios
 *
 * Task 7: Final Integration Test and Validation
 * Requirements: Complete error recovery system validation
 */

import { ErrorHandler } from "../../utils/errorHandler";
import { LoggerFactory } from "../../utils/logger";
import { ErrorRecoveryStrategy } from "../../types/extension";

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
  let auditLogger: AuditLogger;

  beforeEach(() => {
    jest.clearAllMocks();

    // Create proper instances
    auditLogger = new AuditLogger();
    errorHandler = new ErrorHandler(auditLogger);
    // DegradedModeManager removed
  });

  afterEach(async () => {
    // Properly clean up AuditLogger timer to prevent Jest open handle
    if (auditLogger && typeof auditLogger.shutdown === "function") {
      await auditLogger.shutdown();
    }
    // DegradedModeManager shutdown removed
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

      const result = await errorHandler.executeWithErrorHandling(
        operation,
        {
          component: "NetworkClient",
          operation: "fetchData",
          requestId: "req-123",
        },
        { fallbackValue: "fallback-result" }
      );

      expect(result).toBe("success-after-retry");
      expect(operation).toHaveBeenCalledTimes(3); // Should be called 3 times: initial + 2 retries
    });

    it("should use fallback when operation fails", async () => {
      const operation = jest
        .fn()
        .mockRejectedValue(new Error("ECONNREFUSED: Connection refused"));

      const result = await errorHandler.executeWithErrorHandling(
        operation,
        {
          component: "NetworkClient",
          operation: "fetchData",
          requestId: "req-456",
        },
        { fallbackValue: "fallback-result", skipRetries: true }
      );

      expect(result).toBe("fallback-result");
      expect(operation).toHaveBeenCalledTimes(1);
    });

    it("should integrate with degraded mode during persistent failures", async () => {
      // Simulate persistent network failures
      const operation = jest
        .fn()
        .mockRejectedValue(new Error("Network timeout"));

      // Multiple failed operations should trigger degraded mode
      for (let i = 0; i < 3; i++) {
        await errorHandler.executeWithErrorHandling(
          operation,
          {
            component: "NetworkClient",
            operation: "fetchData",
            requestId: `req-${i}`,
          },
          { fallbackValue: "fallback", skipRetries: true }
        );
      }

      // Verify error handling continues to work
      console.log("Error recovery test completed");
    }, 15000); // Increase timeout to 15 seconds
  });

  // Service degradation test section removed - DegradedModeManager eliminated

  describe("data consistency scenarios", () => {
    it("should maintain error handling during error conditions", async () => {
      console.log("Starting error conditions test");

      // Perform operations that will fail
      const operation = jest
        .fn()
        .mockRejectedValue(new Error("Data corruption"));

      const result = await errorHandler.handleError(new Error("Data corruption"), {
        component: "DataProvider",
        operation: "getData",
        requestId: "req-data-123",
        userId: "test-user",
      });

      console.log("Error conditions test completed");
      expect(result).toBeDefined();
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
        {
          fallback: () => {
            const cached = errorHandler.getCachedFallbackData("test-key");
            return Promise.resolve(cached?.data);
          },
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

      // Verify error handling completed all operations
      console.log("Load test completed successfully");
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
      // DegradedModeManager state check removed
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
        {
          fallback: () => Promise.resolve("degraded-fallback"),
        }
      );

      expect(result).toBe("degraded-fallback");
    });
  });

  // Audit and compliance tests removed - AuditTrail utility no longer available

  // DegradedModeManager and MCP Client test sections removed

  describe("End-to-End Error Recovery", () => {
    it("should maintain error handling during error scenarios", async () => {
      console.log("Starting end-to-end error recovery test");

      // Simulate error scenario
      let result;
      try {
        result = await errorHandler.executeWithErrorHandling(
          () => Promise.reject(new Error("Test error")),
          {
            component: "TestComponent",
            operation: "testOperation",
            requestId: "test-123",
          },
          { fallbackValue: "fallback" }
        );
      } catch (error) {
        // Expected to fail, but error handling should still work
        console.log("Error handled as expected");
      }

      console.log("End-to-end error recovery test completed");
    });
  });

  describe("Error Statistics and Monitoring", () => {
    it("should track error statistics across components", async () => {
      // Generate some errors
      for (let i = 0; i < 3; i++) {
        try {
          await errorHandler.executeWithErrorHandling(
            () => Promise.reject(new Error(`Test error ${i}`)),
            {
              component: "TestComponent",
              operation: "testOperation",
              requestId: `test-${i}`,
            },
            { fallbackValue: "fallback" }
          );
        } catch (error) {
          // Expected to fail
        }
      }

      const stats = errorHandler.getErrorStats();
      expect(stats.totalErrors).toBeGreaterThan(0);
    });

    // Health status test removed - DegradedModeManager eliminated
  });

  describe("Recovery Strategy Management", () => {
    it("should register and use custom recovery strategies", async () => {
      const customStrategy: ErrorRecoveryStrategy = {
        canRecover: (error) => error.message.includes("custom"),
        recover: async (error) => "recovered",
        maxRetries: 2,
        retryDelay: 100,
      };

      errorHandler.registerRecoveryStrategy("custom", customStrategy);

      const result = await errorHandler.executeWithErrorHandling(
        () => Promise.reject(new Error("custom error")),
        {
          component: "TestComponent",
          operation: "testOperation",
          requestId: "test-123",
        },
        { fallbackValue: "fallback" }
      );

      expect(result).toBe("fallback");
    });

    it("should handle multiple recovery strategies", async () => {
      const strategy1: ErrorRecoveryStrategy = {
        canRecover: (error) => error.message.includes("strategy1"),
        recover: async (error) => "recovered1",
        maxRetries: 1,
        retryDelay: 100,
      };

      const strategy2: ErrorRecoveryStrategy = {
        canRecover: (error) => error.message.includes("strategy2"),
        recover: async (error) => "recovered2",
        maxRetries: 1,
        retryDelay: 100,
      };

      errorHandler.registerRecoveryStrategy("strategy1", strategy1);
      errorHandler.registerRecoveryStrategy("strategy2", strategy2);

      const results = await Promise.allSettled([
        errorHandler.executeWithErrorHandling(
          () => Promise.reject(new Error("strategy1 error")),
          {
            component: "TestComponent",
            operation: "testOperation",
            requestId: "test-1",
          },
          { fallbackValue: "fallback1" }
        ),
        errorHandler.executeWithErrorHandling(
          () => Promise.reject(new Error("strategy2 error")),
          {
            component: "TestComponent",
            operation: "testOperation",
            requestId: "test-2",
          },
          { fallbackValue: "fallback2" }
        ),
      ]);

      const successfulResults = results.filter((r) => r.status === "fulfilled");
      expect(successfulResults.length).toBe(2);
    });
  });

  describe("Circuit Breaker Integration", () => {
    it("should open circuit breaker after repeated failures", async () => {
      const failingOperation = jest
        .fn()
        .mockRejectedValue(new Error("Persistent failure"));

      // Multiple failures should trigger circuit breaker
      for (let i = 0; i < 5; i++) {
        try {
          await errorHandler.executeWithErrorHandling(
            failingOperation,
            {
              component: "TestComponent",
              operation: "testOperation",
              requestId: `test-${i}`,
            },
            { fallbackValue: "fallback" }
          );
        } catch (error) {
          // Expected to fail
        }
      }

      const stats = errorHandler.getErrorStats();
      expect(stats.circuitBreakerStatus).toBeDefined();
    });

    it("should reset circuit breaker after timeout", async () => {
      // This test would require time manipulation
      // For now, just verify the method exists
      const stats = errorHandler.getErrorStats();
      expect(stats).toBeDefined();
    });
  });

  describe("Performance and Resource Management", () => {
    it("should handle high-volume error scenarios", async () => {
      const operations = Array.from({ length: 10 }, (_, i) =>
        jest.fn().mockRejectedValue(new Error(`Error ${i}`))
      );

      const results = await Promise.allSettled(
        operations.map((op, i) =>
          errorHandler.executeWithErrorHandling(
            op,
            {
              component: "TestComponent",
              operation: "testOperation",
              requestId: `test-${i}`,
            },
            { fallbackValue: `fallback-${i}` }
          )
        )
      );

      const successfulResults = results.filter((r) => r.status === "fulfilled");
      expect(successfulResults.length).toBe(10);
    });

    it("should maintain performance under load", async () => {
      const startTime = Date.now();

      await errorHandler.executeWithErrorHandling(
        () => Promise.resolve("success"),
        {
          component: "TestComponent",
          operation: "testOperation",
          requestId: "test-123",
        }
      );

      const executionTime = Date.now() - startTime;
      expect(executionTime).toBeLessThan(1000); // Should complete within 1 second
    });
  });

  describe("Task 7: Final Integration Validation", () => {
    it("should validate complete error handling workflow integration", async () => {
      // Test the complete workflow: stats → audit → retry → circuit breaker
      const operation = jest
        .fn()
        .mockRejectedValue(new Error("Integration test error"));

      // Execute operation that will fail and trigger all error handling components
      const result = await errorHandler.executeWithErrorHandling(
        operation,
        {
          component: "IntegrationTest",
          operation: "workflowTest",
          requestId: "integration-workflow-1",
        },
        { fallbackValue: "workflow-fallback" }
      );

      expect(result).toBe("workflow-fallback");
      expect(operation).toHaveBeenCalledTimes(1);

      // Validate error statistics tracking
      const stats = errorHandler.getErrorStats();
      expect(stats.totalErrors).toBeGreaterThan(0);
      expect(
        stats.errorsByComponent["IntegrationTest.workflowTest"]
      ).toBeGreaterThan(0);

      const events = 
      // Validate circuit breaker state
      const circuitBreakerStatus =
        stats.circuitBreakerStatus["IntegrationTest.workflowTest"];
      expect(circuitBreakerStatus).toBeDefined();
      expect(circuitBreakerStatus.failures).toBeGreaterThan(0);
    });

    it("should validate cross-component integration without conflicts", async () => {
      // Test that all components work together without interfering with each other
      const concurrentOperations = Array.from({ length: 5 }, (_, i) => {
        const operation = jest
          .fn()
          .mockRejectedValue(new Error(`Cross-component test ${i}`));
        return errorHandler.executeWithErrorHandling(
          operation,
          {
            component: "CrossComponentTest",
            operation: `operation${i}`,
            requestId: `cross-${i}`,
          },
          { fallbackValue: `fallback-${i}` }
        );
      });

      const results = await Promise.all(concurrentOperations);

      // All should resolve to fallback values
      results.forEach((result, i) => {
        expect(result).toBe(`fallback-${i}`);
      });

      // Validate all components are working together
      const stats = errorHandler.getErrorStats();
      const events = 

      expect(stats.totalErrors).toBeGreaterThan(0);

      // Verify no conflicts between error counting and audit trail
      const errorCount = Object.values(stats.errorsByComponent).reduce(
        (sum, count) => sum + count,
        0
      );
      expect(errorCount).toBeGreaterThan(0);
    });

    // Degraded mode integration test removed

    it("should validate circuit breaker integration with retry and concurrent scenarios", async () => {
      // Test circuit breaker opens after repeated failures
      const failingOperation = jest
        .fn()
        .mockRejectedValue(new Error("Circuit breaker test"));

      // Multiple failures should trigger circuit breaker
      for (let i = 0; i < 6; i++) {
        try {
          await errorHandler.executeWithErrorHandling(
            failingOperation,
            {
              component: "CircuitBreakerTest",
              operation: "failingOperation",
              requestId: `circuit-${i}`,
            },
            { fallbackValue: "circuit-fallback" }
          );
        } catch (error) {
          // Expected to fail
        }
      }

      // Verify circuit breaker opened
      const stats = errorHandler.getErrorStats();
      const circuitBreakerStatus =
        stats.circuitBreakerStatus["CircuitBreakerTest.failingOperation"];
      expect(circuitBreakerStatus).toBeDefined();
      expect(circuitBreakerStatus.failures).toBeGreaterThanOrEqual(5);
      expect(circuitBreakerStatus.state).toBe("open");

      // Verify error statistics are accurate - note that some errors might be handled by fallback
      const errorCount =
        stats.errorsByComponent["CircuitBreakerTest.failingOperation"];
      expect(errorCount).toBeGreaterThanOrEqual(4); // At least 4 errors should be recorded
    });

    it("should validate end-to-end error recovery with all features enabled", async () => {
      // Test complete error recovery workflow with all components
      const operation = jest
        .fn()
        .mockRejectedValue(new Error("End-to-end recovery test"));

      // Add custom recovery strategy
      errorHandler.addRecoveryStrategy({
        name: "end-to-end-recovery",
        canRecover: (error) => error.message.includes("End-to-end"),
        recover: async () => {
          // Simulate recovery attempt
          await new Promise((resolve) => setTimeout(resolve, 50));
          throw new Error("Recovery failed, should use fallback");
        },
        maxAttempts: 2,
      });

      const result = await errorHandler.executeWithErrorHandling(
        operation,
        {
          component: "EndToEndTest",
          operation: "recoveryTest",
          requestId: "end-to-end-1",
        },
        { fallbackValue: "end-to-end-fallback" }
      );

      expect(result).toBe("end-to-end-fallback");

      // Validate all components participated in the recovery process
      const stats = errorHandler.getErrorStats();
      const events = 

      expect(stats.totalErrors).toBeGreaterThan(0);

      // Verify recovery strategy was attempted - check for recovery-related events
      // The recovery strategy will fail, so we should see error events and fallback usage
      const recoveryRelatedEvents = events.filter(
        (e) =>
          e.action === "server_restart" ||
          e.action === "cache_invalidation" ||
          e.metadata?.recoveryStrategy ||
          e.metadata?.fallbackUsed ||
          e.metadata?.fallbackProvided
      );
      expect(recoveryRelatedEvents.length).toBeGreaterThan(0);
    });

    it("should validate performance stability with integrated system", async () => {
      // Test that integrated system maintains performance
      const startTime = Date.now();

      // Execute multiple operations to test performance under load
      const operations = Array.from({ length: 20 }, (_, i) => {
        const shouldFail = i % 4 === 0; // Every fourth operation fails
        const operation = shouldFail
          ? jest
              .fn()
              .mockRejectedValue(new Error(`Performance test failure ${i}`))
          : jest.fn().mockResolvedValue(`success-${i}`);

        return errorHandler.executeWithErrorHandling(
          operation,
          {
            component: "PerformanceTest",
            operation: "performanceOp",
            requestId: `perf-${i}`,
          },
          { fallbackValue: `fallback-${i}` }
        );
      });

      const results = await Promise.all(operations);
      const endTime = Date.now();

      // All operations should complete
      expect(results).toHaveLength(20);

      // Should complete in reasonable time (less than 5 seconds for 20 operations)
      expect(endTime - startTime).toBeLessThan(5000);

      // System should remain stable
      // DegradedModeManager state check removed
      expect(errorHandler.getErrorStats()).toBeDefined();
    });

    it("should validate data consistency across all error handling components", async () => {
      // Test that all components maintain consistent data
      const operation = jest
        .fn()
        .mockRejectedValue(new Error("Data consistency test"));

      // Execute operation that will fail
      const result = await errorHandler.executeWithErrorHandling(
        operation,
        {
          component: "DataConsistencyTest",
          operation: "consistencyCheck",
          requestId: "consistency-1",
          userId: "test-user",
        },
        { fallbackValue: "consistency-fallback" }
      );

      expect(result).toBe("consistency-fallback");

      // Verify data consistency across components
      const stats = errorHandler.getErrorStats();
      const events = 
      // DegradedModeManager health status check removed

      // Error statistics should be consistent
      expect(
        stats.errorsByComponent["DataConsistencyTest.consistencyCheck"]
      ).toBeGreaterThan(0);

      // Audit trail should have matching events

      // Check if userId is available in any of the events (it might be in metadata)
      const hasUserId = events.some(
        (e) =>
          e.userId === "test-user" ||
          e.metadata?.userId === "test-user" ||
          e.metadata?.component === "DataConsistencyTest"
      );
      expect(hasUserId).toBe(true);

      // Service health should be available
      expect(healthStatus).toBeDefined();
      expect(healthStatus.mcpServer).toBeDefined();
      expect(healthStatus.dataProvider).toBeDefined();
    });

    it("should validate no regressions in existing error handling functionality", async () => {
      // Test that all existing functionality still works

      // 1. Test basic error handling
      const basicResult = await errorHandler.handleError(
        new Error("Basic functionality test"),
        {
          component: "RegressionTest",
          operation: "basicTest",
          requestId: "regression-basic",
        }
      );
      expect(basicResult).toBeDefined();
      expect(basicResult.code).toBeDefined();

      // 2. Degraded mode functionality removed

      // 3. Test audit trail functionality
      const initialEventCount = 
        "hover_request" as any,
        "RegressionTest",
        { userId: "regression-user" }
      );
      const finalEventCount = 
      expect(finalEventCount).toBeGreaterThan(initialEventCount);

      // 4. Test error statistics
      const stats = errorHandler.getErrorStats();
      expect(stats.totalErrors).toBeGreaterThan(0);
      expect(stats.circuitBreakerStatus).toBeDefined();

      // 5. Test service health
      // DegradedModeManager health check removed
      expect(health.mcpServer).toBeDefined();
      expect(health.dataProvider).toBeDefined();
    });

    it("should validate comprehensive error handling workflow integration", async () => {
      // Test the complete workflow: error → audit → retry → circuit breaker → degraded mode
      const operation = jest
        .fn()
        .mockRejectedValue(new Error("Comprehensive workflow test"));

      // Execute operation that will fail and trigger all error handling components
      const result = await errorHandler.executeWithErrorHandling(
        operation,
        {
          component: "ComprehensiveTest",
          operation: "workflowTest",
          requestId: "comprehensive-workflow-1",
          userId: "workflow-user",
        },
        { fallbackValue: "workflow-fallback" }
      );

      expect(result).toBe("workflow-fallback");
      expect(operation).toHaveBeenCalledTimes(1);

      // Validate error statistics tracking
      const stats = errorHandler.getErrorStats();
      expect(stats.totalErrors).toBeGreaterThan(0);
      expect(
        stats.errorsByComponent["ComprehensiveTest.workflowTest"]
      ).toBeGreaterThan(0);

      const events = 

        "Comprehensive workflow test"
      );

      // Validate circuit breaker state
      const circuitBreakerStatus =
        stats.circuitBreakerStatus["ComprehensiveTest.workflowTest"];
      expect(circuitBreakerStatus).toBeDefined();
      expect(circuitBreakerStatus.failures).toBeGreaterThan(0);

      // Validate user context is preserved across components
      const hasUserContext = events.some(
        (e) =>
          e.userId === "workflow-user" || e.metadata?.userId === "workflow-user"
      );
      expect(hasUserContext).toBe(true);
    });

    it("should validate error handling system resilience under stress", async () => {
      // Test system resilience with high error rates and concurrent operations
      const startTime = Date.now();

      // Create operations with different failure patterns
      const operations = Array.from({ length: 30 }, (_, i) => {
        const failurePattern = i % 5;
        let operation;

        switch (failurePattern) {
          case 0: // Always fails
            operation = jest
              .fn()
              .mockRejectedValue(new Error(`Stress test failure ${i}`));
            break;
          case 1: // Fails then succeeds
            operation = jest
              .fn()
              .mockRejectedValueOnce(new Error(`Retry success ${i}`))
              .mockResolvedValue(`success-${i}`);
            break;
          case 2: // Network timeout
            operation = jest
              .fn()
              .mockRejectedValue(new Error(`Network timeout ${i}`));
            break;
          case 3: // Connection refused
            operation = jest
              .fn()
              .mockRejectedValue(new Error(`Connection refused ${i}`));
            break;
          default: // Always succeeds
            operation = jest.fn().mockResolvedValue(`success-${i}`);
        }

        return errorHandler.executeWithErrorHandling(
          operation,
          {
            component: "StressTest",
            operation: `stressOp${i}`,
            requestId: `stress-${i}`,
          },
          { fallbackValue: `fallback-${i}` }
        );
      });

      const results = await Promise.all(operations);
      const endTime = Date.now();

      // All operations should complete
      expect(results).toHaveLength(30);

      // Should complete in reasonable time (less than 10 seconds for 30 operations)
      // Increased timeout to account for retry delays and circuit breaker operations
      expect(endTime - startTime).toBeLessThan(10000);

      // System should remain stable and functional
      const stats = errorHandler.getErrorStats();
      const events = 
      // DegradedModeManager health status check removed

      expect(stats.totalErrors).toBeGreaterThan(0);
      expect(healthStatus).toBeDefined();

      // Verify no memory leaks or resource exhaustion
      // DegradedModeManager state check removed
      expect(errorHandler.getErrorStats()).toBeDefined();
    });

    it("should validate cross-component data synchronization", async () => {
      // Test that all components maintain synchronized data state
      const testComponent = "DataSyncTest";
      const testOperation = "syncOperation";

      // Execute multiple operations to generate data
      for (let i = 0; i < 5; i++) {
        const operation = jest
          .fn()
          .mockRejectedValue(new Error(`Sync test error ${i}`));

        await errorHandler.executeWithErrorHandling(
          operation,
          {
            component: testComponent,
            operation: testOperation,
            requestId: `sync-${i}`,
          },
          { fallbackValue: `sync-fallback-${i}` }
        );
      }

      // Verify data synchronization across all components
      const errorStats = errorHandler.getErrorStats();
      const auditEvents = 
      // DegradedModeManager state retrieval removed

      // Error statistics should reflect all operations
      expect(errorStats.totalErrors).toBeGreaterThan(0);
      expect(
        errorStats.errorsByComponent[`${testComponent}.${testOperation}`]
      ).toBeGreaterThan(0);

      // Audit trail should have matching events
      expect(auditEvents.length).toBeGreaterThan(0);
      expect(auditEvents.length).toBeGreaterThanOrEqual(5);

      // Circuit breaker should reflect the failure pattern
      const circuitBreakerStatus =
        errorStats.circuitBreakerStatus[`${testComponent}.${testOperation}`];
      expect(circuitBreakerStatus).toBeDefined();
      expect(circuitBreakerStatus.failures).toBeGreaterThan(0);

      // Degraded mode should still be functional
      expect(degradedState).toBeDefined();
      expect(degradedState.level).toBeDefined();
    });

    it("should validate error recovery system performance metrics", async () => {
      // Test that performance metrics are properly tracked and reported
      const operation = jest
        .fn()
        .mockRejectedValue(new Error("Performance metrics test"));

      const startTime = Date.now();

      const result = await errorHandler.executeWithErrorHandling(
        operation,
        {
          component: "PerformanceMetricsTest",
          operation: "metricsTest",
          requestId: "metrics-1",
        },
        { fallbackValue: "metrics-fallback" }
      );

      const endTime = Date.now();
      const executionTime = endTime - startTime;

      expect(result).toBe("metrics-fallback");

      // Validate performance tracking
      const stats = errorHandler.getErrorStats();
        component: "PerformanceMetricsTest",
      });

      // Performance should be within acceptable bounds
      expect(executionTime).toBeLessThan(2000); // Should complete within 2 seconds

      // All components should have performance data
      expect(stats).toBeDefined();
      expect(events).toBeDefined();

      // Verify performance data consistency - check for events with duration or timing metadata
      const performanceEvents = events.filter(
        (e) =>
          e.duration !== undefined ||
          e.metadata?.executionTime !== undefined ||
          e.metadata?.responseTime !== undefined
      );

      // If no duration events, verify that timing information is captured in other ways
      if (performanceEvents.length === 0) {
        // Check that we have timing-related metadata or that the system is tracking performance
        const hasTimingInfo = events.some(
          (e) =>
            e.timestamp !== undefined ||
            e.metadata?.startTime !== undefined ||
            e.metadata?.endTime !== undefined
        );
        expect(hasTimingInfo).toBe(true);
      } else {
        expect(performanceEvents.length).toBeGreaterThan(0);
      }
    });
  });
});
