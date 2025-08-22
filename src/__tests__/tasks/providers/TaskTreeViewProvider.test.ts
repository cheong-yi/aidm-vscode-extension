/**
 * TaskTreeViewProvider Unit Tests
 * Requirements: 3.1.2 - TaskTreeViewProvider class structure with VSCode TreeDataProvider interface
 * Requirements: 3.2.6 - Implement "No Tasks" state handling
 */

import { jest } from "@jest/globals";
import * as vscode from "vscode";
import { TaskTreeViewProvider } from "../../../tasks/providers/TaskTreeViewProvider";
import { TaskTreeItem } from "../../../tasks/providers/TaskTreeItem";
import {
  Task,
  TaskStatus,
  TaskComplexity,
  TaskPriority,
} from "../../../tasks/types";

describe("TaskTreeViewProvider", () => {
  let provider: TaskTreeViewProvider;
  let mockTask: Task;
  let mockTreeItem: TaskTreeItem;

  beforeEach(() => {
    // Create a mock task for testing
    mockTask = {
      id: "test-1",
      title: "Test Task",
      description: "A test task for unit testing",
      status: TaskStatus.NOT_STARTED,
      complexity: TaskComplexity.MEDIUM,
      priority: TaskPriority.HIGH,
      dependencies: [],
      requirements: ["req-1", "req-2"],
      createdDate: "2024-01-01T00:00:00Z",
      lastModified: "2024-01-01T00:00:00Z",
      assignee: "developer",
      estimatedHours: 4,
      tags: ["test", "unit"],
    };

    mockTreeItem = new TaskTreeItem(mockTask);
    provider = new TaskTreeViewProvider();
  });

  describe("Interface compliance", () => {
    it("should implement TreeDataProvider interface", () => {
      // Verify the provider has the required methods
      expect(typeof provider.getTreeItem).toBe("function");
      expect(typeof provider.getChildren).toBe("function");
      expect(provider.onDidChangeTreeData).toBeDefined();
    });

    it("should be assignable to TreeDataProvider type with union type", () => {
      // TypeScript should accept this assignment with the union type
      const treeProvider: vscode.TreeDataProvider<any> = provider;
      expect(treeProvider).toBe(provider);
    });
  });

  describe("getTreeItem method", () => {
    it("should return TaskTreeItem when getTreeItem is called", () => {
      const result = provider.getTreeItem(mockTreeItem);

      expect(result).toBe(mockTreeItem);
      expect(result).toBeInstanceOf(TaskTreeItem);
    });

    it("should return the exact element passed to it", () => {
      const result = provider.getTreeItem(mockTreeItem);

      expect(result.id).toBe("test-1");
      // Cast back to TaskTreeItem to access custom properties
      expect((result as TaskTreeItem).task).toBe(mockTask);
      expect(result.label).toBe("Test Task");
    });

    it("should convert a Task object to a TaskTreeItem instance", () => {
      // Create a mock Task object
      const mockTaskData: Task = {
        id: "task-123",
        title: "Sample Task",
        description: "A sample task for testing",
        status: TaskStatus.IN_PROGRESS,
        complexity: TaskComplexity.HIGH,
        dependencies: ["task-100"],
        requirements: ["req-1"],
        createdDate: "2024-01-01T00:00:00Z",
        lastModified: "2024-01-02T00:00:00Z",
        priority: TaskPriority.CRITICAL,
        assignee: "developer",
        estimatedHours: 8,
        tags: ["frontend", "ui"],
      };

      // Create a TaskTreeItem from the mock task
      const taskTreeItem = new TaskTreeItem(mockTaskData);

      // Call getTreeItem with the TaskTreeItem
      const result = provider.getTreeItem(taskTreeItem);

      // Verify the result is a TaskTreeItem instance
      expect(result).toBeInstanceOf(TaskTreeItem);
      expect(result).toBe(taskTreeItem);
    });

    it("should correctly map Task properties to TaskTreeItem properties", () => {
      // Create a mock Task with specific properties
      const mockTaskData: Task = {
        id: "mapping-test",
        title: "Property Mapping Test",
        description: "Testing property mapping between Task and TaskTreeItem",
        status: TaskStatus.COMPLETED,
        complexity: TaskComplexity.LOW,
        dependencies: [],
        requirements: [],
        createdDate: "2024-01-01T00:00:00Z",
        lastModified: "2024-01-01T00:00:00Z",
        priority: TaskPriority.MEDIUM,
      };

      // Create a TaskTreeItem from the mock task
      const taskTreeItem = new TaskTreeItem(mockTaskData);

      // Call getTreeItem
      const result = provider.getTreeItem(taskTreeItem) as TaskTreeItem;

      // Verify property mapping
      expect(result.label).toBe("Property Mapping Test");
      expect(result.tooltip).toBe(
        "Testing property mapping between Task and TaskTreeItem"
      );
      expect(result.id).toBe("mapping-test");
      expect(result.task).toBe(mockTaskData);
      expect(result.task.status).toBe(TaskStatus.COMPLETED);
      expect(result.task.complexity).toBe(TaskComplexity.LOW);
    });

    it("should handle TaskTreeItem with dependencies correctly", () => {
      // Create a mock Task with dependencies
      const mockTaskWithDeps: Task = {
        id: "parent-task",
        title: "Parent Task",
        description: "A task with dependencies",
        status: TaskStatus.NOT_STARTED,
        complexity: TaskComplexity.MEDIUM,
        dependencies: ["child-1", "child-2"],
        requirements: [],
        createdDate: "2024-01-01T00:00:00Z",
        lastModified: "2024-01-01T00:00:00Z",
        priority: TaskPriority.HIGH,
      };

      // Create a TaskTreeItem from the mock task
      const taskTreeItem = new TaskTreeItem(mockTaskWithDeps);

      // Call getTreeItem
      const result = provider.getTreeItem(taskTreeItem) as TaskTreeItem;

      // Verify dependency-related properties
      expect(result.hasChildren).toBe(true);
      expect(result.collapsibleState).toBe(
        vscode.TreeItemCollapsibleState.Collapsed
      );
      expect(result.task.dependencies).toEqual(["child-1", "child-2"]);
    });
  });

  describe("getChildren method - Empty State Handling", () => {
    it("should return empty state item when no tasks are available", async () => {
      const result = await provider.getChildren();

      expect(result).toHaveLength(1);
      expect(result[0]).toBeDefined();
      expect(result[0]?.label).toBe("No Tasks Available");
      expect(result[0]?.contextValue).toBe("empty-state");
    });

    it("should return empty state item when getChildren called with element", async () => {
      const result = await provider.getChildren(mockTreeItem);

      expect(result).toHaveLength(1);
      expect(result[0]).toBeDefined();
      expect(result[0]?.label).toBe("No Tasks Available");
    });

    it("should return Promise with empty state item", async () => {
      const result = provider.getChildren();

      expect(result).toBeInstanceOf(Promise);

      const resolved = await result;
      expect(Array.isArray(resolved)).toBe(true);
      expect(resolved).toHaveLength(1);
      expect(resolved[0]?.contextValue).toBe("empty-state");
    });

    it("should return empty state item with correct properties", async () => {
      const result = await provider.getChildren();
      const emptyStateItem = result[0];

      expect(emptyStateItem).toBeDefined();
      expect(emptyStateItem?.label).toBe("No Tasks Available");
      expect(emptyStateItem?.description).toBe(
        "Select a task from the tree view above to see detailed information."
      );
      expect(emptyStateItem?.contextValue).toBe("empty-state");
      expect(emptyStateItem?.collapsibleState).toBe(
        vscode.TreeItemCollapsibleState.None
      );
      expect(emptyStateItem?.command).toBeDefined();
      expect(emptyStateItem?.command?.command).toBe(
        "aidm-vscode-extension.refreshTasks"
      );
    });
  });

  describe("Empty State TreeItem Creation", () => {
    it("should create empty state item with inbox icon for no-tasks scenario", async () => {
      const result = await provider.getChildren();
      const emptyStateItem = result[0];

      expect(emptyStateItem?.iconPath).toBeDefined();
      // Check if iconPath is a ThemeIcon with "inbox" value
      if (
        emptyStateItem?.iconPath &&
        typeof emptyStateItem.iconPath === "object" &&
        "id" in emptyStateItem.iconPath
      ) {
        expect(emptyStateItem.iconPath.id).toBe("inbox");
      }
    });

    it("should create empty state item with refresh command", async () => {
      const result = await provider.getChildren();
      const emptyStateItem = result[0];

      expect(emptyStateItem?.command).toBeDefined();
      expect(emptyStateItem?.command?.command).toBe(
        "aidm-vscode-extension.refreshTasks"
      );
      expect(emptyStateItem?.command?.title).toBe("Refresh Tasks");
    });

    it("should create empty state item with correct tooltip", async () => {
      const result = await provider.getChildren();
      const emptyStateItem = result[0];

      expect(emptyStateItem?.tooltip).toBe(
        "Select a task from the tree view above to see detailed information."
      );
    });

    it("should create empty state item with non-collapsible state", async () => {
      const result = await provider.getChildren();
      const emptyStateItem = result[0];

      expect(emptyStateItem?.collapsibleState).toBe(
        vscode.TreeItemCollapsibleState.None
      );
    });
  });

  describe("Event emitter", () => {
    it("should have properly configured onDidChangeTreeData Event", () => {
      expect(provider.onDidChangeTreeData).toBeDefined();
      expect(typeof provider.onDidChangeTreeData).toBe("function");
    });

    it("should be a VSCode Event", () => {
      expect(provider.onDidChangeTreeData).toBeDefined();
      // VSCode Event is a function that can be called to subscribe
      expect(typeof provider.onDidChangeTreeData).toBe("function");
    });
  });

  describe("Refresh functionality", () => {
    it("should fire onDidChangeTreeData event when refresh is called", () => {
      const mockListener = jest.fn();
      provider.onDidChangeTreeData(mockListener);

      provider.refresh();

      expect(mockListener).toHaveBeenCalledWith(undefined);
      expect(mockListener).toHaveBeenCalledTimes(1);
    });

    it("should fire event with undefined parameter", () => {
      const mockListener = jest.fn();
      provider.onDidChangeTreeData(mockListener);

      provider.refresh();

      expect(mockListener).toHaveBeenCalledWith(undefined);
    });
  });

  describe("Event subscription", () => {
    it("should allow subscribing to tree data changes", () => {
      const mockListener = jest.fn();

      const disposable = provider.onDidChangeTreeData(mockListener);

      expect(disposable).toBeDefined();
      expect(typeof disposable.dispose).toBe("function");
    });

    it("should notify listeners when refresh is called", () => {
      const mockListener = jest.fn();
      provider.onDidChangeTreeData(mockListener);

      provider.refresh();

      expect(mockListener).toHaveBeenCalledWith(undefined);
    });
  });

  describe("Empty State Integration", () => {
    it("should integrate empty state with VSCode tree view", async () => {
      const result = await provider.getChildren();

      // Verify empty state provides meaningful user guidance
      expect(result[0]?.label).toBe("No Tasks Available");
      expect(result[0]?.description).toContain("Select a task");
      expect(result[0]?.contextValue).toBe("empty-state");
    });

    it("should provide actionable empty state with commands", async () => {
      const result = await provider.getChildren();
      const emptyStateItem = result[0];

      expect(emptyStateItem?.command).toBeDefined();
      expect(emptyStateItem?.command?.command).toBe(
        "aidm-vscode-extension.refreshTasks"
      );
      expect(emptyStateItem?.command?.title).toBe("Refresh Tasks");
    });

    it("should prevent completely blank tree view", async () => {
      const result = await provider.getChildren();

      expect(result).not.toEqual([]);
      expect(result).toHaveLength(1);
      expect(result[0]).toBeDefined();
    });
  });
});
