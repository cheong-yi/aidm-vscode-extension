/**
 * TaskWebviewProvider - Thin Facade Pattern
 * Delegates all functionality to specialized classes for maintainability
 * REF-023: Reduced from 1251 lines to under 300 lines
 */

import * as vscode from "vscode";
import { Task, TaskErrorResponse } from "../../types/tasks";
import { TasksDataService } from "../../services";
import { TaskHTMLGenerator } from "./TaskHTMLGenerator";
import { TaskMessageHandler } from "./TaskMessageHandler";
import { TaskViewState } from "./TaskViewState";

/**
 * TaskWebviewProvider - Thin Facade implementing vscode.WebviewViewProvider
 * Delegates all work to specialized classes for clean separation of concerns
 */
export class TaskWebviewProvider implements vscode.WebviewViewProvider {
  private view?: vscode.WebviewView;
  private readonly disposables: vscode.Disposable[] = [];
  
  // Delegate objects
  private readonly htmlGenerator: TaskHTMLGenerator;
  private readonly viewState: TaskViewState;
  private messageHandler?: TaskMessageHandler;
  
  constructor(
    private readonly tasksDataService: TasksDataService,
    private readonly context: vscode.ExtensionContext
  ) {
    // Initialize delegates
    this.htmlGenerator = new TaskHTMLGenerator(context.extensionUri);
    this.viewState = new TaskViewState(context);
    
    // Setup event listeners
    this.setupEventHandlers();
  }

  /**
   * Setup event handlers for data service events
   */
  private setupEventHandlers(): void {
    // Listen for task updates
    const tasksUpdatedDisposable = this.tasksDataService.onTasksUpdated.event(
      (tasks: Task[]) => this.handleTasksUpdated(tasks)
    );
    this.disposables.push(tasksUpdatedDisposable);

    // Listen for service errors  
    const errorDisposable = this.tasksDataService.onError.event(
      (error: TaskErrorResponse) => this.handleServiceError(error)
    );
    this.disposables.push(errorDisposable);
  }

  /**
   * Handle tasks updated event from service
   */
  private handleTasksUpdated(tasks: Task[]): void {
    if (this.view) {
      this.updateWebview();
    }
  }

  /**
   * Handle service error events
   */
  private handleServiceError(error: TaskErrorResponse): void {
    console.error("TaskWebviewProvider: Service error:", error);
    if (this.view) {
      const errorMessage = error.userInstructions || error.technicalDetails || "An error occurred while processing tasks.";
      this.showErrorState(errorMessage);
    }
  }

  /**
   * Show error state in webview
   */
  private async showErrorState(message: string): Promise<void> {
    if (!this.view) return;

    const errorHtml = `
      <div style="padding: 20px; color: #f14c4c;">
        <h3>Error</h3>
        <p>${message}</p>
        <button onclick="acquireVsCodeApi().postMessage({type: 'refresh'})">
          Retry
        </button>
      </div>
    `;
    
    this.view.webview.html = errorHtml;
  }

  /**
   * VSCode WebviewViewProvider interface implementation
   */
  public resolveWebviewView(
    webviewView: vscode.WebviewView,
    context: vscode.WebviewViewResolveContext,
    _token: vscode.CancellationToken
  ): void {
    this.view = webviewView;
    
    // Configure webview
    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [this.context.extensionUri]
    };
    
    // Initialize message handler with view
    this.messageHandler = new TaskMessageHandler(
      this.tasksDataService,
      webviewView,
      (taskId: string) => this.handleAccordionToggle(taskId)
    );
    
    // Setup message handling
    const messageDisposable = webviewView.webview.onDidReceiveMessage(
      async (message: any) => {
        if (this.messageHandler) {
          await this.messageHandler.handleMessage(message);
        }
      }
    );
    this.disposables.push(messageDisposable);
    
    // Initial render
    this.updateWebview();
  }

  /**
   * Update webview content
   */
  private async updateWebview(): Promise<void> {
    if (!this.view) return;
    
    try {
      // Get data
      const tasks = await this.tasksDataService.getTasks();
      const expandedId = this.viewState.getExpandedTask();
      
      // Generate HTML
      const html = this.htmlGenerator.generateFullHTML(tasks, expandedId);
      
      // Update view
      this.view.webview.html = html;
      
      // Restore accordion state if needed
      if (expandedId) {
        setTimeout(() => this.restoreAccordionState(expandedId), 100);
      }
    } catch (error) {
      console.error("TaskWebviewProvider: Error updating webview:", error);
      await this.showErrorState("Failed to load tasks.");
    }
  }

  /**
   * Handle accordion toggle events
   */
  private async handleAccordionToggle(taskId: string): Promise<void> {
    const currentExpanded = this.viewState.getExpandedTask();
    const newExpanded = currentExpanded === taskId ? null : taskId;
    
    this.viewState.setExpandedTask(newExpanded);
    
    // Refresh webview to reflect state change
    await this.updateWebview();
  }

  /**
   * Restore accordion state from persistence
   */
  private restoreAccordionState(expandedTaskId: string): void {
    if (!this.view || !expandedTaskId) return;

    this.view.webview.postMessage({
      type: "restoreState",
      expandedTaskId: expandedTaskId,
    });
  }

  /**
   * Backward compatibility method
   */
  public isDataInitialized(): boolean {
    return true;
  }

  /**
   * Clean up disposables
   */
  public dispose(): void {
    while (this.disposables.length) {
      const disposable = this.disposables.pop();
      if (disposable) {
        disposable.dispose();
      }
    }
  }
}