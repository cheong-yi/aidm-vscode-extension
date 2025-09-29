/**
 * TaskApiIntegrationSimple - Simple integration following SRP
 * Single responsibility: Coordinate API service with existing systems
 */

import * as vscode from 'vscode';
import { TasksDataService } from '../services/TasksDataService';
import { TaskApiServiceSimple, TaskApiServiceConfig } from '../services/TaskApiServiceSimple';
import { AuthServiceTokenProvider } from '../api/AuthServiceTokenProvider';
import { TaskStatusIndicator, TaskDataSource, TaskStatusInfo } from '../ui/TaskStatusIndicator';
import { AuthService } from '../auth/authService';

export class TaskApiIntegrationSimple {
  private apiService?: TaskApiServiceSimple;
  private statusIndicator: TaskStatusIndicator;
  private tokenProvider: AuthServiceTokenProvider;

  constructor(
    private tasksDataService: TasksDataService,
    private authService: AuthService,
    private context: vscode.ExtensionContext
  ) {
    this.tokenProvider = new AuthServiceTokenProvider(authService);
    this.statusIndicator = new TaskStatusIndicator();
    this.context.subscriptions.push(this.statusIndicator);
  }

  /**
   * Initialize integration
   */
  async initialize(): Promise<void> {
    console.log('=== TaskApiIntegrationSimple: Initializing ===');

    try {
      // Register commands
      this.registerCommands();

      // Setup API service if configured
      await this.setupApiServiceIfReady();

      // Update initial status
      this.updateStatusIndicator();

      console.log('✅ TaskApiIntegrationSimple initialized successfully');
    } catch (error) {
      console.warn('⚠️ TaskApiIntegrationSimple initialization failed:', error);
      this.updateStatusIndicator();
    }
  }

  /**
   * Register commands
   */
  private registerCommands(): void {
    // Configure command
    this.context.subscriptions.push(
      vscode.commands.registerCommand('aidm.taskApi.configure', async () => {
        await this.showConfigurationDialog();
      })
    );

    // Connect command
    this.context.subscriptions.push(
      vscode.commands.registerCommand('aidm.taskApi.connect', async () => {
        await this.connectToApi();
      })
    );

    // Status command
    this.context.subscriptions.push(
      vscode.commands.registerCommand('aidm.taskApi.status', async () => {
        await this.showStatusDialog();
      })
    );

    // Test connection command
    this.context.subscriptions.push(
      vscode.commands.registerCommand('aidm.taskApi.testConnection', async () => {
        await this.testConnection();
      })
    );

    console.log('✅ Simple API commands registered');
  }

  /**
   * Setup API service if configuration and auth are ready
   */
  private async setupApiServiceIfReady(): Promise<void> {
    const config = this.getApiConfig();

    if (!config.enabled || !config.baseUrl?.trim()) {
      console.log('[TaskApiIntegrationSimple] API not configured');
      return;
    }

    if (!this.tokenProvider.isAuthenticated()) {
      console.log('[TaskApiIntegrationSimple] User not authenticated');
      return;
    }

    try {
      const serviceConfig: TaskApiServiceConfig = {
        baseUrl: config.baseUrl,
        pollInterval: config.pollInterval,
      };

      this.apiService = new TaskApiServiceSimple(serviceConfig, this.tokenProvider);

      // Connect events
      this.apiService.onTasksUpdated.event((tasks) => {
        // Forward to existing TasksDataService
        this.tasksDataService.onTasksUpdated.fire(tasks);
        this.updateStatusIndicator();
      });

      this.apiService.onError.event((error) => {
        // Forward to existing TasksDataService
        this.tasksDataService.onError.fire(error);
        this.updateStatusIndicator();
      });

      // Start polling
      this.apiService.startPolling();

      console.log('[TaskApiIntegrationSimple] API service setup completed');
    } catch (error) {
      console.error('[TaskApiIntegrationSimple] Failed to setup API service:', error);
      throw error;
    }
  }

  /**
   * Show simple configuration dialog
   */
  private async showConfigurationDialog(): Promise<void> {
    try {
      // Check authentication first
      if (!this.tokenProvider.isAuthenticated()) {
        const loginChoice = await vscode.window.showWarningMessage(
          'You need to log in before configuring the task API',
          'Log In',
          'Cancel'
        );

        if (loginChoice === 'Log In') {
          // Trigger existing auth login
          await vscode.commands.executeCommand('aidm.auth.login');
          if (!this.tokenProvider.isAuthenticated()) {
            return; // Login failed or cancelled
          }
        } else {
          return;
        }
      }

      // Get base URL
      const currentConfig = this.getApiConfig();
      const baseUrl = await vscode.window.showInputBox({
        prompt: 'Enter your organization\'s task API base URL',
        placeholder: 'https://api.yourorganization.com',
        value: currentConfig.baseUrl || '',
        validateInput: (value) => {
          if (!value?.trim()) return 'Base URL is required';
          try {
            const url = new URL(value);
            if (url.protocol !== 'https:') return 'HTTPS is required';
            if (url.hostname === 'localhost') return 'Use your organization\'s public API URL';
          } catch {
            return 'Please enter a valid HTTPS URL';
          }
          return null;
        },
      });

      if (!baseUrl) return;

      // Save configuration
      const config = vscode.workspace.getConfiguration('aidmVscodeExtension.taskApi');
      await Promise.all([
        config.update('enabled', true, vscode.ConfigurationTarget.Global),
        config.update('baseUrl', baseUrl.trim(), vscode.ConfigurationTarget.Global),
      ]);

      vscode.window.showInformationMessage(
        'Task API configured successfully! Connecting...'
      );

      // Setup API service
      await this.setupApiServiceIfReady();
      this.updateStatusIndicator();

    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      vscode.window.showErrorMessage(`Configuration failed: ${message}`);
    }
  }

