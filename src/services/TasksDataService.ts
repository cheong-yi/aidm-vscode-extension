/**
 * Tasks Data Service
 * Extension-side data management with MCP server integration and caching
 * Requirements: 1.4, 3.1-3.2, 4.1-4.4, 5.1-5.7, 6.5-6.7, 7.1-7.6
 */

import * as vscode from "vscode";
import { EventEmitter } from "events";
import {
  Task,
  TaskStatus,
  TaskUpdateRequest,
  TaskSearchFilters,
  TaskSearchResult,
  TaskStatistics,
  TaskDependencyGraph,
} from "../types/tasks";
import { TaskStatusManager } from "./TaskStatusManager";
import { MarkdownTaskParser } from "./MarkdownTaskParser";
import { ErrorHandler } from "../utils/ErrorHandler";
import { DegradedModeManager } from "../utils/DegradedModeManager";
import { CacheManager } from "./CacheManager";

export interface TasksDataServiceConfig {
  mcpServerUrl: string;
  cacheEnabled: boolean;
  cacheTTL: number;
  retryAttempts: number;
  retryDelay: number;
  enableRealTimeSync: boolean;
}

export interface TaskUpdateEvent {
  taskId: string;
  previousStatus: TaskStatus;
  newStatus: TaskStatus;
  timestamp: Date;
  source: "local" | "remote" | "file";
}

export interface TaskSyncEvent {
  type:
    | "tasks_loaded"
    | "tasks_updated"
    | "task_status_changed"
    | "dependencies_updated";
  data: any;
  timestamp: Date;
}

export class TasksDataService extends EventEmitter {
  private config: TasksDataServiceConfig;
  private taskStatusManager: TaskStatusManager;
  private markdownParser: MarkdownTaskParser;
  private errorHandler: ErrorHandler;
  private degradedModeManager: DegradedModeManager;
  private cacheManager: CacheManager;
  private isInitialized: boolean = false;
  private currentTasksFile: string | null = null;
  private syncInProgress: boolean = false;

  // Event emitters for UI synchronization
  private taskUpdateEmitter = new EventEmitter();
  private taskSyncEmitter = new EventEmitter();

  constructor(
    config: TasksDataServiceConfig,
    errorHandler: ErrorHandler,
    degradedModeManager: DegradedModeManager
  ) {
    super();
    this.config = config;
    this.errorHandler = errorHandler;
    this.degradedModeManager = degradedModeManager;

    this.markdownParser = new MarkdownTaskParser();
    this.taskStatusManager = new TaskStatusManager(this.markdownParser);
    this.cacheManager = new CacheManager();

    this.setupEventListeners();
  }

  /**
   * Initialize the service
   */
  async initialize(tasksFilePath?: string): Promise<void> {
    try {
      if (this.isInitialized) {
        return;
      }

      // Load tasks from file if provided
      if (tasksFilePath) {
        await this.loadTasksFromFile(tasksFilePath);
        this.currentTasksFile = tasksFilePath;
      }

      // Test MCP server connection
      await this.testMCPServerConnection();

      this.isInitialized = true;

      this.emit("initialized", { timestamp: new Date() });
    } catch (error) {
      await this.errorHandler.handleError(error, {
        operation: "initialize",
        component: "tasks-data-service",
      });
      throw error;
    }
  }

  /**
   * Load tasks from markdown file
   */
  async loadTasksFromFile(filePath: string): Promise<void> {
    try {
      await this.taskStatusManager.loadTasksFromFile(filePath);
      this.currentTasksFile = filePath;

      // Cache the loaded tasks
      if (this.config.cacheEnabled) {
        const tasks = this.taskStatusManager.getAllTasks();
        await this.cacheManager.set("tasks", tasks, this.config.cacheTTL);
      }

      this.emit("tasks_loaded", {
        filePath,
        taskCount: this.taskStatusManager.getAllTasks().length,
        timestamp: new Date(),
      });
    } catch (error) {
      await this.errorHandler.handleError(error, {
        operation: "load_tasks_from_file",
        component: "tasks-data-service",
        metadata: { filePath },
      });
      throw error;
    }
  }

