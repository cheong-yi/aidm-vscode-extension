/**
 * TaskStatusManager Unit Tests
 * Recovery Task 2.1.5: Test minimal class structure
 * Recovery Task 2.1.6: Test integration with MarkdownTaskParser
 * Requirements: 3.1-3.6, 4.1-4.4, 7.1-7.6
 */

import { jest } from "@jest/globals";
import { TaskStatusManager } from "../TaskStatusManager";
import { MarkdownTaskParser } from "../MarkdownTaskParser";
import { Task, TaskStatus } from "../../types/tasks";

describe("TaskStatusManager", () => {
  let manager: TaskStatusManager;
  let mockParser: jest.Mocked<MarkdownTaskParser>;

  beforeEach(() => {
    // Create mock MarkdownTaskParser with all required methods
    mockParser = {
      parseTasksFromFile: jest.fn(),
      parseTaskFromMarkdown: jest.fn(),
    } as jest.Mocked<MarkdownTaskParser>;
    
    manager = new TaskStatusManager(mockParser);
  });

  // Test 1: Basic instantiation
  it("should create TaskStatusManager instance successfully", () => {
    expect(manager).toBeDefined();
    expect(manager).toBeInstanceOf(TaskStatusManager);
  });

  // Test 2: Constructor behavior
  it("should not throw error when constructor is called with MarkdownTaskParser", () => {
    expect(() => {
      new TaskStatusManager(mockParser);
    }).not.toThrow();
  });

  // Test 3: Import/export
  it("should be importable as a class", () => {
    expect(TaskStatusManager).toBeDefined();
    expect(typeof TaskStatusManager).toBe("function");
  });

  // Test 4: Type checking
  it("should be instanceof TaskStatusManager", () => {
    expect(manager).toBeInstanceOf(TaskStatusManager);
  });

  // Recovery Task 2.1.6: Integration tests
  describe("getTasks integration with MarkdownTaskParser", () => {
    it("should call parseTasksFromFile with hardcoded path", async () => {
      // Arrange
      const mockTasks: Task[] = [
        {
          id: "task-1",
          title: "Test Task",
          description: "Test Description",
          status: TaskStatus.NOT_STARTED,
          complexity: "low" as any,
          dependencies: [],
          requirements: ["1.1"],
          createdDate: "2024-01-01T00:00:00Z",
          lastModified: "2024-01-01T00:00:00Z",
        }
      ];
      mockParser.parseTasksFromFile.mockResolvedValue(mockTasks);

      // Act
      await manager.getTasks();

      // Assert
      expect(mockParser.parseTasksFromFile).toHaveBeenCalledWith("./tasks.md");
    });

    it("should return mock data from parser", async () => {
      // Arrange
      const mockTasks: Task[] = [
        {
          id: "task-1",
          title: "Setup Project Structure",
          description: "Create basic project directories and files",
          status: TaskStatus.COMPLETED,
          complexity: "low" as any,
          dependencies: [],
          requirements: ["1.1", "1.2"],
          createdDate: "2024-01-01T00:00:00Z",
          lastModified: "2024-01-02T00:00:00Z",
          assignee: "dev-team",
          estimatedHours: 2,
          actualHours: 1.5,
          priority: "high" as any,
          tags: ["setup", "foundation"],
        }
      ];
      mockParser.parseTasksFromFile.mockResolvedValue(mockTasks);

      // Act
      const result = await manager.getTasks();

      // Assert
      expect(result).toEqual(mockTasks);
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe("task-1");
    });

    it("should propagate parser errors", async () => {
      // Arrange
      const parserError = new Error("Parser failed");
      mockParser.parseTasksFromFile.mockRejectedValue(parserError);

      // Act & Assert
      await expect(manager.getTasks()).rejects.toThrow("Parser failed");
      expect(mockParser.parseTasksFromFile).toHaveBeenCalledWith("./tasks.md");
    });
  });
});
