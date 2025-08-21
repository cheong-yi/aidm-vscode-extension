/**
 * TasksDataService - Basic class structure for task data management
 * Recovery Task 2.1.1: Minimal class that compiles and can be instantiated
 * Recovery Task 2.2.1: Interface definition and stub methods
 * Requirements: 3.1-3.6, 4.1-4.4, 7.1-7.6
 */

import { Task, TaskStatus, TaskComplexity, TaskPriority } from "../types/tasks";

interface ITasksDataService {
  getTasks(): Promise<Task[]>;
  getTaskById(id: string): Promise<Task | null>;
}

export class TasksDataService implements ITasksDataService {
  constructor() {
    // Empty constructor - just make it compile
  }

  // Mock data implementation
  async getTasks(): Promise<Task[]> {
    // Return 2-3 hardcoded Task objects
    const mockTasks: Task[] = [
      {
        id: "task-1",
        title: "Setup Project Structure",
        description: "Create basic project directories and files",
        status: TaskStatus.COMPLETED,
        complexity: TaskComplexity.LOW,
        dependencies: [],
        requirements: ["1.1"],
        createdDate: new Date("2024-01-01"),
        lastModified: new Date("2024-01-02"),
        priority: TaskPriority.HIGH,
      },
      {
        id: "task-2",
        title: "Implement Data Models",
        description: "Create core data model interfaces",
        status: TaskStatus.IN_PROGRESS,
        complexity: TaskComplexity.MEDIUM,
        dependencies: ["task-1"],
        requirements: ["2.1", "2.2"],
        createdDate: new Date("2024-01-02"),
        lastModified: new Date("2024-01-03"),
        priority: TaskPriority.MEDIUM,
      },
      {
        id: "task-3",
        title: "Setup Testing Framework",
        description: "Configure Jest and testing utilities",
        status: TaskStatus.NOT_STARTED,
        complexity: TaskComplexity.LOW,
        dependencies: ["task-1"],
        requirements: ["3.1"],
        createdDate: new Date("2024-01-03"),
        lastModified: new Date("2024-01-03"),
        priority: TaskPriority.LOW,
      },
    ];

    return mockTasks;
  }

  // Lookup implementation
  async getTaskById(id: string): Promise<Task | null> {
    const tasks = await this.getTasks();
    return tasks.find((t) => t.id === id) || null;
  }
}
