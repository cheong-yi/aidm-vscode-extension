/**
 * TasksDataService Simple Import Test
 * Recovery Task 2.1.1: Verify basic export functionality
 * Recovery Task 2.2.4: Updated to provide required TaskStatusManager dependency
 */

import { TasksDataService } from "../TasksDataService";
import { TaskStatusManager } from "../TaskStatusManager";

// Mock TaskStatusManager for simple tests
jest.mock("../TaskStatusManager");

describe("TasksDataService Simple Import", () => {
  it("should be importable directly from file", () => {
    expect(TasksDataService).toBeDefined();
    expect(typeof TasksDataService).toBe("function");
  });

  it("should create instance when imported directly with TaskStatusManager", () => {
    // Create a mock TaskStatusManager instance
    const mockTaskStatusManager = {} as TaskStatusManager;

    const service = new TasksDataService(mockTaskStatusManager);
    expect(service).toBeInstanceOf(TasksDataService);
  });
});
