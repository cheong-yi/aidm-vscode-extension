import * as vscode from "vscode";
import { MCPClient } from "./client/mcpClient";
import { BusinessContextHover } from "./providers/hoverProvider";
import { StatusBarManagerImpl } from "./ui/statusBar";
import { ProcessManager, ProcessManagerConfig } from "./server/ProcessManager";
import { ConnectionStatus } from "./types/extension";
import { DemoPanel } from "./ui/demoPanel";

let mcpClient: MCPClient;
let statusBarManager: StatusBarManagerImpl;
let processManager: ProcessManager;

export async function activate(
  context: vscode.ExtensionContext
): Promise<void> {
  console.log("Enterprise AI Context extension is now active!");

  try {
    // Get configuration
    const config = vscode.workspace.getConfiguration("enterpriseAiContext");

    // Build process manager configuration
    const processConfig: ProcessManagerConfig = {
      port: config.get<number>("mcpServer.port", 3000),
      timeout: config.get<number>("mcpServer.timeout", 5000),
      retryAttempts: config.get<number>("mcpServer.retryAttempts", 3),
      maxConcurrentRequests: config.get<number>(
        "performance.maxConcurrentRequests",
        10
      ),
      mock: {
        enabled: config.get<boolean>("mock.enabled", true),
        dataSize: config.get<"small" | "medium" | "large">(
          "mock.dataSize",
          "medium"
        ),
        enterprisePatterns: config.get<boolean>(
          "mock.enterprisePatterns",
          true
        ),
      },
    };

    // Initialize process manager
    processManager = new ProcessManager(processConfig);

    // Initialize MCP client
    mcpClient = new MCPClient(processConfig.port, processConfig.timeout);

    // Initialize status bar manager
    statusBarManager = new StatusBarManagerImpl(mcpClient);

    // Connect process manager status to status bar
    processManager.onStatusChange((status: ConnectionStatus) => {
      statusBarManager.updateConnectionStatus(status);
    });

    // Start the MCP server process
    await startMCPServer();

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

    // Register restart command
    const restartCommand = vscode.commands.registerCommand(
      "enterprise-ai-context.restartServer",
      async () => {
        try {
          await processManager.restart();
          vscode.window.showInformationMessage(
            "MCP server restarted successfully"
          );
        } catch (error) {
          vscode.window.showErrorMessage(
            `Failed to restart MCP server: ${
              error instanceof Error ? error.message : "Unknown error"
            }`
          );
        }
      }
    );

    // Register RooCode demo command
    const rooCodeDemoCommand = vscode.commands.registerCommand(
      "enterprise-ai-context.runRooCodeDemo",
      async () => {
        const outputChannel = vscode.window.createOutputChannel("RooCode Demo");
        outputChannel.show();

        try {
          outputChannel.appendLine("🚀 Starting RooCode Integration Demo...");

          // Import and run the demo
          const { runRooCodeIntegrationDemo } = await import(
            "./demo/rooCodeIntegrationDemo"
          );
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

    // Register remote MCP connection command
    const connectRemoteCommand = vscode.commands.registerCommand(
      "enterprise-ai-context.connectRemoteMCP",
      async () => {
        const remoteUrl = await vscode.window.showInputBox({
          prompt: "Enter remote MCP server URL",
          placeholder: "https://your-roocode-server.com",
          value: config.get<string>("remote.mcpServerUrl", ""),
        });

        if (remoteUrl) {
          const apiKey = await vscode.window.showInputBox({
            prompt: "Enter API key (optional)",
            placeholder: "your-api-key",
            password: true,
            value: config.get<string>("remote.apiKey", ""),
          });

          // Update configuration
          await config.update(
            "remote.mcpServerUrl",
            remoteUrl,
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

          vscode.window.showInformationMessage(
            `Connected to remote MCP server: ${remoteUrl}`
          );
        }
      }
    );

    // Register demo panel command
    const demoPanelCommand = vscode.commands.registerCommand(
      "enterprise-ai-context.showDemoPanel",
      () => {
        DemoPanel.createOrShow(context.extensionUri);
      }
    );

    // Register configuration change handler
    const configChangeDisposable = vscode.workspace.onDidChangeConfiguration(
      async (event) => {
        if (event.affectsConfiguration("enterpriseAiContext")) {
          const newConfig = vscode.workspace.getConfiguration(
            "enterpriseAiContext"
          );

          // Update process manager configuration
          const newProcessConfig: Partial<ProcessManagerConfig> = {
            port: newConfig.get<number>("mcpServer.port", 3000),
            timeout: newConfig.get<number>("mcpServer.timeout", 5000),
            retryAttempts: newConfig.get<number>("mcpServer.retryAttempts", 3),
            maxConcurrentRequests: newConfig.get<number>(
              "performance.maxConcurrentRequests",
              10
            ),
            mock: {
              enabled: newConfig.get<boolean>("mock.enabled", true),
              dataSize: newConfig.get<"small" | "medium" | "large">(
                "mock.dataSize",
                "medium"
              ),
              enterprisePatterns: newConfig.get<boolean>(
                "mock.enterprisePatterns",
                true
              ),
            },
          };

          try {
            await processManager.updateConfig(newProcessConfig);

            // Update MCP client configuration
            mcpClient.updateConfig(
              newProcessConfig.port!,
              newProcessConfig.timeout!
            );

            console.log("Configuration updated successfully");
          } catch (error) {
            console.error("Failed to update configuration:", error);
            vscode.window.showErrorMessage(
              `Failed to update configuration: ${
                error instanceof Error ? error.message : "Unknown error"
              }`
            );
          }
        }
      }
    );

    // Add disposables to context
    context.subscriptions.push(
      hoverDisposable,
      statusCommand,
      restartCommand,
      rooCodeDemoCommand,
      connectRemoteCommand,
      demoPanelCommand,
      configChangeDisposable,
      statusBarManager,
      {
        dispose: () => {
          // Cleanup process manager
          if (processManager) {
            processManager.shutdown().catch((error) => {
              console.error("Error during process manager shutdown:", error);
            });
          }
        },
      }
    );

    console.log("Enterprise AI Context extension activated successfully");
  } catch (error) {
    console.error("Failed to activate Enterprise AI Context extension:", error);
    vscode.window.showErrorMessage(
      `Failed to activate Enterprise AI Context extension: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
    throw error;
  }
}

async function startMCPServer(): Promise<void> {
  try {
    await processManager.start();
    console.log("MCP server started successfully");
  } catch (error) {
    console.error("Failed to start MCP server:", error);
    vscode.window.showErrorMessage(
      `Failed to start MCP server: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
  }
}

export async function deactivate() {
  console.log("Enterprise AI Context extension is being deactivated");

  try {
    // Graceful shutdown of process manager
    if (processManager) {
      await processManager.shutdown();
    }

    // Dispose status bar manager
    if (statusBarManager) {
      statusBarManager.dispose();
    }

    console.log("Extension deactivated successfully");
  } catch (error) {
    console.error("Error during extension deactivation:", error);
  }
}
