/**
 * TaskTreeViewProvider Class
 * VSCode TreeDataProvider implementation for task tree view
 * Requirements: 3.1.2 - TaskTreeViewProvider class structure with VSCode TreeDataProvider interface
 * Requirements: 3.2.6 - Implement "No Tasks" state handling
 * Task 3.2.3: Connect TaskTreeViewProvider to TasksDataService
 */

import * as vscode from "vscode";
import { TaskTreeItem } from "./TaskTreeItem";
import { Task } from "../types";
import { TasksDataService } from "../../services";

/**
 * Custom TreeItem for empty state display
 * Requirements: 3.2.6 - Empty state handling with user guidance
 */
class EmptyStateTreeItem extends vscode.TreeItem {
  constructor(
    label: string,
    description: string,
    contextValue: string,
    iconPath: vscode.ThemeIcon,
    command?: vscode.Command
  ) {
    super(label, vscode.TreeItemCollapsibleState.None);

    this.description = description;
    this.contextValue = contextValue;
    this.iconPath = iconPath;
    this.command = command;
    this.tooltip = description;
  }
}

// Union type for all possible tree items
type TreeItemType = TaskTreeItem | EmptyStateTreeItem;

export class TaskTreeViewProvider
  implements vscode.TreeDataProvider<TreeItemType>
{
  /**
   * Event emitter for tree data changes
   * Required by vscode.TreeDataProvider interface
   */
  private readonly _onDidChangeTreeData: vscode.EventEmitter<
    TreeItemType | undefined | null
  >;
  public readonly onDidChangeTreeData: vscode.Event<
    TreeItemType | undefined | null
  >;

  /**
   * TasksDataService dependency for data retrieval
   * Task 3.2.3: Service integration for data access
   */
  private readonly tasksDataService: TasksDataService;

  constructor(tasksDataService: TasksDataService) {
    // Task 3.2.3: Store TasksDataService reference
    this.tasksDataService = tasksDataService;

    this._onDidChangeTreeData = new vscode.EventEmitter<
      TreeItemType | undefined | null
    >();
    this.onDidChangeTreeData = this._onDidChangeTreeData.event;
  }

  /**
   * Required by vscode.TreeDataProvider interface
   * Returns the TreeItem representation of the given element
   */
  getTreeItem(element: TreeItemType): vscode.TreeItem {
    // Return the element as-is since both extend TreeItem
    return element;
  }

  /**
   * Required by vscode.TreeDataProvider interface
   * Returns the children of the given element or root items if no element is passed
   *
   * Task 3.2.4: Implement flat list getChildren method
   * - Root call (element undefined): Returns all tasks as TaskTreeItem[]
   * - Element call (element provided): Returns empty array for flat list structure
   *
   * Task 3.2.3: Uses TasksDataService for data retrieval
   */
  async getChildren(element?: TreeItemType): Promise<TreeItemType[]> {
    try {
      // Task 3.2.4: Flat list implementation
      // If element is provided, return empty array (no hierarchy)
      if (element) {
        return [];
      }

      // Task 3.2.3: Use TasksDataService to retrieve tasks for root level
      const tasks = await this.tasksDataService.getTasks();

      if (tasks.length === 0) {
        return [this.createEmptyStateItem("no-tasks")];
      }

      // Convert tasks to TaskTreeItems for display
      // Task 3.2.4: All tasks are top-level items in flat list structure
      const taskTreeItems = tasks.map((task) => new TaskTreeItem(task));
      return taskTreeItems;
    } catch (error) {
      // Task 3.2.3: Handle service errors gracefully
      console.warn("Failed to retrieve tasks from TasksDataService:", error);
      return [this.createEmptyStateItem("error")];
    }
  }

  /**
   * Creates an empty state tree item for when no tasks are available
   * Requirements: 3.2.6 - Empty state handling with user guidance
   */
  private createEmptyStateItem(
    scenario: "no-tasks" | "error" | "loading"
  ): EmptyStateTreeItem {
    let label: string;
    let description: string;
    let contextValue: string;
    let iconPath: vscode.ThemeIcon;
    let command: vscode.Command | undefined;

    if (scenario === "no-tasks") {
      label = "No Tasks Available";
      description =
        "Select a task from the tree view above to see detailed information.";
      contextValue = "empty-state";
      iconPath = new vscode.ThemeIcon("inbox");
      command = {
        command: "aidm-vscode-extension.refreshTasks",
        title: "Refresh Tasks",
      };
    } else if (scenario === "error") {
      label = "Unable to Load Tasks";
      description = "Click to retry loading tasks";
      contextValue = "empty-state-error";
      iconPath = new vscode.ThemeIcon("warning");
      command = {
        command: "aidm-vscode-extension.retryLoadTasks",
        title: "Retry Loading Tasks",
      };
    } else {
      label = "Loading Tasks...";
      description = "Please wait while tasks are being loaded";
      contextValue = "empty-state-loading";
      iconPath = new vscode.ThemeIcon("sync~spin");
    }

    return new EmptyStateTreeItem(
      label,
      description,
      contextValue,
      iconPath,
      command
    );
  }

  /**
   * Fires the onDidChangeTreeData event to refresh the tree view
   * Called when tree data needs to be updated
   */
  refresh(): void {
    // Fire event with undefined to refresh entire tree
    this._onDidChangeTreeData.fire(undefined);
  }

  /**
   * Dispose method for cleanup
   * Should be called when the provider is no longer needed
   */
  dispose(): void {
    this._onDidChangeTreeData.dispose();
  }
}
