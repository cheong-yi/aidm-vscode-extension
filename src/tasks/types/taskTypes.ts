/**
 * Core Task Type Definitions
 * Requirements: 1.1, 1.2, 2.1, 7.1
 */

import { TaskStatus, TaskComplexity, TaskPriority, TestStatus as TestStatusEnum } from './taskEnums';

/**
 * Main Task interface representing a development task
 */
export interface Task {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  complexity: TaskComplexity;
  priority: TaskPriority;
  dependencies: string[];
  requirements: string[];
  createdDate: string; // ISO date string for TimeFormattingUtility compatibility
  lastModified: string; // ISO date string for TimeFormattingUtility compatibility
  assignee?: string;
  estimatedHours?: number;
  actualHours?: number;
  estimatedDuration?: string; // "15-30 min", "20-25 min" format
  isExecutable?: boolean; // true for not_started tasks eligible for Cursor integration
  testStatus?: TaskTestStatus;
  tags?: string[];
  parentTaskId?: string;
  subTasks?: string[];
  notes?: string;
  dueDate?: string; // ISO date string
  statusDisplayName?: string; // From STATUS_DISPLAY_NAMES mapping
}

/**
 * Test results associated with a task
 */
export interface TaskTestStatus {
  lastRunDate?: string; // ISO date string
  totalTests: number;
  passedTests: number;
  failedTests: number;
  failingTestsList?: FailingTest[];
  testSuite?: string;
  coverage?: number;
  status: TestStatusEnum;
  errorMessage?: string;
  executionTime?: number;
}

/**
 * Individual failing test information
 */
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

/**
 * Validation result for task data integrity
 */
export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  suggestions?: string[];
}

/**
 * Task context with related information
 */
export interface TaskContext {
  task: Task;
  relatedRequirements: string[];
  codeMappings: string[];
  businessContext?: string;
  dependencies: Task[];
  blockers: Task[];
  testResults?: TaskTestStatus;
  estimatedCompletion?: string; // ISO date string
  progressPercentage?: number;
}

/**
 * Task data structure with metadata
 */
export interface TaskData {
  tasks: Task[];
  metadata: TaskMetadata;
  relationships: TaskRelationships;
  performance: TaskPerformance;
}

/**
 * Task metadata information
 */
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

/**
 * Task relationship mappings
 */
export interface TaskRelationships {
  taskDependencies: Record<string, string[]>;
  requirementMappings: Record<string, string[]>;
  fileMappings: Record<string, string[]>;
  testMappings: Record<string, string[]>;
}

/**
 * Task performance metrics
 */
export interface TaskPerformance {
  lastRefreshTime: Date;
  refreshDuration: number;
  cacheHitRate: number;
  averageResponseTime: number;
  memoryUsage?: number;
}