  /**
   * Get all tasks with caching
   */
  async getAllTasks(): Promise<Task[]> {
    try {
      // Try cache first
      if (this.config.cacheEnabled) {
        const cached = await this.cacheManager.get<Task[]>("tasks");
        if (cached) {
          return cached;
        }
      }

      // Get from local manager
      const tasks = this.taskStatusManager.getAllTasks();

      // Cache the result
      if (this.config.cacheEnabled) {
        await this.cacheManager.set("tasks", tasks, this.config.cacheTTL);
      }

      return tasks;
    } catch (error) {
      await this.errorHandler.handleError(
        error instanceof Error ? error : String(error),
        {
          operation: "get_all_tasks",
          component: "tasks-data-service",
        }
      );

      // Return empty array on error
      return [];
    }
  }

  /**
   * Get task by ID
   */
  async getTaskById(taskId: string): Promise<Task | null> {
    try {
      // Try cache first
      if (this.config.cacheEnabled) {
        const cacheKey = `task_${taskId}`;
        const cached = await this.cacheManager.get<Task>(cacheKey);
        if (cached) {
          return cached;
        }
      }

      // Get from local manager
      const task = this.taskStatusManager.getTaskById(taskId);

      if (task && this.config.cacheEnabled) {
        const cacheKey = `task_${taskId}`;
        await this.cacheManager.set(cacheKey, task, this.config.cacheTTL);
      }

      return task || null;
    } catch (error) {
      await this.errorHandler.handleError(
        error instanceof Error ? error : String(error),
        {
          operation: "get_task_by_id",
          component: "tasks-data-service",
          metadata: { taskId },
        }
      );

      return null;
    }
  }

  /**
   * Update task status
   */
  async updateTaskStatus(
    taskId: string,
    newStatus: TaskStatus
  ): Promise<boolean> {
    try {
      // Update locally first
      const result = await this.taskStatusManager.updateTaskStatus(
        taskId,
        newStatus,
        this.currentTasksFile || undefined
      );

      if (result.success) {
        // Update cache
        if (this.config.cacheEnabled) {
          await this.invalidateTaskCache(taskId);
        }

        // Emit update event
        this.emit("task_status_updated", {
          taskId,
          previousStatus: result.previousStatus,
          newStatus: result.newStatus,
          timestamp: new Date(),
          source: "local",
        });

        // Sync with MCP server
        if (this.config.enableRealTimeSync) {
          this.syncTaskUpdateToServer(taskId, newStatus);
        }

        return true;
      }

      return false;
    } catch (error) {
      await this.errorHandler.handleError(error, {
        operation: "update_task_status",
        component: "tasks-data-service",
        metadata: { taskId, newStatus },
      });

      return false;
    }
  }

  /**
   * Update task with comprehensive data
   */
  async updateTask(updateRequest: TaskUpdateRequest): Promise<boolean> {
    try {
      const result = await this.taskStatusManager.updateTask(
        updateRequest,
        this.currentTasksFile || undefined
      );

      if (result.success) {
        // Update cache
        if (this.config.cacheEnabled) {
          await this.invalidateTaskCache(updateRequest.taskId);
        }

        // Emit update event
        this.emit("task_updated", {
          taskId: updateRequest.taskId,
          previousStatus: result.previousStatus,
          newStatus: result.newStatus,
          timestamp: new Date(),
          source: "local",
        });

        // Sync with MCP server
        if (this.config.enableRealTimeSync) {
          this.syncTaskUpdateToServer(
            updateRequest.taskId,
            updateRequest.status
          );
        }

        return true;
      }

      return false;
    } catch (error) {
      await this.errorHandler.handleError(error, {
        operation: "update_task",
        component: "tasks-data-service",
        metadata: { updateRequest },
      });

      return false;
    }
  }

