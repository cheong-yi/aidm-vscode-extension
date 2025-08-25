/**
 * TaskWebviewProvider Class
 * VSCode WebviewViewProvider implementation for task management webview
 * Requirements: 2.1, 3.1-3.6, 4.1-4.4
 * Task WV-001: Create WebviewViewProvider Base Class
 * Task WV-002: Implement HTML Template System
 *
 * This provider handles webview-based task management display with basic
 * HTML template generation infrastructure for future taskmaster dashboard.
 */

import * as vscode from "vscode";
import { Task } from "../../types/tasks";

/**
 * TaskWebviewProvider implements vscode.WebviewViewProvider to provide
 * the foundation for task management webview functionality.
 *
 * Single Responsibility: Create WebviewViewProvider class implementing
 * vscode.WebviewViewProvider interface with basic HTML rendering
 *
 * Integration Requirements:
 * - VSCode WebviewViewProvider interface compliance
 * - Basic HTML template generation infrastructure
 * - Webview options setup for future content rendering
 * - Foundation for webview message handling system
 */
export class TaskWebviewProvider implements vscode.WebviewViewProvider {
  /**
   * Webview instance for content management
   * Used to update webview content and handle communication
   */
  private _view?: vscode.WebviewView;

  /**
   * Constructor for TaskWebviewProvider
   * Initializes the provider without external dependencies
   */
  constructor() {}

  /**
   * Resolves the webview view when it becomes visible
   * Implements the required vscode.WebviewViewProvider interface method
   *
   * @param webviewView - The webview view to resolve
   * @param context - Context for the webview view resolution
   * @param token - Cancellation token for the operation
   */
  resolveWebviewView(
    webviewView: vscode.WebviewView,
    context: vscode.WebviewViewResolveContext,
    token: vscode.CancellationToken
  ): void | Thenable<void> {
    try {
      // Store reference to webview for future template updates
      this._view = webviewView;

      // Configure webview options for HTML content rendering
      webviewView.webview.options = {
        enableScripts: true,
        localResourceRoots: [],
      };

      // Set initial HTML content with empty tasks array
      webviewView.webview.html = this.getHtmlContent();
    } catch (error) {
      // Basic error handling for webview resolution
      console.error("Error resolving webview view:", error);
    }
  }

  /**
   * Generates HTML content for the webview with task data
   * Returns dynamic HTML template with data injection placeholders
   *
   * @param tasks - Array of tasks to display (defaults to empty array)
   * @returns HTML string for webview content
   */
  private getHtmlContent(tasks: Task[] = []): string {
    return this.generateTaskmasterHTML(tasks);
  }

