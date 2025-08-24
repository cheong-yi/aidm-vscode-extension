/**
 * Task-related Type Definitions - Single Source of Truth
 * Requirements: 2.1, 3.1-3.6, 4.1-4.4, 7.1-7.6
 * Enhanced for Taskmaster Dashboard: 6.8, 6.9, 7.7
 */

// ============================================================================
// CORE TASK INTERFACES
// ============================================================================

export interface Task {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  complexity: TaskComplexity;
  priority?: TaskPriority; // Made optional to support test scenarios
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
  parentTaskId?: string;
  subTasks?: string[];
  notes?: string;
  dueDate?: string; // ISO date string
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
  status?: TestStatusEnum; // Made optional to support test scenarios
  errorMessage?: string;
  executionTime?: number;
}

export interface FailingTest {
  name: string;
  message: string;
  stackTrace?: string;
  category: "assertion" | "type" | "filesystem" | "timeout" | "network";
  testFile?: string;
  lineNumber?: number;
  expectedValue?: string;
  actualValue?: string;
}

// ============================================================================
// ENUM DEFINITIONS
// ============================================================================

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

export enum TestStatusEnum {
  NOT_RUN = "not_run",
  PASSING = "passing",
  FAILING = "failing",
  PARTIAL = "partial",
  ERROR = "error",
}

// ============================================================================
// STATUS CONSTANTS AND MAPPINGS
// ============================================================================

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
    "Robot Execute with Cursor",
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

// ============================================================================
// VALIDATION AND ERROR TYPES
// ============================================================================

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  suggestions?: string[];
}

export interface TaskErrorResponse {
  taskId?: string;
  operation:
    | "task_retrieval"
    | "status_update"
    | "dependency_resolution"
    | "test_results"
    | "file_validation";
  suggestedAction?:
    | "retry"
    | "manual_update"
    | "refresh"
    | "clear_cache"
    | "check_permissions"
    | "configure_file";
  retryAfter?: number;
  userInstructions?: string;
  technicalDetails?: string;
  supportContact?: string;
}

// ============================================================================
// TASK OPERATION TYPES
// ============================================================================

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

// ============================================================================
// TASK CONTEXT AND METADATA TYPES
// ============================================================================

export interface TaskContext {
  task: Task;
  relatedRequirements: string[];
  codeMappings: string[];
  businessContext?: string;
  dependencies: Task[];
  blockers: Task[];
  testResults?: TestStatus;
  estimatedCompletion?: string; // ISO date string
  progressPercentage?: number;
}

export interface TaskData {
  tasks: Task[];
  metadata: TaskMetadata;
  relationships: TaskRelationships;
  performance: TaskPerformance;
}

export interface TaskMetadata {
  lastUpdated: string; // ISO date string
  totalTasks: number;
  completedTasks: number;
  inProgressTasks: number;
  blockedTasks: number;
  testCoverage: number;
  averageComplexity: TaskComplexity;
  projectName?: string;
  sprintName?: string;
}

export interface TaskRelationships {
  taskDependencies: Record<string, string[]>;
  requirementMappings: Record<string, string[]>;
  fileMappings: Record<string, string[]>;
  testMappings: Record<string, string[]>;
}

export interface TaskPerformance {
  lastRefreshTime: Date;
  refreshDuration: number;
  cacheHitRate: number;
  averageResponseTime: number;
  memoryUsage?: number;
}
