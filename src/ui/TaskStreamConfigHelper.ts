/**
 * TaskStreamConfigHelper - Simple configuration UI for task streaming
 * Follows VS Code UX patterns for configuration dialogs
 */

import * as vscode from 'vscode';

export interface StreamConfigResult {
  configured: boolean;
  requiresReload: boolean;
}

export class TaskStreamConfigHelper {
  /**
   * Show configuration dialog with step-by-step setup
   */
  static async showConfigurationDialog(): Promise<StreamConfigResult> {
    const result: StreamConfigResult = {
      configured: false,
      requiresReload: false,
    };

    try {
      // Step 1: Check if user wants to configure streaming
      const enableChoice = await vscode.window.showInformationMessage(
        'Would you like to enable real-time task streaming?',
        {
          modal: true,
          detail: 'Task streaming allows you to receive live updates when tasks are assigned or updated. You can always enable this later in settings.',
        },
        'Enable Streaming',
        'Keep Disabled'
      );

      if (enableChoice !== 'Enable Streaming') {
        return result;
      }

      // Step 2: Get server URL
      const serverUrl = await vscode.window.showInputBox({
        prompt: 'Enter your task stream server URL',
        placeholder: 'https://api.yourcompany.com',
        validateInput: (value) => {
          if (!value?.trim()) {
            return 'Server URL is required';
          }
          try {
            const url = new URL(value);
            if (!['http:', 'https:'].includes(url.protocol)) {
              return 'URL must use HTTP or HTTPS protocol';
            }
          } catch {
            return 'Please enter a valid URL';
          }
          return null;
        },
      });

      if (!serverUrl) {
        return result;
      }

      // Step 3: Get user ID
      const userId = await vscode.window.showInputBox({
        prompt: 'Enter your user ID for task assignments',
        placeholder: 'your.email@company.com or user123',
        validateInput: (value) => {
          if (!value?.trim()) {
            return 'User ID is required';
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
        prompt: 'Enter your authentication token',
        placeholder: 'Enter your API token or access key',
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

      // Step 5: Save configuration
      await this.saveConfiguration({
        enabled: true,
        serverUrl: serverUrl.trim(),
        userId: userId.trim(),
        authToken: authToken.trim(),
      });

      // Step 6: Offer to test connection
      const testChoice = await vscode.window.showInformationMessage(
        'Configuration saved! Would you like to test the connection?',
        {
          modal: true,
          detail: 'This will verify that your settings are correct and the server is reachable.',
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
        'Task streaming configured successfully!',
        {
          detail: 'Reload the window to activate streaming, or it will be active on next startup.',
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
    const config = vscode.workspace.getConfiguration('aidmVscodeExtension.taskStream');
    const enabled = config.get<boolean>('enabled', false);

    if (!enabled) {
      const choice = await vscode.window.showInformationMessage(
        'Task streaming is disabled',
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
    const serverUrl = config.get<string>('serverUrl', '');
    const userId = config.get<string>('userId', '');
    const authToken = config.get<string>('authToken', '');

    const missing: string[] = [];
    if (!serverUrl.trim()) missing.push('Server URL');
    if (!userId.trim()) missing.push('User ID');
    if (!authToken.trim()) missing.push('Auth Token');

    if (missing.length > 0) {
      const choice = await vscode.window.showWarningMessage(
        `Task streaming is enabled but missing: ${missing.join(', ')}`,
        'Fix Configuration',
        'Disable Streaming'
      );

      if (choice === 'Fix Configuration') {
        await this.showConfigurationDialog();
      } else if (choice === 'Disable Streaming') {
        await config.update('enabled', false, vscode.ConfigurationTarget.Global);
        vscode.window.showInformationMessage('Task streaming disabled');
      }
      return;
    }

    vscode.window.showInformationMessage('Task streaming is properly configured and enabled');
  }

  /**
   * Show configuration help and documentation
   */
  static async showConfigurationHelp(): Promise<void> {
    const helpPanel = vscode.window.createWebviewPanel(
      'taskStreamHelp',
      'Task Streaming Setup',
      vscode.ViewColumn.One,
      { enableScripts: false }
    );

    helpPanel.webview.html = this.getHelpHTML();
  }

  private static async saveConfiguration(config: {
    enabled: boolean;
    serverUrl: string;
    userId: string;
    authToken: string;
  }): Promise<void> {
    const vsConfig = vscode.workspace.getConfiguration('aidmVscodeExtension.taskStream');

    await Promise.all([
      vsConfig.update('enabled', config.enabled, vscode.ConfigurationTarget.Global),
      vsConfig.update('serverUrl', config.serverUrl, vscode.ConfigurationTarget.Global),
      vsConfig.update('userId', config.userId, vscode.ConfigurationTarget.Global),
      vsConfig.update('authToken', config.authToken, vscode.ConfigurationTarget.Global),
    ]);
  }

  private static async testConnection(): Promise<void> {
    const statusMessage = vscode.window.setStatusBarMessage('$(sync~spin) Testing connection...');

    try {
      // Import here to avoid circular dependencies
      const { TaskStreamService } = await import('../services/TaskStreamService');
      const config = vscode.workspace.getConfiguration('aidmVscodeExtension.taskStream');

      const service = new TaskStreamService({
        serverUrl: config.get<string>('serverUrl', ''),
        userId: config.get<string>('userId', ''),
        authToken: config.get<string>('authToken', ''),
      });

      const result = await service.connect();
      await service.disconnect();

      if (result.success) {
        vscode.window.showInformationMessage('✅ Connection test successful!');
      } else {
        vscode.window.showErrorMessage(`❌ Connection test failed: ${result.error}`);
      }
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
  <title>Task Streaming Setup</title>
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
  </style>
</head>
<body>
  <h1>Task Streaming Configuration</h1>

  <p>Task streaming allows you to receive real-time updates when tasks are assigned, updated, or completed.</p>

  <div class="config-item">
    <div class="config-title">Server URL</div>
    <p>The base URL of your task streaming server. This should be provided by your system administrator.</p>
    <p><strong>Example:</strong> <code>https://api.yourcompany.com</code></p>
  </div>

  <div class="config-item">
    <div class="config-title">User ID</div>
    <p>Your unique identifier in the task system. This is used to filter tasks assigned to you.</p>
    <p><strong>Example:</strong> <code>john.doe@company.com</code> or <code>user123</code></p>
  </div>

  <div class="config-item">
    <div class="config-title">Authentication Token</div>
    <p>Your API token for authenticating with the task streaming server. Keep this secure!</p>
    <p><strong>Note:</strong> Tokens are stored securely using VS Code's secrets storage.</p>
  </div>

  <h2>Manual Configuration</h2>
  <p>You can also configure these settings manually:</p>
  <ol>
    <li>Open VS Code Settings (Cmd/Ctrl + ,)</li>
    <li>Search for "aidmVscodeExtension.taskStream"</li>
    <li>Configure the required settings</li>
    <li>Reload the window to activate streaming</li>
  </ol>

  <h2>Troubleshooting</h2>
  <ul>
    <li><strong>Connection Failed:</strong> Check your server URL and network connection</li>
    <li><strong>Authentication Error:</strong> Verify your user ID and auth token</li>
    <li><strong>No Tasks Received:</strong> Ensure tasks are assigned to your user ID</li>
  </ul>
</body>
</html>`;
  }
}