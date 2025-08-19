/**
 * MCP Server Process Manager
 * Handles spawning, lifecycle management, and error recovery for the MCP server process
 */

import * as vscode from "vscode";
import { spawn, ChildProcess } from "child_process";
import * as path from "path";
import { SimpleMCPServer } from "./SimpleMCPServer";
import { ContextManager } from "./ContextManager";
import { MockDataProvider } from "../mock/MockDataProvider";
import { MockCache } from "./MockCache";
import { ConnectionStatus, ErrorCode, ErrorResponse } from "../types/extension";

export interface ProcessManagerConfig {
  port: number;
  timeout: number;
  retryAttempts: number;
  maxConcurrentRequests: number;
  mock: {
    enabled: boolean;
    dataSize: "small" | "medium" | "large";
    enterprisePatterns: boolean;
  };
}

export interface ProcessStats {
  isRunning: boolean;
  pid?: number;
  uptime: number;
  restartCount: number;
  lastError?: string;
  memoryUsage?: NodeJS.MemoryUsage;
}

export class ProcessManager {
  private server: SimpleMCPServer | null = null;
  private serverProcess: ChildProcess | null = null;
  private config: ProcessManagerConfig;
  private isRunning: boolean = false;
  private startTime: number = 0;
  private restartCount: number = 0;
  private lastError: string | null = null;
  private restartTimer: NodeJS.Timeout | null = null;
  private healthCheckInterval: NodeJS.Timeout | null = null;
  private shutdownPromise: Promise<void> | null = null;
  private statusChangeListeners: ((status: ConnectionStatus) => void)[] = [];

  constructor(config: ProcessManagerConfig) {
    this.config = config;
  }

  /**
   * Start the MCP server process
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      console.log("MCP server is already running");
      return;
    }

    try {
      console.log("Starting MCP server process...");
      this.notifyStatusChange(ConnectionStatus.Connecting);

      // Initialize mock data provider
      const mockDataProvider = new MockDataProvider({
        dataSize: this.config.mock.dataSize,
        enterprisePatterns: this.config.mock.enterprisePatterns,
        responseDelay: 50, // Minimal delay for better performance
        errorRate: 0, // No errors in production mode
      });

      // Initialize mock cache persisted under workspace
      const workspaceRoot =
        vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || process.cwd();
      const mockCache = new MockCache(workspaceRoot);
      mockCache.load();

      // Initialize context manager with mock cache
      const contextManager = new ContextManager(mockDataProvider, mockCache);

      // Create server instance
      this.server = new SimpleMCPServer(this.config.port, contextManager);

      // Configure server
      this.server.updateConfiguration({
        maxConcurrentRequests: this.config.maxConcurrentRequests,
      });

      // Start the server
      await this.server.start();

      this.isRunning = true;
      this.startTime = Date.now();
      this.lastError = null;

      // Start health monitoring
      this.startHealthMonitoring();

      this.notifyStatusChange(ConnectionStatus.Connected);
      console.log(
        `MCP server started successfully on port ${this.config.port}`
      );
    } catch (error) {
      this.lastError = error instanceof Error ? error.message : "Unknown error";
      console.error("Failed to start MCP server:", this.lastError);
      this.notifyStatusChange(ConnectionStatus.Error);

      // Schedule restart if configured
      if (this.config.retryAttempts > this.restartCount) {
        this.scheduleRestart();
      }

      throw error;
    }
  }

  /**
   * Stop the MCP server process
   */
  async stop(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    console.log("Stopping MCP server process...");
    this.notifyStatusChange(ConnectionStatus.Disconnected);

    // Clear timers
    if (this.restartTimer) {
      clearTimeout(this.restartTimer);
      this.restartTimer = null;
    }

    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }

