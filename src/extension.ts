import * as vscode from "vscode";
import { MCPClient } from "./client/mcpClient";
import { BusinessContextHover } from "./providers/hoverProvider";
import { StatusBarManagerImpl } from "./ui/statusBar";

let mcpClient: MCPClient;
let statusBarManager: StatusBarManagerImpl;

export function activate(context: vscode.ExtensionContext) {
  console.log("Enterprise AI Context extension is now active!");

  // Get configuration
  const config = vscode.workspace.getConfiguration("enterpriseAiContext");
  const port = config.get<number>("mcpServer.port", 3000);
  const timeout = config.get<number>("mcpServer.timeout", 5000);

  // Initialize MCP client
  mcpClient = new MCPClient(port, timeout);

  // Initialize status bar manager
  statusBarManager = new StatusBarManagerImpl(mcpClient);

  // Register hover provider for TypeScript files
  const hoverProvider = new BusinessContextHover(mcpClient);
  const hoverDisposable = vscode.languages.registerHoverProvider(
    { scheme: "file", language: "typescript" },
    hoverProvider
  );

  // Register status command
  const statusCommand = vscode.commands.registerCommand(
    "enterprise-ai-context.showStatus",
    () => {
      statusBarManager.handleStatusClick();
    }
  );

  // Register configuration change handler
  const configChangeDisposable = vscode.workspace.onDidChangeConfiguration(
    (event) => {
      if (event.affectsConfiguration("enterpriseAiContext")) {
        const newConfig = vscode.workspace.getConfiguration(
          "enterpriseAiContext"
        );
        const newPort = newConfig.get<number>("mcpServer.port", 3000);
        const newTimeout = newConfig.get<number>("mcpServer.timeout", 5000);

        mcpClient.updateConfig(newPort, newTimeout);
        console.log("MCP client configuration updated");
      }
    }
  );

  // Add disposables to context
  context.subscriptions.push(
    hoverDisposable,
    statusCommand,
    configChangeDisposable,
    statusBarManager
  );

  console.log("Enterprise AI Context extension activated successfully");
}

export function deactivate() {
  console.log("Enterprise AI Context extension is being deactivated");

  if (statusBarManager) {
    statusBarManager.dispose();
  }
}
