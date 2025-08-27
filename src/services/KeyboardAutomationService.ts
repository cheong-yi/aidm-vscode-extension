/**
 * Keyboard Automation Service
 * Provides cross-platform keyboard automation and window focus operations
 *
 * Task: GUI-TRIAL-003a - Create KeyboardAutomationService structure
 * Requirements: Define service class structure for keyboard automation operations
 * Dependencies: WindowDetectionService for WindowInfo interface
 */

import { WindowInfo } from "./WindowDetectionService";
import { getActiveWindow, keyboard, Key } from "@nut-tree-fork/nut-js";

/**
 * Interface for defining automation sequences
 */
export interface AutomationSequence {
  windowFocus: boolean;
  keyboardShortcut: string;
  pasteContent: boolean;
  submitKey: string;
}

/**
 * Service for cross-platform keyboard automation operations
 */
export class KeyboardAutomationService {
  private platform: NodeJS.Platform;

  constructor() {
    this.platform = process.platform;
  }

  /**
   * Focus a specific window
   * @param windowInfo - Window information to focus
   * @returns Promise resolving to boolean indicating success
   */
  async focusWindow(windowInfo: WindowInfo): Promise<boolean> {
    try {
      if (!windowInfo.windowHandle) {
        console.error("No window handle provided for focus operation");
        return false;
      }

      // Focus the window using nut-tree Window.focus() method
      await windowInfo.windowHandle.focus();

      // Brief wait for focus to take effect
      await this.delay(200);

      // Verify focus was successful by checking active window
      const activeWindow = await getActiveWindow();
      if (!activeWindow) {
        console.log("No active window found after focus attempt");
        return false;
      }

      const activeWindowTitle = await activeWindow.title;
      if (typeof activeWindowTitle !== "string") {
        console.log("Active window title is not a string, cannot verify focus");
        return false;
      }

      const focusSuccessful = activeWindowTitle
        .toLowerCase()
        .includes(windowInfo.title.toLowerCase());

      console.log(
        `Window focus ${focusSuccessful ? "successful" : "failed"} for: ${
          windowInfo.title
        }`
      );
      return focusSuccessful;
    } catch (error) {
      console.error("Failed to focus window:", error);
      return false;
    }
  }

  /**
   * Send a keyboard shortcut
   * @param shortcut - Platform-specific shortcut to send
   * @returns Promise resolving to boolean indicating success
   */
  async sendKeyboardShortcut(shortcut: string): Promise<boolean> {
    try {
      const keys = this.parseShortcut(shortcut);

      if (keys.length === 0) {
        console.error(`Invalid shortcut format: ${shortcut}`);
        return false;
      }

      // Send the key combination
      await keyboard.pressKey(...keys);
      await this.delay(100); // Brief delay after key press
      await keyboard.releaseKey(...keys);

      console.log(`Keyboard shortcut sent: ${shortcut}`);
      return true;
    } catch (error) {
      console.error(`Failed to send keyboard shortcut ${shortcut}:`, error);
      return false;
    }
  }

  /**
   * Paste content from clipboard
   * @returns Promise resolving to boolean indicating success
   */
  async pasteFromClipboard(): Promise<boolean> {
    // Stub - paste clipboard content
    return false;
  }

  /**
   * Send enter/return key
   * @returns Promise resolving to boolean indicating success
   */
  async sendEnterKey(): Promise<boolean> {
    // Stub - send enter/return key
    return false;
  }

  /**
   * Get platform-specific chat shortcut
   * @returns Platform-appropriate chat shortcut
   */
  getChatShortcut(): string {
    // Return platform-specific chat shortcut
    return this.platform === "darwin" ? "cmd+l" : "ctrl+l";
  }

  /**
   * Helper method to create a delay for timing control
   * @param ms - Milliseconds to delay
   * @returns Promise that resolves after the specified delay
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Parse shortcut string into nut-tree Key array
   * @param shortcut - Shortcut string (e.g., "ctrl+l", "cmd+l")
   * @returns Array of nut-tree Key objects
   */
  private parseShortcut(shortcut: string): Key[] {
    const parts = shortcut.toLowerCase().split("+");
    const keys: Key[] = [];

    for (const part of parts) {
      switch (part.trim()) {
        case "ctrl":
        case "control":
          keys.push(Key.LeftControl);
          break;
        case "cmd":
        case "meta":
          keys.push(Key.LeftCmd);
          break;
        case "l":
          keys.push(Key.L);
          break;
        default:
          console.warn(`Unknown key part: ${part}`);
      }
    }

    return keys;
  }
}
