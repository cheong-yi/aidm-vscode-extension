/**
 * TaskMessageHandler Class
 * Handles all webview message processing for TaskWebviewProvider
 * Extracted from TaskWebviewProvider to follow single responsibility principle
 */

import * as vscode from "vscode";
import {
  Task,
  TaskStatus,
  TaskErrorResponse,
} from "../../types/tasks";
import { TasksDataService } from "../../services";
import { GitUtilities } from "../../services";
import * as path from "path";

/**
 * Webview message interface for task interactions
 */
interface WebviewMessage {
  type:
    | "updateTaskStatus"
    | "executeWithCursor"
    | "toggleAccordion"
    | "viewCode"
    | "viewTests";
  taskId: string;
  newStatus?: TaskStatus;
  payload?: any;
}

/**
 * TaskMessageHandler manages all webview message processing
 * Single responsibility: Handle and route webview messages
 */
export class TaskMessageHandler {
  constructor(
    private tasksDataService: TasksDataService,
    private view: vscode.WebviewView,
    private onAccordionToggle: (taskId: string) => Promise<void>
  ) {}

  /**
   * Main message handler - processes all incoming webview messages
   */
  async handleMessage(message: any): Promise<void> {
    console.log("Received message from webview:", message);

    switch (message.type) {
      case "updateTaskStatus":
        await this.handleUpdateTaskStatus(message.taskId, message.newStatus);
        break;
      case "executeWithCursor":
        await this.handleExecuteWithCursor(message.taskId);
        break;
      case "toggleAccordion":
        await this.handleToggleAccordion(message.taskId);
        break;
      case "viewCode":
        await this.handleViewCode(message.taskId);
        break;
      case "viewTests":
        await this.handleViewTests(message.taskId);
        break;
      case "restoreState":
        // This message is sent TO the webview, so no handler needed here
        break;
      default:
        console.warn("Unknown message type:", message.type);
        break;
    }
  }

  /**
   * Handle message to update task status
   * Updates the status of a task in the extension's task list.
   */
  private async handleUpdateTaskStatus(
    taskId: string,
    newStatus?: TaskStatus
  ): Promise<void> {
    try {
      if (!newStatus) {
        console.warn("No new status provided for task status update");
        return;
      }

      await vscode.commands.executeCommand(
        "aidm-vscode-extension.updateTaskStatus",
        taskId,
        newStatus
      );

      console.log(`Task status updated: ${taskId} -> ${newStatus}`);
    } catch (error) {
      console.error("Error updating task status:", error);
    }
  }

  /**
   * Handle message to execute task with Cursor
   * Executes a task using the Cursor extension.
   */
  private async handleExecuteWithCursor(taskId: string): Promise<void> {
    try {
      await vscode.commands.executeCommand(
        "aidm-vscode-extension.executeTaskWithCursor",
        taskId
      );

      console.log(`Task executed with Cursor: ${taskId}`);
    } catch (error) {
      console.error("Error executing task with Cursor:", error);
    }
  }

  /**
   * Handle message to toggle accordion
   * Toggles the expanded state of a task's details section.
   */
  private async handleToggleAccordion(taskId: string): Promise<void> {
    try {
      // Delegate to the provider's accordion toggle handler
      await this.onAccordionToggle(taskId);
    } catch (error) {
      console.error("Error toggling task accordion:", error);
    }
  }

  /**
   * Handle View Code button clicks from webview
   * Opens git diff views for files changed in task.implementation.commitHash
   */
  private async handleViewCode(taskId: string): Promise<void> {
    try {
      const task = await this.tasksDataService.getTaskById(taskId);

      if (!task?.implementation?.commitHash) {
        await this.handleGitDiffError("NO_COMMIT_HASH", taskId);
        return;
      }

      const commitHash = task.implementation.commitHash;

      // Validate git diff operation with VS Code-specific checks
      const validation = await this.validateGitDiffOperation(
        taskId,
        commitHash
      );
      if (!validation.valid) {
        await this.handleGitDiffError(validation.error!, taskId, commitHash);
        return;
      }

      // Get changed files from git commit
      const changedFiles = await GitUtilities.getChangedFilesFromCommit(
        commitHash,
        vscode.workspace.workspaceFolders![0].uri.fsPath
      );

      if (changedFiles.length === 0) {
        await this.handleGitDiffError("NO_CHANGED_FILES", taskId, commitHash);
        return;
      }

      // Open diff views for each changed file
      let successfulDiffs = 0;
      for (const filePath of changedFiles) {
        try {
          await this.openDiffForFile(
            filePath,
            commitHash,
            vscode.workspace.workspaceFolders![0].uri
          );
          successfulDiffs++;
          console.debug(
            `[TaskMessageHandler] Opened diff for file: ${filePath}`
          );
        } catch (error) {
          console.error(
            `[TaskMessageHandler] Failed to open diff for file: ${filePath}`,
            error
          );
          // Individual file diff failures don't stop the entire operation
        }
      }

      if (successfulDiffs > 0) {
        await this.showGitDiffResults(taskId, successfulDiffs);
      } else {
        await this.handleGitDiffError("VSCODE_DIFF_FAILED", taskId, commitHash);
      }

      console.log(
        `[TaskMessageHandler] Opened diff views for ${successfulDiffs} files for task ${taskId}`
      );
    } catch (error) {
      console.error("[TaskMessageHandler] Error handling View Code:", error);
      await this.handleGitDiffError("VSCODE_DIFF_FAILED", taskId);
    }
  }

