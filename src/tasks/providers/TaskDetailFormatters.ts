import { Task, TaskStatus } from "../types";

/**
 * Pure utility functions for formatting task detail data
 * All methods are static and have no external dependencies
 */
export class TaskDetailFormatters {

  static formatRelativeTime(isoDate: string): string {
    if (!isoDate) {
      return "Never";
    }

    try {
      const date = new Date(isoDate);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMinutes = Math.floor(diffMs / (1000 * 60));
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

      if (diffMinutes < 1) {
        return "Just now";
      } else if (diffMinutes < 60) {
        return `${diffMinutes} minute${diffMinutes === 1 ? "" : "s"} ago`;
      } else if (diffHours < 24) {
        return `${diffHours} hour${diffHours === 1 ? "" : "s"} ago`;
      } else if (diffDays < 7) {
        return `${diffDays} day${diffDays === 1 ? "" : "s"} ago`;
      } else {
        return date.toLocaleDateString();
      }
    } catch (error) {
      // Fallback to original ISO string if parsing fails
      return isoDate;
    }
  }

  static parseEstimatedDuration(duration: string): number {
    if (!duration || typeof duration !== "string") {
      return 0;
    }

    try {
      const trimmed = duration.trim().toLowerCase();

      // Handle range format (e.g., "15-30 min")
      const rangeMatch = trimmed.match(/^(\d+(?:\.\d+)?)\s*-\s*(\d+(?:\.\d+)?)\s*(min|minute|minutes|hour|hours|h|m)$/);
      if (rangeMatch) {
        const [, minStr, maxStr, unit] = rangeMatch;
        const min = parseFloat(minStr);
        const max = parseFloat(maxStr);

        if (isNaN(min) || isNaN(max) || min > max) {
          return 0;
        }

        const multiplier = (unit.startsWith('h') || unit === 'hour' || unit === 'hours') ? 60 : 1;
        return ((min + max) / 2) * multiplier;
      }

      // Handle single value format (e.g., "45 min")
      const singleMatch = trimmed.match(/^(\d+(?:\.\d+)?)\s*(min|minute|minutes|hour|hours|h|m)$/);
      if (singleMatch) {
        const [, valueStr, unit] = singleMatch;
        const value = parseFloat(valueStr);

        if (isNaN(value)) {
          return 0;
        }

        const multiplier = (unit.startsWith('h') || unit === 'hour' || unit === 'hours') ? 60 : 1;
        return value * multiplier;
      }

      return 0;
    } catch (error) {
      return 0;
    }
  }

  static formatEstimatedDuration(duration?: string): string {
    if (!duration || duration.trim() === "") {
      return "Not specified";
    }

    try {
      // Use inline method to parse and format duration if needed
      const parsedDuration = TaskDetailFormatters.parseEstimatedDuration(duration);
      if (parsedDuration > 0) {
        // Return original format for now, could be enhanced with parsed formatting
        return duration.trim();
      }
      return duration.trim();
    } catch (error) {
      console.warn("Failed to format estimated duration:", error);
      return duration.trim();
    }
  }

  static formatDependencies(dependencies?: string[]): string {
    if (!dependencies || dependencies.length === 0) {
      return "None";
    }

    try {
      return dependencies.join(", ");
    } catch (error) {
      console.warn("Failed to format dependencies:", error);
      return "Error loading dependencies";
    }
  }

  static formatRequirements(requirements?: string[]): string {
    if (!requirements || requirements.length === 0) {
      return "None";
    }

    try {
      return requirements.join(", ");
    } catch (error) {
      console.warn("Failed to format requirements:", error);
      return "Error loading requirements";
    }
  }

  static formatComplexity(complexity?: string): string {
    if (!complexity) {
      return "unknown";
    }

    try {
      return complexity.toLowerCase().trim();
    } catch (error) {
      console.warn("Failed to format complexity:", error);
      return "unknown";
    }
  }

  static formatTestSummary(testStatus: any): string {
    try {
      const { passedTests, totalTests } = testStatus;

      if (totalTests === 0) {
        return "No tests run";
      }

      if (passedTests === totalTests) {
        return `${passedTests}/${totalTests} passed Success`;
      }

      if (passedTests === 0) {
        return `${passedTests}/${totalTests} passed Failed`;
      }

      return `${passedTests}/${totalTests} passed Warning`;
    } catch (error) {
      console.warn("Failed to format test summary:", error);
      return "Test summary unavailable";
    }
  }

