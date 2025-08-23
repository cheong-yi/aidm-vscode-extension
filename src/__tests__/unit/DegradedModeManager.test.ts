/**
 * DegradedModeManager Fallback Behavior Unit Tests
 * Tests for the specific fallback return value logic in different degraded mode scenarios
 */

import { DegradedModeManager, DegradedModeLevel } from "../../utils/DegradedModeManager";
import { AuditLogger } from "../../security/AuditLogger";

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
  },
  StatusBarAlignment: {
    Right: 2,
  },
  ThemeColor: jest.fn(),
}));

describe("DegradedModeManager Fallback Behavior", () => {
  let degradedModeManager: DegradedModeManager;
  let auditLogger: AuditLogger;

  beforeEach(() => {
    jest.clearAllMocks();

    // Create proper instances
    auditLogger = new AuditLogger();
    degradedModeManager = new DegradedModeManager(auditLogger);

    // Reset degraded mode manager to normal state
    degradedModeManager.forceDegradedMode(
      DegradedModeLevel.NORMAL,
      "Test reset"
    );
  });

  afterEach(async () => {
    await degradedModeManager.shutdown();
    if (auditLogger) {
      await auditLogger.shutdown();
    }
  });

  describe("getRequirementWithFallback in Different Modes", () => {
    it("should return null in offline mode", async () => {
      // Put system in offline mode
      await degradedModeManager.forceDegradedMode(
        DegradedModeLevel.OFFLINE,
        "Testing offline mode"
      );

      const requirementOperation = jest
        .fn()
        .mockRejectedValue(new Error("Requirement not found"));

      const result = await degradedModeManager.getRequirementWithFallback(
        "req123",
        requirementOperation
      );

      // In offline mode, should return null
      expect(result).toBeNull();
      
      // Primary operation should not be called
      expect(requirementOperation).not.toHaveBeenCalled();
    });

    it("should return null in minimal mode when no cache available", async () => {
      // Put system in minimal mode
      await degradedModeManager.forceDegradedMode(
        DegradedModeLevel.MINIMAL,
        "Testing minimal mode"
      );

      const requirementOperation = jest
        .fn()
        .mockRejectedValue(new Error("Requirement not found"));

      const result = await degradedModeManager.getRequirementWithFallback(
        "req123",
        requirementOperation
      );

      // In minimal mode with no cache, should return null
      expect(result).toBeNull();
      
      // Primary operation should not be called
      expect(requirementOperation).not.toHaveBeenCalled();
    });

    it("should use cache in minimal mode when cache is available", async () => {
      // First populate cache in normal mode
      const mockRequirement = { id: "req123", title: "Cached Requirement" };
      const primaryProvider = jest.fn().mockResolvedValue(mockRequirement);
      
      await degradedModeManager.getRequirementWithFallback("req123", primaryProvider);

      // Now switch to minimal mode
      await degradedModeManager.forceDegradedMode(
        DegradedModeLevel.MINIMAL,
        "Testing minimal mode with cache"
      );

      const failingProvider = jest
        .fn()
        .mockRejectedValue(new Error("Requirement not found"));

      const result = await degradedModeManager.getRequirementWithFallback(
        "req123",
        failingProvider
      );

      // Should return cached data
      expect(result).toEqual(mockRequirement);
      
      // Failing provider should not be called
      expect(failingProvider).not.toHaveBeenCalled();
    });

    it("should use fallbacks in partial mode", async () => {
      // Put system in partial mode
      await degradedModeManager.forceDegradedMode(
        DegradedModeLevel.PARTIAL,
        "Testing partial mode"
      );

      const requirementOperation = jest
        .fn()
        .mockRejectedValue(new Error("Requirement not found"));

      const result = await degradedModeManager.getRequirementWithFallback(
        "req123",
        requirementOperation
      );

      // In partial mode, should use static fallback
      expect(result).toBeDefined();
      expect(result.id).toBe("req123");
      expect(result.title).toBe("Fallback Requirement");
      
      // Primary operation should not be called
      expect(requirementOperation).not.toHaveBeenCalled();
    });

    it("should use primary provider and fallbacks in normal mode", async () => {
      // System is already in normal mode
      const mockRequirement = { id: "req123", title: "Primary Requirement" };
      const primaryProvider = jest.fn().mockResolvedValue(mockRequirement);

      const result = await degradedModeManager.getRequirementWithFallback(
        "req123",
        primaryProvider
      );

      // Should return primary provider result
      expect(result).toEqual(mockRequirement);
      
      // Primary provider should be called
      expect(primaryProvider).toHaveBeenCalled();
    });

    it("should fall back to static data in normal mode when primary fails", async () => {
      // System is already in normal mode
      const failingProvider = jest
        .fn()
        .mockRejectedValue(new Error("Primary provider failed"));

      const result = await degradedModeManager.getRequirementWithFallback(
        "req123",
        failingProvider
      );

      // Should use static fallback
      expect(result).toBeDefined();
      expect(result.id).toBe("req123");
      expect(result.title).toBe("Fallback Requirement");
      
      // Primary provider should be called and fail
      expect(failingProvider).toHaveBeenCalled();
    });
  });

  describe("getBusinessContextWithFallback in Different Modes", () => {
    const testCodeLocation = {
      filePath: "/test/file.ts",
      startLine: 10,
      endLine: 15,
    };

    it("should return null in offline mode", async () => {
      // Put system in offline mode
      await degradedModeManager.forceDegradedMode(
        DegradedModeLevel.OFFLINE,
        "Testing offline mode"
      );

      const businessContextOperation = jest
        .fn()
        .mockRejectedValue(new Error("Business context not found"));

      const result = await degradedModeManager.getBusinessContextWithFallback(
        testCodeLocation,
        businessContextOperation
      );

      // In offline mode, should return null
      expect(result).toBeNull();
      
      // Primary operation should not be called
      expect(businessContextOperation).not.toHaveBeenCalled();
    });

    it("should return null in minimal mode when no cache available", async () => {
      // Put system in minimal mode
      await degradedModeManager.forceDegradedMode(
        DegradedModeLevel.MINIMAL,
        "Testing minimal mode"
      );

      const businessContextOperation = jest
        .fn()
        .mockRejectedValue(new Error("Business context not found"));

      const result = await degradedModeManager.getBusinessContextWithFallback(
        testCodeLocation,
        businessContextOperation
      );

      // In minimal mode with no cache, should return null
      expect(result).toBeNull();
      
      // Primary operation should not be called
      expect(businessContextOperation).not.toHaveBeenCalled();
    });

    it("should use cache in minimal mode when cache is available", async () => {
      // First populate cache in normal mode
      const mockContext = {
        requirements: [{ id: "req1", title: "Cached Requirement" }],
        implementationStatus: { completionPercentage: 80, lastVerified: new Date(), verifiedBy: "tester" },
        relatedChanges: [],
        lastUpdated: new Date(),
      };
      const primaryProvider = jest.fn().mockResolvedValue(mockContext);
      
      await degradedModeManager.getBusinessContextWithFallback(testCodeLocation, primaryProvider);

      // Now switch to minimal mode
      await degradedModeManager.forceDegradedMode(
        DegradedModeLevel.MINIMAL,
        "Testing minimal mode with cache"
      );

      const failingProvider = jest
        .fn()
        .mockRejectedValue(new Error("Business context not found"));

      const result = await degradedModeManager.getBusinessContextWithFallback(
        testCodeLocation,
        failingProvider
      );

      // Should return cached data
      expect(result).toEqual(mockContext);
      
      // Failing provider should not be called
      expect(failingProvider).not.toHaveBeenCalled();
    });

    it("should use fallbacks in partial mode", async () => {
      // Put system in partial mode
      await degradedModeManager.forceDegradedMode(
        DegradedModeLevel.PARTIAL,
        "Testing partial mode"
      );

      const businessContextOperation = jest
        .fn()
        .mockRejectedValue(new Error("Business context not found"));

      const result = await degradedModeManager.getBusinessContextWithFallback(
        testCodeLocation,
        businessContextOperation
      );

      // In partial mode, should use static fallback
      expect(result).toBeDefined();
      expect(result).not.toBeNull();
      if (result) {
        expect(result.requirements).toBeDefined();
        expect(result.requirements[0].title).toContain("Static Context");
      }
      
      // Primary operation should not be called
      expect(businessContextOperation).not.toHaveBeenCalled();
    });

    it("should use primary provider and fallbacks in normal mode", async () => {
      // System is already in normal mode
      const mockContext = {
        requirements: [{ id: "req1", title: "Primary Requirement" }],
        implementationStatus: { completionPercentage: 80, lastVerified: new Date(), verifiedBy: "tester" },
        relatedChanges: [],
        lastUpdated: new Date(),
      };
      const primaryProvider = jest.fn().mockResolvedValue(mockContext);

      const result = await degradedModeManager.getBusinessContextWithFallback(
        testCodeLocation,
        primaryProvider
      );

      // Should return primary provider result
      expect(result).toEqual(mockContext);
      
      // Primary provider should be called
      expect(primaryProvider).toHaveBeenCalled();
    });

    it("should fall back to static data in normal mode when primary fails", async () => {
      // System is already in normal mode
      const failingProvider = jest
        .fn()
        .mockRejectedValue(new Error("Primary provider failed"));

      const result = await degradedModeManager.getBusinessContextWithFallback(
        testCodeLocation,
        failingProvider
      );

      // Should use static fallback
      expect(result).toBeDefined();
      expect(result).not.toBeNull();
      if (result) {
        expect(result.requirements).toBeDefined();
        expect(result.requirements[0].title).toContain("Static Context");
      }
      
      // Primary provider should be called and fail
      expect(failingProvider).toHaveBeenCalled();
    });
  });

  describe("Mode Transitions and Behavior Changes", () => {
    it("should change behavior when transitioning from normal to minimal mode", async () => {
      // Start in normal mode
      const mockRequirement = { id: "req123", title: "Primary Requirement" };
      const primaryProvider = jest.fn().mockResolvedValue(mockRequirement);

      // Should work in normal mode
      const normalResult = await degradedModeManager.getRequirementWithFallback(
        "req123",
        primaryProvider
      );
      expect(normalResult).toEqual(mockRequirement);
      expect(primaryProvider).toHaveBeenCalled();

      // Reset mock
      primaryProvider.mockClear();

      // Switch to minimal mode and clear cache to test null return behavior
      await degradedModeManager.forceDegradedMode(
        DegradedModeLevel.MINIMAL,
        "Testing mode transition"
      );
      degradedModeManager.clearCache(); // Clear cache to test null return

      // Should return null in minimal mode (no cache)
      const minimalResult = await degradedModeManager.getRequirementWithFallback(
        "req123",
        primaryProvider
      );
      expect(minimalResult).toBeNull();
      expect(primaryProvider).not.toHaveBeenCalled();
    });

    it("should change behavior when transitioning from partial to offline mode", async () => {
      // Start in partial mode
      await degradedModeManager.forceDegradedMode(
        DegradedModeLevel.PARTIAL,
        "Testing partial mode"
      );

      const requirementOperation = jest
        .fn()
        .mockRejectedValue(new Error("Requirement not found"));

      // Should use fallbacks in partial mode
      const partialResult = await degradedModeManager.getRequirementWithFallback(
        "req123",
        requirementOperation
      );
      expect(partialResult).toBeDefined();
      expect(partialResult.id).toBe("req123");

      // Reset mock
      requirementOperation.mockClear();

      // Switch to offline mode
      await degradedModeManager.forceDegradedMode(
        DegradedModeLevel.OFFLINE,
        "Testing mode transition"
      );

      // Should return null in offline mode
      const offlineResult = await degradedModeManager.getRequirementWithFallback(
        "req123",
        requirementOperation
      );
      expect(offlineResult).toBeNull();
      expect(requirementOperation).not.toHaveBeenCalled();
    });
  });

  describe("Edge Cases and Error Scenarios", () => {
    it("should handle mode state corruption gracefully", async () => {
      // Simulate corrupted mode state by directly setting an invalid mode
      (degradedModeManager as any).currentMode = "INVALID_MODE";

      const requirementOperation = jest
        .fn()
        .mockRejectedValue(new Error("Requirement not found"));

      const result = await degradedModeManager.getRequirementWithFallback(
        "req123",
        requirementOperation
      );

      // Should fall back to fallback mechanisms (safe default behavior)
      expect(result).toBeDefined();
      expect(result.id).toBe("req123");
    });

    it("should handle mode transition during operation", async () => {
      // Start in normal mode
      const mockRequirement = { id: "req123", title: "Primary Requirement" };
      const primaryProvider = jest.fn().mockImplementation(async () => {
        // Simulate mode change during operation
        await degradedModeManager.forceDegradedMode(
          DegradedModeLevel.MINIMAL,
          "Mode change during operation"
        );
        return mockRequirement;
      });

      const result = await degradedModeManager.getRequirementWithFallback(
        "req123",
        primaryProvider
      );

      // Should handle mode transition gracefully
      expect(result).toBeDefined();
      expect(primaryProvider).toHaveBeenCalled();
    });
  });
});
