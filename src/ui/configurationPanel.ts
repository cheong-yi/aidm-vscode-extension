import * as vscode from "vscode";

export class ConfigurationPanel {
  public static currentPanel: ConfigurationPanel | undefined;
  private readonly _panel: vscode.WebviewPanel;
  private _disposables: vscode.Disposable[] = [];

  public static createOrShow(extensionUri: vscode.Uri) {
    const column = vscode.window.activeTextEditor
      ? vscode.window.activeTextEditor.viewColumn
      : undefined;

    if (ConfigurationPanel.currentPanel) {
      ConfigurationPanel.currentPanel._panel.reveal(column);
      return;
    }

    const panel = vscode.window.createWebviewPanel(
      "enterpriseAiConfig",
      "Enterprise AI Context Configuration",
      column || vscode.ViewColumn.One,
      {
        enableScripts: true,
        localResourceRoots: [vscode.Uri.joinPath(extensionUri, "media")],
      }
    );

    ConfigurationPanel.currentPanel = new ConfigurationPanel(
      panel,
      extensionUri
    );
  }

  private constructor(panel: vscode.WebviewPanel, extensionUri: vscode.Uri) {
    this._panel = panel;
    this._update();
    this._panel.onDidDispose(() => this.dispose(), null, this._disposables);

    // Handle messages from the webview
    this._panel.webview.onDidReceiveMessage(
      (message) => {
        switch (message.command) {
          case "saveConfig":
            this.handleSaveConfiguration(message.config);
            break;
          case "testConnection":
            this.handleTestConnection(message.url, message.apiKey);
            break;
          case "loadConfig":
            this.handleLoadConfiguration();
            break;
        }
      },
      null,
      this._disposables
    );

    // Load current configuration on startup
    this.handleLoadConfiguration();
  }

  private _update() {
    const webview = this._panel.webview;
    this._panel.webview.html = this._getHtmlForWebview(webview);
  }

