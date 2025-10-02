import * as vscode from "vscode";
import * as path from "path";
import * as fs from "fs";
import { MCPClient } from "./client/mcpClient";
import { BusinessContextHover } from "./providers/hoverProvider";
import { StatusBarManagerImpl } from "./ui/statusBar";
import { ProcessManager, ProcessManagerConfig } from "./server/ProcessManager";
import { ConnectionStatus } from "./types/extension";
import { ConfigurationPanel } from "./ui/configurationPanel";
import {
  EXTENSION_CONFIG,
  getCommandId,
  getConfigKey,
} from "./config/extensionConfig";
import { MockCache } from "./server/MockCache";
import {
  TasksDataService,
  JSONTaskParser,
} from "./services";
import { MockDataProvider } from "./mock";
import { TaskStatus, Task } from "./types/tasks";
import { TaskDetailCardProvider } from "./tasks/providers/TaskDetailCardProvider";
import { TaskWebviewProvider } from "./tasks/providers";
import { TaskErrorResponse } from "./types/tasks";
import { TaskApiIntegrationSSO } from "./integrations/TaskApiIntegrationSSO";
import { AuthService } from "./auth/authService";
import { CONFIG } from "./common/config";



/**
 * Task click event payload for UI synchronization and Cursor integration
 * Task 4.1.4: Event data structure for task selection
 */
interface TaskClickEvent {
  taskId: string;
  task: Task;
  isExecutable: boolean; // For Cursor integration detection
}

function validateTasksFile(filePath: string | null): {
  isValid: boolean;
  error?: string;
} {
  if (!filePath) {
    return { isValid: false, error: "No valid file path provided" };
  }

  if (!fs.existsSync(filePath)) {
    return {
      isValid: false,
      error: `Tasks file not found: ${path.basename(
        filePath
      )}. Create this file in your workspace root or update the 'aidmVscodeExtension.tasks.filePath' setting.`,
    };
  }

  return { isValid: true };
}

/**
 * PATH-003: Validate tasks file path configuration setting
 * Ensures the configured path is a valid file path format
 */