  static formatCoverage(coverage: number): string {
    try {
      if (typeof coverage !== "number" || isNaN(coverage)) {
        return "";
      }

      const roundedCoverage = Math.round(coverage);

      if (roundedCoverage >= 90) {
        return `<span class="coverage-high">${roundedCoverage}% coverage</span>`;
      } else if (roundedCoverage >= 70) {
        return `<span class="coverage-medium">${roundedCoverage}% coverage</span>`;
      } else {
        return `<span class="coverage-low">${roundedCoverage}% coverage</span>`;
      }
    } catch (error) {
      console.warn("Failed to format coverage:", error);
      return "";
    }
  }

  static getCategoryIcon(category: string): string {
    const iconMap: Record<string, string> = {
      assertion: "Failed",
      type: "Search",
      filesystem: "Save",
      timeout: "Timer",
      network: "Network",
      unknown: "Question",
    };

    return iconMap[category] || iconMap.unknown;
  }

  static getCategoryColor(category: string): string {
    const colorMap: Record<string, string> = {
      assertion: "#f48771", // Red for assertion failures
      type: "#dcdcaa", // Yellow for type errors
      filesystem: "#569cd6", // Blue for filesystem issues
      timeout: "#d7ba7d", // Orange for timeouts
      network: "#c586c0", // Purple for network issues
      unknown: "#6a6a6a", // Gray for unknown categories
    };

    return colorMap[category] || colorMap.unknown;
  }

  static getStatusClass(status: TaskStatus): string {
    return status.replace("_", "-");
  }

  static getStatusDisplayName(status: TaskStatus): string {
    const statusMap: Record<string, string> = {
      not_started: "not started",
      in_progress: "in progress",
      review: "review",
      completed: "completed",
      blocked: "blocked",
      deprecated: "deprecated",
    };

    return statusMap[status] || status;
  }

  static getComplexityDisplayName(complexity?: string): string {
    const complexityMap: Record<string, string> = {
      low: "Low",
      medium: "Medium",
      high: "High",
    };

    return complexityMap[complexity || ""] || complexity || "";
  }

  static isValidMessage(message: any): boolean {
    try {
      // Check if message exists and has required structure
      if (!message || typeof message !== "object") {
        return false;
      }

      // Check if message has command property
      if (!message.command || typeof message.command !== "string") {
        return false;
      }

      // Validate message data structure for structured messages
      if (message.data && typeof message.data !== "object") {
        return false;
      }

      // Validate taskId for messages that require it
      const requiresTaskId = [
        "status-change",
        "cursor-execute",
        "action-button",
        "execute-cursor",
        "generate-prompt",
        "view-requirements",
        "continue-work",
        "mark-complete",
        "view-dependencies",
        "approve-complete",
        "request-changes",
        "view-implementation",
        "view-code",
        "view-tests",
        "history",
        "fix-failing-tests",
        "view-full-report",
        "rerun-tests",
        "view-blockers",
        "update-dependencies",
        "report-issue",
        "archive",
        "view-history",
      ];

      if (requiresTaskId.includes(message.command)) {
        const taskId = message.data?.taskId || message.taskId;
        if (!taskId || typeof taskId !== "string") {
          return false;
        }
      }

      // Validate status for status-change messages
      if (message.command === "status-change") {
        const newStatus = message.data?.newStatus;
        if (!newStatus || !Object.values(TaskStatus).includes(newStatus)) {
          return false;
        }
      }

      // Validate action for action-button messages
      if (message.command === "action-button") {
        const action = message.data?.action;
        if (!action || typeof action !== "string") {
          return false;
        }
      }

      // Task 3.3.10: Validate action for quick-action messages
      if (message.command === "quick-action") {
        const action = message.data?.action;
        if (!action || typeof action !== "string") {
          return false;
        }
      }

      return true;
    } catch (error) {
      console.error(`[TaskDetailCard] Error validating message:`, error);
      return false;
    }
  }
}