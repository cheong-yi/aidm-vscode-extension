/**
 * TaskApiIntegration - Integration for task API with REST as primary method
 * Keeps API logic separate from main extension.ts to avoid clutter
 */

import * as vscode from 'vscode';
import { TasksDataService } from '../services/TasksDataService';
import { TaskApiManager } from '../services/TaskApiManager';
import { TaskStreamStatusBar } from '../ui/TaskStreamStatusBar';
import { TaskApiConfigHelper } from '../ui/TaskApiConfigHelper';

export class TaskApiIntegration {
  private apiManager?: TaskApiManager;
  private statusBar?: TaskStreamStatusBar;

  constructor(
    private tasksDataService: TasksDataService,
    private context: vscode.ExtensionContext
  ) {}

  /**
   * Initialize API components and register commands
   */
  async initialize(): Promise<void> {
    console.log('=== TaskApiIntegration: Initializing ===');

    try {
      // Initialize status bar
      this.statusBar = new TaskStreamStatusBar();
      this.statusBar.initializeFromConfiguration();
      this.context.subscriptions.push(this.statusBar);

      // Initialize API manager
      this.apiManager = new TaskApiManager(this.tasksDataService);
      this.context.subscriptions.push(this.apiManager);

      // Register commands
      this.registerCommands();

      // Initialize API integration (if configured)
      await this.apiManager.initialize();

      console.log('✅ TaskApiIntegration initialized successfully');
    } catch (error) {
      console.warn('⚠️ TaskApiIntegration initialization failed:', error);
      // Don't throw - allow extension to continue without API integration
    }
  }

  /**
   * Register task API commands
   */
  private registerCommands(): void {
    if (!this.apiManager || !this.statusBar) return;

    const apiManager = this.apiManager;
    const statusBar = this.statusBar;

    // Configure command
    this.context.subscriptions.push(
      vscode.commands.registerCommand('aidm.taskApi.configure', async () => {
        try {
          const result = await TaskApiConfigHelper.showConfigurationDialog();
          if (result.configured) {
            statusBar.showTemporaryMessage('Configuration saved', 'check', 2000);

            if (result.requiresReload) {
              // Reload will be handled by the config helper
              return;
            }

            // Reinitialize API integration with new config
            await apiManager.initialize();
          }
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          vscode.window.showErrorMessage(`Configuration failed: ${message}`);
        }
      })
    );

    // Connect command (start polling/streaming)
    this.context.subscriptions.push(
      vscode.commands.registerCommand('aidm.taskApi.connect', async () => {
        try {
          statusBar.showTemporaryMessage('Connecting...', 'sync~spin', 5000);

          // Start polling for updates
          await apiManager.startPolling();

          // Try to connect to streaming if enabled
          const config = vscode.workspace.getConfiguration('aidmVscodeExtension.taskApi');
          const streamingEnabled = config.get<boolean>('enableStreaming', false);

          if (streamingEnabled) {
            try {
              await apiManager.connectToStream();
              vscode.window.showInformationMessage('Connected to task API with real-time streaming');
            } catch (streamError) {
              console.warn('Streaming connection failed, using polling only:', streamError);
              vscode.window.showInformationMessage('Connected to task API (polling mode)');
            }
          } else {
            vscode.window.showInformationMessage('Connected to task API (polling mode)');
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
          await apiManager.disconnect();
          vscode.window.showInformationMessage('Disconnected from task API');
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          vscode.window.showErrorMessage(`Disconnect failed: ${message}`);
        }
      })
    );

    // Status command
    this.context.subscriptions.push(
      vscode.commands.registerCommand('aidm.taskApi.status', async () => {
        const status = apiManager.getApiStatus();

        let statusMessage: string;
        if (status.connected) {
          const methods: string[] = [];
          if (status.polling) methods.push('polling');
          if (status.streaming) methods.push('streaming');
          statusMessage = `✅ Connected to task API (${methods.join(' + ')})`;
        } else if (status.configured) {
          statusMessage = '⚠️ Configured but not connected';
        } else {
          statusMessage = '❌ Not configured';
        }

        const details: string[] = [];
        if (status.lastFetch) {
          details.push(`Last fetch: ${status.lastFetch.toLocaleTimeString()}`);
        }

        const actions: string[] = [];
        if (!status.configured) {
          actions.push('Configure');
        } else if (!status.connected) {
          actions.push('Connect', 'Reconfigure', 'Test Connection');
        } else {
          actions.push('Disconnect', 'Refresh', 'Test Connection');
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
              const tasks = await apiManager.refreshFromApi();
              vscode.window.showInformationMessage(`Refreshed ${tasks.length} tasks from API`);
            } catch (error) {
              vscode.window.showErrorMessage(`Refresh failed: ${error}`);
            }
            break;
        }
      })
    );

    // Test connection command
    this.context.subscriptions.push(
      vscode.commands.registerCommand('aidm.taskApi.testConnection', async () => {
        try {
          statusBar.showTemporaryMessage('Testing...', 'sync~spin', 5000);
          await apiManager.testConnection();
          vscode.window.showInformationMessage('✅ API connection test successful');
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          vscode.window.showErrorMessage(`❌ Connection test failed: ${message}`);
        }
      })
    );

    // Check configuration command (for troubleshooting)
    this.context.subscriptions.push(
      vscode.commands.registerCommand('aidm.taskApi.checkConfig', async () => {
        await TaskApiConfigHelper.checkConfiguration();
      })
    );

    console.log('✅ Task API commands registered');
  }

  /**
   * Get current API status
   */
  getStatus(): { configured: boolean; connected: boolean; polling: boolean; streaming: boolean } {
    if (!this.apiManager) {
      return { configured: false, connected: false, polling: false, streaming: false };
    }
    return this.apiManager.getApiStatus();
  }

  /**
   * Override TasksDataService getTasks to use API if available
   */
  async getTasksFromApiIfAvailable(): Promise<any> {
    if (!this.apiManager) {
      return null; // Use default TasksDataService behavior
    }

    try {
      return await this.apiManager.getCachedTasks();
    } catch (error) {
      console.warn('[TaskApiIntegration] Failed to get tasks from API, falling back to default:', error);
      return null; // Use default TasksDataService behavior
    }
  }

  /**
   * Override TasksDataService updateTaskStatus to use API if available
   */
  async updateTaskStatusViaApiIfAvailable(taskId: string, status: string): Promise<boolean | null> {
    if (!this.apiManager) {
      return null; // Use default TasksDataService behavior
    }

    try {
      return await this.apiManager.updateTaskStatus(taskId, status);
    } catch (error) {
      console.warn('[TaskApiIntegration] Failed to update task via API, falling back to default:', error);
      return null; // Use default TasksDataService behavior
    }
  }

  /**
   * Dispose resources
   */
  dispose(): void {
    this.apiManager?.dispose();
    this.statusBar?.dispose();
  }
}