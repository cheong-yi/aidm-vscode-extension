/**
 * Degraded Mode Manager Unit Tests
 * Tests for system operation in degraded conditions
 */

import {
  DegradedModeManager,
  DegradedModeLevel,
  ServiceHealth,
} from "../../utils/degradedMode";
import { CodeLocation } from "../../types/business";

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

// Mock audit trail
jest.mock("../../utils/auditTrail", () => ({
  auditTrail: {
    recordSystemEvent: jest.fn(),
    recordError: jest.fn(),
  },
  AuditAction: {
    STATUS_CHECK: "status_check",
    CONFIG_UPDATE: "config_update",
  },
}));

describe("DegradedModeManager", () => {
  let degradedModeManager: DegradedModeManager;

  beforeEach(() => {
    jest.clearAllMocks();
    degradedModeManager = new DegradedModeManager({
      enableCaching: true,
      enableMockData: true,
      enableUserNotifications: false, // Disable for testing
    });
  });

  afterEach(() => {
    degradedModeManager.dispose();
  });

  describe("initialization", () => {
    it("should initialize with normal mode", () => {
      const state = degradedModeManager.getCurrentState();

      expect(state.level).toBe(DegradedModeLevel.NORMAL);
      expect(state.degradationReason).toBe("System operating normally");
      expect(state.activeServices).toEqual({
        mcpServer: true,
        dataProvider: true,
        cache: true,
        network: true,
      });
    });

    it("should create status bar item", () => {
      expect(require("vscode").window.createStatusBarItem).toHaveBeenCalled();
    });
  });

  describe("checkSystemHealth", () => {
    it("should maintain normal mode when all services are healthy", async () => {
      // Mock all health checks to return true
      jest
        .spyOn(degradedModeManager as any, "performHealthChecks")
        .mockResolvedValue({
          mcpServer: true,
          dataProvider: true,
          cache: true,
          network: true,
        });

      const state = await degradedModeManager.checkSystemHealth();

      expect(state.level).toBe(DegradedModeLevel.NORMAL);
      expect(state.activeServices.mcpServer).toBe(true);
      expect(state.activeServices.dataProvider).toBe(true);
      expect(state.activeServices.cache).toBe(true);
      expect(state.activeServices.network).toBe(true);
    });

    it("should transition to partial mode when some services fail", async () => {
      jest
        .spyOn(degradedModeManager as any, "performHealthChecks")
        .mockResolvedValue({
          mcpServer: true,
          dataProvider: true,
          cache: false, // One service down
          network: true,
        });

      const state = await degradedModeManager.checkSystemHealth();

      expect(state.level).toBe(DegradedModeLevel.PARTIAL);
      expect(state.degradationReason).toContain("cache");
    });

    it("should transition to minimal mode when many services fail", async () => {
      jest
        .spyOn(degradedModeManager as any, "performHealthChecks")
        .mockResolvedValue({
          mcpServer: false,
          dataProvider: false,
          cache: true, // Only one service up
          network: true,
        });

      const state = await degradedModeManager.checkSystemHealth();

      expect(state.level).toBe(DegradedModeLevel.MINIMAL);
      expect(state.degradationReason).toContain("mcpServer");
      expect(state.degradationReason).toContain("dataProvider");
    });

    it("should transition to offline mode when all services fail", async () => {
      jest
        .spyOn(degradedModeManager as any, "performHealthChecks")
        .mockResolvedValue({
          mcpServer: false,
          dataProvider: false,
          cache: false,
          network: false,
        });

      const state = await degradedModeManager.checkSystemHealth();

      expect(state.level).toBe(DegradedModeLevel.OFFLINE);
    });

    it("should handle health check errors gracefully", async () => {
      jest
        .spyOn(degradedModeManager as any, "performHealthChecks")
        .mockRejectedValue(new Error("Health check failed"));

      const state = await degradedModeManager.checkSystemHealth();

      // Should return current state without crashing
      expect(state).toBeDefined();
      expect(state.level).toBeDefined();
    });
  });

  describe("getFallbackBusinessContext", () => {
    const mockCodeLocation: CodeLocation = {
      filePath: "/test/file.ts",
      startLine: 10,
      endLine: 20,
      symbolName: "testFunction",
    };

    it("should return mock context when configured for mock data", async () => {
      const mockManager = new DegradedModeManager({
        fallbackDataSource: "mock",
      });

      const context = await mockManager.getFallbackBusinessContext(
        mockCodeLocation
      );

      expect(context).toBeDefined();
      expect(context?.requirements).toHaveLength(1);
      expect(context?.requirements[0].title).toContain("Mock Requirement");
      expect(context?.implementationStatus.notes).toContain("mock information");

      mockManager.dispose();
    });

    it("should return static fallback when configured", async () => {
      const staticManager = new DegradedModeManager({
        fallbackDataSource: "static",
      });

      const context = await staticManager.getFallbackBusinessContext(
        mockCodeLocation
      );

      expect(context).toBeDefined();
      expect(context?.requirements).toHaveLength(0);
      expect(context?.implementationStatus.notes).toContain(
        "temporarily unavailable"
      );

      staticManager.dispose();
    });

    it("should handle fallback errors gracefully", async () => {
      // Create a manager configured for mock data but force an error
      const errorManager = new DegradedModeManager({
        fallbackDataSource: "mock",
      });

      // Force an error in the entire getFallbackBusinessContext method
      jest
        .spyOn(errorManager as any, "getCachedContext")
        .mockRejectedValue(new Error("Cache failed"));
      jest
        .spyOn(errorManager as any, "generateMockContext")
        .mockImplementation(() => {
          throw new Error("Mock generation failed");
        });

      const context = await errorManager.getFallbackBusinessContext(
        mockCodeLocation
      );

      expect(context).toBeDefined();
      expect(context?.implementationStatus.notes).toContain(
        "temporarily unavailable"
      );

      errorManager.dispose();
    });
  });

  describe("executeWithDegradation", () => {
    const mockOperation = jest.fn();
    const mockFallback = jest.fn();
    const mockContext = { component: "TestComponent", operation: "testOp" };

    beforeEach(() => {
      mockOperation.mockClear();
      mockFallback.mockClear();
    });

    it("should execute primary operation in normal mode", async () => {
      mockOperation.mockResolvedValue("primary-result");
      mockFallback.mockResolvedValue("fallback-result");

      const result = await degradedModeManager.executeWithDegradation(
        mockOperation,
        mockFallback,
        mockContext
      );

      expect(result).toBe("primary-result");
      expect(mockOperation).toHaveBeenCalled();
      expect(mockFallback).not.toHaveBeenCalled();
    });

    it("should use fallback when primary operation fails in normal mode", async () => {
      mockOperation.mockRejectedValue(new Error("Primary failed"));
      mockFallback.mockResolvedValue("fallback-result");

      const result = await degradedModeManager.executeWithDegradation(
        mockOperation,
        mockFallback,
        mockContext
      );

      expect(result).toBe("fallback-result");
      expect(mockOperation).toHaveBeenCalled();
      expect(mockFallback).toHaveBeenCalled();
    });

    it("should use fallback directly in degraded mode", async () => {
      // Force degraded mode
      await degradedModeManager.forceDegradationLevel(
        DegradedModeLevel.PARTIAL,
        "Test degradation"
      );

      mockFallback.mockResolvedValue("fallback-result");

      const result = await degradedModeManager.executeWithDegradation(
        mockOperation,
        mockFallback,
        mockContext
      );

      expect(result).toBe("fallback-result");
      expect(mockOperation).not.toHaveBeenCalled();
      expect(mockFallback).toHaveBeenCalled();
    });
  });

  describe("forceDegradationLevel", () => {
    it("should force transition to specified level", async () => {
      await degradedModeManager.forceDegradationLevel(
        DegradedModeLevel.MINIMAL,
        "Forced for testing"
      );

      const state = degradedModeManager.getCurrentState();

      expect(state.level).toBe(DegradedModeLevel.MINIMAL);
      expect(state.degradationReason).toBe("Forced for testing");
    });

    it("should record audit event for forced degradation", async () => {
      const { auditTrail } = require("../../utils/auditTrail");

      await degradedModeManager.forceDegradationLevel(
        DegradedModeLevel.OFFLINE,
        "Emergency shutdown"
      );

      expect(auditTrail.recordSystemEvent).toHaveBeenCalledWith(
        expect.any(String),
        "DegradedModeManager",
        expect.objectContaining({
          metadata: expect.objectContaining({
            forcedLevel: "OFFLINE",
            reason: "Emergency shutdown",
          }),
        })
      );
    });
  });

  describe("attemptRecovery", () => {
    it("should recover when services become healthy", async () => {
      // Start in degraded mode
      await degradedModeManager.forceDegradationLevel(
        DegradedModeLevel.PARTIAL,
        "Test degradation"
      );

      // Mock recovery
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

    it("should not recover when services remain unhealthy", async () => {
      // Start in degraded mode
      await degradedModeManager.forceDegradationLevel(
        DegradedModeLevel.MINIMAL,
        "Test degradation"
      );

      // Mock continued degradation
      jest
        .spyOn(degradedModeManager as any, "performHealthChecks")
        .mockResolvedValue({
          mcpServer: false,
          dataProvider: false,
          cache: true,
          network: true,
        });

      const recovered = await degradedModeManager.attemptRecovery();

      expect(recovered).toBe(false);
      expect(degradedModeManager.getCurrentState().level).toBe(
        DegradedModeLevel.MINIMAL
      );
    });

    it("should handle recovery errors gracefully", async () => {
      jest
        .spyOn(degradedModeManager as any, "performHealthChecks")
        .mockRejectedValue(new Error("Recovery check failed"));

      const recovered = await degradedModeManager.attemptRecovery();

      expect(recovered).toBe(false);
    });
  });

  describe("getCurrentState", () => {
    it("should return a copy of current state", () => {
      const state1 = degradedModeManager.getCurrentState();
      const state2 = degradedModeManager.getCurrentState();

      expect(state1).toEqual(state2);
      expect(state1).not.toBe(state2); // Should be different objects
    });

    it("should include all required state properties", () => {
      const state = degradedModeManager.getCurrentState();

      expect(state).toHaveProperty("level");
      expect(state).toHaveProperty("activeServices");
      expect(state).toHaveProperty("lastHealthCheck");
      expect(state).toHaveProperty("degradationReason");
      expect(state.activeServices).toHaveProperty("mcpServer");
      expect(state.activeServices).toHaveProperty("dataProvider");
      expect(state.activeServices).toHaveProperty("cache");
      expect(state.activeServices).toHaveProperty("network");
    });
  });

  describe("dispose", () => {
    it("should clean up resources", () => {
      const statusBarItem = {
        show: jest.fn(),
        dispose: jest.fn(),
      };

      require("vscode").window.createStatusBarItem.mockReturnValue(
        statusBarItem
      );

      const manager = new DegradedModeManager();
      manager.dispose();

      expect(statusBarItem.dispose).toHaveBeenCalled();
    });

    it("should clear health check interval", () => {
      const clearIntervalSpy = jest.spyOn(global, "clearInterval");

      const manager = new DegradedModeManager();
      manager.dispose();

      expect(clearIntervalSpy).toHaveBeenCalled();
    });
  });
});