  /**
   * Generates complete Taskmaster dashboard HTML with CSS and JavaScript
   * Converts mockup HTML to TypeScript template with data injection
   *
   * @param tasks - Array of tasks to render
   * @returns Complete HTML document string
   */
  private generateTaskmasterHTML(tasks: Task[]): string {
    const taskListHTML =
      tasks.length > 0
        ? tasks.map((task) => this.generateTaskItem(task)).join("")
        : '<div class="no-tasks">No tasks available</div>';

    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Taskmaster Dashboard</title>
    <style>
        ${this.getTaskmasterCSS()}
    </style>
</head>
<body>
    <div class="sidebar">
        <div class="sidebar-header">
            TASKMASTER DASHBOARD
            <div class="header-icons">${this.getHeaderIcons()}</div>
        </div>
        <div class="sidebar-content">
            <div class="task-list">
                ${taskListHTML}
            </div>
        </div>
    </div>
    ${this.getJavaScript()}
</body>
</html>`;
  }

  /**
   * Generates individual task item HTML with placeholder data
   * Creates task item structure following mockup design
   *
   * @param task - Task object to render
   * @returns HTML string for single task item
   */
  private generateTaskItem(task: Task): string {
    const isExecutable = task.isExecutable && task.status === "not_started";
    const executableClass = isExecutable ? " executable" : "";
    const statusClass = `task-status ${task.status.replace("_", "-")}`;
    const statusDisplayName =
      task.statusDisplayName || task.status.replace("_", " ");

    return `<div class="task-item${executableClass}" onclick="toggleTask(this)">
        <div class="task-header">
            <svg class="task-expand-icon" viewBox="0 0 16 16" fill="currentColor">
                <path d="m12.14 8.753-5.482 4.796c-.646.566-1.658.106-1.658-.753V3.204a1 1 0 0 1 1.659-.753l5.48 4.796a1 1 0 0 1 0 1.506z"/>
            </svg>
            <span class="task-id">${task.id}</span>
            <span class="task-title">${task.title}</span>
            <span class="${statusClass}">${statusDisplayName}</span>
        </div>
        <div class="task-details">
            <div class="task-description">
                ${task.description}
            </div>
            <div class="task-meta">
                <div class="meta-item">
                    <div class="meta-label">Complexity</div>
                    <div class="meta-value complexity-${task.complexity}">${
      task.complexity.charAt(0).toUpperCase() + task.complexity.slice(1)
    }</div>
                </div>
                <div class="meta-item">
                    <div class="meta-label">Estimated</div>
                    <div class="meta-value">${
                      task.estimatedDuration || "Not specified"
                    }</div>
                </div>
            </div>
            <div class="dependencies">
                <div class="dependencies-title">Dependencies</div>
                <div class="dependency-list">
                    ${
                      task.dependencies.length > 0
                        ? task.dependencies
                            .map(
                              (dep) =>
                                `<span class="dependency-tag">${dep}</span>`
                            )
                            .join("")
                        : '<span class="dependency-tag">None</span>'
                    }
                </div>
            </div>
            ${this.generateTestResults(task)}
            <div class="actions">
                ${this.generateActionButtons(task)}
            </div>
        </div>
    </div>`;
  }

  /**
   * Generates test results section HTML for a task
   * Renders test status information following mockup structure
   *
   * @param task - Task object with test status
   * @returns HTML string for test results section
   */
  private generateTestResults(task: Task): string {
    if (!task.testStatus) {
      return '<div class="no-tests">No tests available yet</div>';
    }

    const { testStatus } = task;
    const lastRunText = testStatus.lastRunDate
      ? `Last run: ${this.formatRelativeTime(testStatus.lastRunDate)}`
      : "Not run yet";

    return `<div class="test-results">
        <div class="test-header">
            <div class="test-title">Test Results</div>
            <div class="test-date">${lastRunText}</div>
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
        ${this.generateFailuresSection(testStatus)}
    </div>`;
  }

  /**
   * Generates failures section HTML for test results
   * Renders failing tests list following mockup structure
   *
   * @param testStatus - Test status object with failure information
   * @returns HTML string for failures section
   */
  private generateFailuresSection(testStatus: any): string {
    if (
      !testStatus.failingTestsList ||
      testStatus.failingTestsList.length === 0
    ) {
      return "";
    }

    const failuresHTML = testStatus.failingTestsList
      .map(
        (failure: any) => `
        <div class="failure-item">
            <div class="failure-name">${failure.name}</div>
            <div class="failure-message">${failure.message}</div>
        </div>
    `
      )
      .join("");

    return `<div class="failures-section">
        <div class="failures-header" onclick="toggleFailures(this.parentElement)">
            <span>${testStatus.failedTests} Failed Tests</span>
            <svg class="failure-toggle-icon" viewBox="0 0 16 16" fill="currentColor" width="12" height="12">
                <path d="m12.14 8.753-5.482 4.796c-.646.566-1.658.106-1.658-.753V3.204a1 1 0 0 1 1.659-.753l5.48 4.796a1 1 0 0 1 0 1.506z"/>
            </svg>
        </div>
        <div class="failures-list">
            ${failuresHTML}
        </div>
    </div>`;
  }

  /**
   * Generates action buttons HTML for a task
   * Renders status-specific action buttons following mockup structure
   *
   * @param task - Task object to generate actions for
   * @returns HTML string for action buttons
   */
  private generateActionButtons(task: Task): string {
    // Import STATUS_ACTIONS from types/tasks.ts for proper action mapping
    const STATUS_ACTIONS = {
      not_started: [
        "🤖 Execute with Cursor",
        "Generate Prompt",
        "View Requirements",
      ],
      in_progress: ["Continue Work", "Mark Complete", "View Dependencies"],
      review: ["Approve & Complete", "Request Changes", "View Implementation"],
      completed: ["View Code", "View Tests", "History"],
      blocked: ["View Blockers", "Update Dependencies", "Report Issue"],
      deprecated: ["Archive", "View History"],
    };

    const actions =
      STATUS_ACTIONS[task.status as keyof typeof STATUS_ACTIONS] || [];

    return actions
      .map((action, index) => {
        const isPrimary =
          index === 0 &&
          (task.status === "not_started" || task.status === "in_progress");
        const buttonClass = isPrimary ? "action-btn primary" : "action-btn";
        return `<button class="${buttonClass}">${action}</button>`;
      })
      .join("");
  }

  /**
   * Generates header icons HTML following mockup structure
   * Returns SVG icons for the dashboard header
   *
   * @returns HTML string for header icons
   */
  private getHeaderIcons(): string {
    return `<svg class="icon" viewBox="0 0 16 16" fill="currentColor">
        <path d="M8 3a5 5 0 1 0 4.546 2.914.5.5 0 0 1 .908-.417A6 6 0 1 1 8 2v1z"/>
        <path d="M8 4.466V.534a.25.25 0 0 1 .41-.192l2.36 1.966c.12.1.12.284 0 .384L8.41 4.658A.25.25 0 0 1 8 4.466z"/>
    </svg>
    <svg class="icon" viewBox="0 0 16 16" fill="currentColor">
        <path d="M8 9.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3z"/>
        <path d="M1.5 8a6.5 6.5 0 1 1 13 0 6.5 6.5 0 0 1-13 0z"/>
    </svg>`;
  }

  /**
   * Generates CSS styles following mockup design
   * Returns complete CSS for Taskmaster dashboard
   *
   * @returns CSS string for dashboard styling
   */
  private getTaskmasterCSS(): string {
    return `* {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: #1e1e1e;
            color: #cccccc;
            height: 100vh;
            display: flex;
        }

        .sidebar {
            width: 350px;
            background: #252526;
            border-right: 1px solid #3e3e42;
            display: flex;
            flex-direction: column;
            height: 100vh;
        }

        .sidebar-header {
            padding: 8px 16px;
            background: #2d2d30;
            border-bottom: 1px solid #3e3e42;
            font-size: 11px;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            display: flex;
            align-items: center;
            justify-content: space-between;
        }

        .header-icons {
            display: flex;
            gap: 4px;
        }

        .icon {
            width: 16px;
            height: 16px;
            cursor: pointer;
            opacity: 0.7;
            transition: opacity 0.2s;
        }

        .icon:hover {
            opacity: 1;
        }

        .sidebar-content {
            flex: 1;
            overflow-y: auto;
        }

        .task-list {
            padding: 0;
        }

        .task-item {
            border-bottom: 1px solid #3e3e42;
            background: #252526;
            transition: background 0.2s;
        }

        .task-item:hover {
            background: #2a2d2e;
        }

        .task-header {
            padding: 12px 16px;
            cursor: pointer;
            display: flex;
            align-items: center;
            gap: 12px;
            font-size: 13px;
            user-select: none;
        }

        .task-expand-icon {
            width: 12px;
            height: 12px;
            transition: transform 0.2s;
            flex-shrink: 0;
        }

        .task-item.expanded .task-expand-icon {
            transform: rotate(90deg);
        }

        .task-id {
            font-family: 'Courier New', monospace;
            font-size: 11px;
            background: #3e3e42;
            padding: 2px 6px;
            border-radius: 3px;
            color: #dcdcaa;
            flex-shrink: 0;
            min-width: 35px;
            text-align: center;
        }

        .task-title {
            flex: 1;
            font-weight: 500;
            line-height: 1.3;
        }

        .task-status {
            font-size: 10px;
            padding: 3px 8px;
            border-radius: 10px;
            font-weight: 600;
            flex-shrink: 0;
        }

        .task-status.not-started {
            background: #4a4a4a;
            color: #cccccc;
        }

        .task-status.in-progress {
            background: #569cd6;
            color: #ffffff;
        }

        .task-status.review {
            background: #dcdcaa;
            color: #1e1e1e;
        }

        .task-status.completed {
            background: #4ec9b0;
            color: #1e1e1e;
        }

        .task-status.blocked {
            background: #f48771;
            color: #1e1e1e;
        }

        .task-details {
            display: none;
            background: #2d2d30;
            border-top: 1px solid #3e3e42;
            padding: 16px;
        }

        .task-item.expanded .task-details {
            display: block;
        }

        .task-description {
            margin-bottom: 16px;
            font-size: 12px;
            line-height: 1.4;
            color: #d4d4d4;
        }

        .task-meta {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 12px;
            margin-bottom: 16px;
        }

        .meta-item {
            font-size: 11px;
        }

        .meta-label {
            color: #969696;
            margin-bottom: 2px;
        }

        .meta-value {
            color: #ffffff;
            font-weight: 500;
        }

        .complexity-low {
            color: #4ec9b0;
        }

        .complexity-medium {
            color: #dcdcaa;
        }

        .complexity-high {
            color: #f48771;
        }

        .dependencies {
            margin-bottom: 16px;
        }

        .dependencies-title {
            font-size: 11px;
            color: #969696;
            margin-bottom: 6px;
        }

        .dependency-list {
            display: flex;
            flex-wrap: wrap;
            gap: 4px;
        }

        .dependency-tag {
            background: #3e3e42;
            color: #dcdcaa;
            font-size: 10px;
            padding: 2px 6px;
            border-radius: 3px;
            font-family: 'Courier New', monospace;
        }

        .test-results {
            background: #1e1e1e;
            border: 1px solid #3e3e42;
            border-radius: 4px;
            padding: 12px;
            margin-bottom: 12px;
        }

        .test-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 8px;
        }

