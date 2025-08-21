/**
 * Task-related Type Definitions
 * Requirements: 2.1, 3.1-3.6, 4.1-4.4, 7.1-7.6
 */

export interface Task {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  complexity: TaskComplexity;
  dependencies: string[];
  requirements: string[];
  createdDate: Date;
  lastModified: Date;
  assignee?: string;
  estimatedHours?: number;
  actualHours?: number;
  testStatus?: TestStatus;
  tags?: string[];
  priority?: TaskPriority;
}

export interface TestStatus {
  lastRunDate?: Date;
  totalTests: number;
  passedTests: number;
  failedTests: number;
  failingTestsList?: { name: string; message: string; stackTrace?: string }[];
  testSuite?: string;
  coverage?: number;
}

export enum TaskStatus {
  NOT_STARTED = "not_started",
  IN_PROGRESS = "in_progress", 
  REVIEW = "review",
  COMPLETED = "completed",
  BLOCKED = "blocked",
  DEPRECATED = "deprecated",
}

export enum TaskComplexity {
  LOW = "low",
  MEDIUM = "medium", 
  HIGH = "high",
  EXTREME = "extreme",
}

export enum TaskPriority {
  LOW = "low",
  MEDIUM = "medium",
  HIGH = "high", 
  CRITICAL = "critical",
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export interface TaskErrorResponse {
  taskId?: string;
  operation: "task_retrieval" | "status_update" | "dependency_resolution" | "test_results";
  suggestedAction?: "retry" | "manual_update" | "refresh" | "clear_cache" | "check_permissions";
  retryAfter?: number;
  userInstructions?: string;
  technicalDetails?: string;
  supportContact?: string;
}

export interface TaskUpdateRequest {
  taskId: string;
  status?: TaskStatus;
  assignee?: string;
  estimatedHours?: number;
  actualHours?: number;
  testStatus?: TestStatus;
  tags?: string[];
  priority?: TaskPriority;
  notes?: string;
}

export interface TaskDependencyGraph {
  taskId: string;
  dependencies: string[];
  dependents: string[];
  circularDependencies: string[];
  isBlocked: boolean;
  blockingTasks: string[];
}

export interface TaskSearchFilters {
  status?: TaskStatus[];
  complexity?: TaskComplexity[];
  priority?: TaskPriority[];
  assignee?: string;
  tags?: string[];
  requirements?: string[];
  createdAfter?: Date;
  createdBefore?: Date;
  modifiedAfter?: Date;
  modifiedBefore?: Date;
}

export interface TaskSearchResult {
  tasks: Task[];
  totalCount: number;
  filteredCount: number;
  searchTime: number;
  filters: TaskSearchFilters;
}

export interface TaskStatistics {
  totalTasks: number;
  completedTasks: number;
  inProgressTasks: number;
  blockedTasks: number;
  notStartedTasks: number;
  averageCompletionTime: number;
  testCoverage: number;
  priorityDistribution: Record<TaskPriority, number>;
  complexityDistribution: Record<TaskComplexity, number>;
}
