/**
 * Task File Watcher
 * Monitors tasks.md files for changes and provides real-time synchronization
 * Requirements: 4.1-4.7, 5.1-5.7
 */

import * as vscode from 'vscode';
import * as path from 'path';
import { EventEmitter } from 'events';
import { TasksDataService } from './TasksDataService';
import { ErrorHandler } from '../utils/ErrorHandler';
import { DegradedModeManager } from '../utils/DegradedModeManager';

export interface FileWatchConfig {
  enabled: boolean;
  debounceDelay: number;
  watchPatterns: string[];
  autoReload: boolean;
  notifyOnChanges: boolean;
}

export interface FileChangeEvent {
  type: 'created' | 'changed' | 'deleted';
  filePath: string;
  timestamp: Date;
  fileSize?: number;
  changeCount: number;
}

export interface WatchStatistics {
  totalWatchedFiles: number;
  totalChanges: number;
  lastChangeTime: Date | null;
  averageChangeFrequency: number;
  errors: number;
}

export class TaskFileWatcher extends EventEmitter {
  private config: FileWatchConfig;
  private tasksDataService: TasksDataService;
  private errorHandler: ErrorHandler;
  private degradedModeManager: DegradedModeManager;
  private fileWatchers: Map<string, vscode.FileSystemWatcher> = new Map();
  private changeCounters: Map<string, number> = new Map();
  private debounceTimers: Map<string, NodeJS.Timeout> = new Map();
  private isWatching: boolean = false;
  private watchStatistics: WatchStatistics = {
    totalWatchedFiles: 0,
    totalChanges: 0,
    lastChangeTime: null,
    averageChangeFrequency: 0,
    errors: 0
  };

  constructor(
    config: FileWatchConfig,
    tasksDataService: TasksDataService,
    errorHandler: ErrorHandler,
    degradedModeManager: DegradedModeManager
  ) {
    super();
    this.config = config;
    this.tasksDataService = tasksDataService;
    this.errorHandler = errorHandler;
    this.degradedModeManager = degradedModeManager;
  }

  /**
   * Start watching for file changes
   */
  async startWatching(workspaceFolders?: vscode.WorkspaceFolder[]): Promise<void> {
    if (this.isWatching) {
      return;
    }

    try {
      const folders = workspaceFolders || vscode.workspace.workspaceFolders || [];
      
      for (const folder of folders) {
        await this.watchWorkspaceFolder(folder);
      }

      this.isWatching = true;
      this.emit('watching_started', { timestamp: new Date() });
      
    } catch (error) {
      await this.errorHandler.handleError(
        error instanceof Error ? error : String(error),
        {
          operation: 'start_watching',
          component: 'TaskFileWatcher',
          metadata: { filePath }
        }
      );
      throw error;
    }
  }

  /**
   * Stop watching for file changes
   */
  async stopWatching(): Promise<void> {
    if (!this.isWatching) {
      return;
    }

    try {
      // Clear all watchers
      for (const [filePath, watcher] of this.fileWatchers.entries()) {
        watcher.dispose();
        this.clearDebounceTimer(filePath);
      }

      this.fileWatchers.clear();
      this.changeCounters.clear();
      this.isWatching = false;

      this.emit('watching_stopped', { timestamp: new Date() });
      
    } catch (error) {
      await this.errorHandler.handleError(
        error instanceof Error ? error : String(error),
        {
          operation: 'stop_watching',
          component: 'TaskFileWatcher'
        }
      );
    }
  }

  /**
   * Add a specific file to watch
   */
  async watchFile(filePath: string): Promise<void> {
    try {
      if (this.fileWatchers.has(filePath)) {
        return; // Already watching
      }

      const watcher = vscode.workspace.createFileSystemWatcher(
        new vscode.RelativePattern(path.dirname(filePath), path.basename(filePath))
      );

      this.setupFileWatcher(watcher, filePath);
      this.fileWatchers.set(filePath, watcher);
      this.changeCounters.set(filePath, 0);

      this.emit('file_watch_added', { filePath, timestamp: new Date() });
      
    } catch (error) {
      await this.errorHandler.handleError(
        error instanceof Error ? error : String(error),
        {
          operation: 'watch_file',
          component: 'TaskFileWatcher',
          metadata: { filePath }
        }
      );
    }
  }