  private _getHtmlForWebview(webview: vscode.Webview) {
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Enterprise AI Context Configuration</title>
    <style>
        body { 
            font-family: var(--vscode-font-family); 
            padding: 20px; 
            background: var(--vscode-editor-background);
            color: var(--vscode-editor-foreground);
        }
        .config-section { 
            margin: 20px 0; 
            padding: 15px; 
            border: 1px solid var(--vscode-panel-border); 
            border-radius: 4px;
            background: var(--vscode-panel-background);
        }
        .config-button { 
            background: var(--vscode-button-background); 
            color: var(--vscode-button-foreground);
            border: none; 
            padding: 10px 20px; 
            margin: 5px; 
            cursor: pointer; 
            border-radius: 2px;
        }
        .config-button:hover {
            background: var(--vscode-button-hoverBackground);
        }
        .config-button.secondary {
            background: var(--vscode-button-secondaryBackground);
            color: var(--vscode-button-secondaryForeground);
        }
        .config-input {
            width: 100%;
            padding: 8px;
            margin: 5px 0;
            background: var(--vscode-input-background);
            color: var(--vscode-input-foreground);
            border: 1px solid var(--vscode-input-border);
            border-radius: 2px;
            box-sizing: border-box;
        }
        .config-label {
            display: block;
            margin: 10px 0 5px 0;
            font-weight: bold;
        }
        .config-description {
            font-size: 0.9em;
            color: var(--vscode-descriptionForeground);
            margin-bottom: 10px;
        }
        .status-output { 
            background: var(--vscode-textCodeBlock-background); 
            padding: 10px; 
            margin: 10px 0; 
            font-family: var(--vscode-editor-font-family); 
            white-space: pre-wrap;
            border-radius: 4px;
            border: 1px solid var(--vscode-panel-border);
            min-height: 60px;
        }
        .form-row {
            display: flex;
            gap: 10px;
            align-items: flex-end;
        }
        .form-row .config-input {
            flex: 1;
        }
        h1 { color: var(--vscode-titleBar-activeForeground); }
        h2 { color: var(--vscode-titleBar-activeForeground); }
    </style>
</head>
<body>
    <h1>⚙️ Enterprise AI Context Configuration</h1>
    
    <div class="config-section">
        <h2>🌐 Remote MCP Server Configuration</h2>
        <div class="config-description">
            Configure connection to your remote MCP server for enterprise delivery intelligence.
            This is separate from the local MCP server that provides sprint context.
        </div>
        
        <label class="config-label">Remote MCP Server URL:</label>
        <input type="text" class="config-input" id="remoteUrl" 
               placeholder="https://your-enterprise-mcp-server.com/rpc">
        
        <label class="config-label">API Key (Optional):</label>
        <input type="password" class="config-input" id="apiKey" 
               placeholder="your-api-key-here">
        
        <div class="form-row">
            <button class="config-button" onclick="testConnection()">Test Connection</button>
            <button class="config-button secondary" onclick="saveConfiguration()">Save Configuration</button>
        </div>
        
        <div id="connection-status" class="status-output">Click "Test Connection" to verify your remote MCP server</div>
    </div>

    <div class="config-section">
        <h2>🏠 Local MCP Server Settings</h2>
        <div class="config-description">
            The local MCP server is automatically managed by this extension and provides sprint context to AI assistants.
        </div>
        
        <label class="config-label">Local MCP Server Port:</label>
        <input type="number" class="config-input" id="localPort" value="3000" min="1000" max="65535">
        
        <label class="config-label">Request Timeout (ms):</label>
        <input type="number" class="config-input" id="timeout" value="5000" min="1000" max="30000">
        
        <button class="config-button secondary" onclick="saveConfiguration()">Save Local Settings</button>
    </div>

    <div class="config-section">
        <h2>🎭 Mock Data Configuration</h2>
        <div class="config-description">
            Configure mock data for demonstrations and development.
        </div>
        
        <label class="config-label">Mock Data Size:</label>
        <select class="config-input" id="mockDataSize">
            <option value="small">Small (Basic scenarios)</option>
            <option value="medium" selected>Medium (Typical enterprise)</option>
            <option value="large">Large (Complex enterprise)</option>
        </select>
        
        <label class="config-label">Industry Vertical:</label>
        <select class="config-input" id="industryVertical">
            <option value="financial-services" selected>Financial Services</option>
            <option value="healthcare">Healthcare</option>
            <option value="retail">Retail</option>
            <option value="manufacturing">Manufacturing</option>
            <option value="technology">Technology</option>
            <option value="generic">Generic</option>
        </select>
        
        <button class="config-button secondary" onclick="saveConfiguration()">Save Mock Data Settings</button>
    </div>

    <div class="config-section">
        <h2>📋 Current Configuration</h2>
        <div id="current-config" class="status-output">Loading current configuration...</div>
        <button class="config-button secondary" onclick="loadConfiguration()">Refresh Configuration</button>
    </div>

    <script>
        const vscode = acquireVsCodeApi();

        function testConnection() {
            const url = document.getElementById('remoteUrl').value;
            const apiKey = document.getElementById('apiKey').value;
            
            if (!url) {
                document.getElementById('connection-status').textContent = 'Please enter a remote MCP server URL';
                return;
            }
            
            document.getElementById('connection-status').textContent = 'Testing connection...';
            vscode.postMessage({ 
                command: 'testConnection', 
                url: url, 
                apiKey: apiKey 
            });
        }

        function saveConfiguration() {
            const config = {
                remote: {
                    mcpServerUrl: document.getElementById('remoteUrl').value,
                    apiKey: document.getElementById('apiKey').value,
                    enabled: !!document.getElementById('remoteUrl').value
                },
                local: {
                    port: parseInt(document.getElementById('localPort').value),
                    timeout: parseInt(document.getElementById('timeout').value)
                },
                mock: {
                    dataSize: document.getElementById('mockDataSize').value,
                    industryVertical: document.getElementById('industryVertical').value
                }
            };
            
            vscode.postMessage({ 
                command: 'saveConfig', 
                config: config 
            });
        }

        function loadConfiguration() {
            vscode.postMessage({ command: 'loadConfig' });
        }

        // Listen for messages from the extension
        window.addEventListener('message', event => {
            const message = event.data;
            switch (message.command) {
                case 'connectionResult':
                    document.getElementById('connection-status').textContent = message.result;
                    break;
                case 'configSaved':
                    document.getElementById('connection-status').textContent = 'Configuration saved successfully!';
                    break;
                case 'configLoaded':
                    // Update form fields with loaded configuration
                    if (message.config.remote) {
                        document.getElementById('remoteUrl').value = message.config.remote.mcpServerUrl || '';
                        document.getElementById('apiKey').value = message.config.remote.apiKey || '';
                    }
                    if (message.config.local) {
                        document.getElementById('localPort').value = message.config.local.port || 3000;
                        document.getElementById('timeout').value = message.config.local.timeout || 5000;
                    }
                    if (message.config.mock) {
                        document.getElementById('mockDataSize').value = message.config.mock.dataSize || 'medium';
                        document.getElementById('industryVertical').value = message.config.mock.industryVertical || 'financial-services';
                    }
                    
                    // Update current config display
                    document.getElementById('current-config').textContent = JSON.stringify(message.config, null, 2);
                    break;
            }
        });
    </script>
</body>
</html>`;
  }

  private async handleSaveConfiguration(config: any) {
    try {
      const vsConfig = vscode.workspace.getConfiguration("enterpriseAiContext");

      // Save remote configuration
      if (config.remote) {
        await vsConfig.update(
          "remote.mcpServerUrl",
          config.remote.mcpServerUrl,
          vscode.ConfigurationTarget.Workspace
        );
        await vsConfig.update(
          "remote.enabled",
          config.remote.enabled,
          vscode.ConfigurationTarget.Workspace
        );
        if (config.remote.apiKey) {
          await vsConfig.update(
            "remote.apiKey",
            config.remote.apiKey,
            vscode.ConfigurationTarget.Workspace
          );
        }
      }

      // Save local configuration
      if (config.local) {
        await vsConfig.update(
          "mcpServer.port",
          config.local.port,
          vscode.ConfigurationTarget.Workspace
        );
        await vsConfig.update(
          "mcpServer.timeout",
          config.local.timeout,
          vscode.ConfigurationTarget.Workspace
        );
      }

      // Save mock configuration
      if (config.mock) {
        await vsConfig.update(
          "mock.dataSize",
          config.mock.dataSize,
          vscode.ConfigurationTarget.Workspace
        );
        await vsConfig.update(
          "demo.industryVertical",
          config.mock.industryVertical,
          vscode.ConfigurationTarget.Workspace
        );
      }

      this._panel.webview.postMessage({
        command: "configSaved",
      });

      vscode.window.showInformationMessage("Configuration saved successfully!");
    } catch (error) {
      const errorMsg = `Failed to save configuration: ${
        error instanceof Error ? error.message : "Unknown error"
      }`;
      vscode.window.showErrorMessage(errorMsg);
    }
  }

  private async handleTestConnection(url: string, apiKey?: string) {
    try {
      // Simple HTTP test to the remote MCP server
      const axios = require("axios");

      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };

      if (apiKey) {
        headers["Authorization"] = `Bearer ${apiKey}`;
      }

      const testRequest = {
        jsonrpc: "2.0",
        method: "ping",
        id: 1,
      };

      const response = await axios.post(url, testRequest, {
        headers,
        timeout: 5000,
      });

      const result = `✅ Connection successful!\nResponse: ${JSON.stringify(
        response.data,
        null,
        2
      )}`;

      this._panel.webview.postMessage({
        command: "connectionResult",
        result: result,
      });
    } catch (error) {
      const result = `❌ Connection failed: ${
        error instanceof Error ? error.message : "Unknown error"
      }`;

      this._panel.webview.postMessage({
        command: "connectionResult",
        result: result,
      });
    }
  }

  private async handleLoadConfiguration() {
    try {
      const config = vscode.workspace.getConfiguration();

      const currentConfig = {
        remote: {
          mcpServerUrl: config.get("aidmVscodeExtension.remote.mcpServerUrl", ""),
          apiKey: config.get("aidmVscodeExtension.remote.apiKey", ""),
          enabled: config.get("aidmVscodeExtension.remote.enabled", false),
        },
        local: {
          port: config.get("aidmVscodeExtension.mcpServer.port", 3000),
          timeout: config.get("aidmVscodeExtension.mcpServer.timeout", 5000),
        },
        mock: {
          dataSize: config.get("aidmVscodeExtension.mock.dataSize", "medium"),
          industryVertical: config.get(
            "aidmVscodeExtension.demo.industryVertical",
            "financial-services"
          ),
        },
      };

      this._panel.webview.postMessage({
        command: "configLoaded",
        config: currentConfig,
      });
    } catch (error) {
      vscode.window.showErrorMessage(
        `Failed to load configuration: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }

  public dispose() {
    ConfigurationPanel.currentPanel = undefined;
    this._panel.dispose();
    while (this._disposables.length) {
      const x = this._disposables.pop();
      if (x) {
        x.dispose();
      }
    }
  }
}
