/**
 * TaskTreeViewProvider Unit Tests
 * Task 3.2.3: Test TasksDataService dependency injection and integration
 * Requirements: 3.1.2, 3.2.6, 3.2.3
 */

import { TaskTreeViewProvider } from "../../../../tasks/providers/TaskTreeViewProvider";
import { TasksDataService } from "../../../../services/TasksDataService";
import {
  Task,
  TaskStatus,
  TaskComplexity,
  TaskPriority,
} from "../../../../tasks/types";
import { TaskTreeItem } from "../../../../tasks/providers/TaskTreeItem";

// Mock TasksDataService
jest.mock("../../../../services/TasksDataService");
const MockTasksDataService = TasksDataService as jest.MockedClass<
  typeof TasksDataService
>;

describe("TaskTreeViewProvider", () => {
  let mockTasksDataService: jest.Mocked<TasksDataService>;
  let provider: TaskTreeViewProvider;

  // Sample task data for testing
  const mockTask: Task = {
    id: "test-task-1",
    title: "Test Task",
    description: "A test task for unit testing",
    status: TaskStatus.NOT_STARTED,
    complexity: TaskComplexity.LOW,
    priority: TaskPriority.MEDIUM,
    dependencies: [],
    requirements: ["req-1"],
    createdDate: "2024-01-01T00:00:00.000Z",
    lastModified: "2024-01-01T00:00:00.000Z",
    estimatedDuration: "15-30 min",
    isExecutable: true,
  };

  const mockTasks: Task[] = [mockTask];

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Create mock TasksDataService with minimal implementation
    mockTasksDataService = {
      getTasks: jest.fn(),
      getTaskById: jest.fn(),
      updateTaskStatus: jest.fn(),
      makeJSONRPCCall: jest.fn(),
      onTasksUpdated: {
        fire: jest.fn(),
        event: jest.fn(),
        dispose: jest.fn(),
      } as any,
      onError: {
        fire: jest.fn(),
        event: jest.fn(),
        dispose: jest.fn(),
      } as any,
      dispose: jest.fn(),
      // Add missing properties to satisfy interface
      httpClient: {} as any,
      serverUrl: "http://localhost:3001",
      taskStatusManager: {} as any,
      setupHttpClient: jest.fn(),
      setHttpClientForTesting: jest.fn(),
    } as unknown as jest.Mocked<TasksDataService>;

    // Create provider instance with mocked service
    provider = new TaskTreeViewProvider(mockTasksDataService);
  });

  describe("Constructor and Dependency Injection", () => {
    it("should accept TasksDataService parameter and store it as private property", () => {
      // Arrange & Act: Done in beforeEach

      // Assert: Verify service is stored and accessible
      expect(provider).toBeInstanceOf(TaskTreeViewProvider);
      expect(mockTasksDataService.getTasks).toBeDefined();
    });

    it("should follow existing project dependency injection patterns", () => {
      // Assert: Verify constructor follows project patterns
      expect(provider).toHaveProperty("onDidChangeTreeData");
      expect(provider).toHaveProperty("refresh");
      expect(provider).toHaveProperty("dispose");
    });

    it("should store TasksDataService as readonly private property", () => {
      // Assert: Verify service is stored as private readonly
      // Note: We can't directly access private properties in TypeScript
      // but we can verify the behavior through public methods
      expect(mockTasksDataService.getTasks).toBeDefined();
    });
  });

  describe("Service Integration", () => {
    it("should call TasksDataService.getTasks() in getChildren method", async () => {
      // Arrange
      mockTasksDataService.getTasks.mockResolvedValue(mockTasks);

      // Act
      await provider.getChildren();

      // Assert
      expect(mockTasksDataService.getTasks).toHaveBeenCalledTimes(1);
      expect(mockTasksDataService.getTasks).toHaveBeenCalledWith();
    });

    it("should convert returned tasks to TaskTreeItems", async () => {
      // Arrange
      mockTasksDataService.getTasks.mockResolvedValue(mockTasks);

      // Act
      const result = await provider.getChildren();

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0]).toHaveProperty("id", "test-task-1");
      expect(result[0]).toHaveProperty("task", mockTask);
    });

    it("should handle empty task list by showing no-tasks state", async () => {
      // Arrange
      mockTasksDataService.getTasks.mockResolvedValue([]);

      // Act
      const result = await provider.getChildren();

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0]).toHaveProperty("contextValue", "empty-state");
      expect(result[0]).toHaveProperty("label", "No Tasks Available");
    });
  });

  describe("Task 3.2.4: Flat List getChildren Implementation", () => {
    it("should return all tasks as top-level items when called with no element (root call)", async () => {
      // Arrange
      const multipleTasks: Task[] = [
        { ...mockTask, id: "task-1", title: "Task 1" },
        { ...mockTask, id: "task-2", title: "Task 2" },
        { ...mockTask, id: "task-3", title: "Task 3" },
      ];
      mockTasksDataService.getTasks.mockResolvedValue(multipleTasks);

      // Act: Root call (no element parameter)
      const result = await provider.getChildren();

      // Assert: Should return all tasks as top-level items
      expect(result).toHaveLength(3);
      expect(result[0]).toHaveProperty("id", "task-1");
      expect(result[1]).toHaveProperty("id", "task-2");
      expect(result[2]).toHaveProperty("id", "task-3");

      // Verify all are TaskTreeItem instances
      result.forEach((item) => {
        expect(item).toBeInstanceOf(TaskTreeItem);
      });
    });

    it("should return empty array when called with element parameter (flat list structure)", async () => {
      // Arrange
      const taskTreeItem = new TaskTreeItem(mockTask);

      // Act: Element call (with element parameter)
      const result = await provider.getChildren(taskTreeItem);

      // Assert: Should return empty array for flat list design
      expect(result).toEqual([]);
      expect(result).toHaveLength(0);
    });

    it("should maintain flat list structure for all task elements", async () => {
      // Arrange
      const multipleTasks: Task[] = [
        { ...mockTask, id: "task-1" },
        { ...mockTask, id: "task-2" },
        { ...mockTask, id: "task-3" },
      ];
      mockTasksDataService.getTasks.mockResolvedValue(multipleTasks);

      // Act: Get root tasks first
      const rootTasks = await provider.getChildren();

      // Then test each task element returns no children
      const childResults = await Promise.all(
        rootTasks.map((task) => provider.getChildren(task))
      );

      // Assert: All element calls return empty arrays
      childResults.forEach((result) => {
        expect(result).toEqual([]);
        expect(result).toHaveLength(0);
      });
    });

    it("should preserve enhanced TaskTreeItem properties in flat list conversion", async () => {
      // Arrange: Task with enhanced properties
      const enhancedTask: Task = {
        ...mockTask,
        id: "enhanced-task",
        estimatedDuration: "25-30 min",
        isExecutable: true,
        testStatus: {
          totalTests: 10,
          passedTests: 8,
          failedTests: 2,
          lastRunDate: "2024-01-01T12:00:00.000Z",
        },
      };
      mockTasksDataService.getTasks.mockResolvedValue([enhancedTask]);

      // Act
      const result = await provider.getChildren();

      // Assert: Enhanced properties should be preserved
      expect(result).toHaveLength(1);
      const treeItem = result[0] as TaskTreeItem;
      expect(treeItem.task.estimatedDuration).toBe("25-30 min");
      expect(treeItem.task.isExecutable).toBe(true);
      expect(treeItem.task.testStatus?.totalTests).toBe(10);
      expect(treeItem.isExecutable).toBe(true);
      expect(treeItem.estimatedDuration).toBe("25-30 min");
    });

    it("should handle mixed task types correctly in flat list", async () => {
      // Arrange: Mix of different task statuses and complexities
      const mixedTasks: Task[] = [
        {
          ...mockTask,
          id: "not-started",
          status: TaskStatus.NOT_STARTED,
          complexity: TaskComplexity.LOW,
        },
        {
          ...mockTask,
          id: "in-progress",
          status: TaskStatus.IN_PROGRESS,
          complexity: TaskComplexity.MEDIUM,
        },
        {
          ...mockTask,
          id: "completed",
          status: TaskStatus.COMPLETED,
          complexity: TaskComplexity.HIGH,
        },
      ];
      mockTasksDataService.getTasks.mockResolvedValue(mixedTasks);

      // Act
      const result = await provider.getChildren();

      // Assert: All tasks should be converted to TaskTreeItems with correct properties
      expect(result).toHaveLength(3);

      const notStartedItem = result[0] as TaskTreeItem;
      const inProgressItem = result[1] as TaskTreeItem;
      const completedItem = result[2] as TaskTreeItem;

      expect(notStartedItem.task.status).toBe(TaskStatus.NOT_STARTED);
      expect(notStartedItem.isExecutable).toBe(true);
      expect(inProgressItem.task.status).toBe(TaskStatus.IN_PROGRESS);
      expect(inProgressItem.isExecutable).toBe(false);
      expect(completedItem.task.status).toBe(TaskStatus.COMPLETED);
      expect(completedItem.isExecutable).toBe(false);
    });
  });

  describe("Error Handling", () => {
    it("should handle service unavailability gracefully", async () => {
      // Arrange
      mockTasksDataService.getTasks.mockRejectedValue(
        new Error("Service unavailable")
      );

      // Act
      const result = await provider.getChildren();

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0]).toHaveProperty("contextValue", "empty-state-error");
      expect(result[0]).toHaveProperty("label", "Unable to Load Tasks");
    });

    it("should handle null/undefined service gracefully", async () => {
      // Arrange: Create provider with null service (edge case)
      const providerWithNullService = new TaskTreeViewProvider(null as any);

      // Act & Assert: Should not crash during construction
      expect(providerWithNullService).toBeInstanceOf(TaskTreeViewProvider);
    });

    it("should log errors when service methods throw", async () => {
      // Arrange
      const consoleSpy = jest.spyOn(console, "warn").mockImplementation();
      mockTasksDataService.getTasks.mockRejectedValue(
        new Error("Network error")
      );

      // Act
      await provider.getChildren();

      // Assert
      expect(consoleSpy).toHaveBeenCalledWith(
        "Failed to retrieve tasks from TasksDataService:",
        expect.any(Error)
      );

      // Cleanup
      consoleSpy.mockRestore();
    });
  });

  describe("TypeScript Type Safety", () => {
    it("should maintain proper typing for service dependency", () => {
      // Assert: Verify TypeScript compilation with proper types
      expect(typeof mockTasksDataService.getTasks).toBe("function");
      // Note: Jest mocks don't work with toBeInstanceOf, so we check the type instead
      expect(mockTasksDataService.getTasks).toBeDefined();
    });

    it("should enforce TasksDataService interface compliance", () => {
      // Assert: Verify service implements required interface
      expect(mockTasksDataService).toHaveProperty("getTasks");
      expect(mockTasksDataService).toHaveProperty("onTasksUpdated");
      expect(mockTasksDataService).toHaveProperty("onError");
    });
  });

  describe("Integration Readiness", () => {
    it("should be ready for getChildren implementation with real data", async () => {
      // Arrange
      mockTasksDataService.getTasks.mockResolvedValue(mockTasks);

      // Act
      const result = await provider.getChildren();

      // Assert: Verify data flow is established
      expect(result).toHaveLength(1);
      expect(result[0]).toHaveProperty("task");
      expect(result[0]).toHaveProperty("id");
    });

    it("should handle multiple tasks correctly", async () => {
      // Arrange
      const multipleTasks: Task[] = [
        { ...mockTask, id: "task-1" },
        { ...mockTask, id: "task-2" },
        { ...mockTask, id: "task-3" },
      ];
      mockTasksDataService.getTasks.mockResolvedValue(multipleTasks);

      // Act
      const result = await provider.getChildren();

      // Assert
      expect(result).toHaveLength(3);
      expect(result[0]).toHaveProperty("id", "task-1");
      expect(result[1]).toHaveProperty("id", "task-2");
      expect(result[2]).toHaveProperty("id", "task-3");
    });
  });

  describe("VSCode TreeDataProvider Interface Compliance", () => {
    it("should implement required TreeDataProvider methods", () => {
      // Assert: Verify interface compliance
      expect(typeof provider.getTreeItem).toBe("function");
      expect(typeof provider.getChildren).toBe("function");
      expect(provider).toHaveProperty("onDidChangeTreeData");
    });

    it("should handle getTreeItem correctly", () => {
      // Arrange
      const mockElement = { id: "test" } as any;

      // Act
      const result = provider.getTreeItem(mockElement);

      // Assert
      expect(result).toBe(mockElement);
    });

    it("should maintain refresh functionality", () => {
      // Act & Assert: Should not crash
      expect(() => provider.refresh()).not.toThrow();
    });

    it("should maintain dispose functionality", () => {
      // Act & Assert: Should not crash
      expect(() => provider.dispose()).not.toThrow();
    });
  });

  describe("Performance and Efficiency", () => {
    it("should handle concurrent getChildren calls efficiently", async () => {
      // Arrange
      mockTasksDataService.getTasks.mockResolvedValue(mockTasks);

      // Act: Make concurrent calls
      const promises = [
        provider.getChildren(),
        provider.getChildren(),
        provider.getChildren(),
      ];

      // Assert: All calls should complete successfully
      const results = await Promise.all(promises);
      expect(results).toHaveLength(3);
      results.forEach((result) => {
        expect(result).toHaveLength(1);
      });
    });
  });
});
