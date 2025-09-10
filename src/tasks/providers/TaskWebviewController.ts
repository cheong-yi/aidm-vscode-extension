/**
 * TaskWebviewController - Orchestrator Pattern
 * Coordinates between TaskWebviewProvider (view), TasksDataService, and other components
 * Handles business logic flow and state management orchestration
 * REF-042: Extracted orchestration logic from TaskWebviewProvider
 */

import * as vscode from "vscode";
import { Task, TaskErrorResponse } from "../../types/tasks";
import { TasksDataService } from "../../services";
import { TaskHTMLGenerator } from "./TaskHTMLGenerator";
import { TaskMessageHandler } from "./TaskMessageHandler";
import { TaskViewState } from "./TaskViewState";
import { TaskEventManager, EventCallbacks } from "./TaskEventManager";

/**
 * Controller interface for managing webview operations
 */
export interface WebviewController {
  initialize(view: vscode.WebviewView): void;
  refreshContent(): Promise<void>;
  handleTaskUpdate(taskId: string): Promise<void>;
  dispose(): void;
}

/**
 * TaskWebviewController orchestrates all webview operations
 * Separates business logic from view management
 */
export class TaskWebviewController implements WebviewController {
  private view?: vscode.WebviewView;
  
  // Orchestrated components
  private readonly htmlGenerator: TaskHTMLGenerator;
  private readonly viewState: TaskViewState;
  private readonly eventManager: TaskEventManager;
  private messageHandler?: TaskMessageHandler;
  
  // State management
  private isInitialized: boolean = false;
  private refreshInProgress: boolean = false;

  constructor(
    private readonly tasksDataService: TasksDataService,
    private readonly context: vscode.ExtensionContext
  ) {
    // Initialize orchestrated components
    this.htmlGenerator = new TaskHTMLGenerator(context.extensionUri);
    this.viewState = new TaskViewState(context);
    
    // Setup orchestration callbacks
    const orchestrationCallbacks: EventCallbacks = {
      onTasksUpdated: (tasks: Task[]) => this.orchestrateTasksUpdate(tasks),
      onServiceError: (error: TaskErrorResponse) => this.orchestrateErrorHandling(error),
      onMessageReceived: async (message: any) => this.orchestrateMessageProcessing(message)
    };
    
    this.eventManager = new TaskEventManager(this.tasksDataService, orchestrationCallbacks);
  }

  /**
   * Initialize the controller with a webview
   */
  public initialize(view: vscode.WebviewView): void {
    this.view = view;
    
    // Configure webview through controller
    this.configureWebview(view);
    
    // Initialize message handling orchestration
    this.initializeMessageHandling(view);
    
    // Setup event handling orchestration
    this.setupEventOrchestration();
    
    // Perform initial content load orchestration
    this.orchestrateInitialLoad();
    
    this.isInitialized = true;
  }

  /**
   * Refresh webview content (public API)
   */
  public async refreshContent(): Promise<void> {
    if (!this.isInitialized || this.refreshInProgress) {
      return;
    }
    
    await this.orchestrateContentRefresh();
  }

  /**
   * Handle task update events (public API)
   */
  public async handleTaskUpdate(taskId: string): Promise<void> {
    if (!this.isInitialized) {
      return;
    }
    
    await this.orchestrateTaskStateChange(taskId);
  }

  /**
   * Configure webview settings and options
   * @private orchestration method
   */
  private configureWebview(view: vscode.WebviewView): void {
    view.webview.options = {
      enableScripts: true,
      localResourceRoots: [this.context.extensionUri]
    };
    
    // Set webview reference in HTML generator
    this.htmlGenerator.setWebview(view.webview);
  }

  /**
   * Initialize message handling orchestration
   * @private orchestration method
   */
  private initializeMessageHandling(view: vscode.WebviewView): void {
    this.messageHandler = new TaskMessageHandler(
      this.tasksDataService,
      view,
      (taskId: string) => this.orchestrateAccordionToggle(taskId)
    );
    
    // Setup message handling through event manager
    this.eventManager.setupMessageHandling(view.webview);
  }

  /**
   * Setup event handling orchestration
   * @private orchestration method
   */
  private setupEventOrchestration(): void {
    this.eventManager.setupEventHandlers();
  }

  /**
   * Orchestrate initial content loading
   * @private orchestration method
   */
  private orchestrateInitialLoad(): void {
    // Perform initial render orchestration
    this.orchestrateContentRefresh().catch(error => {
      console.error("TaskWebviewController: Initial load failed:", error);
      this.orchestrateErrorHandling({
        operation: 'task_retrieval',
        technicalDetails: error.message,
        userInstructions: 'Please try refreshing the task view.',
        suggestedAction: 'retry'
      });
    });
  }