        .test-title {
            font-size: 11px;
            font-weight: 600;
            color: #ffffff;
        }

        .test-date {
            font-size: 10px;
            color: #969696;
        }

        .test-stats {
            display: flex;
            gap: 16px;
            margin-bottom: 8px;
        }

        .test-stat {
            text-align: center;
        }

        .test-stat-value {
            font-size: 14px;
            font-weight: 700;
            margin-bottom: 2px;
        }

        .test-stat-label {
            font-size: 9px;
            color: #969696;
            text-transform: uppercase;
        }

        .test-passed {
            color: #4ec9b0;
        }

        .test-failed {
            color: #f48771;
        }

        .test-total {
            color: #dcdcaa;
        }

        .failures-section {
            margin-top: 12px;
        }

        .failures-header {
            font-size: 10px;
            color: #f48771;
            font-weight: 600;
            margin-bottom: 6px;
            cursor: pointer;
            display: flex;
            align-items: center;
            gap: 4px;
        }

        .failures-list {
            display: none;
            font-size: 10px;
            color: #cccccc;
        }

        .failures-section.expanded .failures-list {
            display: block;
        }

        .failure-item {
            background: #2d2d30;
            border-left: 3px solid #f48771;
            padding: 6px 8px;
            margin-bottom: 4px;
            border-radius: 2px;
        }

