/**
 * TasksDataService - Basic class structure for task data management
 * Recovery Task 2.1.1: Minimal class that compiles and can be instantiated
 * Recovery Task 2.2.1: Interface definition and stub methods
 * Recovery Task 2.2.4: Connect to TaskStatusManager for real data flow
 * Recovery Task 2.3.1: Add EventEmitter infrastructure for task updates
 * Recovery Task 2.3.2: Add Error Event Emitter infrastructure for error events
 * Recovery Task 2.4.1: Add HTTP client setup and JSON-RPC infrastructure
 * Requirements: 3.1-3.6, 4.1-4.4, 7.1-7.6
 */

import { EventEmitter, workspace } from "vscode";
import axios, { AxiosInstance } from "axios";
import {
  Task,
  TaskStatus,
  TaskComplexity,
  TaskPriority,
  TaskErrorResponse,
} from "../types/tasks";
import { TaskStatusManager } from "./TaskStatusManager";
import { MarkdownTaskParser } from "./MarkdownTaskParser";
import { MockDataProvider } from "../mock";

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
  private readonly serverUrl: string;

  constructor(
    private taskStatusManager: TaskStatusManager,
    private markdownTaskParser: MarkdownTaskParser,
    private mockDataProvider: MockDataProvider
  ) {
    // Constructor now accepts TaskStatusManager, MarkdownTaskParser, and MockDataProvider dependencies
    // Get port from VS Code configuration
    const config = workspace.getConfiguration("aidmVscodeExtension");
    const port = config.get<number>("mcpServer.port", 3001);
    this.serverUrl = `http://localhost:${port}`;

    this.setupHttpClient();
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
          "[TasksDataService] Attempting file parsing fallback from ./tasks.md"
        );
        const parsedTasks = await this.markdownTaskParser.parseTasksFromFile(
          "./tasks.md"
        );
        console.log(
          `[TasksDataService] Retrieved ${parsedTasks.length} tasks from file parser`
        );
        return parsedTasks;
      } catch (fileError) {
        // Task 4: Enhanced file validation error handling with user feedback
        const errorMessage =
          fileError instanceof Error ? fileError.message : String(fileError);

        // Check if this is a file validation error that should trigger user notification
        if (errorMessage.includes("Tasks file validation failed:")) {
          console.error(
            "File validation failed, triggering user notification:",
            errorMessage
          );

          // Fire error event for file validation issues
          this.onError.fire({
            operation: "file_validation",
            taskId: "N/A",
            suggestedAction: "configure_file",
            userInstructions: `Tasks file issue: ${errorMessage.replace(
              "Tasks file validation failed: ",
              ""
            )}`,
            technicalDetails: errorMessage,
          });

          // Note: User notification will be handled by the extension.ts error handler
          // which listens to the onError event and shows appropriate UI messages
        } else {
          console.error("File parsing error (non-validation):", errorMessage);
        }

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

      // Fallback to TaskStatusManager for HTTP failures
      console.warn(
        "HTTP call failed, falling back to TaskStatusManager:",
        error instanceof Error ? error.message : String(error)
      );

      console.log(
        "[TasksDataService] Falling back to TaskStatusManager refresh"
      );
      // Use TaskStatusManager's refresh method as fallback
      await this.taskStatusManager.refreshTasksFromFile();

      // Get updated tasks and fire event
      const updatedTasks = await this.taskStatusManager.getTasks();
      console.log(
        `[TasksDataService] TaskStatusManager refresh returned ${updatedTasks.length} tasks`
      );
      this.onTasksUpdated.fire(updatedTasks);
    }
  }

  // Cleanup method for event emitters - Recovery Task 2.3.1 & 2.3.2
  dispose(): void {
    this.onTasksUpdated.dispose();
    this.onError.dispose();
  }
}
