/**
 * Mock Data Provider
 * Generates realistic enterprise data for demonstration and testing
 */

import { Task, TaskStatus, TaskComplexity } from "../types/tasks";

export interface MockConfiguration {
  responseDelay: number;
  errorRate: number;
}

export class MockDataProvider {
  private config: MockConfiguration;

  constructor(config: Partial<MockConfiguration> = {}) {
    this.config = {
      responseDelay: 0,
      errorRate: 0,
      ...config,
    };
  }


  /**
   * Get basic tasks for testing
   */
  async getTasks(): Promise<Task[]> {
    await this.simulateDelay();

    if (this.shouldSimulateError()) {
      throw new Error("Mock data provider error");
    }

    return [
      {
        id: "test-1",
        title: "Test Task 1",
        description: "A test task for unit testing",
        status: TaskStatus.NOT_STARTED,
        complexity: TaskComplexity.LOW,
        dependencies: [],
        requirements: ["test-req-1"],
        createdDate: new Date().toISOString(),
        lastModified: new Date().toISOString(),
        estimatedDuration: "15 min",
        isExecutable: true,
      },
      {
        id: "test-2",
        title: "Test Task 2",
        description: "Another test task for unit testing",
        status: TaskStatus.COMPLETED,
        complexity: TaskComplexity.MEDIUM,
        dependencies: ["test-1"],
        requirements: ["test-req-2"],
        createdDate: new Date().toISOString(),
        lastModified: new Date().toISOString(),
        estimatedDuration: "20 min",
        isExecutable: false,
        testStatus: {
          lastRunDate: new Date().toISOString(),
          totalTests: 5,
          passedTests: 5,
          failedTests: 0,
          failingTestsList: [],
          coverage: 100,
        },
      },
    ];
  }

  /**
   * Get task by ID with error handling
   */
  async getTaskById(id: string): Promise<Task | null> {
    await this.simulateDelay();

    if (this.shouldSimulateError()) {
      throw new Error("Mock data provider error");
    }

    if (!id || typeof id !== "string") {
      return null;
    }

    try {
      const tasks = await this.getTasks();
      return tasks.find((task) => task.id === id) || null;
    } catch (error) {
      console.error("Error retrieving task by ID:", error);
      return null;
    }
  }

  private async simulateDelay(): Promise<void> {
    if (this.config.responseDelay > 0) {
      await new Promise((resolve) =>
        setTimeout(resolve, this.config.responseDelay)
      );
    }
  }

  private shouldSimulateError(): boolean {
    return Math.random() < this.config.errorRate;
  }
}
