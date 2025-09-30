/**
 * TaskApiConfigHelper - Configuration UI for task API integration
 * Designed for public REST APIs with optional SSE streaming
 */

import * as vscode from 'vscode';

export interface ApiConfigResult {
  configured: boolean;
  requiresReload: boolean;
}

export class TaskApiConfigHelper {
  /**
   * Show configuration dialog with step-by-step setup
   */
  static async showConfigurationDialog(): Promise<ApiConfigResult> {
    const result: ApiConfigResult = {
      configured: false,
      requiresReload: false,
    };

    try {
      // Step 1: Check if user wants to configure API integration
      const enableChoice = await vscode.window.showInformationMessage(
        'Would you like to enable task API integration?',
        {
          modal: true,
          detail: 'API integration allows you to fetch and manage tasks from external services. You can always enable this later in settings.',
        },
        'Enable API Integration',
        'Keep Disabled'
      );

      if (enableChoice !== 'Enable API Integration') {
        return result;
      }

      // Step 2: Get base URL
      const baseUrl = await vscode.window.showInputBox({
        prompt: 'Enter your task API base URL',
        placeHolder: 'https://api.yourcompany.com',
        validateInput: (value) => {
          if (!value?.trim()) {
            return 'Base URL is required';
          }
          try {
            const url = new URL(value);
            if (url.protocol !== 'https:') {
              return 'HTTPS is required for production APIs (security requirement)';
            }
            if (url.hostname === 'localhost' || url.hostname === '127.0.0.1') {
              return 'Warning: localhost URLs won\'t work for distributed extensions. Use a public HTTPS URL.';
            }
          } catch {
            return 'Please enter a valid HTTPS URL';
          }
          return null;
        },
      });

      if (!baseUrl) {
        return result;
      }

      // Step 3: Get user ID
      const userId = await vscode.window.showInputBox({
        prompt: 'Enter your user ID for task filtering',
        placeHolder: 'your.email@company.com or user123',
        validateInput: (value) => {
          if (!value?.trim()) {
            return 'User ID is required for API task filtering';
          }
          if (value.trim().length < 3) {
            return 'User ID must be at least 3 characters';
          }
          return null;
        },
      });

      if (!userId) {
        return result;
      }

      // Step 4: Get auth token
      const authToken = await vscode.window.showInputBox({
        prompt: 'Enter your API authentication token',
        placeHolder: 'Bearer token or API key',
        password: true,
        validateInput: (value) => {
          if (!value?.trim()) {
            return 'Authentication token is required';
          }
          if (value.trim().length < 10) {
            return 'Token seems too short - please verify it\'s complete';
          }
          return null;
        },
      });

      if (!authToken) {
        return result;
      }

      // Step 5: Optional streaming configuration
      const enableStreaming = await vscode.window.showQuickPick(
        [
          {
            label: 'REST API Only',
            description: 'Use polling for updates (recommended)',
            detail: 'Reliable polling-based updates every 60 seconds',
            picked: true,
          },
          {
            label: 'REST API + Streaming',
            description: 'Enable real-time SSE streaming',
            detail: 'Real-time updates with REST API fallback',
          },
        ],
        {
          placeHolder: 'Choose update method',
          ignoreFocusOut: true,
        }
      );

      if (!enableStreaming) {
        return result;
      }

      // Step 6: Save configuration
      await this.saveConfiguration({
        enabled: true,
        baseUrl: baseUrl.trim(),
        userId: userId.trim(),
        authToken: authToken.trim(),
        enableStreaming: enableStreaming.label === 'REST API + Streaming',
        pollInterval: 60000, // Default 1 minute
      });

      // Step 7: Offer to test connection
      const testChoice = await vscode.window.showInformationMessage(
        'Configuration saved! Would you like to test the API connection?',
        {
          modal: true,
          detail: 'This will verify that your settings are correct and the API is reachable.',
        },
        'Test Connection',
        'Test Later'
      );

      result.configured = true;

      if (testChoice === 'Test Connection') {
        await this.testConnection();
      }

      // Suggest reload for activation
      const reloadChoice = await vscode.window.showInformationMessage(
        'Task API integration configured successfully!',
        {
          detail: 'Reload the window to activate API integration, or it will be active on next startup.',
        },
        'Reload Now',
        'Reload Later'
      );

      if (reloadChoice === 'Reload Now') {
        result.requiresReload = true;
        vscode.commands.executeCommand('workbench.action.reloadWindow');
      }

      return result;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      vscode.window.showErrorMessage(`Configuration failed: ${message}`);
      return result;
    }
  }