  /**
   * Search tasks with filters
   */
  async searchTasks(
    query: string,
    filters?: TaskSearchFilters
  ): Promise<TaskSearchResult> {
    try {
      const startTime = performance.now();

      // Try cache first for common searches
      if (this.config.cacheEnabled && !query && !filters) {
        const cacheKey = "search_all_tasks";
        const cached = await this.cacheManager.get(cacheKey);
        if (cached) {
          return {
            ...cached,
            searchTime: performance.now() - startTime,
          };
        }
      }

      // Search locally
      const tasks = this.taskStatusManager.searchTasks(query, filters);
      const searchTime = performance.now() - startTime;

      const result: TaskSearchResult = {
        tasks,
        totalCount: this.taskStatusManager.getAllTasks().length,
        filteredCount: tasks.length,
        searchTime,
        filters: filters || {},
      };

      // Cache common searches
      if (this.config.cacheEnabled && !query && !filters) {
        const cacheKey = "search_all_tasks";
        await this.cacheManager.set(cacheKey, result, this.config.cacheTTL);
      }

      return result;
    } catch (error) {
      await this.errorHandler.handleError(error, {
        operation: "search_tasks",
        component: "tasks-data-service",
        metadata: { query, filters },
      });

      return {
        tasks: [],
        totalCount: 0,
        filteredCount: 0,
        searchTime: 0,
        filters: filters || {},
      };
    }
  }

  /**
   * Get task statistics
   */
  async getTaskStatistics(): Promise<TaskStatistics> {
    try {
      // Try cache first
      if (this.config.cacheEnabled) {
        const cached = await this.cacheManager.get("task_statistics");
        if (cached) {
          return cached;
        }
      }

      const stats = this.taskStatusManager.getTaskStatistics();

      // Cache statistics
      if (this.config.cacheEnabled) {
        await this.cacheManager.set(
          "task_statistics",
          stats,
          this.config.cacheTTL
        );
      }

      return stats;
    } catch (error) {
      await this.errorHandler.handleError(error, {
        operation: "get_task_statistics",
        component: "tasks-data-service",
      });

      // Return empty statistics on error
      return {
        totalTasks: 0,
        completedTasks: 0,
        inProgressTasks: 0,
        blockedTasks: 0,
        notStartedTasks: 0,
        averageCompletionTime: 0,
        testCoverage: 0,
        priorityDistribution: {},
        complexityDistribution: {},
      };
    }
  }

  /**
   * Get dependency graph for a task
   */
  async getTaskDependencyGraph(
    taskId: string
  ): Promise<TaskDependencyGraph | null> {
    try {
      // Try cache first
      if (this.config.cacheEnabled) {
        const cacheKey = `dependency_graph_${taskId}`;
        const cached = await this.cacheManager.get(cacheKey);
        if (cached) {
          return cached;
        }
      }

      const graph = this.taskStatusManager.getTaskDependencyGraph(taskId);

      if (graph && this.config.cacheEnabled) {
        const cacheKey = `dependency_graph_${taskId}`;
        await this.cacheManager.set(cacheKey, graph, this.config.cacheTTL);
      }

      return graph;
    } catch (error) {
      await this.errorHandler.handleError(error, {
        operation: "get_task_dependency_graph",
        component: "tasks-data-service",
        metadata: { taskId },
      });

      return null;
    }
  }

  /**
   * Refresh tasks from file
   */
  async refreshTasks(): Promise<void> {
    if (!this.currentTasksFile) {
      throw new Error("No tasks file loaded");
    }

    try {
      await this.loadTasksFromFile(this.currentTasksFile);

      // Clear cache
      if (this.config.cacheEnabled) {
        await this.cacheManager.clear();
      }

      this.emit("tasks_refreshed", {
        filePath: this.currentTasksFile,
        timestamp: new Date(),
      });
    } catch (error) {
      await this.errorHandler.handleError(error, {
        operation: "refresh_tasks",
        component: "tasks-data-service",
        metadata: { filePath: this.currentTasksFile },
      });
      throw error;
    }
  }

