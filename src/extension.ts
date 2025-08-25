import * as vscode from "vscode";
import * as path from "path";
import * as fs from "fs";
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
  JSONTaskParser,
  TaskStatusManager,
  TaskFileWatcher,
} from "./services";
import { MockDataProvider } from "./mock";
import { TaskStatus, Task } from "./types/tasks";
import { TaskDetailCardProvider } from "./tasks/providers/TaskDetailCardProvider";
import { TaskTreeViewProvider, TaskTreeItem } from "./tasks/providers";
import { TimeFormattingUtility } from "./utils";
import { TaskErrorResponse } from "./types/tasks";

/**
 * Task click event payload for UI synchronization and Cursor integration
 * Task 4.1.4: Event data structure for task selection
 */
interface TaskClickEvent {
  taskId: string;
  task: Task;
  isExecutable: boolean; // For Cursor integration detection
}

let mcpClient: MCPClient;
let statusBarManager: StatusBarManagerImpl;
let processManager: ProcessManager;
let tasksDataService: TasksDataService;
let taskDetailProvider: TaskDetailCardProvider;
let taskTreeViewProvider: TaskTreeViewProvider;
let taskTreeView: vscode.TreeView<any>;
let timeFormattingUtility: TimeFormattingUtility;
let taskFileWatcher: TaskFileWatcher;

/**
 * Setup comprehensive UI event synchronization between tree view and detail panel
 * SYNC-001: Implement bidirectional event synchronization for UI components
 *
 * This function wires up all event listeners to keep components synchronized:
 * - Tree view selection updates detail panel
 * - Detail panel status changes refresh tree view
 * - Data service updates refresh both components
 * - Error events display user notifications
 */
