/**
 * TaskTreeViewProvider Class
 * VSCode TreeDataProvider implementation for task tree view
 * Requirements: 3.1.2 - TaskTreeViewProvider class structure with VSCode TreeDataProvider interface
 * Requirements: 3.2.6 - Implement "No Tasks" state handling
 * Task 3.2.3: Connect TaskTreeViewProvider to TasksDataService
 * Task 3.2.7: Add refresh mechanism infrastructure
 * Task 3.2.8: Connect refresh mechanism to TasksDataService events
 * Task 3.2.9: Add click-to-execute event emitter
 * Task 3.2.10: Implement accordion expansion behavior
 */

import * as vscode from "vscode";
import { TaskTreeItem } from "./TaskTreeItem";
import { Task, TaskStatus, TaskErrorResponse } from "../types";
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

/**
 * Task click event payload for UI synchronization and Cursor integration
 * Task 3.2.9: Click event data structure
 */
interface TaskClickEvent {
  taskId: string;
  task: Task;
  isExecutable: boolean; // For Cursor integration detection
}

export class TaskTreeViewProvider
  implements vscode.TreeDataProvider<TreeItemType>
{
  /**
   * Event emitter for tree data changes
   * Required by vscode.TreeDataProvider interface
   * Task 3.2.7: Enhanced refresh mechanism infrastructure
   */
  private readonly _onDidChangeTreeData: vscode.EventEmitter<
    TreeItemType | undefined | null
  >;
  public readonly onDidChangeTreeData: vscode.Event<
    TreeItemType | undefined | null
  >;

  /**
   * Event emitter for task click events
   * Task 3.2.9: Click-to-execute event emitter for UI synchronization
   */
  private readonly _onTaskClick: vscode.EventEmitter<TaskClickEvent>;
  public readonly onTaskClick: vscode.Event<TaskClickEvent>;

  /**
   * TasksDataService dependency for data retrieval
   * Task 3.2.3: Service integration for data access
   */
  private readonly tasksDataService: TasksDataService;

  /**
   * Flag to track if the provider is disposed
   * Task 3.2.7: Prevent refresh calls after disposal
   */
  private isDisposed: boolean = false;

  /**
   * Event listener disposables for proper cleanup
   * Task 3.2.8: Store disposables for event listener cleanup
   */
  private readonly eventDisposables: vscode.Disposable[] = [];

  /**
   * Track which task is currently expanded for accordion behavior
   * Task 3.2.10: Accordion expansion state management
   * Only one task can be expanded at a time
   */
  private expandedTaskId: string | null = null;

  constructor(tasksDataService: TasksDataService) {
    // Task 3.2.3: Store TasksDataService reference
    this.tasksDataService = tasksDataService;

    // Task 3.2.7: Initialize EventEmitter for refresh mechanism
    this._onDidChangeTreeData = new vscode.EventEmitter<
      TreeItemType | undefined | null
    >();
    this.onDidChangeTreeData = this._onDidChangeTreeData.event;

    // Task 3.2.9: Initialize EventEmitter for task click events
    this._onTaskClick = new vscode.EventEmitter<TaskClickEvent>();
    this.onTaskClick = this._onTaskClick.event;

    // Task 3.2.8: Setup event listeners for automatic refresh
    this.setupEventListeners();
  }

  /**
   * Setup event listeners for TasksDataService events
   * Task 3.2.8: Connect to service events for automatic refresh
   */
  private setupEventListeners(): void {
    try {
      // Connect to tasks updated event for automatic refresh
      const tasksUpdatedDisposable = this.tasksDataService.onTasksUpdated.event(
        this.handleTasksUpdated.bind(this)
      );
      this.eventDisposables.push(tasksUpdatedDisposable);

      // Connect to error events for graceful error handling
      const errorDisposable = this.tasksDataService.onError.event(
        this.handleServiceError.bind(this)
      );
      this.eventDisposables.push(errorDisposable);

      console.debug(
        "TaskTreeViewProvider: Event listeners connected successfully"
      );
    } catch (error) {
      // Handle event listener setup failures gracefully
      console.error(
        "TaskTreeViewProvider: Failed to setup event listeners:",
        error
      );
      // Continue without automatic refresh - manual refresh still works
    }
  }

  /**
   * Handle tasks updated event from TasksDataService
   * Task 3.2.8: Automatic refresh when data changes
   *
   * @param tasks Updated tasks array from service
   */
  private handleTasksUpdated(tasks: Task[]): void {
    try {
      if (this.isDisposed) {
        console.debug(
          "TaskTreeViewProvider: Ignoring tasks update on disposed provider"
        );
        return;
      }

      console.debug(
        "TaskTreeViewProvider: Tasks updated, triggering automatic refresh"
      );

      // Trigger automatic refresh to update the tree view
      this.refresh();
    } catch (error) {
      // Handle errors in event handler without breaking functionality
      console.error(
        "TaskTreeViewProvider: Error handling tasks update:",
        error
      );
    }
  }

  /**
   * Handle service error events from TasksDataService
   * Task 3.2.8: Graceful error handling without breaking tree view
   *
   * @param error TaskErrorResponse from service
   */
  private handleServiceError(error: TaskErrorResponse): void {
    try {
      if (this.isDisposed) {
        console.debug(
          "TaskTreeViewProvider: Ignoring error on disposed provider"
        );
        return;
      }

      console.warn("TaskTreeViewProvider: Service error received:", {
        operation: error.operation,
        taskId: error.taskId,
        suggestedAction: error.suggestedAction,
        userInstructions: error.userInstructions,
        technicalDetails: error.technicalDetails,
      });

      // Log error details for debugging
      if (error.technicalDetails) {
        console.debug(
          "TaskTreeViewProvider: Technical error details:",
          error.technicalDetails
        );
      }

      // Optionally show error indicator in UI (future enhancement)
      // For now, just log and continue - tree view remains functional with cached data
    } catch (error) {
      // Handle errors in error handler without breaking functionality
      console.error(
        "TaskTreeViewProvider: Error handling service error:",
        error
      );
    }
  }

  /**
   * Handle task click events from tree view selection
   * Task 3.2.9: Process tree item clicks and emit events for UI synchronization
   *
   * @param taskItem TaskTreeItem that was clicked
   */
  private handleTaskClick(taskItem: TaskTreeItem): void {
    try {
      if (this.isDisposed) {
        console.debug(
          "TaskTreeViewProvider: Ignoring task click on disposed provider"
        );
        return;
      }

      // Validate task item before processing
      if (!taskItem || !taskItem.task) {
        console.warn("TaskTreeViewProvider: Invalid task item clicked");
        return;
      }

      // Determine if task is executable (not_started status)
      const isExecutable =
        taskItem.task.status === TaskStatus.NOT_STARTED &&
        taskItem.task.isExecutable === true;

      // Create click event payload
      const clickEvent: TaskClickEvent = {
        taskId: taskItem.task.id,
        task: taskItem.task,
        isExecutable: isExecutable,
      };

      // Emit click event for UI synchronization and Cursor integration
      this._onTaskClick.fire(clickEvent);

      console.debug("TaskTreeViewProvider: Task click event emitted:", {
        taskId: clickEvent.taskId,
        isExecutable: clickEvent.isExecutable,
        status: clickEvent.task.status,
      });
    } catch (error) {
      // Handle errors in click handler without breaking functionality
      console.error("TaskTreeViewProvider: Error handling task click:", error);
    }
  }

  /**
   * Public method to trigger task click events programmatically
   * Task 3.2.9: External trigger for task selection and execution
   *
   * @param taskItem TaskTreeItem to trigger click for
   */
  public triggerTaskClick(taskItem: TaskTreeItem): void {
    try {
      if (this.isDisposed) {
        console.warn(
          "TaskTreeViewProvider: Cannot trigger task click on disposed provider"
        );
        return;
      }

      this.handleTaskClick(taskItem);
    } catch (error) {
      console.error(
        "TaskTreeViewProvider: Error triggering task click:",
        error
      );
    }
  }

  /**
   * Handle VSCode tree view selection events
   * Task 3.2.9: Integrate with VSCode tree view for automatic click detection
   *
   * @param selection Array of selected tree items
   */
  public handleTreeViewSelection(selection: readonly TreeItemType[]): void {
    try {
      if (this.isDisposed) {
        console.debug(
          "TaskTreeViewProvider: Ignoring selection on disposed provider"
        );
        return;
      }

      // Process only the first selected item (single selection)
      if (selection && selection.length > 0) {
        const selectedItem = selection[0];

        // Only process TaskTreeItem clicks, not EmptyStateTreeItem
        if (selectedItem instanceof TaskTreeItem) {
          this.handleTaskClick(selectedItem);
        }
      }
    } catch (error) {
      console.error(
        "TaskTreeViewProvider: Error handling tree view selection:",
        error
      );
    }
  }

  /**
   * Check if a task is executable (eligible for Cursor integration)
   * Task 3.2.9: Utility method for executable task detection
   *
   * @param task Task to check for executability
   * @returns True if task is executable, false otherwise
   */
  public isTaskExecutable(task: Task): boolean {
    try {
      return (
        task.status === TaskStatus.NOT_STARTED && task.isExecutable === true
      );
    } catch (error) {
      console.error(
        "TaskTreeViewProvider: Error checking task executability:",
        error
      );
      return false;
    }
  }

  /**
   * Expand a task node with accordion behavior
   * Task 3.2.10: Accordion expansion behavior - only one task expanded at a time
   * Expanding task A will automatically collapse currently expanded task B
   *
   * @param taskId ID of the task to expand
   */
  public expandNode(taskId: string): void {
    try {
      if (this.isDisposed) {
        console.debug(
          "TaskTreeViewProvider: Cannot expand node on disposed provider"
        );
        return;
      }

      // Validate taskId
      if (!taskId || typeof taskId !== "string") {
        console.warn(
          "TaskTreeViewProvider: Invalid taskId provided to expandNode:",
          taskId
        );
        return;
      }

      // If the same task is already expanded, do nothing
      if (this.expandedTaskId === taskId) {
        console.debug("TaskTreeViewProvider: Task already expanded:", taskId);
        return;
      }

      // Set the new expanded task (accordion behavior)
      this.setExpandedTask(taskId);

      // Trigger tree refresh to update visual state
      this.refresh();

      console.debug(
        "TaskTreeViewProvider: Task expanded with accordion behavior:",
        {
          expandedTaskId: taskId,
          previousExpandedTaskId: this.expandedTaskId,
        }
      );
    } catch (error) {
      console.error("TaskTreeViewProvider: Error expanding node:", error);
    }
  }

  /**
   * Collapse the currently expanded task node
   * Task 3.2.10: Accordion collapse behavior
   * Collapsing expanded task sets expandedTaskId to null
   *
   * @param taskId ID of the task to collapse (optional, defaults to currently expanded)
   */
  public collapseNode(taskId?: string): void {
    try {
      if (this.isDisposed) {
        console.debug(
          "TaskTreeViewProvider: Cannot collapse node on disposed provider"
        );
        return;
      }

      // If no taskId provided, collapse currently expanded task
      const targetTaskId = taskId || this.expandedTaskId;

      if (!targetTaskId) {
        console.debug("TaskTreeViewProvider: No task to collapse");
        return;
      }

      // Validate taskId
      if (typeof targetTaskId !== "string") {
        console.warn(
          "TaskTreeViewProvider: Invalid taskId provided to collapseNode:",
          targetTaskId
        );
        return;
      }

      // Only collapse if the task is actually expanded
      if (this.expandedTaskId === targetTaskId) {
        this.setExpandedTask(null);

        // Trigger tree refresh to update visual state
        this.refresh();

        console.debug("TaskTreeViewProvider: Task collapsed:", targetTaskId);
      } else {
        console.debug(
          "TaskTreeViewProvider: Task not expanded, cannot collapse:",
          targetTaskId
        );
      }
    } catch (error) {
      console.error("TaskTreeViewProvider: Error collapsing node:", error);
    }
  }

  /**
   * Set the expanded task state with accordion behavior
   * Task 3.2.10: Private helper method for state management
   * Ensures only one task can be expanded at a time
   *
   * @param taskId ID of the task to expand, or null to collapse all
   */
  private setExpandedTask(taskId: string | null): void {
    try {
      // Store the previous expanded task for logging
      const previousExpandedTaskId = this.expandedTaskId;

      // Set the new expanded task (accordion behavior)
      this.expandedTaskId = taskId;

      console.debug("TaskTreeViewProvider: Expansion state updated:", {
        previousExpandedTaskId,
        newExpandedTaskId: taskId,
        accordionBehavior: "Only one task expanded at a time",
      });
    } catch (error) {
      console.error(
        "TaskTreeViewProvider: Error setting expanded task:",
        error
      );
      // Reset to safe state on error
      this.expandedTaskId = null;
    }
  }

  /**
   * Get the currently expanded task ID
   * Task 3.2.10: Public accessor for expansion state
   *
   * @returns ID of currently expanded task, or null if none expanded
   */
  public getExpandedTaskId(): string | null {
    return this.expandedTaskId;
  }

  /**
   * Check if a specific task is currently expanded
   * Task 3.2.10: Utility method for expansion state checking
   *
   * @param taskId ID of the task to check
   * @returns True if the task is expanded, false otherwise
   */
  public isTaskExpanded(taskId: string): boolean {
    return this.expandedTaskId === taskId;
  }

  /**
   * Toggle task expansion state - expand if collapsed, collapse if expanded
   * Task 3.2.12: Connect Click Events to Expansion Logic
   * This method bridges selection events to existing accordion logic
   *
   * @param taskId ID of the task to toggle expansion for
   */
  public async toggleTaskExpansion(taskId: string): Promise<void> {
    try {
      // Debug logging to verify method execution
      console.log(
        `[TaskTreeView] toggleTaskExpansion called with taskId: ${taskId}`
      );

      const wasExpanded = this.expandedTaskId === taskId;
      console.log(
        `[TaskTreeView] Current expanded task: ${this.expandedTaskId}, was expanded: ${wasExpanded}`
      );

      if (this.isDisposed) {
        console.debug(
          "TaskTreeViewProvider: Cannot toggle expansion on disposed provider"
        );
        return;
      }

      // Validate taskId
      if (!taskId || typeof taskId !== "string") {
        console.warn(
          "TaskTreeViewProvider: Invalid taskId provided to toggleTaskExpansion:",
          taskId
        );
        return;
      }

      // Toggle expansion state using existing accordion logic
      if (this.expandedTaskId === taskId) {
        // Task is currently expanded, collapse it
        this.collapseNode(taskId);
      } else {
        // Task is currently collapsed, expand it (accordion behavior will handle the rest)
        this.expandNode(taskId);
      }

      console.log(`[TaskTreeView] New expanded task: ${this.expandedTaskId}`);

      console.debug("TaskTreeViewProvider: Task expansion toggled:", {
        taskId,
        newExpandedState: this.expandedTaskId === taskId,
        accordionBehavior: "Only one task expanded at a time",
      });
    } catch (error) {
      console.error(
        "TaskTreeViewProvider: Error toggling task expansion:",
        error
      );
    }
  }

  /**
   * Required by vscode.TreeDataProvider interface
   * Returns the TreeItem representation of the given element
   * Task 3.2.10: Enhanced to reflect accordion expansion state
   */
  getTreeItem(element: TreeItemType): vscode.TreeItem {
    try {
      // For TaskTreeItem elements, update collapsible state based on expansion state
      if (element instanceof TaskTreeItem) {
        // Check if this task should be expanded based on accordion state
        if (this.expandedTaskId === element.id) {
          // Task is expanded - set to expanded state
          element.collapsibleState = vscode.TreeItemCollapsibleState.Expanded;
        } else {
          // Task is collapsed - set to collapsed state
          element.collapsibleState = vscode.TreeItemCollapsibleState.Collapsed;
        }
      }

      // Return the element with updated collapsible state
      return element;
    } catch (error) {
      console.error("TaskTreeViewProvider: Error in getTreeItem:", error);
      // Return element as-is on error
      return element;
    }
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

      // Task 3.2.5: Apply status filtering and display logic
      // Filter tasks based on status and apply STATUS_DISPLAY_NAMES mapping
      const filteredTasks = this.filterTasksByStatus(tasks);

      // Convert filtered tasks to TaskTreeItems for display
      // Task 3.2.4: All tasks are top-level items in flat list structure
      const taskTreeItems = filteredTasks.map((task) => new TaskTreeItem(task));
      return taskTreeItems;
    } catch (error) {
      // Task 3.2.3: Handle service errors gracefully
      console.warn("Failed to retrieve tasks from TasksDataService:", error);
      return [this.createEmptyStateItem("error")];
    }
  }

  /**
   * Filter tasks based on status and apply STATUS_DISPLAY_NAMES mapping
   * Task 3.2.5: Status filtering and display logic
   *
   * @param tasks Array of tasks to filter
   * @returns Filtered tasks with enhanced display properties
   */
  private filterTasksByStatus(tasks: Task[]): Task[] {
    return tasks.map((task) => {
      // Apply STATUS_DISPLAY_NAMES mapping for consistent status display
      const enhancedTask = {
        ...task,
        statusDisplayName: this.getStatusDisplayName(task.status),
      };

      return enhancedTask;
    });
  }

  /**
   * Get status display name from STATUS_DISPLAY_NAMES mapping
   * Task 3.2.5: Consistent status badge display
   *
   * @param status TaskStatus enum value
   * @returns Formatted status display name
   */
  private getStatusDisplayName(status: TaskStatus): string {
    // Import STATUS_DISPLAY_NAMES from types
    const STATUS_DISPLAY_NAMES: Record<TaskStatus, string> = {
      [TaskStatus.NOT_STARTED]: "not started",
      [TaskStatus.IN_PROGRESS]: "in progress",
      [TaskStatus.REVIEW]: "review",
      [TaskStatus.COMPLETED]: "completed",
      [TaskStatus.BLOCKED]: "blocked",
      [TaskStatus.DEPRECATED]: "deprecated",
    };

    return STATUS_DISPLAY_NAMES[status] || status;
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
      label = "No tasks available";
      description = "Tasks will appear here when loaded";
      contextValue = "empty-state";
      iconPath = new vscode.ThemeIcon("info");
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
   * Task 3.2.7: Enhanced refresh mechanism with error handling
   */
  refresh(): void {
    try {
      // Prevent refresh if provider is disposed
      if (this.isDisposed) {
        console.warn("TaskTreeViewProvider: Cannot refresh disposed provider");
        return;
      }

      // Fire event with undefined to refresh entire tree
      // This triggers VSCode to call getChildren() and update the view
      this._onDidChangeTreeData.fire(undefined);

      // Log refresh event for debugging (can be removed in production)
      console.debug("TaskTreeViewProvider: Tree refresh triggered");
    } catch (error) {
      // Handle any errors during refresh without breaking functionality
      console.error("TaskTreeViewProvider: Error during refresh:", error);
    }
  }

  /**
   * Refresh specific task item (future enhancement)
   * Task 3.2.7: Infrastructure for targeted refresh
   *
   * @param taskItem Specific task item to refresh
   */
  refreshItem(taskItem: TaskTreeItem): void {
    try {
      if (this.isDisposed) {
        console.warn("TaskTreeViewProvider: Cannot refresh disposed provider");
        return;
      }

      // Fire event with specific item to refresh just that item
      this._onDidChangeTreeData.fire(taskItem);
      console.debug(
        "TaskTreeViewProvider: Item refresh triggered for:",
        taskItem.id
      );
    } catch (error) {
      console.error("TaskTreeViewProvider: Error during item refresh:", error);
    }
  }

  /**
   * Dispose method for cleanup
   * Should be called when the provider is no longer needed
   * Task 3.2.7: Enhanced disposal with state tracking
   */
  dispose(): void {
    try {
      this.isDisposed = true;
      this._onDidChangeTreeData.dispose();
      this._onTaskClick.dispose(); // Dispose the new event emitter
      this.eventDisposables.forEach((disposable) => disposable.dispose());
      console.debug("TaskTreeViewProvider: Disposed successfully");
    } catch (error) {
      console.error("TaskTreeViewProvider: Error during disposal:", error);
    }
  }
}
