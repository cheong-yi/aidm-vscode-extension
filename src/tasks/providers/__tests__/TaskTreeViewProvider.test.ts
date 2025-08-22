/**
 * TaskTreeViewProvider Unit Tests
 * Requirements: 3.1.2 - TaskTreeViewProvider class structure with VSCode TreeDataProvider interface
 */

import { jest } from "@jest/globals";
import * as vscode from "vscode";
import { TaskTreeViewProvider } from "../TaskTreeViewProvider";
import { TaskTreeItem } from "../TaskTreeItem";
import { Task, TaskStatus, TaskComplexity, TaskPriority } from "../../types";

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

    it("should be assignable to TreeDataProvider type", () => {
      // TypeScript should accept this assignment
      const treeProvider: vscode.TreeDataProvider<TaskTreeItem> = provider;
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

  describe("getChildren method", () => {
    it("should return empty array when getChildren called with no element", async () => {
      const result = await provider.getChildren();

      expect(result).toEqual([]);
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(0);
    });

    it("should return empty array when getChildren called with element", async () => {
      const result = await provider.getChildren(mockTreeItem);

      expect(result).toEqual([]);
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(0);
    });

    it("should return Promise<TaskTreeItem[]>", async () => {
      const result = provider.getChildren();

      expect(result).toBeInstanceOf(Promise);

      const resolved = await result;
      expect(Array.isArray(resolved)).toBe(true);
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
});
