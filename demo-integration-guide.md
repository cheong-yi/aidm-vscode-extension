# Demo Integration Guide for VSCode Extension

## Overview

This guide explains how to integrate the RooCode demo scripts into the packaged VSCode extension for easy demonstration and testing.

## 1. VSCode Command Integration

### Add Demo Commands to package.json

```json
{
  "contributes": {
    "commands": [
      {
        "command": "enterprise-ai-context.runRooCodeDemo",
        "title": "Run RooCode Integration Demo",
        "category": "Enterprise AI Context"
      },
      {
        "command": "enterprise-ai-context.runHybridDemo",
        "title": "Run Hybrid MCP Demo",
        "category": "Enterprise AI Context"
      },
      {
        "command": "enterprise-ai-context.showDemoScenarios",
        "title": "Show Demo Scenarios",
        "category": "Enterprise AI Context"
      }
    ],
    "menus": {
      "commandPalette": [
        {
          "command": "enterprise-ai-context.runRooCodeDemo",
          "when": "true"
        },
        {
          "command": "enterprise-ai-context.runHybridDemo",
          "when": "true"
        },
        {
          "command": "enterprise-ai-context.showDemoScenarios",
          "when": "true"
        }
      ]
    }
  }
}
```

### Register Commands in extension.ts

```typescript
import * as vscode from "vscode";
import { runRooCodeIntegrationDemo } from "./demo/rooCodeIntegrationDemo";
import { runDemoScenarios } from "./demo/demoScenarios";

export function activate(context: vscode.ExtensionContext) {
  // Register demo commands
  const rooCodeDemoCommand = vscode.commands.registerCommand(
    "enterprise-ai-context.runRooCodeDemo",
    async () => {
      const outputChannel = vscode.window.createOutputChannel("RooCode Demo");
      outputChannel.show();

      try {
        outputChannel.appendLine("🚀 Starting RooCode Integration Demo...");
        await runRooCodeIntegrationDemo();
        outputChannel.appendLine("✅ Demo completed successfully!");
        vscode.window.showInformationMessage(
          "RooCode Demo completed successfully!"
        );
      } catch (error) {
        outputChannel.appendLine(`❌ Demo failed: ${error}`);
        vscode.window.showErrorMessage(`Demo failed: ${error}`);
      }
    }
  );

  const hybridDemoCommand = vscode.commands.registerCommand(
    "enterprise-ai-context.runHybridDemo",
    async () => {
      const outputChannel =
        vscode.window.createOutputChannel("Hybrid MCP Demo");
      outputChannel.show();

      try {
        outputChannel.appendLine("🌐 Starting Hybrid MCP Demo...");
        // Run hybrid demo scenarios
        await runDemoScenarios();
        outputChannel.appendLine("✅ Hybrid demo completed!");
        vscode.window.showInformationMessage("Hybrid MCP Demo completed!");
      } catch (error) {
        outputChannel.appendLine(`❌ Demo failed: ${error}`);
        vscode.window.showErrorMessage(`Demo failed: ${error}`);
      }
    }
  );

  const scenariosDemoCommand = vscode.commands.registerCommand(
    "enterprise-ai-context.showDemoScenarios",
    async () => {
      // Show interactive demo scenarios picker
      const scenarios = [
        "Payment Processing Demo",
        "User Authentication Demo",
        "Dashboard Analytics Demo",
        "Concurrent AI Requests Demo",
      ];

      const selected = await vscode.window.showQuickPick(scenarios, {
        placeHolder: "Select a demo scenario to run",
      });

      if (selected) {
        const outputChannel =
          vscode.window.createOutputChannel("Demo Scenarios");
        outputChannel.show();
        outputChannel.appendLine(`🎬 Running: ${selected}`);

        // Run specific scenario based on selection
        // Implementation would call specific demo functions
      }
    }
  );

  context.subscriptions.push(
    rooCodeDemoCommand,
    hybridDemoCommand,
    scenariosDemoCommand
  );
}
```

## 2. Demo Panel Integration

### Create a Demo Webview Panel

