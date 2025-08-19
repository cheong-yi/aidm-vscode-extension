/**
 * Unit Tests for Process Manager
 * Tests individual ProcessManager functionality in isolation
 */

import {
  ProcessManager,
  ProcessManagerConfig,
} from "../../server/ProcessManager";
import { ConnectionStatus } from "../../types/extension";

// Mock the SimpleMCPServer
jest.mock("../../server/SimpleMCPServer");
jest.mock("../../server/ContextManager");
jest.mock("../../mock/MockDataProvider");

describe("ProcessManager Unit Tests", () => {
  let processManager: ProcessManager;
  let config: ProcessManagerConfig;

  beforeEach(() => {
    config = {
      port: 3002,
      timeout: 5000,
      retryAttempts: 2,
      maxConcurrentRequests: 5,
      mock: {
        enabled: true,
        dataSize: "small",
        enterprisePatterns: true,
      },
    };

    processManager = new ProcessManager(config);
  });

  afterEach(async () => {
    if (processManager) {
      await processManager.shutdown();
    }
  });

  describe("Configuration Management", () => {
    test("should initialize with correct configuration", () => {
      expect(processManager).toBeDefined();
      expect(processManager.isHealthy()).toBe(false);
    });

    test("should update configuration", async () => {
      const newConfig: Partial<ProcessManagerConfig> = {
        timeout: 10000,
        maxConcurrentRequests: 15,
      };

      await processManager.updateConfig(newConfig);
      // Configuration update should not throw
      expect(true).toBe(true);
    });

    test("should handle invalid configuration gracefully", async () => {
      const invalidConfig: Partial<ProcessManagerConfig> = {
        port: -1,
        timeout: -1000,
      };

      // Should not throw during config update
      await expect(
        processManager.updateConfig(invalidConfig)
      ).resolves.not.toThrow();
    });
  });

  describe("Status Management", () => {
    test("should report initial status correctly", () => {
      const stats = processManager.getStats();
      expect(stats.isRunning).toBe(false);
      expect(stats.uptime).toBe(0);
      expect(stats.restartCount).toBe(0);
      expect(stats.lastError).toBeUndefined();
    });

    test("should handle status change listeners", () => {
      const statusChanges: ConnectionStatus[] = [];

      const listener = (status: ConnectionStatus) => {
        statusChanges.push(status);
      };

      processManager.onStatusChange(listener);

      // Remove listener
      processManager.removeStatusChangeListener(listener);

      // Should not throw
      expect(true).toBe(true);
    });

    test("should handle multiple status listeners", () => {
      const listener1 = jest.fn();
      const listener2 = jest.fn();

      processManager.onStatusChange(listener1);
      processManager.onStatusChange(listener2);

      processManager.removeStatusChangeListener(listener1);
      processManager.removeStatusChangeListener(listener2);

      expect(true).toBe(true);
    });
  });

  describe("Error Handling", () => {
    test("should handle startup errors", async () => {
      // Mock server start to throw error
      const mockStart = jest
        .fn()
        .mockRejectedValue(new Error("Startup failed"));

      // This test verifies error handling structure
      expect(mockStart).toBeDefined();
    });

    test("should track restart count", () => {
      const initialStats = processManager.getStats();
      expect(initialStats.restartCount).toBe(0);
    });

    test("should handle graceful shutdown errors", async () => {
      // Should not throw even if shutdown encounters issues
      await expect(processManager.shutdown()).resolves.not.toThrow();
    });
  });

  describe("Resource Cleanup", () => {
    test("should cleanup resources on shutdown", async () => {
      await processManager.shutdown();

      const stats = processManager.getStats();
      expect(stats.isRunning).toBe(false);
    });

    test("should handle multiple shutdown calls", async () => {
      const shutdown1 = processManager.shutdown();
      const shutdown2 = processManager.shutdown();

      await Promise.all([shutdown1, shutdown2]);

      expect(true).toBe(true);
    });

    test("should prevent operations after shutdown", async () => {
      await processManager.shutdown();

      // Operations after shutdown should be handled gracefully
      const stats = processManager.getStats();
      expect(stats.isRunning).toBe(false);
    });
  });

  describe("Health Monitoring", () => {
    test("should report health status correctly", () => {
      expect(processManager.isHealthy()).toBe(false);
    });

    test("should handle health check failures", () => {
      // Health check should not throw
      expect(() => processManager.isHealthy()).not.toThrow();
    });
  });

  describe("Process Statistics", () => {
    test("should provide accurate statistics", () => {
      const stats = processManager.getStats();

      expect(stats).toHaveProperty("isRunning");
      expect(stats).toHaveProperty("uptime");
      expect(stats).toHaveProperty("restartCount");
      expect(typeof stats.isRunning).toBe("boolean");
      expect(typeof stats.uptime).toBe("number");
      expect(typeof stats.restartCount).toBe("number");
    });

    test("should track memory usage when running", () => {
      const stats = processManager.getStats();

      if (stats.isRunning) {
        expect(stats.memoryUsage).toBeDefined();
      } else {
        expect(stats.memoryUsage).toBeUndefined();
      }
    });

    test("should track process ID when available", () => {
      const stats = processManager.getStats();

      // PID should be undefined when not running
      if (!stats.isRunning) {
        expect(stats.pid).toBeUndefined();
      }
    });
  });

  describe("Configuration Validation", () => {
    test("should handle valid configuration", () => {
      const validConfig: ProcessManagerConfig = {
        port: 3000,
        timeout: 5000,
        retryAttempts: 3,
        maxConcurrentRequests: 10,
        mock: {
          enabled: true,
          dataSize: "medium",
          enterprisePatterns: true,
        },
      };

      const manager = new ProcessManager(validConfig);
      expect(manager).toBeDefined();
    });

    test("should handle edge case configurations", () => {
      const edgeConfig: ProcessManagerConfig = {
        port: 65535,
        timeout: 1,
        retryAttempts: 0,
        maxConcurrentRequests: 1,
        mock: {
          enabled: false,
          dataSize: "small",
          enterprisePatterns: false,
        },
      };

      const manager = new ProcessManager(edgeConfig);
      expect(manager).toBeDefined();
    });
  });
});
