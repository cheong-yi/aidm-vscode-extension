/**
 * Tests for AutomationTestUtils
 *
 * Task: GUI-TRIAL-006a - Create demo validation and testing utilities
 * Requirements: Validate demo environment readiness and test automation sequence reliability
 */

import {
  AutomationTestUtils,
  DemoValidationResult,
} from "../../demo/AutomationTestUtils";
import {
  CursorAutomationOrchestrator,
  AutomationResult,
} from "../../services/CursorAutomationOrchestrator";

// Mock the CursorAutomationOrchestrator
jest.mock("../../services/CursorAutomationOrchestrator");

describe("AutomationTestUtils", () => {
  let testUtils: AutomationTestUtils;
  let mockOrchestrator: jest.Mocked<CursorAutomationOrchestrator>;

  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks();

    // Create mock orchestrator
    mockOrchestrator = {
      executeCursorChatAutomation: jest.fn(),
    } as any;

    // Mock the constructor to return our mock
    (
      CursorAutomationOrchestrator as jest.MockedClass<
        typeof CursorAutomationOrchestrator
      >
    ).mockImplementation(() => mockOrchestrator);

    testUtils = new AutomationTestUtils();
  });

  describe("validateDemoEnvironment", () => {
    it("should return successful validation when Cursor is detected and automation works", async () => {
      // Mock successful automation
      mockOrchestrator.executeCursorChatAutomation
        .mockResolvedValueOnce({ success: true, step: "completed" }) // First call for detection
        .mockResolvedValueOnce({ success: true, step: "completed" }) // Second call for reliability test 1
        .mockResolvedValueOnce({ success: true, step: "completed" }) // Third call for reliability test 2
        .mockResolvedValueOnce({ success: true, step: "completed" }); // Fourth call for reliability test 3

      const result = await testUtils.validateDemoEnvironment();

      expect(result).toEqual({
        cursorDetected: true,
        automationReliability: 1.0,
        averageExecutionTime: expect.any(Number),
        failurePoints: [],
        isReadyForDemo: true,
      });
    });

    it("should return failed validation when Cursor is not detected", async () => {
      // Mock failed automation at window detection step
      mockOrchestrator.executeCursorChatAutomation.mockResolvedValueOnce({
        success: false,
        step: "window_detection",
        error: "Cursor not found",
      });

      const result = await testUtils.validateDemoEnvironment();

      expect(result).toEqual({
        cursorDetected: false,
        automationReliability: 0,
        averageExecutionTime: 0,
        failurePoints: ["validation_exception"],
        isReadyForDemo: false,
      });
    });

    it("should return partial success when Cursor is detected but automation has mixed results", async () => {
      // Mock mixed automation results
      mockOrchestrator.executeCursorChatAutomation
        .mockResolvedValueOnce({ success: true, step: "completed" }) // Detection successful
        .mockResolvedValueOnce({ success: true, step: "completed" }) // Test 1 successful
        .mockResolvedValueOnce({
          success: false,
          step: "paste_content",
          error: "Paste failed",
        }) // Test 2 failed
        .mockResolvedValueOnce({ success: true, step: "completed" }); // Test 3 successful

      const result = await testUtils.validateDemoEnvironment();

      expect(result).toEqual({
        cursorDetected: true,
        automationReliability: 0.6666666666666666, // 2 out of 3 successful (0.67)
        averageExecutionTime: expect.any(Number),
        failurePoints: ["paste_content"],
        isReadyForDemo: true, // Still above 0.6 threshold
      });
    });

    it("should handle exceptions gracefully and return failed validation", async () => {
      // Mock exception during automation
      mockOrchestrator.executeCursorChatAutomation.mockRejectedValueOnce(
        new Error("Unexpected error")
      );

      const result = await testUtils.validateDemoEnvironment();

      expect(result).toEqual({
        cursorDetected: false,
        automationReliability: 0,
        averageExecutionTime: 0,
        failurePoints: ["validation_exception"],
        isReadyForDemo: false,
      });
    });
  });

  describe("getQuickStatus", () => {
    it("should return cursor availability status", async () => {
      mockOrchestrator.executeCursorChatAutomation.mockResolvedValueOnce({
        success: true,
        step: "completed",
      });

      const status = await testUtils.getQuickStatus();

      expect(status).toEqual({
        cursorAvailable: true,
        lastTestTime: expect.any(Number),
      });
    });

    it("should return false when Cursor is not available", async () => {
      mockOrchestrator.executeCursorChatAutomation.mockResolvedValueOnce({
        success: false,
        step: "window_detection",
      });

      const status = await testUtils.getQuickStatus();

      expect(status).toEqual({
        cursorAvailable: false,
        lastTestTime: expect.any(Number),
      });
    });

    it("should handle exceptions gracefully", async () => {
      mockOrchestrator.executeCursorChatAutomation.mockRejectedValueOnce(
        new Error("Test error")
      );

      const status = await testUtils.getQuickStatus();

      expect(status).toEqual({
        cursorAvailable: false,
        lastTestTime: expect.any(Number),
      });
    });
  });

  describe("testAutomationReliability", () => {
    it("should calculate correct success rate and timing", async () => {
      // Mock successful automation with timing
      mockOrchestrator.executeCursorChatAutomation
        .mockResolvedValueOnce({ success: true, step: "completed" })
        .mockResolvedValueOnce({ success: false, step: "paste_content" })
        .mockResolvedValueOnce({ success: true, step: "completed" });

      // Use reflection to access private method
      const reliabilityTest = (testUtils as any).testAutomationReliability.bind(
        testUtils
      );
      const result = await reliabilityTest(3);

      expect(result).toEqual({
        successRate: 2 / 3, // 2 out of 3 successful
        averageTime: expect.any(Number),
        failurePoints: ["paste_content"],
      });
    });
  });
});
