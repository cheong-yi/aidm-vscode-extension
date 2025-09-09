/**
 * Simple Process Manager for MCP Server
 * Direct server control with start/stop/getStatus methods only
 */

import { SimpleMCPServer } from "./SimpleMCPServer";
import { ContextManager } from "./ContextManager";
import { MockDataProvider } from "../mock/MockDataProvider";
import { JSONTaskParser } from "../services/JSONTaskParser";

export interface ProcessManagerConfig {
  port: number;
  timeout?: number; // Optional for backward compatibility
  retryAttempts?: number; // Optional for backward compatibility
  maxConcurrentRequests?: number; // Optional for backward compatibility
  mock?: {
    enabled: boolean;
    dataSize: "small" | "medium" | "large";
    enterprisePatterns: boolean;
  }; // Optional for backward compatibility
}

export interface ProcessStats {
  isRunning: boolean;
  pid?: number;
  uptime: number;
  lastError?: string;
  memoryUsage?: NodeJS.MemoryUsage;
}

export class ProcessManager {
  private server: SimpleMCPServer | null = null;
  private isRunning: boolean = false;
  private config: ProcessManagerConfig;

  constructor(config: ProcessManagerConfig) {
    this.config = config;
  }

  async start(): Promise<void> {
    if (this.isRunning) {
      throw new Error('Server already running');
    }

    try {
      // Initialize mock data provider
      const mockDataProvider = new MockDataProvider({
        responseDelay: 50,
        errorRate: 0,
      });

      // Initialize context manager
      const contextManager = new ContextManager(mockDataProvider);

      // Initialize JSON task parser
      const jsonTaskParser = new JSONTaskParser();

      // Create and start server
      this.server = new SimpleMCPServer(
        this.config.port,
        contextManager,
        jsonTaskParser
      );

      await this.server.start();
      this.isRunning = true;
      console.log(`MCP server started on port ${this.config.port}`);
    } catch (error) {
      console.error('Failed to start server:', error);
      throw error;
    }
  }

  async stop(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    try {
      if (this.server) {
        await this.server.stop();
        this.server = null;
      }
      this.isRunning = false;
      console.log('MCP server stopped');
    } catch (error) {
      console.error('Failed to stop server:', error);
      throw error;
    }
  }

  getStatus(): 'running' | 'stopped' {
    return this.isRunning ? 'running' : 'stopped';
  }

  getPort(): number {
    return this.config.port;
  }

  // Backward compatibility methods (simplified)
  getActualPort(): number {
    return this.config.port;
  }

  getTimeout(): number {
    return this.config.timeout || 30000;
  }

  async restart(): Promise<void> {
    await this.stop();
    await this.start();
  }

  async updateConfig(newConfig: Partial<ProcessManagerConfig>): Promise<void> {
    this.config = { ...this.config, ...newConfig };
  }

  updatePort(newPort: number): void {
    this.config.port = newPort;
  }

  async shutdown(): Promise<void> {
    await this.stop();
  }

  onStatusChange(listener: (status: any) => void): void {
    // Simplified - no status change notifications
  }

  getStats(): ProcessStats {
    return {
      isRunning: this.isRunning,
      uptime: 0,
    };
  }
}