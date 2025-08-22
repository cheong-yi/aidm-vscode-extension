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
import { Task, TaskStatus } from "../types";

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

  constructor() {
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
   * Renders test failures in HTML format
   * Called when displaying test results for a task
   *
   * @param failures - Array of failing test information
   * @returns HTML string for test failures display
   */
  public renderTestFailures(failures: any[]): string {
    if (!failures || failures.length === 0) {
      return '<div class="no-failures">No test failures</div>';
    }

    const failureItems = failures
      .map(failure => `
        <div class="failure-item">
          <div class="failure-name">${this.escapeHtml(failure.name)}</div>
          <div class="failure-message">${this.escapeHtml(failure.message)}</div>
        </div>
      `)
      .join('');

    return `
      <div class="failures-section">
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
      return 'Never';
    }

    try {
      const date = new Date(isoDate);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMinutes = Math.floor(diffMs / (1000 * 60));
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

      if (diffMinutes < 1) {
        return 'Just now';
      } else if (diffMinutes < 60) {
        return `${diffMinutes} minute${diffMinutes === 1 ? '' : 's'} ago`;
      } else if (diffHours < 24) {
        return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`;
      } else if (diffDays < 7) {
        return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`;
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
            body { 
              font-family: var(--vscode-font-family); 
              margin: 0; 
              padding: 0; 
              background: #1e1e1e; 
              color: #cccccc; 
            }
            .task-details { 
              padding: 16px; 
              background: #2d2d30; 
              border-top: 1px solid #3e3e42;
            }
            .task-header {
              margin-bottom: 16px;
              padding-bottom: 12px;
              border-bottom: 1px solid #3e3e42;
            }
            .task-title {
              font-size: 14px;
              font-weight: 600;
              color: #ffffff;
              margin-bottom: 8px;
              line-height: 1.3;
            }
            .task-id {
              font-family: 'Courier New', monospace;
              font-size: 11px;
              background: #3e3e42;
              padding: 2px 6px;
              border-radius: 3px;
              color: #dcdcaa;
              display: inline-block;
              margin-bottom: 8px;
            }
            .status-badge {
              font-size: 10px;
              padding: 3px 8px;
              border-radius: 10px;
              font-weight: 600;
              display: inline-block;
              margin-left: 8px;
            }
            .status-badge.not-started { background: #4a4a4a; color: #cccccc; }
            .status-badge.in-progress { background: #569cd6; color: #ffffff; }
            .status-badge.review { background: #dcdcaa; color: #1e1e1e; }
            .status-badge.completed { background: #4ec9b0; color: #1e1e1e; }
            .status-badge.blocked { background: #f48771; color: #1e1e1e; }
            .status-badge.deprecated { background: #6a6a6a; color: #cccccc; }
            
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
            .complexity-low { color: #4ec9b0; }
            .complexity-medium { color: #dcdcaa; }
            .complexity-high { color: #f48771; }
            
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
            .test-passed { color: #4ec9b0; }
            .test-failed { color: #f48771; }
            .test-total { color: #dcdcaa; }
            
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
            
            .no-tests {
              font-size: 11px;
              color: #969696;
              font-style: italic;
              text-align: center;
              padding: 8px;
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
            
            .section-divider {
              height: 1px;
              background: #3e3e42;
              margin: 12px 0;
            }
            
            .executable-indicator {
              color: #569cd6;
              font-size: 12px;
              margin-left: 4px;
            }
          </style>
        </head>
        <body>
          <div class="task-details">
            <!-- Task Header Section -->
            <div class="task-header">
              <div class="task-title">${this.escapeHtml(task.title)}</div>
              <div>
                <span class="task-id">${this.escapeHtml(task.id)}</span>
                <span class="status-badge ${this.getStatusClass(task.status)}">${this.getStatusDisplayName(task.status)}</span>
                ${task.isExecutable ? '<span class="executable-indicator">🤖</span>' : ''}
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
                <div class="meta-value complexity-${task.complexity.toLowerCase()}">${this.getComplexityDisplayName(task.complexity)}</div>
              </div>
              <div class="meta-item">
                <div class="meta-label">Estimated</div>
                <div class="meta-value">${task.estimatedDuration || 'Not specified'}</div>
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
            <div class="actions">
              ${this.renderActionButtons(task)}
            </div>
          </div>
          
          <script>
            // Handle failures section expansion
            function toggleFailures(failuresElement, event) {
              event.stopPropagation();
              failuresElement.classList.toggle('expanded');
            }
            
            // Handle action button clicks
            function handleActionClick(action, taskId) {
              vscode.postMessage({
                command: action,
                taskId: taskId
              });
            }
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
          body { font-family: var(--vscode-font-family); padding: 10px; background: #1e1e1e; color: #cccccc; }
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
      .map(dep => `<span class="dependency-tag">${this.escapeHtml(dep)}</span>`)
      .join('');
  }

  /**
   * Renders test results section with proper structure
   * Called when generating the test results section
   *
   * @param task - The task to render test results for
   * @returns HTML string for test results section
   */
  private renderTestResultsSection(task: Task): string {
    if (!task.testStatus) {
      return '<div class="no-tests">No tests available yet</div>';
    }

    const { testStatus } = task;
    const hasFailures = testStatus.failingTestsList && testStatus.failingTestsList.length > 0;
    
    return `
      <div class="test-results">
        <div class="test-header">
          <div class="test-title">Test Results</div>
          <div class="test-date">Last run: ${this.formatRelativeTime(testStatus.lastRunDate || '')}</div>
        </div>
        <div class="test-stats">
          <div class="test-stat">
            <div class="test-stat-value test-total">${testStatus.totalTests}</div>
            <div class="test-stat-label">Total</div>
          </div>
          <div class="test-stat">
            <div class="test-stat-value test-passed">${testStatus.passedTests}</div>
            <div class="test-stat-label">Passed</div>
          </div>
          <div class="test-stat">
            <div class="test-stat-value test-failed">${testStatus.failedTests}</div>
            <div class="test-stat-label">Failed</div>
          </div>
        </div>
        ${hasFailures ? this.renderFailuresSection(testStatus.failingTestsList!) : ''}
      </div>
    `;
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
      return '';
    }

    const failureItems = failures
      .map(failure => `
        <div class="failure-item">
          <div class="failure-name">${this.escapeHtml(failure.name)}</div>
          <div class="failure-message">${this.escapeHtml(failure.message)}</div>
        </div>
      `)
      .join('');

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
   * Renders action buttons based on task status and properties
   * Called when generating the action buttons section
   *
   * @param task - The task to render actions for
   * @returns HTML string for action buttons
   */
  private renderActionButtons(task: Task): string {
    const buttons: string[] = [];

    switch (task.status) {
      case 'not_started':
        if (task.isExecutable) {
          buttons.push('<button class="action-btn primary" onclick="handleActionClick(\'executeWithCursor\', \'' + task.id + '\')">🤖 Execute with Cursor</button>');
        }
        buttons.push('<button class="action-btn" onclick="handleActionClick(\'generatePrompt\', \'' + task.id + '\')">Generate Prompt</button>');
        buttons.push('<button class="action-btn" onclick="handleActionClick(\'viewRequirements\', \'' + task.id + '\')">View Requirements</button>');
        break;
      
      case 'in_progress':
        buttons.push('<button class="action-btn primary" onclick="handleActionClick(\'continueWork\', \'' + task.id + '\')">Continue Work</button>');
        buttons.push('<button class="action-btn" onclick="handleActionClick(\'markComplete\', \'' + task.id + '\')">Mark Complete</button>');
        buttons.push('<button class="action-btn" onclick="handleActionClick(\'viewDependencies\', \'' + task.id + '\')">View Dependencies</button>');
        break;
      
      case 'review':
        buttons.push('<button class="action-btn primary" onclick="handleActionClick(\'approveComplete\', \'' + task.id + '\')">Approve & Complete</button>');
        buttons.push('<button class="action-btn" onclick="handleActionClick(\'requestChanges\', \'' + task.id + '\')">Request Changes</button>');
        buttons.push('<button class="action-btn" onclick="handleActionClick(\'viewImplementation\', \'' + task.id + '\')">View Implementation</button>');
        break;
      
      case 'completed':
        if (task.testStatus && task.testStatus.failedTests > 0) {
          buttons.push('<button class="action-btn" onclick="handleActionClick(\'fixFailingTests\', \'' + task.id + '\')">Fix Failing Tests</button>');
          buttons.push('<button class="action-btn" onclick="handleActionClick(\'viewFullReport\', \'' + task.id + '\')">View Full Report</button>');
          buttons.push('<button class="action-btn" onclick="handleActionClick(\'rerunTests\', \'' + task.id + '\')">Rerun Tests</button>');
        } else {
          buttons.push('<button class="action-btn" onclick="handleActionClick(\'viewCode\', \'' + task.id + '\')">View Code</button>');
          buttons.push('<button class="action-btn" onclick="handleActionClick(\'viewTests\', \'' + task.id + '\')">View Tests</button>');
          buttons.push('<button class="action-btn" onclick="handleActionClick(\'history\', \'' + task.id + '\')">History</button>');
        }
        break;
      
      case 'blocked':
        buttons.push('<button class="action-btn" onclick="handleActionClick(\'viewBlockers\', \'' + task.id + '\')">View Blockers</button>');
        buttons.push('<button class="action-btn" onclick="handleActionClick(\'updateDependencies\', \'' + task.id + '\')">Update Dependencies</button>');
        buttons.push('<button class="action-btn" onclick="handleActionClick(\'reportIssue\', \'' + task.id + '\')">Report Issue</button>');
        break;
      
      case 'deprecated':
        buttons.push('<button class="action-btn" onclick="handleActionClick(\'archive\', \'' + task.id + '\')">Archive</button>');
        buttons.push('<button class="action-btn" onclick="handleActionClick(\'viewHistory\', \'' + task.id + '\')">View History</button>');
        break;
      
      default:
        buttons.push('<button class="action-btn" onclick="handleActionClick(\'viewDetails\', \'' + task.id + '\')">View Details</button>');
    }

    return buttons.join('');
  }

  /**
   * Gets CSS class for task status styling
   * Called when generating status badge CSS classes
   *
   * @param status - The task status
   * @returns CSS class name for status styling
   */
  private getStatusClass(status: string): string {
    return status.replace('_', '-');
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
      'not_started': 'not started',
      'in_progress': 'in progress',
      'review': 'review',
      'completed': 'completed',
      'blocked': 'blocked',
      'deprecated': 'deprecated'
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
      'low': 'Low',
      'medium': 'Medium',
      'high': 'High'
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
    if (!text) return '';
    
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
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
          body { 
            font-family: var(--vscode-font-family); 
            margin: 0; 
            padding: 0; 
            background: #1e1e1e; 
            color: #cccccc; 
          }
          .no-task { 
            padding: 40px 20px; 
            text-align: center; 
            background: #2d2d30; 
            border-top: 1px solid #3e3e42;
            min-height: 200px;
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
          }
          .no-task h3 { 
            color: #ffffff; 
            margin-bottom: 16px;
            font-size: 16px;
          }
          .no-task p { 
            color: #d4d4d4; 
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
        case "updateStatus":
          if (message.taskId && message.newStatus) {
            this._onStatusChanged.fire({
              taskId: message.taskId,
              newStatus: message.newStatus as TaskStatus,
            });
          }
          break;

        case "executeWithCursor":
          if (message.taskId) {
            this._onCursorExecuteRequested.fire({
              taskId: message.taskId,
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
}
