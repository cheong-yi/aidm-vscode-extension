/**
 * Consolidated Task Types - Single Source of Truth
 * Requirements: 1.1, 1.2, 1.4, 2.1, 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 4.1, 4.2, 4.3, 4.4, 6.3, 7.1, 7.2, 7.3, 7.4, 7.5, 7.6
 * 
 * This file contains ALL task-related type definitions:
 * - Business logic types
 * - Service interfaces
 * - JSON-RPC types
 */

import * as vscode from "vscode";
import type {
  Task,
  TestStatus,
  FailingTest,
  TaskStatus,
  TaskComplexity,
  TaskPriority,
  TestStatusEnum,
  ValidationResult,
  TaskContext,
  TaskData,
  TaskMetadata,
  TaskRelationships,
  TaskPerformance,
  TaskErrorResponse
} from "../../types/tasks";

// ============================================================================
// TASK-SPECIFIC BUSINESS LOGIC TYPES
// ============================================================================

/**
 * Task execution context for Cursor integration
 */
export interface TaskExecutionContext {
  taskId: string;
  filePath: string;
  lineNumber: number;
  context: string;
  requirements: string[];
  dependencies: string[];
  estimatedDuration: string;
  isExecutable: boolean;
  executionMode: 'cursor' | 'manual' | 'automated';
  environment: 'development' | 'testing' | 'production';
}

/**
 * Task validation context for business rules
 */
export interface TaskValidationContext {
  task: Task;
  businessRules: string[];
  validationLevel: 'basic' | 'strict' | 'enterprise';
  customValidators: string[];
  allowPartialValidation: boolean;
}

/**
 * Task performance metrics specific to development workflow
 */
export interface TaskDevelopmentMetrics {
  taskId: string;
  timeToFirstCommit: number;
  timeToFirstTest: number;
  timeToFirstReview: number;
  totalDevelopmentTime: number;
  testCoverageAtCompletion: number;
  codeQualityScore: number;
  reviewerSatisfaction: number;
}

/**
 * Task dependency resolution result
 */
export interface TaskDependencyResolution {
  taskId: string;
  resolvedDependencies: string[];
  unresolvedDependencies: string[];
  circularDependencies: string[];
  blockingTasks: string[];
  estimatedResolutionTime: number;
  resolutionStrategy: 'sequential' | 'parallel' | 'hybrid';
}

// ============================================================================
// SERVICE INTERFACES
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

// ============================================================================
// JSON-RPC TYPES
// ============================================================================

/**
 * Task-specific JSON-RPC request methods
 */
export type TaskJSONRPCMethod =
  | "tasks/list"
  | "tasks/get"
  | "tasks/update-status"
  | "tasks/refresh"
  | "tasks/dependencies"
  | "tasks/test-results"
  | "tasks/create"
  | "tasks/delete"
  | "tasks/search"
  | "tasks/export";

/**
 * Task JSON-RPC request interface
 */
export interface TaskJSONRPCRequest {
  jsonrpc: "2.0";
  method: TaskJSONRPCMethod;
  params: TaskJSONRPCParams;
  id: string | number;
}

/**
 * Task JSON-RPC parameters
 */
export interface TaskJSONRPCParams {
  taskId?: string;
  status?: TaskStatus;
  filters?: any; // Use any to avoid circular import
  updates?: Partial<Task>;
  testResults?: TestStatus;
}

/**
 * Task JSON-RPC response interface
 */
export interface TaskJSONRPCResponse {
  jsonrpc: "2.0";
  result?: TaskJSONRPCResult;
  error?: TaskJSONRPCError;
  id: string | number;
}

/**
 * Task JSON-RPC result data
 */
export interface TaskJSONRPCResult {
  tasks?: Task[];
  task?: Task;
  success?: boolean;
  message?: string;
  count?: number;
  testResults?: TestStatus;
}

/**
 * Task JSON-RPC error information
 */
export interface TaskJSONRPCError {
  code: number;
  message: string;
  data?: any;
}