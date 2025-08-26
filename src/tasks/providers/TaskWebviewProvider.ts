/**
 * TaskWebviewProvider Class
 * VSCode WebviewViewProvider implementation for task management webview
 * Requirements: 2.1, 3.1-3.6, 4.1-4.4
 * Task WV-001: Create WebviewViewProvider Base Class
 * Task WV-002: Implement HTML Template System
 * Task WV-005: Implement Webview Message Handling
 * Task WV-007: Connect to TasksDataService with Workspace Initialization
 * Task WV-009: Implement State Persistence for Accordion Expansion
 * Task API-1: Replace localStorage with VSCode Memento API
 *
 * This provider handles webview-based task management display with basic
 * HTML template generation infrastructure for future taskmaster dashboard.
 */

import * as vscode from "vscode";
import {
  Task,
  TaskStatus,
  STATUS_DISPLAY_NAMES,
  STATUS_ACTIONS,
  TaskErrorResponse,
} from "../../types/tasks";
import { TasksDataService } from "../../services";

/**
 * Webview message interface for task interactions
 * Task WV-005: Message structure for webview-to-extension communication
 */
interface WebviewMessage {
  type: "updateTaskStatus" | "executeWithCursor" | "toggleAccordion";
  taskId: string;
  newStatus?: TaskStatus;
  payload?: any;
}

/**
 * Webview state interface for persistence
 * Task WV-009: State structure for accordion expansion persistence
 */
interface WebviewState {
  expandedTaskId: string | null;
  lastUpdated: number;
}

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
 * - TasksDataService integration with workspace initialization
 * - State persistence for accordion expansion across sessions
 * - VSCode Memento API for native state management
 */
export class TaskWebviewProvider implements vscode.WebviewViewProvider {
  /**
   * Webview instance for content management
   * Used to update webview content and handle communication
   */
  private _view?: vscode.WebviewView;

  /**
   * Disposables for cleanup of event listeners and message handlers
   * Task WV-005: Track disposables for proper cleanup
   */
  private readonly _disposables: vscode.Disposable[] = [];

  /**
   * TasksDataService reference for data retrieval and event handling
   * Task WV-007: Store service reference for data integration
   */
  private readonly tasksDataService: TasksDataService;

  /**
   * VSCode extension context for state persistence
   * Task API-1: Use VSCode Memento API for native state management
   */
  private readonly context: vscode.ExtensionContext;

  /**
   * Event listener disposables for proper cleanup
   * Task WV-007: Store disposables for event listener cleanup
   */
  private readonly eventDisposables: vscode.Disposable[] = [];

  /**
   * FIXED: _isDataInitialized property removed - no longer needed since data initialization
   * happens automatically in resolveWebviewView() method
   */

  /**
   * Currently expanded task ID for accordion behavior
   * Task WV-009: Track expansion state for persistence
   */
  private currentExpandedTaskId: string | null = null;

  /**
   * Constructor for TaskWebviewProvider
   * Task WV-007: Accept TasksDataService for data integration
   * Task API-1: Accept ExtensionContext for VSCode Memento API
   *
   * @param tasksDataService - TasksDataService instance for data retrieval and events
   * @param context - VSCode ExtensionContext for native state management
   */
  constructor(
    tasksDataService: TasksDataService,
    context: vscode.ExtensionContext
  ) {
    this.tasksDataService = tasksDataService;
    this.context = context;

    // Task WV-007: Setup event listeners but defer data loading until initializeData() called
    this.setupEventListeners();

    console.debug("TaskWebviewProvider: Constructor with context completed");
  }

  /**
   * Setup event listeners for TasksDataService events
   * Task WV-007: Connect to service events for automatic refresh but respect initialization state
   */
  private setupEventListeners(): void {
    try {
      // Listen for task data updates
      const tasksUpdatedDisposable = this.tasksDataService.onTasksUpdated.event(
        (tasks: Task[]) => this.handleTasksUpdated(tasks)
      );
      this.eventDisposables.push(tasksUpdatedDisposable);

      // Listen for service errors
      const errorDisposable = this.tasksDataService.onError.event(
        (error: TaskErrorResponse) => this.handleServiceError(error)
      );
      this.eventDisposables.push(errorDisposable);

      console.debug(
        "TaskWebviewProvider: Event listeners connected successfully"
      );
    } catch (error) {
      console.error(
        "TaskWebviewProvider: Failed to setup event listeners:",
        error
      );
      // Continue without automatic refresh - manual refresh still works
    }
  }

  /**
   * FIXED: initializeData method removed - data initialization now happens automatically
   * in resolveWebviewView() method to prevent race conditions
   *
   * The old initializeData() method has been replaced by loadDataAfterWebviewReady()
   * which is called directly from resolveWebviewView() after the webview is confirmed ready.
   */

  /**
   * Load tasks from service and display in webview
   * Task WV-007: Load real data from TasksDataService
   * FIXED: Remove _isDataInitialized check since initialization is handled in resolveWebviewView
   */
  private async loadAndDisplayTasks(): Promise<void> {
    try {
      // FIXED: Remove initialization check - this method is only called after webview is ready
      const tasks = await this.tasksDataService.getTasks();
      await this.updateWebviewContent(tasks);

      console.debug(
        `TaskWebviewProvider: Loaded and displayed ${tasks.length} tasks`
      );
    } catch (error) {
      console.error("TaskWebviewProvider: Failed to load tasks:", error);
      await this.showErrorState("Failed to load tasks");
    }
  }