    try {
      // Stop the server gracefully
      if (this.server) {
        await this.server.stop();
        this.server = null;
      }

      // Persist mock cache on shutdown
      try {
        const workspaceRoot =
          vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || process.cwd();
        const cache = new MockCache(workspaceRoot);
        cache.load();
        cache.save();
      } catch (e) {
        // eslint-disable-next-line no-console
        console.error("Failed to persist mock cache on shutdown:", e);
      }

      // Kill process if it exists
      if (this.serverProcess && !this.serverProcess.killed) {
        this.serverProcess.kill("SIGTERM");

        // Force kill after timeout
        setTimeout(() => {
          if (this.serverProcess && !this.serverProcess.killed) {
            this.serverProcess.kill("SIGKILL");
          }
        }, 5000);
      }

      this.isRunning = false;
      this.serverProcess = null;
      console.log("MCP server stopped successfully");
    } catch (error) {
      console.error("Error stopping MCP server:", error);
      throw error;
    }
  }

  /**
   * Restart the MCP server process
   */
  async restart(): Promise<void> {
    console.log("Restarting MCP server...");

    try {
      await this.stop();
      await new Promise((resolve) => setTimeout(resolve, 1000)); // Brief pause
      await this.start();
      this.restartCount++;
      console.log(
        `MCP server restarted successfully (restart count: ${this.restartCount})`
      );
    } catch (error) {
      console.error("Failed to restart MCP server:", error);
      throw error;
    }
  }

  /**
   * Update configuration and restart if necessary
   */
  async updateConfig(newConfig: Partial<ProcessManagerConfig>): Promise<void> {
    const oldConfig = { ...this.config };
    this.config = { ...this.config, ...newConfig };

    // Check if restart is needed
    const needsRestart =
      oldConfig.port !== this.config.port ||
      oldConfig.maxConcurrentRequests !== this.config.maxConcurrentRequests ||
      JSON.stringify(oldConfig.mock) !== JSON.stringify(this.config.mock);

    if (needsRestart && this.isRunning) {
      console.log("Configuration changed, restarting server...");
      await this.restart();
    } else if (this.server) {
      // Update server configuration without restart
      this.server.updateConfiguration({
        maxConcurrentRequests: this.config.maxConcurrentRequests,
      });
    }
  }

  /**
   * Get current process statistics
   */
  getStats(): ProcessStats {
    return {
      isRunning: this.isRunning,
      pid: this.serverProcess?.pid,
      uptime: this.isRunning ? Date.now() - this.startTime : 0,
      restartCount: this.restartCount,
      lastError: this.lastError || undefined,
      memoryUsage: this.isRunning ? process.memoryUsage() : undefined,
    };
  }

  /**
   * Check if server is healthy
   */
  isHealthy(): boolean {
    return this.isRunning && this.server?.isHealthy() === true;
  }

  /**
   * Add status change listener
   */
  onStatusChange(listener: (status: ConnectionStatus) => void): void {
    this.statusChangeListeners.push(listener);
  }

  /**
   * Remove status change listener
   */
  removeStatusChangeListener(
    listener: (status: ConnectionStatus) => void
  ): void {
    const index = this.statusChangeListeners.indexOf(listener);
    if (index > -1) {
      this.statusChangeListeners.splice(index, 1);
    }
  }

  /**
   * Graceful shutdown with cleanup
   */
  async shutdown(): Promise<void> {
    if (this.shutdownPromise) {
      return this.shutdownPromise;
    }

    this.shutdownPromise = this.performShutdown();
    return this.shutdownPromise;
  }

  private async performShutdown(): Promise<void> {
    console.log("Performing graceful shutdown...");

    try {
      // Stop accepting new requests
      this.notifyStatusChange(ConnectionStatus.Disconnected);

      // Wait for active requests to complete (with timeout)
      if (this.server) {
        const stats = this.server.getServerStats();
        if (stats.activeRequests > 0) {
          console.log(
            `Waiting for ${stats.activeRequests} active requests to complete...`
          );

          // Wait up to 10 seconds for requests to complete
          const maxWait = 10000;
          const checkInterval = 100;
          let waited = 0;

          while (waited < maxWait) {
            const currentStats = this.server.getServerStats();
            if (currentStats.activeRequests === 0) {
              break;
            }
            await new Promise((resolve) => setTimeout(resolve, checkInterval));
            waited += checkInterval;
          }
        }
      }

      // Stop the server
      await this.stop();

      console.log("Graceful shutdown completed");
    } catch (error) {
      console.error("Error during graceful shutdown:", error);
      throw error;
    } finally {
      this.shutdownPromise = null;
    }
  }

  /**
   * Schedule automatic restart after failure
   */
  private scheduleRestart(): void {
    if (this.restartTimer) {
      return;
    }

    const delay = Math.min(1000 * Math.pow(2, this.restartCount), 30000); // Exponential backoff, max 30s
    console.log(
      `Scheduling restart in ${delay}ms (attempt ${this.restartCount + 1}/${
        this.config.retryAttempts
      })`
    );

    this.restartTimer = setTimeout(async () => {
      this.restartTimer = null;
      try {
        await this.start();
      } catch (error) {
        console.error("Restart attempt failed:", error);
        if (this.restartCount < this.config.retryAttempts) {
          this.scheduleRestart();
        }
      }
    }, delay);
  }

  /**
   * Start health monitoring
   */
  private startHealthMonitoring(): void {
    if (this.healthCheckInterval) {
      return;
    }

    this.healthCheckInterval = setInterval(() => {
      if (!this.isHealthy()) {
        console.warn("Health check failed, server appears unhealthy");
        this.handleServerFailure("Health check failed");
      }
    }, 30000); // Check every 30 seconds
  }

  /**
   * Handle server failure and recovery
   */
  private handleServerFailure(reason: string): void {
    console.error(`Server failure detected: ${reason}`);
    this.lastError = reason;
    this.isRunning = false;
    this.notifyStatusChange(ConnectionStatus.Error);

    // Attempt restart if within retry limits
    if (this.restartCount < this.config.retryAttempts) {
      this.scheduleRestart();
    } else {
      console.error(
        `Maximum restart attempts (${this.config.retryAttempts}) exceeded`
      );
      this.notifyStatusChange(ConnectionStatus.Disconnected);
    }
  }

  /**
   * Notify status change listeners
   */
  private notifyStatusChange(status: ConnectionStatus): void {
    this.statusChangeListeners.forEach((listener) => {
      try {
        listener(status);
      } catch (error) {
        console.error("Error in status change listener:", error);
      }
    });
  }
}
