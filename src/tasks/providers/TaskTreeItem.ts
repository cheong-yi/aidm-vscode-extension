/**
 * TaskTreeItem Class
 * VSCode TreeItem implementation for task display in tree view
 * Requirements: 3.1.1 - TaskTreeItem class with basic properties
 * Requirements: 3.1.2 - Add Status Indicator to TaskTreeItem
 * Requirements: 3.1.3 - Add TaskTreeItem collapsible state logic
 * Enhanced for Taskmaster Dashboard: 6.8, 6.9, 7.7
 */

import * as vscode from "vscode";
import { Task, TaskStatus, STATUS_DISPLAY_NAMES } from "../types";

export class TaskTreeItem extends vscode.TreeItem {
  public readonly id: string;
  public readonly task: Task;
  public readonly hasChildren: boolean;
  public readonly dependencyLevel: number;
  public readonly contextValue: string;
  public readonly isExecutable: boolean;
  public readonly estimatedDuration?: string;
  public readonly testSummary?: string;
  public readonly statusDisplayName: string;

  constructor(task: Task, dependencyLevel: number = 0) {
    // Format label as "Task [ID]: [Title]" to match mockup structure
    const formattedLabel = `Task ${task.id}: ${task.title}`;

    // Determine collapsible state based on task content analysis
    const collapsibleState = TaskTreeItem.determineCollapsibleState(task);

    super(formattedLabel, collapsibleState);

    this.id = task.id;
    this.task = task;
    this.hasChildren = TaskTreeItem.hasExpandableContent(task);
    this.dependencyLevel = dependencyLevel;
    this.contextValue = "task"; // Changed from "taskItem" to match design requirements
    this.isExecutable =
      task.isExecutable === true && task.status === TaskStatus.NOT_STARTED;
    this.estimatedDuration = task.estimatedDuration;
    this.statusDisplayName =
      task.statusDisplayName || STATUS_DISPLAY_NAMES[task.status];

    // Generate test summary for display
    this.testSummary = this.generateTestSummary(task);

    // Set tooltip to show task description
    this.tooltip = task.description;

    // Set icon based on task status
    this.iconPath = this.getStatusIcon(task.status);

    // Set description to show additional context (estimated duration, test summary)
    this.description = this.generateDescription();
  }

  /**
   * Determine if task should be collapsible based on content analysis
   * Requirements: 3.1.3 - Collapsible state logic for expandable list design
   * 
   * Tasks are collapsible if they have:
   * - Detailed description
   * - Dependencies
   * - Test status
   * - Estimated duration
   * - Tags or other metadata
   * 
   * @param task The task to analyze
   * @returns vscode.TreeItemCollapsibleState
   */
  private static determineCollapsibleState(task: Task): vscode.TreeItemCollapsibleState {
    if (TaskTreeItem.hasExpandableContent(task)) {
      return vscode.TreeItemCollapsibleState.Collapsed;
    }
    return vscode.TreeItemCollapsibleState.None;
  }

  /**
   * Check if task has expandable content that should be shown in expanded state
   * Requirements: 3.1.3 - hasChildren property logic for expandable content
   * 
   * @param task The task to check
   * @returns boolean indicating if task has expandable content
   */
  private static hasExpandableContent(task: Task): boolean {
    // Check for detailed description (more than just basic text)
    const hasDetailedDescription = task.description && 
      task.description.trim().length > 20; // Basic threshold for "detailed" content

    // Check for dependencies
    const hasDependencies = task.dependencies && task.dependencies.length > 0;

    // Check for test status
    const hasTestStatus = task.testStatus && 
      (task.testStatus.totalTests > 0 || (task.testStatus.failingTestsList && task.testStatus.failingTestsList.length > 0));

    // Check for estimated duration
    const hasEstimatedDuration = task.estimatedDuration && 
      task.estimatedDuration.trim().length > 0;

    // Check for tags
    const hasTags = task.tags && task.tags.length > 0;

    // Check for requirements
    const hasRequirements = task.requirements && task.requirements.length > 0;

    // Check for assignee
    const hasAssignee = Boolean(task.assignee && task.assignee.trim().length > 0);

    // Task is expandable if it has any of these content types
    return Boolean(hasDetailedDescription || 
           hasDependencies || 
           hasTestStatus || 
           hasEstimatedDuration || 
           hasTags || 
           hasRequirements || 
           hasAssignee);
  }

  /**
   * Generate test summary string for display
   * Format: "15/18 passed" or "No tests yet"
   */
  private generateTestSummary(task: Task): string | undefined {
    if (!task.testStatus) {
      return "No tests yet";
    }

    const { totalTests, passedTests, failedTests } = task.testStatus;
    if (totalTests === 0) {
      return "No tests yet";
    }

    return `${passedTests}/${totalTests} passed`;
  }

  /**
   * Generate description string for the tree item
   * Shows estimated duration and test summary when available
   */
  private generateDescription(): string | undefined {
    const parts: string[] = [];

    if (this.estimatedDuration) {
      parts.push(this.estimatedDuration);
    }

    if (this.testSummary && this.testSummary !== "No tests yet") {
      parts.push(this.testSummary);
    }

    return parts.length > 0 ? parts.join(" • ") : undefined;
  }

  /**
   * Get appropriate icon for task status
   * Requirements: 3.1.2 - Status indicator for each task status
   * Icons match mockup color scheme semantically:
   * - NOT_STARTED: circle-outline (gray)
   * - IN_PROGRESS: sync~spin (blue)
   * - REVIEW: eye (yellow)
   * - COMPLETED: check (green)
   * - BLOCKED: error (red)
   * - DEPRECATED: warning (dark)
   */
  private getStatusIcon(status: TaskStatus): vscode.ThemeIcon {
    switch (status) {
      case TaskStatus.COMPLETED:
        return new vscode.ThemeIcon("check");
      case TaskStatus.IN_PROGRESS:
        return new vscode.ThemeIcon("sync~spin");
      case TaskStatus.REVIEW:
        return new vscode.ThemeIcon("eye");
      case TaskStatus.BLOCKED:
        return new vscode.ThemeIcon("error");
      case TaskStatus.DEPRECATED:
        return new vscode.ThemeIcon("warning");
      case TaskStatus.NOT_STARTED:
      default:
        return new vscode.ThemeIcon("circle-outline");
    }
  }
}
