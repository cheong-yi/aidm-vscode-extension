/**
 * TasksDataService - Basic class structure for task data management
 * Recovery Task 2.1.1: Minimal class that compiles and can be instantiated
 * Recovery Task 2.2.1: Interface definition and stub methods
 * Recovery Task 2.2.4: Connect to TaskStatusManager for real data flow
 * Recovery Task 2.3.1: Add EventEmitter infrastructure for task updates
 * Recovery Task 2.3.2: Add Error Event Emitter infrastructure for error events
 * Recovery Task 2.4.1: Add HTTP client setup and JSON-RPC infrastructure
 * PATH-002: Enhanced file loading error handling with user guidance
 * PATH-FIX-004: Enhanced error context logging with workspace and path information for debugging
 * Requirements: 3.1-3.6, 4.1-4.4, 7.1-7.6
 */

import { EventEmitter, workspace } from "vscode";
import axios, { AxiosInstance } from "axios";
import * as path from "path";
import {
  Task,
  TaskStatus,
  TaskComplexity,
  TaskPriority,
  TaskErrorResponse,
} from "../types/tasks";
import { JSONTaskParser } from "./JSONTaskParser";
import { MockDataProvider } from "../mock";
import * as vscode from "vscode";

interface ITasksDataService {
  getTasks(): Promise<Task[]>;
  getTaskById(id: string): Promise<Task | null>;
}

export class TasksDataService implements ITasksDataService {
  // Event emitter for task updates - Recovery Task 2.3.1
  public readonly onTasksUpdated: EventEmitter<Task[]> = new EventEmitter<
    Task[]
  >();

  // Event emitter for error events - Recovery Task 2.3.2
  public readonly onError: EventEmitter<TaskErrorResponse> =
    new EventEmitter<TaskErrorResponse>();

  // HTTP client for JSON-RPC communication - Recovery Task 2.4.1
  protected httpClient!: AxiosInstance;
  private serverUrl: string; // Changed from readonly to mutable for initialization
  private isInitialized: boolean = false;

  constructor(
    private jsonTaskParser: JSONTaskParser,
    private mockDataProvider: MockDataProvider
  ) {
    // Configuration will be set in initialize() method to avoid timing race condition
    this.serverUrl = ""; // Will be set by initialize()
  }

