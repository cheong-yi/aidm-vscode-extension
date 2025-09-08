/**
 * Task-Specific Business Logic Types
 * Requirements: 1.1, 1.2, 2.1, 7.1
 * 
 * This file contains ONLY unique interfaces that extend or specialize
 * the core types defined in ../../types/tasks.ts
 */

// Import core types for use in this file's interfaces
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
  TaskPerformance
} from "../../types/tasks";

// ============================================================================
// TASK-SPECIFIC BUSINESS LOGIC TYPES (Unique to this module)
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
