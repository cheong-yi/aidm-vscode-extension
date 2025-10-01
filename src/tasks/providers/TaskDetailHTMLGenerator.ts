import { Task, TaskStatus, STATUS_ACTIONS } from "../types";
import { TaskDetailFormatters } from './TaskDetailFormatters';
import taskDetailsTemplate from './templates/task-details.html';
import emptyStateTemplate from './templates/empty-state.html';
import taskDetailsStyles from './styles/task-details.css';
import emptyStateStyles from './styles/empty-state.css';
import taskDetailsScript from './scripts/task-details.js';
import emptyStateScript from './scripts/empty-state.js';

/**
 * Generates HTML content for task detail display
 * Owns all template imports and HTML assembly logic
 */
export class TaskDetailHTMLGenerator {

  generateTaskDetailsHTML(task: Task): string {
    try {
      const executableIndicator = task.isExecutable
        ? '<span class="executable-indicator">🤖</span>'
        : "";

      return taskDetailsTemplate
        .replace(/{{TASK_ID}}/g, task.id)
        .replace(/{{TASK_TITLE}}/g, task.title)
        .replace(/{{TASK_DESCRIPTION}}/g, task.description || '')
        .replace(/{{STATUS_CLASS}}/g, TaskDetailFormatters.getStatusClass(task.status))
        .replace(/{{STATUS_DISPLAY}}/g, TaskDetailFormatters.getStatusDisplayName(task.status))
        .replace(/{{COMPLEXITY_CLASS}}/g, `complexity-${TaskDetailFormatters.formatComplexity(task.complexity)}`)
        .replace(/{{COMPLEXITY_DISPLAY}}/g, TaskDetailFormatters.getComplexityDisplayName(task.complexity))
        .replace(/{{ESTIMATED_DURATION}}/g, TaskDetailFormatters.formatEstimatedDuration(task.estimatedDuration))
        .replace(/{{EXECUTABLE_INDICATOR}}/g, executableIndicator)
        .replace(/{{DEPENDENCIES}}/g, this.renderDependencies(task.dependencies))
        .replace(/{{TEST_RESULTS_SECTION}}/g, this.renderTestResultsSection(task))
        .replace(/{{ACTION_BUTTONS}}/g, this.renderActionButtons(task))
        .replace(/{{STYLES}}/g, taskDetailsStyles)
        .replace(/{{SCRIPT}}/g, taskDetailsScript);
    } catch (error) {
      console.error("Failed to generate task details HTML:", error);
      return this.generateFallbackHTML(task);
    }
  }

  generateEmptyStateHTML(): string {
    try {
      return emptyStateTemplate
        .replace(/{{TASK_DETAILS_STYLES}}/g, taskDetailsStyles)
        .replace(/{{EMPTY_STATE_STYLES}}/g, emptyStateStyles)
        .replace(/{{SCRIPT}}/g, emptyStateScript);
    } catch (error) {
      console.error("Failed to generate empty state HTML:", error);
      return this.generateFallbackEmptyStateHTML();
    }
  }

  generateFallbackHTML(task: Task): string {
    return `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Task Details - ${task.id}</title>
        <style>
          ${taskDetailsStyles}
          .fallback { text-align: center; padding: 20px; }
          .error { color: #f48771; margin-bottom: 10px; }
        </style>
      </head>
      <body>
        <div class="fallback">
          <div class="error">Warning Error loading task details</div>
          <h3>Task <span data-task-field="id"></span>: <span data-task-field="title"></span></h3>
          <p>Status: ${task.status}</p>
          <p>Description: <span data-task-field="description"></span></p>
          <p>Please try refreshing the view or contact support if the problem persists.</p>
        </div>

        <script>
          // Acquire VSCode API for webview communication (fallback state)
          const vscode = acquireVsCodeApi();

          // Initialize webview with message handling capability
          document.addEventListener('DOMContentLoaded', function() {
            console.log('TaskDetailCardProvider webview initialized (fallback state)');
          });
        </script>
      </body>
      </html>
    `;
  }

