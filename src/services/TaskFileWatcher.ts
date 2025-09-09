/**
 * TaskFileWatcher - Simplified file watching functionality
 */

import * as vscode from "vscode";
import * as path from "path";

export class TaskFileWatcher {
  private watcher: vscode.FileSystemWatcher | null = null;
  private refreshCallback: (() => void) | null = null;
  private debounceTimer: NodeJS.Timeout | null = null;
  private readonly DEBOUNCE_DELAY = 500;
  private readonly _onFileChanged: vscode.EventEmitter<string> = new vscode.EventEmitter<string>();

  constructor(private filePath: string) {}

  /**
   * Start watching the configured file for changes
   */
  startWatching(onFileChanged: () => void): void {
    if (this.watcher) return;

    this.refreshCallback = onFileChanged;

    if (!vscode.workspace.workspaceFolders?.length) {
      console.warn("No workspace folders found");
      return;
    }

    try {
      const workspaceRoot = vscode.workspace.workspaceFolders[0];
      const fileName = path.basename(this.filePath) || "tasks.json";
      const pattern = new vscode.RelativePattern(workspaceRoot, `**/${fileName}`);

      this.watcher = vscode.workspace.createFileSystemWatcher(pattern);
      this.watcher.onDidChange(() => this.handleFileChange());
      this.watcher.onDidCreate(() => this.handleFileChange());
      this.watcher.onDidDelete(() => this.handleFileChange());

      console.log(`Started watching ${fileName}`);
    } catch (error) {
      console.error("Failed to create file watcher:", error);
    }
  }

  /**
   * Handle file change events with debouncing
   */
  private handleFileChange(): void {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }

    this.debounceTimer = setTimeout(() => {
      console.log("File changed, refreshing");
      this._onFileChanged.fire(this.filePath);
      
      if (this.refreshCallback) {
        try {
          this.refreshCallback();
        } catch (error) {
          console.error("Error executing refresh callback:", error);
        }
      }
    }, this.DEBOUNCE_DELAY);
  }

  /**
   * Stop watching the file
   */
  stopWatching(): void {
    if (this.watcher) {
      this.watcher.dispose();
      this.watcher = null;
    }

    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }

    console.log("Stopped watching files");
  }

  get onFileChanged() {
    return this._onFileChanged;
  }

  /**
   * Clean up resources
   */
  dispose(): void {
    this.stopWatching();
    this._onFileChanged.dispose();
  }
}
