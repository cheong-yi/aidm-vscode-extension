/**
 * Cursor Automation Orchestrator
 * Orchestrates complete automation sequence for Cursor chat activation
 *
 * Task: GUI-TRIAL-004a - Create CursorAutomationOrchestrator integration
 * Requirements: Combine window detection and keyboard automation for end-to-end automation
 * Dependencies: WindowDetectionService, KeyboardAutomationService
 */

import { WindowDetectionService } from "./WindowDetectionService";
import { KeyboardAutomationService } from "./KeyboardAutomationService";

/**
 * Result of automation execution with detailed step tracking
 */
export interface AutomationResult {
  success: boolean;
  step: string;
  error?: string;
}

/**
 * Orchestrates complete Cursor chat automation workflow
 * Combines window detection and keyboard automation services
 */
export class CursorAutomationOrchestrator {
  private windowService: WindowDetectionService;
  private keyboardService: KeyboardAutomationService;

  constructor() {
    this.windowService = new WindowDetectionService();
    this.keyboardService = new KeyboardAutomationService();
  }

  /**
   * Execute complete Cursor chat automation sequence
   * @param taskContent - Content to send to Cursor chat
   * @returns Promise resolving to detailed automation result
   */
  async executeCursorChatAutomation(
    taskContent: string
  ): Promise<AutomationResult> {
    try {
      console.log("Starting Cursor chat automation sequence...");

      // Step 1: Find Cursor window
      console.log("Step 1: Detecting Cursor window...");
      const cursorWindow = await this.windowService.findWindowByTitle("cursor");
      if (!cursorWindow) {
        return {
          success: false,
          step: "window_detection",
          error: "Cursor window not found - ensure Cursor is running",
        };
      }
      console.log(`Cursor window found: ${cursorWindow.title}`);

      // Step 2: Focus Cursor window
      console.log("Step 2: Focusing Cursor window...");
      const focusSuccess = await this.keyboardService.focusWindow(cursorWindow);
      if (!focusSuccess) {
        return {
          success: false,
          step: "window_focus",
          error: "Failed to focus Cursor window",
        };
      }
      console.log("Cursor window focused successfully");

      // Step 3: Copy content to clipboard
      console.log("Step 3: Copying task content to clipboard...");
      await this.copyToClipboard(taskContent);
      console.log("Task content copied to clipboard");

      // Step 4: Send chat shortcut (Ctrl+L or Cmd+L)
      console.log("Step 4: Sending chat shortcut...");
      const shortcut = this.keyboardService.getChatShortcut();
      const shortcutSuccess = await this.keyboardService.sendKeyboardShortcut(
        shortcut
      );
      if (!shortcutSuccess) {
        return {
          success: false,
          step: "chat_shortcut",
          error: `Failed to send chat shortcut: ${shortcut}`,
        };
      }
      console.log(`Chat shortcut sent: ${shortcut}`);

      // Step 5: Wait briefly then paste and submit
      console.log("Step 5: Waiting for chat input to activate...");
      await this.delay(300);

      console.log("Step 6: Pasting content from clipboard...");
      const pasteSuccess = await this.keyboardService.pasteFromClipboard();
      if (!pasteSuccess) {
        return {
          success: false,
          step: "paste_content",
          error: "Failed to paste content from clipboard",
        };
      }
      console.log("Content pasted successfully");

      console.log("Step 7: Sending Enter key to submit...");
      await this.delay(200);
      const submitSuccess = await this.keyboardService.sendEnterKey();
      if (!submitSuccess) {
        return {
          success: false,
          step: "submit_message",
          error: "Failed to send Enter key to submit message",
        };
      }
      console.log("Enter key sent successfully");

      console.log("Cursor chat automation completed successfully!");
      return { success: true, step: "completed" };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error occurred";
      console.error("Cursor chat automation failed:", errorMessage);
      return {
        success: false,
        step: "unknown",
        error: errorMessage,
      };
    }
  }

  /**
   * Copy content to clipboard using VSCode API
   * @param content - Content to copy to clipboard
   */
  private async copyToClipboard(content: string): Promise<void> {
    try {
      // Dynamic import to avoid VSCode API dependency in non-extension context
      const vscode = await import("vscode");
      await vscode.env.clipboard.writeText(content);
    } catch (error) {
      console.warn(
        "Failed to use VSCode clipboard API, falling back to system clipboard"
      );
      // Fallback to system clipboard if VSCode API unavailable
      await this.fallbackCopyToClipboard(content);
    }
  }

  /**
   * Fallback clipboard copy using system clipboard
   * @param content - Content to copy to clipboard
   */
  private async fallbackCopyToClipboard(content: string): Promise<void> {
    try {
      // Use clipboardy if available, otherwise log warning
      const clipboardy = await import("clipboardy");
      await clipboardy.default.write(content);
    } catch (error) {
      console.warn(
        "System clipboard fallback unavailable, clipboard operation may fail"
      );
      // Continue execution - clipboard operation may still work through other means
    }
  }

  /**
   * Helper method to create a delay for timing control
   * @param ms - Milliseconds to delay
   * @returns Promise that resolves after the specified delay
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
