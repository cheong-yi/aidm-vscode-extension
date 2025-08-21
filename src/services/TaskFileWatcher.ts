/**
 * TaskFileWatcher - File watching functionality using VSCode FileSystemWatcher
 * Recovery Task 2.3.4: Complete file change detection implementation
 * Requirements: 3.1-3.6, 4.1-4.4, 7.1-7.6
 */

import * as vscode from 'vscode';
import { Task } from '../types/tasks';

export class TaskFileWatcher {
  private fileWatcher?: vscode.FileSystemWatcher;
  private readonly _onFileChanged: vscode.EventEmitter<string> = new vscode.EventEmitter<string>();
  private readonly _onTasksChanged: vscode.EventEmitter<Task[]> = new vscode.EventEmitter<Task[]>();
  
  constructor(private filePath: string) {}
  
  async startWatching(): Promise<void> {
    if (this.fileWatcher) {
      return; // Already watching
    }
    
    this.fileWatcher = vscode.workspace.createFileSystemWatcher(this.filePath);
    this.fileWatcher.onDidChange(() => this.handleFileChange(this.filePath));
    this.fileWatcher.onDidCreate(() => this.handleFileChange(this.filePath));
    this.fileWatcher.onDidDelete(() => this.handleFileChange(this.filePath));
  }
  
  async stopWatching(): Promise<void> {
    if (this.fileWatcher) {
      this.fileWatcher.dispose();
      this.fileWatcher = undefined;
    }
  }
  
  private async handleFileChange(filePath: string): Promise<void> {
    this._onFileChanged.fire(filePath);
  }
  
  // Public event emitters for external access
  get onFileChanged() {
    return this._onFileChanged;
  }
  
  get onTasksChanged() {
    return this._onTasksChanged;
  }
  
  dispose(): void {
    this.stopWatching();
    this._onFileChanged.dispose();
    this._onTasksChanged.dispose();
  }
}