  /**
   * Connect to API
   */
  private async connectToApi(): Promise<void> {
    try {
      if (!this.tokenProvider.isAuthenticated()) {
        vscode.window.showWarningMessage('Please log in first');
        return;
      }

      if (!this.apiService) {
        await this.setupApiServiceIfReady();
      }

      if (!this.apiService) {
        vscode.window.showWarningMessage('API not configured. Please configure first.');
        return;
      }

      this.statusIndicator.showTemporaryMessage('Connecting...', 'sync~spin', 3000);

      // Test connection
      await this.apiService.testConnection();

      // Start polling
      this.apiService.startPolling();

      vscode.window.showInformationMessage('Connected to task API successfully');
      this.updateStatusIndicator();

    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      vscode.window.showErrorMessage(`Connection failed: ${message}`);
      this.updateStatusIndicator();
    }
  }

  /**
   * Show status dialog
   */
  private async showStatusDialog(): Promise<void> {
    const authState = this.authService.authState;
    const apiStatus = this.apiService?.getStatus();

    let statusMessage: string;
    let actions: string[] = [];

    if (!authState.isLoggedIn) {
      statusMessage = '❌ Not authenticated';
      actions = ['Log In'];
    } else if (!this.getApiConfig().enabled) {
      statusMessage = '⚙️ API not configured';
      actions = ['Configure'];
    } else if (!apiStatus?.polling) {
      statusMessage = '⚠️ API configured but not connected';
      actions = ['Connect', 'Test Connection'];
    } else {
      statusMessage = '✅ Connected to API';
      actions = ['Disconnect', 'Test Connection'];
    }

    const details: string[] = [];
    if (authState.email) {
      details.push(`User: ${authState.email}`);
    }
    if (apiStatus?.lastFetch) {
      details.push(`Last fetch: ${apiStatus.lastFetch.toLocaleTimeString()}`);
    }
    if (apiStatus?.cachedTaskCount !== undefined) {
      details.push(`Cached tasks: ${apiStatus.cachedTaskCount}`);
    }

    const fullMessage = details.length > 0
      ? `${statusMessage}\n\n${details.join('\n')}`
      : statusMessage;

    const choice = await vscode.window.showInformationMessage(
      fullMessage,
      { modal: true },
      ...actions
    );

    switch (choice) {
      case 'Log In':
        await vscode.commands.executeCommand('aidm.auth.login');
        break;
      case 'Configure':
        await this.showConfigurationDialog();
        break;
      case 'Connect':
        await this.connectToApi();
        break;
      case 'Disconnect':
        this.apiService?.stopPolling();
        this.updateStatusIndicator();
        break;
      case 'Test Connection':
        await this.testConnection();
        break;
    }
  }

  /**
   * Test API connection
   */
  private async testConnection(): Promise<void> {
    try {
      if (!this.apiService) {
        vscode.window.showWarningMessage('API not configured');
        return;
      }

      this.statusIndicator.showTemporaryMessage('Testing...', 'sync~spin', 5000);
      const result = await this.apiService.testConnection();

      vscode.window.showInformationMessage(
        `✅ Connection successful!\nUser: ${result.user}\nLatency: ${result.latency}ms`
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      vscode.window.showErrorMessage(`❌ Connection test failed: ${message}`);
    }
  }

  /**
   * Update status indicator based on current state
   */
  private updateStatusIndicator(): void {
    const authState = this.authService.authState;
    const apiConfig = this.getApiConfig();
    const apiStatus = this.apiService?.getStatus();

    let status: TaskStatusInfo;

    if (!authState.isLoggedIn) {
      status = { source: TaskDataSource.NOT_AUTHENTICATED };
    } else if (!apiConfig.enabled || !apiConfig.baseUrl) {
      status = { source: TaskDataSource.NOT_CONFIGURED };
    } else if (apiStatus?.polling) {
      status = {
        source: TaskDataSource.API_ONLINE,
        user: authState.email,
        lastFetch: apiStatus.lastFetch,
        taskCount: apiStatus.cachedTaskCount,
      };
    } else {
      status = {
        source: TaskDataSource.LOCAL_OFFLINE,
        taskCount: undefined, // Could get from TasksDataService if needed
      };
    }

    this.statusIndicator.updateStatus(status);
  }

  /**
   * Get API configuration
   */
  private getApiConfig(): {
    enabled: boolean;
    baseUrl?: string;
    pollInterval?: number;
  } {
    const config = vscode.workspace.getConfiguration('aidmVscodeExtension.taskApi');

    return {
      enabled: config.get<boolean>('enabled', false),
      baseUrl: config.get<string>('baseUrl', ''),
      pollInterval: config.get<number>('pollInterval', 60000),
    };
  }

  /**
   * Get tasks (API if available, otherwise delegate to TasksDataService)
   */
  async getTasks(): Promise<any[]> {
    if (this.apiService && this.tokenProvider.isAuthenticated()) {
      try {
        return await this.apiService.fetchTasks();
      } catch (error) {
        console.warn('[TaskApiIntegrationSimple] API fetch failed, falling back to local:', error);
      }
    }

    // Fall back to existing TasksDataService
    return this.tasksDataService.getTasks();
  }

  /**
   * Dispose resources
   */
  dispose(): void {
    this.apiService?.dispose();
    this.statusIndicator.dispose();
  }
}