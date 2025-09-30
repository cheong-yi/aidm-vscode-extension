/**
 * TaskWebviewController - Orchestrator Pattern
 * Coordinates between TaskWebviewProvider (view), TasksDataService, and other components
 * Handles business logic flow and state management orchestration
 * REF-042: Extracted orchestration logic from TaskWebviewProvider
 */

import * as vscode from "vscode";
import * as fs from "fs";
import * as path from "path";
import { Task, TaskErrorResponse } from "../../types/tasks";
import { TasksDataService } from "../../services";
import { TaskHTMLGenerator } from "./TaskHTMLGenerator";
import { TaskMessageHandler } from "./TaskMessageHandler";
import { TaskViewState } from "./TaskViewState";
import { TaskEventManager, EventCallbacks } from "./TaskEventManager";
import { AuthService } from "../../auth/authService";
import { CONFIG, AuthPromptStrategy } from "../../common/config";

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
    private readonly context: vscode.ExtensionContext,
    private readonly authService?: AuthService
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

    // Load logo on initialization
    this.loadLogo();
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
    // Handle authentication-related messages first
    const authMessageTypes = ['authLogin', 'offlineMode', 'refreshAuth'];
    if (authMessageTypes.includes(message.type)) {
      await this.handleAuthMessage(message);
      return;
    }

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

      // Generate authentication status banner
      const authStatusBanner = this.generateAuthStatusBanner();

      // Coordinate HTML generation with auth status
      const html = await this.htmlGenerator.generateFullHTML(tasks, expandedId, authStatusBanner);

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
      'refresh',
      'authLogin',
      'offlineMode',
      'refreshAuth'
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
   * Check if user is authenticated based on current configuration
   * @private utility method for authentication status
   */
  private isUserAuthenticated(): boolean {
    if (!CONFIG.authentication.enabled || !this.authService) {
      return true; // No auth required or no auth service available
    }

    return this.authService.authState.isLoggedIn;
  }

  /**
   * Check if contextual auth prompt should be shown
   * @private utility method for prompt strategy
   */
  private shouldShowContextualPrompt(): boolean {
    if (!CONFIG.authentication.enabled || !this.authService) {
      return false;
    }

    return (
      CONFIG.authentication.promptStrategy === AuthPromptStrategy.CONTEXTUAL &&
      !this.isUserAuthenticated()
    );
  }

  /**
   * Generate authentication status banner HTML
   * @private utility method for auth UI
   */
  private generateAuthStatusBanner(): string {
    if (!this.authService || !CONFIG.authentication.enabled) {
      return '';
    }

    const isAuthenticated = this.isUserAuthenticated();
    const promptStrategy = CONFIG.authentication.promptStrategy;

    if (isAuthenticated) {
      // User is authenticated - show minimal status
      return `
        <div class="auth-status authenticated">
          <span class="auth-indicator">✓</span>
          <span class="auth-text">Signed in as ${this.authService.authState.username || 'User'}</span>
        </div>
      `;
    }

    // User is not authenticated - show contextual prompt based on strategy
    if (promptStrategy === AuthPromptStrategy.CONTEXTUAL) {
      return `
        <div class="auth-status contextual-prompt">
          <div class="auth-prompt-content">
            <span class="auth-prompt-icon">🔐</span>
            <span class="auth-prompt-text">${CONFIG.authentication.contextualPromptText}</span>
            <button class="auth-login-btn" onclick="handleAuthLogin()">Sign In</button>
            <button class="auth-offline-btn" onclick="handleOfflineMode()">Continue Offline</button>
          </div>
        </div>
      `;
    }

    if (promptStrategy === AuthPromptStrategy.PERSISTENT && !isAuthenticated) {
      return `
        <div class="auth-status persistent-prompt">
          <div class="auth-prompt-content">
            <span class="auth-prompt-icon">⚠️</span>
            <span class="auth-prompt-text">Authentication required to access full features</span>
            <button class="auth-login-btn" onclick="handleAuthLogin()">Sign In Now</button>
          </div>
        </div>
      `;
    }

    // No auth prompt or NEVER strategy
    if (!isAuthenticated && CONFIG.authentication.allowOfflineMode) {
      return `
        <div class="auth-status offline-mode">
          <span class="auth-indicator">📱</span>
          <span class="auth-text">${CONFIG.authentication.offlineModeText}</span>
        </div>
      `;
    }

    return '';
  }

  /**
   * Handle authentication-related messages from webview
   * @private utility method for auth message handling
   */
  private async handleAuthMessage(message: any): Promise<void> {
    if (!this.authService) {
      return;
    }

    switch (message.type) {
      case 'authLogin':
        try {
          // Trigger authentication flow
          vscode.commands.executeCommand('aidm-vscode-extension.login');

          // Refresh content after authentication attempt
          setTimeout(() => this.orchestrateContentRefresh(), 1000);
        } catch (error) {
          console.error('TaskWebviewController: Auth login failed:', error);
        }
        break;

      case 'offlineMode':
        // User chose to continue offline - refresh to show offline state
        await this.orchestrateContentRefresh();
        vscode.window.showInformationMessage('Working in offline mode with cached/mock data');
        break;

      case 'refreshAuth':
        // Check auth status and refresh
        await this.orchestrateContentRefresh();
        break;
    }
  }

  /**
   * Load logo and convert to data URI
   * @private utility method
   */
  private async loadLogo(): Promise<void> {
    try {
      const logoPath = vscode.Uri.joinPath(this.context.extensionUri, 'resources', 'images', 'aidm-logo.svg');
      const logoData = await vscode.workspace.fs.readFile(logoPath);
      const logoSvg = Buffer.from(logoData).toString('utf8');
      const logoDataUri = `data:image/svg+xml;base64,${Buffer.from(logoSvg).toString('base64')}`;
      this.htmlGenerator.setLogoDataUri(logoDataUri);
    } catch (error) {
      console.warn("TaskWebviewController: Failed to load logo:", error);
      // Continue without logo - not critical for functionality
    }
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