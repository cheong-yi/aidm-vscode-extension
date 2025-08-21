/**
 * TasksDataService - Basic class structure for task data management
 * Recovery Task 2.1.1: Minimal class that compiles and can be instantiated
 * Recovery Task 2.2.1: Interface definition and stub methods
 * Recovery Task 2.2.4: Connect to TaskStatusManager for real data flow
 * Requirements: 3.1-3.6, 4.1-4.4, 7.1-7.6
 */

import { Task, TaskStatus, TaskComplexity, TaskPriority } from "../types/tasks";
import { TaskStatusManager } from "./TaskStatusManager";

interface ITasksDataService {
  getTasks(): Promise<Task[]>;
  getTaskById(id: string): Promise<Task | null>;
}

export class TasksDataService implements ITasksDataService {
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
}
