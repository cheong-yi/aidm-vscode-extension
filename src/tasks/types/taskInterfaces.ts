/**
 * Task Management Service Interfaces
 * Requirements: 1.4, 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 4.1, 4.2, 4.3, 4.4, 7.1, 7.2, 7.3, 7.4, 7.5, 7.6
 */

import * as vscode from "vscode";
import {
  TaskStatus,
  Task,
  TestStatus,
  ValidationResult,
  TaskErrorResponse,
  TaskContext,
} from "../../types/tasks";

// ============================================================================
// TASK STATUS MANAGER INTERFACE
// ============================================================================

/**
 * Task Status Manager Interface
 * Manages task business logic and status transitions
 */
export interface TaskStatusManager {
  getTasks(): Promise<Task[]>;
  getTaskById(id: string): Promise<Task | null>;
  updateTaskStatus(id: string, status: TaskStatus): Promise<boolean>;
  refreshTasksFromFile(): Promise<void>;
  getTaskDependencies(id: string): Promise<string[]>;
  getTestResults(taskId: string): Promise<TestStatus | null>;
  validateStatusTransition(
    currentStatus: TaskStatus,
    newStatus: TaskStatus
  ): boolean;
  getTasksByStatus(status: TaskStatus): Promise<Task[]>;
  getTasksByPriority(priority: string): Promise<Task[]>;
  getTasksByAssignee(assignee: string): Promise<Task[]>;
  getTasksByRequirement(requirementId: string): Promise<Task[]>;
}

// ============================================================================
// MARKDOWN TASK PARSER INTERFACE
// ============================================================================

/**
 * Markdown Task Parser Interface
 * Handles reading, parsing, and writing of tasks.md files
 */
export interface MarkdownTaskParser {
  parseTasksFromFile(filePath: string): Promise<Task[]>;
  parseTaskFromMarkdown(markdown: string): Task | null;
  validateTaskData(task: Task): ValidationResult;
  serializeTaskToMarkdown(task: Task): string;
  updateTaskInFile(
    filePath: string,
    taskId: string,
    updates: Partial<Task>
  ): Promise<boolean>;
  writeTasksToFile(filePath: string, tasks: Task[]): Promise<boolean>;
  getTaskMarkdownTemplate(): string;
}

// ============================================================================
// TASKS DATA SERVICE INTERFACE
// ============================================================================

/**
 * Tasks Data Service Interface
 * Manages extension-side data operations and MCP communication
 */
export interface TasksDataService {
  getTasks(): Promise<Task[]>;
  getTaskById(id: string): Promise<Task | null>;
  updateTaskStatus(id: string, status: TaskStatus): Promise<boolean>;
  refreshTasks(): Promise<void>;
  getTaskDependencies(id: string): Promise<string[]>;
  getTestResults(taskId: string): Promise<TestStatus | null>;

  // Event emitters for UI synchronization
  onTasksUpdated: vscode.EventEmitter<Task[]>;
  onTaskStatusChanged: vscode.EventEmitter<{
    taskId: string;
    newStatus: TaskStatus;
  }>;
  onError: vscode.EventEmitter<TaskErrorResponse>;
  onTestResultsUpdated: vscode.EventEmitter<{
    taskId: string;
    testStatus: TestStatus;
  }>;

  // Cache management
  clearCache(): void;
  getCacheStatus(): CacheStatus;
  isOnline(): boolean;
}

// ============================================================================
// TASK TREE VIEW PROVIDER INTERFACE
// ============================================================================

// ============================================================================
// TASK DETAIL CARD PROVIDER INTERFACE
// ============================================================================

/**
 * Task Detail Card Provider Interface
 * Manages the detailed task information display
 */
export interface TaskDetailCardProvider {
  updateTaskDetails(task: Task): void;
  clearDetails(): void;
  showNoTaskSelected(): void;
  showError(message: string, details?: string): void;
  onTaskSelected: vscode.EventEmitter<Task>;
  onStatusChanged: vscode.EventEmitter<{
    taskId: string;
    newStatus: TaskStatus;
  }>;
  onTestResultsUpdated: vscode.EventEmitter<{
    taskId: string;
    testStatus: TestStatus;
  }>;
  refresh(): void;
}

// ============================================================================
// TASK COMMANDS INTERFACE
// ============================================================================

/**
 * Task Commands Interface
 * Defines available task management commands
 */
export interface TaskCommands {
  refreshTasks(): Promise<void>;
  updateTaskStatus(taskId: string, status: TaskStatus): Promise<void>;
  openTaskInEditor(taskId: string): void;
  showTaskHistory(taskId: string): void;
  viewTestResults(taskId: string): void;
  reportTaskIssue(taskId: string): void;
  generateTaskCode(taskId: string): void;
  reviewTaskWithRooCode(taskId: string): void;
}

// ============================================================================
// CACHE STATUS INTERFACE
// ============================================================================

/**
 * Cache Status Interface
 * Information about the current cache state
 */
export interface CacheStatus {
  isStale: boolean;
  lastUpdated: Date;
  hitRate: number;
  size: number;
  maxSize: number;
  ttl: number;
}

// ============================================================================
// TASK CONTEXT MANAGER INTERFACE
// ============================================================================

/**
 * Task Context Manager Interface
 * Extended context manager with task-specific methods
 */
export interface TaskContextManager {
  getTaskContext(taskId: string): Promise<TaskContext>;
  getTasksForFile(filePath: string): Promise<Task[]>;
  getTasksByStatus(status: TaskStatus): Promise<Task[]>;
  getTasksByRequirement(requirementId: string): Promise<Task[]>;
  getTasksByPriority(priority: string): Promise<Task[]>;
  getTasksByAssignee(assignee: string): Promise<Task[]>;
  getTaskDependencies(taskId: string): Promise<Task[]>;
  getTaskBlockers(taskId: string): Promise<Task[]>;
}
