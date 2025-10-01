/**
 * TaskDetailCardProvider Class
 * VSCode WebviewViewProvider implementation for task detail display
 * Requirements: 2.1, 2.2 - Task detail display with expandable content
 * Task 3.3.1: Create TaskDetailCardProvider class structure
 * Task 3.3.9: Add relative time integration with periodic refresh
 *
 * This provider handles webview-based task detail display matching the expandable
 * list mockup design from taskmaster_mockup.html.
 */

import * as vscode from "vscode";
import { Task, TaskStatus } from "../types";
import { TaskDetailFormatters } from './TaskDetailFormatters';
import { TaskDetailHTMLGenerator } from './TaskDetailHTMLGenerator';

/**
 * TaskDetailCardProvider implements vscode.WebviewViewProvider to display
 * detailed task information in an expandable webview panel.
 *
 * Integration Requirements:
 * - VSCode WebviewViewProvider interface compliance
 * - Event emitter preparation for tree view integration
 * - Webview options setup for HTML content rendering
 * - Inline time formatting methods for relative time display
 * - Periodic refresh mechanism for dynamic time updates
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
   * Simple time formatting methods for duration and date formatting
   * Simple inline implementation for time formatting
   */

  /**
   * Interval reference for periodic time refresh
   * Used to update displayed times every minute without full webview reload
   * Task 3.3.9: Periodic refresh mechanism for dynamic time updates
   */
  private timeRefreshInterval: NodeJS.Timeout | null = null;

  /**
   * HTML generator instance for generating webview content
   * Handles all HTML template processing and content generation
   */
  private htmlGenerator = new TaskDetailHTMLGenerator();

  /**
   * Constructor for TaskDetailCardProvider
   * Simplified with inline time formatting methods
   */
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

    // Task 3.3.9: Setup periodic time refresh mechanism
    this.setupPeriodicTimeRefresh();
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
      this.setupMessageHandling(webviewView.webview);
    } catch (error) {
      // Log error and continue without webview functionality
      console.error("[TaskDetailCard] Failed to resolve webview view:", error);
      this.webview = null;
    }
  }

  /**
   * Updates the task details displayed in the webview
   * Called when a task is selected from the tree view
   * Task 3.3.9: Enhanced with time formatting integration
   *
   * @param task - The task to display details for
   */
  public updateTaskDetails(task: Task): void {
    try {
      this.currentTask = task;

      if (this.webview && this.webview.visible) {
        // Generate HTML content with time formatting integration
        const htmlContent = this.generateTaskDetailsHTML(task);

        // Task 3.3.9: Apply time formatting to HTML content
        const formattedHtml = this.formatTimestampsInHTML(htmlContent, task);

        // Update webview content with formatted timestamps
        this.webview.webview.html = formattedHtml;
        
        // Send task data via postMessage for safe rendering (replaces HTML escaping)
        setTimeout(() => {
          if (this.webview) {
            this.sendTaskDataToWebview(task, this.webview.webview);
          }
        }, 100); // Small delay to ensure HTML is loaded
      }
    } catch (error) {
      console.error(
        `[TaskDetailCard] Failed to update task details for ${task.id}:`,
        error
      );
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
      console.error("[TaskDetailCard] Failed to clear task details:", error);
    }
  }

  /**
   * Shows the "no task selected" state in the webview
   * Called when no task is selected or when initializing the provider
   * Task 3.3.10: Enhanced empty state with helpful instructions and quick actions
   */
  public showNoTaskSelected(): void {
    try {
      if (this.webview && this.webview.visible) {
        // Generate enhanced empty state HTML with helpful content
        const emptyStateHTML = this.generateEmptyStateHTML();
        this.webview.webview.html = emptyStateHTML;
      }
    } catch (error) {
      console.error("Failed to show no task selected state:", error);
      // Fallback to minimal empty state if enhanced generation fails
      this.showFallbackEmptyState();
    }
  }

  /**
   * Generates comprehensive HTML content for empty state display
   * Task 3.3.10: Enhanced empty state with user guidance and quick actions
   *
   * @returns Complete HTML string for empty state with helpful content
   */
  public generateEmptyStateHTML(): string {
    return this.htmlGenerator.generateEmptyStateHTML();
  }

  /**
   * Renders helpful instructions for users in the empty state
   * Task 3.3.10: Generate instructional content for task interaction
   *
   * @returns HTML string for helpful instructions section
   */
  public renderHelpfulInstructions(): string {
    try {
      return `
        <div class="helpful-tips">
          <h3 class="tips-title">Getting Started:</h3>
          <ul class="tips-list">
            <li>Click on any task in the tree view to see its details</li>
            <li>Look for tasks marked with Robot that can be executed with AI assistance</li>
            <li>Use the refresh button if tasks don't appear</li>
            <li>Check task dependencies and requirements before starting</li>
            <li>Review test results and failure details for completed tasks</li>
            <li>Use status actions to update task progress</li>
          </ul>
        </div>
      `;
    } catch (error) {
      console.error("Failed to render helpful instructions:", error);
      return '<div class="helpful-tips"><p>Select a task to get started</p></div>';
    }
  }

  /**
   * Renders quick action buttons for the empty state
   * Task 3.3.10: Generate action buttons for empty state functionality
   *
   * @returns HTML string for quick action buttons
   */
  public renderQuickActions(): string {
    try {
      return `
        <div class="quick-actions">
          <button class="action-btn primary" onclick="handleQuickAction('refresh')">
            Refresh Refresh Tasks
          </button>
          <button class="action-btn secondary" onclick="handleQuickAction('viewAll')">
            Clipboard View All Tasks
          </button>
          <button class="action-btn secondary" onclick="handleQuickAction('help')">
            Question Show Help
          </button>
          <button class="action-btn secondary" onclick="handleQuickAction('settings')">
            Settings Settings
          </button>
        </div>
      `;
    } catch (error) {
      console.error("Failed to render quick actions:", error);
      return '<div class="quick-actions"><p>Actions unavailable</p></div>';
    }
  }

  /**
   * Generates fallback empty state HTML when main generation fails
   * Task 3.3.10: Graceful degradation for empty state display
   *
   * @returns Fallback HTML string for empty state
   */
  private generateFallbackEmptyStateHTML(): string {
    return this.htmlGenerator.generateFallbackEmptyStateHTML();
  }

  /**
   * Shows fallback empty state when enhanced empty state generation fails
   * Task 3.3.10: Error handling for empty state display
   */
  private showFallbackEmptyState(): void {
    try {
      if (this.webview && this.webview.visible) {
        const fallbackHTML = this.generateFallbackEmptyStateHTML();
        this.webview.webview.html = fallbackHTML;
      }
    } catch (error) {
      console.error("Failed to show fallback empty state:", error);
      // Last resort: show minimal content
      if (this.webview && this.webview.visible) {
        this.webview.webview.html = `
          <!DOCTYPE html>
          <html><body>
            <div style="padding: 20px; text-align: center; color: #969696;">
              <h3>No Task Selected</h3>
              <p>Select a task to get started</p>
            </div>
          </body></html>
        `;
      }
    }
  }

  /**
   * Renders test failures in HTML format with collapsible functionality
   * Called when displaying test results for a task
   *
   * @param failures - Array of failing test information
   * @returns HTML string for test failures display
   */

  /**
   * Renders collapsible failures section with enhanced error categorization
   * Called when displaying test failures with expand/collapse functionality
   *
   * @param failures - Array of FailingTest objects
   * @returns HTML string for collapsible failures section
   */

  /**
   * Renders individual failure item with error categorization
   * Called when displaying individual failing test details
   *
   * @param failure - FailingTest object to render
   * @returns HTML string for individual failure item
   */


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
          Robot Execute with Cursor
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
   * Generates HTML content for task details display
   * Called when updating webview content with task information
   *
   * @param task - The task to generate HTML for
   * @returns HTML string for task details
   */
  private generateTaskDetailsHTML(task: Task): string {
    return this.htmlGenerator.generateTaskDetailsHTML(task);
  }


  /**
   * Generates fallback HTML when main template generation fails
   * Called when there's an error in the main HTML generation
   *
   * @param task - The task to generate fallback HTML for
   * @returns Fallback HTML string
   */
  private generateFallbackHTML(task: Task): string {
    return this.htmlGenerator.generateFallbackHTML(task);
  }

  /**
   * Renders dependencies as HTML tags
   * Called when generating the dependencies section
   *
   * @param dependencies - Array of dependency IDs
   * @returns HTML string for dependency tags
   */
  private renderDependencies(dependencies: string[]): string {
    return this.htmlGenerator['renderDependencies'](dependencies);
  }

  /**
   * Renders test results section with proper structure
   * Called when generating the test results section for a task
   *
   * @param task - The task to render test results for
   * @returns HTML string for test results section
   */
  private renderTestResultsSection(task: Task): string {
    return this.htmlGenerator['renderTestResultsSection'](task);
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

  /**
   * Gets actions for a specific task status using STATUS_ACTIONS mapping
   * Called when determining which action buttons to display for a task
   *
   * @param status - The task status to get actions for
   * @returns Array of action strings for the given status
   */

  /**
   * Renders individual action button with proper data attributes and styling
   * Called when generating HTML for individual action buttons
   *
   * @param action - The action string to render as a button
   * @param taskId - The task ID for the button data attribute
   * @returns HTML string for the action button
   */

  /**
   * Determines if an action is executable (Cursor integration related)
   * Called when determining button styling and behavior for executable actions
   *
   * @param action - The action string to check
   * @param task - The task context for the action
   * @returns True if the action is executable (Cursor integration)
   */

  /**
   * Converts action display text to action key for data attributes
   * Called when generating data-action attributes for button event handling
   *
   * @param action - The action display text
   * @returns Action key string for data attributes
   */

  /**
   * Renders action buttons based on task status and properties
   * Called when generating the action buttons section
   *
   * @param task - The task to render actions for
   * @returns HTML string for action buttons
   */
  private renderActionButtons(task: Task): string {
    return this.htmlGenerator['renderActionButtons'](task);
  }

  /**
   * Renders action buttons for completed tasks with test failures
   * Called when handling special case for completed tasks with failing tests
   *
   * @param task - The completed task with test failures
   * @returns HTML string for test failure action buttons
   */

  /**
   * Gets CSS class for task status styling
   * Called when generating status badge CSS classes
   *
   * @param status - The task status
   * @returns CSS class name for status styling
   */

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
  /**
   * Send task data to webview for safe rendering via postMessage (replaces escapeHtml)
   */
  private sendTaskDataToWebview(task: any, webview: any): void {
    const taskData = {
      id: task.id || '',
      title: task.title || '',
      description: task.description || '',
      dependencies: task.dependencies || [],
      failures: task.testStatus?.failingTestsList?.map((failure: any) => ({
        name: failure.name || '',
        message: failure.message || '',
        stackTrace: failure.stackTrace || ''
      })) || []
    };
    
    webview.postMessage({
      type: 'updateTaskDetailData',
      task: taskData
    });
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
          ${taskDetailsStyles}
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
          <div class="icon">Clipboard</div>
          <h3>No Task Selected</h3>
          <p>Select a task from the tree view above to see detailed information.</p>
          <p>Click on executable tasks (Robot) to start implementation with AI.</p>
        </div>
        
        <script>
          // Acquire VSCode API for webview communication (even when no task selected)
          const vscode = acquireVsCodeApi();
          
          // Initialize webview with message handling capability
          document.addEventListener('DOMContentLoaded', function() {
            console.log('TaskDetailCardProvider webview initialized (no task selected)');
          });
        </script>
      </body>
      </html>
    `;
  }

  /**
   * Handles messages received from the webview JavaScript content
   * Called when the webview sends messages to the extension
   * Task EXPANSION-FIX-3: Enhanced with comprehensive debug logging for message processing verification
   *
   * @param message - The message received from the webview
   */
  private handleWebviewMessage(message: any): void {
    try {
      // Validate message structure before processing
      if (!TaskDetailFormatters.isValidMessage(message)) {
        console.warn(
          "[TaskDetailCard] Invalid webview message received:",
          message
        );
        return;
      }

      switch (message.command) {
        case "status-change":
          this.handleStatusChange(
            message.data?.taskId,
            message.data?.newStatus
          );
          break;

        case "cursor-execute":
          this.handleCursorExecution(message.data?.taskId);
          break;

        case "action-button":
          this.handleActionButton(message.data?.action, message.data?.taskId);
          break;

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

        // Task 3.3.10: Handle quick action messages from empty state
        case "quick-action":
          this.handleQuickAction(message.data?.action);
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
          console.warn(
            `[TaskDetailCard] Unknown webview message command: ${message.command}`,
            message
          );
      }
    } catch (error) {
      console.error(
        `[TaskDetailCard] Failed to handle webview message:`,
        error
      );
    }
  }

  /**
   * Sets up webview message handling for bidirectional communication
   * Called during webview initialization to configure message listeners
   * Task EXPANSION-FIX-3: Enhanced with debug logging for message flow verification
   *
   * @param webview - The webview instance to configure message handling for
   */
  private setupMessageHandling(webview: vscode.Webview): void {
    try {
      // Configure message listener for webview communication
      webview.onDidReceiveMessage(
        (message) => {
          this.handleWebviewMessage(message);
        },
        undefined,
        this.disposables
      );
    } catch (error) {
      console.error(
        "[TaskDetailCard] Failed to setup message handling:",
        error
      );
    }
  }

  /**
   * Validates webview message structure and content
   * Called before processing any webview message to prevent errors
   * Task EXPANSION-FIX-3: Enhanced with debug logging for validation troubleshooting
   *
   * @param message - The message to validate
   * @returns True if message is valid and can be processed
   */
  private isValidMessage(message: any): boolean {
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

  /**
   * Handles status change requests from the webview
   * Called when user requests to change task status via webview
   *
   * @param taskId - The ID of the task to update
   * @param newStatus - The new status to set for the task
   */
  private handleStatusChange(taskId: string, newStatus: TaskStatus): void {
    try {
      if (!taskId || !newStatus) {
        console.warn("Invalid status change request:", { taskId, newStatus });
        return;
      }

      // Validate that the task exists and can be updated
      if (!this.currentTask || this.currentTask.id !== taskId) {
        console.warn("Status change requested for non-current task:", taskId);
        return;
      }

      // Validate status transition (basic validation)
      if (!this.isValidStatusTransition(this.currentTask.status, newStatus)) {
        console.warn("Invalid status transition:", {
          from: this.currentTask.status,
          to: newStatus,
          taskId,
        });
        return;
      }

      // Emit status change event for extension integration
      this._onStatusChanged.fire({
        taskId: taskId,
        newStatus: newStatus,
      });

      console.log(`Status change requested for task ${taskId}: ${newStatus}`);
    } catch (error) {
      console.error("Failed to handle status change:", error);
    }
  }

  /**
   * Handles Cursor execution requests from the webview
   * Called when user requests Cursor AI integration for a task
   *
   * @param taskId - The ID of the task to execute with Cursor
   */
  private handleCursorExecution(taskId: string): void {
    try {
      if (!taskId) {
        console.warn("Invalid Cursor execution request:", { taskId });
        return;
      }

      // Validate that the task exists and is executable
      if (!this.currentTask || this.currentTask.id !== taskId) {
        console.warn(
          "Cursor execution requested for non-current task:",
          taskId
        );
        return;
      }

      if (!this.currentTask.isExecutable) {
        console.warn(
          "Cursor execution requested for non-executable task:",
          taskId
        );
        return;
      }

      if (this.currentTask.status !== TaskStatus.NOT_STARTED) {
        console.warn(
          "Cursor execution requested for non-NOT_STARTED task:",
          taskId
        );
        return;
      }

      // Emit Cursor execution event for extension integration
      this._onCursorExecuteRequested.fire({
        taskId: taskId,
      });

      console.log(`Cursor execution requested for task ${taskId}`);
    } catch (error) {
      console.error("Failed to handle Cursor execution:", error);
    }
  }

  /**
   * Handles action button clicks from the webview
   * Called when user clicks various action buttons in the webview
   *
   * @param action - The action string that was clicked
   * @param taskId - The ID of the task the action applies to
   */
  private handleActionButton(action: string, taskId: string): void {
    try {
      if (!action || !taskId) {
        console.warn("Invalid action button request:", { action, taskId });
        return;
      }

      // Validate that the task exists
      if (!this.currentTask || this.currentTask.id !== taskId) {
        console.warn("Action button clicked for non-current task:", {
          action,
          taskId,
        });
        return;
      }

      // Route action to appropriate handler based on action type
      if (action.includes("Robot") || action.includes("Execute with Cursor")) {
        this.handleCursorExecution(taskId);
      } else if (action.includes("Status") || action.includes("status")) {
        // Handle status-related actions (future implementation)
        console.log("Status action clicked:", { action, taskId });
      } else {
        // Handle other action types (future implementation)
        console.log("Action button clicked:", { action, taskId });
      }
    } catch (error) {
      console.error("Failed to handle action button:", error);
    }
  }

  /**
   * Validates if a status transition is allowed
   * Called to ensure status changes follow business rules
   *
   * @param currentStatus - The current status of the task
   * @param newStatus - The proposed new status
   * @returns True if the status transition is valid
   */
  private isValidStatusTransition(
    currentStatus: TaskStatus,
    newStatus: TaskStatus
  ): boolean {
    try {
      // Basic status transition validation
      const validTransitions: Record<TaskStatus, TaskStatus[]> = {
        [TaskStatus.NOT_STARTED]: [TaskStatus.IN_PROGRESS, TaskStatus.BLOCKED],
        [TaskStatus.IN_PROGRESS]: [
          TaskStatus.REVIEW,
          TaskStatus.BLOCKED,
          TaskStatus.COMPLETED,
        ],
        [TaskStatus.REVIEW]: [
          TaskStatus.COMPLETED,
          TaskStatus.IN_PROGRESS,
          TaskStatus.BLOCKED,
        ],
        [TaskStatus.COMPLETED]: [TaskStatus.IN_PROGRESS, TaskStatus.DEPRECATED],
        [TaskStatus.BLOCKED]: [TaskStatus.NOT_STARTED, TaskStatus.IN_PROGRESS],
        [TaskStatus.DEPRECATED]: [TaskStatus.NOT_STARTED],
      };

      const allowedTransitions = validTransitions[currentStatus] || [];
      return allowedTransitions.includes(newStatus);
    } catch (error) {
      console.error("Error validating status transition:", error);
      return false;
    }
  }

  /**
   * Disposes of all resources used by the provider
   * Called when the extension is deactivated or the provider is no longer needed
   * Task 3.3.9: Enhanced cleanup for time refresh interval
   */
  public dispose(): void {
    try {
      // Task 3.3.9: Clean up time refresh interval to prevent memory leaks
      if (this.timeRefreshInterval) {
        clearInterval(this.timeRefreshInterval);
        this.timeRefreshInterval = null;
      }

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
            <div class="meta-value complexity-${TaskDetailFormatters.formatComplexity(
              task.complexity
            )}">${TaskDetailFormatters.getComplexityDisplayName(task.complexity)}</div>
          </div>
          <div class="meta-item">
            <div class="meta-label">Duration</div>
            <div class="meta-value duration">${TaskDetailFormatters.formatEstimatedDuration(
              task.estimatedDuration
            )}</div>
          </div>
          <div class="meta-item">
            <div class="meta-label">Dependencies</div>
            <div class="meta-value dependencies">${TaskDetailFormatters.formatDependencies(
              task.dependencies
            )}</div>
          </div>
          <div class="meta-item">
            <div class="meta-label">Requirements</div>
            <div class="meta-value requirements">${TaskDetailFormatters.formatRequirements(
              task.requirements
            )}</div>
          </div>
          <div class="meta-item">
            <div class="meta-label">Created</div>
            <div class="meta-value created-date">${TaskDetailFormatters.formatRelativeTime(
              task.createdDate
            )}</div>
          </div>
          <div class="meta-item">
            <div class="meta-label">Modified</div>
            <div class="meta-value modified-date">${TaskDetailFormatters.formatRelativeTime(
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
      // Use inline method to parse and format duration if needed
      const parsedDuration =
        TaskDetailFormatters.parseEstimatedDuration(duration);
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

  /**
   * Sets up periodic time refresh mechanism
   * Called when the provider is initialized to set up a timer for dynamic time updates
   * Task 3.3.9: Periodic refresh mechanism for dynamic time updates
   */
  private setupPeriodicTimeRefresh(): void {
    try {
      // Set up a timer to refresh the time display every minute
      this.timeRefreshInterval = setInterval(() => {
        if (this.webview && this.webview.visible && this.currentTask) {
          // Task 3.3.9: Use efficient time refresh method
          this.refreshDisplayedTimes();
        }
      }, 60000); // 60000 milliseconds = 1 minute
    } catch (error) {
      console.error("Failed to setup periodic time refresh:", error);
    }
  }

  /**
   * Refreshes displayed times in the webview without full content reload
   * Called periodically to update relative time displays
   * Task 3.3.9: Efficient time updates without full webview reload
   */
  private refreshDisplayedTimes(): void {
    try {
      if (!this.webview || !this.webview.visible || !this.currentTask) {
        return;
      }

      // Update the webview content to refresh time displays
      this.webview.webview.html = this.generateTaskDetailsHTML(
        this.currentTask
      );
      
      // Send task data via postMessage for safe rendering (replaces HTML escaping)
      setTimeout(() => {
        if (this.currentTask && this.webview) {
          this.sendTaskDataToWebview(this.currentTask, this.webview.webview);
        }
      }, 100); // Small delay to ensure HTML is loaded
    } catch (error) {
      console.error("Failed to refresh displayed times:", error);
    }
  }

  /**
   * Handles time formatting failures gracefully with fallback display
   * Called when inline time formatting fails to format a timestamp
   * Task 3.3.9: Graceful error handling for time formatting failures
   *
   * @param error - The error that occurred during time formatting
   * @param fallbackTime - Fallback time string to display
   * @returns Formatted fallback time string
   */
  private handleTimeFormattingFailure(
    error: Error,
    fallbackTime: string
  ): string {
    try {
      // Log the error for debugging
      console.warn("Time formatting failed, using fallback:", {
        error: error.message,
        fallbackTime,
      });

      // Return fallback time or "Invalid date" if fallback is empty
      return fallbackTime || "Invalid date";
    } catch (fallbackError) {
      console.error("Failed to handle time formatting failure:", fallbackError);
      return "Invalid date";
    }
  }

  /**
   * Formats timestamps in HTML content using inline time formatting methods
   * Called when generating HTML to ensure consistent time formatting
   * Task 3.3.9: Integration of inline time formatting throughout HTML generation
   *
   * @param html - HTML content to format timestamps in
   * @param task - The task containing timestamp data
   * @returns HTML content with formatted timestamps
   */
  private formatTimestampsInHTML(html: string, task: Task): string {
    try {
      // Replace timestamp placeholders with formatted relative times
      let formattedHtml = html;

      // Format created date
      if (task.createdDate) {
        try {
          const formattedCreated =
            TaskDetailFormatters.formatRelativeTime(task.createdDate);
          formattedHtml = formattedHtml.replace(
            /{{CREATED_DATE}}/g,
            formattedCreated
          );
        } catch (error) {
          const fallbackCreated = this.handleTimeFormattingFailure(
            error as Error,
            task.createdDate
          );
          formattedHtml = formattedHtml.replace(
            /{{CREATED_DATE}}/g,
            fallbackCreated
          );
        }
      } else {
        // Handle case where createdDate is empty or undefined
        formattedHtml = formattedHtml.replace(
          /{{CREATED_DATE}}/g,
          "Invalid date"
        );
      }

      // Format last modified date
      if (task.lastModified) {
        try {
          const formattedModified =
            TaskDetailFormatters.formatRelativeTime(task.lastModified);
          formattedHtml = formattedHtml.replace(
            /{{LAST_MODIFIED}}/g,
            formattedModified
          );
        } catch (error) {
          const fallbackModified = this.handleTimeFormattingFailure(
            error as Error,
            task.lastModified
          );
          formattedHtml = formattedHtml.replace(
            /{{LAST_MODIFIED}}/g,
            fallbackModified
          );
        }
      } else {
        // Handle case where lastModified is empty or undefined
        formattedHtml = formattedHtml.replace(
          /{{LAST_MODIFIED}}/g,
          "Invalid date"
        );
      }

      // Format test results last run date
      if (task.testStatus?.lastRunDate) {
        try {
          const formattedLastRun =
            TaskDetailFormatters.formatRelativeTime(
              task.testStatus.lastRunDate
            );
          formattedHtml = formattedHtml.replace(
            /{{LAST_RUN_DATE}}/g,
            formattedLastRun
          );
        } catch (error) {
          const fallbackLastRun = this.handleTimeFormattingFailure(
            error as Error,
            task.testStatus.lastRunDate
          );
          formattedHtml = formattedHtml.replace(
            /{{LAST_RUN_DATE}}/g,
            fallbackLastRun
          );
        }
      } else {
        // Handle case where lastRunDate is empty or undefined
        formattedHtml = formattedHtml.replace(
          /{{LAST_RUN_DATE}}/g,
          "Never run"
        );
      }

      return formattedHtml;
    } catch (error) {
      console.error("Failed to format timestamps in HTML:", error);
      return html; // Return original HTML if formatting fails
    }
  }

  /**
   * Access to time formatting methods for testing and external access
   * Using simple inline methods for time formatting
   */

  /**
   * Gets the time refresh interval for testing and monitoring
   * Task 3.3.9: Access to time refresh interval for testing and debugging
   *
   * @returns The time refresh interval or null if not set
   */
  public getTimeRefreshInterval(): NodeJS.Timeout | null {
    return this.timeRefreshInterval;
  }

  /**
   * Public method to refresh relative times in the webview
   * Called by extension to trigger time updates without full webview reload
   * Task 4.1.3: Enable periodic time refresh from extension level
   *
   * @returns Promise that resolves when refresh is complete
   */
  public async refreshRelativeTimes(): Promise<void> {
    try {
      if (!this.webview || !this.webview.visible || !this.currentTask) {
        return;
      }

      // Use the existing refresh method for consistency
      this.refreshDisplayedTimes();

      console.log("Relative times refreshed successfully");
    } catch (error) {
      console.error("Failed to refresh relative times:", error);
      throw error;
    }
  }


  /**
   * Handles quick action requests from the empty state
   * Task 3.3.10: Process quick action button clicks from empty state
   *
   * @param action - The quick action to perform
   */
  private handleQuickAction(action: string): void {
    try {
      if (!action) {
        console.warn("Invalid quick action request:", { action });
        return;
      }

      // Route quick action to appropriate handler
      switch (action) {
        case "refresh":
          this.handleRefreshTasks();
          break;
        case "viewAll":
          this.handleViewAllTasks();
          break;
        case "help":
          this.handleShowHelp();
          break;
        case "settings":
          this.handleShowSettings();
          break;
        default:
          console.log("Unknown quick action:", action);
      }
    } catch (error) {
      console.error("Failed to handle quick action:", error);
    }
  }

  /**
   * Handles refresh tasks quick action
   * Task 3.3.10: Refresh task list functionality
   */
  private handleRefreshTasks(): void {
    try {
      console.log("Refresh tasks requested");
      // Future implementation: Trigger task list refresh
      // This could emit an event or call a service method
    } catch (error) {
      console.error("Failed to refresh tasks:", error);
    }
  }

  /**
   * Handles view all tasks quick action
   * Task 3.3.10: View all tasks functionality
   */
  private handleViewAllTasks(): void {
    try {
      console.log("View all tasks requested");
      // Future implementation: Show all tasks view
      // This could open a new panel or expand the tree view
    } catch (error) {
      console.error("Failed to view all tasks:", error);
    }
  }

  /**
   * Handles show help quick action
   * Task 3.3.10: Show help functionality
   */
  private handleShowHelp(): void {
    try {
      console.log("Show help requested");
      // Future implementation: Display help documentation
      // This could open help panel or show documentation
    } catch (error) {
      console.error("Failed to show help:", error);
    }
  }

  /**
   * Handles show settings quick action
   * Task 3.3.10: Show settings functionality
   */
  private handleShowSettings(): void {
    try {
      console.log("Show settings requested");
      // Future implementation: Open settings panel
      // This could open VSCode settings or extension settings
    } catch (error) {
      console.error("Failed to show settings:", error);
    }
  }
}
