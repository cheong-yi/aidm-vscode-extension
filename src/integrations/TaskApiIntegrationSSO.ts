/**
 * TaskApiIntegrationSSO - Enhanced integration using existing SSO authentication
 * Automatically manages authentication using AuthService
 */

import * as vscode from 'vscode';
import { TasksDataService } from '../services/TasksDataService';
// import { TaskApiServiceAuth } from '../services/TaskApiServiceAuth'; // REMOVED: TaskApiServiceAuth deleted

// Stub type to prevent compilation errors in unused code
type TaskApiServiceAuth = any;
import { TaskStreamStatusBar } from '../ui/TaskStreamStatusBar';
import { TaskApiConfigHelperSSO } from '../ui/TaskApiConfigHelperSSO';
import { AuthService } from '../../auth/authService';

export class TaskApiIntegrationSSO {
  private apiService?: TaskApiServiceAuth;
  private statusBar?: TaskStreamStatusBar;
  private cachedTasks: any[] = [];
  private lastSuccessfulFetch?: Date;

  constructor(
    private tasksDataService: TasksDataService,
    private authService: AuthService,
    private context: vscode.ExtensionContext
  ) {}

  /**
   * Initialize API components with SSO authentication
   */
  async initialize(): Promise<void> {
    console.log('=== TaskApiIntegrationSSO: Initializing with SSO ===');

    try {
      // Initialize status bar
      this.statusBar = new TaskStreamStatusBar();
      this.statusBar.initializeFromConfiguration();
      this.context.subscriptions.push(this.statusBar);

      // Register commands
      this.registerCommands();

      // Initialize API service if configured and user is authenticated
      await this.setupApiServiceIfReady();

      console.log('✅ TaskApiIntegrationSSO initialized successfully');
    } catch (error) {
      console.warn('⚠️ TaskApiIntegrationSSO initialization failed:', error);
      // Don't throw - allow extension to continue without API integration
    }
  }

  /**
   * Setup API service if configuration and authentication are ready
   */
  private async setupApiServiceIfReady(): Promise<void> {
    const config = this.getApiConfig();

    if (!config.enabled) {
      console.log('[TaskApiIntegrationSSO] API integration disabled in configuration');
      return;
    }

    if (!config.baseUrl?.trim()) {
      console.log('[TaskApiIntegrationSSO] No base URL configured');
      return;
    }

    const authState = this.authService.authState;
    if (!authState.isLoggedIn || !authState.token) {
      console.log('[TaskApiIntegrationSSO] User not authenticated, skipping API setup');
      return;
    }

    try {
      // Create API service with SSO integration
      this.apiService = new TaskApiServiceAuth({
        baseUrl: config.baseUrl,
        enableStreaming: config.enableStreaming,
        pollInterval: config.pollInterval,
      }, this.authService);

      // Set up event handlers
      this.apiService.onTasksUpdated.event((tasks) => {
        this.handleTasksUpdated(tasks);
      });

      this.apiService.onError.event((error) => {
        // Forward API errors to the main data service
        this.tasksDataService.onError.fire(error);
      });

      // Load initial tasks
      try {
        const result = await this.apiService.fetchTasks();
        if (result.success) {
          this.cachedTasks = result.data;
          this.lastSuccessfulFetch = new Date();
          console.log(`[TaskApiIntegrationSSO] Loaded ${result.data.length} initial tasks from authenticated API`);
        } else {
          console.warn(`[TaskApiIntegrationSSO] Initial API fetch failed: ${result.error}`);
        }
      } catch (error) {
        console.warn('[TaskApiIntegrationSSO] Failed to load initial tasks from API:', error);
        this.cachedTasks = [];
      }

      // Start polling for updates (respects authentication state)
      this.apiService.startPolling();

      // Optionally connect to streaming if enabled
      if (config.enableStreaming) {
        try {
          const streamResult = await this.apiService.connectToStream();
          if (streamResult.success) {
            console.log('[TaskApiIntegrationSSO] SSE streaming connected successfully');
          } else {
            console.warn(`[TaskApiIntegrationSSO] SSE streaming failed: ${streamResult.error}`);
            // Continue with polling only
          }
        } catch (error) {
          console.warn('[TaskApiIntegrationSSO] SSE streaming setup failed:', error);
          // Continue with polling only
        }
      }

      console.log('[TaskApiIntegrationSSO] API service setup completed successfully');
    } catch (error) {
      console.error('[TaskApiIntegrationSSO] Failed to setup API service:', error);
      throw error;
    }
  }

