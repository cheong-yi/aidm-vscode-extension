/**
 * TaskApiClient - Simple HTTP client for task API
 * Single responsibility: HTTP calls to task endpoints
 */

import { Task } from '../types/tasks';
import { TaskApiTokenProvider } from './TaskApiTokenProvider';

export interface TaskApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export class TaskApiClient {
  constructor(
    private baseUrl: string,
    private tokenProvider: TaskApiTokenProvider
  ) {}

  /**
   * Fetch tasks for the authenticated user
   */
  async fetchUserTasks(): Promise<TaskApiResponse<Task[]>> {
    const userContext = this.tokenProvider.getUserContext();
    if (!userContext) {
      return {
        success: false,
        error: 'User not authenticated',
      };
    }

    try {
      const url = `${this.baseUrl}/API/v1/tasks/user/${encodeURIComponent(userContext.email)}`;

      const response = await fetch(url, {
        method: 'GET',
        headers: this.getHeaders(),
        signal: AbortSignal.timeout(10000),
      });

      if (response.status === 401) {
        return {
          success: false,
          error: 'Authentication expired. Please log in again.',
        };
      }

      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Unknown error');
        return {
          success: false,
          error: `HTTP ${response.status}: ${response.statusText}. ${errorText}`,
        };
      }

      const data = await response.json();

      if (!Array.isArray(data.tasks)) {
        return {
          success: false,
          error: 'Invalid response format: expected tasks array',
        };
      }

      return {
        success: true,
        data: data.tasks,
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
   * Update task status
   */
  async updateTaskStatus(taskId: string, status: string): Promise<TaskApiResponse<boolean>> {
    if (!this.tokenProvider.isAuthenticated()) {
      return {
        success: false,
        error: 'User not authenticated',
      };
    }

    try {
      const url = `${this.baseUrl}/API/v1/tasks/${encodeURIComponent(taskId)}/status`;

      const response = await fetch(url, {
        method: 'PUT',
        headers: this.getHeaders(),
        body: JSON.stringify({ status }),
        signal: AbortSignal.timeout(10000),
      });

      if (response.status === 401) {
        return {
          success: false,
          error: 'Authentication expired. Please log in again.',
        };
      }

      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Unknown error');
        return {
          success: false,
          error: `HTTP ${response.status}: ${response.statusText}. ${errorText}`,
        };
      }

      return {
        success: true,
        data: true,
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
   * Test API connectivity
   */
  async testConnection(): Promise<TaskApiResponse<{ latency: number; user: string }>> {
    const startTime = Date.now();

    if (!this.tokenProvider.isAuthenticated()) {
      return {
        success: false,
        error: 'User not authenticated',
      };
    }

    try {
      const url = `${this.baseUrl}/API/v1/health`;

      const response = await fetch(url, {
        method: 'GET',
        headers: this.getHeaders(),
        signal: AbortSignal.timeout(5000),
      });

      const latency = Date.now() - startTime;
      const userEmail = this.tokenProvider.getUserEmail()!;

      if (response.status === 401) {
        return {
          success: false,
          error: 'Authentication expired during connection test',
        };
      }

      if (!response.ok) {
        return {
          success: false,
          error: `HTTP ${response.status}: ${response.statusText}`,
        };
      }

      return {
        success: true,
        data: { latency, user: userEmail },
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  private getHeaders(): Record<string, string> {
    const token = this.tokenProvider.getToken();
    const userContext = this.tokenProvider.getUserContext();

    if (!token || !userContext) {
      throw new Error('Authentication required');
    }

    return {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      'X-Agency-ID': userContext.agencyId.toString(),
      'X-Project-ID': userContext.projectId.toString(),
      'X-User-Email': userContext.email,
    };
  }
}