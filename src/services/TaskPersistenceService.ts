/**
 * TaskPersistenceService - Handles saving/loading tasks to/from .aidm/.tasks
 * Single Responsibility: Task persistence to local filesystem
 * Task: PERSIST-001 (TDD Green Phase)
 */

import * as vscode from 'vscode';
import { Task } from '../types/tasks';

export class TaskPersistenceService {
  private readonly TASKS_DIR = '.aidm/.tasks';

  /**
   * Save tasks to .aidm/.tasks/{repo-name}.json
   * @param tasks - Array of tasks to save
   * @param workspaceFolder - VSCode workspace folder
   */
  async saveTasks(tasks: Task[], workspaceFolder: vscode.WorkspaceFolder): Promise<void> {
    if (!workspaceFolder) {
      console.warn('[TaskPersistenceService] No workspace folder provided');
      return;
    }

    try {
      const filePath = this.getTasksFilePath(workspaceFolder);
      const dirPath = vscode.Uri.joinPath(workspaceFolder.uri, this.TASKS_DIR);

      // Create directory if it doesn't exist
      try {
        await vscode.workspace.fs.createDirectory(dirPath);
      } catch (error) {
        // Directory might already exist, continue
      }

      // Save tasks as JSON
      const jsonContent = JSON.stringify(tasks, null, 2);
      await vscode.workspace.fs.writeFile(filePath, Buffer.from(jsonContent, 'utf8'));

      console.log(`[TaskPersistenceService] Saved ${tasks.length} tasks to ${filePath.fsPath}`);
    } catch (error) {
      console.error('[TaskPersistenceService] Failed to save tasks:', error);
      throw new Error(`Failed to save tasks: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Load tasks from .aidm/.tasks/{repo-name}.json
   * @param workspaceFolder - VSCode workspace folder
   * @returns Array of tasks, or empty array if file doesn't exist or is invalid
   */
  async loadTasks(workspaceFolder: vscode.WorkspaceFolder): Promise<Task[]> {
    if (!workspaceFolder) {
      console.warn('[TaskPersistenceService] No workspace folder provided');
      return [];
    }

    try {
      const filePath = this.getTasksFilePath(workspaceFolder);

      // Check if file exists
      try {
        await vscode.workspace.fs.stat(filePath);
      } catch {
        // File doesn't exist
        return [];
      }

      // Read and parse JSON
      const fileContent = await vscode.workspace.fs.readFile(filePath);
      const jsonString = Buffer.from(fileContent).toString('utf8');

      try {
        const tasks = JSON.parse(jsonString);

        if (!Array.isArray(tasks)) {
          console.warn('[TaskPersistenceService] Invalid tasks format - expected array');
          return [];
        }

        console.log(`[TaskPersistenceService] Loaded ${tasks.length} tasks from ${filePath.fsPath}`);
        return tasks;
      } catch (parseError) {
        console.error('[TaskPersistenceService] Failed to parse tasks JSON:', parseError);
        return [];
      }
    } catch (error) {
      console.error('[TaskPersistenceService] Failed to load tasks:', error);
      return [];
    }
  }

  /**
   * Get the file path for tasks based on workspace folder name
   * @param workspaceFolder - VSCode workspace folder
   * @returns URI for tasks file
   */
  getTasksFilePath(workspaceFolder: vscode.WorkspaceFolder): vscode.Uri {
    const repoName = this.sanitizeRepoName(workspaceFolder.name);
    const fileName = `${repoName}.json`;
    return vscode.Uri.joinPath(workspaceFolder.uri, this.TASKS_DIR, fileName);
  }

  /**
   * Sanitize repository name for use as filename
   * @param repoName - Repository name from workspace folder
   * @returns Sanitized name safe for filesystem
   */
  private sanitizeRepoName(repoName: string): string {
    // Replace special characters with hyphens
    return repoName.replace(/[^a-zA-Z0-9-_]/g, '-');
  }

  /**
   * Check if tasks file exists for given workspace
   * @param workspaceFolder - VSCode workspace folder
   * @returns true if tasks file exists
   */
  async tasksFileExists(workspaceFolder: vscode.WorkspaceFolder): Promise<boolean> {
    if (!workspaceFolder) {
      return false;
    }

    const filePath = this.getTasksFilePath(workspaceFolder);

    try {
      await vscode.workspace.fs.stat(filePath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Delete tasks file for given workspace
   * @param workspaceFolder - VSCode workspace folder
   */
  async deleteTasks(workspaceFolder: vscode.WorkspaceFolder): Promise<void> {
    if (!workspaceFolder) {
      return;
    }

    const filePath = this.getTasksFilePath(workspaceFolder);

    try {
      await vscode.workspace.fs.delete(filePath);
      console.log(`[TaskPersistenceService] Deleted tasks file: ${filePath.fsPath}`);
    } catch (error) {
      // File might not exist, which is fine
      console.debug('[TaskPersistenceService] Could not delete tasks file (might not exist):', error);
    }
  }
}
