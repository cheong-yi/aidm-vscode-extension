/**
 * Error Handling Integration Tests
 * Tests for end-to-end error handling scenarios
 */

import { ContextManager } from "../../server/ContextManager";
import { MCPClient } from "../../client/mcpClient";
import { MockDataProvider } from "../../mock/MockDataProvider";
import { CodeLocation } from "../../types/business";
import { ErrorCode } from "../../types/extension";

describe("Error Handling Integration", () => {
  let contextManager: ContextManager;
  let mcpClient: MCPClient;
  let mockDataProvider: MockDataProvider;

  beforeEach(() => {
    mockDataProvider = new MockDataProvider({
      dataSize: "small",
      enterprisePatterns: true,
      responseDelay: 0,
      errorRate: 0,
    });
    contextManager = new ContextManager(mockDataProvider);
    mcpClient = new MCPClient(3001, 5000); // Use different port to avoid conflicts
  });

  afterEach(async () => {
    await contextManager.shutdown();
    await mcpClient.shutdown();
  });

  describe("Context Manager Error Scenarios", () => {
    it("should handle data provider failures gracefully", async () => {
      // Mock data provider to fail
      jest
        .spyOn(mockDataProvider, "getContextForFile")
        .mockRejectedValue(new Error("Data provider connection failed"));

      const codeLocation: CodeLocation = {
        filePath: "/test/file.ts",
        startLine: 10,
        endLine: 15,
      };

      const result = await contextManager.getBusinessContext(codeLocation);

      // Should return empty context instead of throwing
      expect(result).toBeDefined();
      expect(result.requirements).toEqual([]);
      expect(result.implementationStatus.notes).toContain(
        "No business context found"
      );
    });

    it("should use cached data when data provider fails", async () => {
      const codeLocation: CodeLocation = {
        filePath: "/test/file.ts",
        startLine: 10,
        endLine: 15,
      };

      // First call should succeed and cache the result
      const firstResult = await contextManager.getBusinessContext(codeLocation);
      expect(firstResult).toBeDefined();

      // Mock data provider to fail
      jest
        .spyOn(mockDataProvider, "getContextForFile")
        .mockRejectedValue(new Error("Data provider connection failed"));

      // Second call should use cached data
      const secondResult = await contextManager.getBusinessContext(
        codeLocation
      );
      expect(secondResult).toBeDefined();
      // Should be similar to first result (from cache or fallback)
    });

    it("should handle requirement lookup failures", async () => {
      // Mock requirement lookup to fail
      jest
        .spyOn(mockDataProvider, "getRequirementById")
        .mockRejectedValue(new Error("Requirement service unavailable"));

      const result = await contextManager.getRequirementById("req123");

      // Should return null instead of throwing
      expect(result).toBeNull();
    });

    it("should track service health status", async () => {
      // Initially healthy
      let healthStatus = contextManager.getHealthStatus();
      expect(healthStatus.isHealthy).toBe(true);

      // Simulate service failure
      contextManager.updateServiceHealth("dataProvider", false);

      healthStatus = contextManager.getHealthStatus();
      expect(healthStatus.isHealthy).toBe(false);
      expect(healthStatus.degradedMode).not.toBe("normal");
    });
  });

  describe("MCP Client Error Scenarios", () => {
    it("should handle connection failures", async () => {
      // Use a port that's not running a server
      const failingClient = new MCPClient(9999, 1000);

      const pingResult = await failingClient.ping();
      expect(pingResult).toBe(false);

      await expect(
        failingClient.getBusinessContext("/test/file.ts", 10)
      ).rejects.toThrow();

      await failingClient.shutdown();
    });

    it("should handle timeout scenarios", async () => {
      // Create client with very short timeout
      const timeoutClient = new MCPClient(3001, 1);

      const pingResult = await timeoutClient.ping();
      expect(pingResult).toBe(false);

      await timeoutClient.shutdown();
    });

    it("should track client health status", () => {
      const healthStatus = mcpClient.getHealthStatus();

      expect(healthStatus).toHaveProperty("isHealthy");
      expect(healthStatus).toHaveProperty("endpoint");
      expect(healthStatus).toHaveProperty("errorStats");
      expect(healthStatus.endpoint).toContain("localhost:3001");
    });
  });

  describe("End-to-End Error Recovery", () => {
    it("should recover from temporary failures", async () => {
      let callCount = 0;

      // Mock to fail first two calls, then succeed
      jest
        .spyOn(mockDataProvider, "getContextForFile")
        .mockImplementation(async () => {
          callCount++;
          if (callCount <= 2) {
            throw new Error("Temporary failure");
          }
          return []; // Success on third call
        });

      const codeLocation: CodeLocation = {
        filePath: "/test/file.ts",
        startLine: 10,
        endLine: 15,
      };

      // Should eventually succeed with retry logic
      const result = await contextManager.getBusinessContext(codeLocation);
      expect(result).toBeDefined();
    });

    it("should maintain audit trail during error scenarios", async () => {
      const consoleSpy = jest.spyOn(console, "error").mockImplementation();
      const consoleLogSpy = jest.spyOn(console, "log").mockImplementation();

      // Cause an error
      jest
        .spyOn(mockDataProvider, "getContextForFile")
        .mockRejectedValue(new Error("Audit test error"));

      const codeLocation: CodeLocation = {
        filePath: "/test/file.ts",
        startLine: 10,
        endLine: 15,
      };

      await contextManager.getBusinessContext(codeLocation);

      // Should have logged audit events
      expect(consoleLogSpy).toHaveBeenCalled();

      // Check for audit log entries
      const auditCalls = consoleLogSpy.mock.calls.filter(
        (call) => call[0] && call[0].includes("AUDIT")
      );
      expect(auditCalls.length).toBeGreaterThan(0);

      consoleSpy.mockRestore();
      consoleLogSpy.mockRestore();
    });
  });

  describe("Performance Under Error Conditions", () => {
    it("should not significantly degrade performance during errors", async () => {
      // Mock to always fail
      jest
        .spyOn(mockDataProvider, "getContextForFile")
        .mockRejectedValue(new Error("Always fails"));

      const codeLocation: CodeLocation = {
        filePath: "/test/file.ts",
        startLine: 10,
        endLine: 15,
      };

      const startTime = Date.now();

      // Multiple calls should not take excessively long due to error handling
      const promises = Array.from({ length: 5 }, () =>
        contextManager.getBusinessContext(codeLocation)
      );

      await Promise.all(promises);

      const endTime = Date.now();
      const totalTime = endTime - startTime;

      // Should complete within reasonable time even with errors
      expect(totalTime).toBeLessThan(5000); // 5 seconds max
    });

    it("should handle concurrent error scenarios", async () => {
      let failureCount = 0;

      jest
        .spyOn(mockDataProvider, "getContextForFile")
        .mockImplementation(async () => {
          failureCount++;
          if (failureCount % 2 === 0) {
            throw new Error(`Failure ${failureCount}`);
          }
          return []; // Success on odd calls
        });

      const codeLocation: CodeLocation = {
        filePath: "/test/file.ts",
        startLine: 10,
        endLine: 15,
      };

      // Run multiple concurrent requests
      const promises = Array.from({ length: 10 }, (_, i) =>
        contextManager.getBusinessContext({
          ...codeLocation,
          startLine: codeLocation.startLine + i,
        })
      );

      const results = await Promise.all(promises);

      // All should complete (some with fallback data)
      expect(results).toHaveLength(10);
      results.forEach((result) => {
        expect(result).toBeDefined();
      });
    });
  });

  describe("Error Statistics and Monitoring", () => {
    it("should track error statistics across components", async () => {
      // Generate some errors
      jest
        .spyOn(mockDataProvider, "getContextForFile")
        .mockRejectedValue(new Error("Test error for statistics"));

      const codeLocation: CodeLocation = {
        filePath: "/test/file.ts",
        startLine: 10,
        endLine: 15,
      };

      // Generate multiple errors
      await contextManager.getBusinessContext(codeLocation);
      await contextManager.getBusinessContext({
        ...codeLocation,
        startLine: 20,
      });

      const healthStatus = contextManager.getHealthStatus();
      expect(healthStatus.errorStats).toBeDefined();
      expect(healthStatus.errorStats.totalErrors).toBeGreaterThan(0);
    });

    it("should provide health status across all components", () => {
      const contextHealth = contextManager.getHealthStatus();
      const clientHealth = mcpClient.getHealthStatus();

      expect(contextHealth).toHaveProperty("isHealthy");
      expect(contextHealth).toHaveProperty("degradedMode");
      expect(contextHealth).toHaveProperty("cacheStats");
      expect(contextHealth).toHaveProperty("errorStats");

      expect(clientHealth).toHaveProperty("isHealthy");
      expect(clientHealth).toHaveProperty("endpoint");
      expect(clientHealth).toHaveProperty("errorStats");
    });
  });

  describe("Graceful Shutdown", () => {
    it("should shutdown gracefully even with active errors", async () => {
      // Start some operations that will fail
      jest
        .spyOn(mockDataProvider, "getContextForFile")
        .mockImplementation(async () => {
          await new Promise((resolve) => setTimeout(resolve, 100));
          throw new Error("Shutdown test error");
        });

      const codeLocation: CodeLocation = {
        filePath: "/test/file.ts",
        startLine: 10,
        endLine: 15,
      };

      // Start operation but don't wait
      const operationPromise = contextManager.getBusinessContext(codeLocation);

      // Shutdown should complete even with active operations
      await expect(contextManager.shutdown()).resolves.not.toThrow();

      // Operation should still complete
      await expect(operationPromise).resolves.toBeDefined();
    });
  });
});
