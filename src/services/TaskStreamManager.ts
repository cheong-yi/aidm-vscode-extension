/**
 * TaskStreamManager - Integration layer between TaskStreamService and TasksDataService
 * Follows composition over inheritance to avoid god service pattern
 */

import * as vscode from 'vscode';
import { TaskStreamService, TaskStreamConfig, TaskStreamEvent } from './TaskStreamService';
import { TasksDataService } from './TasksDataService';
import { Task } from '../types/tasks';

export interface TaskStreamManagerConfig {
  enabled: boolean;
  serverUrl?: string;
  userId?: string;
  authToken?: string;
  reconnectInterval?: number;
}

/**
 * Manages integration between streaming and existing task data service
 * Keeps services separated and composed rather than creating a god service
 */
export class TaskStreamManager {
  private streamService?: TaskStreamService;
  private cachedTasks: Task[] = [];

  constructor(private tasksDataService: TasksDataService) {}

  /**
   * Initialize streaming if configured and enabled
   */
  async initialize(): Promise<void> {
    const config = this.getStreamConfig();

    if (!config.enabled) {
      console.log('[TaskStreamManager] Streaming disabled in configuration');
      return;
    }

    if (!this.validateConfig(config)) {
      console.warn('[TaskStreamManager] Invalid streaming configuration - streaming disabled');
      return;
    }

    try {
      await this.setupStreamService(config);
      console.log('[TaskStreamManager] Stream service initialized successfully');
    } catch (error) {
      console.error('[TaskStreamManager] Failed to initialize streaming:', error);
      // Don't throw - allow extension to continue with file-based loading
    }
  }

  /**
   * Get current streaming status
   */
  getStreamStatus(): { connected: boolean; configured: boolean } {
    return {
      connected: this.streamService?.getStatus().connected ?? false,
      configured: this.getStreamConfig().enabled,
    };
  }

  /**
   * Manually connect to stream
   */
  async connectToStream(): Promise<void> {
    if (!this.streamService) {
      throw new Error('Stream service not initialized. Check configuration.');
    }

    const result = await this.streamService.connect();
    if (!result.success) {
      throw new Error(`Failed to connect to stream: ${result.error}`);
    }
  }

  /**
   * Disconnect from stream
   */
  async disconnectFromStream(): Promise<void> {
    if (this.streamService) {
      await this.streamService.disconnect();
    }
  }

  /**
   * Cleanup resources
   */
  dispose(): void {
    this.streamService?.dispose();
  }

  private getStreamConfig(): TaskStreamManagerConfig {
    const config = vscode.workspace.getConfiguration('aidmVscodeExtension.taskStream');

    return {
      enabled: config.get<boolean>('enabled', false),
      serverUrl: config.get<string>('serverUrl', ''),
      userId: config.get<string>('userId', ''),
      authToken: config.get<string>('authToken', ''),
      reconnectInterval: config.get<number>('reconnectInterval', 30000),
    };
  }

  private validateConfig(config: TaskStreamManagerConfig): boolean {
    if (!config.serverUrl?.trim()) {
      console.warn('[TaskStreamManager] No server URL configured');
      return false;
    }

    if (!config.userId?.trim()) {
      console.warn('[TaskStreamManager] No user ID configured');
      return false;
    }

    if (!config.authToken?.trim()) {
      console.warn('[TaskStreamManager] No auth token configured');
      return false;
    }

    try {
      new URL(config.serverUrl);
    } catch (error) {
      console.warn('[TaskStreamManager] Invalid server URL:', config.serverUrl);
      return false;
    }

    return true;
  }

  private async setupStreamService(config: TaskStreamManagerConfig): Promise<void> {
    const streamConfig: TaskStreamConfig = {
      serverUrl: config.serverUrl!,
      userId: config.userId!,
      authToken: config.authToken!,
      reconnectInterval: config.reconnectInterval,
    };

    this.streamService = new TaskStreamService(streamConfig);

    // Set up event handlers
    this.streamService.onTaskEvent.event((event) => {
      this.handleTaskStreamEvent(event);
    });

    this.streamService.onError.event((error) => {
      // Forward stream errors to the main data service
      this.tasksDataService.onError.fire(error);
    });

    // Load initial tasks into cache
    try {
      this.cachedTasks = await this.tasksDataService.getTasks();
      console.log(`[TaskStreamManager] Cached ${this.cachedTasks.length} initial tasks`);
    } catch (error) {
      console.warn('[TaskStreamManager] Failed to load initial tasks for cache:', error);
      this.cachedTasks = [];
    }

    // Attempt initial connection
    const result = await this.streamService.connect();
    if (!result.success) {
      console.warn(`[TaskStreamManager] Initial connection failed: ${result.error}`);
      // Don't throw - this is acceptable for fallback scenarios
    }
  }

  private handleTaskStreamEvent(event: TaskStreamEvent): void {
    console.log(`[TaskStreamManager] Processing stream event: ${event.type} for task ${event.task.id}`);

    switch (event.type) {
      case 'task_assigned':
      case 'task_updated':
        this.updateTaskInCache(event.task);
        break;
      case 'task_completed':
        this.updateTaskInCache(event.task);
        break;
      case 'task_deleted':
        this.removeTaskFromCache(event.task.id);
        break;
      default:
        console.warn(`[TaskStreamManager] Unknown event type: ${event.type}`);
    }

    // Emit updated tasks to existing data service listeners
    this.tasksDataService.onTasksUpdated.fire([...this.cachedTasks]);
  }

  private updateTaskInCache(updatedTask: Task): void {
    const index = this.cachedTasks.findIndex(task => task.id === updatedTask.id);

    if (index >= 0) {
      // Update existing task
      this.cachedTasks[index] = updatedTask;
      console.log(`[TaskStreamManager] Updated task ${updatedTask.id} in cache`);
    } else {
      // Add new task
      this.cachedTasks.push(updatedTask);
      console.log(`[TaskStreamManager] Added new task ${updatedTask.id} to cache`);
    }
  }

  private removeTaskFromCache(taskId: string): void {
    const index = this.cachedTasks.findIndex(task => task.id === taskId);

    if (index >= 0) {
      this.cachedTasks.splice(index, 1);
      console.log(`[TaskStreamManager] Removed task ${taskId} from cache`);
    }
  }

  /**
   * Get cached tasks if streaming is active, otherwise delegate to data service
   */
  async getCachedTasks(): Promise<Task[]> {
    if (this.streamService?.getStatus().connected && this.cachedTasks.length > 0) {
      return [...this.cachedTasks]; // Return copy to prevent mutations
    }

    // Fall back to regular data service loading
    return this.tasksDataService.getTasks();
  }
}