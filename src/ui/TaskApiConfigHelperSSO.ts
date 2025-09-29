/**
 * TaskApiConfigHelperSSO - Configuration UI for SSO-integrated task API
 * Uses existing AuthService instead of manual token configuration
 */

import * as vscode from 'vscode';
import { AuthService } from '../../auth/authService';

export interface ApiConfigResult {
  configured: boolean;
  requiresReload: boolean;
}

export class TaskApiConfigHelperSSO {
  /**
   * Show configuration dialog with SSO integration
   */
  static async showConfigurationDialog(authService: AuthService): Promise<ApiConfigResult> {
    const result: ApiConfigResult = {
      configured: false,
      requiresReload: false,
    };

    try {
      // Check if user is already authenticated
      const authState = authService.authState;

      if (!authState.isLoggedIn) {
        const loginChoice = await vscode.window.showInformationMessage(
          'Task API integration requires authentication',
          {
            modal: true,
            detail: 'You need to log in to your organization before configuring task API integration.',
          },
          'Log In First',
          'Cancel'
        );

        if (loginChoice === 'Log In First') {
          // Trigger SSO login
          const loginResult = await authService.performSSOLogin();
          if (!loginResult.success) {
            vscode.window.showErrorMessage(`Login failed: ${loginResult.message}`);
            return result;
          }
        } else {
          return result;
        }
      }

      // Step 1: Confirm API integration setup
      const enableChoice = await vscode.window.showInformationMessage(
        `Enable task API integration for ${authState.email}?`,
        {
          modal: true,
          detail: `This will connect to your organization's task API using your authenticated session.\n\nAgency: ${authState.agency_name}\nProject: ${authState.project_id}`,
        },
        'Enable Integration',
        'Cancel'
      );

      if (enableChoice !== 'Enable Integration') {
        return result;
      }

      // Step 2: Get base URL
      const baseUrl = await vscode.window.showInputBox({
        prompt: 'Enter your organization\'s task API base URL',
        placeholder: 'https://api.yourorg.com',
        value: await this.getSuggestedBaseUrl(authState.agency_name),
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
              return 'Warning: localhost URLs won\'t work for distributed extensions. Use your organization\'s public API URL.';
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

      // Step 3: Optional streaming configuration
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

      // Step 4: Save configuration (no token needed - uses SSO)
      await this.saveConfiguration({
        enabled: true,
        baseUrl: baseUrl.trim(),
        enableStreaming: enableStreaming.label === 'REST API + Streaming',
        pollInterval: 60000, // Default 1 minute
      });

      // Step 5: Offer to test connection
      const testChoice = await vscode.window.showInformationMessage(
        'Configuration saved! Would you like to test the API connection?',
        {
          modal: true,
          detail: 'This will verify that the API is reachable with your current authentication.',
        },
        'Test Connection',
        'Test Later'
      );

      result.configured = true;

      if (testChoice === 'Test Connection') {
        await this.testConnection(authService);
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
  static async checkConfiguration(authService: AuthService): Promise<void> {
    const config = vscode.workspace.getConfiguration('aidmVscodeExtension.taskApi');
    const enabled = config.get<boolean>('enabled', false);
    const authState = authService.authState;

    if (!enabled) {
      const choice = await vscode.window.showInformationMessage(
        'Task API integration is disabled',
        'Configure Now',
        'Learn More'
      );

      if (choice === 'Configure Now') {
        await this.showConfigurationDialog(authService);
      } else if (choice === 'Learn More') {
        await this.showConfigurationHelp();
      }
      return;
    }

    if (!authState.isLoggedIn) {
      const choice = await vscode.window.showWarningMessage(
        'Task API integration is enabled but you are not logged in',
        'Log In',
        'Disable Integration'
      );

      if (choice === 'Log In') {
        await authService.performSSOLogin();
      } else if (choice === 'Disable Integration') {
        await config.update('enabled', false, vscode.ConfigurationTarget.Global);
        vscode.window.showInformationMessage('Task API integration disabled');
      }
      return;
    }

    // Check if base URL is configured
    const baseUrl = config.get<string>('baseUrl', '');
    if (!baseUrl.trim()) {
      const choice = await vscode.window.showWarningMessage(
        'Task API integration is enabled but missing base URL configuration',
        'Fix Configuration',
        'Disable Integration'
      );

      if (choice === 'Fix Configuration') {
        await this.showConfigurationDialog(authService);
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
            this.showConfigurationDialog(authService);
          }
        });
        return;
      }
    } catch (error) {
      vscode.window.showErrorMessage(`Invalid base URL: ${baseUrl}`);
      return;
    }

    vscode.window.showInformationMessage(
      `✅ Task API integration is configured and authenticated as ${authState.email} (${authState.agency_name})`
    );
  }

  /**
   * Show configuration help and documentation
   */
  static async showConfigurationHelp(): Promise<void> {
    const helpPanel = vscode.window.createWebviewPanel(
      'taskApiHelpSSO',
      'Task API Integration with SSO',
      vscode.ViewColumn.One,
      { enableScripts: false }
    );

    helpPanel.webview.html = this.getHelpHTML();
  }

  /**
   * Get suggested base URL based on agency name
   */
  private static async getSuggestedBaseUrl(agencyName: string): Promise<string> {
    // This could be enhanced to suggest URLs based on known agency configurations
    const normalized = agencyName.toLowerCase().replace(/\s+/g, '-');
    return `https://api.${normalized}.com`;
  }

  private static async saveConfiguration(config: {
    enabled: boolean;
    baseUrl: string;
    enableStreaming: boolean;
    pollInterval: number;
  }): Promise<void> {
    const vsConfig = vscode.workspace.getConfiguration('aidmVscodeExtension.taskApi');

    await Promise.all([
      vsConfig.update('enabled', config.enabled, vscode.ConfigurationTarget.Global),
      vsConfig.update('baseUrl', config.baseUrl, vscode.ConfigurationTarget.Global),
      vsConfig.update('enableStreaming', config.enableStreaming, vscode.ConfigurationTarget.Global),
      vsConfig.update('pollInterval', config.pollInterval, vscode.ConfigurationTarget.Global),
    ]);
  }

  private static async testConnection(authService: AuthService): Promise<void> {
    const statusMessage = vscode.window.setStatusBarMessage('$(sync~spin) Testing authenticated API connection...');

    try {
      // REMOVED: TaskApiServiceAuth deleted - test functionality disabled
      // const { TaskApiServiceAuth } = await import('../services/TaskApiServiceAuth');
      // const config = vscode.workspace.getConfiguration('aidmVscodeExtension.taskApi');

      // const service = new TaskApiServiceAuth({
      //   baseUrl: config.get<string>('baseUrl', ''),
      //   enableStreaming: config.get<boolean>('enableStreaming', false),
      // }, authService);

      throw new Error('TaskApiServiceAuth test functionality has been removed');

      const result = await service.testConnection();

      if (result.success) {
        vscode.window.showInformationMessage(
          `✅ API connection successful!\nUser: ${result.data.user}\nLatency: ${result.data.latency}ms`
        );
      } else {
        vscode.window.showErrorMessage(`❌ API connection failed: ${result.error}`);
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
  <title>Task API Integration with SSO</title>
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
    .success {
      background: var(--vscode-inputValidation-infoBackground);
      border-left: 4px solid var(--vscode-inputValidation-infoBorder);
      padding: 10px;
      margin: 10px 0;
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
  <h1>Task API Integration with SSO</h1>

  <div class="success">
    <strong>✅ Enterprise Ready:</strong> This integration uses your organization's SSO authentication.
    No manual token management required!
  </div>

  <p>Task API integration automatically uses your authenticated session to fetch and manage tasks from your organization's API.</p>

  <div class="config-item">
    <div class="config-title">🔐 Authentication</div>
    <p><strong>Automatic:</strong> Uses your existing SSO login session</p>
    <p><strong>Security:</strong> Tokens are managed securely by the extension</p>
    <p><strong>Context-Aware:</strong> API calls include your agency and project context</p>
  </div>

  <div class="config-item">
    <div class="config-title">🌐 Base URL Configuration</div>
    <p>The base URL of your organization's task API service.</p>
    <p><strong>Example:</strong> <code>https://api.yourorg.com</code></p>
    <div class="warning">
      <strong>Important:</strong> Use your organization's public API URL, not localhost.
    </div>
  </div>

  <div class="config-item">
    <div class="config-title">📊 API Endpoints Used</div>
    <ul>
      <li><code>GET /api/v1/tasks/user/{user_email}</code> - Fetch your tasks</li>
      <li><code>PUT /api/v1/tasks/{task_id}/status</code> - Update task status</li>
      <li><code>GET /api/v1/health</code> - Health check</li>
      <li><code>GET /api/v1/tasks/user/{user_email}/stream</code> - SSE stream (optional)</li>
    </ul>
    <p><strong>Headers Included:</strong></p>
    <ul>
      <li><code>Authorization: Bearer {your_token}</code></li>
      <li><code>X-Agency-ID: {your_agency_id}</code></li>
      <li><code>X-Project-ID: {your_project_id}</code></li>
      <li><code>X-User-Email: {your_email}</code></li>
    </ul>
  </div>

  <div class="config-item">
    <div class="config-title">🔄 Update Methods</div>
    <p><strong>REST API Only (Recommended):</strong> Polls the API every 60 seconds for updates.</p>
    <p><strong>REST API + Streaming:</strong> Uses Server-Sent Events for real-time updates with REST fallback.</p>
  </div>

  <div class="config-item">
    <div class="config-title">⚙️ Manual Configuration</div>
    <p>You can also configure these settings manually:</p>
    <ol>
      <li>Open VS Code Settings (Cmd/Ctrl + ,)</li>
      <li>Search for "aidmVscodeExtension.taskApi"</li>
      <li>Configure the base URL and update preferences</li>
      <li>Ensure you're logged in via the extension</li>
    </ol>
  </div>

  <div class="config-item">
    <div class="config-title">🔧 Troubleshooting</div>
    <ul>
      <li><strong>Not Authenticated:</strong> Use the extension's login command</li>
      <li><strong>Connection Failed:</strong> Check your base URL and network connection</li>
      <li><strong>No Tasks:</strong> Ensure tasks are assigned to your email address</li>
      <li><strong>Token Expired:</strong> The extension will prompt you to log in again</li>
      <li><strong>Agency Context:</strong> Verify you're in the correct agency/project</li>
    </ul>
  </div>

  <h2>Commands Available</h2>
  <ul>
    <li><code>AiDM: Configure Task API</code> - Set up API integration</li>
    <li><code>AiDM: Connect to Task API</code> - Start API polling/streaming</li>
    <li><code>AiDM: Test API Connection</code> - Verify connectivity</li>
    <li><code>AiDM: Show Task API Status</code> - View current status</li>
  </ul>
</body>
</html>`;
  }
}