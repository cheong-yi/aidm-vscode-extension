/**
 * TaskStreamService - Minimal SSE client for real-time task updates
 * Follows 2024/2025 best practices: Result types, separation of concerns, modern fetch API
 */

import { EventEmitter } from 'vscode';
import { Task, TaskErrorResponse } from '../types/tasks';

export interface TaskStreamEvent {
  type: 'task_assigned' | 'task_updated' | 'task_completed' | 'task_deleted';
  task: Task;
  timestamp: string;
  repository?: string;
}

export interface TaskStreamConfig {
  serverUrl: string;
  userId: string;
  authToken: string;
  reconnectInterval?: number;
}

export type TaskStreamResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

export interface TaskStreamStatus {
  connected: boolean;
  reconnecting: boolean;
  lastConnected?: Date;
  reconnectAttempts: number;
}

/**
 * Minimal SSE service for task streaming with modern patterns
 */
export class TaskStreamService {
  private controller?: AbortController;
  private reconnectTimer?: NodeJS.Timeout;
  private isConnected = false;
  private reconnectAttempts = 0;
  private readonly maxReconnectAttempts = 5;
  private lastConnected?: Date;

  // Events using VS Code EventEmitter
  public readonly onTaskEvent = new EventEmitter<TaskStreamEvent>();
  public readonly onConnectionStatusChanged = new EventEmitter<TaskStreamStatus>();
  public readonly onError = new EventEmitter<TaskErrorResponse>();

  constructor(private config: TaskStreamConfig) {}

  /**
   * Connect to task stream using modern fetch API
   */
  async connect(): Promise<TaskStreamResult<void>> {
    try {
      await this.disconnect(); // Clean up any existing connection

      this.controller = new AbortController();
      const streamUrl = this.buildStreamUrl();

      console.log(`[TaskStreamService] Connecting to: ${streamUrl}`);

      const response = await fetch(streamUrl, {
        method: 'GET',
        headers: {
          'Accept': 'text/event-stream',
          'Authorization': `Bearer ${this.config.authToken}`,
          'Cache-Control': 'no-cache',
        },
        signal: this.controller.signal,
      });

      if (!response.ok) {
        return {
          success: false,
          error: `HTTP ${response.status}: ${response.statusText}`,
        };
      }

      if (!response.body) {
        return {
          success: false,
          error: 'No response body received',
        };
      }

      this.isConnected = true;
      this.lastConnected = new Date();
      this.reconnectAttempts = 0;
      this.emitStatusUpdate();

      // Process the stream
      this.processStream(response.body);

      return { success: true, data: undefined };
    } catch (error) {
      this.isConnected = false;
      this.emitStatusUpdate();

      if (error instanceof DOMException && error.name === 'AbortError') {
        return { success: true, data: undefined }; // Intentional disconnect
      }

      const errorMessage = error instanceof Error ? error.message : String(error);
      this.handleConnectionError(errorMessage);

      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  /**
   * Disconnect from stream
   */
  async disconnect(): Promise<void> {
    console.log('[TaskStreamService] Disconnecting');

    this.controller?.abort();
    this.controller = undefined;

    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = undefined;
    }

    this.isConnected = false;
    this.emitStatusUpdate();
  }

  /**
   * Get current connection status
   */
  getStatus(): TaskStreamStatus {
    return {
      connected: this.isConnected,
      reconnecting: !!this.reconnectTimer,
      lastConnected: this.lastConnected,
      reconnectAttempts: this.reconnectAttempts,
    };
  }

  /**
   * Dispose and cleanup
   */
  dispose(): void {
    this.disconnect();
    this.onTaskEvent.dispose();
    this.onConnectionStatusChanged.dispose();
    this.onError.dispose();
  }

  private buildStreamUrl(): string {
    const url = new URL('/api/tasks/stream', this.config.serverUrl);
    url.searchParams.set('userId', this.config.userId);
    return url.toString();
  }

  private async processStream(body: ReadableStream<Uint8Array>): Promise<void> {
    const reader = body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    try {
      while (true) {
        const { done, value } = await reader.read();

        if (done) {
          console.log('[TaskStreamService] Stream ended');
          break;
        }

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || ''; // Keep incomplete line in buffer

        for (const line of lines) {
          this.processStreamLine(line);
        }
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        console.log('[TaskStreamService] Stream aborted');
        return;
      }

      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('[TaskStreamService] Stream processing error:', errorMessage);
      this.handleConnectionError(errorMessage);
    } finally {
      reader.releaseLock();
    }
  }

  private processStreamLine(line: string): void {
    if (!line.trim()) return;

    // Parse SSE format
    if (line.startsWith('data: ')) {
      try {
        const eventData = JSON.parse(line.substring(6));
        const taskEvent: TaskStreamEvent = {
          type: eventData.type,
          task: eventData.task,
          timestamp: eventData.timestamp || new Date().toISOString(),
          repository: eventData.repository,
        };

        console.log(`[TaskStreamService] Received event: ${taskEvent.type} for task ${taskEvent.task.id}`);
        this.onTaskEvent.fire(taskEvent);
      } catch (parseError) {
        console.warn('[TaskStreamService] Failed to parse event data:', line);
      }
    }
  }

  private handleConnectionError(errorMessage: string): void {
    console.error('[TaskStreamService] Connection error:', errorMessage);

    this.onError.fire({
      operation: 'stream_connection',
      userInstructions: `Task stream connection failed: ${errorMessage}`,
      technicalDetails: errorMessage,
    });

    // Schedule reconnection if within limits
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.scheduleReconnection();
    } else {
      console.error('[TaskStreamService] Max reconnection attempts reached');
    }
  }

  private scheduleReconnection(): void {
    if (this.reconnectTimer) return; // Already scheduled

    this.reconnectAttempts++;
    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts - 1), 30000); // Exponential backoff, max 30s

    console.log(`[TaskStreamService] Scheduling reconnection attempt ${this.reconnectAttempts} in ${delay}ms`);

    this.reconnectTimer = setTimeout(async () => {
      this.reconnectTimer = undefined;
      this.emitStatusUpdate();

      const result = await this.connect();
      if (!result.success) {
        console.warn(`[TaskStreamService] Reconnection attempt ${this.reconnectAttempts} failed:`, result.error);
      }
    }, delay);

    this.emitStatusUpdate();
  }

  private emitStatusUpdate(): void {
    this.onConnectionStatusChanged.fire(this.getStatus());
  }
}