  /**
   * Remove a specific file from watch
   */
  async unwatchFile(filePath: string): Promise<void> {
    try {
      const watcher = this.fileWatchers.get(filePath);
      if (watcher) {
        watcher.dispose();
        this.fileWatchers.delete(filePath);
        this.changeCounters.delete(filePath);
        this.clearDebounceTimer(filePath);

        this.emit('file_watch_removed', { filePath, timestamp: new Date() });
      }
      
    } catch (error) {
      await this.errorHandler.handleError(error, {
        operation: 'unwatch_file',
        component: 'task-file-watcher',
        metadata: { filePath }
      });
    }
  }

  /**
   * Get watch statistics
   */
  getWatchStatistics(): WatchStatistics {
    return { ...this.watchStatistics };
  }

  /**
   * Get list of watched files
   */
  getWatchedFiles(): string[] {
    return Array.from(this.fileWatchers.keys());
  }

  /**
   * Check if a file is being watched
   */
  isFileWatched(filePath: string): boolean {
    return this.fileWatchers.has(filePath);
  }

  /**
   * Refresh watching for all workspace folders
   */
  async refreshWatching(): Promise<void> {
    try {
      await this.stopWatching();
      await this.startWatching();
      
    } catch (error) {
      await this.errorHandler.handleError(error, {
        operation: 'refresh_watching',
        component: 'task-file-watcher'
      });
    }
  }

  /**
   * Watch a specific workspace folder
   */
  private async watchWorkspaceFolder(folder: vscode.WorkspaceFolder): Promise<void> {
    try {
      // Watch for tasks.md files
      const tasksPattern = new vscode.RelativePattern(folder, '**/tasks.md');
      const watcher = vscode.workspace.createFileSystemWatcher(tasksPattern);

      this.setupFileWatcher(watcher, folder.uri.fsPath);
      this.fileWatchers.set(folder.uri.fsPath, watcher);
      this.changeCounters.set(folder.uri.fsPath, 0);

      // Also watch for any existing tasks.md files
      const existingFiles = await vscode.workspace.findFiles(tasksPattern);
      for (const file of existingFiles) {
        await this.watchFile(file.fsPath);
      }
      
    } catch (error) {
      await this.errorHandler.handleError(error, {
        operation: 'watch_workspace_folder',
        component: 'task-file-watcher',
        metadata: { folder: folder.uri.fsPath }
      });
    }
  }

  /**
   * Setup file watcher with event handlers
   */
  private setupFileWatcher(watcher: vscode.FileSystemWatcher, basePath: string): void {
    // Handle file creation
    watcher.onDidCreate(async (uri) => {
      await this.handleFileChange(uri.fsPath, 'created', basePath);
    });

    // Handle file changes
    watcher.onDidChange(async (uri) => {
      await this.handleFileChange(uri.fsPath, 'changed', basePath);
    });

    // Handle file deletion
    watcher.onDidDelete(async (uri) => {
      await this.handleFileChange(uri.fsPath, 'deleted', basePath);
    });
  }

  /**
   * Handle file change events with debouncing
   */
  private async handleFileChange(filePath: string, changeType: 'created' | 'changed' | 'deleted', basePath: string): Promise<void> {
    try {
      // Update statistics
      this.updateWatchStatistics(changeType);

      // Increment change counter
      const currentCount = this.changeCounters.get(basePath) || 0;
      this.changeCounters.set(basePath, currentCount + 1);

      // Clear existing debounce timer
      this.clearDebounceTimer(basePath);

      // Set new debounce timer
      const timer = setTimeout(async () => {
        await this.processFileChange(filePath, changeType, basePath);
      }, this.config.debounceDelay);

      this.debounceTimers.set(basePath, timer);

      // Emit immediate change event
      this.emit('file_change_detected', {
        type: changeType,
        filePath,
        timestamp: new Date(),
        changeCount: currentCount + 1
      });

    } catch (error) {
      await this.errorHandler.handleError(error, {
        operation: 'handle_file_change',
        component: 'task-file-watcher',
        metadata: { filePath, changeType, basePath }
      });
    }
  }

