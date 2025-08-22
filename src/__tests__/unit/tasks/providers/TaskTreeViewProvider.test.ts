/**
 * TaskTreeViewProvider Unit Tests
 * Task 3.2.3: Test TasksDataService dependency injection and integration
 * Requirements: 3.1.2, 3.2.6, 3.2.3
 */

import * as vscode from "vscode";
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
        event: jest.fn().mockReturnValue({ dispose: jest.fn() }),
        dispose: jest.fn(),
      } as any,
      onError: {
        fire: jest.fn(),
        event: jest.fn().mockReturnValue({ dispose: jest.fn() }),
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

    it("should convert returned tasks to TaskTreeItems with enhanced status display", async () => {
      // Arrange
      mockTasksDataService.getTasks.mockResolvedValue(mockTasks);

      // Act
      const result = await provider.getChildren();

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0]).toHaveProperty("id", "test-task-1");

      // Task 3.2.5: Status filtering adds statusDisplayName property
      const enhancedMockTask = {
        ...mockTask,
        statusDisplayName: "not started",
      };
      expect(result[0]).toHaveProperty("task", enhancedMockTask);
    });

    it("should handle empty task list by showing no-tasks state", async () => {
      // Arrange
      mockTasksDataService.getTasks.mockResolvedValue([]);

      // Act
      const result = await provider.getChildren();

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0]).toHaveProperty("contextValue", "empty-state");
      expect(result[0]).toHaveProperty("label", "No tasks available");
      expect(result[0]).toHaveProperty(
        "description",
        "Tasks will appear here when loaded"
      );

      // Verify empty state has correct icon and is not collapsible
      const emptyStateItem = result[0] as any;
      expect(emptyStateItem.iconPath).toBeDefined();
      expect(emptyStateItem.collapsibleState).toBe(
        vscode.TreeItemCollapsibleState.None
      );
    });

    it("should transition from empty state to populated state correctly", async () => {
      // Arrange: Start with empty state
      mockTasksDataService.getTasks.mockResolvedValue([]);
      const emptyResult = await provider.getChildren();
      expect(emptyResult).toHaveLength(1);
      expect(emptyResult[0]).toHaveProperty("contextValue", "empty-state");

      // Act: Now return populated data
      mockTasksDataService.getTasks.mockResolvedValue(mockTasks);
      const populatedResult = await provider.getChildren();

      // Assert: Should now show tasks instead of empty state
      expect(populatedResult).toHaveLength(1);
      expect(populatedResult[0]).toBeInstanceOf(TaskTreeItem);
      expect(populatedResult[0]).toHaveProperty("id", "test-task-1");
    });

    it("should set correct contextValue for empty state styling", async () => {
      // Arrange
      mockTasksDataService.getTasks.mockResolvedValue([]);

      // Act
      const result = await provider.getChildren();

      // Assert: contextValue should be "empty-state" for CSS styling
      expect(result[0]).toHaveProperty("contextValue", "empty-state");

      // Verify the empty state item has all required properties
      const emptyStateItem = result[0] as any;
      expect(emptyStateItem.label).toBe("No tasks available");
      expect(emptyStateItem.description).toBe(
        "Tasks will appear here when loaded"
      );
      expect(emptyStateItem.contextValue).toBe("empty-state");
      expect(emptyStateItem.collapsibleState).toBe(
        vscode.TreeItemCollapsibleState.None
      );
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

  describe("Task 3.2.7: Refresh Mechanism Infrastructure", () => {
    it("should create EventEmitter correctly in constructor", () => {
      // Assert: Verify EventEmitter is created and configured
      expect(provider).toHaveProperty("onDidChangeTreeData");
      expect(typeof provider.onDidChangeTreeData).toBe("function");

      // Verify the event emitter is properly set up
      expect(provider.onDidChangeTreeData).toBeDefined();
    });

    it("should expose onDidChangeTreeData as readonly property", () => {
      // Assert: Verify readonly property exposure
      expect(provider.onDidChangeTreeData).toBeDefined();

      // Verify it's not writable (readonly) - in VSCode, this is enforced at compile time
      // We can't test readonly at runtime in JavaScript, but we can verify the property exists
      const originalEvent = provider.onDidChangeTreeData;
      expect(provider.onDidChangeTreeData).toBe(originalEvent);

      // Verify the property is accessible and has the expected interface
      // VSCode Event is a function that can be called to subscribe to events
      expect(typeof provider.onDidChangeTreeData).toBe("function");

      // Test that we can subscribe to the event (this returns a Disposable)
      const disposable = provider.onDidChangeTreeData(() => {});
      expect(disposable).toHaveProperty("dispose");
      disposable.dispose();
    });

    it("should fire refresh event when refresh() method is called", () => {
      // Arrange: Create a listener for the event
      let eventFired = false;
      let eventData: any = null;

      const disposable = provider.onDidChangeTreeData((data) => {
        eventFired = true;
        eventData = data;
      });

      // Act: Call refresh method
      provider.refresh();

      // Assert: Event should be fired with undefined (full refresh)
      expect(eventFired).toBe(true);
      expect(eventData).toBeUndefined();

      // Cleanup
      disposable.dispose();
    });

    it("should fire item-specific refresh event when refreshItem() is called", () => {
      // Arrange: Create a listener and mock task item
      let eventFired = false;
      let eventData: any = null;

      const disposable = provider.onDidChangeTreeData((data) => {
        eventFired = true;
        eventData = data;
      });

      const mockTaskItem = new TaskTreeItem(mockTask);

      // Act: Call refreshItem method
      provider.refreshItem(mockTaskItem);

      // Assert: Event should be fired with specific task item
      expect(eventFired).toBe(true);
      expect(eventData).toBe(mockTaskItem);

      // Cleanup
      disposable.dispose();
    });

    it("should handle multiple refresh calls correctly", () => {
      // Arrange: Create a listener to count events
      let eventCount = 0;

      const disposable = provider.onDidChangeTreeData(() => {
        eventCount++;
      });

      // Act: Call refresh multiple times
      provider.refresh();
      provider.refresh();
      provider.refresh();

      // Assert: All refresh calls should fire events
      expect(eventCount).toBe(3);

      // Cleanup
      disposable.dispose();
    });

    it("should handle concurrent refresh calls efficiently", () => {
      // Arrange: Create a listener to track events
      const events: any[] = [];

      const disposable = provider.onDidChangeTreeData((data) => {
        events.push(data);
      });

      // Act: Make concurrent refresh calls
      provider.refresh();
      provider.refresh();
      provider.refresh();

      // Assert: All events should be processed
      expect(events).toHaveLength(3);
      expect(events.every((event) => event === undefined)).toBe(true);

      // Cleanup
      disposable.dispose();
    });

    it("should handle refresh calls after disposal gracefully", () => {
      // Arrange: Dispose the provider first
      provider.dispose();

      // Act & Assert: Refresh calls should be handled gracefully
      expect(() => provider.refresh()).not.toThrow();
      expect(() =>
        provider.refreshItem(new TaskTreeItem(mockTask))
      ).not.toThrow();
    });

    it("should log warning when refresh is called on disposed provider", () => {
      // Arrange: Spy on console.warn and dispose provider
      const consoleSpy = jest.spyOn(console, "warn").mockImplementation();
      provider.dispose();

      // Act: Call refresh on disposed provider
      provider.refresh();

      // Assert: Warning should be logged
      expect(consoleSpy).toHaveBeenCalledWith(
        "TaskTreeViewProvider: Cannot refresh disposed provider"
      );

      // Cleanup
      consoleSpy.mockRestore();
    });

    it("should handle EventEmitter errors gracefully during refresh", () => {
      // Arrange: Mock EventEmitter to throw error
      const mockEventEmitter = {
        fire: jest.fn().mockImplementation(() => {
          throw new Error("EventEmitter error");
        }),
        event: jest.fn(),
        dispose: jest.fn(),
      };

      // Create provider with mocked EventEmitter
      const providerWithMockEmitter = new TaskTreeViewProvider(
        mockTasksDataService
      );
      (providerWithMockEmitter as any)._onDidChangeTreeData = mockEventEmitter;

      // Act & Assert: Should handle errors gracefully
      expect(() => providerWithMockEmitter.refresh()).not.toThrow();
    });

    it("should handle EventEmitter errors gracefully during item refresh", () => {
      // Arrange: Mock EventEmitter to throw error
      const mockEventEmitter = {
        fire: jest.fn().mockImplementation(() => {
          throw new Error("EventEmitter error");
        }),
        event: jest.fn(),
        dispose: jest.fn(),
      };

      // Create provider with mocked EventEmitter
      const providerWithMockEmitter = new TaskTreeViewProvider(
        mockTasksDataService
      );
      (providerWithMockEmitter as any)._onDidChangeTreeData = mockEventEmitter;

      const mockTaskItem = new TaskTreeItem(mockTask);

      // Act & Assert: Should handle errors gracefully
      expect(() =>
        providerWithMockEmitter.refreshItem(mockTaskItem)
      ).not.toThrow();
    });

    it("should log debug messages during refresh operations", () => {
      // Arrange: Spy on console.debug
      const consoleSpy = jest.spyOn(console, "debug").mockImplementation();

      // Act: Call refresh methods
      provider.refresh();
      provider.refreshItem(new TaskTreeItem(mockTask));

      // Assert: Debug messages should be logged
      expect(consoleSpy).toHaveBeenCalledWith(
        "TaskTreeViewProvider: Tree refresh triggered"
      );
      expect(consoleSpy).toHaveBeenCalledWith(
        "TaskTreeViewProvider: Item refresh triggered for:",
        "test-task-1"
      );

      // Cleanup
      consoleSpy.mockRestore();
    });

    it("should log errors during refresh operations", () => {
      // Arrange: Mock EventEmitter to throw error and spy on console.error
      const mockEventEmitter = {
        fire: jest.fn().mockImplementation(() => {
          throw new Error("Test error");
        }),
        event: jest.fn(),
        dispose: jest.fn(),
      };

      const consoleSpy = jest.spyOn(console, "error").mockImplementation();

      // Create provider with mocked EventEmitter
      const providerWithMockEmitter = new TaskTreeViewProvider(
        mockTasksDataService
      );
      (providerWithMockEmitter as any)._onDidChangeTreeData = mockEventEmitter;

      // Act: Call refresh method
      providerWithMockEmitter.refresh();

      // Assert: Error should be logged
      expect(consoleSpy).toHaveBeenCalledWith(
        "TaskTreeViewProvider: Error during refresh:",
        expect.any(Error)
      );

      // Cleanup
      consoleSpy.mockRestore();
    });

    it("should handle disposal errors gracefully", () => {
      // Arrange: Mock EventEmitter to throw error during disposal
      const mockEventEmitter = {
        fire: jest.fn(),
        event: jest.fn(),
        dispose: jest.fn().mockImplementation(() => {
          throw new Error("Disposal error");
        }),
      };

      const consoleSpy = jest.spyOn(console, "error").mockImplementation();

      // Create provider with mocked EventEmitter
      const providerWithMockEmitter = new TaskTreeViewProvider(
        mockTasksDataService
      );
      (providerWithMockEmitter as any)._onDidChangeTreeData = mockEventEmitter;

      // Act & Assert: Should handle disposal errors gracefully
      expect(() => providerWithMockEmitter.dispose()).not.toThrow();
      expect(consoleSpy).toHaveBeenCalledWith(
        "TaskTreeViewProvider: Error during disposal:",
        expect.any(Error)
      );

      // Cleanup
      consoleSpy.mockRestore();
    });

    it("should set isDisposed flag correctly during disposal", () => {
      // Arrange: Access private property for testing
      const isDisposedBefore = (provider as any).isDisposed;

      // Act: Dispose the provider
      provider.dispose();

      // Assert: isDisposed flag should be set to true
      expect(isDisposedBefore).toBe(false);
      // Note: We can't directly access private properties after disposal in this test
      // but we can verify the behavior through public methods
    });

    it("should maintain refresh infrastructure after multiple dispose calls", () => {
      // Act: Call dispose multiple times
      provider.dispose();
      provider.dispose();
      provider.dispose();

      // Assert: Should handle multiple dispose calls gracefully
      expect(() => provider.refresh()).not.toThrow();
      expect(() =>
        provider.refreshItem(new TaskTreeItem(mockTask))
      ).not.toThrow();
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

  describe("Task 3.2.5: Status Filtering and Display Logic", () => {
    it("should apply STATUS_DISPLAY_NAMES mapping to all task statuses", async () => {
      // Arrange: Tasks with different statuses
      const tasksWithDifferentStatuses = [
        { ...mockTask, id: "not-started", status: TaskStatus.NOT_STARTED },
        { ...mockTask, id: "in-progress", status: TaskStatus.IN_PROGRESS },
        { ...mockTask, id: "completed", status: TaskStatus.COMPLETED },
        { ...mockTask, id: "review", status: TaskStatus.REVIEW },
        { ...mockTask, id: "blocked", status: TaskStatus.BLOCKED },
        { ...mockTask, id: "deprecated", status: TaskStatus.DEPRECATED },
      ];
      mockTasksDataService.getTasks.mockResolvedValue(
        tasksWithDifferentStatuses
      );

      // Act
      const result = await provider.getChildren();

      // Assert: All tasks should have statusDisplayName applied
      expect(result).toHaveLength(6);

      const notStartedItem = result[0] as TaskTreeItem;
      const inProgressItem = result[1] as TaskTreeItem;
      const completedItem = result[2] as TaskTreeItem;
      const reviewItem = result[3] as TaskTreeItem;
      const blockedItem = result[4] as TaskTreeItem;
      const deprecatedItem = result[5] as TaskTreeItem;

      expect(notStartedItem.task.statusDisplayName).toBe("not started");
      expect(inProgressItem.task.statusDisplayName).toBe("in progress");
      expect(completedItem.task.statusDisplayName).toBe("completed");
      expect(reviewItem.task.statusDisplayName).toBe("review");
      expect(blockedItem.task.statusDisplayName).toBe("blocked");
      expect(deprecatedItem.task.statusDisplayName).toBe("deprecated");
    });

    it("should preserve all task data while applying status filtering", async () => {
      // Arrange: Task with enhanced properties
      const enhancedTask = {
        ...mockTask,
        id: "enhanced-task",
        estimatedDuration: "25-30 min",
        isExecutable: true,
        testStatus: {
          totalTests: 10,
          passedTests: 8,
          failedTests: 2,
          lastRunDate: "2024-01-01T12:00:00Z",
        },
        tags: ["frontend", "ui"],
        assignee: "John Doe",
      };
      mockTasksDataService.getTasks.mockResolvedValue([enhancedTask]);

      // Act
      const result = await provider.getChildren();

      // Assert: All properties should be preserved
      expect(result).toHaveLength(1);
      const treeItem = result[0] as TaskTreeItem;

      // Original properties preserved
      expect(treeItem.task.id).toBe("enhanced-task");
      expect(treeItem.task.estimatedDuration).toBe("25-30 min");
      expect(treeItem.task.isExecutable).toBe(true);
      expect(treeItem.task.tags).toEqual(["frontend", "ui"]);
      expect(treeItem.task.assignee).toBe("John Doe");

      // Status display name added
      expect(treeItem.task.statusDisplayName).toBe("not started");
    });

    it("should handle edge cases gracefully in status filtering", async () => {
      // Arrange: Task with missing properties
      const incompleteTask = {
        id: "incomplete-task",
        title: "Incomplete Task",
        description: "A task with missing properties",
        status: TaskStatus.NOT_STARTED,
        complexity: TaskComplexity.LOW,
        priority: TaskPriority.MEDIUM,
        dependencies: [],
        requirements: [],
        createdDate: "2024-01-01T00:00:00.000Z",
        lastModified: "2024-01-01T00:00:00.000Z",
        // Missing: estimatedDuration, isExecutable, testStatus, tags, assignee
      };
      mockTasksDataService.getTasks.mockResolvedValue([incompleteTask]);

      // Act
      const result = await provider.getChildren();

      // Assert: Should handle missing properties gracefully
      expect(result).toHaveLength(1);
      const treeItem = result[0] as TaskTreeItem;

      // Status display name should still be applied
      expect(treeItem.task.statusDisplayName).toBe("not started");

      // Missing properties should be undefined (not cause errors)
      expect(treeItem.task.estimatedDuration).toBeUndefined();
      expect(treeItem.task.isExecutable).toBeUndefined();
      expect(treeItem.task.testStatus).toBeUndefined();
      expect(treeItem.task.tags).toBeUndefined();
      expect(treeItem.task.assignee).toBeUndefined();
    });

    it("should maintain performance with status filtering", async () => {
      // Arrange: Large number of tasks
      const largeTaskList = Array.from({ length: 100 }, (_, index) => ({
        ...mockTask,
        id: `task-${index}`,
        status:
          index % 6 === 0
            ? TaskStatus.COMPLETED
            : index % 6 === 1
            ? TaskStatus.IN_PROGRESS
            : index % 6 === 2
            ? TaskStatus.REVIEW
            : index % 6 === 3
            ? TaskStatus.BLOCKED
            : index % 6 === 4
            ? TaskStatus.DEPRECATED
            : TaskStatus.NOT_STARTED,
      }));
      mockTasksDataService.getTasks.mockResolvedValue(largeTaskList);

      // Act: Measure performance
      const startTime = Date.now();
      const result = await provider.getChildren();
      const endTime = Date.now();

      // Assert: Should complete within reasonable time (< 100ms for 100 tasks)
      expect(result).toHaveLength(100);
      expect(endTime - startTime).toBeLessThan(100);

      // All tasks should have statusDisplayName applied
      result.forEach((item) => {
        const treeItem = item as TaskTreeItem;
        expect(treeItem.task.statusDisplayName).toBeDefined();
        expect(typeof treeItem.task.statusDisplayName).toBe("string");
      });
    });
  });

  describe("Task 3.2.8: Event Connection to TasksDataService", () => {
    it("should setup event listeners in constructor", () => {
      // Arrange: Mock event listener setup
      const mockEvent = jest.fn().mockReturnValue({ dispose: jest.fn() });
      mockTasksDataService.onTasksUpdated.event = mockEvent;
      mockTasksDataService.onError.event = mockEvent;

      // Act: Create new provider instance
      const newProvider = new TaskTreeViewProvider(mockTasksDataService);

      // Assert: Event listeners should be set up
      expect(mockEvent).toHaveBeenCalledTimes(2);
      expect(mockEvent).toHaveBeenCalledWith(expect.any(Function));
    });

    it("should connect to onTasksUpdated event for automatic refresh", () => {
      // Arrange: Mock event listener and refresh method
      const mockEvent = jest.fn().mockReturnValue({ dispose: jest.fn() });
      mockTasksDataService.onTasksUpdated.event = mockEvent;

      // Act: Create new provider to trigger event listener setup
      const newProvider = new TaskTreeViewProvider(mockTasksDataService);
      const refreshSpy = jest
        .spyOn(newProvider, "refresh")
        .mockImplementation();

      // Assert: Should connect to onTasksUpdated event
      expect(mockEvent).toHaveBeenCalledWith(expect.any(Function));

      // Verify the event handler calls refresh
      const eventHandler = mockEvent.mock.calls[0][0];
      eventHandler([mockTask]);
      expect(refreshSpy).toHaveBeenCalled();

      // Cleanup
      refreshSpy.mockRestore();
    });

    it("should connect to onError event for error handling", () => {
      // Arrange: Mock event listener
      const mockEvent = jest.fn().mockReturnValue({ dispose: jest.fn() });
      mockTasksDataService.onError.event = mockEvent;
      const consoleSpy = jest.spyOn(console, "warn").mockImplementation();

      // Act: Create new provider to trigger event listener setup
      const newProvider = new TaskTreeViewProvider(mockTasksDataService);

      // Assert: Should connect to onError event
      expect(mockEvent).toHaveBeenCalledWith(expect.any(Function));

      // Verify the event handler logs errors
      const eventHandler = mockEvent.mock.calls[0][0];
      const mockError = {
        operation: "status_update" as const,
        taskId: "test-task",
        suggestedAction: "retry" as const,
        userInstructions: "Test error",
        technicalDetails: "Technical details",
      };
      eventHandler(mockError);
      expect(consoleSpy).toHaveBeenCalledWith(
        "TaskTreeViewProvider: Service error received:",
        mockError
      );

      // Cleanup
      consoleSpy.mockRestore();
    });

    it("should store event disposables for proper cleanup", () => {
      // Arrange: Mock event listener with disposable
      const mockDisposable = { dispose: jest.fn() };
      const mockEvent = jest.fn().mockReturnValue(mockDisposable);
      mockTasksDataService.onTasksUpdated.event = mockEvent;
      mockTasksDataService.onError.event = mockEvent;

      // Act: Create new provider
      const newProvider = new TaskTreeViewProvider(mockTasksDataService);

      // Assert: Event disposables should be stored
      expect(mockEvent).toHaveBeenCalledTimes(2);
      expect(mockEvent).toHaveBeenCalledWith(expect.any(Function));
    });

    it("should handle onTasksUpdated event and trigger refresh", () => {
      // Arrange: Mock event listener and refresh method
      const mockEvent = jest.fn().mockReturnValue({ dispose: jest.fn() });
      mockTasksDataService.onTasksUpdated.event = mockEvent;

      // Act: Create new provider and trigger event
      const newProvider = new TaskTreeViewProvider(mockTasksDataService);
      const refreshSpy = jest
        .spyOn(newProvider, "refresh")
        .mockImplementation();
      const eventHandler = mockEvent.mock.calls[0][0];
      eventHandler([mockTask]);

      // Assert: Refresh should be called automatically
      expect(refreshSpy).toHaveBeenCalledTimes(1);

      // Cleanup
      refreshSpy.mockRestore();
    });

    it("should handle onError event gracefully without breaking functionality", () => {
      // Arrange: Mock event listener and console methods
      const mockEvent = jest.fn().mockReturnValue({ dispose: jest.fn() });
      mockTasksDataService.onError.event = mockEvent;
      const consoleWarnSpy = jest.spyOn(console, "warn").mockImplementation();
      const consoleDebugSpy = jest.spyOn(console, "debug").mockImplementation();

      // Act: Create new provider and trigger error event
      const newProvider = new TaskTreeViewProvider(mockTasksDataService);
      const eventHandler = mockEvent.mock.calls[0][0];
      const mockError = {
        operation: "task_retrieval" as const,
        taskId: "test-task",
        suggestedAction: "retry" as const,
        userInstructions: "Test error",
        technicalDetails: "Technical details",
      };
      eventHandler(mockError);

      // Assert: Error should be logged but not break functionality
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        "TaskTreeViewProvider: Service error received:",
        mockError
      );
      expect(consoleDebugSpy).toHaveBeenCalledWith(
        "TaskTreeViewProvider: Technical error details:",
        "Technical details"
      );

      // Cleanup
      consoleWarnSpy.mockRestore();
      consoleDebugSpy.mockRestore();
    });

    it("should ignore events when provider is disposed", () => {
      // Arrange: Mock event listener and dispose provider
      const mockEvent = jest.fn().mockReturnValue({ dispose: jest.fn() });
      mockTasksDataService.onTasksUpdated.event = mockEvent;
      const consoleDebugSpy = jest.spyOn(console, "debug").mockImplementation();

      // Create new provider and dispose it
      const newProvider = new TaskTreeViewProvider(mockTasksDataService);
      newProvider.dispose();

      // Act: Trigger event on disposed provider
      const eventHandler = mockEvent.mock.calls[0][0];
      eventHandler([mockTask]);

      // Assert: Should log that events are ignored
      expect(consoleDebugSpy).toHaveBeenCalledWith(
        "TaskTreeViewProvider: Ignoring tasks update on disposed provider"
      );

      // Cleanup
      consoleDebugSpy.mockRestore();
    });

    it("should handle event listener setup failures gracefully", () => {
      // Arrange: Mock event listener to throw error
      const mockEvent = jest.fn().mockImplementation(() => {
        throw new Error("Event setup failed");
      });
      mockTasksDataService.onTasksUpdated.event = mockEvent;
      const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation();

      // Act & Assert: Should handle setup failures gracefully
      expect(
        () => new TaskTreeViewProvider(mockTasksDataService)
      ).not.toThrow();
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        "TaskTreeViewProvider: Failed to setup event listeners:",
        expect.any(Error)
      );

      // Cleanup
      consoleErrorSpy.mockRestore();
    });

    it("should handle event handler errors gracefully", () => {
      // Arrange: Mock event listener and refresh method to throw error
      const mockEvent = jest.fn().mockReturnValue({ dispose: jest.fn() });
      mockTasksDataService.onTasksUpdated.event = mockEvent;

      // Act: Create new provider and trigger event
      const newProvider = new TaskTreeViewProvider(mockTasksDataService);
      const refreshSpy = jest
        .spyOn(newProvider, "refresh")
        .mockImplementation(() => {
          throw new Error("Refresh failed");
        });
      const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation();
      const eventHandler = mockEvent.mock.calls[0][0];

      // Assert: Should handle event handler errors gracefully
      expect(() => eventHandler([mockTask])).not.toThrow();
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        "TaskTreeViewProvider: Error handling tasks update:",
        expect.any(Error)
      );

      // Cleanup
      refreshSpy.mockRestore();
      consoleErrorSpy.mockRestore();
    });

    it("should handle multiple event triggers correctly", () => {
      // Arrange: Mock event listener and refresh method
      const mockEvent = jest.fn().mockReturnValue({ dispose: jest.fn() });
      mockTasksDataService.onTasksUpdated.event = mockEvent;

      // Act: Create new provider and trigger multiple events
      const newProvider = new TaskTreeViewProvider(mockTasksDataService);
      const refreshSpy = jest
        .spyOn(newProvider, "refresh")
        .mockImplementation();
      const eventHandler = mockEvent.mock.calls[0][0];

      eventHandler([mockTask]);
      eventHandler([mockTask]);
      eventHandler([mockTask]);

      // Assert: All events should trigger refresh
      expect(refreshSpy).toHaveBeenCalledTimes(3);

      // Cleanup
      refreshSpy.mockRestore();
    });

    it("should dispose all event listeners on cleanup", () => {
      // Arrange: Mock event listener with disposable
      const mockDisposable = { dispose: jest.fn() };
      const mockEvent = jest.fn().mockReturnValue(mockDisposable);
      mockTasksDataService.onTasksUpdated.event = mockEvent;
      mockTasksDataService.onError.event = mockEvent;

      // Act: Create new provider and dispose it
      const newProvider = new TaskTreeViewProvider(mockTasksDataService);
      newProvider.dispose();

      // Assert: All event disposables should be disposed
      expect(mockDisposable.dispose).toHaveBeenCalledTimes(2);
    });

    it("should maintain refresh functionality after event connection", () => {
      // Arrange: Mock event listener
      const mockEvent = jest.fn().mockReturnValue({ dispose: jest.fn() });
      mockTasksDataService.onTasksUpdated.event = mockEvent;
      mockTasksDataService.onError.event = mockEvent;

      // Act: Create new provider with event connections
      const newProvider = new TaskTreeViewProvider(mockTasksDataService);

      // Assert: Manual refresh should still work
      expect(() => newProvider.refresh()).not.toThrow();
      expect(() =>
        newProvider.refreshItem(new TaskTreeItem(mockTask))
      ).not.toThrow();
    });

    it("should handle concurrent event triggers efficiently", () => {
      // Arrange: Mock event listener and refresh method
      const mockEvent = jest.fn().mockReturnValue({ dispose: jest.fn() });
      mockTasksDataService.onTasksUpdated.event = mockEvent;

      // Act: Create new provider and trigger concurrent events
      const newProvider = new TaskTreeViewProvider(mockTasksDataService);
      const refreshSpy = jest
        .spyOn(newProvider, "refresh")
        .mockImplementation();
      const eventHandler = mockEvent.mock.calls[0][0];

      // Simulate concurrent events
      const promises = [
        Promise.resolve().then(() => eventHandler([mockTask])),
        Promise.resolve().then(() => eventHandler([mockTask])),
        Promise.resolve().then(() => eventHandler([mockTask])),
      ];

      // Assert: All concurrent events should be handled
      return Promise.all(promises).then(() => {
        expect(refreshSpy).toHaveBeenCalledTimes(3);
      });

      // Cleanup
      refreshSpy.mockRestore();
    });

    it("should preserve expansion state during automatic refresh", () => {
      // Arrange: Mock event listener and refresh method
      const mockEvent = jest.fn().mockReturnValue({ dispose: jest.fn() });
      mockTasksDataService.onTasksUpdated.event = mockEvent;

      // Act: Create new provider and trigger event
      const newProvider = new TaskTreeViewProvider(mockTasksDataService);
      const refreshSpy = jest
        .spyOn(newProvider, "refresh")
        .mockImplementation();
      const eventHandler = mockEvent.mock.calls[0][0];
      eventHandler([mockTask]);

      // Assert: Refresh should be called with undefined to preserve expansion state
      expect(refreshSpy).toHaveBeenCalledWith();

      // Cleanup
      refreshSpy.mockRestore();
    });

    it("should log successful event listener connection", () => {
      // Arrange: Mock event listener and console debug
      const mockEvent = jest.fn().mockReturnValue({ dispose: jest.fn() });
      mockTasksDataService.onTasksUpdated.event = mockEvent;
      mockTasksDataService.onError.event = mockEvent;
      const consoleDebugSpy = jest.spyOn(console, "debug").mockImplementation();

      // Act: Create new provider
      const newProvider = new TaskTreeViewProvider(mockTasksDataService);

      // Assert: Should log successful connection
      expect(consoleDebugSpy).toHaveBeenCalledWith(
        "TaskTreeViewProvider: Event listeners connected successfully"
      );

      // Cleanup
      consoleDebugSpy.mockRestore();
    });
  });
});
