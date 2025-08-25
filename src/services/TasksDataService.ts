/**
 * TasksDataService - Basic class structure for task data management
 * Recovery Task 2.1.1: Minimal class that compiles and can be instantiated
 * Recovery Task 2.2.1: Interface definition and stub methods
 * Recovery Task 2.2.4: Connect to TaskStatusManager for real data flow
 * Recovery Task 2.3.1: Add EventEmitter infrastructure for task updates
 * Recovery Task 2.3.2: Add Error Event Emitter infrastructure for error events
 * Recovery Task 2.4.1: Add HTTP client setup and JSON-RPC infrastructure
 * PATH-002: Enhanced file loading error handling with user guidance
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
import { TaskStatusManager } from "./TaskStatusManager";
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
    private taskStatusManager: TaskStatusManager,
    private jsonTaskParser: JSONTaskParser,
    private mockDataProvider: MockDataProvider
  ) {
    // Configuration will be set in initialize() method to avoid timing race condition
    this.serverUrl = ""; // Will be set by initialize()
  }

  // Task 6.1.2: Async initialization method to fix workspace configuration race condition
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return; // Already initialized
    }

    try {
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
      throw new Error(
        `HTTP request failed: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }

  // Recovery Task 2.4.2: Replace with real JSON-RPC call to MCP server
  async getTasks(): Promise<Task[]> {
    console.log("[TasksDataService] getTasks() called");

    try {
      console.log(
        "[TasksDataService] Attempting MCP server call for tasks/list"
      );
      const response = await this.makeJSONRPCCall("tasks/list");

      if (response.error) {
        throw new Error(`MCP server error: ${response.error.message}`);
      }

      // Extract tasks from the MCP response format
      // The response.result.content[0].text contains JSON string with tasks
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
      // DATA-002: Fallback to file reading when HTTP fails, then to mock data if file reading fails
      console.warn(
        "MCP server unavailable, falling back to file reading:",
        error instanceof Error ? error.message : String(error)
      );

      try {
        console.log(
          "[TasksDataService] Attempting file parsing fallback from configured path"
        );

        // PATH-002: Use existing JSONTaskParser with enhanced error handling
        const fileUri =
          this.getConfiguredFileUri() || vscode.Uri.file("./tasks.json");

        try {
          const parsedTasks = await this.jsonTaskParser.parseTasksFromFile(
            fileUri
          );
          console.log(
            `[TasksDataService] Retrieved ${parsedTasks.length} tasks from file parser`
          );
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
      // Only fallback to TaskStatusManager on actual HTTP failures, not MCP server errors
      if (
        error instanceof Error &&
        error.message.startsWith("MCP server error:")
      ) {
        // Re-throw MCP server errors to the caller
        throw error;
      }

      // Fallback to TaskStatusManager if HTTP fails (network issues, timeouts, etc.)
      console.warn(
        "HTTP call failed, falling back to TaskStatusManager:",
        error instanceof Error ? error.message : String(error)
      );
      console.log(
        `[TasksDataService] Falling back to TaskStatusManager for task ${id}`
      );
      const fallbackTask = await this.taskStatusManager.getTaskById(id);
      if (fallbackTask) {
        console.log(
          `[TasksDataService] Retrieved task ${id} from TaskStatusManager fallback`
        );
      } else {
        console.log(
          `[TasksDataService] Task ${id} not found in TaskStatusManager fallback`
        );
      }
      return fallbackTask;
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
        // Use TaskStatusManager directly to avoid additional HTTP calls
        const updatedTasks = await this.taskStatusManager.getTasks();
        this.onTasksUpdated.fire(updatedTasks);
      } else {
        console.log(
          `[TasksDataService] MCP server returned false for task ${id} status update`
        );
      }

      return success;
    } catch (error) {
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
        "HTTP call failed, falling back to TaskStatusManager:",
        error instanceof Error ? error.message : String(error)
      );
      console.log(
        `[TasksDataService] Falling back to TaskStatusManager for task ${id} status update`
      );
      const fallbackSuccess = await this.taskStatusManager.updateTaskStatus(
        id,
        status
      );
      console.log(
        `[TasksDataService] TaskStatusManager fallback result for ${id}: ${fallbackSuccess}`
      );
      return fallbackSuccess;
    }
  }

  // Task 4.4.1: Add refreshTasks method for manual task refresh
  // PATH-002: Enhanced with comprehensive file loading error handling
  async refreshTasks(): Promise<void> {
    console.log("[TasksDataService] refreshTasks() called");

    try {
      console.log("[TasksDataService] Attempting MCP server refresh");
      // Try to refresh via MCP server first
      const response = await this.makeJSONRPCCall("tasks/refresh");

      if (response.error) {
        throw new Error(`MCP server error: ${response.error.message}`);
      }

      console.log("[TasksDataService] MCP server refresh successful");
      // If MCP server refresh successful, get updated tasks and fire event
      const updatedTasks = await this.getTasks();
      this.onTasksUpdated.fire(updatedTasks);
    } catch (error) {
      // Check if this is an MCP server error - if so, re-throw it
      if (
        error instanceof Error &&
        error.message.startsWith("MCP server error:")
      ) {
        throw error;
      }

      // PATH-002: Enhanced fallback with file loading and error handling
      console.warn(
        "HTTP call failed, falling back to file loading:",
        error instanceof Error ? error.message : String(error)
      );

      try {
        const fileUri = this.getConfiguredFileUri();

        if (!fileUri) {
          console.warn(
            "[TasksDataService] No file path configured, using mock data"
          );
          await this.loadMockData();
          return;
        }

        // PATH-002: Use existing JSONTaskParser with enhanced error handling
        try {
          const parsedTasks = await this.jsonTaskParser.parseTasksFromFile(
            fileUri
          );
          console.log(
            `[TasksDataService] Retrieved ${parsedTasks.length} tasks from file parser`
          );
          this.onTasksUpdated.fire(parsedTasks);
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
        console.warn(
          "[TasksDataService] Falling back to mock data due to file loading error"
        );
        await this.loadMockData();
      }
    }
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
      // Log error and re-throw (error already emitted above)
      console.error(
        `[TasksDataService] File loading failed for: ${fileUri.fsPath}`,
        error
      );
      throw error;
    }
  }

  private getConfiguredFileUri(): vscode.Uri | null {
    const config = workspace.getConfiguration();
    const filePath = config.get<string>("aidmVscodeExtension.tasks.filePath");
    if (filePath) {
      return vscode.Uri.file(filePath);
    }
    return null;
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
      this.onTasksUpdated.fire(mockTasks);
    } catch (error) {
      console.error("[TasksDataService] Failed to load mock data:", error);
      // Fire error event for mock data loading failure
      this.onError.fire({
        operation: "file_validation",
        userInstructions:
          "Failed to load both file and mock data. Please check VS Code console for details.",
        technicalDetails:
          error instanceof Error ? error.message : String(error),
      });
    }
  }

  // Cleanup method for event emitters - Recovery Task 2.3.1 & 2.3.2
  dispose(): void {
    this.onTasksUpdated.dispose();
    this.onError.dispose();
  }
}
