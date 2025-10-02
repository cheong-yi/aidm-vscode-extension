/**
 * TaskApiIntegrationSSO - Complete SSO-to-Task integration
 * Coordinates: SSO Auth → API Fetch → .aidm/.tasks Persistence → UI Refresh
 * Task: SSO-INTEGRATION-001
 */

import * as vscode from 'vscode';
import { TasksDataService } from '../services/TasksDataService';
import { AuthService } from '../auth/authService';
import { TaskApiClient } from '../api/TaskApiClient';
import { AuthServiceTokenProvider } from '../api/AuthServiceTokenProvider';
import { TaskPersistenceService } from '../services/TaskPersistenceService';
import { RepositoryContextService } from '../services/RepositoryContextService';
import { log } from '../utils/logger';

export class TaskApiIntegrationSSO {
  private tokenProvider: AuthServiceTokenProvider;
  private apiClient: TaskApiClient | null = null;
  private persistenceService: TaskPersistenceService;
  private repoContextService: RepositoryContextService;
  private authStateSubscription: vscode.Disposable | null = null;

  constructor(
    private tasksDataService: TasksDataService,
    private authService: AuthService,
    private context: vscode.ExtensionContext
  ) {
    this.tokenProvider = new AuthServiceTokenProvider(authService);
    this.persistenceService = new TaskPersistenceService();
    this.repoContextService = new RepositoryContextService();

    log('INFO', 'TaskApiIntegrationSSO', 'Initialized with SSO support');
  }

  async initialize(): Promise<void> {
    log('INFO', 'TaskApiIntegrationSSO', 'Starting SSO integration initialization');

    try {
      // Setup API client if user is already authenticated
      if (this.authService.authState.isLoggedIn) {
        await this.setupApiClient();
        await this.fetchAndPersistTasks();
      }

      // Watch for auth state changes (future SSO login events)
      this.watchAuthStateChanges();

      log('INFO', 'TaskApiIntegrationSSO', 'SSO integration initialized successfully');
    } catch (error) {
      log('ERROR', 'TaskApiIntegrationSSO', 'Failed to initialize SSO integration', { error });
    }
  }

  /**
   * Watch for authentication state changes to trigger task fetching
   */
  private watchAuthStateChanges(): void {
    // Poll auth state periodically (VSCode doesn't have auth state change events)
    let lastAuthState = this.authService.authState.isLoggedIn;

    const checkAuthState = async () => {
      const currentAuthState = this.authService.authState.isLoggedIn;

      if (currentAuthState && !lastAuthState) {
        // User just logged in
        log('INFO', 'TaskApiIntegrationSSO', 'User logged in - fetching tasks');
        await this.setupApiClient();
        await this.fetchAndPersistTasks();
      } else if (!currentAuthState && lastAuthState) {
        // User logged out
        log('INFO', 'TaskApiIntegrationSSO', 'User logged out - clearing API client');
        this.apiClient = null;
      }

      lastAuthState = currentAuthState;
    };

    // Check every 5 seconds
    const interval = setInterval(checkAuthState, 5000);

    this.authStateSubscription = new vscode.Disposable(() => {
      clearInterval(interval);
    });

    this.context.subscriptions.push(this.authStateSubscription);
  }

  /**
   * Setup API client with current auth token
   */
  private async setupApiClient(): Promise<void> {
    const config = vscode.workspace.getConfiguration('aidmVscodeExtension');
    const baseUrl = config.get<string>('api.baseUrl', '');

    if (!baseUrl) {
      log('WARN', 'TaskApiIntegrationSSO', 'No API base URL configured');
      return;
    }

    this.tokenProvider.initializeIdentityService(baseUrl);
    this.apiClient = new TaskApiClient(baseUrl, this.tokenProvider);

    log('INFO', 'TaskApiIntegrationSSO', `API client configured with base URL: ${baseUrl}`);
  }

  /**
   * Fetch tasks from API and persist to .aidm/.tasks
   */
  async fetchAndPersistTasks(userInitiated = false): Promise<void> {
    if (!this.apiClient) {
      log('WARN', 'TaskApiIntegrationSSO', 'API client not initialized');
      return;
    }

    try {
      // Get repository context
      const repoContext = await this.repoContextService.getRepositoryContext();

      if (!repoContext) {
        log('WARN', 'TaskApiIntegrationSSO', 'No repository context available');
        return;
      }

      log('INFO', 'TaskApiIntegrationSSO', `Fetching tasks for repo: ${repoContext.repoId}`);

      // Fetch tasks with repo filter
      const result = await this.apiClient.fetchUserTasks(repoContext.repoId);

      if (!result.success || !result.data) {
        log('ERROR', 'TaskApiIntegrationSSO', 'Failed to fetch tasks', {
          error: result.error
        });
        // Only show warning notification for user-initiated actions
        if (userInitiated) {
          vscode.window.showWarningMessage(
            `Failed to fetch tasks: ${result.error}`
          );
        }

        // Always log for debugging
        log('WARN', 'TaskApiIntegrationSSO', 'Failed to fetch tasks', { error: result.error });
        return;
      }

      log('INFO', 'TaskApiIntegrationSSO', `Fetched ${result.data.length} tasks from API`);

      // Persist to .aidm/.tasks
      await this.persistenceService.saveTasks(result.data, repoContext.workspaceFolder);

      log('INFO', 'TaskApiIntegrationSSO', `Saved ${result.data.length} tasks to .aidm/.tasks`);

      // Trigger TasksDataService to reload
      await this.tasksDataService.refreshTasks();

      // Only show success notification for user-initiated actions
      if (userInitiated) {
        vscode.window.showInformationMessage(
          `✓ Synced ${result.data.length} tasks from API`
        );
      }

      // Always log for debugging
      log('INFO', 'TaskApiIntegrationSSO', `Synced ${result.data.length} tasks from API`);
    } catch (error) {
      log('ERROR', 'TaskApiIntegrationSSO', 'Failed to fetch and persist tasks', { error });
      // Only show error notification for user-initiated actions
      if (userInitiated) {
        vscode.window.showErrorMessage(
          `Failed to sync tasks: ${error instanceof Error ? error.message : String(error)}`
        );
      }

      // Always log for debugging
      log('ERROR', 'TaskApiIntegrationSSO', 'Failed to fetch and persist tasks', { error });
    }
  }

  /**
   * Manual refresh command
   */
  async manualRefresh(): Promise<void> {
    if (!this.authService.authState.isLoggedIn) {
      vscode.window.showWarningMessage('Please log in first to sync tasks');
      return;
    }

    if (!this.apiClient) {
      await this.setupApiClient();
    }

    await this.fetchAndPersistTasks();
  }

  dispose(): void {
    this.authStateSubscription?.dispose();
  }
}
