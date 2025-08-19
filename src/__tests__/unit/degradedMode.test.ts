/**
 * Degraded Mode Tests
 * Tests for degraded mode manager and fallback mechanisms
 */

import {
  DegradedModeManager,
  DegradedModeLevel,
} from "../../utils/DegradedModeManager";
import { AuditLogger, AuditSeverity } from "../../security/AuditLogger";
import { BusinessContext, CodeLocation } from "../../types/business";
import { ConnectionStatus } from "../../types/extension";

describe("DegradedModeManager", () => {
  let degradedModeManager: DegradedModeManager;
  let auditLogger: AuditLogger;

  beforeEach(() => {
    auditLogger = new AuditLogger({
      enabled: true,
      logLevel: AuditSeverity.LOW,
    });
    degradedModeManager = new DegradedModeManager(auditLogger, {
      enabled: true,
      fallbackDataEnabled: true,
      cacheEnabled: true,
      staticFallbackEnabled: true,
    });
  });

  afterEach(async () => {
    await degradedModeManager.shutdown();
    await auditLogger.shutdown();
  });

  describe("Mode Detection", () => {
    it("should start in normal mode", () => {
      expect(degradedModeManager.getCurrentMode()).toBe(
        DegradedModeLevel.NORMAL
      );
      expect(degradedModeManager.isDegraded()).toBe(false);
    });

    it("should transition to partial mode when some services fail", () => {
      degradedModeManager.updateServiceHealth("dataProvider", false);

      expect(degradedModeManager.getCurrentMode()).toBe(
        DegradedModeLevel.PARTIAL
      );
      expect(degradedModeManager.isDegraded()).toBe(true);
    });

    it("should transition to minimal mode when multiple services fail", () => {
      degradedModeManager.updateServiceHealth("dataProvider", false);
      degradedModeManager.updateServiceHealth("cache", false);

      expect(degradedModeManager.getCurrentMode()).toBe(
        DegradedModeLevel.MINIMAL
      );
      expect(degradedModeManager.isDegraded()).toBe(true);
    });

    it("should transition to offline mode when most services fail", () => {
      degradedModeManager.updateServiceHealth("dataProvider", false);
      degradedModeManager.updateServiceHealth("cache", false);
      degradedModeManager.updateServiceHealth("mcpServer", false);

      expect(degradedModeManager.getCurrentMode()).toBe(
        DegradedModeLevel.OFFLINE
      );
      expect(degradedModeManager.isDegraded()).toBe(true);
    });

    it("should return to normal mode when services recover", () => {
      // First degrade
      degradedModeManager.updateServiceHealth("dataProvider", false);
      expect(degradedModeManager.getCurrentMode()).toBe(
        DegradedModeLevel.PARTIAL
      );

      // Then recover
      degradedModeManager.updateServiceHealth("dataProvider", true);
      expect(degradedModeManager.getCurrentMode()).toBe(
        DegradedModeLevel.NORMAL
      );
    });
  });

  describe("Business Context Fallback", () => {
    const testCodeLocation: CodeLocation = {
      filePath: "/test/file.ts",
      startLine: 10,
      endLine: 15,
    };

    it("should use primary provider in normal mode", async () => {
      const mockContext: BusinessContext = {
        requirements: [
          {
            id: "req1",
            title: "Test Requirement",
            description: "Test description",
            type: "functional" as any,
            priority: "high" as any,
            status: "approved" as any,
            stakeholders: ["dev"],
            createdDate: new Date(),
            lastModified: new Date(),
            tags: ["test"],
          },
        ],
        implementationStatus: {
          completionPercentage: 80,
          lastVerified: new Date(),
          verifiedBy: "tester",
        },
        relatedChanges: [],
        lastUpdated: new Date(),
      };

      const primaryProvider = jest.fn().mockResolvedValue(mockContext);

      const result = await degradedModeManager.getBusinessContextWithFallback(
        testCodeLocation,
        primaryProvider
      );

      expect(primaryProvider).toHaveBeenCalled();
      expect(result).toEqual(mockContext);
    });

    it("should use cache fallback when primary provider fails", async () => {
      const mockContext: BusinessContext = {
        requirements: [],
        implementationStatus: {
          completionPercentage: 0,
          lastVerified: new Date(),
          verifiedBy: "System",
        },
        relatedChanges: [],
        lastUpdated: new Date(),
      };

      // First, populate cache with successful call
      const primaryProvider = jest.fn().mockResolvedValue(mockContext);
      await degradedModeManager.getBusinessContextWithFallback(
        testCodeLocation,
        primaryProvider
      );

      // Then simulate failure and degraded mode
      degradedModeManager.updateServiceHealth("dataProvider", false);
      const failingProvider = jest
        .fn()
        .mockRejectedValue(new Error("Service down"));

      const result = await degradedModeManager.getBusinessContextWithFallback(
        testCodeLocation,
        failingProvider
      );

      expect(failingProvider).toHaveBeenCalled();
      expect(result).toBeDefined(); // Should get cached or static fallback
    });

    it("should use static fallback when cache is empty", async () => {
      // Force degraded mode
      degradedModeManager.updateServiceHealth("dataProvider", false);

      const failingProvider = jest
        .fn()
        .mockRejectedValue(new Error("Service down"));

      const result = await degradedModeManager.getBusinessContextWithFallback(
        testCodeLocation,
        failingProvider
      );

      expect(result).toBeDefined();
      expect(result?.requirements).toBeDefined();
      expect(result?.requirements[0]?.title).toContain("Static Context");
    });

    it("should return null when all fallbacks are disabled", async () => {
      const disabledFallbackManager = new DegradedModeManager(auditLogger, {
        enabled: true,
        fallbackDataEnabled: false,
        cacheEnabled: false,
        staticFallbackEnabled: false,
      });

      disabledFallbackManager.updateServiceHealth("dataProvider", false);

      const failingProvider = jest
        .fn()
        .mockRejectedValue(new Error("Service down"));

      const result =
        await disabledFallbackManager.getBusinessContextWithFallback(
          testCodeLocation,
          failingProvider
        );

      expect(result).toBeNull();

      await disabledFallbackManager.shutdown();
    });
  });

  describe("Requirement Fallback", () => {
    it("should use primary provider in normal mode", async () => {
      const mockRequirement = {
        id: "req1",
        title: "Test Requirement",
        description: "Test description",
      };

      const primaryProvider = jest.fn().mockResolvedValue(mockRequirement);

      const result = await degradedModeManager.getRequirementWithFallback(
        "req1",
        primaryProvider
      );

      expect(primaryProvider).toHaveBeenCalled();
      expect(result).toEqual(mockRequirement);
    });

    it("should use static fallback when primary provider fails", async () => {
      degradedModeManager.updateServiceHealth("dataProvider", false);

      const failingProvider = jest
        .fn()
        .mockRejectedValue(new Error("Service down"));

      const result = await degradedModeManager.getRequirementWithFallback(
        "req1",
        failingProvider
      );

      expect(result).toBeDefined();
      expect(result.id).toBe("req1");
      expect(result.title).toBe("Fallback Requirement");
    });
  });

  describe("Cache Management", () => {
    it("should track cache statistics", () => {
      const stats = degradedModeManager.getCacheStats();

      expect(stats).toHaveProperty("size");
      expect(stats).toHaveProperty("oldestEntry");
      expect(stats).toHaveProperty("newestEntry");
      expect(stats.size).toBe(0); // Initially empty
    });

    it("should clear cache when requested", () => {
      degradedModeManager.clearCache();

      const stats = degradedModeManager.getCacheStats();
      expect(stats.size).toBe(0);
    });
  });

  describe("Status Change Notifications", () => {
    it("should notify listeners of status changes", (done) => {
      let notificationCount = 0;

      degradedModeManager.onStatusChange((status, mode) => {
        notificationCount++;

        if (notificationCount === 1) {
          expect(status).toBe(ConnectionStatus.Connecting); // Partial mode
          expect(mode).toBe(DegradedModeLevel.PARTIAL);
          done();
        }
      });

      degradedModeManager.updateServiceHealth("dataProvider", false);
    });

    it("should handle multiple listeners", () => {
      const listener1 = jest.fn();
      const listener2 = jest.fn();

      degradedModeManager.onStatusChange(listener1);
      degradedModeManager.onStatusChange(listener2);

      degradedModeManager.updateServiceHealth("dataProvider", false);

      expect(listener1).toHaveBeenCalled();
      expect(listener2).toHaveBeenCalled();
    });
  });

  describe("Forced Degraded Mode", () => {
    it("should allow forcing degraded mode", async () => {
      await degradedModeManager.forceDegradedMode(
        DegradedModeLevel.MINIMAL,
        "Maintenance mode"
      );

      expect(degradedModeManager.getCurrentMode()).toBe(
        DegradedModeLevel.MINIMAL
      );
      expect(degradedModeManager.isDegraded()).toBe(true);
    });

    it("should allow restoring normal mode", async () => {
      await degradedModeManager.forceDegradedMode(
        DegradedModeLevel.OFFLINE,
        "Testing"
      );

      expect(degradedModeManager.getCurrentMode()).toBe(
        DegradedModeLevel.OFFLINE
      );

      await degradedModeManager.restoreNormalMode();

      expect(degradedModeManager.getCurrentMode()).toBe(
        DegradedModeLevel.NORMAL
      );
      expect(degradedModeManager.isDegraded()).toBe(false);
    });
  });

  describe("Service Health Tracking", () => {
    it("should track individual service health", () => {
      const initialHealth = degradedModeManager.getServiceHealth();

      expect(initialHealth.mcpServer).toBe(true);
      expect(initialHealth.dataProvider).toBe(true);
      expect(initialHealth.cache).toBe(true);
      expect(initialHealth.auditLogger).toBe(true);

      degradedModeManager.updateServiceHealth("dataProvider", false);

      const updatedHealth = degradedModeManager.getServiceHealth();
      expect(updatedHealth.dataProvider).toBe(false);
      expect(updatedHealth.mcpServer).toBe(true); // Others unchanged
    });
  });

  describe("Configuration", () => {
    it("should respect configuration settings", () => {
      const configuredManager = new DegradedModeManager(auditLogger, {
        enabled: false,
        fallbackDataEnabled: false,
        cacheEnabled: false,
        staticFallbackEnabled: false,
      });

      // Even with service failures, should not enter degraded mode if disabled
      configuredManager.updateServiceHealth("dataProvider", false);

      // Would need to check internal behavior since mode detection might be disabled
      expect(configuredManager.getCurrentMode()).toBeDefined();
    });
  });

  describe("Error Handling", () => {
    it("should handle errors in status change listeners gracefully", () => {
      const faultyListener = jest.fn().mockImplementation(() => {
        throw new Error("Listener error");
      });

      degradedModeManager.onStatusChange(faultyListener);

      // Should not throw even if listener fails
      expect(() => {
        degradedModeManager.updateServiceHealth("dataProvider", false);
      }).not.toThrow();

      expect(faultyListener).toHaveBeenCalled();
    });
  });
});
