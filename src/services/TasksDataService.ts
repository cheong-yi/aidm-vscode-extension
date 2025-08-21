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

  constructor(private taskStatusManager: TaskStatusManager) {
    // Constructor now accepts TaskStatusManager dependency
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
    try {
      const response = await this.makeJSONRPCCall("tasks/list");

      if (response.error) {
        throw new Error(`MCP server error: ${response.error.message}`);
      }

      // Extract tasks from the MCP response format
      // The response.result.content[0].text contains JSON string with tasks
      if (response.result?.content?.[0]?.text) {
        try {
          const parsedContent = JSON.parse(response.result.content[0].text);
          return parsedContent.tasks || [];
        } catch (parseError) {
          console.warn("Failed to parse MCP response content:", parseError);
          return [];
        }
      }

      return [];
    } catch (error) {
      // Fallback to TaskStatusManager if HTTP fails
      console.warn(
        "HTTP call failed, falling back to TaskStatusManager:",
        error instanceof Error ? error.message : String(error)
      );
      return await this.taskStatusManager.getTasks();
    }
  }

  // Delegate to TaskStatusManager for individual task lookup
  async getTaskById(id: string): Promise<Task | null> {
    return await this.taskStatusManager.getTaskById(id);
  }

  // Cleanup method for event emitters - Recovery Task 2.3.1 & 2.3.2
  dispose(): void {
    this.onTasksUpdated.dispose();
    this.onError.dispose();
  }
}