  /**
   * Quick configuration check and guidance
   */
  static async checkConfiguration(): Promise<void> {
    const config = vscode.workspace.getConfiguration('aidmVscodeExtension.taskApi');
    const enabled = config.get<boolean>('enabled', false);

    if (!enabled) {
      const choice = await vscode.window.showInformationMessage(
        'Task API integration is disabled',
        'Configure Now',
        'Learn More'
      );

      if (choice === 'Configure Now') {
        await this.showConfigurationDialog();
      } else if (choice === 'Learn More') {
        await this.showConfigurationHelp();
      }
      return;
    }

    // Check if all required settings are present
    const baseUrl = config.get<string>('baseUrl', '');
    const userId = config.get<string>('userId', '');
    const authToken = config.get<string>('authToken', '');

    const missing: string[] = [];
    if (!baseUrl.trim()) missing.push('Base URL');
    if (!userId.trim()) missing.push('User ID');
    if (!authToken.trim()) missing.push('Auth Token');

    if (missing.length > 0) {
      const choice = await vscode.window.showWarningMessage(
        `Task API integration is enabled but missing: ${missing.join(', ')}`,
        'Fix Configuration',
        'Disable Integration'
      );

      if (choice === 'Fix Configuration') {
        await this.showConfigurationDialog();
      } else if (choice === 'Disable Integration') {
        await config.update('enabled', false, vscode.ConfigurationTarget.Global);
        vscode.window.showInformationMessage('Task API integration disabled');
      }
      return;
    }

    // Check for localhost URLs
    try {
      const url = new URL(baseUrl);
      if (url.hostname === 'localhost' || url.hostname === '127.0.0.1') {
        vscode.window.showWarningMessage(
          'Warning: You\'re using a localhost URL which won\'t work for other users of this extension.',
          'Use Public API',
          'Ignore'
        ).then(choice => {
          if (choice === 'Use Public API') {
            this.showConfigurationDialog();
          }
        });
        return;
      }
    } catch (error) {
      vscode.window.showErrorMessage(`Invalid base URL: ${baseUrl}`);
      return;
    }

    vscode.window.showInformationMessage('Task API integration is properly configured and enabled');
  }

  /**
   * Show configuration help and documentation
   */
  static async showConfigurationHelp(): Promise<void> {
    const helpPanel = vscode.window.createWebviewPanel(
      'taskApiHelp',
      'Task API Integration Setup',
      vscode.ViewColumn.One,
      { enableScripts: false }
    );

    helpPanel.webview.html = this.getHelpHTML();
  }

  private static async saveConfiguration(config: {
    enabled: boolean;
    baseUrl: string;
    userId: string;
    authToken: string;
    enableStreaming: boolean;
    pollInterval: number;
  }): Promise<void> {
    const vsConfig = vscode.workspace.getConfiguration('aidmVscodeExtension.taskApi');

    await Promise.all([
      vsConfig.update('enabled', config.enabled, vscode.ConfigurationTarget.Global),
      vsConfig.update('baseUrl', config.baseUrl, vscode.ConfigurationTarget.Global),
      vsConfig.update('userId', config.userId, vscode.ConfigurationTarget.Global),
      vsConfig.update('authToken', config.authToken, vscode.ConfigurationTarget.Global),
      vsConfig.update('enableStreaming', config.enableStreaming, vscode.ConfigurationTarget.Global),
      vsConfig.update('pollInterval', config.pollInterval, vscode.ConfigurationTarget.Global),
    ]);
  }