  /**
   * Register task API commands with SSO integration
   */
  private registerCommands(): void {
    if (!this.statusBar) return;

    const statusBar = this.statusBar;

    // Configure command (with SSO)
    this.context.subscriptions.push(
      vscode.commands.registerCommand('aidm.taskApi.configure', async () => {
        try {
          const result = await TaskApiConfigHelperSSO.showConfigurationDialog(this.authService);
          if (result.configured) {
            statusBar.showTemporaryMessage('Configuration saved', 'check', 2000);

            if (result.requiresReload) {
              // Reload will be handled by the config helper
              return;
            }

            // Reinitialize API integration with new config
            await this.setupApiServiceIfReady();
          }
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          vscode.window.showErrorMessage(`Configuration failed: ${message}`);
        }
      })
    );

    // Connect command (with authentication check)
    this.context.subscriptions.push(
      vscode.commands.registerCommand('aidm.taskApi.connect', async () => {
        try {
          // Check authentication first
          const authState = this.authService.authState;
          if (!authState.isLoggedIn) {
            const loginChoice = await vscode.window.showWarningMessage(
              'You need to log in before connecting to the task API',
              'Log In',
              'Cancel'
            );

            if (loginChoice === 'Log In') {
              const loginResult = await this.authService.performSSOLogin();
              if (!loginResult.success) {
                vscode.window.showErrorMessage(`Login failed: ${loginResult.message}`);
                return;
              }
            } else {
              return;
            }
          }

          // Setup API service if not already done
          if (!this.apiService) {
            await this.setupApiServiceIfReady();
          }

          if (!this.apiService) {
            vscode.window.showErrorMessage('API service not available. Please check configuration.');
            return;
          }

          statusBar.showTemporaryMessage('Connecting...', 'sync~spin', 5000);

          // Start polling for updates
          this.apiService.startPolling();

          // Try to connect to streaming if enabled
          const config = this.getApiConfig();
          if (config.enableStreaming) {
            try {
              await this.apiService.connectToStream();
              vscode.window.showInformationMessage(
                `Connected to task API with real-time streaming (${authState.email})`
              );
            } catch (streamError) {
              console.warn('Streaming connection failed, using polling only:', streamError);
              vscode.window.showInformationMessage(
                `Connected to task API in polling mode (${authState.email})`
              );
            }
          } else {
            vscode.window.showInformationMessage(
              `Connected to task API in polling mode (${authState.email})`
            );
          }
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          vscode.window.showErrorMessage(`Connection failed: ${message}`);
        }
      })
    );

    // Disconnect command
    this.context.subscriptions.push(
      vscode.commands.registerCommand('aidm.taskApi.disconnect', async () => {
        try {
          if (this.apiService) {
            await this.apiService.disconnect();
          }
          vscode.window.showInformationMessage('Disconnected from task API');
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          vscode.window.showErrorMessage(`Disconnect failed: ${message}`);
        }
      })
    );

    // Status command with authentication info
    this.context.subscriptions.push(
      vscode.commands.registerCommand('aidm.taskApi.status', async () => {
        const authState = this.authService.authState;
        const apiStatus = this.getApiStatus();

        let statusMessage: string;
        if (!authState.isLoggedIn) {
          statusMessage = '❌ Not authenticated';
        } else if (apiStatus.connected) {
          const methods: string[] = [];
          if (apiStatus.polling) methods.push('polling');
          if (apiStatus.streaming) methods.push('streaming');
          statusMessage = `✅ Connected (${methods.join(' + ')})`;
        } else if (apiStatus.configured) {
          statusMessage = '⚠️ Configured but not connected';
        } else {
          statusMessage = '❌ Not configured';
        }

        const details: string[] = [
          `User: ${authState.email || 'Not logged in'}`,
          `Agency: ${authState.agency_name || 'N/A'}`,
        ];

        if (apiStatus.lastFetch) {
          details.push(`Last fetch: ${apiStatus.lastFetch.toLocaleTimeString()}`);
        }

        const actions: string[] = [];
        if (!authState.isLoggedIn) {
          actions.push('Log In');
        } else if (!apiStatus.configured) {
          actions.push('Configure');
        } else if (!apiStatus.connected) {
          actions.push('Connect', 'Reconfigure', 'Test Connection');
        } else {
          actions.push('Disconnect', 'Refresh', 'Test Connection');
        }

        const fullMessage = `${statusMessage}\n\n${details.join('\n')}`;

        const choice = await vscode.window.showInformationMessage(
          fullMessage,
          { modal: true },
          ...actions
        );

        switch (choice) {
          case 'Log In':
            await this.authService.performSSOLogin();
            break;
          case 'Configure':
          case 'Reconfigure':
            await vscode.commands.executeCommand('aidm.taskApi.configure');
            break;
          case 'Connect':
            await vscode.commands.executeCommand('aidm.taskApi.connect');
            break;
          case 'Disconnect':
            await vscode.commands.executeCommand('aidm.taskApi.disconnect');
            break;
          case 'Test Connection':
            await vscode.commands.executeCommand('aidm.taskApi.testConnection');
            break;
          case 'Refresh':
            try {
              const tasks = await this.refreshFromApi();
              vscode.window.showInformationMessage(`Refreshed ${tasks.length} tasks from API`);
            } catch (error) {
              vscode.window.showErrorMessage(`Refresh failed: ${error}`);
            }
            break;
        }
      })
    );

    // Test connection command with authentication
    this.context.subscriptions.push(
      vscode.commands.registerCommand('aidm.taskApi.testConnection', async () => {
        try {
          if (!this.authService.authState.isLoggedIn) {
            vscode.window.showWarningMessage('Please log in before testing the connection');
            return;
          }

          if (!this.apiService) {
            await this.setupApiServiceIfReady();
          }

          if (!this.apiService) {
            vscode.window.showErrorMessage('API service not available. Please check configuration.');
            return;
          }

          statusBar.showTemporaryMessage('Testing...', 'sync~spin', 5000);
          const result = await this.apiService.testConnection();

          if (result.success) {
            vscode.window.showInformationMessage(
              `✅ API connection successful!\nUser: ${result.data.user}\nLatency: ${result.data.latency}ms`
            );
          } else {
            vscode.window.showErrorMessage(`❌ Connection test failed: ${result.error}`);
          }
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          vscode.window.showErrorMessage(`❌ Connection test error: ${message}`);
        }
      })
    );

    // Check configuration command
    this.context.subscriptions.push(
      vscode.commands.registerCommand('aidm.taskApi.checkConfig', async () => {
        await TaskApiConfigHelperSSO.checkConfiguration(this.authService);
      })
    );

    console.log('✅ Task API SSO commands registered');
  }

