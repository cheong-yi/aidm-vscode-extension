/**
 * Task JSON-RPC Type Definitions
 * Requirements: 3.1, 3.2, 6.3
 */

import { TaskStatus } from './taskEnums';
import { Task, TaskTestStatus } from './taskTypes';

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
  params?: TaskJSONRPCParams;
  id: string | number;
  client_id?: string;
  session_token?: string;
  timestamp: number;
}

/**
 * Task JSON-RPC parameters
 */
export interface TaskJSONRPCParams {
  // tasks/list
  status?: TaskStatus;
  priority?: string;
  assignee?: string;
  requirement?: string;
  limit?: number;
  offset?: number;
  
  // tasks/get
  taskId?: string;
  
  // tasks/update-status
  newStatus?: TaskStatus;
  
  // tasks/search
  query?: string;
  filters?: Record<string, any>;
  
  // tasks/create
  task?: Partial<Task>;
  
  // tasks/delete
  force?: boolean;
  
  // tasks/export
  format?: 'json' | 'csv' | 'markdown';
  includeTestResults?: boolean;
}

/**
 * Task JSON-RPC response interface
 */
export interface TaskJSONRPCResponse {
  jsonrpc: "2.0";
  id: string | number;
  result?: TaskJSONRPCResult;
  error?: TaskJSONRPCError;
  metadata?: TaskJSONRPCMetadata;
}

/**
 * Task JSON-RPC result types
 */
export type TaskJSONRPCResult = 
  | Task
  | Task[]
  | boolean
  | string[]
  | TaskTestStatus
  | TaskListResult
  | TaskUpdateResult
  | TaskSearchResult;

/**
 * Task list result with pagination
 */
export interface TaskListResult {
  tasks: Task[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  };
  summary: {
    totalTasks: number;
    completedTasks: number;
    inProgressTasks: number;
    blockedTasks: number;
    testCoverage: number;
  };
}

/**
 * Task update result
 */
export interface TaskUpdateResult {
  success: boolean;
  taskId: string;
  previousStatus: TaskStatus;
  newStatus: TaskStatus;
  updatedAt: Date;
  validationWarnings?: string[];
}

/**
 * Task search result
 */
export interface TaskSearchResult {
  tasks: Task[];
  query: string;
  filters: Record<string, any>;
  totalResults: number;
  searchTime: number;
  relevanceScores?: Record<string, number>;
}

/**
 * Task JSON-RPC error interface
 */
export interface TaskJSONRPCError {
  code: number;
  message: string;
  data?: {
    taskId?: string;
    operation?: string;
    suggestedAction?: string;
    retryAfter?: number;
    userInstructions?: string;
    technicalDetails?: string;
    supportContact?: string;
  };
}

/**
 * Task JSON-RPC metadata
 */
export interface TaskJSONRPCMetadata {
  responseTime: number;
  cacheStatus: "hit" | "miss" | "stale";
  serverVersion: string;
  serverTimestamp: Date;
  requestId: string;
  processingTime: number;
}

/**
 * Task JSON-RPC notification interface
 */
export interface TaskJSONRPCNotification {
  jsonrpc: "2.0";
  method: "tasks/updated" | "tasks/status-changed" | "tasks/test-results-updated";
  params: {
    taskId: string;
    data: any;
    timestamp: Date;
  };
}

/**
 * Task JSON-RPC batch request interface
 */
export interface TaskJSONRPCBatchRequest {
  jsonrpc: "2.0";
  requests: TaskJSONRPCRequest[];
}

/**
 * Task JSON-RPC batch response interface
 */
export interface TaskJSONRPCBatchResponse {
  jsonrpc: "2.0";
  responses: TaskJSONRPCResponse[];
}

/**
 * Task JSON-RPC health check interface
 */
export interface TaskJSONRPCHealthCheck {
  jsonrpc: "2.0";
  method: "tasks/health";
  params?: {
    includeCacheStatus?: boolean;
    includePerformanceMetrics?: boolean;
  };
}

/**
 * Task JSON-RPC health response
 */
export interface TaskJSONRPCHealthResponse {
  jsonrpc: "2.0";
  id: string | number;
  result: {
    status: "healthy" | "degraded" | "unhealthy";
    timestamp: Date;
    uptime: number;
    version: string;
    cache?: {
      status: "healthy" | "degraded";
      hitRate: number;
      size: number;
    };
    performance?: {
      averageResponseTime: number;
      requestsPerSecond: number;
      memoryUsage: number;
    };
  };
}
