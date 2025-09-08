/**
 * Simple Test Data
 * Basic test fixtures for unit testing
 */

import { Task, TaskStatus, TaskComplexity } from "../types/tasks";

/**
 * Sample tasks for testing
 */
export const sampleTasks: Task[] = [
  {
    id: "test-task-1",
    title: "Test Task 1",
    description: "A simple test task for unit testing",
    status: TaskStatus.NOT_STARTED,
    complexity: TaskComplexity.LOW,
    dependencies: [],
    requirements: ["req-1"],
    createdDate: new Date().toISOString(),
    lastModified: new Date().toISOString(),
    estimatedDuration: "15 min",
    isExecutable: true,
  },
  {
    id: "test-task-2",
    title: "Test Task 2",
    description: "Another test task with completed status",
    status: TaskStatus.COMPLETED,
    complexity: TaskComplexity.MEDIUM,
    dependencies: ["test-task-1"],
    requirements: ["req-2"],
    createdDate: new Date().toISOString(),
    lastModified: new Date().toISOString(),
    estimatedDuration: "30 min",
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




