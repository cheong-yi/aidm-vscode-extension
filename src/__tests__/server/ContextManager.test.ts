/**
 * Unit Tests for ContextManager
 * Tests caching behavior and business context retrieval
 */

import { ContextManager } from "../../server/ContextManager";
import { MockDataProvider } from "../../mock/MockDataProvider";
// Inline business types (removed business.ts dependency)
interface CodeLocation {
  filePath: string;
  startLine: number;
  endLine: number;
  symbolName?: string;
  symbolType?: string;
}

describe("ContextManager", () => {
  let contextManager: ContextManager;
  let mockDataProvider: MockDataProvider;

  beforeEach(() => {
    mockDataProvider = new MockDataProvider({
      dataSize: "small",
      responseDelay: 0,
      errorRate: 0,
    });
    contextManager = new ContextManager(mockDataProvider);
  });

  describe("Business Context Retrieval", () => {
    test("should get business context for valid code location", async () => {
      const codeLocation: CodeLocation = {
        filePath: "src/auth/AuthService.ts",
        startLine: 10,
        endLine: 20,
        symbolName: "authenticate",
      };

      const context = await contextManager.getBusinessContext(codeLocation);

      expect(context).toBeDefined();
      expect(context.requirements).toBeInstanceOf(Array);
      expect(context.implementationStatus).toBeDefined();
      expect(context.relatedChanges).toBeInstanceOf(Array);
      expect(context.lastUpdated).toBeInstanceOf(Date);
    });

    test("should return empty context when no data found", async () => {
      // Mock the data provider to return empty array
      jest.spyOn(mockDataProvider, "getContextForFile").mockResolvedValue([]);

      const codeLocation: CodeLocation = {
        filePath: "src/nonexistent/file.ts",
        startLine: 1,
        endLine: 10,
      };

      const context = await contextManager.getBusinessContext(codeLocation);

      expect(context.requirements).toHaveLength(0);
      expect(context.implementationStatus.completionPercentage).toBe(0);
      expect(context.relatedChanges).toHaveLength(0);
    });

    test("should handle data provider errors gracefully", async () => {
      // Mock the data provider to throw an error
      jest
        .spyOn(mockDataProvider, "getContextForFile")
        .mockRejectedValue(new Error("Data provider error"));

      const codeLocation: CodeLocation = {
        filePath: "src/error/file.ts",
        startLine: 1,
        endLine: 10,
      };

      const context = await contextManager.getBusinessContext(codeLocation);

      expect(context.requirements).toHaveLength(0);
      expect(context.implementationStatus.completionPercentage).toBe(0);
    });
  });

  describe("Caching Behavior", () => {
    test("should cache business context results", async () => {
      const codeLocation: CodeLocation = {
        filePath: "src/cached/file.ts",
        startLine: 1,
        endLine: 10,
      };

      const spy = jest.spyOn(mockDataProvider, "getContextForFile");

      // First call should hit the data provider
      const context1 = await contextManager.getBusinessContext(codeLocation);
      expect(spy).toHaveBeenCalledTimes(1);

      // Second call should use cache
      const context2 = await contextManager.getBusinessContext(codeLocation);
      expect(spy).toHaveBeenCalledTimes(1); // Still only called once

      expect(context1).toEqual(context2);
    });

    test("should generate unique cache keys for different locations", async () => {
      const location1: CodeLocation = {
        filePath: "src/file1.ts",
        startLine: 1,
        endLine: 10,
        symbolName: "function1",
      };

      const location2: CodeLocation = {
        filePath: "src/file2.ts",
        startLine: 1,
        endLine: 10,
        symbolName: "function2",
      };

      const spy = jest.spyOn(mockDataProvider, "getContextForFile");

      await contextManager.getBusinessContext(location1);
      await contextManager.getBusinessContext(location2);

      // Should call data provider twice for different locations
      expect(spy).toHaveBeenCalledTimes(2);
    });

    test("should invalidate cache when requested", async () => {
      const codeLocation: CodeLocation = {
        filePath: "src/invalidate/file.ts",
        startLine: 1,
        endLine: 10,
      };

      const spy = jest.spyOn(mockDataProvider, "getContextForFile");

      // First call
      await contextManager.getBusinessContext(codeLocation);
      expect(spy).toHaveBeenCalledTimes(1);

      // Invalidate cache
      contextManager.invalidateCache();

      // Second call should hit data provider again
      await contextManager.getBusinessContext(codeLocation);
      expect(spy).toHaveBeenCalledTimes(2);
    });

    test("should invalidate cache by pattern", async () => {
      const location1: CodeLocation = {
        filePath: "src/auth/AuthService.ts",
        startLine: 1,
        endLine: 10,
      };

      const location2: CodeLocation = {
        filePath: "src/payment/PaymentService.ts",
        startLine: 1,
        endLine: 10,
      };

      const spy = jest.spyOn(mockDataProvider, "getContextForFile");

      // Cache both locations
      await contextManager.getBusinessContext(location1);
      await contextManager.getBusinessContext(location2);
      expect(spy).toHaveBeenCalledTimes(2);

      // Invalidate only auth-related cache
      contextManager.invalidateCache("auth");

      // Auth location should hit data provider again
      await contextManager.getBusinessContext(location1);
      expect(spy).toHaveBeenCalledTimes(3);

      // Payment location should still use cache
      await contextManager.getBusinessContext(location2);
      expect(spy).toHaveBeenCalledTimes(3);
    });
  });

  describe("Requirement Retrieval", () => {
    test("should get requirement by ID", async () => {
      const requirements = mockDataProvider.getAllRequirements();
      const testRequirement = requirements[0];

      const result = await contextManager.getRequirementById(
        testRequirement.id
      );

      expect(result).toBeDefined();
      expect(result.id).toBe(testRequirement.id);
      expect(result.title).toBe(testRequirement.title);
    });

    test("should return null for non-existent requirement", async () => {
      const result = await contextManager.getRequirementById("NON-EXISTENT");

      expect(result).toBeNull();
    });

    test("should handle errors when getting requirement by ID", async () => {
      jest
        .spyOn(mockDataProvider, "getRequirementById")
        .mockRejectedValue(new Error("Data error"));

      const result = await contextManager.getRequirementById("ERROR-ID");

      expect(result).toBeNull();
    });
  });

  describe("Cache Management", () => {
    test("should start cache cleanup", () => {
      // Mock setInterval to verify it's called
      const setIntervalSpy = jest.spyOn(global, "setInterval");

      contextManager.startCacheCleanup(1000);

      expect(setIntervalSpy).toHaveBeenCalledWith(expect.any(Function), 1000);

      setIntervalSpy.mockRestore();
    });
  });
});
