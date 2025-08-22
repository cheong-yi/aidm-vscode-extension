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
    // Implementation will be added in future tasks
    // For now, return placeholder HTML
    return `<div class="test-failures">Test failures rendering not yet implemented</div>`;
  }

  /**
   * Renders executable actions for a task
   * Called when displaying actions for executable tasks
   *
   * @param task - The task to render actions for
   * @returns HTML string for executable actions
   */
  public renderExecutableActions(task: Task): string {
    // Implementation will be added in future tasks
    // For now, return placeholder HTML
    return `<div class="executable-actions">Executable actions not yet implemented</div>`;
  }

  /**
   * Renders status-specific actions for a task
   * Called when displaying actions based on task status
   *
   * @param task - The task to render status actions for
   * @returns HTML string for status-specific actions
   */
  public renderStatusSpecificActions(task: Task): string {
    // Implementation will be added in future tasks
    // For now, return placeholder HTML
    return `<div class="status-actions">Status actions not yet implemented</div>`;
  }

  /**
   * Formats relative time from ISO date string
   * Called when displaying timestamps in relative format
   *
   * @param isoDate - ISO date string to format
   * @returns Formatted relative time string
   */
  public formatRelativeTime(isoDate: string): string {
    // Implementation will be added in future tasks
    // For now, return the original ISO string
    return isoDate;
  }

  /**
   * Generates HTML content for task details display
   * Called when updating webview content with task information
   *
   * @param task - The task to generate HTML for
   * @returns HTML string for task details
   */
  private generateTaskDetailsHTML(task: Task): string {
    // Implementation will be added in future tasks
    // For now, return basic HTML structure
    return `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Task Details</title>
        <style>
          body { font-family: var(--vscode-font-family); padding: 10px; }
          .task-details { color: var(--vscode-foreground); }
        </style>
      </head>
      <body>
        <div class="task-details">
          <h3>Task ${task.id}: ${task.title}</h3>
          <p>Status: ${task.status}</p>
          <p>Description: ${task.description}</p>
          <p>Task details HTML generation not yet implemented</p>
        </div>
      </body>
      </html>
    `;
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
          body { font-family: var(--vscode-font-family); padding: 10px; }
          .no-task { color: var(--vscode-foreground); text-align: center; }
        </style>
      </head>
      <body>
        <div class="no-task">
          <h3>📋 No Task Selected</h3>
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
