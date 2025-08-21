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
      createdDate: new Date(),
      lastModified: new Date(),
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
