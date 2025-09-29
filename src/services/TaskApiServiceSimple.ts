/**
 * TaskApiServiceSimple - Simple integration service for task API
 * Single responsibility: Integrate API client with existing TasksDataService
 */

import { EventEmitter } from 'vscode';
import { TaskApiClient } from '../api/TaskApiClient';
import { TaskApiTokenProvider } from '../api/TaskApiTokenProvider';
import { Task, TaskErrorResponse } from '../types/tasks';

export interface TaskApiServiceConfig {
  baseUrl: string;
  pollInterval?: number; // Default: 60 seconds
}

export class TaskApiServiceSimple {
  private pollTimer?: NodeJS.Timeout;
  private cachedTasks: Task[] = [];
  private lastFetch?: Date;

  // Events for integration with TasksDataService
  public readonly onTasksUpdated = new EventEmitter<Task[]>();
  public readonly onError = new EventEmitter<TaskErrorResponse>();

  constructor(
    private config: TaskApiServiceConfig,
    private tokenProvider: TaskApiTokenProvider
  ) {}

  /**
   * Start polling for task updates
   */
  startPolling(): void {
    if (this.pollTimer) {
      this.stopPolling();
    }

    const interval = this.config.pollInterval || 60000; // Default 1 minute
    console.log(`[TaskApiServiceSimple] Starting polling every ${interval}ms`);

    // Immediate first fetch
    this.fetchTasks();

    this.pollTimer = setInterval(() => {
      this.fetchTasks();
    }, interval);
  }

  /**
   * Stop polling for updates
   */
  stopPolling(): void {
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = undefined;
      console.log('[TaskApiServiceSimple] Stopped polling');
    }
  }

  /**
   * Manually fetch tasks
   */
  async fetchTasks(): Promise<Task[]> {
    if (!this.tokenProvider.isAuthenticated()) {
      const error: TaskErrorResponse = {
        operation: 'api_fetch',
        userInstructions: 'Please log in to fetch tasks from the API',
        technicalDetails: 'User not authenticated',
      };
      this.onError.fire(error);
      throw new Error('User not authenticated');
    }

    const client = new TaskApiClient(this.config.baseUrl, this.tokenProvider);
    const result = await client.fetchUserTasks();

    if (!result.success) {
      const error: TaskErrorResponse = {
        operation: 'api_fetch',
        userInstructions: `Failed to fetch tasks: ${result.error}`,
        technicalDetails: result.error || 'Unknown error',
      };
      this.onError.fire(error);
      throw new Error(result.error || 'Failed to fetch tasks');
    }

    this.cachedTasks = result.data!;
    this.lastFetch = new Date();

    console.log(`[TaskApiServiceSimple] Fetched ${result.data!.length} tasks from API`);

    // Emit to existing integrations
    this.onTasksUpdated.fire([...result.data!]);

    return result.data!;
  }

  /**
   * Update task status
   */
  async updateTaskStatus(taskId: string, status: string): Promise<boolean> {
    if (!this.tokenProvider.isAuthenticated()) {
      throw new Error('User not authenticated');
    }

    const client = new TaskApiClient(this.config.baseUrl, this.tokenProvider);
    const result = await client.updateTaskStatus(taskId, status);

    if (!result.success) {
      const error: TaskErrorResponse = {
        operation: 'status_update',
        taskId,
        userInstructions: `Failed to update task status: ${result.error}`,
        technicalDetails: result.error || 'Unknown error',
        suggestedAction: 'retry',
      };
      this.onError.fire(error);
      throw new Error(result.error || 'Failed to update task status');
    }

    // Refresh tasks after update
    setTimeout(() => this.fetchTasks().catch(console.warn), 500);

    return true;
  }

  /**
   * Test API connection
   */
  async testConnection(): Promise<{ latency: number; user: string }> {
    if (!this.tokenProvider.isAuthenticated()) {
      throw new Error('User not authenticated');
    }

    const client = new TaskApiClient(this.config.baseUrl, this.tokenProvider);
    const result = await client.testConnection();

    if (!result.success) {
      throw new Error(result.error || 'Connection test failed');
    }

    return result.data!;
  }

  /**
   * Get cached tasks (for offline scenarios)
   */
  getCachedTasks(): Task[] {
    return [...this.cachedTasks];
  }

  /**
   * Get service status
   */
  getStatus(): {
    authenticated: boolean;
    polling: boolean;
    lastFetch?: Date;
    cachedTaskCount: number;
    user?: string;
  } {
    return {
      authenticated: this.tokenProvider.isAuthenticated(),
      polling: !!this.pollTimer,
      lastFetch: this.lastFetch,
      cachedTaskCount: this.cachedTasks.length,
      user: this.tokenProvider.getUserEmail() || undefined,
    };
  }

  /**
   * Dispose resources
   */
  dispose(): void {
    this.stopPolling();
    this.onTasksUpdated.dispose();
    this.onError.dispose();
  }
}