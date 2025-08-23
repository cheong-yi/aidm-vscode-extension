/**
 * TaskDetailCardProvider Class
 * VSCode WebviewViewProvider implementation for task detail display
 * Requirements: 2.1, 2.2 - Task detail display with expandable content
 * Task 3.3.1: Create TaskDetailCardProvider class structure
 *
 * This provider handles webview-based task detail display matching the expandable
 * list mockup design from taskmaster_mockup.html.
 */

import * as vscode from "vscode";
import { Task, TaskStatus, STATUS_ACTIONS } from "../types";
import { TimeFormattingUtility } from "../../utils/TimeFormattingUtility";

/**
 * TaskDetailCardProvider implements vscode.WebviewViewProvider to display
 * detailed task information in an expandable webview panel.
 *
 * Integration Requirements:
 * - VSCode WebviewViewProvider interface compliance
 * - Event emitter preparation for tree view integration
 * - Webview options setup for HTML content rendering
 */
export class TaskDetailCardProvider implements vscode.WebviewViewProvider {
  /**
   * Event emitter for task selection changes
   * Used to notify when a task is selected from the tree view
   */
  private readonly _onTaskSelected: vscode.EventEmitter<Task>;
  public readonly onTaskSelected: vscode.Event<Task>;

  /**
   * Event emitter for task status changes
   * Used to notify when a task status is updated
   */
  private readonly _onStatusChanged: vscode.EventEmitter<{
    taskId: string;
    newStatus: TaskStatus;
  }>;
  public readonly onStatusChanged: vscode.Event<{
    taskId: string;
    newStatus: TaskStatus;
  }>;

  /**
   * Event emitter for test results updates
   * Used to notify when test results are updated for a task
   */
  private readonly _onTestResultsUpdated: vscode.EventEmitter<{
    taskId: string;
    testStatus: any; // TestStatus type will be refined in future tasks
  }>;
  public readonly onTestResultsUpdated: vscode.Event<{
    taskId: string;
    testStatus: any;
  }>;

  /**
   * Event emitter for Cursor execution requests
   * Used to notify when user requests Cursor AI integration
   */
  private readonly _onCursorExecuteRequested: vscode.EventEmitter<{
    taskId: string;
  }>;
  public readonly onCursorExecuteRequested: vscode.Event<{
    taskId: string;
  }>;

  /**
   * Currently selected task for display
   * Used to maintain state between webview updates
   */
  private currentTask: Task | null = null;

  /**
   * Webview instance for content management
   * Used to update webview content and handle communication
   */
  private webview: vscode.WebviewView | null = null;

  /**
   * Disposable collection for proper resource cleanup
   * Follows VSCode extension best practices for resource management
   */
  private readonly disposables: vscode.Disposable[] = [];

  /**
   * Time formatting utility for duration and date formatting
   * Used for enhanced metadata display
   */
  protected readonly timeFormatter: TimeFormattingUtility;

  constructor() {
    // Initialize time formatting utility
    this.timeFormatter = new TimeFormattingUtility();

    // Initialize event emitters for webview communication
    this._onTaskSelected = new vscode.EventEmitter<Task>();
    this.onTaskSelected = this._onTaskSelected.event;

    this._onStatusChanged = new vscode.EventEmitter<{
      taskId: string;
      newStatus: TaskStatus;
    }>();
    this.onStatusChanged = this._onStatusChanged.event;

    this._onTestResultsUpdated = new vscode.EventEmitter<{
      taskId: string;
      testStatus: any;
    }>();
    this.onTestResultsUpdated = this._onTestResultsUpdated.event;

    this._onCursorExecuteRequested = new vscode.EventEmitter<{
      taskId: string;
    }>();
    this.onCursorExecuteRequested = this._onCursorExecuteRequested.event;

    // Add event emitters to disposables for cleanup
    this.disposables.push(
      this._onTaskSelected,
      this._onStatusChanged,
      this._onTestResultsUpdated,
      this._onCursorExecuteRequested
    );
  }

  /**
   * Resolves the webview view when requested by VSCode
   * This method is called by VSCode when the webview needs to be created or updated
   *
   * @param webviewView - The webview view instance provided by VSCode
   * @param context - Context information about the webview resolution
   * @param token - Cancellation token for the operation
   */
  public resolveWebviewView(
    webviewView: vscode.WebviewView,
    context: vscode.WebviewViewResolveContext,
    token: vscode.CancellationToken
  ): void | Thenable<void> {
    try {
      // Store webview reference for content updates
      this.webview = webviewView;

      // Configure webview options for optimal user experience
      webviewView.webview.options = {
        enableScripts: true, // Enable JavaScript for interactive content
        localResourceRoots: [], // No local resources for now
      };

      // Set initial webview title
      webviewView.title = "Task Details";

      // Set initial HTML content (will be enhanced in future tasks)
      this.showNoTaskSelected();

      // Handle webview disposal
      webviewView.onDidDispose(() => {
        this.webview = null;
      });

      // Handle webview visibility changes
      webviewView.onDidChangeVisibility(() => {
        if (webviewView.visible && this.currentTask) {
          // Refresh content when webview becomes visible
          this.updateTaskDetails(this.currentTask);
        }
      });

      // Handle webview messages from JavaScript content
      webviewView.webview.onDidReceiveMessage(
        (message) => {
          this.handleWebviewMessage(message);
        },
        undefined,
        this.disposables
      );
    } catch (error) {
      // Log error and continue without webview functionality
      console.error("Failed to resolve webview view:", error);
      this.webview = null;
    }
  }

  /**
   * Updates the task details displayed in the webview
   * Called when a task is selected from the tree view
   *
   * @param task - The task to display details for
   */
  public updateTaskDetails(task: Task): void {
    try {
      this.currentTask = task;

      if (this.webview && this.webview.visible) {
        // Update webview content with task details
        // HTML content generation will be implemented in future tasks
        this.webview.webview.html = this.generateTaskDetailsHTML(task);
      }
    } catch (error) {
      console.error("Failed to update task details:", error);
    }
  }

