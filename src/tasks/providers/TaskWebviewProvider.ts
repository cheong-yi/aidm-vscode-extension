/**
 * TaskWebviewProvider - View Layer (Controller Pattern)
 * Delegates orchestration to TaskWebviewController for clean separation
 * REF-042: Extracted orchestration logic to controller pattern
 */

import * as vscode from "vscode";
import { TasksDataService } from "../../services";
import { TaskWebviewController } from "./TaskWebviewController";

/**
 * TaskWebviewProvider - Pure View Layer implementing vscode.WebviewViewProvider
 * Delegates all orchestration logic to TaskWebviewController
 */
export class TaskWebviewProvider implements vscode.WebviewViewProvider {
  private readonly controller: TaskWebviewController;
  
  constructor(
    private readonly tasksDataService: TasksDataService,
    private readonly context: vscode.ExtensionContext
  ) {
    // Initialize controller for orchestration
    this.controller = new TaskWebviewController(tasksDataService, context);
  }


  /**
   * VSCode WebviewViewProvider interface implementation
   * Delegates to controller for orchestration
   */
  public resolveWebviewView(
    webviewView: vscode.WebviewView,
    context: vscode.WebviewViewResolveContext,
    _token: vscode.CancellationToken
  ): void {
    // Delegate initialization to controller
    this.controller.initialize(webviewView);
  }

  /**
   * Refresh webview content (public API)
   * Delegates to controller
   */
  public async refreshContent(): Promise<void> {
    await this.controller.refreshContent();
  }

  /**
   * Handle task update events (public API)
   * Delegates to controller
   */
  public async handleTaskUpdate(taskId: string): Promise<void> {
    await this.controller.handleTaskUpdate(taskId);
  }

  /**
   * Backward compatibility method
   * Delegates to controller
   */
  public isDataInitialized(): boolean {
    return this.controller.isControllerInitialized();
  }

  /**
   * Clean up disposables
   * Delegates to controller
   */
  public dispose(): void {
    this.controller.dispose();
  }

  /**
   * Validate file path for security (preserved for tests)
   * @private
   */
  private validateFilePath(filePath: any): void {
    if (typeof filePath !== 'string' || !filePath.trim()) {
      throw new Error('File path is required and must be a string');
    }

    const cleanPath = filePath.trim();

    if (cleanPath.includes('..')) {
      throw new Error('File path cannot contain path traversal sequences (..)');
    }

    if (cleanPath.startsWith('/') || cleanPath.match(/^[a-zA-Z]:/)) {
      throw new Error('File path must be relative to workspace root');
    }

    if (cleanPath.startsWith('./') || cleanPath.startsWith('.\\')) {
      throw new Error('File path should not start with separator');
    }
  }
}