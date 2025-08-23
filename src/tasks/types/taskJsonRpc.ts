/**
 * Task JSON-RPC Type Definitions
 * Requirements: 3.1, 3.2, 6.3
 */

import { TaskStatus, Task, TestStatus } from "../../types/tasks";

// ============================================================================
// TASK JSON-RPC METHOD TYPES
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

// ============================================================================
// TASK JSON-RPC REQUEST INTERFACES
// ============================================================================

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

// ============================================================================
// TASK JSON-RPC RESPONSE INTERFACES
// ============================================================================

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
