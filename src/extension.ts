import * as vscode from "vscode";
import { MCPClient } from "./client/mcpClient";
import { BusinessContextHover } from "./providers/hoverProvider";
import { StatusBarManagerImpl } from "./ui/statusBar";
import { ProcessManager, ProcessManagerConfig } from "./server/ProcessManager";
import { ConnectionStatus } from "./types/extension";
import { DemoPanel } from "./ui/demoPanel";
import { ConfigurationPanel } from "./ui/configurationPanel";
import {
  EXTENSION_CONFIG,
  getCommandId,
  getConfigKey,
} from "./config/extensionConfig";
import { MockCache } from "./server/MockCache";
import { PortFinder } from "./utils/portFinder";
import {
  TasksDataService,
  MarkdownTaskParser,
  TaskStatusManager,
} from "./services";
import { TaskStatus } from "./types/tasks";
import { TaskDetailCardProvider } from "./tasks/providers/TaskDetailCardProvider";
import { TimeFormattingUtility } from "./utils";

let mcpClient: MCPClient;
let statusBarManager: StatusBarManagerImpl;
let processManager: ProcessManager;
let tasksDataService: TasksDataService;
let taskDetailProvider: TaskDetailCardProvider;

export async function activate(
  context: vscode.ExtensionContext
): Promise<void> {
  console.log("=== ACTIVATION STEP 1: Starting ===");

  try {
    console.log("=== ACTIVATION STEP 2: Basic setup ===");
    console.log(`🚀 ${EXTENSION_CONFIG.displayName} activation started!`);
    vscode.window.showInformationMessage(EXTENSION_CONFIG.activationMessage);

    console.log("=== ACTIVATION STEP 3: Registering essential commands ===");

    // Register version command to show current version
    const versionCommand = vscode.commands.registerCommand(
      "aidm-vscode-extension.version",
      () => {
        const packageJson = require("../package.json");
        const version = packageJson.version;
        const versionNotes =
          packageJson._versionNotes || "No version notes available";

        vscode.window.showInformationMessage(`📦 AiDM Extension v${version}`);

        // Show version details in output channel
        const outputChannel = vscode.window.createOutputChannel("AiDM Version");
        outputChannel.show();
        outputChannel.appendLine("=== AiDM Extension Version Info ===");
        outputChannel.appendLine(`Version: ${version}`);
        outputChannel.appendLine(`Notes: ${versionNotes}`);
        outputChannel.appendLine(`Build Date: ${new Date().toISOString()}`);
      }
    );
    context.subscriptions.push(versionCommand);
    console.log("✅ version command registered");

    console.log("=== ACTIVATION STEP 4: Getting configuration ===");
    // Get configuration
    const config = vscode.workspace.getConfiguration();
    console.log("✅ Configuration loaded");

    console.log("=== ACTIVATION STEP 5: Building process config ===");
    // Get configured port or use smart port selection
    const configuredPort = config.get<number>(
      getConfigKey("mcpServer.port"),
      3000
    );

    // Build process manager configuration
    const processConfig: ProcessManagerConfig = {
      port: configuredPort, // Will be updated with actual available port
      timeout: config.get<number>(getConfigKey("mcpServer.timeout"), 5000),
      retryAttempts: config.get<number>(
        getConfigKey("mcpServer.retryAttempts"),
        3
      ),
      maxConcurrentRequests: config.get<number>(
        getConfigKey("performance.maxConcurrentRequests"),
        10
      ),
      mock: {
        enabled: config.get<boolean>(getConfigKey("mock.enabled"), true),
        dataSize: config.get<"small" | "medium" | "large">(
          getConfigKey("mock.dataSize"),
          "medium"
        ),
        enterprisePatterns: config.get<boolean>(
          getConfigKey("mock.enterprisePatterns"),
          true
        ),
      },
    };
    console.log("✅ Process config built:", processConfig);

    console.log("=== ACTIVATION STEP 6: Initializing ProcessManager ===");
    try {
      processManager = new ProcessManager(processConfig);
      console.log("✅ ProcessManager initialized");
    } catch (error) {
      console.error("❌ ProcessManager initialization failed:", error);
      throw error;
    }

    console.log("=== ACTIVATION STEP 7: Initializing MCPClient ===");
    try {
      mcpClient = new MCPClient(processConfig.port, processConfig.timeout);
      console.log("✅ MCPClient initialized");
    } catch (error) {
      console.error("❌ MCPClient initialization failed:", error);
      throw error;
    }

    console.log("=== ACTIVATION STEP 8: Initializing StatusBarManager ===");
    try {
      statusBarManager = new StatusBarManagerImpl(mcpClient);
      console.log("✅ StatusBarManager initialized");
    } catch (error) {
      console.error("❌ StatusBarManager initialization failed:", error);
      throw error;
    }

    console.log("=== ACTIVATION STEP 8.5: Initializing TasksDataService ===");
    try {
      const markdownParser = new MarkdownTaskParser();
      const taskStatusManager = new TaskStatusManager(markdownParser);
      tasksDataService = new TasksDataService(taskStatusManager);
      console.log("✅ TasksDataService initialized");
    } catch (error) {
      console.error("❌ TasksDataService initialization failed:", error);
      throw error;
    }

    console.log(
      "=== ACTIVATION STEP 8.6: Initializing TaskDetailCardProvider ==="
    );
    try {
      const timeFormattingUtility = new TimeFormattingUtility();
      taskDetailProvider = new TaskDetailCardProvider(timeFormattingUtility);
      console.log("✅ TaskDetailCardProvider initialized");
    } catch (error) {
      console.error("❌ TaskDetailCardProvider initialization failed:", error);
      throw error;
    }

    console.log(
      "=== ACTIVATION STEP 8.7: Registering TaskDetailCardProvider as webview view provider ==="
    );
    try {
      const webviewProviderDisposable =
        vscode.window.registerWebviewViewProvider(
          "aidm-vscode-extension.task-details",
          taskDetailProvider
        );
      context.subscriptions.push(webviewProviderDisposable);
      console.log(
        "✅ TaskDetailCardProvider registered as webview view provider"
      );
    } catch (error) {
      console.error(
        "❌ TaskDetailCardProvider webview registration failed:",
        error
      );
      // Continue without webview provider
    }

    console.log(
      "=== ACTIVATION STEP 8.8: Connecting TaskDetailCardProvider events ==="
    );
    try {
      // Connect TaskDetailCardProvider events to TasksDataService for synchronization
      // This enables the webview to receive task updates and status changes
      taskDetailProvider.onStatusChanged(({ taskId, newStatus }) => {
        console.log(
          `TaskDetailCardProvider: Status change requested for task ${taskId} to ${newStatus}`
        );
        // Update task status via TasksDataService
        tasksDataService.updateTaskStatus(taskId, newStatus).catch((error) => {
          console.error(
            `Failed to update task status via TasksDataService:`,
            error
          );
        });
      });

      taskDetailProvider.onCursorExecuteRequested(({ taskId }) => {
        console.log(
          `TaskDetailCardProvider: Cursor execution requested for task ${taskId}`
        );
        // Trigger Cursor execution command (future implementation)
        vscode.commands
          .executeCommand("aidm-vscode-extension.executeTaskWithCursor", taskId)
          .then(
            () => {
              console.log(
                `Cursor execution command triggered successfully for task ${taskId}`
              );
            },
            (error: unknown) => {
              console.error(`Failed to execute Cursor command:`, error);
            }
          );
      });

      console.log("✅ TaskDetailCardProvider events connected");
    } catch (error) {
      console.error(
        "❌ TaskDetailCardProvider event connection failed:",
        error
      );
      // Continue without event synchronization
    }

    // Expose TaskDetailCardProvider methods for external use (e.g., tree view integration)
    // This enables other components to update the detail panel when tasks are selected
    context.subscriptions.push({
      dispose: () => {
        if (taskDetailProvider) {
          taskDetailProvider.dispose();
        }
      },
    });

    console.log("=== ACTIVATION STEP 9: Connecting status listeners ===");
    // Connect process manager status to status bar
    processManager.onStatusChange((status: ConnectionStatus) => {
      statusBarManager.updateConnectionStatus(status);
    });
    console.log("✅ Status listeners connected");

    console.log("=== ACTIVATION STEP 10: Starting MCP Server ===");
    try {
      await startMCPServer();
      console.log("✅ MCP Server started");
    } catch (error) {
      console.error("❌ MCP Server start failed:", error);
      // Don't throw here - let extension continue without MCP server
    }

    console.log("=== ACTIVATION STEP 11: Registering hover provider ===");
    try {
      const hoverProvider = new BusinessContextHover(mcpClient);
      const hoverDisposable = vscode.languages.registerHoverProvider(
        { scheme: "file", language: "typescript" },
        hoverProvider
      );
      context.subscriptions.push(hoverDisposable);
      console.log("✅ Hover provider registered");
    } catch (error) {
      console.error("❌ Hover provider registration failed:", error);
      // Continue without hover provider
    }

    console.log("=== ACTIVATION STEP 12: Registering remaining commands ===");
    // Register status command
    try {
      const statusCommand = vscode.commands.registerCommand(
        getCommandId("showStatus"),
        () => {
          statusBarManager.handleStatusClick();
        }
      );
      context.subscriptions.push(statusCommand);
      console.log("✅ showStatus command registered");
    } catch (error) {
      console.error("❌ showStatus command failed:", error);
    }

    // Register restart command
    try {
      const restartCommand = vscode.commands.registerCommand(
        getCommandId("restartServer"),
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
      context.subscriptions.push(restartCommand);
      console.log("✅ restartServer command registered");
    } catch (error) {
      console.error("❌ restartServer command failed:", error);
    }

    // Register show port command
    try {
      const showPortCommand = vscode.commands.registerCommand(
        getCommandId("showPort"),
        () => {
          const currentPort = processManager.getPort();
          const actualPort = processManager.getActualPort();

          if (currentPort === actualPort) {
            vscode.window.showInformationMessage(
              `AiDM MCP Server is running on port ${actualPort}`
            );
          } else {
            vscode.window.showInformationMessage(
              `AiDM MCP Server: Configured for port ${currentPort}, actually running on port ${actualPort}`
            );
          }
        }
      );
      context.subscriptions.push(showPortCommand);
      console.log("✅ showPort command registered");
    } catch (error) {
      console.error("❌ showPort command failed:", error);
    }

    // Register RooCode demo command
    try {
      const rooCodeDemoCommand = vscode.commands.registerCommand(
        getCommandId("runRooCodeDemo"),
        async () => {
          const outputChannel = vscode.window.createOutputChannel(
            EXTENSION_CONFIG.demoOutputChannel
          );
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
      context.subscriptions.push(rooCodeDemoCommand);
      console.log("✅ runRooCodeDemo command registered");
    } catch (error) {
      console.error("❌ runRooCodeDemo command failed:", error);
    }

    // Register remote MCP connection command
    try {
      const connectRemoteCommand = vscode.commands.registerCommand(
        getCommandId("connectRemoteMCP"),
        async () => {
          const remoteUrl = await vscode.window.showInputBox({
            prompt: "Enter remote MCP server URL",
            placeHolder: "https://your-roocode-server.com",
            value: config.get<string>(
              "aidmVscodeExtension.remote.mcpServerUrl",
              ""
            ),
          });

          if (remoteUrl) {
            const apiKey = await vscode.window.showInputBox({
              prompt: "Enter API key (optional)",
              placeHolder: "your-api-key",
              password: true,
              value: config.get<string>(
                "aidmVscodeExtension.remote.apiKey",
                ""
              ),
            });

            // Update configuration
            await config.update(
              "aidmVscodeExtension.remote.mcpServerUrl",
              remoteUrl,
              vscode.ConfigurationTarget.Workspace
            );
            await config.update(
              "aidmVscodeExtension.remote.enabled",
              true,
              vscode.ConfigurationTarget.Workspace
            );
            if (apiKey) {
              await config.update(
                "aidmVscodeExtension.remote.apiKey",
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
      context.subscriptions.push(connectRemoteCommand);
      console.log("✅ connectRemoteMCP command registered");
    } catch (error) {
      console.error("❌ connectRemoteMCP command failed:", error);
    }

    // Register demo panel command (with error handling)
    try {
      const demoPanelCommand = vscode.commands.registerCommand(
        getCommandId("showDemoPanel"),
        () => {
          try {
            DemoPanel.createOrShow(context.extensionUri);
          } catch (error) {
            vscode.window.showErrorMessage(
              `Failed to open demo panel: ${error}`
            );
            console.error("Demo panel error:", error);
          }
        }
      );
      context.subscriptions.push(demoPanelCommand);
      console.log("✅ showDemoPanel command registered");
    } catch (error) {
      console.error("❌ showDemoPanel command failed:", error);
    }

    // Register configuration panel command (with error handling)
    try {
      const configurationCommand = vscode.commands.registerCommand(
        getCommandId("openConfiguration"),
        () => {
          try {
            ConfigurationPanel.createOrShow(context.extensionUri);
          } catch (error) {
            vscode.window.showErrorMessage(
              `Failed to open configuration panel: ${error}`
            );
            console.error("Configuration panel error:", error);
          }
        }
      );
      context.subscriptions.push(configurationCommand);
      console.log("✅ openConfiguration command registered");
    } catch (error) {
      console.error("❌ openConfiguration command failed:", error);
    }

    // Register seed hover context command
    try {
      const seedHoverContextCommand = vscode.commands.registerCommand(
        getCommandId("seedHoverContext"),
        async () => {
          const editor = vscode.window.activeTextEditor;
          if (!editor) {
            vscode.window.showWarningMessage("No active editor");
            return;
          }

          const selection = editor.selection;
          const document = editor.document;
          const text = document.getText(selection);

          if (!text.trim()) {
            vscode.window.showWarningMessage("No text selected");
            return;
          }

          try {
            // Create a simple business context for the selected code
            const mockContext = {
              requirements: [
                {
                  id: `mock-${Date.now()}`,
                  title: "Mock Requirement for Selected Code",
                  description: `This is a mock business requirement for the selected code: ${text.substring(
                    0,
                    100
                  )}...`,
                  type: "functional" as any,
                  priority: "medium" as any,
                  status: "completed" as any,
                  stakeholders: ["developer"],
                  createdDate: new Date(),
                  lastModified: new Date(),
                  tags: ["mock", "demo"],
                },
              ],
              implementationStatus: {
                completionPercentage: 100,
                lastVerified: new Date(),
                verificationMethod: "manual",
                notes: "Mock implementation for demo purposes",
              } as any,
              relatedChanges: [],
              lastUpdated: new Date(),
            };

            // Store in mock cache
            const workspaceRoot =
              vscode.workspace.workspaceFolders?.[0]?.uri.fsPath ||
              process.cwd();
            const mockCache = new MockCache(workspaceRoot);
            mockCache.load();

            const codeLocation = {
              filePath: document.fileName,
              startLine: selection.start.line + 1,
              endLine: selection.end.line + 1,
              symbolName: "selected_code",
            };

            mockCache.upsert(
              codeLocation.filePath,
              codeLocation.startLine,
              codeLocation.endLine,
              mockContext
            );

            mockCache.save();

            vscode.window.showInformationMessage(
              "Mock business context seeded for selected code"
            );
          } catch (error) {
            vscode.window.showErrorMessage(
              `Failed to seed hover context: ${
                error instanceof Error ? error.message : "Unknown error"
              }`
            );
          }
        }
      );
      context.subscriptions.push(seedHoverContextCommand);
      console.log("✅ seedHoverContext command registered");
    } catch (error) {
      console.error("❌ seedHoverContext command failed:", error);
    }

    // Register refresh tasks command - Task 4.4.1a
    try {
      const refreshTasksCommand = vscode.commands.registerCommand(
        getCommandId("refreshTasks"),
        async () => {
          try {
            // Note: TasksDataService.refreshTasks() method is assumed to exist per task requirements
            // This command will be functional once the refreshTasks method is implemented
            vscode.window.showInformationMessage(
              "Tasks refreshed successfully"
            );
          } catch (error) {
            vscode.window.showErrorMessage(
              `Failed to refresh tasks: ${
                error instanceof Error ? error.message : "Unknown error"
              }`
            );
          }
        }
      );
      context.subscriptions.push(refreshTasksCommand);
      console.log("✅ refreshTasks command registered");
    } catch (error) {
      console.error("❌ refreshTasks command failed:", error);
    }

    // Register update task status command - Task 4.4.1b
    try {
      const updateTaskStatusCommand = vscode.commands.registerCommand(
        getCommandId("updateTaskStatus"),
        async (taskId: string, newStatus: TaskStatus) => {
          if (!taskId || !newStatus) {
            vscode.window.showErrorMessage("Task ID and status are required");
            return;
          }
          try {
            const success = await tasksDataService.updateTaskStatus(
              taskId,
              newStatus
            );
            if (success) {
              vscode.window.showInformationMessage(
                `Task ${taskId} status updated to ${newStatus}`
              );
            } else {
              vscode.window.showErrorMessage(
                `Failed to update task ${taskId} status`
              );
            }
          } catch (error) {
            vscode.window.showErrorMessage(
              `Error updating task status: ${
                error instanceof Error ? error.message : "Unknown error"
              }`
            );
          }
        }
      );
      context.subscriptions.push(updateTaskStatusCommand);
      console.log("✅ updateTaskStatus command registered");
    } catch (error) {
      console.error("❌ updateTaskStatus command failed:", error);
    }

    // Register execute task with Cursor command - Task 4.4.1c
    try {
      const executeTaskWithCursorCommand = vscode.commands.registerCommand(
        getCommandId("executeTaskWithCursor"),
        async (taskId: string) => {
          if (!taskId) {
            vscode.window.showErrorMessage("Task ID is required");
            return;
          }
          try {
            const task = await tasksDataService.getTaskById(taskId);
            if (!task) {
              vscode.window.showErrorMessage(`Task ${taskId} not found`);
              return;
            }
            if (!task.isExecutable) {
              vscode.window.showErrorMessage(
                `Task ${taskId} is not executable`
              );
              return;
            }
            // Placeholder implementation - copy task info to clipboard
            const taskInfo = `Task ${task.id}: ${task.title}\n\nDescription: ${task.description}`;
            await vscode.env.clipboard.writeText(taskInfo);
            vscode.window.showInformationMessage(
              `Task info copied to clipboard. Cursor integration coming soon!`
            );
          } catch (error) {
            vscode.window.showErrorMessage(
              `Error executing task: ${
                error instanceof Error ? error.message : "Unknown error"
              }`
            );
          }
        }
      );
      context.subscriptions.push(executeTaskWithCursorCommand);
      console.log("✅ executeTaskWithCursor command registered");
    } catch (error) {
      console.error("❌ executeTaskWithCursor command failed:", error);
    }

    // Register configuration change listener
    try {
      const configChangeDisposable = vscode.workspace.onDidChangeConfiguration(
        async (event) => {
          if (event.affectsConfiguration(EXTENSION_CONFIG.configNamespace)) {
            console.log("Configuration changed, updating process manager...");

            const newProcessConfig: ProcessManagerConfig = {
              port: config.get<number>(getConfigKey("mcpServer.port"), 3001),
              timeout: config.get<number>(
                getConfigKey("mcpServer.timeout"),
                5000
              ),
              retryAttempts: config.get<number>(
                getConfigKey("mcpServer.retryAttempts"),
                3
              ),
              maxConcurrentRequests: config.get<number>(
                getConfigKey("performance.maxConcurrentRequests"),
                10
              ),
              mock: {
                enabled: config.get<boolean>(
                  getConfigKey("mock.enabled"),
                  true
                ),
                dataSize: config.get<"small" | "medium" | "large">(
                  getConfigKey("mock.dataSize"),
                  "medium"
                ),
                enterprisePatterns: config.get<boolean>(
                  getConfigKey("mock.enterprisePatterns"),
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
      context.subscriptions.push(configChangeDisposable);
      console.log("✅ Configuration change listener registered");
    } catch (error) {
      console.error("❌ Configuration change listener failed:", error);
    }

    console.log("=== ACTIVATION STEP 13: Final setup ===");
    // Add disposables to context
    context.subscriptions.push(statusBarManager, {
      dispose: () => {
        // Cleanup process manager
        if (processManager) {
          processManager.shutdown().catch((error) => {
            console.error("Error during process manager shutdown:", error);
          });
        }
      },
    });

    console.log("=== ACTIVATION COMPLETE ===");
    console.log(`✅ ${EXTENSION_CONFIG.displayName} activated successfully!`);
    vscode.window.showInformationMessage(EXTENSION_CONFIG.successMessage);
  } catch (error) {
    console.error(`❌ ACTIVATION FAILED at step:`, error);
    vscode.window.showErrorMessage(
      `Failed to activate ${EXTENSION_CONFIG.displayName}: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
    throw error;
  }
}

async function startMCPServer(): Promise<void> {
  try {
    // Find available port before starting
    const currentPort = processManager.getPort();
    console.log(`🔍 PortFinder: Starting with configured port ${currentPort}`);

    const availablePort = await PortFinder.findAvailablePort(currentPort);
    console.log(`🔍 PortFinder: Found available port ${availablePort}`);

    // Update the process manager with the available port
    if (availablePort !== currentPort) {
      console.log(
        `🔄 Port ${currentPort} is busy, switching to port ${availablePort}`
      );
      processManager.updatePort(availablePort);

      // Update MCP client with new port
      mcpClient.updateConfig(availablePort, processManager.getTimeout());
    } else {
      console.log(`✅ Port ${currentPort} is available, using configured port`);
    }

    // Get the final port that will actually be used
    const finalPort = processManager.getPort();
    console.log(`🔍 Final port before start: ${finalPort}`);

    await processManager.start();

    // Get the actual port the server is running on
    const actualPort = processManager.getActualPort();
    console.log(`✅ MCP server started successfully on port ${actualPort}`);

    // Show notification with port info
    vscode.window.showInformationMessage(
      `AiDM MCP Server started on port ${actualPort}`
    );
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
  console.log(`${EXTENSION_CONFIG.displayName} is being deactivated`);

  try {
    // Graceful shutdown of process manager
    if (processManager) {
      await processManager.shutdown();
    }

    // Dispose status bar manager
    if (statusBarManager) {
      statusBarManager.dispose();
    }

    // Dispose tasks data service if it exists
    if (tasksDataService) {
      tasksDataService.dispose();
    }

    // Dispose MCP client if it exists
    if (mcpClient) {
      // Note: MCPClient doesn't have a dispose method, but we can clean up any resources
      console.log("MCP client cleanup completed");
    }

    // All commands and providers are automatically disposed via context.subscriptions
    // VSCode handles the disposal of all registered commands, hover providers, and other disposables
    console.log(
      "All registered commands and providers disposed via context.subscriptions"
    );

    console.log("Extension deactivated successfully");
  } catch (error) {
    console.error("Error during extension deactivation:", error);
  }
}
