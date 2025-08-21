/**
 * Task Status Enums
 * Requirements: 1.1, 1.2, 2.1, 7.1
 */

export enum TaskStatus {
  NOT_STARTED = "not_started",
  IN_PROGRESS = "in_progress", 
  REVIEW = "review",
  COMPLETED = "completed",
  BLOCKED = "blocked",
  DEPRECATED = "deprecated"
}

export enum TaskComplexity {
  LOW = "low",
  MEDIUM = "medium", 
  HIGH = "high",
  EXTREME = "extreme"
}

export enum TaskPriority {
  LOW = "low",
  MEDIUM = "medium",
  HIGH = "high", 
  CRITICAL = "critical"
}

export enum TestStatus {
  NOT_RUN = "not_run",
  PASSING = "passing",
  FAILING = "failing",
  PARTIAL = "partial",
  ERROR = "error"
}
