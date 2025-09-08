/**
 * End-to-End Integration Tests for Process Manager
 * Tests the complete extension-server integration including process lifecycle
 */

import {
  ProcessManager,
  ProcessManagerConfig,
} from "../../server/ProcessManager";
import { MCPClient } from "../../client/mcpClient";
import { ConnectionStatus } from "../../types/extension";

describe("ProcessManager Integration Tests", () => {
  let processManager: ProcessManager;
  let mcpClient: MCPClient;
  let config: ProcessManagerConfig;
  let testPort: number;

  beforeEach(() => {
    // Use a different port for each test to avoid conflicts
    testPort = 3001 + Math.floor(Math.random() * 1000);

    config = {
      port: testPort,
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
    mcpClient = new MCPClient(config.port, config.timeout);
  });

  afterEach(async () => {
    if (processManager) {
      await processManager.shutdown();
    }
  });

  describe("Server Lifecycle Management", () => {
    test("should start and stop server successfully", async () => {
      // Start server
      await processManager.start();
      const runningStats = processManager.getStats();
      expect(runningStats.isRunning).toBe(true);

      const stats = processManager.getStats();
      expect(stats.isRunning).toBe(true);
      expect(stats.uptime).toBeGreaterThan(0);

      // Stop server
      await processManager.stop();
      const finalStats = processManager.getStats();
      expect(finalStats.isRunning).toBe(false);
    }, 15000);

    test("should handle server restart", async () => {
      await processManager.start();

      // Wait a bit to accumulate some uptime
      await new Promise((resolve) => setTimeout(resolve, 100));
      const initialStats = processManager.getStats();

      await processManager.restart();
      const restartStats = processManager.getStats();

      expect(restartStats.isRunning).toBe(true);
      // After restart, uptime should be less than before (or at least different)
      expect(restartStats.uptime).toBeLessThanOrEqual(initialStats.uptime);
    }, 20000);

    test("should handle configuration updates", async () => {
      await processManager.start();

      const newConfig: Partial<ProcessManagerConfig> = {
        maxConcurrentRequests: 15,
        mock: {
          enabled: true,
          dataSize: "medium",
          enterprisePatterns: false,
        },
      };

      await processManager.updateConfig(newConfig);
      const runningStats = processManager.getStats();
      expect(runningStats.isRunning).toBe(true);
    }, 15000);
  });

  describe("Error Recovery", () => {
    test("should handle startup failures gracefully", async () => {
      // Create a process manager with invalid configuration
      const invalidConfig = { ...config, port: -1 };
      const invalidProcessManager = new ProcessManager(invalidConfig);

      await expect(invalidProcessManager.start()).rejects.toThrow();

      const stats = invalidProcessManager.getStats();
      expect(stats.isRunning).toBe(false);
      expect(stats.lastError).toBeDefined();
    }, 10000);

    test("should attempt restart on failure", async () => {
      let statusChanges: ConnectionStatus[] = [];

      processManager.onStatusChange((status) => {
        statusChanges.push(status);
      });

      await processManager.start();

      // Simulate server failure by stopping it externally
      await processManager.stop();

      // Wait for restart attempt
      await new Promise((resolve) => setTimeout(resolve, 2000));

      expect(statusChanges).toContain(ConnectionStatus.Connecting);
      expect(statusChanges).toContain(ConnectionStatus.Connected);
      expect(statusChanges).toContain(ConnectionStatus.Disconnected);
    }, 15000);
  });

  describe("Client-Server Communication", () => {
    test("should establish communication between client and server", async () => {
      await processManager.start();

      // Test basic connectivity
      const isConnected = await mcpClient.ping();
      expect(isConnected).toBe(true);
    }, 10000);

    test("should handle tool calls through full stack", async () => {
      await processManager.start();

      // Test business context retrieval
      const context = await mcpClient.getBusinessContext("test.ts", 10);
      expect(context).toBeDefined();
    }, 10000);

    test("should handle concurrent requests", async () => {
      await processManager.start();

      // Make multiple concurrent requests
      const requests = Array.from({ length: 5 }, (_, i) =>
        mcpClient.getBusinessContext(`test${i}.ts`, 10)
      );

      const results = await Promise.all(requests);
      expect(results).toHaveLength(5);
      results.forEach((result) => expect(result).toBeDefined());
    }, 15000);
  });

  describe("Graceful Shutdown", () => {
    test("should perform graceful shutdown", async () => {
      await processManager.start();

      // Start some background activity
      const contextPromise = mcpClient.getBusinessContext("test.ts", 10);

      // Initiate shutdown
      const shutdownPromise = processManager.shutdown();

      // Wait for both to complete
      await Promise.all([contextPromise, shutdownPromise]);

      const stats = processManager.getStats();
      expect(stats.isRunning).toBe(false);
    }, 15000);

    test("should cleanup resources on shutdown", async () => {
      await processManager.start();

      const initialStats = processManager.getStats();
      expect(initialStats.isRunning).toBe(true);

      await processManager.shutdown();

      // Verify server is no longer accessible
      const isConnected = await mcpClient.ping();
      expect(isConnected).toBe(false);
    }, 10000);
  });

  describe("Status Monitoring", () => {
    test("should report accurate health status", async () => {
      expect(processManager.isHealthy()).toBe(false);

      await processManager.start();
      const runningStats = processManager.getStats();
      expect(runningStats.isRunning).toBe(true);

      await processManager.stop();
      expect(processManager.isHealthy()).toBe(false);
    }, 10000);

    test("should track process statistics", async () => {
      const initialStats = processManager.getStats();
      expect(initialStats.isRunning).toBe(false);
      expect(initialStats.uptime).toBe(0);

      await processManager.start();

      // Wait a bit for uptime to accumulate
      await new Promise((resolve) => setTimeout(resolve, 100));

      const runningStats = processManager.getStats();
      expect(runningStats.isRunning).toBe(true);
      expect(runningStats.uptime).toBeGreaterThan(0);
      expect(runningStats.memoryUsage).toBeDefined();
    }, 10000);

    test("should notify status change listeners", async () => {
      const statusChanges: ConnectionStatus[] = [];

      processManager.onStatusChange((status) => {
        statusChanges.push(status);
      });

      await processManager.start();
      await processManager.stop();

      expect(statusChanges).toContain(ConnectionStatus.Connecting);
      expect(statusChanges).toContain(ConnectionStatus.Connected);
      expect(statusChanges).toContain(ConnectionStatus.Disconnected);
    }, 10000);
  });

  describe("Configuration Management", () => {
    test("should handle port changes with restart", async () => {
      await processManager.start();

      // Verify initial connection
      const initialConnected = await mcpClient.ping();
      expect(initialConnected).toBe(true);

      const newPort = testPort + 100; // Use a different port
      await processManager.updateConfig({ port: newPort });

      // Wait for restart to complete
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Verify server is running on new port
      const newClient = new MCPClient(newPort, config.timeout);
      const isConnected = await newClient.ping();
      expect(isConnected).toBe(true);

      // Old port should not be accessible
      const oldConnected = await mcpClient.ping();
      expect(oldConnected).toBe(false);
    }, 20000);

    test("should handle mock data configuration changes", async () => {
      await processManager.start();

      const newMockConfig = {
        mock: {
          enabled: true,
          dataSize: "large" as const,
          enterprisePatterns: false,
        },
      };

      await processManager.updateConfig(newMockConfig);
      const runningStats = processManager.getStats();
      expect(runningStats.isRunning).toBe(true);

      // Verify the server still responds
      const context = await mcpClient.getBusinessContext("test.ts", 10);
      expect(context).toBeDefined();
    }, 15000);
  });

  describe("Resource Management", () => {
    test("should handle multiple start/stop cycles", async () => {
      for (let i = 0; i < 3; i++) {
        await processManager.start();
        const runningStats = processManager.getStats();
      expect(runningStats.isRunning).toBe(true);

        await processManager.stop();
        expect(processManager.isHealthy()).toBe(false);
      }
    }, 30000);

    test("should prevent multiple simultaneous starts", async () => {
      const startPromise1 = processManager.start();
      const startPromise2 = processManager.start();

      await startPromise1;
      await startPromise2; // Should not throw, just return

      const runningStats = processManager.getStats();
      expect(runningStats.isRunning).toBe(true);
    }, 10000);
  });
});