  private static async testConnection(): Promise<void> {
    const statusMessage = vscode.window.setStatusBarMessage('$(sync~spin) Testing API connection...');

    try {
      // REMOVED: TaskApiService deleted - test functionality disabled
      // const { TaskApiService } = await import('../services/TaskApiService');
      // const config = vscode.workspace.getConfiguration('aidmVscodeExtension.taskApi');

      // const service = new TaskApiService({
      //   baseUrl: config.get<string>('baseUrl', ''),
      //   userId: config.get<string>('userId', ''),
      //   authToken: config.get<string>('authToken', ''),
      //   enableStreaming: config.get<boolean>('enableStreaming', false),
      // });

      throw new Error('TaskApiService test functionality has been removed');
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      vscode.window.showErrorMessage(`❌ Connection test error: ${message}`);
    } finally {
      statusMessage.dispose();
    }
  }

  private static getHelpHTML(): string {
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Task API Integration Setup</title>
  <style>
    body {
      font-family: var(--vscode-font-family);
      padding: 20px;
      line-height: 1.6;
    }
    .config-item {
      margin: 20px 0;
      padding: 15px;
      background: var(--vscode-editor-background);
      border-radius: 4px;
    }
    .config-title {
      font-weight: bold;
      margin-bottom: 8px;
    }
    code {
      background: var(--vscode-textCodeBlock-background);
      padding: 2px 4px;
      border-radius: 2px;
    }
    .warning {
      background: var(--vscode-inputValidation-warningBackground);
      border-left: 4px solid var(--vscode-inputValidation-warningBorder);
      padding: 10px;
      margin: 10px 0;
    }
  </style>
</head>
<body>
  <h1>Task API Integration Configuration</h1>

  <p>Task API integration allows you to fetch and manage tasks from external REST APIs.</p>

  <div class="config-item">
    <div class="config-title">Base URL</div>
    <p>The base URL of your task API service. This must be a public HTTPS URL.</p>
    <p><strong>Example:</strong> <code>https://api.yourcompany.com</code></p>
    <div class="warning">
      <strong>Important:</strong> Do not use localhost URLs like <code>http://localhost:3000</code> -
      these won't work for other users of the extension.
    </div>
  </div>

  <div class="config-item">
    <div class="config-title">User ID</div>
    <p>Your unique identifier used to filter tasks assigned to you.</p>
    <p><strong>Example:</strong> <code>john.doe@company.com</code> or <code>user123</code></p>
    <p><strong>API Endpoint:</strong> <code>GET /api/v1/tasks/user/{user_id}</code></p>
  </div>

  <div class="config-item">
    <div class="config-title">Authentication Token</div>
    <p>Your Bearer token or API key for authenticating with the API.</p>
    <p><strong>Note:</strong> Tokens are stored securely using VS Code's secrets storage.</p>
  </div>

  <div class="config-item">
    <div class="config-title">Update Methods</div>
    <p><strong>REST API Only (Recommended):</strong> Polls the API every 60 seconds for updates.</p>
    <p><strong>REST API + Streaming:</strong> Uses Server-Sent Events for real-time updates with REST fallback.</p>
  </div>

  <h2>API Endpoints Expected</h2>
  <ul>
    <li><code>GET /api/v1/tasks/user/{user_id}</code> - Fetch tasks for user</li>
    <li><code>PUT /api/v1/tasks/{task_id}/status</code> - Update task status</li>
    <li><code>GET /api/v1/health</code> - Health check (optional)</li>
    <li><code>GET /api/v1/tasks/user/{user_id}/stream</code> - SSE stream (optional)</li>
  </ul>

  <h2>Manual Configuration</h2>
  <p>You can also configure these settings manually:</p>
  <ol>
    <li>Open VS Code Settings (Cmd/Ctrl + ,)</li>
    <li>Search for "aidmVscodeExtension.taskApi"</li>
    <li>Configure the required settings</li>
    <li>Reload the window to activate integration</li>
  </ol>

  <h2>Troubleshooting</h2>
  <ul>
    <li><strong>Connection Failed:</strong> Check your base URL and network connection</li>
    <li><strong>Authentication Error:</strong> Verify your user ID and auth token</li>
    <li><strong>No Tasks Received:</strong> Ensure tasks are assigned to your user ID</li>
    <li><strong>HTTPS Required:</strong> Only HTTPS URLs are allowed for security</li>
    <li><strong>Localhost Warning:</strong> Use public APIs, not localhost endpoints</li>
  </ul>
</body>
</html>`;
  }
}