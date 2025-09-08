import * as vscode from "vscode";

export class DemoPanel {
  public static currentPanel: DemoPanel | undefined;
  private readonly _panel: vscode.WebviewPanel;
  private _disposables: vscode.Disposable[] = [];

  public static createOrShow(extensionUri: vscode.Uri) {
    const column = vscode.window.activeTextEditor
      ? vscode.window.activeTextEditor.viewColumn
      : undefined;

    if (DemoPanel.currentPanel) {
      DemoPanel.currentPanel._panel.reveal(column);
      return;
    }

    const panel = vscode.window.createWebviewPanel(
      "enterpriseAiDemo",
      "Enterprise AI Context Demo",
      column || vscode.ViewColumn.One,
      {
        enableScripts: true,
        localResourceRoots: [vscode.Uri.joinPath(extensionUri, "media")],
      }
    );

    DemoPanel.currentPanel = new DemoPanel(panel, extensionUri);
  }

  private constructor(panel: vscode.WebviewPanel, extensionUri: vscode.Uri) {
    this._panel = panel;
    this._update();
    this._panel.onDidDispose(() => this.dispose(), null, this._disposables);

    // Handle messages from the webview
    this._panel.webview.onDidReceiveMessage(
      (message) => {
        switch (message.command) {
          case "runRooCodeDemo":
            vscode.commands.executeCommand(
              "enterprise-ai-context.runRooCodeDemo"
            );
            break;
          case "connectRemote":
            // Handle remote connection with URL and API key from the panel
            this.handleRemoteConnection(message.url, message.apiKey);
            break;
          case "showStatus":
            vscode.commands.executeCommand("enterprise-ai-context.showStatus");
            break;
        }
      },
      null,
      this._disposables
    );
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
    <title>Enterprise AI Context Demo</title>
    <style>
        body { 
            font-family: var(--vscode-font-family); 
            padding: 20px; 
            background: var(--vscode-editor-background);
            color: var(--vscode-editor-foreground);
        }
        .demo-section { 
            margin: 20px 0; 
            padding: 15px; 
            border: 1px solid var(--vscode-panel-border); 
            border-radius: 4px;
            background: var(--vscode-panel-background);
        }
        .demo-button { 
            background: var(--vscode-button-background); 
            color: var(--vscode-button-foreground);
            border: none; 
            padding: 10px 20px; 
            margin: 5px; 
            cursor: pointer; 
            border-radius: 2px;
        }
        .demo-button:hover {
            background: var(--vscode-button-hoverBackground);
        }
        .demo-output { 
            background: var(--vscode-textCodeBlock-background); 
            padding: 10px; 
            margin: 10px 0; 
            font-family: var(--vscode-editor-font-family); 
            white-space: pre-wrap;
            border-radius: 4px;
            border: 1px solid var(--vscode-panel-border);
        }
        h1 { color: var(--vscode-titleBar-activeForeground); }
        h2 { color: var(--vscode-titleBar-activeForeground); }
        .status-indicator {
            display: inline-block;
            width: 10px;
            height: 10px;
            border-radius: 50%;
            margin-right: 8px;
        }
        .status-connected { background-color: #4CAF50; }
        .status-disconnected { background-color: #f44336; }
        .config-section {
            background: var(--vscode-input-background);
            padding: 10px;
            border-radius: 4px;
            margin: 10px 0;
        }
        .config-input {
            width: 100%;
            padding: 8px;
            margin: 5px 0;
            background: var(--vscode-input-background);
            color: var(--vscode-input-foreground);
            border: 1px solid var(--vscode-input-border);
            border-radius: 2px;
        }
    </style>
</head>
<body>
    <h1>🚀 Enterprise AI Context Demo</h1>
    
    <div class="demo-section">
        <h2><span class="status-indicator status-disconnected"></span>Local MCP Server Status</h2>
        <p>Check the status of your local MCP server (spawned by this extension)</p>
        <div style="margin: 10px 0; padding: 10px; background: var(--vscode-textCodeBlock-background); border-radius: 4px;">
            <strong>Architecture:</strong> This extension runs a local MCP server on port 3000 that RooCode and other AI assistants can connect to for sprint context and business requirements.
        </div>
        <button class="demo-button" onclick="showStatus()">Check Local MCP Status</button>
        <div id="status-output" class="demo-output">Click "Check Local MCP Status" to see server information</div>
    </div>

    <div class="demo-section">
        <h2>🌐 Remote MCP Server Configuration (Future Enterprise)</h2>
        <p>Configure connection to remote enterprise delivery intelligence server</p>
        <div style="margin: 10px 0; padding: 10px; background: var(--vscode-textCodeBlock-background); border-radius: 4px;">
            <strong>Note:</strong> This is for future enterprise deployment. The remote MCP server provides delivery patterns and institutional knowledge, while the local MCP server (this extension) provides sprint context.
        </div>
        <div class="config-section">
            <label>Remote Enterprise MCP Server URL:</label>
            <input type="text" class="config-input" placeholder="https://your-enterprise-delivery-server.com" id="remoteUrl">
            <label>API Key (optional):</label>
            <input type="password" class="config-input" placeholder="your-api-key" id="apiKey">
        </div>
        <button class="demo-button" onclick="connectRemote()">Configure Remote Enterprise Server</button>
        <div id="remote-output" class="demo-output">Configure connection to enterprise delivery intelligence</div>
    </div>

    <div class="demo-section">
        <h2>🎬 RooCode Integration Demo</h2>
        <p>Demonstrate how RooCode connects to this extension's local MCP server for sprint context</p>
        <div style="margin: 10px 0; padding: 10px; background: var(--vscode-textCodeBlock-background); border-radius: 4px;">
            <strong>Demo Flow:</strong>
            <ol style="margin: 5px 0; padding-left: 20px;">
                <li>Extension starts local MCP server (port 3000)</li>
                <li>RooCode connects to local MCP server</li>
                <li>RooCode queries for sprint context and business requirements</li>
                <li>Extension provides rich project context for AI suggestions</li>
            </ol>
        </div>
        <button class="demo-button" onclick="runRooCodeDemo()">Run RooCode Integration Demo</button>
        <div id="roocode-output" class="demo-output">Click "Run RooCode Integration Demo" to see how AI assistants connect to the local MCP server</div>
    </div>

    <div class="demo-section">
        <h2>📄 Hover Provider Demo</h2>
        <p>Test business context hover functionality on sample files</p>
        <div style="margin: 10px 0;">
            <strong>Sample Files to Test:</strong>
            <ul>
                <li><code>src/demo/sampleFiles/PaymentProcessor.ts</code> - Payment processing with PCI compliance</li>
                <li><code>src/demo/sampleFiles/UserService.ts</code> - User management functionality</li>
                <li><code>src/demo/sampleFiles/DashboardAnalytics.ts</code> - Analytics and reporting</li>
                <li><code>src/demo/sampleFiles/FraudDetection.ts</code> - Fraud detection algorithms</li>
            </ul>
        </div>
        <p><strong>Instructions:</strong> Open any of the sample files above and hover over method names, class names, or business requirement comments to see contextual information.</p>
    </div>

    <div class="demo-section">
        <h2>⚙️ Configuration</h2>
        <p>Current extension settings and configuration options</p>
        <div class="config-section">
            <p><strong>To configure the extension:</strong></p>
            <ol>
                <li>Open VS Code Settings (Ctrl+,)</li>
                <li>Search for "Enterprise AI Context"</li>
                <li>Configure remote server URL, mock data settings, and demo options</li>
            </ol>
        </div>
    </div>

    <script>
        const vscode = acquireVsCodeApi();

        function runRooCodeDemo() {
            document.getElementById('roocode-output').textContent = 'Starting RooCode demo...';
            vscode.postMessage({ command: 'runRooCodeDemo' });
        }

        function connectRemote() {
            const remoteUrl = document.getElementById('remoteUrl').value;
            const apiKey = document.getElementById('apiKey').value;
            
            if (!remoteUrl) {
                document.getElementById('remote-output').textContent = 'Please enter a remote MCP server URL';
                return;
            }
            
            document.getElementById('remote-output').textContent = 'Connecting to ' + remoteUrl + '...';
            vscode.postMessage({ 
                command: 'connectRemote', 
                url: remoteUrl, 
                apiKey: apiKey 
            });
        }

        function showStatus() {
            document.getElementById('status-output').textContent = 'Checking connection status...';
            vscode.postMessage({ command: 'showStatus' });
        }

        // Listen for messages from the extension
        window.addEventListener('message', event => {
            const message = event.data;
            switch (message.command) {
                case 'demoOutput':
                    const outputElement = document.getElementById(message.target + '-output');
                    if (outputElement) {
                        outputElement.textContent += message.text + '\\n';
                    }
                    break;
                case 'updateStatus':
                    const statusIndicator = document.querySelector('.status-indicator');
                    if (message.connected) {
                        statusIndicator.className = 'status-indicator status-connected';
                    } else {
                        statusIndicator.className = 'status-indicator status-disconnected';
                    }
                    break;
            }
        });
    </script>
</body>
</html>`;
  }

  private async handleRemoteConnection(url: string, apiKey?: string) {
    try {
      const config = vscode.workspace.getConfiguration("enterpriseAiContext");

      // Update configuration
      await config.update(
        "remote.mcpServerUrl",
        url,
        vscode.ConfigurationTarget.Workspace
      );
      await config.update(
        "remote.enabled",
        true,
        vscode.ConfigurationTarget.Workspace
      );
      if (apiKey) {
        await config.update(
          "remote.apiKey",
          apiKey,
          vscode.ConfigurationTarget.Workspace
        );
      }

      // Send success message back to webview
      this._panel.webview.postMessage({
        command: "demoOutput",
        target: "remote",
        text: `✅ Connected to remote MCP server: ${url}`,
      });

      vscode.window.showInformationMessage(
        `Connected to remote MCP server: ${url}`
      );
    } catch (error) {
      const errorMsg = `❌ Failed to connect: ${
        error instanceof Error ? error.message : "Unknown error"
      }`;

      this._panel.webview.postMessage({
        command: "demoOutput",
        target: "remote",
        text: errorMsg,
      });

      vscode.window.showErrorMessage(errorMsg);
    }
  }

  public dispose() {
    DemoPanel.currentPanel = undefined;
    this._panel.dispose();
    while (this._disposables.length) {
      const x = this._disposables.pop();
      if (x) {
        x.dispose();
      }
    }
  }
}
