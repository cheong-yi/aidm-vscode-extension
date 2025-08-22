/**
 * TaskTreeItem Class
 * VSCode TreeItem implementation for task display in tree view
 * Requirements: 3.1.1 - TaskTreeItem class with basic properties
 * Requirements: 3.1.2 - Add Status Indicator to TaskTreeItem
 */

import * as vscode from "vscode";
import { Task, TaskStatus } from "../../types";

export class TaskTreeItem extends vscode.TreeItem {
  public readonly id: string;
  public readonly task: Task;
  public readonly hasChildren: boolean;
  public readonly dependencyLevel: number;
  public readonly contextValue: string;

  constructor(task: Task, dependencyLevel: number = 0) {
    super(task.title, vscode.TreeItemCollapsibleState.None);

    this.id = task.id;
    this.task = task;
    this.hasChildren = task.dependencies.length > 0;
    this.dependencyLevel = dependencyLevel;
    this.contextValue = "taskItem";

    // Set collapsible state based on whether task has dependencies
    if (this.hasChildren) {
      this.collapsibleState = vscode.TreeItemCollapsibleState.Collapsed;
    } else {
      this.collapsibleState = vscode.TreeItemCollapsibleState.None;
    }

    // Set tooltip to show task description
    this.tooltip = task.description;

    // Set icon based on task status
    this.iconPath = this.getStatusIcon(task.status);
  }

  /**
   * Get appropriate icon for task status
   * Requirements: 3.1.2 - Status indicator for each task status
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
