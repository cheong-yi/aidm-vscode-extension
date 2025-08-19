/**
 * Audit Logging Tests
 * Comprehensive tests for audit logging functionality
 */

import {
  AuditLogger,
  AuditSeverity,
  AuditCategory,
  AuditOutcome,
} from "../../security/AuditLogger";

describe("AuditLogger", () => {
  let auditLogger: AuditLogger;
  let consoleSpy: jest.SpyInstance;

  beforeEach(() => {
    auditLogger = new AuditLogger({
      enabled: true,
      logLevel: AuditSeverity.LOW,
      enablePerformanceTracking: true,
    });

    // Spy on console methods to verify logging
    consoleSpy = jest.spyOn(console, "log").mockImplementation();
    jest.spyOn(console, "info").mockImplementation();
    jest.spyOn(console, "warn").mockImplementation();
    jest.spyOn(console, "error").mockImplementation();
  });

  afterEach(async () => {
    await auditLogger.shutdown();
    consoleSpy.mockRestore();
  });

  describe("Basic Logging", () => {
    it("should log events with all required fields", async () => {
      await auditLogger.logEvent({
        action: "test_action",
        category: AuditCategory.USER_INTERACTION,
        severity: AuditSeverity.LOW,
        outcome: AuditOutcome.SUCCESS,
        metadata: { testData: "value" },
      });

      // Flush buffer to trigger logging
      await auditLogger.flushBuffer();

      expect(consoleSpy).toHaveBeenCalled();
      const logCall = consoleSpy.mock.calls[0];
      expect(logCall[0]).toContain("AUDIT [LOW]:");

      const logData = JSON.parse(logCall[1]);
      expect(logData.action).toBe("test_action");
      expect(logData.category).toBe(AuditCategory.USER_INTERACTION);
      expect(logData.severity).toBe(AuditSeverity.LOW);
      expect(logData.outcome).toBe(AuditOutcome.SUCCESS);
      expect(logData.metadata.testData).toBe("value");
    });

    it("should add default values for missing fields", async () => {
      await auditLogger.logEvent({
        action: "minimal_action",
      });

      await auditLogger.flushBuffer();

      const logCall = consoleSpy.mock.calls[0];
      const logData = JSON.parse(logCall[1]);

      expect(logData.timestamp).toBeDefined();
      expect(logData.severity).toBe(AuditSeverity.LOW);
      expect(logData.category).toBe(AuditCategory.SYSTEM_EVENT);
      expect(logData.outcome).toBe(AuditOutcome.SUCCESS);
      expect(logData.sessionId).toBeDefined();
    });
  });

  describe("Severity Filtering", () => {
    it("should filter events based on log level", async () => {
      const highLevelLogger = new AuditLogger({
        enabled: true,
        logLevel: AuditSeverity.HIGH,
      });

      await highLevelLogger.logEvent({
        action: "low_severity_action",
        severity: AuditSeverity.LOW,
      });

      await highLevelLogger.logEvent({
        action: "high_severity_action",
        severity: AuditSeverity.HIGH,
      });

      await highLevelLogger.flushBuffer();

      // Only high severity event should be logged
      expect(consoleSpy).toHaveBeenCalledTimes(1);
      const logCall = consoleSpy.mock.calls[0];
      expect(logCall[1]).toContain("high_severity_action");

      await highLevelLogger.shutdown();
    });
  });

  describe("Data Sanitization", () => {
    it("should sanitize sensitive fields in metadata", async () => {
      await auditLogger.logEvent({
        action: "sensitive_data_test",
        metadata: {
          username: "testuser",
          password: "secret123",
          token: "abc123def456",
          normalField: "normalValue",
        },
      });

      await auditLogger.flushBuffer();

      const logCall = consoleSpy.mock.calls[0];
      const logData = JSON.parse(logCall[1]);

      expect(logData.metadata.username).toBe("testuser");
      expect(logData.metadata.password).toBe("[REDACTED]");
      expect(logData.metadata.token).toBe("[REDACTED]");
      expect(logData.metadata.normalField).toBe("normalValue");
    });

    it("should sanitize sensitive information in error messages", async () => {
      await auditLogger.logError(
        "authentication_failed",
        new Error(
          "Login failed for user with password=secret123 and token=abc123"
        ),
        { userId: "user123" }
      );

      await auditLogger.flushBuffer();

      const logCall = consoleSpy.mock.calls[0];
      const logData = JSON.parse(logCall[1]);

      expect(logData.error).not.toContain("secret123");
      expect(logData.error).not.toContain("abc123");
      expect(logData.error).toContain("[REDACTED]");
    });

    it("should sanitize stack traces", async () => {
      const error = new Error("Test error");
      error.stack =
        "Error: Test error\n    at /home/user/sensitive/path/file.js:10:5";

      await auditLogger.logError("stack_trace_test", error);

      await auditLogger.flushBuffer();

      const logCall = consoleSpy.mock.calls[0];
      const logData = JSON.parse(logCall[1]);

      expect(logData.metadata.errorStack).not.toContain(
        "/home/user/sensitive/path/"
      );
      expect(logData.metadata.errorStack).toContain(".../");
    });
  });

  describe("Specialized Logging Methods", () => {
    it("should log user interactions", async () => {
      await auditLogger.logUserInteraction(
        "button_clicked",
        { buttonId: "submit", page: "login" },
        AuditOutcome.SUCCESS
      );

      await auditLogger.flushBuffer();

      const logCall = consoleSpy.mock.calls[0];
      const logData = JSON.parse(logCall[1]);

      expect(logData.action).toBe("button_clicked");
      expect(logData.category).toBe(AuditCategory.USER_INTERACTION);
      expect(logData.severity).toBe(AuditSeverity.LOW);
      expect(logData.outcome).toBe(AuditOutcome.SUCCESS);
    });

    it("should log data access events", async () => {
      await auditLogger.logDataAccess(
        "file_accessed",
        "document123",
        { filePath: "/path/to/file.txt" },
        AuditOutcome.SUCCESS
      );

      await auditLogger.flushBuffer();

      const logCall = consoleSpy.mock.calls[0];
      const logData = JSON.parse(logCall[1]);

      expect(logData.action).toBe("file_accessed");
      expect(logData.category).toBe(AuditCategory.DATA_ACCESS);
      expect(logData.severity).toBe(AuditSeverity.MEDIUM);
      expect(logData.metadata.resourceId).toBe("document123");
    });

    it("should log security events", async () => {
      await auditLogger.logSecurityEvent(
        "unauthorized_access_attempt",
        { ipAddress: "192.168.1.100", userAgent: "TestAgent" },
        AuditSeverity.HIGH
      );

      await auditLogger.flushBuffer();

      const logCall = consoleSpy.mock.calls[0];
      const logData = JSON.parse(logCall[1]);

      expect(logData.action).toBe("unauthorized_access_attempt");
      expect(logData.category).toBe(AuditCategory.SECURITY_EVENT);
      expect(logData.severity).toBe(AuditSeverity.HIGH);
    });

    it("should log performance events", async () => {
      await auditLogger.logPerformanceEvent("database_query", 1500, {
        query: "SELECT * FROM users",
        resultCount: 100,
      });

      await auditLogger.flushBuffer();

      const logCall = consoleSpy.mock.calls[0];
      const logData = JSON.parse(logCall[1]);

      expect(logData.action).toBe("database_query");
      expect(logData.category).toBe(AuditCategory.PERFORMANCE_EVENT);
      expect(logData.duration).toBe(1500);
      expect(logData.severity).toBe(AuditSeverity.MEDIUM); // 1500ms > 1000ms
    });
  });

  describe("Performance Tracking", () => {
    it("should create and use performance tracker", async () => {
      const tracker = auditLogger.createPerformanceTracker("test_operation", {
        operationType: "database",
      });

      // Simulate some work
      await new Promise((resolve) => setTimeout(resolve, 100));

      await tracker.finish(AuditOutcome.SUCCESS);
      await auditLogger.flushBuffer();

      const logCall = consoleSpy.mock.calls[0];
      const logData = JSON.parse(logCall[1]);

      expect(logData.action).toBe("test_operation");
      expect(logData.category).toBe(AuditCategory.PERFORMANCE_EVENT);
      expect(logData.duration).toBeGreaterThan(90);
      expect(logData.metadata.operationType).toBe("database");
      expect(logData.metadata.outcome).toBe(AuditOutcome.SUCCESS);
    });
  });

  describe("Buffer Management", () => {
    it("should flush buffer automatically when full", async () => {
      // Create logger with small buffer for testing
      const smallBufferLogger = new AuditLogger({
        enabled: true,
        logLevel: AuditSeverity.LOW,
      });

      // Fill buffer beyond capacity (assuming maxBufferSize is 1000)
      for (let i = 0; i < 1001; i++) {
        await smallBufferLogger.logEvent({
          action: `test_action_${i}`,
        });
      }

      // Buffer should have been flushed automatically
      expect(consoleSpy).toHaveBeenCalled();

      await smallBufferLogger.shutdown();
    });

    it("should flush immediately for critical events", async () => {
      await auditLogger.logEvent({
        action: "critical_event",
        severity: AuditSeverity.CRITICAL,
      });

      // Should flush immediately without waiting
      expect(consoleSpy).toHaveBeenCalled();
    });
  });

  describe("Configuration", () => {
    it("should respect enabled/disabled configuration", async () => {
      const disabledLogger = new AuditLogger({
        enabled: false,
      });

      await disabledLogger.logEvent({
        action: "disabled_test",
      });

      await disabledLogger.flushBuffer();

      expect(consoleSpy).not.toHaveBeenCalled();

      await disabledLogger.shutdown();
    });

    it("should update configuration dynamically", async () => {
      auditLogger.updateConfiguration({
        logLevel: AuditSeverity.HIGH,
      });

      await auditLogger.logEvent({
        action: "low_severity_after_update",
        severity: AuditSeverity.LOW,
      });

      await auditLogger.flushBuffer();

      // Should not log due to updated severity filter
      expect(consoleSpy).not.toHaveBeenCalled();
    });
  });

  describe("Error Handling", () => {
    it("should handle logging failures gracefully", async () => {
      // Mock console.log to throw an error
      consoleSpy.mockImplementation(() => {
        throw new Error("Logging failed");
      });

      // Should not throw error even if logging fails
      await expect(
        auditLogger.logEvent({
          action: "test_with_logging_failure",
        })
      ).resolves.not.toThrow();
    });
  });

  describe("Statistics", () => {
    it("should provide audit statistics", () => {
      const stats = auditLogger.getAuditStats();

      expect(stats).toHaveProperty("bufferSize");
      expect(stats).toHaveProperty("totalEventsLogged");
      expect(stats).toHaveProperty("configEnabled");
      expect(stats).toHaveProperty("logLevel");

      expect(stats.configEnabled).toBe(true);
      expect(stats.logLevel).toBe(AuditSeverity.LOW);
    });
  });
});