```typescript
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
        body { font-family: var(--vscode-font-family); padding: 20px; }
        .demo-section { margin: 20px 0; padding: 15px; border: 1px solid var(--vscode-panel-border); }
        .demo-button { 
            background: var(--vscode-button-background); 
            color: var(--vscode-button-foreground);
            border: none; 
            padding: 10px 20px; 
            margin: 5px; 
            cursor: pointer; 
        }
        .demo-output { 
            background: var(--vscode-editor-background); 
            padding: 10px; 
            margin: 10px 0; 
            font-family: monospace; 
            white-space: pre-wrap;
        }
    </style>
</head>
<body>
    <h1>🚀 Enterprise AI Context Demo</h1>
    
    <div class="demo-section">
        <h2>RooCode Integration</h2>
        <p>Demonstrate hybrid MCP architecture with local and remote context</p>
        <button class="demo-button" onclick="runRooCodeDemo()">Run RooCode Demo</button>
        <div id="roocode-output" class="demo-output"></div>
    </div>

    <div class="demo-section">
        <h2>Hover Provider Demo</h2>
        <p>Test business context hover functionality</p>
        <button class="demo-button" onclick="runHoverDemo()">Run Hover Demo</button>
        <div id="hover-output" class="demo-output"></div>
    </div>

    <div class="demo-section">
        <h2>Performance Testing</h2>
        <p>Test concurrent requests and response times</p>
        <button class="demo-button" onclick="runPerformanceDemo()">Run Performance Demo</button>
        <div id="performance-output" class="demo-output"></div>
    </div>

    <script>
        const vscode = acquireVsCodeApi();

        function runRooCodeDemo() {
            document.getElementById('roocode-output').textContent = 'Starting RooCode demo...';
            vscode.postMessage({ command: 'runRooCodeDemo' });
        }

        function runHoverDemo() {
            document.getElementById('hover-output').textContent = 'Starting hover demo...';
            vscode.postMessage({ command: 'runHoverDemo' });
        }

        function runPerformanceDemo() {
            document.getElementById('performance-output').textContent = 'Starting performance demo...';
            vscode.postMessage({ command: 'runPerformanceDemo' });
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
            }
        });
    </script>
</body>
</html>`;
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
```

## 3. Status Bar Demo Trigger

### Add Demo Status Bar Item

```typescript
export function createDemoStatusBar(context: vscode.ExtensionContext) {
  const statusBarItem = vscode.window.createStatusBarItem(
    vscode.StatusBarAlignment.Right,
    100
  );

  statusBarItem.text = "$(play) AI Demo";
  statusBarItem.tooltip = "Run Enterprise AI Context Demo";
  statusBarItem.command = "enterprise-ai-context.runRooCodeDemo";
  statusBarItem.show();

  context.subscriptions.push(statusBarItem);
  return statusBarItem;
}
```

## 4. Demo File Integration

### Create Demo Workspace

```typescript
export async function createDemoWorkspace() {
  // Create a temporary workspace with demo files
  const workspaceUri = vscode.Uri.file(
    path.join(os.tmpdir(), "enterprise-ai-demo")
  );

  // Create demo files
  const demoFiles = [
    {
      path: "src/services/PaymentProcessor.ts",
      content: `export class PaymentProcessor {
  async processPayment(amount: number, method: string): Promise<PaymentResult> {
    // Hover over this method to see business context
    return { success: true, transactionId: 'demo-123' };
  }
}`,
    },
    {
      path: "src/models/User.ts",
      content: `interface User {
  id: string;
  email: string;
  // Hover over properties to see requirements mapping
  profile: UserProfile;
}`,
    },
  ];

  // Write demo files
  for (const file of demoFiles) {
    const filePath = vscode.Uri.joinPath(workspaceUri, file.path);
    await vscode.workspace.fs.writeFile(filePath, Buffer.from(file.content));
  }

  // Open demo workspace
  await vscode.commands.executeCommand("vscode.openFolder", workspaceUri, true);
}
```

## 5. Interactive Demo Runner

### Create Demo Configuration

```typescript
interface DemoConfiguration {
  name: string;
  description: string;
  steps: DemoStep[];
}

interface DemoStep {
  title: string;
  action: "hover" | "command" | "query" | "wait";
  target?: string;
  duration?: number;
  expectedResult?: string;
}