  /**
   * Handle tasks updated from API
   */
  private handleTasksUpdated(tasks: any[]): void {
    console.log(`[TaskApiIntegrationSSO] Received ${tasks.length} tasks from authenticated API`);

    // Update cache
    this.cachedTasks = tasks;
    this.lastSuccessfulFetch = new Date();

    // Emit updated tasks to existing data service listeners
    this.tasksDataService.onTasksUpdated.fire([...tasks]);
  }

  /**
   * Get current API status
   */
  getApiStatus(): {
    configured: boolean;
    connected: boolean;
    polling: boolean;
    streaming: boolean;
    authenticated: boolean;
    lastFetch?: Date;
  } {
    if (!this.apiService) {
      return {
        configured: this.getApiConfig().enabled,
        connected: false,
        polling: false,
        streaming: false,
        authenticated: this.authService.authState.isLoggedIn,
      };
    }

    const status = this.apiService.getStatus();
    return {
      configured: status.configured,
      connected: status.authenticated && (status.polling || status.streaming),
      polling: status.polling,
      streaming: status.streaming,
      authenticated: status.authenticated,
      lastFetch: status.lastFetch || this.lastSuccessfulFetch,
    };
  }

  /**
   * Get cached tasks if API is active and authenticated
   */
  async getCachedTasks(): Promise<any[]> {
    if (this.apiService && this.authService.authState.isLoggedIn && this.cachedTasks.length > 0 && this.lastSuccessfulFetch) {
      // Check if cache is recent (within last 5 minutes)
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
      if (this.lastSuccessfulFetch > fiveMinutesAgo) {
        return [...this.cachedTasks]; // Return copy to prevent mutations
      }
    }

    // Fall back to regular data service loading
    return this.tasksDataService.getTasks();
  }

  /**
   * Refresh tasks from API
   */
  async refreshFromApi(): Promise<any[]> {
    if (!this.apiService) {
      throw new Error('API service not available');
    }

    if (!this.authService.authState.isLoggedIn) {
      throw new Error('User not authenticated');
    }

    const result = await this.apiService.fetchTasks();
    if (!result.success) {
      throw new Error(result.error);
    }

    this.cachedTasks = result.data;
    this.lastSuccessfulFetch = new Date();
    return result.data;
  }

  /**
   * Update task status via API
   */
  async updateTaskStatusViaApiIfAvailable(taskId: string, status: string): Promise<boolean | null> {
    if (!this.apiService) {
      return null; // Use default TasksDataService behavior
    }

    if (!this.authService.authState.isLoggedIn) {
      return null; // Use default TasksDataService behavior
    }

    try {
      const result = await this.apiService.updateTaskStatus(taskId, status);
      return result.success ? result.data : null;
    } catch (error) {
      console.warn('[TaskApiIntegrationSSO] Failed to update task via API, falling back to default:', error);
      return null; // Use default TasksDataService behavior
    }
  }

  private getApiConfig(): {
    enabled: boolean;
    baseUrl?: string;
    enableStreaming?: boolean;
    pollInterval?: number;
  } {
    const config = vscode.workspace.getConfiguration('aidmVscodeExtension.taskApi');

    return {
      enabled: config.get<boolean>('enabled', false),
      baseUrl: config.get<string>('baseUrl', ''),
      enableStreaming: config.get<boolean>('enableStreaming', false),
      pollInterval: config.get<number>('pollInterval', 60000),
    };
  }

  /**
   * Dispose resources
   */
  dispose(): void {
    this.apiService?.dispose();
    this.statusBar?.dispose();
  }
}