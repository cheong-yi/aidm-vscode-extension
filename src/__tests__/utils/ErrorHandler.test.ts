/**
 * ErrorHandler Unit Tests
 * Tests for audit trail integration and error handling functionality
 */

import { ErrorHandler } from "../../utils/ErrorHandler";
import { AuditLogger } from "../../security/AuditLogger";
import { auditTrail } from "../../utils/auditTrail";

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

describe("ErrorHandler Audit Trail Integration", () => {
  let errorHandler: ErrorHandler;
  let auditLogger: AuditLogger;

  beforeEach(() => {
    jest.clearAllMocks();

    // Create fresh instances for each test
    auditLogger = new AuditLogger();
    errorHandler = new ErrorHandler(auditLogger);

    // Clear audit trail for clean test state
    (auditTrail as any).events = [];
  });

  afterEach(async () => {
    // Clean up audit trail
    (auditTrail as any).events = [];
    if (auditLogger) {
      await auditLogger.shutdown();
    }
  });

  describe("audit trail integration", () => {
    it("should record error events in audit trail", async () => {
      const initialEventCount = auditTrail.getEvents().length;

      await errorHandler.handleError(new Error("Test error"), {
        component: "TestComponent",
        operation: "testOperation",
        requestId: "test-123",
      });

      const events = auditTrail.getEvents();
      expect(events.length).toBeGreaterThan(initialEventCount);

      const errorEvents = events.filter((e) => !e.success);
      expect(errorEvents.length).toBeGreaterThan(0);
      expect(errorEvents[0].errorMessage).toContain("Test error");
      expect(errorEvents[0].component).toBe("TestComponent");
      expect(errorEvents[0].action).toBe("request_failed");
    });

    it("should record multiple error events properly", async () => {
      const initialEventCount = auditTrail.getEvents().length;

      // Generate multiple errors
      await errorHandler.handleError(new Error("Error 1"), {
        component: "Component1",
        operation: "operation1",
        requestId: "req-1",
      });

      await errorHandler.handleError(new Error("Error 2"), {
        component: "Component2",
        operation: "operation2",
        requestId: "req-2",
      });

      const events = auditTrail.getEvents();
      expect(events.length).toBeGreaterThan(initialEventCount + 1);

      const errorEvents = events.filter((e) => !e.success);
      expect(errorEvents.length).toBeGreaterThanOrEqual(2);

      // Verify different components and operations
      const component1Errors = errorEvents.filter(
        (e) => e.component === "Component1"
      );
      const component2Errors = errorEvents.filter(
        (e) => e.component === "Component2"
      );
      expect(component1Errors.length).toBeGreaterThan(0);
      expect(component2Errors.length).toBeGreaterThan(0);
    });

    it("should record error events with proper success flag", async () => {
      await errorHandler.handleError(new Error("Test error"), {
        component: "TestComponent",
        operation: "testOperation",
        requestId: "test-123",
      });

      const events = auditTrail.getEvents();
      const errorEvents = events.filter((e) => !e.success);

      expect(errorEvents.length).toBeGreaterThan(0);
      errorEvents.forEach((event) => {
        expect(event.success).toBe(false);
        expect(event.type).toBe("error_event");
      });
    });

    it("should handle concurrent error recording", async () => {
      const initialEventCount = auditTrail.getEvents().length;

      // Create concurrent error operations
      const concurrentErrors = Array.from({ length: 5 }, (_, i) =>
        errorHandler.handleError(new Error(`Concurrent error ${i}`), {
          component: "ConcurrentComponent",
          operation: "concurrentOp",
          requestId: `concurrent-${i}`,
        })
      );

      await Promise.all(concurrentErrors);

      const events = auditTrail.getEvents();
      expect(events.length).toBeGreaterThan(initialEventCount + 4);

      const errorEvents = events.filter((e) => !e.success);
      expect(errorEvents.length).toBeGreaterThanOrEqual(5);
    });

    it("should continue error handling if audit trail recording fails", async () => {
      // Mock audit trail to throw an error
      const originalRecordError = auditTrail.recordError;
      auditTrail.recordError = jest.fn().mockImplementation(() => {
        throw new Error("Audit trail recording failed");
      });

      // Should not throw, should continue with error handling
      const result = await errorHandler.handleError(new Error("Test error"), {
        component: "TestComponent",
        operation: "testOperation",
        requestId: "test-123",
      });

      expect(result).toBeDefined();
      expect(result).toHaveProperty("code");
      expect(result).toHaveProperty("message");

      // Restore original method
      auditTrail.recordError = originalRecordError;
    });

    it("should record error context metadata properly", async () => {
      const testMetadata = {
        userId: "test-user",
        sessionId: "test-session",
        customField: "custom-value",
      };

      await errorHandler.handleError(new Error("Test error with metadata"), {
        component: "TestComponent",
        operation: "testOperation",
        requestId: "test-123",
        userId: "test-user",
        sessionId: "test-session",
        metadata: testMetadata,
      });

      const events = auditTrail.getEvents();
      const errorEvents = events.filter((e) => !e.success);

      expect(errorEvents.length).toBeGreaterThan(0);
      const errorEvent = errorEvents[0];

      expect(errorEvent.userId).toBe("test-user");
      expect(errorEvent.sessionId).toBeDefined(); // auditTrail generates its own session ID
      expect(errorEvent.metadata).toBeDefined();
      expect(errorEvent.metadata?.customField).toBe("custom-value");
    });
  });

  describe("error event format", () => {
    it("should create error events with required fields", async () => {
      await errorHandler.handleError(new Error("Format test error"), {
        component: "FormatTest",
        operation: "formatTest",
        requestId: "format-123",
      });

      const events = auditTrail.getEvents();
      const errorEvents = events.filter((e) => !e.success);

      expect(errorEvents.length).toBeGreaterThan(0);
      const errorEvent = errorEvents[0];

      // Verify required fields
      expect(errorEvent.id).toBeDefined();
      expect(errorEvent.timestamp).toBeDefined();
      expect(errorEvent.type).toBe("error_event");
      expect(errorEvent.action).toBe("request_failed");
      expect(errorEvent.component).toBe("FormatTest");
      expect(errorEvent.success).toBe(false);
      expect(errorEvent.errorMessage).toContain("Format test error");
    });

    it("should categorize errors properly", async () => {
      await errorHandler.handleError(new Error("Connection timeout"), {
        component: "NetworkComponent",
        operation: "networkOp",
        requestId: "network-123",
      });

      const events = auditTrail.getEvents();
      const errorEvents = events.filter((e) => !e.success);

      expect(errorEvents.length).toBeGreaterThan(0);
      const errorEvent = errorEvents[0];

      expect(errorEvent.type).toBe("error_event");
      expect(errorEvent.action).toBe("request_failed");
      expect(errorEvent.success).toBe(false);
    });
  });

  describe("Circuit Breaker Integration", () => {
    it("should create circuit breaker for new component.operation", async () => {
      const stats = errorHandler.getErrorStats();
      expect(stats.circuitBreakerStatus).toEqual({});

      // Trigger an error using executeWithErrorHandling to create a circuit breaker
      try {
        await errorHandler.executeWithErrorHandling(
          () => Promise.reject(new Error("Test error")),
          {
            component: "TestComponent",
            operation: "testOperation",
            requestId: "test-123",
          },
          { fallbackValue: "fallback" }
        );
      } catch (error) {
        // Expected to fail
      }

      const updatedStats = errorHandler.getErrorStats();
      expect(updatedStats.circuitBreakerStatus).toBeDefined();
      expect(
        updatedStats.circuitBreakerStatus["TestComponent.testOperation"]
      ).toBeDefined();
      expect(
        updatedStats.circuitBreakerStatus["TestComponent.testOperation"]
      ).toEqual({
        isOpen: false,
        failures: 1,
        state: "closed",
      });
    });

    it("should open circuit breaker after threshold failures", async () => {
      const failingOperation = jest
        .fn()
        .mockRejectedValue(new Error("Persistent failure"));

      // Multiple failures should trigger circuit breaker (threshold is 5)
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
      expect(
        stats.circuitBreakerStatus["TestComponent.testOperation"]
      ).toBeDefined();

      const circuitBreaker =
        stats.circuitBreakerStatus["TestComponent.testOperation"];
      expect(circuitBreaker.isOpen).toBe(true);
      expect(circuitBreaker.failures).toBe(5);
      expect(circuitBreaker.state).toBe("open");
    });

    it("should track multiple circuit breakers independently", async () => {
      const failingOperation1 = jest
        .fn()
        .mockRejectedValue(new Error("Failure 1"));
      const failingOperation2 = jest
        .fn()
        .mockRejectedValue(new Error("Failure 2"));

      // Trigger failures for two different operations
      for (let i = 0; i < 3; i++) {
        try {
          await errorHandler.executeWithErrorHandling(
            failingOperation1,
            {
              component: "Component1",
              operation: "operation1",
              requestId: `test1-${i}`,
            },
            { fallbackValue: "fallback1" }
          );
        } catch (error) {
          // Expected to fail
        }
      }

      for (let i = 0; i < 6; i++) {
        try {
          await errorHandler.executeWithErrorHandling(
            failingOperation2,
            {
              component: "Component2",
              operation: "operation2",
              requestId: `test2-${i}`,
            },
            { fallbackValue: "fallback2" }
          );
        } catch (error) {
          // Expected to fail
        }
      }

      const stats = errorHandler.getErrorStats();
      expect(stats.circuitBreakerStatus).toBeDefined();
      expect(stats.circuitBreakerStatus["Component1.operation1"]).toBeDefined();
      expect(stats.circuitBreakerStatus["Component2.operation2"]).toBeDefined();

      // Component1 should still be closed (3 < 5 threshold)
      expect(stats.circuitBreakerStatus["Component1.operation1"].isOpen).toBe(
        false
      );
      expect(stats.circuitBreakerStatus["Component1.operation1"].state).toBe(
        "closed"
      );

      // Component2 should be open (6 >= 5 threshold)
      expect(stats.circuitBreakerStatus["Component2.operation2"].isOpen).toBe(
        true
      );
      expect(stats.circuitBreakerStatus["Component2.operation2"].state).toBe(
        "open"
      );
    });

    it("should reset circuit breaker after successful operation", async () => {
      const failingOperation = jest
        .fn()
        .mockRejectedValueOnce(new Error("Failure 1"))
        .mockRejectedValueOnce(new Error("Failure 2"))
        .mockRejectedValueOnce(new Error("Failure 3"))
        .mockRejectedValueOnce(new Error("Failure 4"))
        .mockResolvedValue("success");

      // Trigger 4 failures (below threshold)
      for (let i = 0; i < 4; i++) {
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

      // Check that circuit breaker is not open yet
      let stats = errorHandler.getErrorStats();
      expect(
        stats.circuitBreakerStatus["TestComponent.testOperation"].isOpen
      ).toBe(false);
      expect(
        stats.circuitBreakerStatus["TestComponent.testOperation"].failures
      ).toBe(4);

      // Now succeed - should reset the circuit breaker
      const result = await errorHandler.executeWithErrorHandling(
        failingOperation,
        {
          component: "TestComponent",
          operation: "testOperation",
          requestId: "success-test",
        }
      );

      expect(result).toBe("success");

      // Check that circuit breaker is reset
      stats = errorHandler.getErrorStats();
      expect(
        stats.circuitBreakerStatus["TestComponent.testOperation"].isOpen
      ).toBe(false);
      expect(
        stats.circuitBreakerStatus["TestComponent.testOperation"].failures
      ).toBe(0);
      expect(
        stats.circuitBreakerStatus["TestComponent.testOperation"].state
      ).toBe("closed");
    });

    it("should handle circuit breaker state transitions correctly", async () => {
      const failingOperation = jest
        .fn()
        .mockRejectedValue(new Error("Persistent failure"));

      // Trigger exactly threshold failures
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

      // Check that circuit breaker is open
      let stats = errorHandler.getErrorStats();
      expect(
        stats.circuitBreakerStatus["TestComponent.testOperation"].isOpen
      ).toBe(true);
      expect(
        stats.circuitBreakerStatus["TestComponent.testOperation"].state
      ).toBe("open");

      // Wait for timeout to transition to half-open (mock time)
      const circuitBreaker = errorHandler.getCircuitBreaker(
        "TestComponent.testOperation"
      );
      const originalDateNow = Date.now;
      Date.now = jest.fn(() => originalDateNow() + 31000); // 31 seconds > 30 second timeout

      // Check that circuit breaker is now half-open
      expect(circuitBreaker.isOpen()).toBe(false);

      // Restore original Date.now
      Date.now = originalDateNow;
    });

    it("should return proper circuit breaker status in error statistics", async () => {
      // Trigger some errors to create circuit breakers using executeWithErrorHandling
      try {
        await errorHandler.executeWithErrorHandling(
          () => Promise.reject(new Error("Error 1")),
          {
            component: "ComponentA",
            operation: "operationA",
            requestId: "req-1",
          },
          { fallbackValue: "fallback1" }
        );
      } catch (error) {
        // Expected to fail
      }

      try {
        await errorHandler.executeWithErrorHandling(
          () => Promise.reject(new Error("Error 2")),
          {
            component: "ComponentB",
            operation: "operationB",
            requestId: "req-2",
          },
          { fallbackValue: "fallback2" }
        );
      } catch (error) {
        // Expected to fail
      }

      const stats = errorHandler.getErrorStats();

      // Verify circuit breaker status structure
      expect(stats.circuitBreakerStatus).toBeDefined();
      expect(typeof stats.circuitBreakerStatus).toBe("object");

      // Verify each circuit breaker has required properties
      for (const [key, status] of Object.entries(stats.circuitBreakerStatus)) {
        expect(status).toHaveProperty("isOpen");
        expect(status).toHaveProperty("failures");
        expect(status).toHaveProperty("state");
        expect(typeof status.isOpen).toBe("boolean");
        expect(typeof status.failures).toBe("number");
        expect(typeof status.state).toBe("string");
        expect(["closed", "open", "half-open"]).toContain(status.state);
      }
    });

    it("should reset all circuit breakers when reset() is called", async () => {
      // Create some circuit breakers with failures
      const failingOperation = jest
        .fn()
        .mockRejectedValue(new Error("Failure"));

      for (let i = 0; i < 3; i++) {
        try {
          await errorHandler.executeWithErrorHandling(
            failingOperation,
            {
              component: "Component1",
              operation: "operation1",
              requestId: `test-${i}`,
            },
            { fallbackValue: "fallback" }
          );
        } catch (error) {
          // Expected to fail
        }
      }

      // Verify circuit breakers exist with failures
      let stats = errorHandler.getErrorStats();
      expect(stats.circuitBreakerStatus["Component1.operation1"].failures).toBe(
        3
      );

      // Reset everything
      errorHandler.reset();

      // Verify all circuit breakers are cleared
      stats = errorHandler.getErrorStats();
      expect(stats.circuitBreakerStatus).toEqual({});
      expect(stats.totalErrors).toBe(0);
      expect(stats.errorsByComponent).toEqual({});
    });
  });
});
