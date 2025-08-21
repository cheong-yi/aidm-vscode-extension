/**
 * TaskTreeItem Class
 * VSCode TreeItem implementation for task display in tree view
 * Requirements: 3.1.1 - TaskTreeItem class with basic properties
 */

import * as vscode from 'vscode';
import { Task } from '../../types';

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
    this.contextValue = 'taskItem';

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
   */
  private getStatusIcon(status: string): vscode.ThemeIcon | undefined {
    switch (status) {
      case 'completed':
        return new vscode.ThemeIcon('check');
      case 'in_progress':
        return new vscode.ThemeIcon('sync~spin');
      case 'review':
        return new vscode.ThemeIcon('eye');
      case 'blocked':
        return new vscode.ThemeIcon('error');
      case 'deprecated':
        return new vscode.ThemeIcon('warning');
      case 'not_started':
      default:
        return new vscode.ThemeIcon('circle-outline');
    }
  }
}
