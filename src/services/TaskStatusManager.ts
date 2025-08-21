/**
 * Task Status Manager
 * Business logic layer for task management and status transitions
 * Requirements: 2.1, 3.1-3.6, 4.1-4.4, 7.1-7.6
 */

import {
  Task,
  TaskStatus,
  TaskComplexity,
  TaskPriority,
  TestStatus,
  ValidationResult,
  TaskUpdateRequest,
  TaskDependencyGraph,
  TaskStatistics,
} from "../types/tasks";
import { MarkdownTaskParser, ParsedTaskSection } from "./MarkdownTaskParser";

export interface StatusTransitionRule {
  from: TaskStatus;
  to: TaskStatus[];
  requiresApproval?: boolean;
  validationRules?: string[];
}

export interface TaskUpdateResult {
  success: boolean;
  taskId: string;
  previousStatus: TaskStatus;
  newStatus: TaskStatus;
  updatedAt: Date;
  validationWarnings?: string[];
  dependencyUpdates?: string[];
}

export class TaskStatusManager {
  private parser: MarkdownTaskParser;
  private statusTransitionRules!: Map<TaskStatus, StatusTransitionRule>;
  private tasks: Map<string, Task> = new Map();
  private sections: ParsedTaskSection[] = [];

  constructor(parser: MarkdownTaskParser) {
    this.parser = parser;
    this.initializeStatusTransitionRules();
  }

