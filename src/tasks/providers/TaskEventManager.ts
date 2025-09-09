/**
 * TaskEventManager - Handles all event subscriptions for TaskWebviewProvider
 * REF-033: Extracted from TaskWebviewProvider for better separation of concerns
 */

import * as vscode from "vscode";
import { Task, TaskErrorResponse } from "../../types/tasks";
import { TasksDataService } from "../../services";

/**
 * Callback interface for event handlers
 */
export interface EventCallbacks {
  onTasksUpdated: (tasks: Task[]) => void;
  onServiceError: (error: TaskErrorResponse) => void;
  onMessageReceived: (message: any) => Promise<void>;
}

/**
 * TaskEventManager - Manages all event subscriptions and disposables
 */
export class TaskEventManager {
  private readonly disposables: vscode.Disposable[] = [];
  
  constructor(
    private readonly tasksDataService: TasksDataService,
    private readonly callbacks: EventCallbacks
  ) {}

  /**
   * Setup all event handlers for data service events
   */
  public setupEventHandlers(): void {
    // Listen for task updates
    const tasksUpdatedDisposable = this.tasksDataService.onTasksUpdated.event(
      (tasks: Task[]) => this.callbacks.onTasksUpdated(tasks)
    );
    this.disposables.push(tasksUpdatedDisposable);

    // Listen for service errors  
    const errorDisposable = this.tasksDataService.onError.event(
      (error: TaskErrorResponse) => this.callbacks.onServiceError(error)
    );
    this.disposables.push(errorDisposable);
  }

  /**
   * Setup webview message handling
   */
  public setupMessageHandling(webview: vscode.Webview): void {
    const messageDisposable = webview.onDidReceiveMessage(
      async (message: any) => {
        await this.callbacks.onMessageReceived(message);
      }
    );
    this.disposables.push(messageDisposable);
  }

  /**
   * Add a disposable to be managed by this event manager
   */
  public addDisposable(disposable: vscode.Disposable): void {
    this.disposables.push(disposable);
  }

  /**
   * Get all disposables (for external management if needed)
   */
  public getDisposables(): readonly vscode.Disposable[] {
    return [...this.disposables];
  }

  /**
   * Clean up all disposables
   */
  public dispose(): void {
    while (this.disposables.length) {
      const disposable = this.disposables.pop();
      if (disposable) {
        disposable.dispose();
      }
    }
  }
}