/**
 * TasksDataService - Basic class structure for task data management
 * Recovery Task 2.1.1: Minimal class that compiles and can be instantiated
 * Recovery Task 2.2.1: Interface definition and stub methods
 * Recovery Task 2.2.4: Connect to TaskStatusManager for real data flow
 * Recovery Task 2.3.1: Add EventEmitter infrastructure for task updates
 * Recovery Task 2.3.2: Add Error Event Emitter infrastructure for error events
 * Requirements: 3.1-3.6, 4.1-4.4, 7.1-7.6
 */

import { EventEmitter } from "vscode";
import {
  Task,
  TaskStatus,
  TaskComplexity,
  TaskPriority,
  TaskErrorResponse,
} from "../types/tasks";
import { TaskStatusManager } from "./TaskStatusManager";

interface ITasksDataService {
  getTasks(): Promise<Task[]>;
  getTaskById(id: string): Promise<Task | null>;
}

export class TasksDataService implements ITasksDataService {
  // Event emitter for task updates - Recovery Task 2.3.1
  public readonly onTasksUpdated: EventEmitter<Task[]> = new EventEmitter<
    Task[]
  >();

  // Event emitter for error events - Recovery Task 2.3.2
  public readonly onError: EventEmitter<TaskErrorResponse> =
    new EventEmitter<TaskErrorResponse>();

  constructor(private taskStatusManager: TaskStatusManager) {
    // Constructor now accepts TaskStatusManager dependency
  }

  // Delegate to TaskStatusManager for real data
  async getTasks(): Promise<Task[]> {
    return await this.taskStatusManager.getTasks();
  }

  // Delegate to TaskStatusManager for individual task lookup
  async getTaskById(id: string): Promise<Task | null> {
    return await this.taskStatusManager.getTaskById(id);
  }

  // Cleanup method for event emitters - Recovery Task 2.3.1 & 2.3.2
  dispose(): void {
    this.onTasksUpdated.dispose();
    this.onError.dispose();
  }
}