  /**
   * Process file change after debouncing
   */
  private async processFileChange(filePath: string, changeType: 'created' | 'changed' | 'deleted', basePath: string): Promise<void> {
    try {
      const changeCount = this.changeCounters.get(basePath) || 0;
      const fileSize = changeType !== 'deleted' ? await this.getFileSize(filePath) : undefined;

      const changeEvent: FileChangeEvent = {
        type: changeType,
        filePath,
        timestamp: new Date(),
        fileSize,
        changeCount
      };

      // Emit processed change event
      this.emit('file_change_processed', changeEvent);

      // Handle different change types
      switch (changeType) {
        case 'created':
          await this.handleFileCreated(filePath);
          break;
        case 'changed':
          await this.handleFileChanged(filePath);
          break;
        case 'deleted':
          await this.handleFileDeleted(filePath);
          break;
      }

      // Reset change counter
      this.changeCounters.set(basePath, 0);

      // Notify if enabled
      if (this.config.notifyOnChanges) {
        this.showChangeNotification(changeEvent);
      }

    } catch (error) {
      await this.errorHandler.handleError(error, {
        operation: 'process_file_change',
        component: 'task-file-watcher',
        metadata: { filePath, changeType, basePath }
      });
    }
  }

  /**
   * Handle file creation
   */
  private async handleFileCreated(filePath: string): Promise<void> {
    try {
      // Add to watch list if it's a tasks.md file
      if (path.basename(filePath) === 'tasks.md') {
        await this.watchFile(filePath);
      }

      // Emit file created event
      this.emit('file_created', { filePath, timestamp: new Date() });
      
    } catch (error) {
      await this.errorHandler.handleError(error, {
        operation: 'handle_file_created',
        component: 'task-file-watcher',
        metadata: { filePath }
      });
    }
  }

  /**
   * Handle file changes
   */
  private async handleFileChanged(filePath: string): Promise<void> {
    try {
      // Check if this is a tasks.md file
      if (path.basename(filePath) === 'tasks.md') {
        // Reload tasks if auto-reload is enabled
        if (this.config.autoReload) {
          await this.tasksDataService.loadTasksFromFile(filePath);
        }

        // Emit tasks reloaded event
        this.emit('tasks_reloaded', { filePath, timestamp: new Date() });
      }

      // Emit file changed event
      this.emit('file_changed', { filePath, timestamp: new Date() });
      
    } catch (error) {
      await this.errorHandler.handleError(error, {
        operation: 'handle_file_changed',
        component: 'task-file-watcher',
        metadata: { filePath }
      });
    }
  }

  /**
   * Handle file deletion
   */
  private async handleFileDeleted(filePath: string): Promise<void> {
    try {
      // Remove from watch list
      await this.unwatchFile(filePath);

      // Emit file deleted event
      this.emit('file_deleted', { filePath, timestamp: new Date() });
      
    } catch (error) {
      await this.errorHandler.handleError(error, {
        operation: 'handle_file_deleted',
        component: 'task-file-watcher',
        metadata: { filePath }
      });
    }
  }

  /**
   * Get file size
   */
  private async getFileSize(filePath: string): Promise<number | undefined> {
    try {
      const stat = await vscode.workspace.fs.stat(vscode.Uri.file(filePath));
      return stat.size;
    } catch {
      return undefined;
    }
  }

  /**
   * Clear debounce timer for a file
   */
  private clearDebounceTimer(filePath: string): void {
    const timer = this.debounceTimers.get(filePath);
    if (timer) {
      clearTimeout(timer);
      this.debounceTimers.delete(filePath);
    }
  }

  /**
   * Update watch statistics
   */
  private updateWatchStatistics(changeType: 'created' | 'changed' | 'deleted'): void {
    this.watchStatistics.totalChanges++;
    this.watchStatistics.lastChangeTime = new Date();

    // Calculate average change frequency
    if (this.watchStatistics.totalChanges > 1 && this.watchStatistics.lastChangeTime) {
      const timeSpan = Date.now() - (this.watchStatistics.lastChangeTime.getTime() - this.config.debounceDelay);
      this.watchStatistics.averageChangeFrequency = timeSpan / this.watchStatistics.totalChanges;
    }
  }

  /**
   * Show change notification
   */
  private showChangeNotification(changeEvent: FileChangeEvent): void {
    try {
      const message = `Tasks file ${changeEvent.type}: ${path.basename(changeEvent.filePath)}`;
      
      if (changeEvent.type === 'changed') {
        vscode.window.showInformationMessage(message);
      } else if (changeEvent.type === 'created') {
        vscode.window.showInformationMessage(message);
      } else if (changeEvent.type === 'deleted') {
        vscode.window.showWarningMessage(message);
      }
      
    } catch (error) {
      console.warn('Failed to show change notification:', error);
    }
  }
}
