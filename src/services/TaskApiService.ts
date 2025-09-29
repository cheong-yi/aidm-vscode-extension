/**
 * TaskApiService - REST API client for task management with optional SSE streaming
 * Designed for public APIs, not localhost. SSE streaming is optional enhancement.
 */

import { EventEmitter } from 'vscode';
import { Task, TaskErrorResponse } from '../types/tasks';

export interface TaskApiConfig {
  baseUrl: string;        // e.g., "https://api.yourcompany.com"
  userId: string;         // User identifier for API calls
  authToken: string;      // Bearer token or API key
  enableStreaming?: boolean; // Optional SSE streaming
  pollInterval?: number;  // Fallback polling interval (default: 60s)
}

export type ApiResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

export interface TaskStreamEvent {
  type: 'task_assigned' | 'task_updated' | 'task_completed' | 'task_deleted';
  task: Task;
  timestamp: string;
}

/**
 * Primary service for task API communication
 * Uses REST API as primary method, SSE as optional enhancement
 */
export class TaskApiService {
  private controller?: AbortController;
  private pollTimer?: NodeJS.Timeout;
  private isStreamingEnabled = false;
  private lastFetch?: Date;

  // Events for integration with existing TasksDataService
  public readonly onTasksUpdated = new EventEmitter<Task[]>();
  public readonly onTaskEvent = new EventEmitter<TaskStreamEvent>();
  public readonly onError = new EventEmitter<TaskErrorResponse>();

  constructor(private config: TaskApiConfig) {
    this.isStreamingEnabled = config.enableStreaming ?? false;
  }