  generateFallbackEmptyStateHTML(): string {
    return `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>No Task Selected</title>
        <style>
          ${taskDetailsStyles}
          .fallback-empty {
            text-align: center;
            padding: 40px 20px;
            color: var(--vscode-descriptionForeground, #969696);
          }
          .fallback-icon {
            font-size: 48px;
            margin-bottom: 16px;
            opacity: 0.7;
          }
          .fallback-title {
            color: var(--vscode-foreground, #ffffff);
            margin-bottom: 16px;
            font-size: 16px;
          }
          .fallback-text {
            color: var(--vscode-descriptionForeground, #d4d4d4);
            margin-bottom: 8px;
            font-size: 13px;
            line-height: 1.4;
          }
        </style>
      </head>
      <body>
        <div class="fallback-empty">
          <div class="fallback-icon">Clipboard</div>
          <h3 class="fallback-title">No Task Selected</h3>
          <p class="fallback-text">Select a task from the tree view above to see detailed information.</p>
          <p class="fallback-text">Please try refreshing the view or contact support if the problem persists.</p>
        </div>

        <script>
          const vscode = acquireVsCodeApi();
          document.addEventListener('DOMContentLoaded', function() {
            console.log('TaskDetailCardProvider fallback empty state initialized');
          });
        </script>
      </body>
      </html>
    `;
  }

  // Private helper methods (to be implemented)
  private renderDependencies(dependencies: string[]): string {
    if (!dependencies || dependencies.length === 0) {
      return '<span class="dependency-tag">None</span>';
    }

    return dependencies
      .map(
        (dep, index) => `<span class="dependency-tag" data-dependency-index="${index}"></span>`
      )
      .join("");
  }

  private renderTestResultsSection(task: Task): string {
    if (!task.testStatus) {
      return '<div class="no-tests">No tests available yet</div>';
    }

    const { testStatus } = task;
    const hasFailures =
      testStatus.failingTestsList && testStatus.failingTestsList.length > 0;

    return `
      <div class="test-results">
        <div class="test-header">
          <div class="test-title">Test Results</div>
          <div class="test-date">Last run: {{LAST_RUN_DATE}}</div>
        </div>
        <div class="test-stats">
          <div class="test-stat">
            <div class="test-stat-value test-total">${
              testStatus.totalTests
            }</div>
            <div class="test-stat-label">Total</div>
          </div>
          <div class="test-stat">
            <div class="test-stat-value test-passed">${
              testStatus.passedTests
            }</div>
            <div class="test-stat-label">Passed</div>
          </div>
          <div class="test-stat">
            <div class="test-stat-value test-failed">${
              testStatus.failedTests
            }</div>
            <div class="test-stat-label">Failed</div>
          </div>
        </div>
        ${
          hasFailures
            ? this.renderFailuresSection(testStatus.failingTestsList!)
            : ""
        }
      </div>
    `;
  }

  private renderActionButtons(task: Task): string {
    try {
      // Get actions for the task status from STATUS_ACTIONS mapping
      let actions = this.getActionsForStatus(task.status);

      if (actions.length === 0) {
        return '<div class="no-tests">No actions available for this task status</div>';
      }

      // Filter out Cursor action for non-executable tasks
      if (task.status === "not_started" && !task.isExecutable) {
        actions = actions.filter((action) => !action.includes("Robot"));
      }

      // Special handling for completed tasks with test failures
      if (
        task.status === "completed" &&
        task.testStatus &&
        task.testStatus.failedTests > 0
      ) {
        return this.renderCompletedTaskWithFailures(task);
      }

      // Render buttons using STATUS_ACTIONS mapping with proper task context
      const buttons = actions.map((action) => {
        // Check if this action should be executable for the current task
        const isExecutableAction = this.isExecutableAction(action, task);
        const buttonClass = isExecutableAction
          ? "action-btn primary"
          : "action-btn";
        const actionKey = this.getActionKey(action);

        return `<button class="${buttonClass}" data-action="${actionKey}" data-task-id="${task.id}">${action}</button>`;
      });

      return `<div class="actions">${buttons.join("")}</div>`;
    } catch (error) {
      console.error("Failed to render action buttons:", error);
      return '<div class="no-tests">Error loading actions</div>';
    }
  }

  private renderFailuresSection(failures: any[]): string {
    if (!failures || failures.length === 0) {
      return "";
    }

    // Use the enhanced collapsible failures rendering
    return this.renderCollapsibleFailures(failures);
  }

