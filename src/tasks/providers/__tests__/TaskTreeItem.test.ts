/**
 * TaskTreeItem Unit Tests
 * Requirements: 3.1.1 - TaskTreeItem class with basic properties
 */

import { jest } from '@jest/globals';
import { TaskTreeItem } from '../TaskTreeItem';
import { Task, TaskStatus, TaskComplexity, TaskPriority } from '../../types';

describe('TaskTreeItem', () => {
  let mockTask: Task;

  beforeEach(() => {
    // Create a mock task for testing
    mockTask = {
      id: '1.1',
      title: 'Setup Project Structure',
      description: 'Create directory structure for task management components',
      status: TaskStatus.NOT_STARTED,
      complexity: TaskComplexity.MEDIUM,
      priority: TaskPriority.HIGH,
      dependencies: [],
      requirements: ['6.1', '6.2', '6.3'],
      createdDate: new Date(),
      lastModified: new Date(),
      assignee: 'developer',
      estimatedHours: 4,
      tags: ['setup', 'infrastructure']
    };
  });

  describe('Basic instantiation', () => {
    it('should create TaskTreeItem with required properties', () => {
      const treeItem = new TaskTreeItem(mockTask, 0);

      expect(treeItem.id).toBe('1.1');
      expect(treeItem.task).toBe(mockTask);
      expect(treeItem.label).toBe('Setup Project Structure');
      expect(treeItem.hasChildren).toBe(false);
      expect(treeItem.dependencyLevel).toBe(0);
      expect(treeItem.contextValue).toBe('taskItem');
    });
  });

  describe('Dependencies handling', () => {
    it('should set hasChildren to true when task has dependencies', () => {
      const taskWithDependencies = {
        ...mockTask,
        dependencies: ['1.2', '1.3']
      };

      const treeItem = new TaskTreeItem(taskWithDependencies, 0);

      expect(treeItem.hasChildren).toBe(true);
    });

    it('should set hasChildren to false when task has no dependencies', () => {
      const taskWithoutDependencies = {
        ...mockTask,
        dependencies: []
      };

      const treeItem = new TaskTreeItem(taskWithoutDependencies, 0);

      expect(treeItem.hasChildren).toBe(false);
    });
  });

  describe('VSCode TreeItem compliance', () => {
    it('should extend vscode.TreeItem with proper properties', () => {
      const treeItem = new TaskTreeItem(mockTask, 1);

      // Should have TreeItem properties
      expect(treeItem.label).toBeDefined();
      expect(treeItem.collapsibleState).toBeDefined();
      expect(treeItem.iconPath).toBeDefined();
      expect(treeItem.contextValue).toBeDefined();

      // Should have our custom properties
      expect(treeItem.id).toBe('1.1');
      expect(treeItem.task).toBe(mockTask);
      expect(treeItem.hasChildren).toBe(false);
      expect(treeItem.dependencyLevel).toBe(1);
    });
  });

  describe('Context value', () => {
    it('should set contextValue to "taskItem"', () => {
      const treeItem = new TaskTreeItem(mockTask, 0);

      expect(treeItem.contextValue).toBe('taskItem');
    });
  });

  describe('Dependency level handling', () => {
    it('should set dependency level correctly', () => {
      const treeItem = new TaskTreeItem(mockTask, 2);

      expect(treeItem.dependencyLevel).toBe(2);
    });

    it('should default dependency level to 0 when not specified', () => {
      const treeItem = new TaskTreeItem(mockTask);

      expect(treeItem.dependencyLevel).toBe(0);
    });
  });

  describe('Label handling', () => {
    it('should set label to task title', () => {
      const treeItem = new TaskTreeItem(mockTask, 0);

      expect(treeItem.label).toBe('Setup Project Structure');
    });

    it('should handle empty title gracefully', () => {
      const taskWithEmptyTitle = {
        ...mockTask,
        title: ''
      };

      const treeItem = new TaskTreeItem(taskWithEmptyTitle, 0);

      expect(treeItem.label).toBe('');
    });
  });
});