  /**
   * Update webview HTML content with task data
   * Task WV-007: Update webview with real task data
   * Task API-4: Restore accordion state after content updates
   */
  private async updateWebviewContent(tasks: Task[]): Promise<void> {
    if (!this._view) return;

    // Update webview HTML content
    this._view.webview.html = this.getHtmlContent(tasks);

    // Restore accordion state after content loads
    if (this.currentExpandedTaskId) {
      // Small delay to ensure HTML is rendered before state restoration
      setTimeout(() => {
        this.restoreAccordionState(this.currentExpandedTaskId!);
      }, 100);
    }

    console.debug(
      `TaskWebviewProvider: Content updated with ${tasks.length} tasks, expanded: ${this.currentExpandedTaskId}`
    );
  }

  /**
   * Handle tasks updated event from TasksDataService
   * Task WV-007: Automatic refresh when data changes
   * FIXED: Remove _isDataInitialized check since webview is always ready when this is called
   */
  private handleTasksUpdated(tasks: Task[]): void {
    try {
      // FIXED: Remove initialization check - webview is always ready when events fire
      console.debug("TaskWebviewProvider: Tasks updated, refreshing webview");
      this.updateWebviewContent(tasks).catch((error) => {
        console.error(
          "TaskWebviewProvider: Error updating webview content:",
          error
        );
      });
    } catch (error) {
      console.error("TaskWebviewProvider: Error handling tasks update:", error);
    }
  }

  /**
   * Handle service error events from TasksDataService
   * Task WV-007: Graceful error handling without breaking webview
   * FIXED: Remove _isDataInitialized check since webview is always ready when errors occur
   */
  private handleServiceError(error: TaskErrorResponse): void {
    try {
      console.warn("TaskWebviewProvider: Service error received:", {
        operation: error.operation,
        taskId: error.taskId,
        userInstructions: error.userInstructions,
      });

      // FIXED: Always show error state since webview is ready
      this.showErrorState(
        error.userInstructions || "Service error occurred"
      ).catch((err) => {
        console.error("Error displaying service error:", err);
      });
    } catch (error) {
      console.error(
        "TaskWebviewProvider: Error handling service error:",
        error
      );
    }
  }

