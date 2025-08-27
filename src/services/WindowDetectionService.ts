/**
 * Window Detection Service
 * Provides functionality for detecting and managing running application windows
 *
 * Task: GUI-TRIAL-002a - Implement getRunningWindows with nut-tree
 * Requirements: Actual window detection using nut-tree API
 * Dependencies: @nut-tree-fork/nut-js getWindows function
 */

import { Window, getWindows } from "@nut-tree-fork/nut-js";

/**
 * Interface for window information
 */
export interface WindowInfo {
  title: string;
  processName: string;
  windowHandle?: any; // Platform-specific handle
}

/**
 * Service for detecting and managing running application windows
 */
export class WindowDetectionService {
  /**
   * Get all currently running windows
   * @returns Promise resolving to array of window information
   */
  async getRunningWindows(): Promise<WindowInfo[]> {
    try {
      console.log("Attempting to detect running windows...");
      const windows = await getWindows();
      console.log(`Detected ${windows.length} windows`);

      const windowInfos: WindowInfo[] = [];

      for (const window of windows) {
        try {
          const title = (await window.title) || "Unknown";
          windowInfos.push({
            title: title,
            processName: this.extractProcessName(title),
            windowHandle: window,
          });
        } catch (error) {
          console.warn("Failed to get title for window:", error);
          windowInfos.push({
            title: "Unknown",
            processName: "Unknown",
            windowHandle: window,
          });
        }
      }

      return windowInfos;
    } catch (error) {
      console.error("Failed to get running windows:", error);
      return [];
    }
  }

  /**
   * Find a window by title pattern
   * @param titlePattern - Pattern to match against window titles
   * @returns Promise resolving to window info or null if not found
   */
  async findWindowByTitle(titlePattern: string): Promise<WindowInfo | null> {
    try {
      const windows = await this.getRunningWindows();

      const cursorWindow = windows.find((window) =>
        this.matchesCursorPattern(window.title, titlePattern)
      );

      return cursorWindow || null;
    } catch (error) {
      console.error("Failed to find window by title:", error);
      return null;
    }
  }

  /**
   * Check if a specific application is running
   * @param appName - Name of the application to check
   * @returns Promise resolving to boolean indicating if app is running
   */
  async isApplicationRunning(appName: string): Promise<boolean> {
    // Stub implementation - will be implemented in GUI-TRIAL-002a
    return false;
  }

  /**
   * Extract process name from window title
   * @param title - Window title to extract process name from
   * @returns Extracted process name or 'Unknown' if unable to extract
   */
  private extractProcessName(title: string): string {
    if (!title || title === "Unknown") {
      return "Unknown";
    }

    // Common patterns for extracting app names from window titles
    // Pattern 1: "App Name - Document Name" -> "App Name"
    const dashPattern = title.split(" - ");
    if (dashPattern.length > 1) {
      return dashPattern[0].trim();
    }

    // Pattern 2: "App Name: Document Name" -> "App Name"
    const colonPattern = title.split(": ");
    if (colonPattern.length > 1) {
      return colonPattern[0].trim();
    }

    // Pattern 3: "App Name (Document Name)" -> "App Name"
    const parenPattern = title.split(" (");
    if (parenPattern.length > 1) {
      return parenPattern[0].trim();
    }

    // Fallback: return the full title if no pattern matches
    return title.trim();
  }

  /**
   * Check if a window title matches Cursor-specific patterns
   * @param windowTitle - Window title to check
   * @param pattern - Pattern to match against
   * @returns Boolean indicating if the window matches Cursor patterns
   */
  private matchesCursorPattern(windowTitle: string, pattern: string): boolean {
    const title = windowTitle.toLowerCase();
    const searchPattern = pattern.toLowerCase();

    // Match exact "cursor" or "cursor - filename"
    return (
      title === "cursor" ||
      title.startsWith("cursor -") ||
      title.startsWith("cursor ") ||
      title.includes("cursor")
    );
  }
}