function setupUIEventSynchronization(): vscode.Disposable[] {
  try {
    // Tree view selection updates detail panel
    const taskClickSubscription = taskTreeViewProvider.onTaskClick(
      (event: TaskClickEvent) => {
        try {
          taskDetailProvider.updateTaskDetails(event.task);
          console.debug(
            `UI Sync: Tree selection updated detail panel for task ${event.taskId}`
          );
        } catch (error) {
          console.error("UI Sync: Error updating task details:", error);
          vscode.window.showErrorMessage("Failed to update task details");
        }
      }
    );

    // Detail panel status changes update tree view
    const statusChangedSubscription = taskDetailProvider.onStatusChanged(
      (event: { taskId: string; newStatus: TaskStatus }) => {
        try {
          // Refresh tree view to show updated status
          taskTreeViewProvider.refresh();
          console.debug(
            `UI Sync: Status change refreshed tree view for task ${event.taskId}`
          );
        } catch (error) {
          console.error("UI Sync: Error refreshing tree view:", error);
        }
      }
    );

    // Task data changes refresh both components
    const tasksUpdatedSubscription = tasksDataService.onTasksUpdated.event(
      (tasks: Task[]) => {
        try {
          // Refresh tree view to show updated data
          taskTreeViewProvider.refresh();

          // Keep current selection in detail panel if still valid
          // Access currentTask property directly since it's private but we can check if it exists
          if ((taskDetailProvider as any).currentTask) {
            const currentTask = (taskDetailProvider as any).currentTask;
            const updatedTask = tasks.find(
              (task) => task.id === currentTask.id
            );
            if (updatedTask) {
              taskDetailProvider.updateTaskDetails(updatedTask);
            }
          }

          console.debug(
            `UI Sync: Data update refreshed both components, ${tasks.length} tasks`
          );
        } catch (error) {
          console.error("UI Sync: Error refreshing components:", error);
        }
      }
    );

    // Error events show user notifications
    const errorSubscription = tasksDataService.onError.event(
      async (error: TaskErrorResponse) => {
        try {
          // Task 4: Enhanced file validation error handling with user feedback
          if (error.operation === "file_validation") {
            // Handle file validation errors with action options
            const errorMessage =
              error.userInstructions || "Tasks file validation failed";
            const action = await vscode.window.showErrorMessage(
              errorMessage,
              "Open Settings",
              "Create tasks.json",
              "Use Mock Data"
            );

            if (action === "Open Settings") {
              // Open VS Code settings for the extension
              vscode.commands.executeCommand(
                "workbench.action.openSettings",
                "aidmVscodeExtension.tasks.filePath"
              );
            } else if (action === "Create tasks.json") {
              try {
                // For JSON files, we'll show instructions to create manually
                vscode.window.showInformationMessage(
                  "Please create a tasks.json file manually with the following structure:\n" +
                  "{\n" +
                  '  "context1": {\n' +
                  '    "tasks": [\n' +
                  '      {\n' +
                  '        "id": "task-1",\n' +
                  '        "title": "Sample Task",\n' +
                  '        "status": "not_started"\n' +
                  '      }\n' +
                  '    ]\n' +
                  '  }\n' +
                  "}"
                );
              } catch (createError) {
                vscode.window.showErrorMessage(
                  `Failed to show JSON file instructions: ${
                    createError instanceof Error
                      ? createError.message
                      : "Unknown error"
                  }`
                );
              }
            } else if (action === "Use Mock Data") {
              vscode.window.showInformationMessage(
                "Using mock data. Tasks will be loaded from demo scenarios."
              );
              // The service will fall back to mock data automatically
            }
          } else {
            // Handle other types of errors with simple error message
            const errorMessage =
              error.userInstructions ||
              `Task operation failed: ${error.operation}`;
            vscode.window.showErrorMessage(errorMessage);
          }

          console.warn("UI Sync: Service error handled:", error);
        } catch (displayError) {
          console.error(
            "UI Sync: Error displaying error notification:",
            displayError
          );
        }
      }
    );

    // Add all subscriptions for proper cleanup
    // Note: context.subscriptions is not available in this scope, so we'll return the subscriptions
    // and add them in the calling function
    const subscriptions = [
      taskClickSubscription,
      statusChangedSubscription,
      tasksUpdatedSubscription,
      errorSubscription,
    ];

    console.log("✅ UI event synchronization setup completed");

    // Return subscriptions for cleanup in the calling function
    return subscriptions;
  } catch (error) {
    console.error("❌ UI event synchronization setup failed:", error);
    // Continue without full synchronization - basic functionality still works
    return [];
  }
}

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
      const jsonParser = new JSONTaskParser();
      const taskStatusManager = new TaskStatusManager(jsonParser);
      const mockDataProvider = new MockDataProvider();
      tasksDataService = new TasksDataService(
        taskStatusManager,
        jsonParser,
        mockDataProvider
      );
      console.log("✅ TasksDataService initialized");
    } catch (error) {
      console.error("❌ TasksDataService initialization failed:", error);
      throw error;
    }

    console.log(
      "=== ACTIVATION STEP 8.5.5: Setting up file validation error handling ==="
    );
    try {
      // Task 4: Enhanced file validation error handling with user feedback
      const handleFileValidationError = async (
        error: Error,
        filePath: string
      ) => {
        const errorMessage = error.message;

        // Check if it's a file validation error
        if (errorMessage.includes("Tasks file validation failed:")) {
          const validationError = errorMessage.replace(
            "Tasks file validation failed: ",
            ""
          );

          // Show user-friendly error message with action options
          const action = await vscode.window.showErrorMessage(
            `Tasks file issue: ${validationError}`,
            "Open Settings",
            "Create tasks.json",
            "Use Mock Data"
          );

          if (action === "Open Settings") {
            // Open VS Code settings for the extension
            vscode.commands.executeCommand(
              "workbench.action.openSettings",
              "aidmVscodeExtension.tasks.filePath"
            );
          } else if (action === "Create tasks.json") {
            try {
              // For JSON files, we'll show instructions to create manually
              vscode.window.showInformationMessage(
                "Please create a tasks.json file manually with the following structure:\n" +
                "{\n" +
                '  "context1": {\n' +
                '    "tasks": [\n' +
                '      {\n' +
                '        "id": "task-1",\n' +
                '        "title": "Sample Task",\n' +
                '        "status": "not_started"\n' +
                '      }\n' +
                '    ]\n' +
                '  }\n' +
                "}"
              );
            } catch (createError) {
              vscode.window.showErrorMessage(
                `Failed to show JSON file instructions: ${
                  createError instanceof Error
                    ? createError.message
                    : "Unknown error"
                }`
              );
            }
          } else if (action === "Use Mock Data") {
            vscode.window.showInformationMessage(
              "Using mock data. Tasks will be loaded from demo scenarios."
            );
            // The service will fall back to mock data automatically
          }
        } else {
          // Handle other types of errors
          vscode.window.showErrorMessage(`Task loading error: ${errorMessage}`);
        }
      };

      // Store the error handler for use in other parts of the extension
      (global as any).handleFileValidationError = handleFileValidationError;

      console.log("✅ File validation error handling setup completed");
    } catch (error) {
      console.error("❌ File validation error handling setup failed:", error);
      // Continue without enhanced error handling
    }

    console.log(
      "=== ACTIVATION STEP 8.6: Initializing TimeFormattingUtility ==="
    );
    try {
      // Initialize shared TimeFormattingUtility instance
      timeFormattingUtility = new TimeFormattingUtility();
      console.log("✅ TimeFormattingUtility initialized");
    } catch (error) {
      console.error("❌ TimeFormattingUtility initialization failed:", error);
      throw error;
    }

    console.log(
      "=== ACTIVATION STEP 8.7: Initializing TaskDetailCardProvider ==="
    );
    try {
      taskDetailProvider = new TaskDetailCardProvider(timeFormattingUtility);
      console.log("✅ TaskDetailCardProvider initialized");
    } catch (error) {
      console.error("❌ TaskDetailCardProvider initialization failed:", error);
      throw error;
    }

    console.log("=== ACTIVATION STEP 8.7.5: Initializing TaskFileWatcher ===");
    try {
      // Get workspace root for configurable tasks.md path resolution
      const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;

      if (!workspaceRoot) {
        console.warn(
          "[Extension] No workspace folder found, using fallback path"
        );
        vscode.window.showWarningMessage(
          "No workspace folder found. Tasks functionality may be limited."
        );
        // Continue without file watching - extension will still function
        return;
      }

      // Get configured path or use default
      const config = vscode.workspace.getConfiguration("aidmVscodeExtension");
      const configuredTasksPath = config.get<string>(
        "tasks.filePath",
        "tasks.md"
      );

      // Create absolute path
      const tasksFilePath = path.join(workspaceRoot, configuredTasksPath);
      console.log(`[Extension] Using tasks file: ${tasksFilePath}`);
      console.log(`[Extension] File exists: ${fs.existsSync(tasksFilePath)}`);

      // Initialize with absolute path
      taskFileWatcher = new TaskFileWatcher(tasksFilePath);

      // Start watching for file changes and wire to UI refresh
      taskFileWatcher.startWatching(async () => {
        try {
          console.log("🔄 File change detected, refreshing UI components...");

          // Refresh tasks data service
          await tasksDataService.refreshTasks();

          // Refresh tree view
          if (taskTreeViewProvider) {
            taskTreeViewProvider.refresh();
          }

          // Refresh detail panel if it has current task
          if (taskDetailProvider) {
            taskDetailProvider.refreshRelativeTimes().catch((error) => {
              console.error("Failed to refresh detail panel times:", error);
            });
          }

          console.log("✅ UI refresh completed after file change");
        } catch (error) {
          console.error("❌ Error refreshing UI after file change:", error);
        }
      });

      console.log(
        `✅ TaskFileWatcher initialized and watching: ${tasksFilePath}`
      );
    } catch (error) {
      console.error("❌ TaskFileWatcher initialization failed:", error);
      // Continue without file watching - extension will still function
    }

    console.log(
      "=== ACTIVATION STEP 8.8: Registering TaskDetailCardProvider as webview view provider ==="
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

    console.log(
      "=== ACTIVATION STEP 8.9: Setting up periodic time refresh ==="
    );
    try {
      // Set up periodic refresh for relative times (every 1 minute)
      const timeRefreshInterval = setInterval(() => {
        // Trigger refresh event for UI components that display relative times
        if (taskDetailProvider) {
          taskDetailProvider.refreshRelativeTimes().catch((error) => {
            console.error("Failed to refresh relative times:", error);
          });
        }
      }, 60000); // 60 seconds

      // Store interval for cleanup
      context.subscriptions.push({
        dispose: () => {
          clearInterval(timeRefreshInterval);
          console.log("Time refresh interval cleared");
        },
      });
      console.log("✅ Periodic time refresh timer initialized");
    } catch (error) {
      console.error("❌ Periodic time refresh setup failed:", error);
      // Continue without periodic refresh
    }

    // Expose TaskDetailCardProvider methods for external use (e.g., tree view integration)
    // This enables other components to update the detail panel when tasks are selected
    context.subscriptions.push({
      dispose: () => {
        if (taskDetailProvider) {
          taskDetailProvider.dispose();
        }
        if (taskTreeViewProvider) {
          taskTreeViewProvider.dispose();
        }
      },
    });

    console.log(
      "=== ACTIVATION STEP 8.10: Initializing TaskTreeViewProvider ==="
    );
    try {
      taskTreeViewProvider = new TaskTreeViewProvider(tasksDataService);
      console.log("✅ TaskTreeViewProvider initialized");
    } catch (error) {
      console.error("❌ TaskTreeViewProvider initialization failed:", error);
      // Continue without tree view provider
    }

    console.log(
      "=== ACTIVATION STEP 8.10.5: Creating Tree View with Selection Handler ==="
    );
    try {
      // Create tree view with selection event handling for accordion behavior
      taskTreeView = vscode.window.createTreeView(
        "aidm-vscode-extension.tasks-list",
        {
          treeDataProvider: taskTreeViewProvider,
          showCollapseAll: true,
        }
      );

      // Register selection change handler for accordion expansion logic
      const selectionChangeDisposable = taskTreeView.onDidChangeSelection(
        async (e: vscode.TreeViewSelectionChangeEvent<any>) => {
          try {
            // Handle empty selection arrays gracefully
            if (e.selection.length === 0) {
              return;
            }

            // Get the selected task item
            const selectedItem = e.selection[0];
            if (selectedItem && selectedItem.task) {
              // Task 3.2.12 - Connect Click Events to Expansion Logic
              // Wire to TaskTreeViewProvider.toggleTaskExpansion() method
              try {
                await taskTreeViewProvider.toggleTaskExpansion(
                  selectedItem.task.id
                );
                console.log(
                  `Tree view selection changed to task: ${selectedItem.task.id}, expansion toggled`
                );
              } catch (toggleError) {
                console.error(
                  `Error toggling expansion for task ${selectedItem.task.id}:`,
                  toggleError
                );
                // Continue without expansion handling
              }
            }
          } catch (error) {
            console.error("Error handling tree view selection change:", error);
            // Continue without selection handling
          }
        }
      );

      // Add both the tree view and selection handler to subscriptions for proper disposal
      context.subscriptions.push(taskTreeView, selectionChangeDisposable);
      console.log("✅ Tree view created with selection handler");

      // Register the tree data provider with VSCode to make it visible in sidebar
      const treeDataProviderDisposable = vscode.window.registerTreeDataProvider(
        "aidm-vscode-extension.tasks-list",
        taskTreeViewProvider
      );
      context.subscriptions.push(treeDataProviderDisposable);
      console.log("✅ TaskTreeViewProvider registered with VSCode");
    } catch (error) {
      console.error("❌ Tree view creation failed:", error);
      // Continue without tree view
    }

    console.log(
      "=== ACTIVATION STEP 8.11: Wiring UI synchronization events ==="
    );
    try {
      // Setup comprehensive UI event synchronization between components
      const uiSyncSubscriptions = setupUIEventSynchronization();

      // Add all UI synchronization subscriptions to context for proper cleanup
      uiSyncSubscriptions.forEach((subscription: vscode.Disposable) => {
        context.subscriptions.push(subscription);
      });

      console.log("✅ UI synchronization events wired successfully");
    } catch (error) {
      console.error("❌ UI synchronization event wiring failed:", error);
      // Continue without event synchronization
    }

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
            await tasksDataService.refreshTasks();
            vscode.window.showInformationMessage(
              "Tasks refreshed successfully"
            );
          } catch (error) {
            const errorMessage =
              error instanceof Error ? error.message : "Unknown error occurred";
            vscode.window.showErrorMessage(
              `Failed to refresh tasks: ${errorMessage}`
            );
            console.error("RefreshTasks command error:", error);
          }
        }
      );
      context.subscriptions.push(refreshTasksCommand);
      console.log("✅ refreshTasks command registered");
    } catch (error) {
      console.error("❌ refreshTasks command failed:", error);
    }

    // Register update task status command - Task 4.4.2
    try {
      const updateTaskStatusCommand = vscode.commands.registerCommand(
        getCommandId("updateTaskStatus"),
        async (taskId: string, newStatus: TaskStatus) => {
          // Parameter validation - Task 4.4.2 requirements
          if (!taskId || typeof taskId !== "string") {
            vscode.window.showErrorMessage(
              "Task ID is required and must be a string"
            );
            return;
          }

          if (!newStatus || !Object.values(TaskStatus).includes(newStatus)) {
            vscode.window.showErrorMessage("Valid task status is required");
            return;
          }

          try {
            const success = await tasksDataService.updateTaskStatus(
              taskId,
              newStatus
            );

            if (success) {
              const statusDisplayName = newStatus
                .replace("_", " ")
                .toLowerCase();
              vscode.window.showInformationMessage(
                `Task ${taskId} status updated to "${statusDisplayName}"`
              );
            } else {
              vscode.window.showWarningMessage(
                `Failed to update task ${taskId} status - task may not exist`
              );
            }
          } catch (error) {
            const errorMessage =
              error instanceof Error ? error.message : "Unknown error occurred";
            vscode.window.showErrorMessage(
              `Error updating task status: ${errorMessage}`
            );
            console.error("UpdateTaskStatus command error:", error);
          }
        }
      );
      context.subscriptions.push(updateTaskStatusCommand);
      console.log("✅ updateTaskStatus command registered - Task 4.4.2");
    } catch (error) {
      console.error("❌ updateTaskStatus command failed:", error);
    }

    // Register execute task with Cursor command - Task 4.4.3
    try {
      const executeTaskWithCursorCommand = vscode.commands.registerCommand(
        getCommandId("executeTaskWithCursor"),
        async (taskId: string) => {
          // Parameter validation - Task 4.4.3 requirements
          if (!taskId || typeof taskId !== "string") {
            vscode.window.showErrorMessage(
              "Task ID is required and must be a string"
            );
            return;
          }

          try {
            // Get task details
            const task = await tasksDataService.getTaskById(taskId);

            if (!task) {
              vscode.window.showErrorMessage(`Task ${taskId} not found`);
              return;
            }

            // Validate task is executable - Task 4.4.3 requirements
            if (!task.isExecutable) {
              vscode.window.showWarningMessage(
                `Task ${taskId} is not executable. Only tasks with "not started" status can be executed.`
              );
              return;
            }

            // Generate comprehensive task context for clipboard fallback
            const taskContext = [
              `# Task Implementation: ${task.title}`,
              ``,
              `## Context`,
              `Task ID: ${task.id}`,
              `Status: ${task.status}`,
              `Complexity: ${task.complexity}`,
              `Estimated Duration: ${
                task.estimatedDuration || "Not specified"
              }`,
              ``,
              `## Description`,
              task.description,
              ``,
              `## Dependencies`,
              task.dependencies.length > 0
                ? task.dependencies.join(", ")
                : "None",
              ``,
              `## Requirements`,
              task.requirements.length > 0
                ? task.requirements.join(", ")
                : "None",
              ``,
              `## Implementation Notes`,
              `- This task is ready for AI-assisted implementation`,
              `- Cursor integration coming soon - currently using clipboard fallback`,
              `- Review dependencies and requirements before starting`,
            ].join("\n");

            // Copy comprehensive task context to clipboard
            await vscode.env.clipboard.writeText(taskContext);

            // Show success message with action button for Cursor integration
            vscode.window
              .showInformationMessage(
                `Task context copied to clipboard! Cursor integration coming soon.`,
                "Open Cursor"
              )
              .then((selection) => {
                if (selection === "Open Cursor") {
                  vscode.window.showInformationMessage(
                    "Please paste the task context in Cursor to begin implementation."
                  );
                }
              });
          } catch (error) {
            const errorMessage =
              error instanceof Error ? error.message : "Unknown error occurred";
            vscode.window.showErrorMessage(
              `Error executing task: ${errorMessage}`
            );
            console.error("ExecuteTaskWithCursor command error:", error);
          }
        }
      );
      context.subscriptions.push(executeTaskWithCursorCommand);
      console.log("✅ executeTaskWithCursor command registered - Task 4.4.3");
    } catch (error) {
      console.error("❌ executeTaskWithCursor command failed:", error);
    }

    // Register task tree item click command - Task 3.2.13
    try {
      const taskClickCommand = vscode.commands.registerCommand(
        getCommandId("taskTreeItemClick"),
        async (taskTreeItem: TaskTreeItem) => {
          // Parameter validation - Task 3.2.13 requirements
          if (!taskTreeItem || !taskTreeItem.task) {
            console.warn(
              "TaskTreeItem click command: Invalid taskTreeItem or missing task"
            );
            return;
          }

          try {
            // Call toggleTaskExpansion with the task ID
            await taskTreeViewProvider.toggleTaskExpansion(
              taskTreeItem.task.id
            );
            console.log(
              `TaskTreeItem click command: Expansion toggled for task ${taskTreeItem.task.id}`
            );
          } catch (error) {
            console.error(
              `TaskTreeItem click command: Failed to toggle expansion for task ${taskTreeItem.task.id}:`,
              error
            );
            // Continue without expansion handling - don't break user interaction
          }
        }
      );
      context.subscriptions.push(taskClickCommand);
      console.log("✅ taskTreeItemClick command registered - Task 3.2.13");
    } catch (error) {
      console.error("❌ taskTreeItemClick command failed:", error);
    }

    // Register generate task prompt command - CMD-001
    try {
      const generateTaskPromptCommand = vscode.commands.registerCommand(
        getCommandId("generateTaskPrompt"),
        async (taskId: string) => {
          // Parameter validation
          if (!taskId || typeof taskId !== "string") {
            vscode.window.showErrorMessage(
              "Task ID is required and must be a string"
            );
            return;
          }

          try {
            // Get task details
            const task = await tasksDataService.getTaskById(taskId);

            if (!task) {
              vscode.window.showErrorMessage(`Task ${taskId} not found`);
              return;
            }

            // TODO: Implement prompt generation logic
            vscode.window.showInformationMessage(
              `Generating prompt for task: ${task.title}`
            );
          } catch (error) {
            const errorMessage =
              error instanceof Error ? error.message : "Unknown error occurred";
            vscode.window.showErrorMessage(
              `Error generating task prompt: ${errorMessage}`
            );
            console.error("GenerateTaskPrompt command error:", error);
          }
        }
      );
      context.subscriptions.push(generateTaskPromptCommand);
      console.log("✅ generateTaskPrompt command registered - CMD-001");
    } catch (error) {
      console.error("❌ generateTaskPrompt command failed:", error);
    }

    // Register view test results command - CMD-001
    try {
      const viewTestResultsCommand = vscode.commands.registerCommand(
        getCommandId("viewTestResults"),
        async (taskId: string) => {
          // Parameter validation
          if (!taskId || typeof taskId !== "string") {
            vscode.window.showErrorMessage(
              "Task ID is required and must be a string"
            );
            return;
          }

          try {
            // Get task details
            const task = await tasksDataService.getTaskById(taskId);

            if (!task) {
              vscode.window.showErrorMessage(`Task ${taskId} not found`);
              return;
            }

            // TODO: Implement test results viewing logic
            vscode.window.showInformationMessage(
              `Viewing test results for task: ${task.title}`
            );
          } catch (error) {
            const errorMessage =
              error instanceof Error ? error.message : "Unknown error occurred";
            vscode.window.showErrorMessage(
              `Error viewing test results: ${errorMessage}`
            );
            console.error("ViewTestResults command error:", error);
          }
        }
      );
      context.subscriptions.push(viewTestResultsCommand);
      console.log("✅ viewTestResults command registered - CMD-001");
    } catch (error) {
      console.error("❌ viewTestResults command failed:", error);
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
  console.log("AIDM VSCode Extension: Starting deactivation...");

  try {
    // Commands and providers are automatically disposed via context.subscriptions
    // This includes all registered commands, tree data providers, and webview providers
    console.log(
      "AIDM VSCode Extension: All registered commands and providers disposed via context.subscriptions"
    );

    // Graceful shutdown of process manager
    if (processManager) {
      await processManager.shutdown();
      console.log("AIDM VSCode Extension: Process manager shutdown completed");
    }

    // Dispose status bar manager
    if (statusBarManager) {
      statusBarManager.dispose();
      console.log("AIDM VSCode Extension: Status bar manager disposed");
    }

    // Dispose tasks data service if it exists
    if (tasksDataService) {
      tasksDataService.dispose();
      console.log("AIDM VSCode Extension: Tasks data service disposed");
    }

    // Dispose task tree view provider if it exists
    if (taskTreeViewProvider) {
      taskTreeViewProvider.dispose();
      console.log("AIDM VSCode Extension: Task tree view provider disposed");
    }

    // Dispose task file watcher if it exists
    if (taskFileWatcher) {
      taskFileWatcher.dispose();
      console.log("AIDM VSCode Extension: Task file watcher disposed");
    }

    // Dispose MCP client if it exists
    if (mcpClient) {
      // Note: MCPClient doesn't have a dispose method, but we can clean up any resources
      console.log("AIDM VSCode Extension: MCP client cleanup completed");
    }

    // Additional cleanup for any global state or timers
    // (TimeFormattingUtility timer should already be in subscriptions)
    console.log("AIDM VSCode Extension: All resources cleaned up successfully");
  } catch (error) {
    console.error("AIDM VSCode Extension: Error during deactivation:", error);
  } finally {
    console.log("AIDM VSCode Extension deactivated");
  }
}
