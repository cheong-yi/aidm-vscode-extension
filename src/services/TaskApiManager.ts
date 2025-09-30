/**
 * TaskApiManager - Integration layer between TaskApiService and TasksDataService
 * Designed for public APIs with REST as primary method, SSE as optional enhancement
 */

import * as vscode from 'vscode';
// import { TaskApiService, TaskApiConfig } from './TaskApiService'; // REMOVED: TaskApiService deleted

// Stub types to prevent compilation errors in unused code
type TaskApiService = any;
type TaskApiConfig = any;
import { TasksDataService } from './TasksDataService';
import { Task } from '../types/tasks';

export interface TaskApiManagerConfig {
  enabled: boolean;
  baseUrl?: string;      // e.g., "https://api.yourcompany.com"
  userId?: string;       // User ID for API calls
  authToken?: string;    // Bearer token or API key
  enableStreaming?: boolean; // Optional SSE streaming
  pollInterval?: number; // Polling interval (default: 60s)
}

/**
 * Manages integration between REST API service and existing task data service
 * Prioritizes REST API calls over localhost connections
 */
export class TaskApiManager {
  private apiService?: TaskApiService;
  private cachedTasks: Task[] = [];
  private lastSuccessfulFetch?: Date;

  constructor(private tasksDataService: TasksDataService) {}

  /**
   * Initialize API service if configured and enabled
   */
  async initialize(): Promise<void> {
    const config = this.getApiConfig();

    if (!config.enabled) {
      console.log('[TaskApiManager] API integration disabled in configuration');
      return;
    }

    if (!this.validateConfig(config)) {
      console.warn('[TaskApiManager] Invalid API configuration - API integration disabled');
      return;
    }

    try {
      await this.setupApiService(config);
      console.log('[TaskApiManager] API service initialized successfully');
    } catch (error) {
      console.error('[TaskApiManager] Failed to initialize API service:', error);
      // Don't throw - allow extension to continue with file-based loading
    }
  }

  /**
   * Get current API status
   */
  getApiStatus(): {
    connected: boolean;
    configured: boolean;
    lastFetch?: Date;
    polling: boolean;
    streaming: boolean;
  } {
    const status = this.apiService?.getStatus();
    return {
      connected: status?.configured && !!this.lastSuccessfulFetch,
      configured: this.getApiConfig().enabled,
      lastFetch: status?.lastFetch || this.lastSuccessfulFetch,
      polling: status?.polling || false,
      streaming: status?.streaming || false,
    };
  }

  /**
   * Manually fetch tasks from API
   */
  async fetchTasks(): Promise<Task[]> {
    if (!this.apiService) {
      throw new Error('API service not initialized. Check configuration.');
    }

    const result = await this.apiService.fetchTasks();
    if (!result.success) {
      throw new Error(`Failed to fetch tasks from API: ${result.error}`);
    }

    this.cachedTasks = result.data;
    this.lastSuccessfulFetch = new Date();
    return result.data;
  }

  /**
   * Update task status via API
   */
  async updateTaskStatus(taskId: string, status: string): Promise<boolean> {
    if (!this.apiService) {
      throw new Error('API service not initialized. Check configuration.');
    }

    const result = await this.apiService.updateTaskStatus(taskId, status);
    if (!result.success) {
      throw new Error(`Failed to update task status: ${result.error}`);
    }

    return result.data;
  }

  /**
   * Start polling for task updates
   */
  async startPolling(): Promise<void> {
    if (!this.apiService) {
      throw new Error('API service not initialized. Check configuration.');
    }

    // Do an initial fetch
    try {
      await this.fetchTasks();
    } catch (error) {
      console.warn('[TaskApiManager] Initial fetch failed, continuing with polling:', error);
    }

    this.apiService.startPolling();
  }

  /**
   * Stop polling
   */
  stopPolling(): void {
    this.apiService?.stopPolling();
  }

  /**
   * Connect to SSE stream (optional enhancement)
   */
  async connectToStream(): Promise<void> {
    if (!this.apiService) {
      throw new Error('API service not initialized. Check configuration.');
    }

    const result = await this.apiService.connectToStream();
    if (!result.success) {
      throw new Error(`Failed to connect to stream: ${result.error}`);
    }
  }

  /**
   * Disconnect from all API services
   */
  async disconnect(): Promise<void> {
    if (this.apiService) {
      await this.apiService.disconnect();
    }
  }

  /**
   * Test API connectivity
   */
  async testConnection(): Promise<void> {
    if (!this.apiService) {
      throw new Error('API service not initialized. Check configuration.');
    }

    const result = await this.apiService.testConnection();
    if (!result.success) {
      throw new Error(`Connection test failed: ${result.error}`);
    }
  }

