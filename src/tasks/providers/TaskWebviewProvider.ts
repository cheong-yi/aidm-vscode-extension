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
 *
 * NOTE: Cursor icon (🤖) functionality has been temporarily disabled.
 * The isExecutable field is still processed but no visual indicators are shown.
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
import { GitUtilities } from "../../services";
import { TaskHTMLGenerator } from "./TaskHTMLGenerator";
import { TaskMessageHandler } from "./TaskMessageHandler";
import { TaskViewState } from "./TaskViewState";
import * as path from "path";



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
   * View state manager for accordion and filter state
   * REF-012: Centralized state management
   */
  private viewState: TaskViewState;

  /**
   * Cached logo data URI to avoid repeated file system access
   * Task WV-015: Pre-loaded during webview initialization
   */
  private logoDataUri: string = "";
  
  /**
   * HTML generator instance for webview content
   */
  private htmlGenerator: TaskHTMLGenerator;

  /**
   * Message handler instance for webview message processing
   */
  private messageHandler?: TaskMessageHandler;

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
    this.htmlGenerator = new TaskHTMLGenerator(context.extensionUri);
    this.viewState = new TaskViewState(context);

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

    // Send task data via postMessage for safe rendering (replaces HTML escaping)
    setTimeout(() => {
      this.htmlGenerator.sendTaskDataToWebview(tasks, this._view!.webview);
    }, 50); // Send data before state restoration

    // Restore accordion state after content loads
    const expandedTaskId = this.viewState.getExpandedTask();
    if (expandedTaskId) {
      // Small delay to ensure HTML is rendered before state restoration
      setTimeout(() => {
        this.restoreAccordionState(expandedTaskId);
      }, 100);
    }

    console.debug(
      `TaskWebviewProvider: Content updated with ${tasks.length} tasks, expanded: ${expandedTaskId}`
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
          content="default-src 'none'; style-src 'unsafe-inline' 'self'; script-src 'unsafe-inline' 'self'; img-src vscode-resource: https: data: 'self'; font-src vscode-resource: https: 'self'; connect-src 'self';">
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
   * Initialize logo data URI during webview resolution
   * Task WV-015: Pre-load logo file and cache as base64 data URI
   * Called once during webview initialization to avoid async cascade
   */
  private async initializeLogoDataUri(): Promise<void> {
    try {
      const logoUri = vscode.Uri.joinPath(
        this.context.extensionUri,
        "resources",
        "images",
        "aidm-logo.svg"
      );
      const logoBytes = await vscode.workspace.fs.readFile(logoUri);
      const logoContent = Buffer.from(logoBytes).toString("utf8");
      const logoBase64 = Buffer.from(logoContent).toString("base64");
      this.logoDataUri = `data:image/svg+xml;base64,${logoBase64}`;
      console.debug("TaskWebviewProvider: AiDM logo loaded successfully");
    } catch (error) {
      console.warn(
        "TaskWebviewProvider: Failed to load AiDM logo, using fallback"
      );
      this.logoDataUri =
        "data:image/svg+xml;base64," +
        Buffer.from(
          `
        <svg viewBox="0 0 240 60" xmlns="http://www.w3.org/2000/svg">
          <text x="20" y="40" font-family="Arial" font-size="32" font-weight="bold" fill="#9333ea">AiDM</text>
        </svg>
      `
        ).toString("base64");
    }
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
   * Handle accordion toggle with state persistence
   * REF-012: Delegate to TaskViewState for state management
   */
  private async handleAccordionToggle(taskId: string): Promise<void> {
    try {
      const isNowExpanded = this.viewState.toggleExpanded(taskId);
      
      console.debug(
        `TaskWebviewProvider: Task ${isNowExpanded ? 'expanded' : 'collapsed'}: ${taskId}`
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
        localResourceRoots: [
          vscode.Uri.joinPath(this.context.extensionUri, 'src', 'tasks', 'providers')
        ],
      };

      // Set the webview on the HTML generator so it can generate resource URIs
      this.htmlGenerator.setWebview(webviewView.webview);

      // Set loading HTML immediately to prevent race conditions
      webviewView.webview.html = this.getLoadingHTML();

      // Initialize logo data URI BEFORE setting up content
      this.initializeLogoDataUri()
        .then(() => {
          console.debug(
            "TaskWebviewProvider: Logo initialized, proceeding with content loading"
          );
        })
        .catch((error) => {
          console.error(
            "TaskWebviewProvider: Logo initialization failed:",
            error
          );
        });

      // Task WV-005: Setup message handling for webview communication
      this.setupMessageHandling();

      // REF-012: State is automatically loaded in TaskViewState constructor
      console.debug('TaskWebviewProvider: State initialized via TaskViewState');

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

      // REF-012: State is managed by TaskViewState (already loaded in constructor)

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
    // Update logo in generator and generate HTML
    this.htmlGenerator.setLogoDataUri(this.logoDataUri);
    return this.htmlGenerator.generateFullHTML(tasks, this.viewState.getExpandedTask());
  }

  /**
   * Generates loading HTML for workspace initialization state
   * Task WV-001: Loading state display before data initialization
   *
   * @returns HTML string for loading state
   */
  private getLoadingHTML(): string {
    return this.htmlGenerator.generateLoadingHTML();
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

    // Create message handler with dependencies
    this.messageHandler = new TaskMessageHandler(
      this.tasksDataService,
      this._view,
      this.handleAccordionToggle.bind(this)
    );

    // Setup message listener
    this._view.webview.onDidReceiveMessage(
      (message: any) => this.messageHandler!.handleMessage(message),
      undefined,
      this._disposables
    );
  }




  /**
   * Handle View Code button clicks from webview
   * Opens git diff views for files changed in task.implementation.commitHash
   * Task IMPL-002: Implement View Code button handler
   * Task DI-003: Add workspace validation for View Implementation file operations
   * Task DIFF-003: Update to use async git-based diff opening
   * Task DIFF-004: Add VS Code-specific error handling with user feedback
   *
   * @param taskId - The ID of the task to view code for
   */
  private async handleViewCode(taskId: string): Promise<void> {
    try {
      const task = await this.tasksDataService.getTaskById(taskId);

      if (!task?.implementation?.commitHash) {
        await this.handleGitDiffError("NO_COMMIT_HASH", taskId);
        return;
      }

      const commitHash = task.implementation.commitHash;

      // Validate git diff operation with VS Code-specific checks
      const validation = await this.validateGitDiffOperation(
        taskId,
        commitHash
      );
      if (!validation.valid) {
        await this.handleGitDiffError(validation.error!, taskId, commitHash);
        return;
      }

      // Get changed files from git commit
      const changedFiles = await GitUtilities.getChangedFilesFromCommit(
        commitHash,
        vscode.workspace.workspaceFolders![0].uri.fsPath
      );

      if (changedFiles.length === 0) {
        await this.handleGitDiffError("NO_CHANGED_FILES", taskId, commitHash);
        return;
      }

      // Open diff views for each changed file
      let successfulDiffs = 0;
      for (const filePath of changedFiles) {
        try {
          await this.openDiffForFile(
            filePath,
            commitHash,
            vscode.workspace.workspaceFolders![0].uri
          );
          successfulDiffs++;
          console.debug(
            `[TaskWebviewProvider] Opened diff for file: ${filePath}`
          );
        } catch (error) {
          console.error(
            `[TaskWebviewProvider] Failed to open diff for file: ${filePath}`,
            error
          );
          // Individual file diff failures don't stop the entire operation
        }
      }

      if (successfulDiffs > 0) {
        await this.showGitDiffResults(taskId, successfulDiffs);
      } else {
        await this.handleGitDiffError("VSCODE_DIFF_FAILED", taskId, commitHash);
      }

      console.log(
        `[TaskWebviewProvider] Opened diff views for ${successfulDiffs} files for task ${taskId}`
      );
    } catch (error) {
      console.error("[TaskWebviewProvider] Error handling View Code:", error);
      await this.handleGitDiffError("VSCODE_DIFF_FAILED", taskId);
    }
  }

  /**
   * Validate git diff operation with VS Code-specific checks
   * Task DIFF-004: Implement structured validation for git diff operations
   *
   * @param taskId - The ID of the task to validate
   * @param commitHash - The commit hash to validate
   * @returns Promise<ValidationResult> - Structured validation result
   */
  private async validateGitDiffOperation(
    taskId: string,
    commitHash: string
  ): Promise<{ valid: boolean; error?: string }> {
    try {
      // Check workspace availability
      if (
        !vscode.workspace.workspaceFolders ||
        vscode.workspace.workspaceFolders.length === 0
      ) {
        return { valid: false, error: "NO_WORKSPACE" };
      }

      const workspaceRoot = vscode.workspace.workspaceFolders[0];
      console.debug(
        `[TaskWebviewProvider] Using workspace root: ${workspaceRoot.uri.fsPath}`
      );

      // Validate git repository
      if (!(await GitUtilities.isGitRepository(workspaceRoot.uri.fsPath))) {
        return { valid: false, error: "NOT_GIT_REPO" };
      }

      // Validate commit exists
      if (
        !(await GitUtilities.commitExists(commitHash, workspaceRoot.uri.fsPath))
      ) {
        return { valid: false, error: "INVALID_COMMIT" };
      }

      return { valid: true };
    } catch (error) {
      console.error(
        `[TaskWebviewProvider] Error validating git diff operation for task ${taskId}:`,
        error
      );
      return { valid: false, error: "VALIDATION_ERROR" };
    }
  }

  /**
   * Handle git diff errors with user-friendly messages and action options
   * Task DIFF-004: Implement VS Code-specific error handling with recovery options
   *
   * @param error - The error type to handle
   * @param taskId - The ID of the task that caused the error
   * @param commitHash - Optional commit hash for context
   */
  private async handleGitDiffError(
    error: string,
    taskId: string,
    commitHash?: string
  ): Promise<void> {
    const shortHash = commitHash ? commitHash.substring(0, 7) : undefined;

    let message: string;
    let actions: string[] = [];

    switch (error) {
      case "NO_COMMIT_HASH":
        message = `Task ${taskId} is missing commit information`;
        actions = ["Open Settings", "Refresh Tasks"];
        break;
      case "NO_WORKSPACE":
        message =
          "No workspace folder available to open files. Please open a folder or workspace.";
        actions = ["Open Folder", "Refresh Tasks"];
        break;
      case "NOT_GIT_REPO":
        message = "Workspace is not a git repository";
        actions = ["Open Settings", "Refresh Tasks"];
        break;
      case "INVALID_COMMIT":
        message = `Commit not found - may have been rebased or deleted: ${
          shortHash || "unknown"
        }`;
        actions = ["Refresh Tasks", "View Files Instead"];
        break;
      case "NO_CHANGED_FILES":
        message = "No file changes found in this commit";
        actions = ["Refresh Tasks", "View Files Instead"];
        break;
      case "VSCODE_DIFF_FAILED":
        message = "Failed to open diff view";
        actions = ["Retry", "View Files Instead"];
        break;
      case "VALIDATION_ERROR":
        message = "Error validating git operation";
        actions = ["Retry", "Refresh Tasks"];
        break;
      default:
        message = "Unknown error occurred while opening diff views";
        actions = ["Retry", "Refresh Tasks"];
    }

    // Show error message with action options
    const selectedAction = await vscode.window.showErrorMessage(
      message,
      ...actions
    );

    // Handle user-selected action
    if (selectedAction) {
      await this.handleGitDiffErrorAction(selectedAction, taskId, error);
    }
  }

  /**
   * Handle user-selected error recovery actions
   * Task DIFF-004: Implement action handling for error recovery
   *
   * @param action - The action selected by the user
   * @param taskId - The ID of the task for context
   * @param errorType - The original error type for context
   */
  private async handleGitDiffErrorAction(
    action: string,
    taskId: string,
    errorType: string
  ): Promise<void> {
    try {
      switch (action) {
        case "Open Settings":
          await vscode.commands.executeCommand("workbench.action.openSettings");
          break;
        case "Refresh Tasks":
          await this.tasksDataService.refreshTasks();
          break;
        case "Open Folder":
          await vscode.commands.executeCommand(
            "workbench.action.files.openFolder"
          );
          break;
        case "View Files Instead":
          // Fallback to viewing files directly instead of diff
          await this.fallbackToFileView(taskId);
          break;
        case "Retry":
          // Retry the original operation
          await this.handleViewCode(taskId);
          break;
        default:
          console.debug(
            `[TaskWebviewProvider] Unknown error action: ${action}`
          );
      }
    } catch (error) {
      console.error(
        `[TaskWebviewProvider] Error handling action '${action}' for task ${taskId}:`,
        error
      );
    }
  }

  /**
   * Fallback method to view files directly instead of diff
   * Task DIFF-004: Provide alternative file viewing when diff fails
   *
   * @param taskId - The ID of the task to view files for
   */
  private async fallbackToFileView(taskId: string): Promise<void> {
    try {
      const task = await this.tasksDataService.getTaskById(taskId);

      if (!task?.implementation?.filesChanged?.length) {
        vscode.window.showInformationMessage(
          `No files to view for task ${taskId}`
        );
        return;
      }

      // Open the first changed file directly
      const firstFile = task.implementation.filesChanged[0];
      const workspaceRoot = vscode.workspace.workspaceFolders![0].uri;
      const fileUri = vscode.Uri.joinPath(workspaceRoot, firstFile);

      try {
        const document = await vscode.workspace.openTextDocument(fileUri);
        await vscode.window.showTextDocument(document);

        vscode.window.showInformationMessage(
          `Opened file directly: ${firstFile}`
        );
      } catch (error) {
        console.error(
          `[TaskWebviewProvider] Failed to open file directly: ${firstFile}`,
          error
        );
        vscode.window.showErrorMessage(`Could not open file: ${firstFile}`);
      }
    } catch (error) {
      console.error(
        `[TaskWebviewProvider] Error in fallback file view for task ${taskId}:`,
        error
      );
    }
  }

  /**
   * Show success feedback for git diff operations
   * Task DIFF-004: Provide user feedback when diff views open successfully
   *
   * @param taskId - The ID of the task that was processed
   * @param fileCount - The number of files successfully opened in diff views
   */
  private async showGitDiffResults(
    taskId: string,
    fileCount: number
  ): Promise<void> {
    try {
      const task = await this.tasksDataService.getTaskById(taskId);
      const commitHash = task?.implementation?.commitHash;
      const shortHash = commitHash ? commitHash.substring(0, 7) : "unknown";

      const message = `Opened diff views for ${fileCount} file${
        fileCount !== 1 ? "s" : ""
      } from commit ${shortHash}`;

      // Show success notification with optional action
      const action = await vscode.window.showInformationMessage(
        message,
        "View in Git History"
      );

      if (action === "View in Git History") {
        // Open git history view for the commit
        await vscode.commands.executeCommand(
          "git.showQuickCommitDetails",
          commitHash
        );
      }
    } catch (error) {
      console.error(
        `[TaskWebviewProvider] Error showing git diff results for task ${taskId}:`,
        error
      );
      // Fallback to simple success message
      vscode.window.showInformationMessage(
        `Opened diff views for ${fileCount} file${fileCount !== 1 ? "s" : ""}`
      );
    }
  }

  /**
   * Handle View Code button clicks from webview
   * Opens git diff view for files changed in task implementation
   * Task WV-010: Implement View Code button handler with correct Git URI format
   *
   * @param taskId - The ID of the task to view code for
   * @param filePath - The file path to view
   */
  public async viewCode(taskId: string, filePath: string): Promise<void> {
    try {
      const task = await this.tasksDataService.getTaskById(taskId);

      if (!task || !task.implementation?.commitHash) {
        console.error(
          `TaskWebviewProvider: Task with ID ${taskId} not found or missing commit hash.`
        );
        return;
      }

      const commitHash = task.implementation.commitHash;
      const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;

      if (!workspaceRoot) {
        console.error("TaskWebviewProvider: No workspace folder available");
        return;
      }

      try {
        // WV-013-REFACTOR: Use extracted utility method for git URI construction
        const { beforeUri, afterUri, diffTitle } = await this.createGitDiffURIs(
          commitHash,
          filePath,
          workspaceRoot
        );

        // Use vscode.diff command for side-by-side comparison
        await vscode.commands.executeCommand(
          "vscode.diff",
          beforeUri,
          afterUri,
          diffTitle
        );

        console.log(
          `TaskWebviewProvider: Opened git diff view for ${path.basename(
            filePath
          )}`
        );
      } catch (error) {
        console.error(
          "TaskWebviewProvider: Failed to open git diff view:",
          error
        );
        vscode.window.showErrorMessage(
          `Failed to view code: ${
            error instanceof Error ? error.message : "Unknown error"
          }`
        );
      }
    } catch (error) {
      console.error("TaskWebviewProvider: Error in viewCode method:", error);
    }
  }

  /**
   * Handle View Tests button clicks from webview
   * Opens test results JSON file from task.testResults.resultsFile
   * Task IMPL-003: Implement View Tests button handler
   *
   * @param taskId - The ID of the task to view tests for
   */
  private async handleViewTests(taskId: string): Promise<void> {
    try {
      const task = await this.tasksDataService.getTaskById(taskId);

      if (!task?.testResults?.resultsFile) {
        vscode.window.showWarningMessage(
          `No test results found for task ${taskId}`
        );
        return;
      }

      // Check if workspace folders are available
      if (
        !vscode.workspace.workspaceFolders ||
        vscode.workspace.workspaceFolders.length === 0
      ) {
        vscode.window.showErrorMessage(
          "No workspace folder available to open files"
        );
        return;
      }

      // Open the test results JSON file
      const uri = vscode.Uri.joinPath(
        vscode.workspace.workspaceFolders[0].uri,
        task.testResults.resultsFile
      );

      try {
        const document = await vscode.workspace.openTextDocument(uri);
        await vscode.window.showTextDocument(document);

        console.log(
          `Opened test results file: ${task.testResults.resultsFile} for task ${taskId}`
        );
      } catch (error) {
        console.error(
          `Failed to open test results file: ${task.testResults.resultsFile}`,
          error
        );
        vscode.window.showErrorMessage(
          `Could not open test results: ${task.testResults.resultsFile}`
        );
      }
    } catch (error) {
      console.error("Error handling View Tests:", error);
      vscode.window.showErrorMessage("Failed to open test results file");
    }
  }

  /**
   * Open VS Code's native diff editor for a single file using git URIs
   * DIFF-002: Implement single file diff opening using VS Code's native diff command
   * WV-011-FIX: Updated to use correct git:<commit>:<filepath> URI format
   * WV-014-VALIDATE: Now includes file path validation before processing
   *
   * @param filePath - Relative file path from workspace root
   * @param commitHash - Git commit hash to compare against
   * @param workspaceRoot - VSCode workspace root URI
   */
  private async openDiffForFile(
    filePath: string,
    commitHash: string,
    workspaceRoot: vscode.Uri
  ): Promise<void> {
    try {
      // WV-014-VALIDATE: Use centralized file path validation
      const validatedFilePath = this.validateFilePath(filePath);

      // Security: Validate commit hash format using GitUtilities patterns
      const gitHashPattern = /^[a-fA-F0-9]{40}$|^[a-fA-F0-9]{7,40}$/;
      if (!gitHashPattern.test(commitHash.trim())) {
        console.warn(
          `[TaskWebviewProvider] Invalid commit hash for diff: ${commitHash}`
        );
        return;
      }

      // WV-013-REFACTOR: Use extracted utility method for git URI construction
      const { beforeUri, afterUri, diffTitle } = await this.createGitDiffURIs(
        commitHash,
        validatedFilePath,
        workspaceRoot.fsPath
      );

      // Call vscode.commands.executeCommand to open diff view
      await vscode.commands.executeCommand(
        "vscode.diff",
        beforeUri,
        afterUri,
        diffTitle
      );

      console.debug(
        `[TaskWebviewProvider] Opened diff for file: ${validatedFilePath} at commit ${commitHash.substring(
          0,
          7
        )}`
      );
    } catch (error) {
      console.error(
        `[TaskWebviewProvider] Failed to open diff for file: ${filePath}`,
        error
      );
      // Handle only vscode.commands.executeCommand failures gracefully
      vscode.window.showErrorMessage(
        `Could not open diff view for ${path.basename(filePath)}`
      );
    }
  }

  /**
   * Task WV-009: Handle message to save webview state
   * Persists the current expanded task ID to VSCode storage.
   *
   * @param state - The current webview state to save
   */

  /**
   * Get current user email from workspace configuration
   * Task 4.2: Read current user email for task filtering
   *
   * @returns Current user email or empty string if not configured
   */
  public getCurrentUserEmail(): string {
    try {
      const config = vscode.workspace.getConfiguration(
        "aidmVscodeExtension.taskmaster"
      );
      return config.get<string>("currentUserEmail") || "";
    } catch (error) {
      console.warn(
        "TaskWebviewProvider: Failed to read current user email config:",
        error
      );
      return "";
    }
  }

  /**
   * Validate file path input for git operations
   * WV-014-VALIDATE: Add file path validation to prevent malformed URIs and security issues
   *
   * @param filePath - File path to validate
   * @returns Sanitized file path string
   * @throws Error for invalid file paths
   */
  private validateFilePath(filePath: string): string {
    // Validate file path input
    if (!filePath || typeof filePath !== "string") {
      throw new Error("File path is required and must be a string");
    }

    const trimmedPath = filePath.trim();

    // Check for empty/whitespace-only paths after trimming
    if (trimmedPath === "") {
      throw new Error("File path is required and must be a string");
    }

    if (trimmedPath !== filePath) {
      throw new Error("File path contains leading or trailing whitespace");
    }

    // Security: Prevent path traversal
    if (trimmedPath.includes("..")) {
      throw new Error("File path cannot contain path traversal sequences (..)");
    }

    // Validate path format - check relative path separators (./, .\)
    if (trimmedPath.startsWith("./") || trimmedPath.startsWith(".\\")) {
      throw new Error("File path should not start with separator");
    }

    // Security: Prevent absolute paths (should be relative to workspace)
    if (path.isAbsolute(trimmedPath)) {
      throw new Error("File path must be relative to workspace root");
    }

    return trimmedPath;
  }

  /**
   * Create git diff URIs for file comparison
   * WV-013-REFACTOR: Extract common git URI construction logic into reusable utility
   * WV-014-VALIDATE: Now includes file path validation before URI construction
   *
   * @param commitHash - Git commit hash to compare against
   * @param filePath - Relative file path from workspace root
   * @param workspacePath - Workspace root path for git operations
   * @returns Promise<{beforeUri: vscode.Uri, afterUri: vscode.Uri, diffTitle: string}>
   * @throws Error if previous commit cannot be found or file path is invalid
   */
  private async createGitDiffURIs(
    commitHash: string,
    filePath: string,
    workspacePath: string
  ): Promise<{
    beforeUri: vscode.Uri;
    afterUri: vscode.Uri;
    diffTitle: string;
  }> {
    // WV-014-VALIDATE: Validate file path before processing
    const validatedFilePath = this.validateFilePath(filePath);

    const previousCommit = await GitUtilities.getPreviousCommit(
      commitHash,
      workspacePath
    );

    if (!previousCommit) {
      throw new Error(
        `Could not find previous commit for ${commitHash.substring(0, 7)}`
      );
    }

    const beforeUri = vscode.Uri.parse(
      `git:${previousCommit}:${validatedFilePath}`
    );
    const afterUri = vscode.Uri.parse(`git:${commitHash}:${validatedFilePath}`);

    const filename = path.basename(validatedFilePath);
    const shortHash = commitHash.substring(0, 7);
    const shortPrevHash = previousCommit.substring(0, 7);
    const diffTitle = `${filename} (${shortPrevHash} ↔ ${shortHash})`;

    return { beforeUri, afterUri, diffTitle };
  }

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
