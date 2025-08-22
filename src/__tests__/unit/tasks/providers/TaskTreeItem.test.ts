/**
 * TaskTreeItem Unit Tests
 * Requirements: 3.1.1 - TaskTreeItem class with basic properties
 * Requirements: 3.1.2 - Add Status Indicator to TaskTreeItem
 * Requirements: 3.1.3 - Add TaskTreeItem collapsible state logic
 * Requirements: 3.1.4 - Add TaskTreeItem tooltip functionality
 * Requirements: 3.1.5 - Add TaskTreeItem executable state indicators
 * Enhanced for Taskmaster Dashboard: 6.8, 6.9, 7.7
 */

import { jest } from "@jest/globals";
import { TaskTreeItem } from "../../../../tasks/providers/TaskTreeItem";
import {
  Task,
  TaskStatus,
  TaskComplexity,
  TaskPriority,
} from "../../../../types/tasks";
import * as vscode from "vscode";

describe("TaskTreeItem", () => {
  let mockTask: Task;

  beforeEach(() => {
    // Create a mock task for testing with enhanced properties
    mockTask = {
      id: "1.1",
      title: "Setup Project Structure",
      description: "Create directory structure for task management components",
      status: TaskStatus.NOT_STARTED,
      complexity: TaskComplexity.MEDIUM,
      priority: TaskPriority.HIGH,
      dependencies: [],
      requirements: ["6.1", "6.2", "6.3"],
      createdDate: "2024-01-01T00:00:00Z",
      lastModified: "2024-01-01T00:00:00Z",
      assignee: "developer",
      estimatedHours: 4,
      estimatedDuration: "15-30 min",
      isExecutable: true,
      tags: ["setup", "infrastructure"],
    };
  });

  describe("Basic instantiation", () => {
    it("should create TaskTreeItem with required properties", () => {
      const treeItem = new TaskTreeItem(mockTask, 0);

      expect(treeItem.id).toBe("1.1");
      expect(treeItem.task).toBe(mockTask);
      expect(treeItem.label).toBe("Task 1.1: Setup Project Structure");
      expect(treeItem.hasChildren).toBe(true); // Updated: task has expandable content
      expect(treeItem.dependencyLevel).toBe(0);
      expect(treeItem.contextValue).toBe("executable-task"); // Updated: NOT_STARTED tasks are executable
      expect(treeItem.isExecutable).toBe(true);
      expect(treeItem.estimatedDuration).toBe("15-30 min");
      expect(treeItem.statusDisplayName).toBe("not started");
    });

    it("should format label correctly as 'Task [ID]: [Title]'", () => {
      const treeItem = new TaskTreeItem(mockTask, 0);
      expect(treeItem.label).toBe("Task 1.1: Setup Project Structure");
    });
  });

  describe("Enhanced properties", () => {
    it("should set isExecutable correctly for not_started tasks", () => {
      const executableTask = {
        ...mockTask,
        status: TaskStatus.NOT_STARTED,
      };
      const treeItem = new TaskTreeItem(executableTask, 0);
      expect(treeItem.isExecutable).toBe(true);
    });

    it("should set isExecutable to false for non-not_started tasks", () => {
      const inProgressTask = {
        ...mockTask,
        status: TaskStatus.IN_PROGRESS,
      };
      const treeItem = new TaskTreeItem(inProgressTask, 0);
      expect(treeItem.isExecutable).toBe(false);
    });

    it("should set estimatedDuration from task", () => {
      const taskWithDuration = { ...mockTask, estimatedDuration: "20-25 min" };
      const treeItem = new TaskTreeItem(taskWithDuration, 0);
      expect(treeItem.estimatedDuration).toBe("20-25 min");
    });

    it("should set statusDisplayName from task or fallback to STATUS_DISPLAY_NAMES", () => {
      const taskWithCustomStatus = {
        ...mockTask,
        statusDisplayName: "custom status",
      };
      const treeItem = new TaskTreeItem(taskWithCustomStatus, 0);
      expect(treeItem.statusDisplayName).toBe("custom status");
    });

    it("should fallback to STATUS_DISPLAY_NAMES when statusDisplayName not provided", () => {
      const taskWithoutStatusName = {
        ...mockTask,
        statusDisplayName: undefined,
      };
      const treeItem = new TaskTreeItem(taskWithoutStatusName, 0);
      expect(treeItem.statusDisplayName).toBe("not started");
    });
  });

  describe("Executable state indicators", () => {
    it("should set isExecutable to true for NOT_STARTED tasks", () => {
      const notStartedTask = { ...mockTask, status: TaskStatus.NOT_STARTED };
      const treeItem = new TaskTreeItem(notStartedTask, 0);
      expect(treeItem.isExecutable).toBe(true);
    });

    it("should set isExecutable to false for IN_PROGRESS tasks", () => {
      const inProgressTask = { ...mockTask, status: TaskStatus.IN_PROGRESS };
      const treeItem = new TaskTreeItem(inProgressTask, 0);
      expect(treeItem.isExecutable).toBe(false);
    });

    it("should set isExecutable to false for COMPLETED tasks", () => {
      const completedTask = { ...mockTask, status: TaskStatus.COMPLETED };
      const treeItem = new TaskTreeItem(completedTask, 0);
      expect(treeItem.isExecutable).toBe(false);
    });

    it("should set isExecutable to false for REVIEW tasks", () => {
      const reviewTask = { ...mockTask, status: TaskStatus.REVIEW };
      const treeItem = new TaskTreeItem(reviewTask, 0);
      expect(treeItem.isExecutable).toBe(false);
    });

    it("should set isExecutable to false for BLOCKED tasks", () => {
      const blockedTask = { ...mockTask, status: TaskStatus.BLOCKED };
      const treeItem = new TaskTreeItem(blockedTask, 0);
      expect(treeItem.isExecutable).toBe(false);
    });

    it("should set isExecutable to false for DEPRECATED tasks", () => {
      const deprecatedTask = { ...mockTask, status: TaskStatus.DEPRECATED };
      const treeItem = new TaskTreeItem(deprecatedTask, 0);
      expect(treeItem.isExecutable).toBe(false);
    });

    it("should set contextValue to 'executable-task' for executable tasks", () => {
      const executableTask = { ...mockTask, status: TaskStatus.NOT_STARTED };
      const treeItem = new TaskTreeItem(executableTask, 0);
      expect(treeItem.contextValue).toBe("executable-task");
    });

    it("should set contextValue to 'task' for non-executable tasks", () => {
      const nonExecutableTask = { ...mockTask, status: TaskStatus.IN_PROGRESS };
      const treeItem = new TaskTreeItem(nonExecutableTask, 0);
      expect(treeItem.contextValue).toBe("task");
    });

    it("should add robot icon to description for executable tasks", () => {
      const executableTask = { ...mockTask, status: TaskStatus.NOT_STARTED };
      const treeItem = new TaskTreeItem(executableTask, 0);
      expect(treeItem.description).toContain("🤖");
    });

    it("should not add robot icon to description for non-executable tasks", () => {
      const nonExecutableTask = { ...mockTask, status: TaskStatus.IN_PROGRESS };
      const treeItem = new TaskTreeItem(nonExecutableTask, 0);
      expect(treeItem.description).not.toContain("🤖");
    });

    it("should include robot icon in description with other content for executable tasks", () => {
      const executableTask = {
        ...mockTask,
        status: TaskStatus.NOT_STARTED,
        estimatedDuration: "15-20 min",
        testStatus: { totalTests: 5, passedTests: 5, failedTests: 0 },
      };
      const treeItem = new TaskTreeItem(executableTask, 0);
      expect(treeItem.description).toBe("15-20 min • 5/5 passed • 🤖");
    });

    it("should handle executable tasks with minimal content", () => {
      const minimalExecutableTask = {
        ...mockTask,
        status: TaskStatus.NOT_STARTED,
        estimatedDuration: undefined,
        testStatus: undefined,
      };
      const treeItem = new TaskTreeItem(minimalExecutableTask, 0);
      expect(treeItem.description).toBe("🤖");
    });
  });

  describe("Test summary generation", () => {
    it("should generate test summary for tasks with test status", () => {
      const taskWithTests = {
        ...mockTask,
        testStatus: {
          totalTests: 18,
          passedTests: 15,
          failedTests: 3,
          lastRunDate: "2024-01-01T10:00:00Z",
        },
      };
      const treeItem = new TaskTreeItem(taskWithTests, 0);
      expect(treeItem.testSummary).toBe("15/18 passed");
    });

    it("should show 'No tests yet' for tasks without test status", () => {
      const taskWithoutTests = { ...mockTask, testStatus: undefined };
      const treeItem = new TaskTreeItem(taskWithoutTests, 0);
      expect(treeItem.testSummary).toBe("No tests yet");
    });

    it("should show 'No tests yet' for tasks with empty test status", () => {
      const taskWithEmptyTests = {
        ...mockTask,
        testStatus: { totalTests: 0, passedTests: 0, failedTests: 0 },
      };
      const treeItem = new TaskTreeItem(taskWithEmptyTests, 0);
      expect(treeItem.testSummary).toBe("No tests yet");
    });
  });

  describe("Description generation", () => {
    it("should generate description with estimated duration and test summary", () => {
      const taskWithBoth = {
        ...mockTask,
        estimatedDuration: "20-25 min",
        testStatus: { totalTests: 10, passedTests: 8, failedTests: 2 },
      };
      const treeItem = new TaskTreeItem(taskWithBoth, 0);
      expect(treeItem.description).toBe("20-25 min • 8/10 passed • 🤖");
    });

    it("should generate description with only estimated duration", () => {
      const taskWithDurationOnly = {
        ...mockTask,
        estimatedDuration: "15-20 min",
      };
      const treeItem = new TaskTreeItem(taskWithDurationOnly, 0);
      expect(treeItem.description).toBe("15-20 min • 🤖");
    });

    it("should generate description with only test summary", () => {
      const taskWithTestsOnly = {
        ...mockTask,
        estimatedDuration: undefined,
        testStatus: { totalTests: 5, passedTests: 5, failedTests: 0 },
      };
      const treeItem = new TaskTreeItem(taskWithTestsOnly, 0);
      expect(treeItem.description).toBe("5/5 passed • 🤖");
    });

    it("should not set description when no additional context available", () => {
      const taskWithoutContext = {
        ...mockTask,
        status: TaskStatus.IN_PROGRESS, // Make it non-executable
        estimatedDuration: undefined,
        testStatus: undefined,
      };
      const treeItem = new TaskTreeItem(taskWithoutContext, 0);
      expect(treeItem.description).toBeUndefined();
    });
  });

  describe("Dependencies handling", () => {
    it("should set hasChildren to true when task has dependencies", () => {
      const taskWithDependencies = {
        ...mockTask,
        dependencies: ["1.2", "1.3"],
      };

      const treeItem = new TaskTreeItem(taskWithDependencies, 0);

      expect(treeItem.hasChildren).toBe(true);
      expect(treeItem.collapsibleState).toBe(
        vscode.TreeItemCollapsibleState.Collapsed
      );
    });

    it("should set hasChildren to true when task has expandable content", () => {
      // Task has description, requirements, estimatedDuration, tags, assignee
      const treeItem = new TaskTreeItem(mockTask, 0);

      expect(treeItem.hasChildren).toBe(true);
      expect(treeItem.collapsibleState).toBe(
        vscode.TreeItemCollapsibleState.Collapsed
      );
    });
  });

  describe("Collapsible state logic", () => {
    it("should set collapsible state to Collapsed for tasks with detailed description", () => {
      const taskWithDetailedDescription = {
        ...mockTask,
        dependencies: [],
        requirements: [],
        estimatedDuration: undefined,
        tags: undefined,
        assignee: undefined,
        description:
          "This is a very detailed description that exceeds the minimum length threshold for expandable content",
      };

      const treeItem = new TaskTreeItem(taskWithDetailedDescription, 0);

      expect(treeItem.hasChildren).toBe(true);
      expect(treeItem.collapsibleState).toBe(
        vscode.TreeItemCollapsibleState.Collapsed
      );
    });

    it("should set collapsible state to Collapsed for tasks with test status", () => {
      const taskWithTestStatus = {
        ...mockTask,
        dependencies: [],
        requirements: [],
        estimatedDuration: undefined,
        tags: undefined,
        assignee: undefined,
        description: "Short",
        testStatus: {
          totalTests: 5,
          passedTests: 4,
          failedTests: 1,
        },
      };

      const treeItem = new TaskTreeItem(taskWithTestStatus, 0);

      expect(treeItem.hasChildren).toBe(true);
      expect(treeItem.collapsibleState).toBe(
        vscode.TreeItemCollapsibleState.Collapsed
      );
    });

    it("should set collapsible state to None for minimal tasks without expandable content", () => {
      const minimalTask = {
        ...mockTask,
        description: "Short",
        dependencies: [],
        requirements: [],
        estimatedDuration: undefined,
        tags: undefined,
        assignee: undefined,
        testStatus: undefined,
      };

      const treeItem = new TaskTreeItem(minimalTask, 0);

      expect(treeItem.hasChildren).toBe(false);
      expect(treeItem.collapsibleState).toBe(
        vscode.TreeItemCollapsibleState.None
      );
    });

    it("should set collapsible state to Collapsed for tasks with estimated duration", () => {
      const taskWithDuration = {
        ...mockTask,
        dependencies: [],
        requirements: [],
        description: "Short",
        tags: undefined,
        assignee: undefined,
        testStatus: undefined,
        estimatedDuration: "15-20 min",
      };

      const treeItem = new TaskTreeItem(taskWithDuration, 0);

      expect(treeItem.hasChildren).toBe(true);
      expect(treeItem.collapsibleState).toBe(
        vscode.TreeItemCollapsibleState.Collapsed
      );
    });

    it("should set collapsible state to Collapsed for tasks with tags", () => {
      const taskWithTags = {
        ...mockTask,
        dependencies: [],
        requirements: [],
        description: "Short",
        estimatedDuration: undefined,
        assignee: undefined,
        testStatus: undefined,
        tags: ["tag1", "tag2"],
      };

      const treeItem = new TaskTreeItem(taskWithTags, 0);

      expect(treeItem.hasChildren).toBe(true);
      expect(treeItem.collapsibleState).toBe(
        vscode.TreeItemCollapsibleState.Collapsed
      );
    });

    it("should set collapsible state to Collapsed for tasks with requirements", () => {
      const taskWithRequirements = {
        ...mockTask,
        dependencies: [],
        description: "Short",
        estimatedDuration: undefined,
        tags: undefined,
        assignee: undefined,
        testStatus: undefined,
        requirements: ["req1", "req2"],
      };

      const treeItem = new TaskTreeItem(taskWithRequirements, 0);

      expect(treeItem.hasChildren).toBe(true);
      expect(treeItem.collapsibleState).toBe(
        vscode.TreeItemCollapsibleState.Collapsed
      );
    });

    it("should set collapsible state to Collapsed for tasks with assignee", () => {
      const taskWithAssignee = {
        ...mockTask,
        dependencies: [],
        requirements: [],
        description: "Short",
        estimatedDuration: undefined,
        tags: undefined,
        testStatus: undefined,
        assignee: "developer",
      };

      const treeItem = new TaskTreeItem(taskWithAssignee, 0);

      expect(treeItem.hasChildren).toBe(true);
      expect(treeItem.collapsibleState).toBe(
        vscode.TreeItemCollapsibleState.Collapsed
      );
    });
  });

  describe("VSCode TreeItem compliance", () => {
    it("should extend vscode.TreeItem with proper properties", () => {
      const treeItem = new TaskTreeItem(mockTask, 1);

      // Should have TreeItem properties
      expect(treeItem.label).toBeDefined();
      expect(treeItem.collapsibleState).toBeDefined();
      expect(treeItem.iconPath).toBeDefined();
      expect(treeItem.contextValue).toBeDefined();

      // Should have our custom properties
      expect(treeItem.id).toBe("1.1");
      expect(treeItem.task).toBe(mockTask);
      expect(treeItem.hasChildren).toBe(true); // Updated: task has expandable content
      expect(treeItem.dependencyLevel).toBe(1);
    });
  });

  describe("Context value", () => {
    it('should set contextValue to "executable-task" for executable tasks', () => {
      const treeItem = new TaskTreeItem(mockTask, 0);
      expect(treeItem.contextValue).toBe("executable-task");
    });
  });

  describe("Dependency level handling", () => {
    it("should set dependency level correctly", () => {
      const treeItem = new TaskTreeItem(mockTask, 2);
      expect(treeItem.dependencyLevel).toBe(2);
    });

    it("should default dependency level to 0 when not specified", () => {
      const treeItem = new TaskTreeItem(mockTask);
      expect(treeItem.dependencyLevel).toBe(0);
    });
  });

  describe("Label handling", () => {
    it("should format label as 'Task [ID]: [Title]'", () => {
      const treeItem = new TaskTreeItem(mockTask, 0);
      expect(treeItem.label).toBe("Task 1.1: Setup Project Structure");
    });

    it("should handle empty title gracefully", () => {
      const taskWithEmptyTitle = {
        ...mockTask,
        title: "",
      };

      const treeItem = new TaskTreeItem(taskWithEmptyTitle, 0);
      expect(treeItem.label).toBe("Task 1.1: ");
    });

    it("should handle missing ID gracefully", () => {
      const taskWithMissingId = {
        ...mockTask,
        id: "",
      };

      const treeItem = new TaskTreeItem(taskWithMissingId, 0);
      expect(treeItem.label).toBe("Task : Setup Project Structure");
    });
  });

  describe("Status indicator icons", () => {
    it("should set the icon for completed status", () => {
      const completedTask = {
        ...mockTask,
        status: TaskStatus.COMPLETED,
      };

      const treeItem = new TaskTreeItem(completedTask, 0);

      expect(treeItem.iconPath).toBeDefined();
      expect(treeItem.iconPath).toEqual(
        expect.objectContaining({
          id: "check",
        })
      );
    });

    it("should set the icon for in_progress status", () => {
      const inProgressTask = {
        ...mockTask,
        status: TaskStatus.IN_PROGRESS,
      };

      const treeItem = new TaskTreeItem(inProgressTask, 0);

      expect(treeItem.iconPath).toBeDefined();
      expect(treeItem.iconPath).toEqual(
        expect.objectContaining({
          id: "sync~spin",
        })
      );
    });

    it("should set the icon for not_started status", () => {
      const notStartedTask = {
        ...mockTask,
        status: TaskStatus.NOT_STARTED,
      };

      const treeItem = new TaskTreeItem(notStartedTask, 0);

      expect(treeItem.iconPath).toBeDefined();
      expect(treeItem.iconPath).toEqual(
        expect.objectContaining({
          id: "circle-outline",
        })
      );
    });

    it("should set the icon for review status", () => {
      const reviewTask = {
        ...mockTask,
        status: TaskStatus.REVIEW,
      };

      const treeItem = new TaskTreeItem(reviewTask, 0);

      expect(treeItem.iconPath).toBeDefined();
      expect(treeItem.iconPath).toEqual(
        expect.objectContaining({
          id: "eye",
        })
      );
    });

    it("should set the icon for blocked status", () => {
      const blockedTask = {
        ...mockTask,
        status: TaskStatus.BLOCKED,
      };

      const treeItem = new TaskTreeItem(blockedTask, 0);

      expect(treeItem.iconPath).toBeDefined();
      expect(treeItem.iconPath).toEqual(
        expect.objectContaining({
          id: "error",
        })
      );
    });

    it("should set the icon for deprecated status", () => {
      const deprecatedTask = {
        ...mockTask,
        status: TaskStatus.DEPRECATED,
      };

      const treeItem = new TaskTreeItem(deprecatedTask, 0);

      expect(treeItem.iconPath).toBeDefined();
      expect(treeItem.iconPath).toEqual(
        expect.objectContaining({
          id: "warning",
        })
      );
    });

    it("should set default icon for unknown status", () => {
      const unknownStatusTask = {
        ...mockTask,
        status: "unknown_status" as TaskStatus,
      };

      const treeItem = new TaskTreeItem(unknownStatusTask, 0);

      expect(treeItem.iconPath).toBeDefined();
      expect(treeItem.iconPath).toEqual(
        expect.objectContaining({
          id: "circle-outline",
        })
      );
    });
  });

  describe("Tooltip functionality", () => {
    it("should generate comprehensive tooltip with complete task data", () => {
      const completeTask = {
        ...mockTask,
        description:
          "Create directory structure for task management components",
        dependencies: ["1.2", "1.3"],
        requirements: ["6.1", "6.2", "6.3"],
        estimatedDuration: "15-30 min",
        priority: TaskPriority.HIGH,
        assignee: "developer",
        testStatus: {
          totalTests: 18,
          passedTests: 15,
          failedTests: 3,
          status: "passing" as any,
        },
      };

      const treeItem = new TaskTreeItem(completeTask, 0);
      const expectedTooltip = `Task 1.1: Setup Project Structure

Description: Create directory structure for task management components

Status: not started
Complexity: medium
Dependencies: 1.2, 1.3
Requirements: 6.1, 6.2, 6.3
Estimated Duration: 15-30 min
Priority: high
Assignee: developer
Test Results: 15/18 passed`;

      expect(treeItem.tooltip).toBe(expectedTooltip);
    });

    it("should generate tooltip with minimal task data gracefully", () => {
      const minimalTask = {
        id: "3.1.2",
        title: "Basic task",
        description: "",
        status: TaskStatus.NOT_STARTED,
        complexity: TaskComplexity.LOW,
        priority: TaskPriority.MEDIUM,
        dependencies: [],
        requirements: [],
        createdDate: "2024-01-01T00:00:00Z",
        lastModified: "2024-01-01T00:00:00Z",
      };

      const treeItem = new TaskTreeItem(minimalTask, 0);
      const expectedTooltip = `Task 3.1.2: Basic task

Status: not started
Complexity: low
Priority: medium`;

      expect(treeItem.tooltip).toBe(expectedTooltip);
    });

    it("should handle missing description property gracefully", () => {
      const taskWithoutDescription = {
        ...mockTask,
        description: "",
      };

      const treeItem = new TaskTreeItem(taskWithoutDescription, 0);
      const tooltip = treeItem.tooltip as string;

      // Should not contain "Description:" section
      expect(tooltip).not.toContain("Description:");
      // Should still contain other sections
      expect(tooltip).toContain("Task 1.1: Setup Project Structure");
      expect(tooltip).toContain("Status: not started");
      expect(tooltip).toContain("Complexity: medium");
    });

    it("should handle empty dependencies array gracefully", () => {
      const taskWithEmptyDependencies = {
        ...mockTask,
        dependencies: [],
      };

      const treeItem = new TaskTreeItem(taskWithEmptyDependencies, 0);
      const tooltip = treeItem.tooltip as string;

      // Should not contain "Dependencies:" section
      expect(tooltip).not.toContain("Dependencies:");
    });

    it("should handle empty requirements array gracefully", () => {
      const taskWithEmptyRequirements = {
        ...mockTask,
        requirements: [],
      };

      const treeItem = new TaskTreeItem(taskWithEmptyRequirements, 0);
      const tooltip = treeItem.tooltip as string;

      // Should not contain "Requirements:" section
      expect(tooltip).not.toContain("Requirements:");
    });

    it("should handle missing estimated duration gracefully", () => {
      const taskWithoutDuration = {
        ...mockTask,
        estimatedDuration: undefined,
      };

      const treeItem = new TaskTreeItem(taskWithoutDuration, 0);
      const tooltip = treeItem.tooltip as string;

      // Should not contain "Estimated Duration:" section
      expect(tooltip).not.toContain("Estimated Duration:");
    });

    it("should handle missing priority gracefully", () => {
      const taskWithoutPriority = {
        ...mockTask,
        priority: undefined,
      };

      const treeItem = new TaskTreeItem(taskWithoutPriority, 0);
      const tooltip = treeItem.tooltip as string;

      // Should not contain "Priority:" section
      expect(tooltip).not.toContain("Priority:");
    });

    it("should handle missing assignee gracefully", () => {
      const taskWithoutAssignee = {
        ...mockTask,
        assignee: undefined,
      };

      const treeItem = new TaskTreeItem(taskWithoutAssignee, 0);
      const tooltip = treeItem.tooltip as string;

      // Should not contain "Assignee:" section
      expect(tooltip).not.toContain("Assignee:");
    });

    it("should handle missing test status gracefully", () => {
      const taskWithoutTestStatus = {
        ...mockTask,
        testStatus: undefined,
      };

      const treeItem = new TaskTreeItem(taskWithoutTestStatus, 0);
      const tooltip = treeItem.tooltip as string;

      // Should not contain "Test Results:" section
      expect(tooltip).not.toContain("Test Results:");
    });

    it("should handle long title and description in tooltip", () => {
      const taskWithLongContent = {
        ...mockTask,
        title:
          "This is a very long task title that demonstrates how the tooltip handles lengthy text content without breaking the formatting or display",
        description:
          "This is an extremely detailed description that provides comprehensive information about the task requirements, implementation details, acceptance criteria, and any additional context that developers might need to understand the full scope of work involved in completing this particular development task successfully.",
      };

      const treeItem = new TaskTreeItem(taskWithLongContent, 0);
      const tooltip = treeItem.tooltip as string;

      // Should contain the full title and description
      expect(tooltip).toContain(
        "This is a very long task title that demonstrates how the tooltip handles lengthy text content without breaking the formatting or display"
      );
      expect(tooltip).toContain(
        "This is an extremely detailed description that provides comprehensive information about the task requirements"
      );
    });

    it("should format tooltip with proper line breaks and sections", () => {
      const taskWithAllFields = {
        ...mockTask,
        dependencies: ["1.2", "1.3", "1.4"],
        requirements: ["6.1", "6.2", "6.3", "6.4"],
        estimatedDuration: "20-25 min",
        priority: TaskPriority.CRITICAL,
        assignee: "senior-developer",
      };

      const treeItem = new TaskTreeItem(taskWithAllFields, 0);
      const tooltip = treeItem.tooltip as string;

      // Should have proper section separation with double line breaks
      expect(tooltip).toContain("\n\nDescription:");
      expect(tooltip).toContain("\n\nStatus:");
      expect(tooltip).toContain("\nComplexity:");
      expect(tooltip).toContain("\nDependencies:");
      expect(tooltip).toContain("\nRequirements:");
      expect(tooltip).toContain("\nEstimated Duration:");
      expect(tooltip).toContain("\nPriority:");
      expect(tooltip).toContain("\nAssignee:");
    });

    it("should handle task with custom status display name", () => {
      const taskWithCustomStatus = {
        ...mockTask,
        statusDisplayName: "custom status name",
      };

      const treeItem = new TaskTreeItem(taskWithCustomStatus, 0);
      const tooltip = treeItem.tooltip as string;

      expect(tooltip).toContain("Status: custom status name");
    });

    it("should fallback to enum status when statusDisplayName is missing", () => {
      const taskWithoutStatusName = {
        ...mockTask,
        statusDisplayName: undefined,
      };

      const treeItem = new TaskTreeItem(taskWithoutStatusName, 0);
      const tooltip = treeItem.tooltip as string;

      expect(tooltip).toContain("Status: not started");
    });

    it("should handle task with test status showing passed/failed counts", () => {
      const taskWithTests = {
        ...mockTask,
        testStatus: {
          totalTests: 25,
          passedTests: 22,
          failedTests: 3,
          status: "passing" as any,
        },
      };

      const treeItem = new TaskTreeItem(taskWithTests, 0);
      const tooltip = treeItem.tooltip as string;

      expect(tooltip).toContain("Test Results: 22/25 passed");
    });

    it("should not show test results section when totalTests is 0", () => {
      const taskWithNoTests = {
        ...mockTask,
        testStatus: {
          totalTests: 0,
          passedTests: 0,
          failedTests: 0,
          status: "not_run" as any,
        },
      };

      const treeItem = new TaskTreeItem(taskWithNoTests, 0);
      const tooltip = treeItem.tooltip as string;

      expect(tooltip).not.toContain("Test Results:");
    });

    it("should handle edge case with null/undefined task properties", () => {
      const taskWithNulls = {
        ...mockTask,
        description: null as any,
        dependencies: null as any,
        requirements: null as any,
        estimatedDuration: null as any,
        priority: null as any,
        assignee: null as any,
        testStatus: null as any,
      };

      const treeItem = new TaskTreeItem(taskWithNulls, 0);
      const tooltip = treeItem.tooltip as string;

      // Should still generate valid tooltip without errors
      expect(tooltip).toBeDefined();
      expect(tooltip).toContain("Task 1.1: Setup Project Structure");
      expect(tooltip).toContain("Status: not started");
      expect(tooltip).toContain("Complexity: medium");
      // Should not contain sections for null properties
      expect(tooltip).not.toContain("Description:");
      expect(tooltip).not.toContain("Dependencies:");
      expect(tooltip).not.toContain("Requirements:");
      expect(tooltip).not.toContain("Estimated Duration:");
      expect(tooltip).not.toContain("Priority:");
      expect(tooltip).not.toContain("Assignee:");
      expect(tooltip).not.toContain("Test Results:");
    });
  });
});