  /**
   * Sync with MCP server
   */
  async syncWithServer(): Promise<void> {
    if (this.syncInProgress) {
      return;
    }

    this.syncInProgress = true;

    try {
      // Get all tasks
      const tasks = await this.getAllTasks();

      // Send to server via JSON-RPC
      await this.sendTasksToServer(tasks);

      this.emit("server_sync_completed", {
        taskCount: tasks.length,
        timestamp: new Date(),
      });
    } catch (error) {
      await this.errorHandler.handleError(error, {
        operation: "sync_with_server",
        component: "tasks-data-service",
      });

      this.emit("server_sync_failed", {
        error: error instanceof Error ? error.message : String(error),
        timestamp: new Date(),
      });
    } finally {
      this.syncInProgress = false;
    }
  }

  /**
   * Get service status
   */
  getServiceStatus(): {
    isInitialized: boolean;
    currentFile: string | null;
    cacheEnabled: boolean;
    syncEnabled: boolean;
    degradedMode: boolean;
  } {
    return {
      isInitialized: this.isInitialized,
      currentFile: this.currentTasksFile,
      cacheEnabled: this.config.cacheEnabled,
      syncEnabled: this.config.enableRealTimeSync,
      degradedMode: this.degradedModeManager.isDegraded(),
    };
  }

  /**
   * Setup event listeners
   */
  private setupEventListeners(): void {
    // Forward events to VSCode extension
    this.taskUpdateEmitter.on("task_updated", (event: TaskUpdateEvent) => {
      this.emit("task_updated", event);
    });

    this.taskSyncEmitter.on("task_sync", (event: TaskSyncEvent) => {
      this.emit("task_sync", event);
    });
  }

  /**
   * Test MCP server connection
   */
  private async testMCPServerConnection(): Promise<void> {
    try {
      // Simple ping test to MCP server
      const response = await fetch(`${this.config.mcpServerUrl}/ping`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jsonrpc: "2.0",
          method: "ping",
          id: Date.now(),
        }),
      });

      if (!response.ok) {
        throw new Error(`MCP server responded with status: ${response.status}`);
      }
    } catch (error) {
      console.warn("MCP server connection test failed:", error);
      // Don't throw - allow degraded mode operation
    }
  }

  /**
   * Sync task update to server
   */
  private async syncTaskUpdateToServer(
    taskId: string,
    status: TaskStatus
  ): Promise<void> {
    try {
      const response = await fetch(`${this.config.mcpServerUrl}/rpc`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jsonrpc: "2.0",
          method: "tools/call",
          params: {
            name: "tasks/update-status",
            arguments: { taskId, status },
          },
          id: Date.now(),
        }),
      });

      if (!response.ok) {
        throw new Error(`Server responded with status: ${response.status}`);
      }
    } catch (error) {
      console.warn("Failed to sync task update to server:", error);
      // Don't throw - this is a background sync operation
    }
  }

  /**
   * Send tasks to server
   */
  private async sendTasksToServer(tasks: Task[]): Promise<void> {
    try {
      const response = await fetch(`${this.config.mcpServerUrl}/rpc`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jsonrpc: "2.0",
          method: "tools/call",
          params: {
            name: "tasks/sync",
            arguments: { tasks },
          },
          id: Date.now(),
        }),
      });

      if (!response.ok) {
        throw new Error(`Server responded with status: ${response.status}`);
      }
    } catch (error) {
      throw new Error(
        `Failed to send tasks to server: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }

  /**
   * Invalidate task cache
   */
  private async invalidateTaskCache(taskId: string): Promise<void> {
    try {
      await this.cacheManager.delete(`task_${taskId}`);
      await this.cacheManager.delete("tasks"); // Invalidate all tasks cache
      await this.cacheManager.delete("task_statistics"); // Invalidate statistics cache
      await this.cacheManager.delete("search_all_tasks"); // Invalidate search cache
    } catch (error) {
      console.warn("Failed to invalidate task cache:", error);
    }
  }
}