  /**
   * Load tasks from markdown file
   */
  async loadTasksFromFile(filePath: string): Promise<void> {
    try {
      const result = await this.parser.parseTasksFromFile(filePath);
      this.sections = result.sections;

      // Clear existing tasks and reload
      this.tasks.clear();
      for (const task of result.tasks) {
        this.tasks.set(task.id, task);
      }

      // Validate loaded data
      const validation = this.parser.validateTaskData(result.tasks);
      if (!validation.isValid) {
        console.warn("Task validation warnings:", validation.warnings);
        if (validation.errors.length > 0) {
          throw new Error(
            `Task validation failed: ${validation.errors.join(", ")}`
          );
        }
      }

      // Update dependencies and blocking status
      this.updateDependencyGraph();
    } catch (error) {
      throw new Error(
        `Failed to load tasks: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }

  /**
   * Get all tasks
   */
  getAllTasks(): Task[] {
    return Array.from(this.tasks.values());
  }

  /**
   * Get task by ID
   */
  getTaskById(taskId: string): Task | undefined {
    return this.tasks.get(taskId);
  }

  /**
   * Get tasks by status
   */
  getTasksByStatus(status: TaskStatus): Task[] {
    return Array.from(this.tasks.values()).filter(
      (task) => task.status === status
    );
  }

  /**
   * Get tasks by section
   */
  getTasksBySection(sectionHeading: string): Task[] {
    const section = this.sections.find((s) => s.heading === sectionHeading);
    return section ? section.tasks : [];
  }

  /**
   * Update task status
   */
  async updateTaskStatus(
    taskId: string,
    newStatus: TaskStatus,
    filePath?: string
  ): Promise<TaskUpdateResult> {
    const task = this.tasks.get(taskId);
    if (!task) {
      throw new Error(`Task not found: ${taskId}`);
    }

    const previousStatus = task.status;

    // Validate status transition
    const transitionValidation = this.validateStatusTransition(
      previousStatus,
      newStatus
    );
    if (!transitionValidation.isValid) {
      throw new Error(
        `Invalid status transition: ${transitionValidation.errors.join(", ")}`
      );
    }

    // Check dependencies
    const dependencyValidation = this.validateDependenciesForStatusChange(
      taskId,
      newStatus
    );
    if (!dependencyValidation.isValid) {
      throw new Error(
        `Dependency validation failed: ${dependencyValidation.errors.join(
          ", "
        )}`
      );
    }

    // Update task
    task.status = newStatus;
    task.lastModified = new Date();

    // Update file if path provided
    if (filePath) {
      await this.parser.updateTaskStatus(filePath, taskId, newStatus);
    }

    // Update dependency graph
    this.updateDependencyGraph();

    // Check if this unblocks other tasks
    const unblockedTasks = this.checkForUnblockedTasks(taskId);

    return {
      success: true,
      taskId,
      previousStatus,
      newStatus,
      updatedAt: new Date(),
      validationWarnings: transitionValidation.warnings,
      dependencyUpdates: unblockedTasks,
    };
  }

  /**
   * Update task with comprehensive data
   */
  async updateTask(
    updateRequest: TaskUpdateRequest,
    filePath?: string
  ): Promise<TaskUpdateResult> {
    const task = this.tasks.get(updateRequest.taskId);
    if (!task) {
      throw new Error(`Task not found: ${updateRequest.taskId}`);
    }

    const previousStatus = task.status;
    let newStatus = previousStatus;

    // Update fields
    if (updateRequest.status !== undefined) {
      const transitionValidation = this.validateStatusTransition(
        previousStatus,
        updateRequest.status
      );
      if (!transitionValidation.isValid) {
        throw new Error(
          `Invalid status transition: ${transitionValidation.errors.join(", ")}`
        );
      }
      newStatus = updateRequest.status;
      task.status = newStatus;
    }

    if (updateRequest.assignee !== undefined) {
      task.assignee = updateRequest.assignee;
    }

    if (updateRequest.estimatedHours !== undefined) {
      task.estimatedHours = updateRequest.estimatedHours;
    }

    if (updateRequest.actualHours !== undefined) {
      task.actualHours = updateRequest.actualHours;
    }

    if (updateRequest.testStatus !== undefined) {
      task.testStatus = updateRequest.testStatus;
    }

    if (updateRequest.tags !== undefined) {
      task.tags = updateRequest.tags;
    }

    if (updateRequest.priority !== undefined) {
      task.priority = updateRequest.priority;
    }

    task.lastModified = new Date();

    // Update file if path provided
    if (filePath) {
      await this.parser.serializeTasksToFile(filePath, this.sections);
    }

    // Update dependency graph
    this.updateDependencyGraph();

    return {
      success: true,
      taskId: updateRequest.taskId,
      previousStatus,
      newStatus,
      updatedAt: new Date(),
    };
  }

  /**
   * Get dependency graph for a task
   */
  getTaskDependencyGraph(taskId: string): TaskDependencyGraph | null {
    const task = this.tasks.get(taskId);
    if (!task) {
      return null;
    }

    const dependencies = [...task.dependencies];
    const dependents = this.getDependentTasks(taskId);
    const circularDependencies = this.detectCircularDependenciesForTask(taskId);
    const isBlocked = this.isTaskBlocked(taskId);
    const blockingTasks = this.getBlockingTasks(taskId);

    return {
      taskId,
      dependencies,
      dependents,
      circularDependencies,
      isBlocked,
      blockingTasks,
    };
  }

  /**
   * Get task statistics
   */
  getTaskStatistics(): TaskStatistics {
    const allTasks = Array.from(this.tasks.values());
    const completedTasks = allTasks.filter(
      (t) => t.status === TaskStatus.COMPLETED
    );
    const inProgressTasks = allTasks.filter(
      (t) => t.status === TaskStatus.IN_PROGRESS
    );
    const blockedTasks = allTasks.filter(
      (t) => t.status === TaskStatus.BLOCKED
    );
    const notStartedTasks = allTasks.filter(
      (t) => t.status === TaskStatus.NOT_STARTED
    );

    // Calculate average completion time
    const completionTimes = completedTasks
      .filter((t) => t.createdDate && t.lastModified)
      .map((t) => t.lastModified.getTime() - t.createdDate.getTime());

    const averageCompletionTime =
      completionTimes.length > 0
        ? completionTimes.reduce((sum, time) => sum + time, 0) /
          completionTimes.length
        : 0;

    // Calculate test coverage
    const tasksWithTests = allTasks.filter((t) => t.testStatus);
    const testCoverage =
      allTasks.length > 0 ? (tasksWithTests.length / allTasks.length) * 100 : 0;

    // Calculate distributions
    const priorityDistribution: Record<TaskPriority, number> = {
      [TaskPriority.LOW]: 0,
      [TaskPriority.MEDIUM]: 0,
      [TaskPriority.HIGH]: 0,
      [TaskPriority.CRITICAL]: 0,
    };

    const complexityDistribution: Record<TaskComplexity, number> = {
      [TaskComplexity.LOW]: 0,
      [TaskComplexity.MEDIUM]: 0,
      [TaskComplexity.HIGH]: 0,
      [TaskComplexity.EXTREME]: 0,
    };

    for (const task of allTasks) {
      if (task.priority) {
        priorityDistribution[task.priority]++;
      }
      if (task.complexity) {
        complexityDistribution[task.complexity]++;
      }
    }

    return {
      totalTasks: allTasks.length,
      completedTasks: completedTasks.length,
      inProgressTasks: inProgressTasks.length,
      blockedTasks: blockedTasks.length,
      notStartedTasks: notStartedTasks.length,
      averageCompletionTime,
      testCoverage,
      priorityDistribution,
      complexityDistribution,
    };
  }

  /**
   * Search tasks with filters
   */
  searchTasks(query: string, filters?: any): Task[] {
    let filteredTasks = Array.from(this.tasks.values());

    // Text search
    if (query) {
      const lowerQuery = query.toLowerCase();
      filteredTasks = filteredTasks.filter(
        (task) =>
          task.title.toLowerCase().includes(lowerQuery) ||
          task.description.toLowerCase().includes(lowerQuery) ||
          task.id.includes(query)
      );
    }

    // Apply filters
    if (filters) {
      if (filters.status && filters.status.length > 0) {
        filteredTasks = filteredTasks.filter((task) =>
          filters.status.includes(task.status)
        );
      }

      if (filters.complexity && filters.complexity.length > 0) {
        filteredTasks = filteredTasks.filter((task) =>
          filters.complexity.includes(task.complexity)
        );
      }

      if (filters.priority && filters.priority.length > 0) {
        filteredTasks = filteredTasks.filter((task) =>
          filters.priority.includes(task.priority)
        );
      }

      if (filters.assignee) {
        filteredTasks = filteredTasks.filter(
          (task) => task.assignee === filters.assignee
        );
      }

      if (filters.tags && filters.tags.length > 0) {
        filteredTasks = filteredTasks.filter(
          (task) =>
            task.tags &&
            filters.tags.some((tag: string) => task.tags!.includes(tag))
        );
      }
    }

    return filteredTasks;
  }

  /**
   * Initialize status transition rules
   */
  private initializeStatusTransitionRules(): void {
    this.statusTransitionRules = new Map([
      [
        TaskStatus.NOT_STARTED,
        {
          from: TaskStatus.NOT_STARTED,
          to: [
            TaskStatus.IN_PROGRESS,
            TaskStatus.BLOCKED,
            TaskStatus.DEPRECATED,
          ],
        },
      ],
      [
        TaskStatus.IN_PROGRESS,
        {
          from: TaskStatus.IN_PROGRESS,
          to: [
            TaskStatus.REVIEW,
            TaskStatus.BLOCKED,
            TaskStatus.DEPRECATED,
            TaskStatus.NOT_STARTED,
          ],
        },
      ],
      [
        TaskStatus.REVIEW,
        {
          from: TaskStatus.REVIEW,
          to: [
            TaskStatus.COMPLETED,
            TaskStatus.IN_PROGRESS,
            TaskStatus.BLOCKED,
          ],
        },
      ],
      [
        TaskStatus.COMPLETED,
        {
          from: TaskStatus.COMPLETED,
          to: [TaskStatus.IN_PROGRESS, TaskStatus.DEPRECATED],
        },
      ],
      [
        TaskStatus.BLOCKED,
        {
          from: TaskStatus.BLOCKED,
          to: [
            TaskStatus.NOT_STARTED,
            TaskStatus.IN_PROGRESS,
            TaskStatus.DEPRECATED,
          ],
        },
      ],
      [
        TaskStatus.DEPRECATED,
        {
          from: TaskStatus.DEPRECATED,
          to: [TaskStatus.NOT_STARTED],
        },
      ],
    ]);
  }

  /**
   * Validate status transition
   */
  private validateStatusTransition(
    from: TaskStatus,
    to: TaskStatus
  ): ValidationResult {
    const rule = this.statusTransitionRules.get(from);
    if (!rule) {
      return {
        isValid: false,
        errors: [`No transition rules found for status: ${from}`],
        warnings: [],
      };
    }

    if (!rule.to.includes(to)) {
      return {
        isValid: false,
        errors: [`Invalid transition from ${from} to ${to}`],
        warnings: [],
      };
    }

    return {
      isValid: true,
      errors: [],
      warnings: [],
    };
  }

  /**
   * Validate dependencies for status change
   */
  private validateDependenciesForStatusChange(
    taskId: string,
    newStatus: TaskStatus
  ): ValidationResult {
    if (
      newStatus === TaskStatus.IN_PROGRESS ||
      newStatus === TaskStatus.REVIEW
    ) {
      const task = this.tasks.get(taskId);
      if (task && task.dependencies.length > 0) {
        const incompleteDependencies = task.dependencies.filter((depId) => {
          const depTask = this.tasks.get(depId);
          return depTask && depTask.status !== TaskStatus.COMPLETED;
        });

        if (incompleteDependencies.length > 0) {
          return {
            isValid: false,
            errors: [
              `Task has incomplete dependencies: ${incompleteDependencies.join(
                ", "
              )}`,
            ],
            warnings: [],
          };
        }
      }
    }

    return {
      isValid: true,
      errors: [],
      warnings: [],
    };
  }

  /**
   * Update dependency graph
   */
  private updateDependencyGraph(): void {
    for (const task of this.tasks.values()) {
      if (task.dependencies.length > 0) {
        const isBlocked = this.isTaskBlocked(task.id);
        if (isBlocked && task.status !== TaskStatus.BLOCKED) {
          task.status = TaskStatus.BLOCKED;
        } else if (!isBlocked && task.status === TaskStatus.BLOCKED) {
          // Restore previous status if no longer blocked
          task.status = TaskStatus.NOT_STARTED;
        }
      }
    }
  }

  /**
   * Check if task is blocked
   */
  private isTaskBlocked(taskId: string): boolean {
    const task = this.tasks.get(taskId);
    if (!task || task.dependencies.length === 0) {
      return false;
    }

    return task.dependencies.some((depId) => {
      const depTask = this.tasks.get(depId);
      return depTask && depTask.status !== TaskStatus.COMPLETED;
    });
  }

  /**
   * Get blocking tasks
   */
  private getBlockingTasks(taskId: string): string[] {
    const task = this.tasks.get(taskId);
    if (!task || task.dependencies.length === 0) {
      return [];
    }

    return task.dependencies.filter((depId) => {
      const depTask = this.tasks.get(depId);
      return depTask && depTask.status !== TaskStatus.COMPLETED;
    });
  }

  /**
   * Get dependent tasks
   */
  private getDependentTasks(taskId: string): string[] {
    return Array.from(this.tasks.values())
      .filter((task) => task.dependencies.includes(taskId))
      .map((task) => task.id);
  }

  /**
   * Check for unblocked tasks
   */
  private checkForUnblockedTasks(completedTaskId: string): string[] {
    const dependentTasks = this.getDependentTasks(completedTaskId);
    const unblockedTasks: string[] = [];

    for (const depTaskId of dependentTasks) {
      const depTask = this.tasks.get(depTaskId);
      if (
        depTask &&
        depTask.status === TaskStatus.BLOCKED &&
        !this.isTaskBlocked(depTaskId)
      ) {
        depTask.status = TaskStatus.NOT_STARTED;
        unblockedTasks.push(depTaskId);
      }
    }

    return unblockedTasks;
  }

  /**
   * Detect circular dependencies for a specific task
   */
  private detectCircularDependenciesForTask(taskId: string): string[] {
    const visited = new Set<string>();
    const recursionStack = new Set<string>();
    const circularPaths: string[][] = [];

    const dfs = (currentTaskId: string, path: string[]): void => {
      if (recursionStack.has(currentTaskId)) {
        const cycleStart = path.indexOf(currentTaskId);
        circularPaths.push(path.slice(cycleStart));
        return;
      }

      if (visited.has(currentTaskId)) {
        return;
      }

      visited.add(currentTaskId);
      recursionStack.add(currentTaskId);

      const task = this.tasks.get(currentTaskId);
      if (task) {
        for (const depId of task.dependencies) {
          dfs(depId, [...path, currentTaskId]);
        }
      }

      recursionStack.delete(currentTaskId);
    };

    dfs(taskId, []);
    return circularPaths.map((path) => [...path, path[0]].join(" -> "));
  }
}
