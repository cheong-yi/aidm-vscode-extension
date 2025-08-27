/**
 * Automation Testing and Validation Utilities
 * Provides demo environment validation and automation testing functions
 *
 * Task: GUI-TRIAL-006a - Create demo validation and testing utilities
 * Requirements: Validate demo environment readiness and test automation sequence reliability
 * Dependencies: CursorAutomationOrchestrator for testing automation sequence
 */

import {
  CursorAutomationOrchestrator,
  AutomationResult,
} from "../services/CursorAutomationOrchestrator";
import * as vscode from "vscode";

/**
 * Result of demo environment validation with detailed metrics
 */
export interface DemoValidationResult {
  cursorDetected: boolean;
  automationReliability: number; // 0-1 success rate
  averageExecutionTime: number; // milliseconds
  failurePoints: string[];
  isReadyForDemo: boolean;
}

/**
 * Utility class for validating demo environment and testing automation reliability
 */
export class AutomationTestUtils {
  private orchestrator: CursorAutomationOrchestrator;

  constructor() {
    this.orchestrator = new CursorAutomationOrchestrator();
  }

  /**
   * Validate complete demo environment readiness
   * @returns Promise resolving to comprehensive validation results
   */
  async validateDemoEnvironment(): Promise<DemoValidationResult> {
    console.log("Starting demo environment validation...");

    try {
      // Test 1: Cursor detection
      const cursorDetected = await this.testCursorDetection();

      // Test 2: Automation reliability (3 quick tests)
      const reliabilityResults = await this.testAutomationReliability(3);

      const result: DemoValidationResult = {
        cursorDetected,
        automationReliability: reliabilityResults.successRate,
        averageExecutionTime: reliabilityResults.averageTime,
        failurePoints: reliabilityResults.failurePoints,
        isReadyForDemo: cursorDetected && reliabilityResults.successRate >= 0.6,
      };

      console.log("Demo validation completed:", result);
      return result;
    } catch (error) {
      console.error("Demo validation failed:", error);
      return {
        cursorDetected: false,
        automationReliability: 0,
        averageExecutionTime: 0,
        failurePoints: ["validation_exception"],
        isReadyForDemo: false,
      };
    }
  }

  /**
   * Test if Cursor window can be detected and accessed
   * @returns Promise resolving to true if Cursor is available
   */
  private async testCursorDetection(): Promise<boolean> {
    try {
      const result = await this.orchestrator.executeCursorChatAutomation(
        "test"
      );
      return result.step !== "window_detection";
    } catch (error) {
      console.warn("Cursor detection test failed:", error);
      return false;
    }
  }

  /**
   * Test automation reliability with multiple test runs
   * @param testCount - Number of test runs to perform
   * @returns Promise resolving to reliability statistics
   */
  private async testAutomationReliability(testCount: number): Promise<{
    successRate: number;
    averageTime: number;
    failurePoints: string[];
  }> {
    const results: AutomationResult[] = [];
    const times: number[] = [];
    const failurePoints: string[] = [];

    console.log(`Running ${testCount} automation reliability tests...`);

    for (let i = 0; i < testCount; i++) {
      const startTime = Date.now();

      try {
        const result = await this.orchestrator.executeCursorChatAutomation(
          `Demo test ${i + 1}`
        );
        results.push(result);
        times.push(Date.now() - startTime);

        if (!result.success) {
          failurePoints.push(result.step);
        }

        // Brief delay between tests to avoid overwhelming the system
        if (i < testCount - 1) {
          await new Promise((resolve) => setTimeout(resolve, 1000));
        }
      } catch (error) {
        console.warn(`Test ${i + 1} failed with exception:`, error);
        results.push({
          success: false,
          step: "exception",
          error: String(error),
        });
        failurePoints.push("exception");
      }
    }

    const successCount = results.filter((r) => r.success).length;
    const successRate = successCount / testCount;
    const averageTime =
      times.length > 0 ? times.reduce((a, b) => a + b, 0) / times.length : 0;

    console.log(
      `Reliability test results: ${successCount}/${testCount} successful (${Math.round(
        successRate * 100
      )}%)`
    );

    return { successRate, averageTime, failurePoints };
  }

  /**
   * Run demo precheck and show user feedback
   * @returns Promise resolving when precheck is complete
   */
  async runDemoPrecheck(): Promise<void> {
    try {
      const validation = await this.validateDemoEnvironment();

      if (validation.isReadyForDemo) {
        vscode.window.showInformationMessage(
          `Demo Ready! Automation success rate: ${Math.round(
            validation.automationReliability * 100
          )}%`
        );
      } else {
        const issues = [];
        if (!validation.cursorDetected) issues.push("Cursor not detected");
        if (validation.automationReliability < 0.6)
          issues.push(
            `Low success rate: ${Math.round(
              validation.automationReliability * 100
            )}%`
          );

        vscode.window.showWarningMessage(
          `Demo Issues: ${issues.join(
            ", "
          )}. Consider using clipboard fallback.`
        );
      }
    } catch (error) {
      console.error("Demo precheck failed:", error);
      vscode.window.showErrorMessage(
        "Demo precheck failed. Check console for details."
      );
    }
  }

  /**
   * Get quick status check without full validation
   * @returns Promise resolving to basic readiness status
   */
  async getQuickStatus(): Promise<{
    cursorAvailable: boolean;
    lastTestTime?: number;
  }> {
    try {
      const cursorAvailable = await this.testCursorDetection();
      return {
        cursorAvailable,
        lastTestTime: Date.now(),
      };
    } catch (error) {
      console.warn("Quick status check failed:", error);
      return { cursorAvailable: false };
    }
  }
}