        .failure-name {
            font-weight: 500;
            margin-bottom: 2px;
        }

        .failure-message {
            color: #969696;
            font-family: 'Courier New', monospace;
            font-size: 9px;
        }

        .actions {
            display: flex;
            gap: 8px;
            flex-wrap: wrap;
        }

        .action-btn {
            background: #3e3e42;
            border: none;
            color: #cccccc;
            padding: 6px 12px;
            border-radius: 3px;
            font-size: 10px;
            cursor: pointer;
            transition: background 0.2s;
        }

        .action-btn:hover {
            background: #4a4a4a;
        }

        .action-btn.primary {
            background: #569cd6;
            color: #ffffff;
        }

        .action-btn.primary:hover {
            background: #4a86c7;
        }

        .no-tests {
            font-size: 11px;
            color: #969696;
            font-style: italic;
            text-align: center;
            padding: 8px;
        }

        .no-tasks {
            font-size: 12px;
            color: #969696;
            font-style: italic;
            text-align: center;
            padding: 20px;
        }

        .task-item.executable .task-header {
            border-left: 3px solid #569cd6;
        }

        .cursor-icon {
            font-size: 12px;
            margin-left: 4px;
        }

        .section-divider {
            height: 1px;
            background: #3e3e42;
            margin: 12px 0;
        }

        .failure-toggle-icon {
            transition: transform 0.2s;
        }

        .failures-section.expanded .failure-toggle-icon {
            transform: rotate(90deg);
        }`;
  }

  /**
   * Generates JavaScript for interactive functionality
   * Returns JavaScript for task expansion and failures toggle
   *
   * @returns JavaScript string for webview functionality
   */
  private getJavaScript(): string {
    return `<script>
        function toggleTask(taskElement) {
            taskElement.classList.toggle('expanded');
        }

        function toggleFailures(failuresSection) {
            failuresSection.classList.toggle('expanded');
        }
    </script>`;
  }

  /**
   * Formats relative time from ISO date string
   * Simple relative time formatting for test results
   *
   * @param isoDate - ISO date string to format
   * @returns Relative time string
   */
  private formatRelativeTime(isoDate: string): string {
    try {
      const date = new Date(isoDate);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));

      if (diffHours < 1) return "Less than 1 hour ago";
      if (diffHours === 1) return "1 hour ago";
      if (diffHours < 24) return `${diffHours} hours ago`;

      const diffDays = Math.floor(diffHours / 24);
      if (diffDays === 1) return "1 day ago";
      return `${diffDays} days ago`;
    } catch (error) {
      return "Unknown time";
    }
  }
}
