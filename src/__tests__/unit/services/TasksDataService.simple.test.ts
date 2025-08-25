/**
 * TasksDataService Simple Import Test
 * Recovery Task 2.1.1: Verify basic export functionality
 * Recovery Task 2.2.4: Updated to provide required TaskStatusManager dependency
 * DATA-002: Updated to include JSONTaskParser and MockDataProvider dependencies
 */

import { TasksDataService } from "../../../services/TasksDataService";
import { TaskStatusManager } from "../../../services/TaskStatusManager";
import { JSONTaskParser } from "../../../services/JSONTaskParser";
import { MockDataProvider } from "../../../mock";

// Mock TaskStatusManager for simple tests
jest.mock("../../../services/TaskStatusManager");

describe("TasksDataService Simple Import", () => {
  it("should be importable directly from file", () => {
    expect(TasksDataService).toBeDefined();
    expect(typeof TasksDataService).toBe("function");
  });

  it("should create instance when imported directly with all required dependencies", () => {
    // Create mock instances for all required dependencies
    const mockTaskStatusManager = {} as TaskStatusManager;
    const mockJSONTaskParser = {} as JSONTaskParser;
    const mockMockDataProvider = {} as MockDataProvider;

    const service = new TasksDataService(
      mockTaskStatusManager,
      mockJSONTaskParser,
      mockMockDataProvider
    );
    expect(service).toBeInstanceOf(TasksDataService);
  });
});
