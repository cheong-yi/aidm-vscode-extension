/**
 * Task-related Type Definitions
 * Requirements: 2.1, 3.1-3.6, 4.1-4.4, 7.1-7.6
 * Enhanced for Taskmaster Dashboard: 6.8, 6.9, 7.7
 */

export interface Task {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  complexity: TaskComplexity;
  dependencies: string[];
  requirements: string[];
  createdDate: string; // ISO date string for TimeFormattingUtility compatibility
  lastModified: string; // ISO date string for TimeFormattingUtility compatibility
  assignee?: string;
  estimatedHours?: number;
  actualHours?: number;
  estimatedDuration?: string; // "15-30 min", "20-25 min" format
  isExecutable?: boolean; // true for not_started tasks eligible for Cursor integration
  testStatus?: TestStatus;
  tags?: string[];
  priority?: TaskPriority;
  statusDisplayName?: string; // From STATUS_DISPLAY_NAMES mapping
}

export interface TestStatus {
  lastRunDate?: string; // ISO date string for TimeFormattingUtility compatibility
  totalTests: number;
  passedTests: number;
  failedTests: number;
  failingTestsList?: FailingTest[];
  testSuite?: string;
  coverage?: number;
}

export interface FailingTest {
  name: string;
  message: string;
  stackTrace?: string;
  category: "assertion" | "type" | "filesystem" | "timeout" | "network";
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

// Status display mapping for UI consistency
export const STATUS_DISPLAY_NAMES: Record<TaskStatus, string> = {
  [TaskStatus.NOT_STARTED]: "not started",
  [TaskStatus.IN_PROGRESS]: "in progress",
  [TaskStatus.REVIEW]: "review",
  [TaskStatus.COMPLETED]: "completed",
  [TaskStatus.BLOCKED]: "blocked",
  [TaskStatus.DEPRECATED]: "deprecated",
};

// Status-specific action configurations
export const STATUS_ACTIONS: Record<TaskStatus, string[]> = {
  [TaskStatus.NOT_STARTED]: [
    "🤖 Execute with Cursor",
    "Generate Prompt",
    "View Requirements",
  ],
  [TaskStatus.IN_PROGRESS]: [
    "Continue Work",
    "Mark Complete",
    "View Dependencies",
  ],
  [TaskStatus.REVIEW]: [
    "Approve & Complete",
    "Request Changes",
    "View Implementation",
  ],
  [TaskStatus.COMPLETED]: ["View Code", "View Tests", "History"],
  [TaskStatus.BLOCKED]: [
    "View Blockers",
    "Update Dependencies",
    "Report Issue",
  ],
  [TaskStatus.DEPRECATED]: ["Archive", "View History"],
};

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export interface TaskErrorResponse {
  taskId?: string;
  operation:
    | "task_retrieval"
    | "status_update"
    | "dependency_resolution"
    | "test_results";
  suggestedAction?:
    | "retry"
    | "manual_update"
    | "refresh"
    | "clear_cache"
    | "check_permissions";
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
