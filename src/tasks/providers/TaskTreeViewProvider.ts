/**
 * TaskTreeViewProvider Class
 * VSCode TreeDataProvider implementation for task tree view
 * Requirements: 3.1.2 - TaskTreeViewProvider class structure with VSCode TreeDataProvider interface
 */

import * as vscode from "vscode";
import { TaskTreeItem } from "./TaskTreeItem";

export class TaskTreeViewProvider
  implements vscode.TreeDataProvider<TaskTreeItem>
{
  /**
   * Event emitter for tree data changes
   * Required by vscode.TreeDataProvider interface
   */
  private readonly _onDidChangeTreeData: vscode.EventEmitter<
    TaskTreeItem | undefined | null
  >;
  public readonly onDidChangeTreeData: vscode.Event<
    TaskTreeItem | undefined | null
  >;

  constructor() {
    this._onDidChangeTreeData = new vscode.EventEmitter<
      TaskTreeItem | undefined | null
    >();
    this.onDidChangeTreeData = this._onDidChangeTreeData.event;
  }

  /**
   * Required by vscode.TreeDataProvider interface
   * Returns the TreeItem representation of the given element
   */
  getTreeItem(element: TaskTreeItem): vscode.TreeItem {
    // Return the element as-is since TaskTreeItem extends TreeItem
    return element;
  }

  /**
   * Required by vscode.TreeDataProvider interface
   * Returns the children of the given element or root items if no element is passed
   *
   * Note: Currently returns empty array for scaffolding - data integration in next task (3.1.3)
   */
  getChildren(element?: TaskTreeItem): Promise<TaskTreeItem[]> {
    // Return empty array for now - real data integration in next task
    return Promise.resolve([]);
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