  /**
   * Cleanup resources
   */
  dispose(): void {
    this.apiService?.dispose();
  }

  private getApiConfig(): TaskApiManagerConfig {
    const config = vscode.workspace.getConfiguration('aidmVscodeExtension.taskApi');

    return {
      enabled: config.get<boolean>('enabled', false),
      baseUrl: config.get<string>('baseUrl', ''),
      userId: config.get<string>('userId', ''),
      authToken: config.get<string>('authToken', ''),
      enableStreaming: config.get<boolean>('enableStreaming', false),
      pollInterval: config.get<number>('pollInterval', 60000),
    };
  }

  private validateConfig(config: TaskApiManagerConfig): boolean {
    if (!config.baseUrl?.trim()) {
      console.warn('[TaskApiManager] No base URL configured');
      return false;
    }

    if (!config.userId?.trim()) {
      console.warn('[TaskApiManager] No user ID configured');
      return false;
    }

    if (!config.authToken?.trim()) {
      console.warn('[TaskApiManager] No auth token configured');
      return false;
    }

    try {
      new URL(config.baseUrl);
    } catch (error) {
      console.warn('[TaskApiManager] Invalid base URL:', config.baseUrl);
      return false;
    }

    // Ensure it's not localhost for production use
    const url = new URL(config.baseUrl);
    if (url.hostname === 'localhost' || url.hostname === '127.0.0.1') {
      console.warn('[TaskApiManager] Warning: Using localhost URL in distributed extension');
      // Don't fail validation, but warn user
    }

    return true;
  }

  private async setupApiService(config: TaskApiManagerConfig): Promise<void> {
    const apiConfig: TaskApiConfig = {
      baseUrl: config.baseUrl!,
      userId: config.userId!,
      authToken: config.authToken!,
      enableStreaming: config.enableStreaming,
      pollInterval: config.pollInterval,
    };

    // this.apiService = new TaskApiService(apiConfig); // REMOVED: TaskApiService deleted - stubbed for compilation

    // Set up event handlers to integrate with existing TasksDataService
    this.apiService.onTasksUpdated.event((tasks: any[]) => {
      this.handleTasksUpdated(tasks);
    });

    this.apiService.onError.event((error: any) => {
      // Forward API errors to the main data service
      this.tasksDataService.onError.fire(error);
    });

    // Load initial tasks
    try {
      const result = await this.apiService.fetchTasks();
      if (result.success) {
        this.cachedTasks = result.data;
        this.lastSuccessfulFetch = new Date();
        console.log(`[TaskApiManager] Loaded ${result.data.length} initial tasks from API`);
      } else {
        console.warn(`[TaskApiManager] Initial API fetch failed: ${result.error}`);
      }
    } catch (error) {
      console.warn('[TaskApiManager] Failed to load initial tasks from API:', error);
      this.cachedTasks = [];
    }

    // Start polling for updates
    this.apiService.startPolling();

    // Optionally connect to streaming if enabled
    if (config.enableStreaming) {
      try {
        const streamResult = await this.apiService.connectToStream();
        if (streamResult.success) {
          console.log('[TaskApiManager] SSE streaming connected successfully');
        } else {
          console.warn(`[TaskApiManager] SSE streaming failed: ${streamResult.error}`);
          // Continue with polling only
        }
      } catch (error) {
        console.warn('[TaskApiManager] SSE streaming setup failed:', error);
        // Continue with polling only
      }
    }
  }

  private handleTasksUpdated(tasks: Task[]): void {
    console.log(`[TaskApiManager] Received ${tasks.length} tasks from API`);

    // Update cache
    this.cachedTasks = tasks;
    this.lastSuccessfulFetch = new Date();

    // Emit updated tasks to existing data service listeners
    this.tasksDataService.onTasksUpdated.fire([...tasks]);
  }

  /**
   * Get cached tasks if API is active, otherwise delegate to data service
   */
  async getCachedTasks(): Promise<Task[]> {
    if (this.apiService && this.cachedTasks.length > 0 && this.lastSuccessfulFetch) {
      // Check if cache is recent (within last 5 minutes)
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
      if (this.lastSuccessfulFetch > fiveMinutesAgo) {
        return [...this.cachedTasks]; // Return copy to prevent mutations
      }
    }

    // Fall back to regular data service loading
    return this.tasksDataService.getTasks();
  }

  /**
   * Force refresh from API
   */
  async refreshFromApi(): Promise<Task[]> {
    if (!this.apiService) {
      throw new Error('API service not available');
    }

    return this.fetchTasks();
  }
}