  /**
   * Display error state in webview
   * Task WV-007: Show helpful error messages with retry options
   */
  private async showErrorState(message: string): Promise<void> {
    if (!this._view) return;

    this._view.webview.html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="Content-Security-Policy" 
          content="default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline'; img-src vscode-resource: https: data:; font-src vscode-resource: https:;">
    <title>Taskmaster - Error</title>
</head>
<body>
    <div id="taskmaster-root">
        <h3>Unable to Load Tasks</h3>
        <p>${message}</p>
        <button onclick="location.reload()">Retry</button>
    </div>
</body>
</html>`;
  }

  /**
   * Check if data has been initialized
   * Utility method for checking initialization state
   * Task WV-001: Workspace initialization state checking
   * FIXED: Updated to reflect new initialization approach
   */
  public isDataInitialized(): boolean {
    // FIXED: Data initialization now happens automatically in resolveWebviewView
    // This method is kept for backward compatibility but always returns true
    // since the webview handles its own initialization
    return true;
  }

  /**
   * Save current webview state to VSCode workspace storage
   * Task API-1: Use VSCode Memento API for native state management
   */
  private async saveWebviewState(expandedTaskId: string | null): Promise<void> {
    try {
      await this.context.workspaceState.update(
        "taskmaster.expandedTask",
        expandedTaskId
      );
      await this.context.workspaceState.update(
        "taskmaster.lastUpdated",
        Date.now()
      );

      console.debug("TaskWebviewProvider: State saved to workspace storage:", {
        expandedTaskId,
        timestamp: Date.now(),
      });
    } catch (error) {
      console.warn(
        "TaskWebviewProvider: Failed to save state to workspace storage:",
        error
      );
    }
  }

  /**
   * Load webview state from VSCode workspace storage
   * Task API-1: Use VSCode Memento API for native state management
   */
  private async loadWebviewState(): Promise<string | null> {
    try {
      const expandedTaskId = this.context.workspaceState.get<string | null>(
        "taskmaster.expandedTask",
        null
      );
      const lastUpdated = this.context.workspaceState.get<number>(
        "taskmaster.lastUpdated",
        0
      );

      console.debug(
        "TaskWebviewProvider: State loaded from workspace storage:",
        {
          expandedTaskId,
          lastUpdated: new Date(lastUpdated).toISOString(),
        }
      );

      return expandedTaskId;
    } catch (error) {
      console.warn(
        "TaskWebviewProvider: Failed to load state from workspace storage:",
        error
      );
      return null;
    }
  }

  /**
   * Handle accordion toggle with state persistence
   * Task WV-009: Update both memory and persistent state on user interaction
   * Task API-4: Save state to VSCode workspace storage
   */
  private async handleAccordionToggle(taskId: string): Promise<void> {
    try {
      const wasExpanded = this.currentExpandedTaskId === taskId;

      if (wasExpanded) {
        // Collapse currently expanded task
        this.currentExpandedTaskId = null;
        console.debug("TaskWebviewProvider: Task collapsed:", taskId);
      } else {
        // Expand new task (accordion behavior)
        this.currentExpandedTaskId = taskId;
        console.debug("TaskWebviewProvider: Task expanded:", taskId);
      }

      // Save state to VSCode workspace storage
      await this.saveWebviewState(this.currentExpandedTaskId);

      console.debug(
        `TaskWebviewProvider: Accordion toggled and state saved: ${taskId}`
      );
    } catch (error) {
      console.error(
        "TaskWebviewProvider: Error handling accordion toggle:",
        error
      );
    }
  }

  /**
   * Update accordion state in webview DOM
   * Task WV-009: Send message to webview JavaScript to update visual state
   */
  private async updateAccordionState(
    taskId: string,
    isExpanded: boolean
  ): Promise<void> {
    if (!this._view) return;

    try {
      // Send message to webview JavaScript to update DOM
      await this._view.webview.postMessage({
        type: "updateAccordion",
        taskId: taskId,
        expanded: isExpanded,
      });

      console.debug("TaskWebviewProvider: Accordion state update sent:", {
        taskId,
        isExpanded,
      });
    } catch (error) {
      console.error(
        "TaskWebviewProvider: Error updating accordion state:",
        error
      );
    }
  }

  /**
   * Restore accordion state after webview content updates
   * Task API-4: Send state restoration message to webview JavaScript
   *
   * @param expandedTaskId - The task ID to restore as expanded
   */
  private restoreAccordionState(expandedTaskId: string): void {
    if (!this._view || !expandedTaskId) return;

    try {
      // Send message to webview to restore accordion state
      this._view.webview.postMessage({
        type: "restoreState",
        expandedTaskId: expandedTaskId,
      });

      console.debug(
        `TaskWebviewProvider: Accordion state restoration sent: ${expandedTaskId}`
      );
    } catch (error) {
      console.warn(
        "TaskWebviewProvider: Failed to restore accordion state:",
        error
      );
    }
  }

  /**
   * Refresh webview content after data initialization
   * Task WV-001: Content refresh for workspace-aware updates
   * Task WV-007: Use loadAndDisplayTasks for real data loading
   */
  private async refreshContent(): Promise<void> {
    if (!this._view) return;

    // Task WV-007: Use real data loading instead of empty array
    await this.loadAndDisplayTasks();
  }

  /**
   * Resolves the webview view when it becomes visible
   * Implements the required vscode.WebviewViewProvider interface method
   * Task WV-005: Initialize message handling when webview loads
   * Task WV-009: Initialize state loading for accordion persistence
   * FIXED: Move data initialization directly into resolveWebviewView to prevent race conditions
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

      // Set loading HTML immediately to prevent race conditions
      webviewView.webview.html = this.getLoadingHTML();

      // Task WV-005: Setup message handling for webview communication
      this.setupMessageHandling();

      // Task WV-009: Initialize state loading for accordion persistence
      this.loadWebviewState().then((expandedTaskId) => {
        this.currentExpandedTaskId = expandedTaskId;
      });

      // FIXED: Load data asynchronously after webview is ready
      // This prevents race conditions by ensuring webview is fully resolved first
      this.loadDataAfterWebviewReady().catch((error) => {
        console.error(
          "TaskWebviewProvider: Failed to load webview data:",
          error
        );
        this.showErrorState("Failed to load tasks").catch((err) => {
          console.error("TaskWebviewProvider: Error showing error state:", err);
        });
      });
    } catch (error) {
      // Basic error handling for webview resolution
      console.error(
        "TaskWebviewProvider: Error resolving webview view:",
        error
      );
    }
  }

  /**
   * FIXED: Load data after webview is confirmed ready
   * This method contains the logic previously in initializeData()
   * but is called directly from resolveWebviewView() to prevent race conditions
   *
   * @returns Promise that resolves when data loading is complete
   */
  private async loadDataAfterWebviewReady(): Promise<void> {
    try {
      if (!this._view) {
        console.warn(
          "TaskWebviewProvider: Cannot load data - no webview available"
        );
        return;
      }

      console.debug(
        "TaskWebviewProvider: Starting data loading after webview ready"
      );

      // FIXED: Data initialization flag removed - no longer needed

      // Load accordion state from VSCode workspace storage
      this.currentExpandedTaskId = await this.loadWebviewState();

      // Setup event listeners now that service is initialized
      if (this.eventDisposables.length === 0) {
        this.setupEventListeners();
      }

      // Load and display tasks
      await this.loadAndDisplayTasks();

      console.debug("TaskWebviewProvider: Data loading completed successfully");
    } catch (error) {
      console.error("TaskWebviewProvider: Failed to load webview data:", error);
      // Don't throw - allow the provider to continue with error state
      await this.showErrorState("Failed to load task data");
    }
  }

  /**
   * Generates HTML content for the webview with task data
   * Returns dynamic HTML template with data injection placeholders
   * Task WV-001: Workspace-aware content generation
   * FIXED: Remove dependency on _isDataInitialized since loading HTML is set immediately
   *
   * @param tasks - Array of tasks to display (defaults to empty array)
   * @returns HTML string for webview content
   */
  private getHtmlContent(tasks: Task[] = []): string {
    // FIXED: Always return task content since loading state is handled separately
    return this.generateTaskmasterHTML(tasks);
  }

  /**
   * Generates loading HTML for workspace initialization state
   * Task WV-001: Loading state display before data initialization
   *
   * @returns HTML string for loading state
   */
  private getLoadingHTML(): string {
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="Content-Security-Policy" 
          content="default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline'; img-src vscode-resource: https: data:; font-src vscode-resource: https:;">
    <title>Taskmaster</title>
</head>
<body>
    <div id="taskmaster-root">
        <h3>Loading Tasks...</h3>
        <p>Please wait while workspace initializes...</p>
    </div>
</body>
</html>`;
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
    <meta http-equiv="Content-Security-Policy" 
          content="default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline'; img-src vscode-resource: https: data:; font-src vscode-resource: https:;">
    <title>Taskmaster Dashboard</title>
    <style>
        ${this.getTaskmasterCSS()}
    </style>
</head>
<body>
    <div class="sidebar">
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
   * Generates individual task item HTML with status badges and accordion structure
   * Creates task item structure following mockup design with proper type safety
   *
   * @param task - Task object to render
   * @returns HTML string for single task item
   */
  private generateTaskItem(task: Task): string {
    const statusClass = this.getStatusClass(task.status);
    const statusDisplay = STATUS_DISPLAY_NAMES[task.status] || task.status;
    const isExecutable =
      Boolean(task.isExecutable) && task.status === TaskStatus.NOT_STARTED;

    // ADD: Generate subtasks HTML if subtasks exist
    const subtasksHtml = this.generateSubtasksSection(task);

    return `<div class="task-item" data-task-id="${
      task.id
    }" onclick="toggleTask(this)">
      ${this.generateTaskHeader(task, statusClass, statusDisplay, isExecutable)}
      ${this.generateTaskDetails(task)}
      ${subtasksHtml}
    </div>`;
  }

  /**
   * Generates subtasks section HTML for tasks with subtasks
   * Renders hierarchical task relationships with proper indentation
   *
   * @param task - Task object to generate subtasks for
   * @returns HTML string for subtasks section or empty string if no subtasks
   */
  private generateSubtasksSection(task: Task): string {
    if (!task.subtasks || task.subtasks.length === 0) {
      return "";
    }

    const subtaskItems = task.subtasks
      .map(
        (subtask) =>
          `<div class="subtask-item" data-subtask-id="${subtask.id}">
            <span class="subtask-id">${subtask.id}</span>
            <span class="subtask-title">${this.escapeHtml(
              subtask.description
            )}</span>
            <span class="subtask-status ${this.getSubtaskStatusClass(
              subtask.status
            )}">${subtask.status}</span>
          </div>`
      )
      .join("");

    return `<div class="subtasks-section">
      <div class="subtasks-header">Subtasks (${task.subtasks.length})</div>
      <div class="subtasks-list">${subtaskItems}</div>
    </div>`;
  }

  /**
   * Generates task header HTML with expand icon, ID, title, status, and executable indicator
   * Creates header structure following mockup design with proper styling
   *
   * @param task - Task object to generate header for
   * @param statusClass - CSS class for status styling
   * @param statusDisplay - Human-readable status display name
   * @param isExecutable - Whether task is executable with Cursor
   * @returns HTML string for task header
   */
  private generateTaskHeader(
    task: Task,
    statusClass: string,
    statusDisplay: string,
    isExecutable: boolean
  ): string {
    const executableIcon = isExecutable
      ? '<span class="cursor-icon">🤖</span>'
      : "";
    const executableClass = isExecutable ? " executable" : "";

    return `<div class="task-header${executableClass}">
      <svg class="task-expand-icon" viewBox="0 0 16 16" fill="currentColor">
        <path d="m12.14 8.753-5.482 4.796c-.646.566-1.658.106-1.658-.753V3.204a1 1 0 0 1 1.659-.753l5.48 4.796a1 1 0 0 1 0 1.506z"/>
      </svg>
      <span class="task-id">${task.id}</span>
      <span class="task-title">${this.escapeHtml(task.title)}</span>
      <span class="task-status ${statusClass}">${statusDisplay}</span>
      ${executableIcon}
    </div>`;
  }

  /**
   * Generates CSS class for task status styling
   * Maps TaskStatus enum values to CSS class names
   *
   * @param status - TaskStatus enum value
   * @returns CSS class string for status styling
   */
  private getStatusClass(status: TaskStatus): string {
    return status.replace("_", "-");
  }

  /**
   * Generates CSS class for subtask status styling
   * Maps string status values to CSS class names for subtasks
   *
   * @param status - String status value from subtask
   * @returns CSS class string for subtask status styling
   */
  private getSubtaskStatusClass(status: string): string {
    return status.toLowerCase().replace(/[^a-z0-9]/g, "-");
  }

  /**
   * Escapes HTML content to prevent injection vulnerabilities
   * Converts special characters to HTML entities
   *
   * @param text - Raw text to escape
   * @returns Escaped HTML-safe string
   */
  private escapeHtml(text: string): string {
    const htmlEntities: Record<string, string> = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    };

    return text.replace(/[&<>"']/g, (char) => htmlEntities[char] || char);
  }

  /**
   * Generates task details HTML with description, meta, dependencies, test results, and actions
   * Creates details section following mockup design with proper styling
   *
   * @param task - Task object to generate details for
   * @returns HTML string for task details
   */
  private generateTaskDetails(task: Task): string {
    return `<div class="task-details">
      <div class="task-description">${this.escapeHtml(task.description)}</div>
      ${this.generateTaskMeta(task)}
      ${this.generateDependencies(task)}
      ${this.generateTestResults(task)}
      ${this.generateActions(task)}
    </div>`;
  }

  /**
   * Generates task metadata section HTML
   * Renders complexity and estimated duration information
   *
   * @param task - Task object to generate metadata for
   * @returns HTML string for task metadata
   */
  private generateTaskMeta(task: Task): string {
    const complexityClass = `complexity-${task.complexity}`;
    return `<div class="task-meta">
      <div class="meta-item">
        <div class="meta-label">Complexity</div>
        <div class="meta-value ${complexityClass}">${
      task.complexity.charAt(0).toUpperCase() + task.complexity.slice(1)
    }</div>
      </div>
      <div class="meta-item">
        <div class="meta-label">Estimated</div>
        <div class="meta-value">${
          task.estimatedDuration || "Not specified"
        }</div>
      </div>
    </div>`;
  }

  /**
   * Generates dependencies section HTML
   * Renders dependency tags or "None" if no dependencies
   *
   * @param task - Task object to generate dependencies for
   * @returns HTML string for dependencies section
   */
  private generateDependencies(task: Task): string {
    return `<div class="dependencies">
      <div class="dependencies-title">Dependencies</div>
      <div class="dependency-list">
        ${
          task.dependencies.length > 0
            ? task.dependencies
                .map(
                  (dep) =>
                    `<span class="dependency-tag">${this.escapeHtml(
                      dep
                    )}</span>`
                )
                .join("")
            : '<span class="dependency-tag">None</span>'
        }
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
    if (!task.testStatus || task.testStatus.totalTests === 0) {
      return '<div class="no-tests">No tests available yet</div>';
    }

    const testStatus = task.testStatus;
    const hasFailures = testStatus.failedTests > 0;

    return `<div class="test-results">
      <div class="test-header">
        <div class="test-title">Test Results</div>
        <div class="test-date">Last run: ${
          testStatus.lastRunDate
            ? this.formatRelativeTime(testStatus.lastRunDate)
            : "Not run yet"
        }</div>
      </div>
      ${this.generateTestStats(testStatus)}
      ${
        hasFailures
          ? this.generateFailuresSection(testStatus.failingTestsList || [])
          : ""
      }
    </div>`;
  }

  /**
   * Generates test statistics HTML
   * Renders total, passed, and failed test counts
   *
   * @param testStatus - Test status object with statistics
   * @returns HTML string for test statistics
   */
  private generateTestStats(testStatus: any): string {
    return `<div class="test-stats">
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
    </div>`;
  }

  /**
   * Generates failures section HTML for test results
   * Renders failing tests list following mockup structure
   *
   * @param failingTestsList - Array of failing test objects
   * @returns HTML string for failures section
   */
  private generateFailuresSection(failingTestsList: any[]): string {
    if (!failingTestsList || failingTestsList.length === 0) {
      return "";
    }

    const failuresHTML = failingTestsList
      .map(
        (failure) => `
        <div class="failure-item">
          <div class="failure-name">${this.escapeHtml(failure.name)}</div>
          <div class="failure-message">${this.escapeHtml(failure.message)}</div>
        </div>
      `
      )
      .join("");

    return `<div class="failures-section">
      <div class="failures-header" onclick="toggleFailures(this.parentElement)">
        <span>${failingTestsList.length} Failed Tests</span>
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
  private generateActions(task: Task): string {
    // Use STATUS_ACTIONS from types/tasks.ts for proper action mapping
    const actions = STATUS_ACTIONS[task.status] || [];

    return `<div class="actions">
      ${actions
        .map((action: string, index: number) => {
          const isPrimary =
            index === 0 &&
            (task.status === TaskStatus.NOT_STARTED ||
              task.status === TaskStatus.IN_PROGRESS);
          const buttonClass = isPrimary ? "action-btn primary" : "action-btn";
          return `<button class="${buttonClass}">${action}</button>`;
        })
        .join("")}
    </div>`;
  }

  /**
   * Generates CSS styles following mockup design
   * Returns complete CSS for Taskmaster dashboard
   *
   * @returns CSS string for dashboard styling
   */
  private getTaskmasterCSS(): string {
    return `/* WEBVIEW CONTAINER RESET - CSS-001 */
        html, body {
            margin: 0 !important;
            padding: 0 !important;
            width: 100% !important;
            height: 100% !important;
            box-sizing: border-box !important;
            overflow-x: hidden !important;
        }

        /* VSCode webview container reset */
        body > * {
            margin: 0 !important;
            padding: 0 !important;
        }

        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: var(--vscode-editor-background);
            color: var(--vscode-sideBar-foreground);
            height: 100vh;
            display: flex;
            margin: 0 !important;
            padding: 0 !important;  /* Override VSCode's padding: 0 20px */
        }

        .sidebar {
            width: 100%;
            min-width: 250px;
            max-width: 100%;
            background: var(--vscode-sideBar-background);
            display: flex;
            flex-direction: column;
            height: 100vh;
        }

        .sidebar-content {
            flex: 1;
            overflow-y: auto;
        }

        .task-list {
            padding: 0;
            margin: 0;
        }

        .task-item {
            border-bottom: 1px solid var(--vscode-sideBar-border);
            background: var(--vscode-sideBar-background);
            transition: background 0.2s;
            margin: 0;
        }

        .task-item:hover {
            background: var(--vscode-list-hoverBackground);
        }

        .task-header {
            padding: clamp(8px, 2vw, 12px);
            cursor: pointer;
            display: flex;
            align-items: center;
            gap: clamp(8px, 2vw, 12px);
            font-size: clamp(11px, 2.5vw, 13px);
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
            background: var(--vscode-badge-background);
            padding: 2px 6px;
            border-radius: 3px;
            color: var(--vscode-badge-foreground);
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
            color: #ffffff;
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
            background: var(--vscode-sideBarSectionHeader-background);
            border-top: 1px solid var(--vscode-sideBar-border);
            padding: clamp(12px, 2.5vw, 12px);
        }

        .task-item.expanded .task-details {
            display: block;
        }

        .task-description {
            margin-bottom: clamp(12px, 2.5vw, 16px);
            font-size: clamp(10px, 2.2vw, 12px);
            line-height: 1.4;
            color: var(--vscode-descriptionForeground);
        }

        .task-meta {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
            gap: clamp(8px, 2vw, 12px);
            margin-bottom: clamp(12px, 2.5vw, 16px);
        }

        .meta-item {
            font-size: 11px;
        }

        .meta-label {
            color: var(--vscode-descriptionForeground);
            margin-bottom: 2px;
        }

        .meta-value {
            color: var(--vscode-sideBar-foreground);
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
            margin-bottom: clamp(12px, 2.5vw, 16px);
        }

        .dependencies-title {
            font-size: 11px;
            color: var(--vscode-descriptionForeground);
            margin-bottom: 6px;
        }

        .dependency-list {
            display: flex;
            flex-wrap: wrap;
            gap: 4px;
        }

        .dependency-tag {
            background: var(--vscode-badge-background);
            color: var(--vscode-badge-foreground);
            font-size: 10px;
            padding: 2px 6px;
            border-radius: 3px;
            font-family: 'Courier New', monospace;
        }

        .test-results {
            background: var(--vscode-editor-background);
            border: 1px solid var(--vscode-sideBar-border);
            border-radius: 4px;
            padding: clamp(8px, 2vw, 12px);
            margin-bottom: clamp(8px, 2vw, 12px);
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
            color: var(--vscode-sideBar-foreground);
        }

        .test-date {
            font-size: 10px;
            color: var(--vscode-descriptionForeground);
        }

        .test-stats {
            display: flex;
            gap: clamp(8px, 2vw, 16px);
            margin-bottom: clamp(6px, 1.5vw, 8px);
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
            color: var(--vscode-descriptionForeground);
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
            color: var(--vscode-errorForeground);
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
            color: var(--vscode-sideBar-foreground);
        }

        .failures-section.expanded .failures-list {
            display: block;
        }

        .failure-item {
            background: var(--vscode-sideBarSectionHeader-background);
            border-left: 3px solid var(--vscode-errorForeground);
            padding: 6px 8px;
            margin-bottom: 4px;
            border-radius: 2px;
        }

        .failure-name {
            font-weight: 500;
            margin-bottom: 2px;
        }

        .failure-message {
            color: var(--vscode-descriptionForeground);
            font-family: 'Courier New', monospace;
            font-size: 9px;
        }

        .actions {
            display: flex;
            gap: clamp(6px, 1.5vw, 8px);
            flex-wrap: wrap;
        }

        .action-btn {
            background: var(--vscode-button-secondaryBackground);
            border: none;
            color: var(--vscode-button-secondaryForeground);
            padding: 6px 12px;
            border-radius: 3px;
            font-size: 10px;
            cursor: pointer;
            transition: background 0.2s;
        }

        .action-btn:hover {
            background: var(--vscode-button-secondaryHoverBackground);
        }

        .action-btn.primary {
            background: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
        }

        .action-btn.primary:hover {
            background: var(--vscode-button-hoverBackground);
        }

        .no-tests {
            font-size: 11px;
            color: var(--vscode-descriptionForeground);
            font-style: italic;
            text-align: center;
            padding: 8px;
        }

        .no-tasks {
            font-size: clamp(10px, 2.2vw, 12px);
            color: var(--vscode-descriptionForeground);
            font-style: italic;
            text-align: center;
            padding: clamp(16px, 3vw, 20px);
        }

        .task-item.executable .task-header {
            border-left: 3px solid var(--vscode-progressBar-background);
        }

        .cursor-icon {
            font-size: 12px;
            margin-left: 4px;
        }

        .section-divider {
            height: 1px;
            background: var(--vscode-sideBar-border);
            margin: 12px 0;
        }

        .failure-toggle-icon {
            transition: transform 0.2s;
        }

        .failures-section.expanded .failure-toggle-icon {
            transform: rotate(90deg);
        }

        .subtasks-section {
            margin-top: 12px;
            padding-top: 12px;
            border-top: 1px solid var(--vscode-sideBar-border);
        }

        .subtasks-header {
            font-size: 10px;
            font-weight: 600;
            color: var(--vscode-sideBar-foreground);
            margin-bottom: 6px;
            opacity: 0.8;
        }

        .subtask-item {
            padding: 6px 0 6px 16px;
            border-left: 2px solid var(--vscode-sideBar-border);
            margin-left: 8px;
            margin-bottom: 4px;
            display: flex;
            align-items: center;
            gap: 8px;
            font-size: 11px;
        }

        .subtask-id {
            font-family: 'Courier New', monospace;
            background: var(--vscode-badge-background);
            color: var(--vscode-badge-foreground);
            padding: 1px 4px;
            border-radius: 2px;
            flex-shrink: 0;
        }

        .subtask-title {
            flex: 1;
            color: var(--vscode-sideBar-foreground);
            opacity: 0.9;
            font-size: 11px;
            line-height: 1.3;
        }

        .subtask-status {
            font-size: 9px;
            padding: 2px 6px;
            border-radius: 8px;
            text-transform: lowercase;
        }

        .subtask-status.pending {
            background: var(--vscode-button-secondaryBackground);
            color: var(--vscode-button-secondaryForeground);
        }

        .subtask-status.done {
            background: var(--vscode-testing-iconPassed);
            color: var(--vscode-editor-background);
        }

        .subtask-status.completed {
            background: var(--vscode-testing-iconPassed);
            color: var(--vscode-editor-background);
        }

        .subtask-status.in-progress {
            background: var(--vscode-progressBar-background);
            color: var(--vscode-editor-background);
        }

        .subtask-status.not-started {
            background: var(--vscode-button-secondaryBackground);
            color: var(--vscode-button-secondaryForeground);
        }

        .subtask-status.review {
            background: var(--vscode-button-secondaryBackground);
            color: var(--vscode-button-secondaryForeground);
        }

        .subtask-status.blocked {
            background: var(--vscode-errorForeground);
            color: var(--vscode-editor-background);
        }

        /* Responsive breakpoints for very narrow panels */
        @media (max-width: 300px) {
            .task-header {
                padding: 6px 8px;
                gap: 6px;
            }
            
            .task-details {
                padding: 8px;
            }
            
            .task-meta {
                grid-template-columns: 1fr;
                gap: 6px;
            }
            
            .test-stats {
                flex-direction: column;
                gap: 4px;
            }
            
            .actions {
                flex-direction: column;
                gap: 4px;
            }
        }

        /* Responsive breakpoints for wide panels */
        @media (min-width: 500px) {
            .task-meta {
                grid-template-columns: repeat(2, 1fr);
            }
            
            .test-stats {
                gap: 20px;
            }
        }

        /* Custom Scrollbar Styling */
        .sidebar-content::-webkit-scrollbar {
            width: 8px;
        }

        .sidebar-content::-webkit-scrollbar-track {
            background: var(--vscode-scrollbarSlider-background);
            border-radius: 0px;
        }

        .sidebar-content::-webkit-scrollbar-thumb {
            background: var(--vscode-scrollbarSlider-activeBackground);
            border-radius: 4px;
            border: 1px solid var(--vscode-scrollbarSlider-background);
        }

        .sidebar-content::-webkit-scrollbar-thumb:hover {
            background: var(--vscode-scrollbarSlider-hoverBackground);
        }

        .sidebar-content::-webkit-scrollbar-corner {
            background: var(--vscode-scrollbarSlider-background);
        }

        /* Ensure scrollbar only appears when needed */
        .sidebar-content {
            flex: 1;
            overflow-y: auto;
            overflow-x: hidden;
        }`;
  }

  /**
   * Generates JavaScript for interactive functionality
   * Returns JavaScript for accordion behavior and message sending
   * Task WV-006: Implement JavaScript accordion logic and webview communication
   *
   * @returns JavaScript string for webview functionality
   */
  private getJavaScript(): string {
    return `<script>
      ${this.getAccordionScript()}
      ${this.getMessageSendingScript()}
    </script>`;
  }

  /**
   * Generates accordion behavior JavaScript
   * Implements single-task expansion logic following TreeViewProvider pattern
   * Task WV-006: Accordion behavior with only one task expanded at a time
   * Task WV-009: State persistence integration for accordion expansion
   * Task API-5: State restoration function for extension message handling
   *
   * @returns JavaScript string for accordion functionality
   */
  private getAccordionScript(): string {
    return `
      let expandedTaskId = null;
      
      function toggleTask(taskElement) {
        const taskId = taskElement.dataset.taskId;
        if (!taskId) return;
        
        const isCurrentlyExpanded = expandedTaskId === taskId;
        
        // Collapse all tasks first (accordion behavior)
        document.querySelectorAll('.task-item.expanded').forEach(item => {
          item.classList.remove('expanded');
        });
        
        if (!isCurrentlyExpanded) {
          // Expand clicked task
          taskElement.classList.add('expanded');
          expandedTaskId = taskId;
          
          // Notify extension of expansion (extension handles persistence)
          sendMessage('toggleAccordion', { taskId: taskId, expanded: true });
        } else {
          // Collapse clicked task
          expandedTaskId = null;
          sendMessage('toggleAccordion', { taskId: taskId, expanded: false });
        }
      }

      function toggleFailures(failuresSection) {
        failuresSection.classList.toggle('expanded');
      }
      
      // State restoration function called by extension via message
      function setInitialExpandedState(taskId) {
        if (taskId) {
          const taskElement = document.querySelector(\`[data-task-id="\${taskId}"]\`);
          if (taskElement) {
            // Collapse all tasks first
            document.querySelectorAll('.task-item.expanded').forEach(item => {
              item.classList.remove('expanded');
            });
            
            // Expand the specified task
            taskElement.classList.add('expanded');
            expandedTaskId = taskId;
            
            console.debug('Webview: Accordion state restored for task:', taskId);
          }
        }
      }
      
      // Make function available globally for message handler
      window.setInitialExpandedState = setInitialExpandedState;
    `;
  }

  /**
   * Generates message sending JavaScript for webview communication
   * Implements VSCode webview API integration for extension communication
   * Task WV-006: Webview message sending to extension
   * Task WV-009: State persistence message handling
   * Task API-5: Handle 'restoreState' messages from extension for accordion state restoration
   *
   * @returns JavaScript string for message handling functionality
   */
  private getMessageSendingScript(): string {
    return `
      const vscode = acquireVsCodeApi();
      
      function sendMessage(type, payload) {
        vscode.postMessage({
          type: type,
          taskId: payload.taskId,
          ...payload
        });
      }
      
      function updateTaskStatus(taskId, newStatus) {
        sendMessage('updateTaskStatus', { taskId: taskId, newStatus: newStatus });
      }
      
      function executeWithCursor(taskId) {
        sendMessage('executeWithCursor', { taskId: taskId });
      }
      
      // Handle messages from extension
      window.addEventListener('message', function(event) {
        const message = event.data;
        
        switch (message.type) {
          case 'restoreState':
            if (message.expandedTaskId) {
              setInitialExpandedState(message.expandedTaskId);
            }
            break;
          default:
            // Ignore unknown message types
            break;
        }
      });
      
      // Handle action button clicks
      document.addEventListener('click', function(event) {
        if (event.target.classList.contains('action-btn')) {
          const taskId = event.target.closest('.task-item').dataset.taskId;
          const action = event.target.textContent.trim();
          
          if (action.includes('Execute with Cursor')) {
            executeWithCursor(taskId);
          } else if (action.includes('Mark Complete')) {
            updateTaskStatus(taskId, 'completed');
          } else if (action.includes('Continue Work')) {
            updateTaskStatus(taskId, 'in_progress');
          } else if (action.includes('Approve & Complete')) {
            updateTaskStatus(taskId, 'completed');
          }
        }
      });
    `;
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

  /**
   * Task WV-005: Setup message handling for webview communication
   * Registers listeners for messages from the webview
   */
  private setupMessageHandling(): void {
    if (!this._view) {
      console.warn(
        "Webview view not initialized, cannot setup message handling."
      );
      return;
    }

    const onMessage = (message: any) => {
      console.log("Received message from webview:", message);

      switch (message.type) {
        case "updateTaskStatus":
          this.handleUpdateTaskStatus(message.taskId, message.newStatus);
          break;
        case "executeWithCursor":
          this.handleExecuteWithCursor(message.taskId);
          break;
        case "toggleAccordion":
          this.handleToggleAccordion(message.taskId);
          break;
        case "restoreState":
          // This message is sent TO the webview, so no handler needed here
          break;

        default:
          console.warn("Unknown message type:", message.type);
          break;
      }
    };

    this._view.webview.onDidReceiveMessage(
      onMessage,
      undefined,
      this._disposables
    );
  }

  /**
   * Task WV-005: Handle message to update task status
   * Updates the status of a task in the extension's task list.
   *
   * @param taskId - The ID of the task to update
   * @param newStatus - The new status to set
   */
  private async handleUpdateTaskStatus(
    taskId: string,
    newStatus?: TaskStatus
  ): Promise<void> {
    try {
      if (!newStatus) {
        console.warn("No new status provided for task status update");
        return;
      }

      await vscode.commands.executeCommand(
        "aidm-vscode-extension.updateTaskStatus",
        taskId,
        newStatus
      );

      console.log(`Task status updated: ${taskId} -> ${newStatus}`);
    } catch (error) {
      console.error("Error updating task status:", error);
    }
  }

  /**
   * Task WV-005: Handle message to execute task with Cursor
   * Executes a task using the Cursor extension.
   *
   * @param taskId - The ID of the task to execute
   */
  private async handleExecuteWithCursor(taskId: string): Promise<void> {
    try {
      await vscode.commands.executeCommand(
        "aidm-vscode-extension.executeTaskWithCursor",
        taskId
      );

      console.log(`Task executed with Cursor: ${taskId}`);
    } catch (error) {
      console.error("Error executing task with Cursor:", error);
    }
  }

  /**
   * Task WV-005: Handle message to toggle accordion
   * Toggles the expanded state of a task's details section.
   *
   * @param taskId - The ID of the task to toggle
   */
  private async handleToggleAccordion(taskId: string): Promise<void> {
    try {
      // Use the new accordion toggle handler with state persistence
      await this.handleAccordionToggle(taskId);
    } catch (error) {
      console.error("Error toggling task accordion:", error);
    }
  }

  /**
   * Task WV-009: Handle message to save webview state
   * Persists the current expanded task ID to VSCode storage.
   *
   * @param state - The current webview state to save
   */

  /**
   * Dispose method for cleanup
   * Task WV-005: Clean up disposables and event listeners
   */
  dispose(): void {
    try {
      // Dispose all registered disposables
      this._disposables.forEach((disposable) => disposable.dispose());
      this._disposables.length = 0;

      // Dispose event listener disposables
      this.eventDisposables.forEach((disposable) => disposable.dispose());
      this.eventDisposables.length = 0;

      console.debug("TaskWebviewProvider: Disposed successfully");
    } catch (error) {
      console.error("TaskWebviewProvider: Error during disposal:", error);
    }
  }
}