  private renderCollapsibleFailures(failures: any[]): string {
    if (!failures || failures.length === 0) {
      return "";
    }

    const failureItems = failures
      .map((failure) => this.renderFailureItem(failure))
      .join("");

    return `
      <div class="failures-section" onclick="toggleFailures(this, event)">
        <div class="failures-header">
          <svg class="task-expand-icon" viewBox="0 0 16 16" fill="currentColor" width="12" height="12">
            <path d="m12.14 8.753-5.482 4.796c-.646.566-1.658.106-1.658-.753V3.204a1 1 0 0 1 1.659-.753l5.48 4.796a1 1 0 0 1 0 1.506z"/>
          </svg>
          Failed Tests (${failures.length})
        </div>
        <div class="failures-list">
          ${failureItems}
        </div>
      </div>
    `;
  }

  private renderFailureItem(failure: any): string {
    const category = failure.category || "unknown";
    const categoryIcon = TaskDetailFormatters.getCategoryIcon(category);
    const categoryColor = TaskDetailFormatters.getCategoryColor(category);

    return `
      <div class="failure-item ${category}" style="border-left-color: ${categoryColor}">
        <div class="failure-header">
          <span class="failure-category-icon">${categoryIcon}</span>
          <span class="failure-category-badge">${category}</span>
        </div>
        <div class="failure-name" data-failure-field="name"></div>
        <div class="failure-message" data-failure-field="message"></div>
        <div class="failure-stacktrace" data-failure-field="stackTrace" style="display: none;"></div>
      </div>
    `;
  }

  private renderCompletedTaskWithFailures(task: Task): string {
    const testFailureActions = [
      "Fix Failing Tests",
      "View Full Report",
      "Rerun Tests",
    ];

    const buttons = testFailureActions.map((action) => {
      const actionKey = this.getActionKey(action);
      return `<button class="action-btn" data-action="${actionKey}" data-task-id="${task.id}">${action}</button>`;
    });

    return `<div class="actions">${buttons.join("")}</div>`;
  }

  private getActionsForStatus(status: TaskStatus): string[] {
    return STATUS_ACTIONS[status] || [];
  }

  private renderButton(action: string, taskId: string): string {
    // Create a mock task context to check if this is an executable action
    const mockTask: Task = {
      id: taskId,
      title: "",
      description: "",
      status: "not_started" as TaskStatus,
      complexity: "low" as any,
      dependencies: [],
      requirements: [],
      createdDate: "",
      lastModified: "",
      isExecutable: true, // Assume executable for NOT_STARTED tasks
    };

    const isExecutableAction = this.isExecutableAction(action, mockTask);
    const buttonClass = isExecutableAction
      ? "action-btn cursor-btn"
      : "action-btn";
    const actionKey = this.getActionKey(action);

    return `<button class="${buttonClass}" data-action="${actionKey}" data-task-id="${taskId}">${action}</button>`;
  }

  private isExecutableAction(action: string, task: Task): boolean {
    // Only "Robot Execute with Cursor" action is executable
    // Task must be NOT_STARTED and have isExecutable = true
    return (
      action.includes("Robot") &&
      task.status === "not_started" &&
      task.isExecutable === true
    );
  }

  private getActionKey(action: string): string {
    const actionKeyMap: Record<string, string> = {
      "Robot Execute with Cursor": "robot-execute-with-cursor",
      "Generate Prompt": "generate-prompt",
      "View Requirements": "view-requirements",
      "Continue Work": "continue-work",
      "Mark Complete": "mark-complete",
      "View Dependencies": "view-dependencies",
      "Approve & Complete": "approve-complete",
      "Request Changes": "request-changes",
      "View Implementation": "view-implementation",
      "View Code": "view-code",
      "View Tests": "view-tests",
      History: "history",
      "Fix Failing Tests": "fix-failing-tests",
      "View Full Report": "view-full-report",
      "Rerun Tests": "rerun-tests",
      "View Blockers": "view-blockers",
      "Update Dependencies": "update-dependencies",
      "Report Issue": "report-issue",
      Archive: "archive",
      "View History": "view-history",
    };

    return actionKeyMap[action] || action.toLowerCase().replace(/\s+/g, "-");
  }
}