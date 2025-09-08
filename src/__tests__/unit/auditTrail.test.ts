/**
 * Audit Trail Unit Tests
 * Tests for audit logging and compliance tracking
 */

import {
  AuditTrail,
  AuditEventType,
  AuditAction,
  AuditEvent,
  AuditFilter,
} from "../../utils/auditTrail";

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

describe("AuditTrail", () => {
  let auditTrail: AuditTrail;

  beforeEach(() => {
    auditTrail = new AuditTrail(100); // Small limit for testing
  });

  describe("recordEvent", () => {
    it("should record a basic audit event", () => {
      auditTrail.recordEvent(
        AuditEventType.USER_INTERACTION,
        AuditAction.HOVER_REQUEST,
        "TestComponent",
        {
          userId: "test-user",
          requestId: "req-123",
          success: true,
        }
      );

      const events = auditTrail.getEvents();
      expect(events).toHaveLength(1);

      const event = events[0];
      expect(event.type).toBe(AuditEventType.USER_INTERACTION);
      expect(event.action).toBe(AuditAction.HOVER_REQUEST);
      expect(event.component).toBe("TestComponent");
      expect(event.userId).toBe("test-user");
      expect(event.requestId).toBe("req-123");
      expect(event.success).toBe(true);
      expect(event.id).toMatch(/^audit_\d+_[a-z0-9]+$/);
      expect(event.timestamp).toBeInstanceOf(Date);
    });

    it("should record error event with error details", () => {
      const testError = new Error("Test error");

      auditTrail.recordEvent(
        AuditEventType.ERROR_EVENT,
        AuditAction.REQUEST_FAILED,
        "TestComponent",
        {
          success: false,
          error: testError,
        }
      );

      const events = auditTrail.getEvents();
      const event = events[0];

      expect(event.success).toBe(false);
      expect(event.errorCode).toBe("Error");
      expect(event.errorMessage).toBe("Test error");
    });

    it("should include session ID in all events", () => {
      const sessionId = auditTrail.getSessionId();

      auditTrail.recordEvent(
        AuditEventType.SYSTEM_EVENT,
        AuditAction.SERVER_START,
        "TestComponent"
      );

      const events = auditTrail.getEvents();
      expect(events[0].sessionId).toBe(sessionId);
    });
  });

  describe("convenience methods", () => {
    it("should record user interaction", () => {
      auditTrail.recordUserInteraction(
        AuditAction.SEARCH_REQUEST,
        "SearchComponent",
        {
          userId: "test-user",
          resource: "requirements",
          duration: 150,
        }
      );

      const events = auditTrail.getEvents();
      const event = events[0];

      expect(event.type).toBe(AuditEventType.USER_INTERACTION);
      expect(event.action).toBe(AuditAction.SEARCH_REQUEST);
      expect(event.success).toBe(true);
      expect(event.duration).toBe(150);
    });

    it("should record data access", () => {
      auditTrail.recordDataAccess(
        AuditAction.CONTEXT_RETRIEVAL,
        "ContextManager",
        "business-context-123",
        {
          userId: "test-user",
          success: true,
          duration: 75,
        }
      );

      const events = auditTrail.getEvents();
      const event = events[0];

      expect(event.type).toBe(AuditEventType.DATA_ACCESS);
      expect(event.resource).toBe("business-context-123");
      expect(event.duration).toBe(75);
    });

    it("should record system event", () => {
      auditTrail.recordSystemEvent(AuditAction.SERVER_START, "MCPServer", {
        metadata: { port: 3000 },
        success: true,
      });

      const events = auditTrail.getEvents();
      const event = events[0];

      expect(event.type).toBe(AuditEventType.SYSTEM_EVENT);
      expect(event.metadata).toEqual({ port: 3000 });
    });

    it("should record error", () => {
      const testError = new Error("Connection failed");

      auditTrail.recordError(
        AuditAction.REQUEST_FAILED,
        "NetworkClient",
        testError,
        {
          userId: "test-user",
          resource: "api-endpoint",
        }
      );

      const events = auditTrail.getEvents();
      const event = events[0];

      expect(event.type).toBe(AuditEventType.ERROR_EVENT);
      expect(event.success).toBe(false);
      expect(event.errorCode).toBe("Error");
      expect(event.errorMessage).toBe("Connection failed");
    });
  });

  describe("getEvents with filtering", () => {
    beforeEach(() => {
      // Add test events
      auditTrail.recordUserInteraction(
        AuditAction.HOVER_REQUEST,
        "Component1",
        { userId: "user1" }
      );
      auditTrail.recordDataAccess(
        AuditAction.CONTEXT_RETRIEVAL,
        "Component2",
        "resource1",
        { userId: "user2" }
      );
      auditTrail.recordError(
        AuditAction.REQUEST_FAILED,
        "Component1",
        new Error("Test"),
        { userId: "user1" }
      );
      auditTrail.recordSystemEvent(AuditAction.SERVER_START, "Component3");
    });

    it("should return all events without filter", () => {
      const events = auditTrail.getEvents();
      expect(events).toHaveLength(4);
    });

    it("should filter by event type", () => {
      const filter: AuditFilter = { type: AuditEventType.USER_INTERACTION };
      const events = auditTrail.getEvents(filter);

      expect(events).toHaveLength(1);
      expect(events[0].type).toBe(AuditEventType.USER_INTERACTION);
    });

    it("should filter by action", () => {
      const filter: AuditFilter = { action: AuditAction.HOVER_REQUEST };
      const events = auditTrail.getEvents(filter);

      expect(events).toHaveLength(1);
      expect(events[0].action).toBe(AuditAction.HOVER_REQUEST);
    });

    it("should filter by component", () => {
      const filter: AuditFilter = { component: "Component1" };
      const events = auditTrail.getEvents(filter);

      expect(events).toHaveLength(2);
      events.forEach((event) => {
        expect(event.component).toBe("Component1");
      });
    });

    it("should filter by user ID", () => {
      const filter: AuditFilter = { userId: "user1" };
      const events = auditTrail.getEvents(filter);

      expect(events).toHaveLength(2);
      events.forEach((event) => {
        expect(event.userId).toBe("user1");
      });
    });

    it("should filter by success status", () => {
      const filter: AuditFilter = { success: false };
      const events = auditTrail.getEvents(filter);

      expect(events).toHaveLength(1);
      expect(events[0].success).toBe(false);
    });

    it("should filter by date range", () => {
      const now = new Date();
      const oneHourAgo = new Date(now.getTime() - 3600000);
      const oneHourFromNow = new Date(now.getTime() + 3600000);

      const filter: AuditFilter = {
        startDate: oneHourAgo,
        endDate: oneHourFromNow,
      };

      const events = auditTrail.getEvents(filter);
      expect(events).toHaveLength(4); // All events should be within range
    });

    it("should combine multiple filters", () => {
      const filter: AuditFilter = {
        type: AuditEventType.USER_INTERACTION,
        component: "Component1",
        success: true,
      };

      const events = auditTrail.getEvents(filter);
      expect(events).toHaveLength(1);

      const event = events[0];
      expect(event.type).toBe(AuditEventType.USER_INTERACTION);
      expect(event.component).toBe("Component1");
      expect(event.success).toBe(true);
    });

    it("should return events in reverse chronological order", () => {
      const events = auditTrail.getEvents();

      for (let i = 1; i < events.length; i++) {
        expect(events[i - 1].timestamp.getTime()).toBeGreaterThanOrEqual(
          events[i].timestamp.getTime()
        );
      }
    });
  });

  describe("getStats", () => {
    beforeEach(() => {
      // Add test events with known characteristics
      auditTrail.recordUserInteraction(
        AuditAction.HOVER_REQUEST,
        "Component1",
        { duration: 100 }
      );
      auditTrail.recordUserInteraction(
        AuditAction.HOVER_REQUEST,
        "Component1",
        { duration: 200 }
      );
      auditTrail.recordDataAccess(
        AuditAction.CONTEXT_RETRIEVAL,
        "Component2",
        "resource1",
        { duration: 150 }
      );
      auditTrail.recordError(
        AuditAction.REQUEST_FAILED,
        "Component1",
        new Error("NetworkError")
      );
      auditTrail.recordError(
        AuditAction.REQUEST_FAILED,
        "Component2",
        new Error("TimeoutError")
      );
    });

    it("should calculate basic statistics", () => {
      const stats = auditTrail.getStats();

      expect(stats.totalEvents).toBe(5);
      expect(stats.successRate).toBe(60); // 3 successful out of 5
      expect(stats.errorRate).toBe(40); // 2 failed out of 5
      expect(stats.averageDuration).toBe(150); // (100 + 200 + 150) / 3
    });

    it("should identify top actions", () => {
      const stats = auditTrail.getStats();

      expect(stats.topActions).toHaveLength(3);
      expect(stats.topActions[0]).toEqual({
        action: AuditAction.HOVER_REQUEST,
        count: 2,
      });
      expect(stats.topActions[1]).toEqual({
        action: AuditAction.REQUEST_FAILED,
        count: 2,
      });
    });

    it("should identify top errors", () => {
      const stats = auditTrail.getStats();

      expect(stats.topErrors).toHaveLength(1);
      expect(stats.topErrors).toContainEqual({
        error: "Error",
        count: 2,
      });
    });

    it("should handle empty event list", () => {
      const emptyAuditTrail = new AuditTrail();
      const stats = emptyAuditTrail.getStats();

      expect(stats.totalEvents).toBe(0);
      expect(stats.successRate).toBe(0);
      expect(stats.errorRate).toBe(0);
      expect(stats.averageDuration).toBe(0);
      expect(stats.topActions).toHaveLength(0);
      expect(stats.topErrors).toHaveLength(0);
    });

    it("should apply filters to statistics", () => {
      const filter: AuditFilter = { success: true };
      const stats = auditTrail.getStats(filter);

      expect(stats.totalEvents).toBe(3);
      expect(stats.successRate).toBe(100);
      expect(stats.errorRate).toBe(0);
    });
  });

  describe("cleanup", () => {
    it("should remove old events when limit is exceeded", () => {
      const smallAuditTrail = new AuditTrail(3);

      // Add more events than the limit
      for (let i = 0; i < 5; i++) {
        smallAuditTrail.recordUserInteraction(
          AuditAction.HOVER_REQUEST,
          "Component1",
          { metadata: { index: i } }
        );
      }

      const events = smallAuditTrail.getEvents();
      expect(events).toHaveLength(3);

      // Should keep the most recent events (events are returned in reverse chronological order)
      // The last 3 events added were indices 2, 3, 4
      const indices = events
        .map((e) => e.metadata?.index)
        .sort((a, b) => b - a);
      expect(indices).toEqual([4, 3, 2]);
    });
  });

  describe("exportEvents", () => {
    beforeEach(() => {
      auditTrail.recordUserInteraction(AuditAction.HOVER_REQUEST, "Component1");
      auditTrail.recordDataAccess(
        AuditAction.CONTEXT_RETRIEVAL,
        "Component2",
        "resource1"
      );
    });

    it("should export all events as JSON", () => {
      const exported = auditTrail.exportEvents();
      const parsed = JSON.parse(exported);

      expect(Array.isArray(parsed)).toBe(true);
      expect(parsed).toHaveLength(2);
      expect(parsed[0]).toHaveProperty("id");
      expect(parsed[0]).toHaveProperty("timestamp");
      expect(parsed[0]).toHaveProperty("type");
    });

    it("should export filtered events", () => {
      const filter: AuditFilter = { type: AuditEventType.USER_INTERACTION };
      const exported = auditTrail.exportEvents(filter);
      const parsed = JSON.parse(exported);

      expect(parsed).toHaveLength(1);
      expect(parsed[0].type).toBe(AuditEventType.USER_INTERACTION);
    });
  });

  describe("getSessionId", () => {
    it("should return consistent session ID", () => {
      const sessionId1 = auditTrail.getSessionId();
      const sessionId2 = auditTrail.getSessionId();

      expect(sessionId1).toBe(sessionId2);
      expect(sessionId1).toMatch(/^session_\d+_[a-z0-9]+$/);
    });

    it("should generate different session IDs for different instances", () => {
      const auditTrail2 = new AuditTrail();

      expect(auditTrail.getSessionId()).not.toBe(auditTrail2.getSessionId());
    });
  });
});
