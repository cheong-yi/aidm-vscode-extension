/**
 * TaskFileWatcher - File watching functionality using VSCode FileSystemWatcher
 * REFRESH-001: Implement file change detection and automatic UI refresh
 * Requirements: 3.1-3.6, 4.1-4.4, 7.1-7.6
 */

import * as vscode from "vscode";
import { Task } from "../types/tasks";

export class TaskFileWatcher {
  private watcher: vscode.FileSystemWatcher | null = null;
  private refreshCallback: (() => void) | null = null;
  private debounceTimer: NodeJS.Timeout | null = null;
  private readonly DEBOUNCE_DELAY = 500; // milliseconds
  private readonly _onFileChanged: vscode.EventEmitter<string> =
    new vscode.EventEmitter<string>();
  private readonly _onTasksChanged: vscode.EventEmitter<Task[]> =
    new vscode.EventEmitter<Task[]>();

  constructor(private filePath: string) {}

  /**
   * Start watching the tasks.md file for changes and trigger UI refresh
   * @param onFileChanged Callback function to execute when file changes
   */
  startWatching(onFileChanged: () => void): void {
    if (this.watcher) {
      return; // Already watching
    }

    this.refreshCallback = onFileChanged;

    try {
      // Create file system watcher for tasks.md using workspace relative pattern
      if (
        vscode.workspace.workspaceFolders &&
        vscode.workspace.workspaceFolders.length > 0
      ) {
        const workspaceRoot = vscode.workspace.workspaceFolders[0];
        const pattern = new vscode.RelativePattern(
          workspaceRoot,
          "**/tasks.md"
        );

        this.watcher = vscode.workspace.createFileSystemWatcher(pattern);

        // Handle file change events with debouncing
        this.watcher.onDidChange(() => this.handleFileChange());
        this.watcher.onDidCreate(() => this.handleFileChange());
        this.watcher.onDidDelete(() => this.handleFileChange());

        console.log(
          `✅ Started watching tasks.md files for changes in workspace: ${workspaceRoot.uri.fsPath}`
        );
      } else {
        console.warn(
          "⚠️ No workspace folders found, cannot create file watcher"
        );
      }
    } catch (error) {
      console.error("❌ Failed to create file watcher:", error);
      // Continue without file watching - extension will still function
    }
  }

  /**
   * Handle file change events with debouncing to prevent excessive refreshes
   */
  private handleFileChange(): void {
    // Debounce rapid file changes
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }

    this.debounceTimer = setTimeout(() => {
      console.log("🔄 tasks.md file changed, refreshing UI");

      // Fire event for external listeners
      this._onFileChanged.fire(this.filePath);

      // Execute refresh callback if provided
      if (this.refreshCallback) {
        try {
          this.refreshCallback();
        } catch (error) {
          console.error("❌ Error executing refresh callback:", error);
        }
      }
    }, this.DEBOUNCE_DELAY);
  }

  /**
   * Stop watching the file
   */
  async stopWatching(): Promise<void> {
    if (this.watcher) {
      this.watcher.dispose();
      this.watcher = null;
    }

    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }

    console.log("🛑 Stopped watching tasks.md files");
  }

  /**
   * Public event emitters for external access
   */
  get onFileChanged() {
    return this._onFileChanged;
  }

  get onTasksChanged() {
    return this._onTasksChanged;
  }

  /**
   * Clean up resources
   */
  dispose(): void {
    this.stopWatching();
    this._onFileChanged.dispose();
    this._onTasksChanged.dispose();
  }
}