  /**
   * Clears the task details and shows empty state
   * Called when no task is selected or when clearing the display
   */
  public clearDetails(): void {
    try {
      this.currentTask = null;

      if (this.webview && this.webview.visible) {
        this.showNoTaskSelected();
      }
    } catch (error) {
      console.error("Failed to clear task details:", error);
    }
  }

  /**
   * Shows the "no task selected" state in the webview
   * Called when no task is selected or when initializing the provider
   */
  public showNoTaskSelected(): void {
    try {
      if (this.webview && this.webview.visible) {
        this.webview.webview.html = this.generateNoTaskSelectedHTML();
      }
    } catch (error) {
      console.error("Failed to show no task selected state:", error);
    }
  }

  /**
   * Renders test failures in HTML format with collapsible functionality
   * Called when displaying test results for a task
   *
   * @param failures - Array of failing test information
   * @returns HTML string for test failures display
   */
  public renderTestFailures(failures: any[]): string {
    if (!failures || failures.length === 0) {
      return '<div class="no-failures">No test failures</div>';
    }

    return this.renderCollapsibleFailures(failures);
  }

  /**
   * Renders collapsible failures section with enhanced error categorization
   * Called when displaying test failures with expand/collapse functionality
   *
   * @param failures - Array of FailingTest objects
   * @returns HTML string for collapsible failures section
   */
  public renderCollapsibleFailures(failures: any[]): string {
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

  /**
   * Renders individual failure item with error categorization
   * Called when displaying individual failing test details
   *
   * @param failure - FailingTest object to render
   * @returns HTML string for individual failure item
   */
  public renderFailureItem(failure: any): string {
    const category = failure.category || "unknown";
    const categoryIcon = this.getCategoryIcon(category);
    const categoryColor = this.getCategoryColor(category);

    return `
      <div class="failure-item ${category}" style="border-left-color: ${categoryColor}">
        <div class="failure-header">
          <span class="failure-category-icon">${categoryIcon}</span>
          <span class="failure-category-badge">${category}</span>
        </div>
        <div class="failure-name">${this.escapeHtml(failure.name)}</div>
        <div class="failure-message">${this.escapeHtml(failure.message)}</div>
        ${
          failure.stackTrace
            ? `<div class="failure-stacktrace">${this.escapeHtml(
                failure.stackTrace
              )}</div>`
            : ""
        }
      </div>
    `;
  }

  /**
   * Gets appropriate icon for error category
   * Called when displaying error category visual indicators
   *
   * @param category - Error category string
   * @returns Icon string for the category
   */
  public getCategoryIcon(category: string): string {
    const iconMap: Record<string, string> = {
      assertion: "❌",
      type: "🔍",
      filesystem: "💾",
      timeout: "⏰",
      network: "🌐",
      unknown: "❓",
    };

    return iconMap[category] || iconMap.unknown;
  }

  /**
   * Gets appropriate color for error category
   * Called when styling error category visual indicators
   *
   * @param category - Error category string
   * @returns CSS color value for the category
   */
  public getCategoryColor(category: string): string {
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

  /**
   * Renders executable actions for a task
   * Called when displaying actions for executable tasks
   *
   * @param task - The task to render actions for
   * @returns HTML string for executable actions
   */
  public renderExecutableActions(task: Task): string {
    if (!task.isExecutable) {
      return '<div class="no-executable-actions">Task is not executable</div>';
    }

    return `
      <div class="executable-actions">
        <button class="action-btn primary" onclick="handleActionClick('executeWithCursor', '${task.id}')">
          🤖 Execute with Cursor
        </button>
        <button class="action-btn" onclick="handleActionClick('generatePrompt', '${task.id}')">
          Generate Prompt
        </button>
        <button class="action-btn" onclick="handleActionClick('viewRequirements', '${task.id}')">
          View Requirements
        </button>
      </div>
    `;
  }

  /**
   * Renders status-specific actions for a task
   * Called when displaying actions based on task status
   *
   * @param task - The task to render status actions for
   * @returns HTML string for status-specific actions
   */
  public renderStatusSpecificActions(task: Task): string {
    return this.renderActionButtons(task);
  }

  /**
   * Formats relative time from ISO date string
   * Called when displaying timestamps in relative format
   *
   * @param isoDate - ISO date string to format
   * @returns Formatted relative time string
   */
  public formatRelativeTime(isoDate: string): string {
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

  /**
   * Generates HTML content for task details display
   * Called when updating webview content with task information
   *
   * @param task - The task to generate HTML for
   * @returns HTML string for task details
   */
  private generateTaskDetailsHTML(task: Task): string {
    try {
      return `
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Task Details - ${task.id}</title>
                    <style>
            ${this.generateCSS()}
          </style>
        </head>
        <body>
          <div class="task-details">
            <!-- Task Header Section -->
            <div class="task-header">
              <div class="task-title">${this.escapeHtml(task.title)}</div>
              <div>
                <span class="task-id">${this.escapeHtml(task.id)}</span>
                <span class="status-badge ${this.getStatusClass(
                  task.status
                )}">${this.getStatusDisplayName(task.status)}</span>
                ${
                  task.isExecutable
                    ? '<span class="executable-indicator">🤖</span>'
                    : ""
                }
              </div>
            </div>
            
            <!-- Task Description Section -->
            <div class="task-description">
              <p>${this.escapeHtml(task.description)}</p>
            </div>
            
            <!-- Metadata Grid Section -->
            <div class="task-meta">
              <div class="meta-item">
                <div class="meta-label">Complexity</div>
                <div class="meta-value complexity-${this.formatComplexity(
                  task.complexity
                )}">${this.getComplexityDisplayName(task.complexity)}</div>
              </div>
              <div class="meta-item">
                <div class="meta-label">Duration</div>
                <div class="meta-value duration">${this.formatEstimatedDuration(
                  task.estimatedDuration
                )}</div>
              </div>
              <div class="meta-item">
                <div class="meta-label">Dependencies</div>
                <div class="meta-value dependencies">${this.formatDependencies(
                  task.dependencies
                )}</div>
              </div>
              <div class="meta-item">
                <div class="meta-label">Requirements</div>
                <div class="meta-value requirements">${this.formatRequirements(
                  task.requirements
                )}</div>
              </div>
              <div class="meta-item">
                <div class="meta-label">Created</div>
                <div class="meta-value created-date">${this.timeFormatter.formatRelativeTime(
                  task.createdDate
                )}</div>
              </div>
              <div class="meta-item">
                <div class="meta-label">Modified</div>
                <div class="meta-value modified-date">${this.timeFormatter.formatRelativeTime(
                  task.lastModified
                )}</div>
              </div>
            </div>
            
            <!-- Dependencies Section -->
            <div class="dependencies">
              <div class="dependencies-title">Dependencies</div>
              <div class="dependency-list">
                ${this.renderDependencies(task.dependencies)}
              </div>
            </div>
            
            <!-- Test Results Section -->
            ${this.renderTestResultsSection(task)}
            
            <!-- Action Buttons Section -->
            <div class="action-buttons">
              ${this.renderActionButtons(task)}
            </div>
          </div>
          
          <script>
            // Handle failures section expansion with smooth animations
            function toggleFailures(failuresElement, event) {
              event.stopPropagation();
              
              const failuresList = failuresElement.querySelector('.failures-list');
              const expandIcon = failuresElement.querySelector('.task-expand-icon');
              
              if (failuresElement.classList.contains('expanded')) {
                // Collapse
                failuresElement.classList.remove('expanded');
                if (failuresList) {
                  failuresList.style.display = 'none';
                }
                if (expandIcon) {
                  expandIcon.style.transform = 'rotate(0deg)';
                }
              } else {
                // Expand
                failuresElement.classList.add('expanded');
                if (failuresList) {
                  failuresList.style.display = 'block';
                }
                if (expandIcon) {
                  expandIcon.style.transform = 'rotate(90deg)';
                }
              }
            }
            
            // Handle action button clicks
            function handleActionClick(action, taskId) {
              vscode.postMessage({
                command: action,
                taskId: taskId
              });
            }
            
            // Add event delegation for action buttons
            document.addEventListener('click', function(event) {
              const button = event.target.closest('.action-btn');
              if (button) {
                const action = button.getAttribute('data-action');
                const taskId = button.getAttribute('data-task-id');
                if (action && taskId) {
                  vscode.postMessage({
                    command: action,
                    taskId: taskId
                  });
                }
              }
            });
            
            // Initialize failures sections on page load
            document.addEventListener('DOMContentLoaded', function() {
              const failuresSections = document.querySelectorAll('.failures-section');
              failuresSections.forEach(section => {
                // Ensure all sections start collapsed
                section.classList.remove('expanded');
                const failuresList = section.querySelector('.failures-list');
                if (failuresList) {
                  failuresList.style.display = 'none';
                }
                const expandIcon = section.querySelector('.task-expand-icon');
                if (expandIcon) {
                  expandIcon.style.transform = 'rotate(0deg)';
                }
              });
            });
          </script>
        </body>
        </html>
      `;
    } catch (error) {
      console.error("Failed to generate task details HTML:", error);
      return this.generateFallbackHTML(task);
    }
  }

  /**
   * Generates complete CSS styling for task details webview
   * Called when generating HTML content to ensure consistent styling
   *
   * @returns Complete CSS string matching mockup design exactly
   */
  private generateCSS(): string {
    return `
      /* Reset and base styles */
      * {
        margin: 0;
        padding: 0;
        box-sizing: border-box;
      }

      body {
        font-family: var(--vscode-font-family, 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif);
        background: var(--vscode-editor-background, #1e1e1e);
        color: var(--vscode-foreground, #cccccc);
        margin: 0;
        padding: 0;
        line-height: 1.4;
        font-size: 13px;
      }

      /* Main container styling */
      .task-details {
        padding: 16px;
        background: var(--vscode-panel-background, #2d2d30);
        border-top: 1px solid var(--vscode-panel-border, #3e3e42);
        min-height: 100vh;
      }

      /* Task header section */
      .task-header {
        margin-bottom: 16px;
        padding-bottom: 12px;
        border-bottom: 1px solid var(--vscode-panel-border, #3e3e42);
      }

      .task-title {
        font-size: 14px;
        font-weight: 600;
        color: var(--vscode-foreground, #ffffff);
        margin-bottom: 8px;
        line-height: 1.3;
        word-wrap: break-word;
      }

      .task-id {
        font-family: 'Courier New', monospace;
        font-size: 11px;
        background: var(--vscode-panel-border, #3e3e42);
        padding: 2px 6px;
        border-radius: 3px;
        color: #dcdcaa;
        display: inline-block;
        margin-bottom: 8px;
        min-width: 35px;
        text-align: center;
      }

      /* Status badge styling - exact colors from mockup */
      .status-badge {
        font-size: 10px;
        padding: 3px 8px;
        border-radius: 10px;
        font-weight: 600;
        display: inline-block;
        margin-left: 8px;
        text-transform: lowercase;
      }

      .status-badge.not-started {
        background: #4a4a4a;
        color: #cccccc;
      }

      .status-badge.in-progress {
        background: #569cd6;
        color: #ffffff;
      }

      .status-badge.review {
        background: #dcdcaa;
        color: #1e1e1e;
      }

      .status-badge.completed {
        background: #4ec9b0;
        color: #1e1e1e;
      }

      .status-badge.blocked {
        background: #f48771;
        color: #1e1e1e;
      }

      .status-badge.deprecated {
        background: #6a6a6a;
        color: #cccccc;
      }

      /* Task description */
      .task-description {
        margin-bottom: 16px;
        font-size: 12px;
        line-height: 1.4;
        color: var(--vscode-descriptionForeground, #d4d4d4);
      }

      .task-description p {
        margin: 0;
      }

      /* Metadata grid layout - enhanced for 6 metadata items */
      .task-meta {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 12px;
        margin-bottom: 16px;
      }

      /* Enhanced metadata styling for specific fields */
      .meta-value.duration {
        color: var(--vscode-foreground, #ffffff);
      }

      .meta-value.dependencies {
        color: #dcdcaa;
        font-family: 'Courier New', monospace;
        font-size: 11px;
      }

      .meta-value.requirements {
        color: #dcdcaa;
        font-family: 'Courier New', monospace;
        font-size: 11px;
      }

      .meta-value.created-date,
      .meta-value.modified-date {
        color: var(--vscode-descriptionForeground, #969696);
        font-size: 11px;
      }

      .meta-item {
        font-size: 11px;
      }

      .meta-label {
        color: var(--vscode-descriptionForeground, #969696);
        margin-bottom: 2px;
        font-size: 10px;
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }

      .meta-value {
        color: var(--vscode-foreground, #ffffff);
        font-weight: 500;
        font-size: 12px;
      }

      /* Complexity color coding */
      .complexity-low {
        color: #4ec9b0;
      }

      .complexity-medium {
        color: #dcdcaa;
      }

      .complexity-high {
        color: #f48771;
      }

      /* Dependencies section */
      .dependencies {
        margin-bottom: 16px;
      }

      .dependencies-title {
        font-size: 11px;
        color: var(--vscode-descriptionForeground, #969696);
        margin-bottom: 6px;
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }

      .dependency-list {
        display: flex;
        flex-wrap: wrap;
        gap: 4px;
      }

      .dependency-tag {
        background: var(--vscode-panel-border, #3e3e42);
        color: #dcdcaa;
        font-size: 10px;
        padding: 2px 6px;
        border-radius: 3px;
        font-family: 'Courier New', monospace;
        border: 1px solid transparent;
        transition: border-color 0.2s;
      }

      .dependency-tag:hover {
        border-color: var(--vscode-focusBorder, #007acc);
      }

      /* Test results section */
      .test-results {
        background: var(--vscode-editor-background, #1e1e1e);
        border: 1px solid var(--vscode-panel-border, #3e3e42);
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
        color: var(--vscode-foreground, #ffffff);
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }

      .test-date {
        font-size: 10px;
        color: var(--vscode-descriptionForeground, #969696);
      }

      .test-summary {
        margin-bottom: 8px;
        font-size: 11px;
        color: var(--vscode-descriptionForeground, #969696);
      }

      .test-summary-stats {
        display: flex;
        align-items: center;
        gap: 8px;
        flex-wrap: wrap;
      }

      .test-summary-text {
        font-weight: 500;
        color: var(--vscode-foreground, #ffffff);
      }

      .test-coverage {
        font-weight: 500;
        color: var(--vscode-foreground, #ffffff);
      }

      .test-stats {
        display: flex;
        gap: 16px;
        margin-bottom: 8px;
      }

      .test-stat {
        text-align: center;
        flex: 1;
      }

      .test-stat-value {
        font-size: 14px;
        font-weight: 700;
        margin-bottom: 2px;
        display: block;
      }

      .test-stat-label {
        font-size: 9px;
        color: var(--vscode-descriptionForeground, #969696);
        text-transform: uppercase;
        letter-spacing: 0.5px;
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

      /* Test suite info */
      .test-suite {
        font-size: 10px;
        color: var(--vscode-descriptionForeground, #969696);
        margin-top: 8px;
        margin-bottom: 8px;
        padding: 4px 8px;
        background: var(--vscode-panel-background, #2d2d30);
        border-radius: 3px;
        display: inline-block;
      }

      /* Coverage styling */
      .coverage-low {
        color: #f48771;
      }

      .coverage-medium {
        color: #dcdcaa;
      }

      .coverage-high {
        color: #4ec9b0;
      }

      /* Failures section */
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
        user-select: none;
        transition: color 0.2s;
      }

      .failures-header:hover {
        color: #ff6b6b;
      }

      .failures-header svg {
        width: 12px;
        height: 12px;
        transition: transform 0.2s;
      }

      .failures-section.expanded .failures-header svg {
        transform: rotate(90deg);
      }

      .failures-list {
        display: none;
        font-size: 10px;
        color: var(--vscode-foreground, #cccccc);
        margin-top: 8px;
      }

      .failures-section.expanded .failures-list {
        display: block;
      }

      .failure-item {
        background: var(--vscode-panel-background, #2d2d30);
        border-left: 3px solid #f48771;
        padding: 8px 10px;
        margin-bottom: 6px;
        border-radius: 3px;
        transition: all 0.2s;
        position: relative;
      }

      .failure-item:hover {
        background: var(--vscode-panel-border, #3e3e42);
        transform: translateX(2px);
      }

      .failure-header {
        display: flex;
        align-items: center;
        gap: 6px;
        margin-bottom: 6px;
      }

      .failure-category-icon {
        font-size: 12px;
        display: inline-block;
        width: 16px;
        text-align: center;
      }

      .failure-category-badge {
        background: var(--vscode-panel-border, #3e3e42);
        color: var(--vscode-foreground, #cccccc);
        font-size: 8px;
        padding: 2px 6px;
        border-radius: 8px;
        text-transform: uppercase;
        letter-spacing: 0.5px;
        font-weight: 600;
        border: 1px solid transparent;
        transition: border-color 0.2s;
      }

      .failure-item:hover .failure-category-badge {
        border-color: var(--vscode-focusBorder, #007acc);
      }

      /* Error category specific styling */
      .failure-item.assertion .failure-category-badge {
        background: rgba(244, 135, 113, 0.2);
        color: #f48771;
        border-color: #f48771;
      }

      .failure-item.type .failure-category-badge {
        background: rgba(220, 220, 170, 0.2);
        color: #dcdcaa;
        border-color: #dcdcaa;
      }

      .failure-item.filesystem .failure-category-badge {
        background: rgba(86, 156, 214, 0.2);
        color: #569cd6;
        border-color: #569cd6;
      }

      .failure-item.timeout .failure-category-badge {
        background: rgba(215, 186, 125, 0.2);
        color: #d7ba7d;
        border-color: #d7ba7d;
      }

      .failure-item.network .failure-category-badge {
        background: rgba(197, 134, 192, 0.2);
        color: #c586c0;
        border-color: #c586c0;
      }

      .failure-item.unknown .failure-category-badge {
        background: rgba(106, 106, 106, 0.2);
        color: #6a6a6a;
        border-color: #6a6a6a;
      }

      .failure-name {
        font-weight: 500;
        margin-bottom: 4px;
        color: var(--vscode-foreground, #ffffff);
        font-size: 11px;
        line-height: 1.3;
      }

      .failure-message {
        color: var(--vscode-descriptionForeground, #969696);
        font-family: 'Courier New', monospace;
        font-size: 9px;
        word-break: break-word;
        line-height: 1.4;
        margin-bottom: 4px;
      }

      .failure-stacktrace {
        color: var(--vscode-descriptionForeground, #6a6a6a);
        font-family: 'Courier New', monospace;
        font-size: 8px;
        word-break: break-word;
        line-height: 1.3;
        background: var(--vscode-editor-background, #1e1e1e);
        padding: 4px 6px;
        border-radius: 2px;
        border-left: 2px solid var(--vscode-panel-border, #3e3e42);
        margin-top: 4px;
        max-height: 80px;
        overflow-y: auto;
      }

      /* No tests state */
      .no-tests {
        font-size: 11px;
        color: var(--vscode-descriptionForeground, #969696);
        font-style: italic;
        text-align: center;
        padding: 8px;
        background: var(--vscode-editor-background, #1e1e1e);
        border: 1px solid var(--vscode-panel-border, #3e3e42);
        border-radius: 4px;
        margin-bottom: 12px;
      }

      /* Action buttons */
      .actions {
        display: flex;
        gap: 8px;
        flex-wrap: wrap;
        margin-top: 16px;
      }

      .action-btn {
        background: var(--vscode-panel-border, #3e3e42);
        border: 1px solid transparent;
        color: var(--vscode-foreground, #cccccc);
        padding: 6px 12px;
        border-radius: 3px;
        font-size: 10px;
        cursor: pointer;
        transition: all 0.2s;
        font-family: inherit;
        text-decoration: none;
        display: inline-flex;
        align-items: center;
        gap: 4px;
      }

      .action-btn:hover {
        background: var(--vscode-panel-border, #4a4a4a);
        border-color: var(--vscode-focusBorder, #007acc);
      }

      .action-btn:active {
        transform: translateY(1px);
      }

      .action-btn.primary {
        background: var(--vscode-button-background, #569cd6);
        color: var(--vscode-button-foreground, #ffffff);
      }

      .action-btn.primary:hover {
        background: var(--vscode-button-hoverBackground, #4a86c7);
      }

      /* Action button container */
      .action-buttons {
        display: flex;
        gap: 8px;
        flex-wrap: wrap;
        margin-top: 16px;
      }

      /* Cursor integration button styling */
      .action-btn.cursor-btn {
        background: var(--vscode-button-background, #569cd6);
        color: var(--vscode-button-foreground, #ffffff);
        border: 2px solid var(--vscode-focusBorder, #007acc);
        font-weight: 600;
        position: relative;
      }

      .action-btn.cursor-btn:hover {
        background: var(--vscode-button-hoverBackground, #4a86c7);
        border-color: var(--vscode-focusBorder, #007acc);
        transform: translateY(-1px);
        box-shadow: 0 2px 8px rgba(0, 122, 204, 0.3);
      }

      .action-btn.cursor-btn:active {
        transform: translateY(0);
        box-shadow: 0 1px 4px rgba(0, 122, 204, 0.2);
      }

      /* No actions state */
      .no-actions {
        font-size: 11px;
        color: var(--vscode-descriptionForeground, #969696);
        font-style: italic;
        text-align: center;
        padding: 12px;
        background: var(--vscode-panel-background, #2d2d30);
        border: 1px solid var(--vscode-panel-border, #3e3e42);
        border-radius: 4px;
        margin-top: 16px;
      }

      /* Action error state */
      .action-error {
        font-size: 11px;
        color: #f48771;
        text-align: center;
        padding: 12px;
        background: var(--vscode-panel-background, #2d2d30);
        border: 1px solid #f48771;
        border-radius: 4px;
        margin-top: 16px;
      }

      /* Section divider */
      .section-divider {
        height: 1px;
        background: var(--vscode-panel-border, #3e3e42);
        margin: 12px 0;
      }

      /* Executable indicator */
      .executable-indicator {
        color: var(--vscode-button-background, #569cd6);
        font-size: 12px;
        margin-left: 4px;
        display: inline-block;
      }

      /* Responsive design for different sidebar widths */
      @media (max-width: 300px) {
        .task-details {
          padding: 12px;
        }
        
        .task-meta {
          grid-template-columns: 1fr;
          gap: 8px;
        }
        
        .test-stats {
          gap: 8px;
        }
        
        .actions {
          gap: 6px;
        }
        
        .action-btn {
          padding: 4px 8px;
          font-size: 9px;
        }
      }

      @media (min-width: 400px) {
        .task-details {
          padding: 20px;
        }
        
        .task-meta {
          grid-template-columns: 1fr 1fr 1fr;
          gap: 16px;
        }
        
        .test-stats {
          gap: 24px;
        }
        
        .actions {
          gap: 12px;
        }
      }

      /* VSCode theme integration fallbacks */
      @media (prefers-color-scheme: light) {
        .task-details {
          background: var(--vscode-panel-background, #f3f3f3);
          border-top-color: var(--vscode-panel-border, #e1e1e1);
        }
        
        .test-results {
          background: var(--vscode-editor-background, #ffffff);
          border-color: var(--vscode-panel-border, #e1e1e1);
        }
        
        .failure-item {
          background: var(--vscode-panel-background, #f3f3f3);
        }
      }

      /* Focus management for accessibility */
      .action-btn:focus {
        outline: 2px solid var(--vscode-focusBorder, #007acc);
        outline-offset: 2px;
      }

      .failures-header:focus {
        outline: 2px solid var(--vscode-focusBorder, #007acc);
        outline-offset: 2px;
        border-radius: 2px;
      }

      /* Smooth transitions for all interactive elements */
      * {
        transition: background-color 0.2s, border-color 0.2s, color 0.2s;
      }

      /* Enhanced transitions for failures section */
      .failures-section {
        transition: all 0.3s ease-in-out;
      }

      .failures-list {
        transition: all 0.3s ease-in-out;
        opacity: 0;
        transform: translateY(-10px);
      }

      .failures-section.expanded .failures-list {
        opacity: 1;
        transform: translateY(0);
      }

      .task-expand-icon {
        transition: transform 0.3s ease-in-out;
      }

      .failure-item {
        transition: all 0.2s ease-in-out;
      }

      .failure-category-badge {
        transition: all 0.2s ease-in-out;
      }

      /* Print styles */
      @media print {
        .actions,
        .failures-header {
          display: none;
        }
        
        .task-details {
          background: white;
          color: black;
          border: none;
        }
      }
    `;
  }

  /**
   * Generates fallback HTML when main template generation fails
   * Called when there's an error in the main HTML generation
   *
   * @param task - The task to generate fallback HTML for
   * @returns Fallback HTML string
   */
  private generateFallbackHTML(task: Task): string {
    return `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Task Details - ${task.id}</title>
        <style>
          ${this.generateCSS()}
          .fallback { text-align: center; padding: 20px; }
          .error { color: #f48771; margin-bottom: 10px; }
        </style>
      </head>
      <body>
        <div class="fallback">
          <div class="error">⚠️ Error loading task details</div>
          <h3>Task ${task.id}: ${this.escapeHtml(task.title)}</h3>
          <p>Status: ${task.status}</p>
          <p>Description: ${this.escapeHtml(task.description)}</p>
          <p>Please try refreshing the view or contact support if the problem persists.</p>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Renders dependencies as HTML tags
   * Called when generating the dependencies section
   *
   * @param dependencies - Array of dependency IDs
   * @returns HTML string for dependency tags
   */
  private renderDependencies(dependencies: string[]): string {
    if (!dependencies || dependencies.length === 0) {
      return '<span class="dependency-tag">None</span>';
    }

    return dependencies
      .map(
        (dep) => `<span class="dependency-tag">${this.escapeHtml(dep)}</span>`
      )
      .join("");
  }

  /**
   * Renders test results section with proper structure
   * Called when generating the test results section for a task
   *
   * @param task - The task to render test results for
   * @returns HTML string for test results section
   */
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
          <div class="test-date">Last run: ${this.formatLastRunTime(
            testStatus.lastRunDate
          )}</div>
        </div>
        <div class="test-summary">
          <div class="test-summary-stats">
            <span class="test-summary-text">${this.formatTestSummary(
              testStatus
            )}</span>
            ${
              testStatus.coverage
                ? `<span class="test-coverage">${this.formatCoverage(
                    testStatus.coverage
                  )}</span>`
                : ""
            }
          </div>
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
          testStatus.testSuite
            ? `<div class="test-suite">Suite: ${this.escapeHtml(
                testStatus.testSuite
              )}</div>`
            : ""
        }
        ${
          hasFailures
            ? this.renderFailuresSection(testStatus.failingTestsList!)
            : ""
        }
      </div>
    `;
  }

  /**
   * Formats test summary in "passed/total passed" format
   * Called when displaying test summary statistics
   *
   * @param testStatus - The test status to format summary for
   * @returns Formatted test summary string
   */
  private formatTestSummary(testStatus: any): string {
    try {
      const { passedTests, totalTests } = testStatus;

      if (totalTests === 0) {
        return "No tests run";
      }

      if (passedTests === totalTests) {
        return `${passedTests}/${totalTests} passed ✅`;
      }

      if (passedTests === 0) {
        return `${passedTests}/${totalTests} passed ❌`;
      }

      return `${passedTests}/${totalTests} passed ⚠️`;
    } catch (error) {
      console.warn("Failed to format test summary:", error);
      return "Test summary unavailable";
    }
  }

  /**
   * Formats last run time using TimeFormattingUtility
   * Called when displaying test execution timestamps
   *
   * @param lastRunDate - ISO date string for last test run
   * @returns Formatted relative time string
   */
  private formatLastRunTime(lastRunDate?: string): string {
    if (!lastRunDate || lastRunDate.trim() === "") {
      return "Never run";
    }

    try {
      return this.timeFormatter.formatRelativeTime(lastRunDate);
    } catch (error) {
      console.warn("Failed to format last run time:", error);
      // Fallback to absolute date if TimeFormattingUtility fails
      try {
        const date = new Date(lastRunDate);
        if (isNaN(date.getTime())) {
          return "Invalid date";
        }
        return date.toLocaleDateString();
      } catch (fallbackError) {
        return "Date unavailable";
      }
    }
  }

  /**
   * Formats test coverage percentage with appropriate styling
   * Called when displaying test coverage information
   *
   * @param coverage - Coverage percentage (0-100)
   * @returns Formatted coverage string with CSS class
   */
  private formatCoverage(coverage: number): string {
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

  /**
   * Renders failures section with collapsible structure
   * Called when rendering test failures for a task
   *
   * @param failures - Array of failing test information
   * @returns HTML string for failures section
   */
  private renderFailuresSection(failures: any[]): string {
    if (!failures || failures.length === 0) {
      return "";
    }

    // Use the enhanced collapsible failures rendering
    return this.renderCollapsibleFailures(failures);
  }

  /**
   * Gets actions for a specific task status using STATUS_ACTIONS mapping
   * Called when determining which action buttons to display for a task
   *
   * @param status - The task status to get actions for
   * @returns Array of action strings for the given status
   */
  public getActionsForStatus(status: TaskStatus): string[] {
    return STATUS_ACTIONS[status] || [];
  }

  /**
   * Renders individual action button with proper data attributes and styling
   * Called when generating HTML for individual action buttons
   *
   * @param action - The action string to render as a button
   * @param taskId - The task ID for the button data attribute
   * @returns HTML string for the action button
   */
  public renderButton(action: string, taskId: string): string {
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

  /**
   * Determines if an action is executable (Cursor integration related)
   * Called when determining button styling and behavior for executable actions
   *
   * @param action - The action string to check
   * @param task - The task context for the action
   * @returns True if the action is executable (Cursor integration)
   */
  public isExecutableAction(action: string, task: Task): boolean {
    // Only "🤖 Execute with Cursor" action is executable
    // Task must be NOT_STARTED and have isExecutable = true
    return (
      action.includes("🤖") &&
      task.status === "not_started" &&
      task.isExecutable === true
    );
  }

  /**
   * Converts action display text to action key for data attributes
   * Called when generating data-action attributes for button event handling
   *
   * @param action - The action display text
   * @returns Action key string for data attributes
   */
  private getActionKey(action: string): string {
    const actionKeyMap: Record<string, string> = {
      "🤖 Execute with Cursor": "execute-cursor",
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

  /**
   * Renders action buttons based on task status and properties
   * Called when generating the action buttons section
   *
   * @param task - The task to render actions for
   * @returns HTML string for action buttons
   */
  private renderActionButtons(task: Task): string {
    try {
      // Get actions for the task status from STATUS_ACTIONS mapping
      let actions = this.getActionsForStatus(task.status);

      if (actions.length === 0) {
        return '<div class="no-actions">No actions available for this task status</div>';
      }

      // Filter out Cursor action for non-executable tasks
      if (task.status === "not_started" && !task.isExecutable) {
        actions = actions.filter((action) => !action.includes("🤖"));
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
          ? "action-btn cursor-btn"
          : "action-btn";
        const actionKey = this.getActionKey(action);

        return `<button class="${buttonClass}" data-action="${actionKey}" data-task-id="${task.id}">${action}</button>`;
      });

      return `<div class="action-buttons">${buttons.join("")}</div>`;
    } catch (error) {
      console.error("Failed to render action buttons:", error);
      return '<div class="action-error">Error loading actions</div>';
    }
  }

  /**
   * Renders action buttons for completed tasks with test failures
   * Called when handling special case for completed tasks with failing tests
   *
   * @param task - The completed task with test failures
   * @returns HTML string for test failure action buttons
   */
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

    return `<div class="action-buttons">${buttons.join("")}</div>`;
  }

  /**
   * Gets CSS class for task status styling
   * Called when generating status badge CSS classes
   *
   * @param status - The task status
   * @returns CSS class name for status styling
   */
  private getStatusClass(status: string): string {
    return status.replace("_", "-");
  }

  /**
   * Gets display name for task status
   * Called when displaying status text in the UI
   *
   * @param status - The task status
   * @returns Human-readable status display name
   */
  private getStatusDisplayName(status: string): string {
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

  /**
   * Gets display name for task complexity
   * Called when displaying complexity text in the UI
   *
   * @param complexity - The task complexity
   * @returns Human-readable complexity display name
   */
  private getComplexityDisplayName(complexity: string): string {
    const complexityMap: Record<string, string> = {
      low: "Low",
      medium: "Medium",
      high: "High",
    };

    return complexityMap[complexity] || complexity;
  }

  /**
   * Escapes HTML special characters to prevent XSS
   * Called when inserting user content into HTML templates
   *
   * @param text - Text to escape
   * @returns Escaped HTML-safe text
   */
  private escapeHtml(text: string): string {
    if (!text) return "";

    return text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  /**
   * Generates HTML content for no task selected state
   * Called when no task is selected or when initializing
   *
   * @returns HTML string for empty state
   */
  private generateNoTaskSelectedHTML(): string {
    return `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>No Task Selected</title>
        <style>
          ${this.generateCSS()}
          .no-task { 
            padding: 40px 20px; 
            text-align: center; 
            background: var(--vscode-panel-background, #2d2d30); 
            border-top: 1px solid var(--vscode-panel-border, #3e3e42);
            min-height: 200px;
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
          }
          .no-task h3 { 
            color: var(--vscode-foreground, #ffffff); 
            margin-bottom: 16px;
            font-size: 16px;
          }
          .no-task p { 
            color: var(--vscode-descriptionForeground, #d4d4d4); 
            margin-bottom: 8px;
            font-size: 13px;
            line-height: 1.4;
          }
          .icon { 
            font-size: 48px; 
            margin-bottom: 16px;
            opacity: 0.7;
          }
        </style>
      </head>
      <body>
        <div class="no-task">
          <div class="icon">📋</div>
          <h3>No Task Selected</h3>
          <p>Select a task from the tree view above to see detailed information.</p>
          <p>Click on executable tasks (🤖) to start implementation with AI.</p>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Handles messages received from the webview JavaScript content
   * Called when the webview sends messages to the extension
   *
   * @param message - The message received from the webview
   */
  private handleWebviewMessage(message: any): void {
    try {
      switch (message.command) {
        case "execute-cursor":
          if (message.taskId) {
            this._onCursorExecuteRequested.fire({
              taskId: message.taskId,
            });
          }
          break;

        case "generate-prompt":
          if (message.taskId) {
            // Handle prompt generation (future implementation)
            console.log("Generate prompt for task:", message.taskId);
          }
          break;

        case "view-requirements":
          if (message.taskId) {
            // Handle requirements viewing (future implementation)
            console.log("View requirements for task:", message.taskId);
          }
          break;

        case "continue-work":
          if (message.taskId) {
            // Handle continue work action (future implementation)
            console.log("Continue work on task:", message.taskId);
          }
          break;

        case "mark-complete":
          if (message.taskId) {
            // Handle mark complete action (future implementation)
            console.log("Mark task complete:", message.taskId);
          }
          break;

        case "view-dependencies":
          if (message.taskId) {
            // Handle dependencies viewing (future implementation)
            console.log("View dependencies for task:", message.taskId);
          }
          break;

        case "approve-complete":
          if (message.taskId) {
            // Handle approve and complete action (future implementation)
            console.log("Approve and complete task:", message.taskId);
          }
          break;

        case "request-changes":
          if (message.taskId) {
            // Handle request changes action (future implementation)
            console.log("Request changes for task:", message.taskId);
          }
          break;

        case "view-implementation":
          if (message.taskId) {
            // Handle implementation viewing (future implementation)
            console.log("View implementation for task:", message.taskId);
          }
          break;

        case "view-code":
          if (message.taskId) {
            // Handle code viewing (future implementation)
            console.log("View code for task:", message.taskId);
          }
          break;

        case "view-tests":
          if (message.taskId) {
            // Handle tests viewing (future implementation)
            console.log("View tests for task:", message.taskId);
          }
          break;

        case "history":
          if (message.taskId) {
            // Handle history viewing (future implementation)
            console.log("View history for task:", message.taskId);
          }
          break;

        case "fix-failing-tests":
          if (message.taskId) {
            // Handle fix failing tests action (future implementation)
            console.log("Fix failing tests for task:", message.taskId);
          }
          break;

        case "view-full-report":
          if (message.taskId) {
            // Handle full report viewing (future implementation)
            console.log("View full report for task:", message.taskId);
          }
          break;

        case "rerun-tests":
          if (message.taskId) {
            // Handle rerun tests action (future implementation)
            console.log("Rerun tests for task:", message.taskId);
          }
          break;

        case "view-blockers":
          if (message.taskId) {
            // Handle blockers viewing (future implementation)
            console.log("View blockers for task:", message.taskId);
          }
          break;

        case "update-dependencies":
          if (message.taskId) {
            // Handle dependencies update action (future implementation)
            console.log("Update dependencies for task:", message.taskId);
          }
          break;

        case "report-issue":
          if (message.taskId) {
            // Handle issue reporting action (future implementation)
            console.log("Report issue for task:", message.taskId);
          }
          break;

        case "archive":
          if (message.taskId) {
            // Handle archive action (future implementation)
            console.log("Archive task:", message.taskId);
          }
          break;

        case "view-history":
          if (message.taskId) {
            // Handle history viewing (future implementation)
            console.log("View history for task:", message.taskId);
          }
          break;

        // Legacy command support for backward compatibility
        case "executeWithCursor":
          if (message.taskId) {
            this._onCursorExecuteRequested.fire({
              taskId: message.taskId,
            });
          }
          break;

        case "updateStatus":
          if (message.taskId && message.newStatus) {
            this._onStatusChanged.fire({
              taskId: message.taskId,
              newStatus: message.newStatus as TaskStatus,
            });
          }
          break;

        case "viewTestResults":
          // Handle test results viewing (future implementation)
          break;

        default:
          console.log("Unknown webview message:", message);
      }
    } catch (error) {
      console.error("Failed to handle webview message:", error);
    }
  }

  /**
   * Disposes of all resources used by the provider
   * Called when the extension is deactivated or the provider is no longer needed
   */
  public dispose(): void {
    try {
      // Dispose of all event emitters and other disposables
      this.disposables.forEach((disposable) => {
        try {
          disposable.dispose();
        } catch (error) {
          // Ignore disposal errors
          console.warn("Error disposing resource:", error);
        }
      });

      // Clear the disposables array
      this.disposables.length = 0;

      // Clear webview reference
      this.webview = null;
      this.currentTask = null;
    } catch (error) {
      console.error("Error during TaskDetailCardProvider disposal:", error);
    }
  }

  /**
   * Renders enhanced task metadata in organized grid layout
   * Called when generating the metadata section for task details
   *
   * @param task - The task to render metadata for
   * @returns HTML string for enhanced metadata grid
   */
  public renderMetadataGrid(task: Task): string {
    try {
      return `
        <div class="task-meta">
          <div class="meta-item">
            <div class="meta-label">Complexity</div>
            <div class="meta-value complexity-${this.formatComplexity(
              task.complexity
            )}">${this.getComplexityDisplayName(task.complexity)}</div>
          </div>
          <div class="meta-item">
            <div class="meta-label">Duration</div>
            <div class="meta-value duration">${this.formatEstimatedDuration(
              task.estimatedDuration
            )}</div>
          </div>
          <div class="meta-item">
            <div class="meta-label">Dependencies</div>
            <div class="meta-value dependencies">${this.formatDependencies(
              task.dependencies
            )}</div>
          </div>
          <div class="meta-item">
            <div class="meta-label">Requirements</div>
            <div class="meta-value requirements">${this.formatRequirements(
              task.requirements
            )}</div>
          </div>
          <div class="meta-item">
            <div class="meta-label">Created</div>
            <div class="meta-value created-date">${this.timeFormatter.formatRelativeTime(
              task.createdDate
            )}</div>
          </div>
          <div class="meta-item">
            <div class="meta-label">Modified</div>
            <div class="meta-value modified-date">${this.timeFormatter.formatRelativeTime(
              task.lastModified
            )}</div>
          </div>
        </div>
      `;
    } catch (error) {
      console.error("Failed to render metadata grid:", error);
      return this.renderFallbackMetadata(task);
    }
  }

  /**
   * Formats estimated duration for display
   * Called when displaying task duration in metadata
   *
   * @param duration - Estimated duration string (e.g., "15-30 min")
   * @returns Formatted duration string or fallback text
   */
  public formatEstimatedDuration(duration?: string): string {
    if (!duration || duration.trim() === "") {
      return "Not specified";
    }

    try {
      // Use TimeFormattingUtility to parse and format duration if needed
      const parsedDuration =
        this.timeFormatter.parseEstimatedDuration(duration);
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

  /**
   * Formats dependencies list for display
   * Called when displaying task dependencies in metadata
   *
   * @param dependencies - Array of dependency task IDs
   * @returns Formatted dependencies string
   */
  public formatDependencies(dependencies?: string[]): string {
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

  /**
   * Formats requirements list for display
   * Called when displaying task requirements in metadata
   *
   * @param requirements - Array of requirement IDs
   * @returns Formatted requirements string
   */
  public formatRequirements(requirements?: string[]): string {
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

  /**
   * Formats complexity for CSS class and display
   * Called when generating complexity styling classes
   *
   * @param complexity - Task complexity value
   * @returns Formatted complexity string for CSS classes
   */
  public formatComplexity(complexity?: string): string {
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

  /**
   * Renders fallback metadata when main rendering fails
   * Called when there's an error in metadata rendering
   *
   * @param task - The task to render fallback metadata for
   * @returns Fallback metadata HTML string
   */
  private renderFallbackMetadata(task: Task): string {
    return `
      <div class="task-meta">
        <div class="meta-item">
          <div class="meta-label">Complexity</div>
          <div class="meta-value">${task.complexity || "Unknown"}</div>
        </div>
        <div class="meta-item">
          <div class="meta-label">Duration</div>
          <div class="meta-value">${
            task.estimatedDuration || "Not specified"
          }</div>
        </div>
        <div class="meta-item">
          <div class="meta-label">Dependencies</div>
          <div class="meta-value">${
            task.dependencies?.length ? task.dependencies.join(", ") : "None"
          }</div>
        </div>
        <div class="meta-item">
          <div class="meta-label">Requirements</div>
          <div class="meta-value">${
            task.requirements?.length ? task.requirements.join(", ") : "None"
          }</div>
        </div>
      </div>
    `;
  }
}