  /**
   * Primary method: Fetch tasks via REST API
   * This is the main way to get tasks from a public API
   */
  async fetchTasks(): Promise<ApiResult<Task[]>> {
    try {
      const url = `${this.config.baseUrl}/api/v1/tasks/user/${encodeURIComponent(this.config.userId)}`;

      console.log(`[TaskApiService] Fetching tasks from: ${url}`);

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.config.authToken}`,
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
        signal: AbortSignal.timeout(10000), // 10 second timeout
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Unknown error');
        return {
          success: false,
          error: `HTTP ${response.status}: ${response.statusText}. ${errorText}`,
        };
      }

      const data = await response.json();

      // Validate response structure
      if (!Array.isArray(data.tasks)) {
        return {
          success: false,
          error: 'Invalid response format: expected tasks array',
        };
      }

      this.lastFetch = new Date();
      console.log(`[TaskApiService] Successfully fetched ${data.tasks.length} tasks`);

      // Emit tasks updated event for existing integrations
      this.onTasksUpdated.fire(data.tasks);

      return { success: true, data: data.tasks };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('[TaskApiService] Failed to fetch tasks:', errorMessage);

      this.onError.fire({
        operation: 'api_fetch',
        userInstructions: `Failed to fetch tasks from API: ${errorMessage}`,
        technicalDetails: errorMessage,
      });

      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  /**
   * Update task status via REST API
   */
  async updateTaskStatus(taskId: string, status: string): Promise<ApiResult<boolean>> {
    try {
      const url = `${this.config.baseUrl}/api/v1/tasks/${encodeURIComponent(taskId)}/status`;

      const response = await fetch(url, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${this.config.authToken}`,
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status }),
        signal: AbortSignal.timeout(10000),
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Unknown error');
        return {
          success: false,
          error: `HTTP ${response.status}: ${response.statusText}. ${errorText}`,
        };
      }

      const data = await response.json();
      console.log(`[TaskApiService] Successfully updated task ${taskId} to status ${status}`);

      // Refresh tasks after status update
      setTimeout(() => this.fetchTasks(), 500);

      return { success: true, data: data.success || true };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`[TaskApiService] Failed to update task ${taskId}:`, errorMessage);

      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  /**
   * Start periodic polling for task updates
   * Used as fallback when SSE is not available or disabled
   */
  startPolling(): void {
    if (this.pollTimer) {
      this.stopPolling();
    }

    const interval = this.config.pollInterval || 60000; // Default 1 minute
    console.log(`[TaskApiService] Starting polling every ${interval}ms`);

    this.pollTimer = setInterval(async () => {
      const result = await this.fetchTasks();
      if (!result.success) {
        console.warn('[TaskApiService] Polling fetch failed:', result.error);
      }
    }, interval);
  }

  /**
   * Stop periodic polling
   */
  stopPolling(): void {
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = undefined;
      console.log('[TaskApiService] Stopped polling');
    }
  }

  /**
   * Optional: Connect to SSE stream for real-time updates
   * This is an enhancement, not the primary method
   */
  async connectToStream(): Promise<ApiResult<void>> {
    if (!this.isStreamingEnabled) {
      return {
        success: false,
        error: 'Streaming is disabled in configuration',
      };
    }

    try {
      await this.disconnect(); // Clean up any existing connection

      this.controller = new AbortController();
      const streamUrl = `${this.config.baseUrl}/api/v1/tasks/user/${encodeURIComponent(this.config.userId)}/stream`;

      console.log(`[TaskApiService] Connecting to stream: ${streamUrl}`);

      const response = await fetch(streamUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.config.authToken}`,
          'Accept': 'text/event-stream',
          'Cache-Control': 'no-cache',
        },
        signal: this.controller.signal,
      });

      if (!response.ok) {
        return {
          success: false,
          error: `SSE connection failed: HTTP ${response.status}`,
        };
      }

      if (!response.body) {
        return {
          success: false,
          error: 'No response body received from SSE endpoint',
        };
      }

      // Process the stream in background
      this.processStream(response.body);

      return { success: true, data: undefined };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('[TaskApiService] SSE connection failed:', errorMessage);

      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  /**
   * Disconnect from all services
   */
  async disconnect(): Promise<void> {
    console.log('[TaskApiService] Disconnecting');

    this.controller?.abort();
    this.controller = undefined;
    this.stopPolling();
  }

  /**
   * Test API connectivity
   */
  async testConnection(): Promise<ApiResult<{ status: string; latency: number }>> {
    const startTime = Date.now();

    try {
      const url = `${this.config.baseUrl}/api/v1/health`;

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.config.authToken}`,
          'Accept': 'application/json',
        },
        signal: AbortSignal.timeout(5000),
      });

      const latency = Date.now() - startTime;

      if (!response.ok) {
        // Try the tasks endpoint as fallback health check
        return this.fetchTasks().then(result => ({
          success: result.success,
          data: result.success
            ? { status: 'healthy', latency }
            : undefined,
          error: result.success ? undefined : result.error,
        })) as Promise<ApiResult<{ status: string; latency: number }>>;
      }

      return {
        success: true,
        data: { status: 'healthy', latency },
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  /**
   * Get service status
   */
  getStatus(): {
    lastFetch?: Date;
    polling: boolean;
    streaming: boolean;
    configured: boolean;
  } {
    return {
      lastFetch: this.lastFetch,
      polling: !!this.pollTimer,
      streaming: this.isStreamingEnabled && !!this.controller,
      configured: !!(this.config.baseUrl && this.config.userId && this.config.authToken),
    };
  }

  /**
   * Dispose resources
   */
  dispose(): void {
    this.disconnect();
    this.onTasksUpdated.dispose();
    this.onTaskEvent.dispose();
    this.onError.dispose();
  }

  private async processStream(body: ReadableStream<Uint8Array>): Promise<void> {
    const reader = body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    try {
      while (true) {
        const { done, value } = await reader.read();

        if (done) {
          console.log('[TaskApiService] SSE stream ended');
          break;
        }

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          this.processStreamLine(line);
        }
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        console.log('[TaskApiService] SSE stream aborted');
        return;
      }

      console.error('[TaskApiService] SSE stream error:', error);
    } finally {
      reader.releaseLock();
    }
  }

  private processStreamLine(line: string): void {
    if (!line.trim() || !line.startsWith('data: ')) return;

    try {
      const eventData = JSON.parse(line.substring(6));
      const taskEvent: TaskStreamEvent = {
        type: eventData.type,
        task: eventData.task,
        timestamp: eventData.timestamp || new Date().toISOString(),
      };

      console.log(`[TaskApiService] SSE event: ${taskEvent.type} for task ${taskEvent.task.id}`);
      this.onTaskEvent.fire(taskEvent);

      // Also trigger a fresh fetch to get complete updated task list
      setTimeout(() => this.fetchTasks(), 100);
    } catch (parseError) {
      console.warn('[TaskApiService] Failed to parse SSE event data:', line);
    }
  }
}