export function validateTasksFilePath(filePath: string): {
  isValid: boolean;
  error?: string;
} {
  // Handle empty or undefined
  if (!filePath || typeof filePath !== "string") {
    return {
      isValid: false,
      error:
        "Tasks file path cannot be empty. Use 'tasks.json' for default location.",
    };
  }

  // Trim whitespace
  const trimmedPath = filePath.trim();
  if (trimmedPath !== filePath) {
    return {
      isValid: false,
      error: "Tasks file path contains leading or trailing whitespace.",
    };
  }

  // Check for invalid characters (Windows + Unix)
  // Allow colons in Windows absolute paths (e.g., C:\path\to\file.json)
  // but reject them in relative paths
  const isWindowsAbsolutePath = /^[A-Za-z]:[\\\/]/;
  const hasInvalidChars = /[<>"|?*\x00-\x1f]/;

  if (isWindowsAbsolutePath.test(trimmedPath)) {
    // For Windows absolute paths, only check for truly invalid characters
    if (hasInvalidChars.test(trimmedPath)) {
      return {
        isValid: false,
        error:
          'Windows absolute path contains invalid characters. Avoid: < > " | ? * and control characters.',
      };
    }
  } else {
    // For relative paths and Unix absolute paths, reject colons
    const invalidChars = /[<>:"|?*\x00-\x1f]/;
    if (invalidChars.test(trimmedPath)) {
      return {
        isValid: false,
        error:
          'Tasks file path contains invalid characters. Avoid: < > : " | ? * and control characters.',
      };
    }
  }

  // Must end with .json
  if (!trimmedPath.toLowerCase().endsWith(".json")) {
    return {
      isValid: false,
      error: "Tasks file must have .json extension (e.g., 'tasks.json').",
    };
  }

  // Check for relative path components that could be problematic
  if (trimmedPath.includes("../") || trimmedPath.includes("..\\")) {
    return {
      isValid: false,
      error:
        "Tasks file path cannot navigate outside workspace (no '../' allowed).",
    };
  }

  // If it looks like an absolute path, warn but allow
  if (path.isAbsolute(trimmedPath)) {
    // Allow absolute paths but log warning
  }

  return { isValid: true };
}

/**
 * PATH-003: Handle configuration validation with user feedback
 * Validates configuration changes and shows helpful error messages
 */
async function handleConfigurationValidation(
  config: vscode.WorkspaceConfiguration,
  configKey: string
): Promise<boolean> {
  const filePath = config.get<string>(configKey);

  if (!filePath) {
    // Use default value
    return true;
  }

  const validation = validateTasksFilePath(filePath);

  if (!validation.isValid) {
    // Show error to user with option to fix
    const action = await vscode.window.showErrorMessage(
      `Invalid tasks file path: ${validation.error}`,
      "Open Settings",
      "Use Default"
    );

    if (action === "Open Settings") {
      vscode.commands.executeCommand(
        "workbench.action.openSettings",
        "aidmVscodeExtension.tasks.filePath"
      );
    } else if (action === "Use Default") {
      // Reset to default
      await config.update(
        "tasks.filePath",
        "tasks.json",
        vscode.ConfigurationTarget.Workspace
      );
      vscode.window.showInformationMessage(
        "Tasks file path reset to default: tasks.json"
      );
    }

    return false;
  }

  return true;
}

let mcpClient: MCPClient;
let statusBarManager: StatusBarManagerImpl;
let processManager: ProcessManager;
let tasksDataService: TasksDataService;
let taskDetailProvider: TaskDetailCardProvider;
let taskWebviewProvider: TaskWebviewProvider;
let taskApiIntegration: TaskApiIntegrationSSO;
let authService: AuthService | undefined;
let debugChannel: vscode.OutputChannel;

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
function setupUIEventSynchronization(
  webviewProvider: TaskWebviewProvider
): vscode.Disposable[] {
  try {
    // Webview task selection updates detail panel
    // Note: TaskWebviewProvider doesn't have onTaskClick method yet
    const taskClickSubscription = { dispose: () => {} };

    // Detail panel status changes update webview
    const statusChangedSubscription = taskDetailProvider.onStatusChanged(
      (event: { taskId: string; newStatus: TaskStatus }) => {
        try {
          // Note: TaskWebviewProvider doesn't have refresh method yet
          // Webview will update automatically when data changes
          // Webview will update automatically
        } catch (error) {
          console.error("UI Sync: Error handling status change:", error);
        }
      }
    );

    // Task data changes refresh both components
    const tasksUpdatedSubscription = tasksDataService.onTasksUpdated.event(
      (tasks: Task[]) => {
        try {
          // Note: TaskWebviewProvider doesn't have refresh method yet
          // Webview will update automatically when data changes

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

          // Webview will update automatically
        } catch (error) {
          console.error("UI Sync: Error handling data update:", error);
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
                    "      {\n" +
                    '        "id": "task-1",\n' +
                    '        "title": "Sample Task",\n' +
                    '        "status": "not_started"\n' +
                    "      }\n" +
                    "    ]\n" +
                    "  }\n" +
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

          // Service error handled
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

    // UI event synchronization setup completed

    // Return subscriptions for cleanup in the calling function
    return subscriptions;
  } catch (error) {
    // UI event synchronization setup failed
    // Continue without full synchronization - basic functionality still works
    return [];
  }
}

export async function activate(
  context: vscode.ExtensionContext
): Promise<void> {
  try {

    // Essential commands only - REF-021

    // Get configuration
    const config = vscode.workspace.getConfiguration();

    // Get configured port or use smart port selection
    const configuredPort = config.get<number>(
      getConfigKey("mcpServer.port"),
      3005
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

    try {
      processManager = new ProcessManager(processConfig);
    } catch (error) {
      console.error("ProcessManager initialization failed:", error);
      throw error;
    }

    try {
      mcpClient = new MCPClient(processConfig.port, processConfig.timeout);
    } catch (error) {
      console.error("MCPClient initialization failed:", error);
      throw error;
    }

    try {
      statusBarManager = new StatusBarManagerImpl(mcpClient);
    } catch (error) {
      console.error("StatusBarManager initialization failed:", error);
      throw error;
    }

    // Initialize debug output channel
    debugChannel = vscode.window.createOutputChannel('AiDM Extension Debug');

    try {
      const jsonParser = new JSONTaskParser();
      const mockDataProvider = new MockDataProvider();
      tasksDataService = new TasksDataService(
        jsonParser,
        mockDataProvider
      );

      // Task 6.1.2: Initialize TasksDataService after workspace is ready
      await tasksDataService.initialize();
    } catch (error) {
      console.error("TasksDataService initialization failed:", error);
      throw error;
    }

    try {
      authService = new AuthService(context);
    } catch (error) {
      console.warn("Authentication service initialization failed (continuing with offline mode):", error);
      // Don't throw - allow extension to continue without auth - PROGRESSIVE-002
      authService = undefined; // Explicitly set to undefined for clear state
    }

    // Set VSCode context for panel visibility based on auth state
    const { authStateManager } = await import('./auth/authStateManager');
    const updateAuthContext = (authState: any) => {
      vscode.commands.executeCommand('setContext', 'aidm.isAuthenticated', authState.isLoggedIn);
    };

    if (authService) {
      // Subscribe to auth state changes
      const authSubscription = authStateManager.subscribe(updateAuthContext);
      context.subscriptions.push({ dispose: () => authSubscription() });

      // Set initial context based on current auth state
      updateAuthContext(authService.authState);
    } else {
      // No auth service - allow panel for offline mode
      vscode.commands.executeCommand('setContext', 'aidm.isAuthenticated', true);
    }

    try {
      if (authService) {
        taskApiIntegration = new TaskApiIntegrationSSO(tasksDataService, authService, context);
        await taskApiIntegration.initialize();
        console.log('✅ TaskApiIntegrationSSO initialized - SSO auth will auto-sync tasks');
      } else {
        console.log('TaskApiIntegrationSSO skipped: AuthService is not available');
      }
    } catch (error) {
      console.warn("Task API integration initialization failed (non-critical):", error);
      // Don't throw - allow extension to continue without API integration
    }

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
                  "      {\n" +
                  '        "id": "task-1",\n' +
                  '        "title": "Sample Task",\n' +
                  '        "status": "not_started"\n' +
                  "      }\n" +
                  "    ]\n" +
                  "  }\n" +
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

    } catch (error) {
      console.error("File validation error handling setup failed:", error);
      // Continue without enhanced error handling
    }


    try {
      taskDetailProvider = new TaskDetailCardProvider();
    } catch (error) {
      console.error("TaskDetailCardProvider initialization failed:", error);
      throw error;
    }

    try {
      // Get configured tasks file path
      const config = vscode.workspace.getConfiguration("aidmVscodeExtension");
      const configuredTasksPath = config.get<string>(
        "tasks.filePath",
        "tasks.json"
      );

      // Validate path format using existing validation
      const pathValidation = validateTasksFilePath(configuredTasksPath);
      if (!pathValidation.isValid) {

        const action = await vscode.window.showErrorMessage(
          `Invalid tasks file path: ${pathValidation.error}`,
          "Open Settings",
          "Use Default"
        );

        if (action === "Open Settings") {
          vscode.commands.executeCommand(
            "workbench.action.openSettings",
            "aidmVscodeExtension.tasks.filePath"
          );
        } else if (action === "Use Default") {
          await config.update(
            "tasks.filePath",
            "tasks.json",
            vscode.ConfigurationTarget.Workspace
          );
          vscode.window.showInformationMessage(
            "Tasks file path reset to default: tasks.json"
          );
        }

        return; // Skip file watching setup
      }

      // Create VSCode native file system watcher
      const workspaceFolders = vscode.workspace.workspaceFolders;
      if (workspaceFolders && workspaceFolders.length > 0) {
        const workspaceFolder = workspaceFolders[0];
        const filePattern = new vscode.RelativePattern(
          workspaceFolder,
          configuredTasksPath
        );
        const fileWatcher =
          vscode.workspace.createFileSystemWatcher(filePattern);

        // Setup change handlers
        const handleFileChange = async () => {
          try {
            await tasksDataService.refreshTasks();

            if (taskDetailProvider) {
              taskDetailProvider.refreshRelativeTimes().catch((error) => {
                console.error("Failed to refresh detail panel times:", error);
              });
            }
          } catch (error) {
            console.error("❌ Error refreshing data after file change:", error);
          }
        };

        fileWatcher.onDidChange(handleFileChange);
        fileWatcher.onDidCreate(handleFileChange);
        fileWatcher.onDidDelete(() => {
          // TasksDataService will handle fallback automatically
        });

        // Add to subscriptions for proper cleanup
        context.subscriptions.push(fileWatcher);

      } else {
      }
    } catch (error) {
      console.error(
        "❌ VSCode FileSystemWatcher initialization failed:",
        error
      );
      vscode.window.showErrorMessage(
        `Failed to setup file monitoring: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
      // Continue without file watching - extension will still function
    }

    console.log(
      "=== ACTIVATION STEP 8.8: TaskDetailCardProvider webview registration removed ==="
    );
    console.log(
      "ℹ️ TaskDetailCardProvider instance preserved for potential future use"
    );

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
          // Time refresh interval cleared
        },
      });
    } catch (error) {
      console.error("Periodic time refresh setup failed:", error);
      // Continue without periodic refresh
    }

    // Expose TaskDetailCardProvider methods for external use (e.g., tree view integration)
    // This enables other components to update the detail panel when tasks are selected
    context.subscriptions.push({
      dispose: () => {
        if (taskDetailProvider) {
          taskDetailProvider.dispose();
        }
        if (taskWebviewProvider) {
          taskWebviewProvider.dispose?.();
        }
      },
    });

    try {
      // Create TaskWebviewProvider with TasksDataService, context, and optional authService
      taskWebviewProvider = new TaskWebviewProvider(tasksDataService, context, authService);

      // Register webview view provider with VSCode
      const webviewProviderDisposable =
        vscode.window.registerWebviewViewProvider(
          "aidm-vscode-extension.tasks-list",
          taskWebviewProvider
        );
      context.subscriptions.push(webviewProviderDisposable);

      // FIXED: Removed setTimeout and initializeData() call - webview now initializes itself
      // when VSCode calls resolveWebviewView() method, preventing race conditions
      // TaskWebviewProvider now handles its own initialization in resolveWebviewView()
      // This follows VSCode API best practices and prevents race conditions
    } catch (error) {
      console.error("TaskWebviewProvider registration failed:", error);
      throw error;
    }

    console.log(
      "=== ACTIVATION STEP 8.10.5: Webview initialization completed ==="
    );
    console.log(
      "✅ TaskWebviewProvider is now registered and will display in sidebar"
    );

    try {
      // Setup comprehensive UI event synchronization between components
      // Note: This is called after TaskWebviewProvider is initialized
      const uiSyncSubscriptions =
        setupUIEventSynchronization(taskWebviewProvider);

      // Add all UI synchronization subscriptions to context for proper cleanup
      uiSyncSubscriptions.forEach((subscription: vscode.Disposable) => {
        context.subscriptions.push(subscription);
      });
    } catch (error) {
      console.error("UI synchronization event wiring failed:", error);
      // Continue without event synchronization
    }

    // Connect process manager status to status bar
    processManager.onStatusChange((status: ConnectionStatus) => {
      statusBarManager.updateConnectionStatus(status);
    });

    try {
      await startMCPServer();
    } catch (error) {
      console.error("MCP Server start failed:", error);
      // Don't throw here - let extension continue without MCP server
    }

    try {
      const hoverProvider = new BusinessContextHover(mcpClient);
      const hoverDisposable = vscode.languages.registerHoverProvider(
        { scheme: "file", language: "typescript" },
        hoverProvider
      );
      context.subscriptions.push(hoverDisposable);
    } catch (error) {
      console.error("Hover provider registration failed:", error);
      // Continue without hover provider
    }


    // Register show tasks command
    try {
      const showTasksCommand = vscode.commands.registerCommand(
        getCommandId("showTasks"),
        () => {
          try {
            // Show the tasks webview in the sidebar
            vscode.commands.executeCommand(
              "workbench.view.extension.aidm-vscode-extension"
            );
          } catch (error) {
            vscode.window.showErrorMessage(
              `Failed to show tasks: ${
                error instanceof Error ? error.message : "Unknown error"
              }`
            );
            console.error("ShowTasks command error:", error);
          }
        }
      );
      context.subscriptions.push(showTasksCommand);
    } catch (error) {
      console.error("showTasks command failed:", error);
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
    } catch (error) {
      console.error("refreshTasks command failed:", error);
    }

    // REF-021: Removed excessive commands - kept only essential commands

    // Register progressive authentication login command - PROGRESSIVE-002
    try {
      const loginCommand = vscode.commands.registerCommand(
        getCommandId("login"),
        async () => {
          if (!authService) {
            vscode.window.showWarningMessage("Authentication service not available");
            return;
          }

          try {
            // Check if SSO is configured
            const isSSOConfigured = CONFIG.auth.clientId && CONFIG.auth.clientId.trim() !== '';

            // Build auth method options based on SSO configuration
            const authOptions = ['Username/Password'];
            if (isSSOConfigured) {
              authOptions.push('Single Sign-On (OAuth)');
            }

            // Show input box for credentials or OAuth flow
            const authMethod = await vscode.window.showQuickPick(
              authOptions,
              {
                placeHolder: 'Select authentication method',
                title: 'Sign in to AiDM Extension'
              }
            );

            if (!authMethod) {
              return; // User cancelled
            }

            let result;
            if (authMethod === 'Username/Password') {
              const username = await vscode.window.showInputBox({
                prompt: 'Enter your username',
                placeHolder: 'username'
              });

              if (!username) {
                return;
              }

              const password = await vscode.window.showInputBox({
                prompt: 'Enter your password',
                password: true,
                placeHolder: 'password'
              });

              if (!password) {
                return;
              }

              result = await authService.loginWithCredentials(username, password, false);
            } else {
              result = await authService.performOAuthLogin();
            }

            if (result.success) {
              vscode.window.showInformationMessage('Successfully signed in!');
              // Refresh webview to show authenticated state
              if (taskWebviewProvider) {
                await taskWebviewProvider.refreshContent();
              }
            } else {
              vscode.window.showErrorMessage(`Login failed: ${result.message}`);
            }
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
            vscode.window.showErrorMessage(`Authentication failed: ${errorMessage}`);
            console.error("Login command error:", error);
          }
        }
      );
      context.subscriptions.push(loginCommand);
    } catch (error) {
      console.error("login command failed:", error);
    }

    // Register logout command for completeness - PROGRESSIVE-002
    try {
      const logoutCommand = vscode.commands.registerCommand(
        getCommandId("logout"),
        async () => {
          if (!authService) {
            vscode.window.showWarningMessage("Authentication service not available");
            return;
          }

          try {
            await authService.logout();
            vscode.window.showInformationMessage('Successfully signed out');
            // Refresh webview to show unauthenticated state
            if (taskWebviewProvider) {
              await taskWebviewProvider.refreshContent();
            }
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
            vscode.window.showErrorMessage(`Logout failed: ${errorMessage}`);
            console.error("Logout command error:", error);
          }
        }
      );
      context.subscriptions.push(logoutCommand);
    } catch (error) {
      console.error("logout command failed:", error);
    }

    // Register openDiff command for git diff functionality
    try {
      const openDiffCommand = vscode.commands.registerCommand(
        "aidm.openDiff",
        async (uriString: string) => {
          // Parameter validation
          if (!uriString || typeof uriString !== "string") {
            vscode.window.showErrorMessage(
              "File URI is required and must be a string"
            );
            return;
          }

          try {
            // Parse the URI and construct git diff
            const fileUri = vscode.Uri.parse(uriString);
            const gitUri = vscode.Uri.parse(`git:${fileUri.fsPath}`);

            await vscode.commands.executeCommand(
              "vscode.diff",
              gitUri,
              fileUri,
              `${path.basename(fileUri.fsPath)} (Git Diff)`
            );
          } catch (error) {
            const errorMessage =
              error instanceof Error ? error.message : "Unknown error occurred";
            console.error("openDiff command failed:", error);
            vscode.window.showErrorMessage(
              `Failed to open diff view: ${errorMessage}`
            );
          }
        }
      );
      context.subscriptions.push(openDiffCommand);
    } catch (error) {
      console.error("openDiff command failed:", error);
    }

    // Expansion diagnostics command removed - replaced by webview-based diagnostics

    // Register configuration change listener
    try {
      const configChangeDisposable = vscode.workspace.onDidChangeConfiguration(
        async (event: vscode.ConfigurationChangeEvent) => {
          if (event.affectsConfiguration(EXTENSION_CONFIG.configNamespace)) {

            const config = vscode.workspace.getConfiguration();

            // PATH-003: Validate tasks file path configuration
            const tasksPathValid = await handleConfigurationValidation(
              config,
              getConfigKey("tasks.filePath")
            );

            if (!tasksPathValid) {
              return;
            }

            // Continue with existing configuration update logic only if validation passes
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
              mcpClient.updateConfig(
                newProcessConfig.port!,
                newProcessConfig.timeout!
              );

              // PATH-003: If tasks path changed, reinitialize file watcher
              if (event.affectsConfiguration(getConfigKey("tasks.filePath"))) {

                // Get new tasks path
                const newTasksPath = config.get<string>(
                  getConfigKey("tasks.filePath"),
                  "tasks.json"
                );

                // Validate new path
                const pathValidation = validateTasksFilePath(newTasksPath);
                if (pathValidation.isValid) {
                  // Create new VSCode FileSystemWatcher
                  const workspaceFolders = vscode.workspace.workspaceFolders;
                  if (workspaceFolders && workspaceFolders.length > 0) {
                    const workspaceFolder = workspaceFolders[0];
                    const filePattern = new vscode.RelativePattern(
                      workspaceFolder,
                      newTasksPath
                    );
                    const fileWatcher =
                      vscode.workspace.createFileSystemWatcher(filePattern);

                    // Setup change handlers
                    const handleFileChange = async () => {
                      try {
                        console.log(
                          "📁 Tasks file changed, refreshing data..."
                        );
                        await tasksDataService.refreshTasks();

                        if (taskDetailProvider) {
                          taskDetailProvider
                            .refreshRelativeTimes()
                            .catch((error) => {
                              console.error(
                                "Failed to refresh detail panel times:",
                                error
                              );
                            });
                        }

                      } catch (error) {
                        console.error(
                          "Error refreshing data after file change:",
                          error
                        );
                      }
                    };

                    fileWatcher.onDidChange(handleFileChange);
                    fileWatcher.onDidCreate(handleFileChange);
                    fileWatcher.onDidDelete(() => {
                      // TasksDataService will handle fallback automatically
                    });

                    // Add to subscriptions for proper cleanup
                    context.subscriptions.push(fileWatcher);

                  }
                } else {
                }
              }

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
    } catch (error) {
      console.error("Configuration change listener failed:", error);
    }

    // Add disposables to context
    context.subscriptions.push(statusBarManager, debugChannel, {
      dispose: () => {
        // Cleanup process manager
        if (processManager) {
          processManager.shutdown().catch((error) => {
            console.error("Error during process manager shutdown:", error);
          });
        }
      },
    });


    vscode.window.showInformationMessage(EXTENSION_CONFIG.successMessage);
  } catch (error) {
    console.error(`ACTIVATION FAILED:`, error);
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
    // Use configured port from settings (no dynamic port finding)
    const port = processManager.getPort();
    mcpClient.updateConfig(port, processManager.getTimeout());
    await processManager.start();

    // Get the actual port the server is running on
    const actualPort = processManager.getActualPort();

    // Log server status to debug channel instead of user notification
    debugChannel.appendLine(`MCP Server started on port ${actualPort}`);
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

  try {
    // Commands and providers are automatically disposed via context.subscriptions
    // This includes all registered commands, tree data providers, and webview providers

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

    // Dispose task webview provider if it exists
    if (taskWebviewProvider) {
      taskWebviewProvider.dispose?.();
    }

    // Dispose MCP client if it exists
    if (mcpClient) {
      // Note: MCPClient doesn't have a dispose method, but we can clean up any resources
    }

    // Additional cleanup for any global state or timers
  } catch (error) {
    console.error("AIDM VSCode Extension: Error during deactivation:", error);
  } finally {
  }
}