  /**
   * Handle View Tests button clicks from webview
   * Opens test files related to the task
   */
  private async handleViewTests(taskId: string): Promise<void> {
    try {
      await vscode.commands.executeCommand(
        "aidm-vscode-extension.viewTestsForTask",
        taskId
      );

      console.log(`Test files viewed for task: ${taskId}`);
    } catch (error) {
      console.error("Error viewing test files:", error);
    }
  }

  /**
   * Validate git diff operation with VS Code-specific checks
   */
  private async validateGitDiffOperation(
    taskId: string,
    commitHash: string
  ): Promise<{ valid: boolean; error?: string }> {
    try {
      // Check workspace availability
      if (
        !vscode.workspace.workspaceFolders ||
        vscode.workspace.workspaceFolders.length === 0
      ) {
        return { valid: false, error: "NO_WORKSPACE" };
      }

      const workspaceRoot = vscode.workspace.workspaceFolders[0];
      console.debug(
        `[TaskMessageHandler] Using workspace root: ${workspaceRoot.uri.fsPath}`
      );

      // Validate git repository
      if (!(await GitUtilities.isGitRepository(workspaceRoot.uri.fsPath))) {
        return { valid: false, error: "NOT_GIT_REPO" };
      }

      // Validate commit exists
      if (
        !(await GitUtilities.commitExists(commitHash, workspaceRoot.uri.fsPath))
      ) {
        return { valid: false, error: "INVALID_COMMIT" };
      }

      return { valid: true };
    } catch (error) {
      console.error(
        `[TaskMessageHandler] Error validating git diff operation for task ${taskId}:`,
        error
      );
      return { valid: false, error: "VALIDATION_ERROR" };
    }
  }

  /**
   * Handle git diff errors with user-friendly messages and action options
   */
  private async handleGitDiffError(
    error: string,
    taskId: string,
    commitHash?: string
  ): Promise<void> {
    const errorMessages: Record<string, string> = {
      NO_COMMIT_HASH: `Task ${taskId} does not have an associated commit hash. The task may not have been implemented yet.`,
      NO_WORKSPACE: `Cannot view code changes: No workspace folder is open. Please open a workspace folder and try again.`,
      NOT_GIT_REPO: `Cannot view code changes: The current workspace is not a git repository. Please initialize git or open a git repository.`,
      INVALID_COMMIT: `Cannot view code changes: Commit ${commitHash} does not exist in the repository. The commit may have been removed or the repository state has changed.`,
      NO_CHANGED_FILES: `No file changes found in commit ${commitHash} for task ${taskId}. The commit may be empty or contain only metadata changes.`,
      VALIDATION_ERROR: `Cannot validate git diff operation for task ${taskId}. Please check the git repository status and try again.`,
      VSCODE_DIFF_FAILED: `Failed to open diff views in VS Code for task ${taskId}. Please try again or check the git repository status.`,
    };

    const message = errorMessages[error] || `Unknown error occurred while viewing code for task ${taskId}`;
    
    const action = await vscode.window.showWarningMessage(
      message,
      "Retry",
      "View Logs",
      "Dismiss"
    );

    await this.handleGitDiffErrorAction(action, taskId, commitHash);
  }

  /**
   * Handle user actions for git diff errors
   */
  private async handleGitDiffErrorAction(
    action: string | undefined,
    taskId: string,
    commitHash?: string
  ): Promise<void> {
    switch (action) {
      case "Retry":
        if (commitHash) {
          await this.handleViewCode(taskId);
        }
        break;
      case "View Logs":
        await vscode.commands.executeCommand("workbench.action.toggleDevTools");
        break;
      case "Dismiss":
      default:
        // No action needed
        break;
    }
  }

  /**
   * Show successful git diff results to user
   */
  private async showGitDiffResults(
    taskId: string,
    fileCount: number
  ): Promise<void> {
    const message = `Opened diff views for ${fileCount} file${fileCount > 1 ? "s" : ""} from task ${taskId}`;
    await vscode.window.showInformationMessage(message);
  }

  /**
   * Open diff view for a specific file
   */
  private async openDiffForFile(
    filePath: string,
    commitHash: string,
    workspaceUri: vscode.Uri
  ): Promise<void> {
    const fullPath = path.resolve(workspaceUri.fsPath, filePath);
    const fileUri = vscode.Uri.file(fullPath);
    
    // Create git URI for the commit version
    const gitUri = vscode.Uri.parse(`git:${fullPath}?${commitHash}^`);
    
    // Open diff view
    await vscode.commands.executeCommand(
      "vscode.diff",
      gitUri,
      fileUri,
      `${path.basename(filePath)} (Task Changes)`
    );
  }
}