  // Task 6.1.2: Async initialization method to fix workspace configuration race condition
  // WS-002: Add workspace availability check to ensure safe initialization
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return; // Already initialized
    }

    try {
      // WS-002: Check workspace availability using VSCode API before proceeding
      const workspaceFolders = vscode.workspace.workspaceFolders;

      if (!workspaceFolders || workspaceFolders.length === 0) {
        throw new Error(
          "No workspace folders available. Please open a folder or workspace."
        );
      }

      console.log(
        `[TasksDataService] Workspace available with ${workspaceFolders.length} folder(s)`
      );

      // WS-002: Proceed with existing initialization logic using new getTasksFileUri method
      const configuredPath = vscode.workspace
        .getConfiguration()
        .get<string>("aidmVscodeExtension.tasks.filePath", "tasks.json");

      const tasksFileUri = await this.getTasksFileUri(configuredPath);

      if (!tasksFileUri) {
        // File doesn't exist, but workspace is available - this is acceptable
        console.warn(
          `[TasksDataService] Tasks file not found: ${configuredPath}. Will use mock data.`
        );
      } else {
        console.log(
          `[TasksDataService] Tasks file found at: ${tasksFileUri.fsPath}`
        );
      }

      // Get port from VS Code configuration when workspace is ready
      const config = workspace.getConfiguration();
      const port = config.get<number>(
        "aidmVscodeExtension.mcpServer.port",
        3001
      );
      this.serverUrl = `http://localhost:${port}`;

      // Setup HTTP client after configuration is loaded
      this.setupHttpClient();

      this.isInitialized = true;
      console.log(
        `[TasksDataService] Initialized with server URL: ${this.serverUrl}`
      );
    } catch (error) {
      // PATH-FIX-004: Enhanced error logging with path context for debugging
      console.error("TasksDataService.initialize Error Details:");
      console.error(
        "- Workspace folders:",
        vscode.workspace.workspaceFolders?.map((f) => f.uri.toString())
      );
      console.error(
        "- Configured path:",
        vscode.workspace
          .getConfiguration("aidmVscodeExtension")
          .get("tasks.filePath")
      );
      console.error("- Error:", error);

      console.error("[TasksDataService] Initialization failed:", error);
      throw new Error(
        `Failed to initialize TasksDataService: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }

  // Task 6.1.2: Helper method to ensure service is initialized
  private ensureInitialized(): void {
    if (!this.isInitialized) {
      throw new Error(
        "TasksDataService must be initialized before use. Call initialize() first."
      );
    }
  }

  // Recovery Task 2.4.1: Setup HTTP client with axios configuration
  private setupHttpClient(): void {
    this.httpClient = axios.create({
      baseURL: this.serverUrl,
      timeout: 5000,
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
    });
  }

  // Method for testing - allows injection of mock HTTP client
  protected setHttpClientForTesting(client: AxiosInstance): void {
    this.httpClient = client;
  }

  // Recovery Task 2.4.2: Real JSON-RPC communication implementation
  public async makeJSONRPCCall(method: string, params?: any): Promise<any> {
    // Ensure service is initialized before making HTTP calls
    this.ensureInitialized();

    const request = {
      jsonrpc: "2.0",
      id: Date.now(),
      method,
      params,
    };

    try {
      const response = await this.httpClient.post("/jsonrpc", request);
      return response.data;
    } catch (error) {
      // PATH-FIX-004: Enhanced error logging with path context for debugging
      console.error("TasksDataService.makeJSONRPCCall Error Details:");
      console.error(
        "- Workspace folders:",
        vscode.workspace.workspaceFolders?.map((f) => f.uri.toString())
      );
      console.error(
        "- Configured path:",
        vscode.workspace
          .getConfiguration("aidmVscodeExtension")
          .get("tasks.filePath")
      );
      console.error("- Server URL:", this.serverUrl);
      console.error("- Method:", method);
      console.error("- Error:", error);

      throw new Error(
        `HTTP request failed: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }

  // UPDATED: Prioritize .aidm/.tasks → File → MCP → Mock fallback chain
  async getTasks(): Promise<Task[]> {
    console.log("[TasksDataService] getTasks() called");

    // Priority 1: Load from .aidm/.tasks (synced from API)
    try {
      const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
      if (workspaceFolder) {
        const { TaskPersistenceService } = await import('./TaskPersistenceService');
        const persistenceService = new TaskPersistenceService();

        const tasksFromPersistence = await persistenceService.loadTasks(workspaceFolder);
        if (tasksFromPersistence.length > 0) {
          console.log(
            `[TasksDataService] Loaded ${tasksFromPersistence.length} tasks from .aidm/.tasks`
          );
          return tasksFromPersistence;
        }
      }
    } catch (error) {
      console.warn('[TasksDataService] Could not load from .aidm/.tasks:', error);
    }

    // Priority 2: Load from configured task file (legacy support)
    try {
      console.log(
        "[TasksDataService] Attempting file parsing fallback from configured path"
      );

      const configuredUri = this.getConfiguredFileUri();
      const fallbackUri = await this.getTasksFileUri("tasks.json");
      const fileUri = configuredUri || fallbackUri;

      if (fileUri) {
        try {
          const parsedTasks = await this.jsonTaskParser.parseTasksFromFile(
            fileUri
          );
          console.log(
            `[TasksDataService] Retrieved ${parsedTasks.length} tasks from file parser`
          );
          return parsedTasks;
        } catch (parseError) {
          const taskError = this.handleFileLoadingError(
            parseError as Error,
            fileUri.fsPath,
            "file_validation"
          );
          this.onError.fire(taskError);
        }
      }
    } catch (fileError) {
      console.error("TasksDataService.getTasks File Loading Error:", fileError);
    }

    // Priority 3: Try MCP server
    try {
      console.log(
        "[TasksDataService] Attempting MCP server call for tasks/list"
      );
      const response = await this.makeJSONRPCCall("tasks/list");

      if (response.error) {
        throw new Error(`MCP server error: ${response.error.message}`);
      }

      if (response.result?.content?.[0]?.text) {
        try {
          const parsedContent = JSON.parse(response.result.content[0].text);
          const mcpTasks = parsedContent.tasks || [];
          console.log(
            `[TasksDataService] Retrieved ${mcpTasks.length} tasks from MCP server`
          );
          return mcpTasks;
        } catch (parseError) {
          console.warn("Failed to parse MCP response content:", parseError);
        }
      }
    } catch (error) {
      console.warn(
        "MCP server unavailable:",
        error instanceof Error ? error.message : String(error)
      );
    }

    // All task loading methods failed - return empty array
    console.warn("[TasksDataService] All task loading methods failed - no tasks available");
    return [];
  }

  // Legacy method - kept for backward compatibility
  private async legacyGetTasks(): Promise<Task[]> {
    try {
      console.log(
        "[TasksDataService] Attempting MCP server call for tasks/list"
      );
      const response = await this.makeJSONRPCCall("tasks/list");

      if (response.error) {
        throw new Error(`MCP server error: ${response.error.message}`);
      }

      if (response.result?.content?.[0]?.text) {
        try {
          const parsedContent = JSON.parse(response.result.content[0].text);
          const mcpTasks = parsedContent.tasks || [];
          console.log(
            `[TasksDataService] Retrieved ${mcpTasks.length} tasks from MCP server`
          );
          return mcpTasks;
        } catch (parseError) {
          console.warn("Failed to parse MCP response content:", parseError);
          return [];
        }
      }

      console.log(
        "[TasksDataService] No MCP response content, returning empty array"
      );
      return [];
    } catch (error) {
      console.warn(
        "MCP server unavailable, falling back to file reading:",
        error instanceof Error ? error.message : String(error)
      );

      try {
        console.log(
          "[TasksDataService] Attempting file parsing fallback from configured path"
        );

        // PATH-002: Use existing JSONTaskParser with enhanced error handling
        // Task 6.1.3: Replace hardcoded path fallback with workspace-relative path resolution

        // PATH-DEBUG-001: Comprehensive workspace root diagnostic logging
        console.log("[TasksDataService] === WORKSPACE ROOT DIAGNOSTIC ===");

        // Validate workspace folders array
        const workspaceFolders = workspace.workspaceFolders;
        console.log(
          `[TasksDataService] Workspace folders count: ${
            workspaceFolders?.length || 0
          }`
        );
        console.log(
          `[TasksDataService] Workspace folders array:`,
          workspaceFolders
        );

        if (workspaceFolders && workspaceFolders.length > 0) {
          const firstFolder = workspaceFolders[0];
          console.log(
            `[TasksDataService] First workspace folder:`,
            firstFolder
          );
          console.log(`[TasksDataService] First folder URI:`, firstFolder.uri);
          console.log(
            `[TasksDataService] First folder URI.toString():`,
            firstFolder.uri.toString()
          );
          console.log(
            `[TasksDataService] First folder fsPath:`,
            firstFolder.uri.fsPath
          );
          console.log(
            `[TasksDataService] fsPath length: ${
              firstFolder.uri.fsPath?.length || 0
            }`
          );
          console.log(
            `[TasksDataService] fsPath type: ${typeof firstFolder.uri.fsPath}`
          );

          // Character-by-character analysis for path corruption detection
          if (firstFolder.uri.fsPath) {
            console.log(
              `[TasksDataService] fsPath first 5 characters:`,
              JSON.stringify(firstFolder.uri.fsPath.substring(0, 5))
            );
            console.log(
              `[TasksDataService] fsPath last 5 characters:`,
              JSON.stringify(firstFolder.uri.fsPath.substring(-5))
            );
          }
        } else {
          console.log(
            `[TasksDataService] ERROR: No workspace folders detected`
          );
        }

        console.log("[TasksDataService] === END WORKSPACE DIAGNOSTIC ===");

        const configuredUri = this.getConfiguredFileUri();
        const fallbackUri = await this.getTasksFileUri("tasks.json");
        const fileUri = configuredUri || fallbackUri;

        if (!fileUri) {
          console.warn(
            "[TasksDataService] No file path available, falling back to mock data"
          );
          const mockTasks = await this.mockDataProvider.getTasks();
          console.log(
            `[TasksDataService] Retrieved ${mockTasks.length} tasks from mock data provider`
          );
          return mockTasks;
        }

        try {
          const parsedTasks = await this.jsonTaskParser.parseTasksFromFile(
            fileUri
          );
          console.log(
            `[TasksDataService] Retrieved ${parsedTasks.length} tasks from file parser`
          );
          console.log("✅ TasksDataService method calls updated successfully");
          return parsedTasks;
        } catch (parseError) {
          // PATH-002: Enhanced error handling for file parsing failures
          const taskError = this.handleFileLoadingError(
            parseError as Error,
            fileUri.fsPath,
            "file_validation"
          );
          this.onError.fire(taskError);

          // Re-throw to trigger mock data fallback
          throw parseError;
        }
      } catch (fileError) {
        // PATH-FIX-004: Enhanced error logging with path context for debugging
        console.error("TasksDataService.getTasks File Loading Error Details:");
        console.error(
          "- Workspace folders:",
          vscode.workspace.workspaceFolders?.map((f) => f.uri.toString())
        );
        console.error(
          "- Configured path:",
          vscode.workspace
            .getConfiguration("aidmVscodeExtension")
            .get("tasks.filePath")
        );
        console.error("- File Error:", fileError);

        // PATH-002: Enhanced error handling for file loading failures
        console.log("[TasksDataService] Falling back to mock data provider");
        const mockTasks = await this.mockDataProvider.getTasks();
        console.log(
          `[TasksDataService] Retrieved ${mockTasks.length} tasks from mock data provider`
        );
        return mockTasks;
      }
    }
  }

  // Recovery Task 2.4.3: Replace with real JSON-RPC call to MCP server
  async getTaskById(id: string): Promise<Task | null> {
    console.log(`[TasksDataService] getTaskById(${id}) called`);

    try {
      console.log(
        `[TasksDataService] Attempting MCP server call for tasks/get with id: ${id}`
      );
      const response = await this.makeJSONRPCCall("tasks/get", { id });

      if (response.error) {
        throw new Error(`MCP server error: ${response.error.message}`);
      }

      const task = response.result?.task || null;
      if (task) {
        console.log(`[TasksDataService] Retrieved task ${id} from MCP server`);
      } else {
        console.log(`[TasksDataService] Task ${id} not found in MCP server`);
      }
      return task;
    } catch (error) {
      // PATH-FIX-004: Enhanced error logging with path context for debugging
      console.error("TasksDataService.getTaskById Error Details:");
      console.error(
        "- Workspace folders:",
        vscode.workspace.workspaceFolders?.map((f) => f.uri.toString())
      );
      console.error(
        "- Configured path:",
        vscode.workspace
          .getConfiguration("aidmVscodeExtension")
          .get("tasks.filePath")
      );
      console.error("- Task ID:", id);
      console.error("- Error:", error);

      // Only fallback to TaskStatusManager on actual HTTP failures, not MCP server errors
      if (
        error instanceof Error &&
        error.message.startsWith("MCP server error:")
      ) {
        // Re-throw MCP server errors to the caller
        throw error;
      }

      // Fallback to file parsing if HTTP fails (network issues, timeouts, etc.)
      console.warn(
        "HTTP call failed, falling back to file parsing:",
        error instanceof Error ? error.message : String(error)
      );
      console.log(
        `[TasksDataService] Falling back to file parsing for task ${id}`
      );
      
      try {
        const allTasks = await this.getTasks();
        const fallbackTask = allTasks.find(task => task.id === id) || null;
        if (fallbackTask) {
          console.log(
            `[TasksDataService] Retrieved task ${id} from file parsing fallback`
          );
        } else {
          console.log(
            `[TasksDataService] Task ${id} not found in file parsing fallback`
          );
        }
        return fallbackTask;
      } catch (fallbackError) {
        console.error(`[TasksDataService] File parsing fallback failed:`, fallbackError);
        return null;
      }
    }
  }

  // Recovery Task 2.4.4: Add updateTaskStatus method with JSON-RPC communication
  async updateTaskStatus(id: string, status: TaskStatus): Promise<boolean> {
    console.log(`[TasksDataService] updateTaskStatus(${id}, ${status}) called`);

    try {
      console.log(
        `[TasksDataService] Attempting MCP server call for tasks/update-status`
      );
      const response = await this.makeJSONRPCCall("tasks/update-status", {
        id,
        newStatus: status,
      });

      if (response.error) {
        throw new Error(`MCP server error: ${response.error.message}`);
      }

      const success = response.result?.success || false;

      if (success) {
        console.log(
          `[TasksDataService] Successfully updated task ${id} status via MCP server`
        );
        // Fire onTasksUpdated event after successful update
        // Refresh tasks to get the updated status
        const updatedTasks = await this.getTasks();
        this.onTasksUpdated.fire(updatedTasks);
      } else {
        console.log(
          `[TasksDataService] MCP server returned false for task ${id} status update`
        );
      }

      return success;
    } catch (error) {
      // PATH-FIX-004: Enhanced error logging with path context for debugging
      console.error("TasksDataService.updateTaskStatus Error Details:");
      console.error(
        "- Workspace folders:",
        vscode.workspace.workspaceFolders?.map((f) => f.uri.toString())
      );
      console.error(
        "- Configured path:",
        vscode.workspace
          .getConfiguration("aidmVscodeExtension")
          .get("tasks.filePath")
      );
      console.error("- Task ID:", id);
      console.error("- New Status:", status);
      console.error("- Error:", error);

      // Check if this is an MCP server error - if so, re-throw it
      if (
        error instanceof Error &&
        error.message.startsWith("MCP server error:")
      ) {
        throw error;
      }

      // Fire error event and fallback to TaskStatusManager for HTTP failures
      this.onError.fire({
        operation: "status_update",
        taskId: id,
        suggestedAction: "retry",
        userInstructions: `Failed to update task status: ${
          error instanceof Error ? error.message : String(error)
        }`,
        technicalDetails:
          error instanceof Error ? error.message : String(error),
      });

      console.warn(
        "HTTP call failed, status update not possible:",
        error instanceof Error ? error.message : String(error)
      );
      console.log(
        `[TasksDataService] Status update failed for task ${id} - no fallback mechanism available`
      );
      // TaskStatusManager didn't actually implement status updates, so we return false
      return false;
    }
  }

  // Task 4.4.1: Add refreshTasks method for manual task refresh
  // PATH-002: Enhanced with comprehensive file loading error handling
  // Task 6.1.6: Fixed event timing to ensure complete data before UI notification
  // RFS-001: Bypass MCP server call to fix file watching refresh mechanism
  async refreshTasks(): Promise<void> {
    console.log("[TasksDataService] refreshTasks() called");

    try {
      // Skip MCP server refresh call - use direct task loading instead
      console.log(
        "[TasksDataService] Using direct task loading (bypassing MCP refresh)"
      );

      // Use existing getTasks method which has robust fallback logic
      const updatedTasks = await this.getTasks();

      // Task 6.1.6: Only fire event after successful completion with complete data
      if (updatedTasks && Array.isArray(updatedTasks)) {
        console.log(
          `[TasksDataService] Firing onTasksUpdated event with ${updatedTasks.length} tasks from direct loading`
        );
        this.onTasksUpdated.fire(updatedTasks);
      } else {
        console.log(
          "[TasksDataService] Direct loading returned invalid data, not firing event"
        );
      }
    } catch (error) {
      console.error(
        "TasksDataService.refreshTasks Direct Loading Error:",
        error
      );

      try {
        // Final fallback to mock data
        const mockTasks = await this.mockDataProvider.getTasks();
        console.log(
          `[TasksDataService] Using mock data fallback with ${mockTasks.length} tasks`
        );

        if (mockTasks && Array.isArray(mockTasks)) {
          this.onTasksUpdated.fire(mockTasks);
        } else {
          this.onTasksUpdated.fire([]);
        }
      } catch (mockError) {
        console.error(
          "[TasksDataService] All refresh methods failed:",
          mockError
        );
        this.onTasksUpdated.fire([]);
      }
    }

    console.log("[TasksDataService] refreshTasks completed");
  }

  // PATH-002: Enhanced error handling for file loading operations
  private handleFileLoadingError(
    error: Error,
    filePath: string,
    operation: string
  ): TaskErrorResponse {
    let userInstructions: string;
    let errorType:
      | "file_not_found"
      | "permission_denied"
      | "json_parse_error"
      | "validation_error"
      | "unknown_error";

    if (
      error.message.includes("ENOENT") ||
      error.message.includes("no such file")
    ) {
      errorType = "file_not_found";
      userInstructions = `Tasks file not found at: ${filePath}\n\nSolutions:\n1. Create a tasks.json file in your workspace root\n2. Update the 'aidmVscodeExtension.tasks.filePath' setting\n3. Use mock data for testing`;
    } else if (
      error.message.includes("EACCES") ||
      error.message.includes("permission")
    ) {
      errorType = "permission_denied";
      userInstructions = `Permission denied accessing: ${filePath}\n\nSolutions:\n1. Check file permissions\n2. Run VS Code as administrator (if needed)\n3. Move file to accessible location`;
    } else if (error.message.includes("JSON") || error.name === "SyntaxError") {
      errorType = "json_parse_error";
      userInstructions = `Invalid JSON in tasks file: ${filePath}\n\nSolutions:\n1. Check JSON syntax with online validator\n2. Look for missing commas, brackets, or quotes\n3. View specific error: ${error.message}`;
    } else {
      errorType = "unknown_error";
      userInstructions = `Unexpected error loading tasks file: ${error.message}\n\nSolutions:\n1. Check VS Code developer console for details\n2. Try reloading the window\n3. Report issue if problem persists`;
    }

    const taskError: TaskErrorResponse = {
      operation: operation as any,
      userInstructions,
      technicalDetails: error.message,
    };

    console.error(`[TasksDataService] ${operation} failed:`, {
      error: error.message,
      filePath,
      errorType,
      userInstructions,
    });

    return taskError;
  }

  private validateJsonStructure(data: any): {
    isValid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    if (!data || typeof data !== "object") {
      errors.push("Root must be an object");
      return { isValid: false, errors };
    }

    // Check for at least one context
    const contexts = Object.keys(data);
    if (contexts.length === 0) {
      errors.push('At least one context (e.g., "master") must be defined');
      return { isValid: false, errors };
    }

    // Validate each context
    for (const contextName of contexts) {
      const context = data[contextName];

      if (!context || typeof context !== "object") {
        errors.push(`Context "${contextName}" must be an object`);
        continue;
      }

      if (!Array.isArray(context.tasks)) {
        errors.push(`Context "${contextName}" must have a "tasks" array`);
        continue;
      }

      // Validate task structure
      context.tasks.forEach((task: any, index: number) => {
        if (!task.id) {
          errors.push(
            `Task ${index + 1} in "${contextName}" missing required "id" field`
          );
        }
        if (!task.title) {
          errors.push(
            `Task ${
              index + 1
            } in "${contextName}" missing required "title" field`
          );
        }
        if (!task.status) {
          errors.push(
            `Task ${
              index + 1
            } in "${contextName}" missing required "status" field`
          );
        }
      });
    }

    return { isValid: errors.length === 0, errors };
  }

  private async loadTasksFromFile(fileUri: vscode.Uri): Promise<any> {
    try {
      // Check if file exists first using VS Code API
      try {
        await vscode.workspace.fs.stat(fileUri);
      } catch (error) {
        if (
          error instanceof vscode.FileSystemError &&
          error.code === "FileNotFound"
        ) {
          const error = new Error(
            `ENOENT: no such file or directory, open '${fileUri.fsPath}'`
          );
          const taskError = this.handleFileLoadingError(
            error,
            fileUri.fsPath,
            "file_validation"
          );
          this.onError.fire(taskError);
          throw error;
        }
        throw error;
      }

      // Read file content using VS Code API
      const fileContent = await vscode.workspace.fs.readFile(fileUri);
      const contentString = Buffer.from(fileContent).toString("utf8");

      // Parse JSON
      let jsonData;
      try {
        jsonData = JSON.parse(contentString);
      } catch (parseError) {
        const taskError = this.handleFileLoadingError(
          parseError as Error,
          fileUri.fsPath,
          "file_validation"
        );
        this.onError.fire(taskError);
        throw parseError;
      }

      // Validate structure
      const validation = this.validateJsonStructure(jsonData);
      if (!validation.isValid) {
        const validationError = new Error(
          `Tasks file validation failed: ${validation.errors.join("; ")}`
        );
        const taskError = this.handleFileLoadingError(
          validationError,
          fileUri.fsPath,
          "file_validation"
        );
        this.onError.fire(taskError);
        throw validationError;
      }

      console.log(
        `[TasksDataService] Successfully loaded tasks from: ${fileUri.fsPath}`
      );
      return jsonData;
    } catch (error) {
      // PATH-FIX-004: Enhanced error logging with path context for debugging
      console.error("TasksDataService.loadTasksFromFile Error Details:");
      console.error(
        "- Workspace folders:",
        vscode.workspace.workspaceFolders?.map((f) => f.uri.toString())
      );
      console.error(
        "- Configured path:",
        vscode.workspace
          .getConfiguration("aidmVscodeExtension")
          .get("tasks.filePath")
      );
      console.error("- File URI:", fileUri.toString());
      console.error("- File fsPath:", fileUri.fsPath);
      console.error("- Error:", error);

      // Log error and re-throw (error already emitted above)
      console.error(
        `[TasksDataService] File loading failed for: ${fileUri.fsPath}`,
        error
      );
      throw error;
    }
  }

  private getConfiguredFileUri(): vscode.Uri | null {
    try {
      const config = workspace.getConfiguration();
      const filePath = config.get<string>("aidmVscodeExtension.tasks.filePath");

      if (
        !filePath ||
        typeof filePath !== "string" ||
        filePath.trim().length === 0
      ) {
        console.log(
          "[TasksDataService] No valid file path configured, using workspace fallback"
        );
        return null;
      }

      return this.resolveWorkspaceFileUri(filePath);
    } catch (error) {
      // PATH-FIX-004: Enhanced error logging with path context for debugging
      console.error("TasksDataService.getConfiguredFileUri Error Details:");
      console.error(
        "- Workspace folders:",
        vscode.workspace.workspaceFolders?.map((f) => f.uri.toString())
      );
      console.error(
        "- Configured path:",
        vscode.workspace
          .getConfiguration("aidmVscodeExtension")
          .get("tasks.filePath")
      );
      console.error("- Error:", error);

      console.error(
        "[TasksDataService] Failed to get configured file URI:",
        error
      );
      return null;
    }
  }

  /**
   * Resolve a file path to workspace-relative or absolute URI
   * Handles both relative and absolute paths using manual path construction for compatibility
   */
  private resolveWorkspaceFileUri(configuredPath: string): vscode.Uri | null {
    if (
      !configuredPath ||
      typeof configuredPath !== "string" ||
      configuredPath.trim().length === 0
    ) {
      return null;
    }

    const trimmedPath = configuredPath.trim();

    // Handle absolute paths directly
    if (path.isAbsolute(trimmedPath)) {
      const uri = vscode.Uri.file(trimmedPath);
      console.log(`[TasksDataService] Resolved absolute path: ${uri.fsPath}`);
      return uri;
    }

    // Handle relative paths with workspace resolution
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders || workspaceFolders.length === 0) {
      console.warn(
        `[TasksDataService] No workspace folders available for path: ${trimmedPath}`
      );
      return null;
    }

    // Manual path construction to bypass VS Code joinPath issues on Windows
    const workspaceFolder = workspaceFolders[0];
    const workspacePath = workspaceFolder.uri.fsPath;
    const fullPath = path.resolve(workspacePath, trimmedPath);
    const uri = vscode.Uri.file(fullPath);

    // Enhanced debug logging for path construction verification
    console.log("=== MANUAL PATH CONSTRUCTION DEBUG ===");
    console.log("- Workspace path:", workspacePath);
    console.log("- Configured path:", trimmedPath);
    console.log("- Resolved path:", fullPath);
    console.log("- Final URI:", uri.toString());
    console.log("- Final fsPath:", uri.fsPath);
    console.log("- Path separator check:", path.sep);
    console.log("- Platform:", process.platform);
    console.log("=== END PATH DEBUG ===");

    return uri;
  }

  // PATH-FIX-001: Manual path construction to bypass VS Code joinPath issues on Windows
  private async getTasksFileUri(
    configuredPath: string
  ): Promise<vscode.Uri | null> {
    try {
      const fileUri = this.resolveWorkspaceFileUri(configuredPath);

      if (!fileUri) {
        return null; // No workspace available or invalid path
      }

      // Log virtual workspace detection
      if (fileUri.scheme !== "file") {
        console.warn(
          "Virtual workspace detected - using VSCode filesystem API only"
        );
      }

      // Use VSCode filesystem API to check if file exists
      try {
        await vscode.workspace.fs.stat(fileUri);
        return fileUri;
      } catch (error: any) {
        if (error.code === "FileNotFound") {
          return null; // File doesn't exist - acceptable condition
        }
        // Re-throw other errors (permissions, network issues, etc.)
        throw error;
      }
    } catch (error) {
      // PATH-FIX-004: Enhanced error logging with path context for debugging
      console.error("TasksDataService.getTasksFileUri Error Details:");
      console.error(
        "- Workspace folders:",
        vscode.workspace.workspaceFolders?.map((f) => f.uri.toString())
      );
      console.error(
        "- Configured path:",
        vscode.workspace
          .getConfiguration("aidmVscodeExtension")
          .get("tasks.filePath")
      );
      console.error("- Input configuredPath:", configuredPath);
      console.error("- Error:", error);

      throw error;
    }
  }

  // ADDITION: Support resource-scoped configuration
  private getResourceScopedConfig(
    workspaceFolder: vscode.WorkspaceFolder
  ): string {
    const config = vscode.workspace.getConfiguration(
      "aidmVscodeExtension",
      workspaceFolder.uri
    );
    return config.get<string>("tasks.filePath", "tasks.json");
  }

  private processLoadedTasks(tasksData: any): void {
    // Extract tasks from the loaded data structure
    const allTasks: Task[] = [];

    for (const contextName of Object.keys(tasksData)) {
      const context = tasksData[contextName];
      if (context.tasks && Array.isArray(context.tasks)) {
        allTasks.push(...context.tasks);
      }
    }

    console.log(
      `[TasksDataService] Processed ${allTasks.length} tasks from file`
    );
    this.onTasksUpdated.fire(allTasks);
  }

  private async loadMockData(): Promise<void> {
    try {
      const mockTasks = await this.mockDataProvider.getTasks();
      console.log(`[TasksDataService] Loaded ${mockTasks.length} mock tasks`);
      // Task 6.1.6: Event firing is now handled by the calling method for proper timing
      // this.onTasksUpdated.fire(mockTasks); // Removed - handled by caller
    } catch (error) {
      // PATH-FIX-004: Enhanced error logging with path context for debugging
      console.error("TasksDataService.loadMockData Error Details:");
      console.error(
        "- Workspace folders:",
        vscode.workspace.workspaceFolders?.map((f) => f.uri.toString())
      );
      console.error(
        "- Configured path:",
        vscode.workspace
          .getConfiguration("aidmVscodeExtension")
          .get("tasks.filePath")
      );
      console.error("- Error:", error);

      console.error("[TasksDataService] Failed to load mock data:", error);
      // Fire error event for mock data loading failure
      this.onError.fire({
        operation: "file_validation",
        userInstructions:
          "Failed to load both file and mock data. Please check VS Code console for details.",
        technicalDetails:
          error instanceof Error ? error.message : String(error),
      });
      // Re-throw to allow caller to handle the error
      throw error;
    }
  }

  // Cleanup method for event emitters - Recovery Task 2.3.1 & 2.3.2
  dispose(): void {
    this.onTasksUpdated.dispose();
    this.onError.dispose();
  }
}

// PATH-FIX-004: Enhanced error context logging completed ✅
// All catch blocks now include comprehensive debugging information:
// - Workspace folders information
// - Configured path from VS Code settings
// - Method-specific context (file URIs, task IDs, etc.)
// - Detailed error information
// This will help debug future path construction and file access issues