const DEMO_CONFIGURATIONS: DemoConfiguration[] = [
  {
    name: "RooCode Integration Demo",
    description: "Shows hybrid MCP architecture with local and remote context",
    steps: [
      {
        title: "Start local MCP server",
        action: "command",
        target: "startMCPServer",
      },
      {
        title: "Configure remote connection",
        action: "command",
        target: "configureRemote",
      },
      {
        title: "Run RooCode queries",
        action: "query",
        target: "roocode-scenarios",
      },
      {
        title: "Show results",
        action: "wait",
        duration: 2000,
      },
    ],
  },
];

export class InteractiveDemoRunner {
  async runDemo(configName: string) {
    const config = DEMO_CONFIGURATIONS.find((c) => c.name === configName);
    if (!config) {
      throw new Error(`Demo configuration '${configName}' not found`);
    }

    const progress = await vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: config.name,
        cancellable: true,
      },
      async (progress, token) => {
        for (let i = 0; i < config.steps.length; i++) {
          const step = config.steps[i];

          progress.report({
            increment: 100 / config.steps.length,
            message: step.title,
          });

          if (token.isCancellationRequested) {
            break;
          }

          await this.executeStep(step);
        }
      }
    );
  }

  private async executeStep(step: DemoStep) {
    switch (step.action) {
      case "command":
        await vscode.commands.executeCommand(step.target!);
        break;
      case "hover":
        // Simulate hover action
        break;
      case "query":
        // Execute demo queries
        break;
      case "wait":
        await new Promise((resolve) =>
          setTimeout(resolve, step.duration || 1000)
        );
        break;
    }
  }
}
```

## 6. Usage Instructions for End Users

### In the Extension README

```markdown
## Demo Features

The Enterprise AI Context extension includes several demo modes to showcase its capabilities:

### Running Demos

1. **Command Palette Demos**:

   - Press `Ctrl+Shift+P` (Windows/Linux) or `Cmd+Shift+P` (Mac)
   - Type "Enterprise AI Context" to see available demo commands
   - Select "Run RooCode Integration Demo" for the full hybrid MCP demo

2. **Status Bar Demo**:

   - Click the "$(play) AI Demo" button in the status bar
   - This runs the quick RooCode integration demo

3. **Demo Panel**:
   - Use Command Palette: "Enterprise AI Context: Show Demo Panel"
   - Interactive web panel with multiple demo scenarios

### Demo Scenarios

- **RooCode Integration**: Shows hybrid MCP with local sprint context and remote delivery patterns
- **Hover Provider**: Demonstrates business context on hover
- **Performance Testing**: Tests concurrent AI assistant requests
- **Error Handling**: Shows graceful degradation and fallback behavior

### Demo Output

All demos output to dedicated VSCode Output Channels:

- View → Output → Select "RooCode Demo" or "Hybrid MCP Demo"
- Real-time logging of demo progress and results
```

## 7. Packaging Considerations

### Include Demo Assets in package.json

```json
{
  "files": ["out/**/*", "media/**/*", "demo/**/*", "docs/**/*"],
  "scripts": {
    "demo": "node demo-roocode-integration.js",
    "demo:hybrid": "node out/demo/rooCodeIntegrationDemo.js"
  }
}
```

### Environment Detection

```typescript
export function isDemoMode(): boolean {
  return vscode.workspace
    .getConfiguration("enterprise-ai-context")
    .get("demoMode", false);
}

export function enableDemoFeatures(context: vscode.ExtensionContext) {
  if (isDemoMode()) {
    // Register demo commands and UI elements
    registerDemoCommands(context);
    createDemoStatusBar(context);

    // Show welcome message
    vscode.window
      .showInformationMessage(
        "Enterprise AI Context Demo Mode Enabled! Use Command Palette to run demos.",
        "Run Demo"
      )
      .then((selection) => {
        if (selection === "Run Demo") {
          vscode.commands.executeCommand(
            "enterprise-ai-context.runRooCodeDemo"
          );
        }
      });
  }
}
```

This approach gives you multiple ways to showcase the demos:

- **Command Palette**: Professional, discoverable
- **Status Bar**: Quick access for frequent demos
- **Webview Panel**: Rich interactive experience
- **Automated Scenarios**: Guided demo flows
- **Configuration-driven**: Easy to add new demos

The demos will be fully integrated into the extension and easily accessible for demonstrations, testing, and user onboarding!