  /**
   * Orchestrate tasks update events
   * @private orchestration method
   */
  private orchestrateTasksUpdate(tasks: Task[]): void {
    if (this.view && this.isInitialized) {
      // Coordinate update with state preservation
      this.orchestrateContentRefresh().catch(error => {
        console.error("TaskWebviewController: Tasks update orchestration failed:", error);
      });
    }
  }

  /**
   * Orchestrate error handling across all components
   * @private orchestration method
   */
  private orchestrateErrorHandling(error: TaskErrorResponse): void {
    console.error("TaskWebviewController: Orchestrating error handling:", error);
    
    if (this.view) {
      const errorMessage = error.userInstructions || error.technicalDetails || "An error occurred while processing tasks.";
      this.displayErrorState(errorMessage);
    }
  }

  /**
   * Orchestrate message processing workflow
   * @private orchestration method
   */
  private async orchestrateMessageProcessing(message: any): Promise<void> {
    if (this.messageHandler) {
      try {
        await this.messageHandler.handleMessage(message);
        
        // Orchestrate post-message processing if needed
        if (this.requiresContentRefresh(message)) {
          await this.orchestrateContentRefresh();
        }
      } catch (error) {
        console.error("TaskWebviewController: Message processing orchestration failed:", error);
        this.orchestrateErrorHandling({
          operation: 'status_update',
          technicalDetails: error instanceof Error ? error.message : String(error),
          userInstructions: 'Please try the operation again.',
          suggestedAction: 'retry'
        });
      }
    }
  }

  /**
   * Orchestrate content refresh workflow
   * @private orchestration method
   */
  private async orchestrateContentRefresh(): Promise<void> {
    if (!this.view || this.refreshInProgress) {
      return;
    }
    
    this.refreshInProgress = true;
    
    try {
      // Coordinate data retrieval
      const tasks = await this.tasksDataService.getTasks();
      const expandedId = this.viewState.getExpandedTask();
      
      // Coordinate HTML generation
      const html = this.htmlGenerator.generateFullHTML(tasks, expandedId);
      
      // Coordinate view update
      this.view.webview.html = html;
      
      // Coordinate state restoration
      if (expandedId) {
        setTimeout(() => this.orchestrateStateRestoration(expandedId), 100);
      }
    } catch (error) {
      console.error("TaskWebviewController: Content refresh orchestration failed:", error);
      this.displayErrorState("Failed to load tasks.");
    } finally {
      this.refreshInProgress = false;
    }
  }

  /**
   * Orchestrate accordion toggle workflow
   * @private orchestration method
   */
  private async orchestrateAccordionToggle(taskId: string): Promise<void> {
    const currentExpanded = this.viewState.getExpandedTask();
    const newExpanded = currentExpanded === taskId ? null : taskId;
    
    // Coordinate state change
    this.viewState.setExpandedTask(newExpanded);
    
    // Coordinate view refresh
    await this.orchestrateContentRefresh();
  }

  /**
   * Orchestrate task state change workflow
   * @private orchestration method
   */
  private async orchestrateTaskStateChange(taskId: string): Promise<void> {
    // This method can be extended to handle task-specific state changes
    // Currently delegates to content refresh
    await this.orchestrateContentRefresh();
  }

  /**
   * Orchestrate state restoration workflow
   * @private orchestration method
   */
  private orchestrateStateRestoration(expandedTaskId: string): void {
    if (!this.view || !expandedTaskId) {
      return;
    }

    this.view.webview.postMessage({
      type: "restoreState",
      expandedTaskId: expandedTaskId,
    });
  }

  /**
   * Display error state in webview
   * @private utility method
   */
  private displayErrorState(message: string): void {
    if (!this.view) {
      return;
    }

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
   * Determine if message requires content refresh
   * @private utility method
   */
  private requiresContentRefresh(message: any): boolean {
    const refreshRequiredTypes = [
      'updateTaskStatus',
      'refresh'
    ];
    
    return refreshRequiredTypes.includes(message.type);
  }

  /**
   * Check if controller is initialized
   */
  public isControllerInitialized(): boolean {
    return this.isInitialized;
  }

  /**
   * Dispose of all orchestrated components
   */
  public dispose(): void {
    this.eventManager.dispose();
    this.isInitialized = false;
    this.view = undefined;
  }
}