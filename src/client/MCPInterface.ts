/**
 * MCP Interface Abstraction
 * Defines clean interface for future MCP implementations
 */

import { JSONRPCResponse, ErrorResponse, ErrorCode } from "../types/extension";

/**
 * Core MCP client interface
 * Provides abstraction for local and remote MCP implementations
 */
export interface MCPClientInterface {
  /**
   * Call a tool on the MCP server
   * @param toolName - Name of the tool to call
   * @param args - Arguments for the tool call
   * @returns Promise resolving to tool result
   */
  callTool(toolName: string, args: Record<string, any>): Promise<any>;

  /**
   * Get business context for a code location
   * @param filePath - Path to the file
   * @param line - Line number
   * @returns Promise resolving to business context
   */
  getBusinessContext(filePath: string, line: number): Promise<any>;

  /**
   * Test server connectivity
   * @returns Promise resolving to true if server is reachable
   */
  ping(): Promise<boolean>;

  /**
   * Update client configuration
   * @param port - Server port
   * @param timeout - Request timeout in milliseconds
   */
  updateConfig(port: number, timeout: number): void;

  /**
   * Get client health status
   * @returns Object containing health information
   */
  getHealthStatus(): {
    isHealthy: boolean;
    endpoint: string;
    errorStats?: any;
  };

  /**
   * Get the current port number
   * @returns Port number the client is configured for
   */
  getPort(): number;

  /**
   * Shutdown client gracefully
   * @returns Promise that resolves when shutdown is complete
   */
  shutdown(): Promise<void>;
}

/**
 * Configuration interface for MCP clients
 */
export interface MCPClientConfig {
  /** Server port */
  port: number;
  /** Request timeout in milliseconds */
  timeout: number;
  /** Server endpoint URL (for remote clients) */
  endpoint?: string;
  /** API key for authentication (for remote clients) */
  apiKey?: string;
  /** Enable remote mode */
  enabled?: boolean;
}

/**
 * MCP server interface
 * Defines contract for local and remote MCP server implementations
 */
export interface MCPServerInterface {
  /**
   * Start the MCP server
   * @returns Promise that resolves when server is started
   */
  start(): Promise<void>;

  /**
   * Stop the MCP server
   * @returns Promise that resolves when server is stopped
   */
  stop(): Promise<void>;

  /**
   * Check if server is healthy
   * @returns True if server is running and healthy
   */
  isHealthy(): boolean;

  /**
   * Get the port the server is running on
   * @returns Port number
   */
  getPort(): number;

  /**
   * Get server statistics
   * @returns Object containing server stats
   */
  getServerStats(): {
    isRunning: boolean;
    activeRequests: number;
    maxConcurrentRequests: number;
    totalRequestsProcessed: number;
  };

  /**
   * Update server configuration
   * @param config - Configuration options
   */
  updateConfiguration(config: { maxConcurrentRequests?: number }): void;
}

/**
 * Tool definition interface
 */
export interface MCPTool {
  /** Tool name */
  name: string;
  /** Tool description */
  description: string;
  /** JSON schema for input validation */
  inputSchema: any;
}

/**
 * Tool call result interface
 */
export interface MCPToolResult {
  /** Tool execution result */
  content: Array<{
    type: string;
    text: string;
  }>;
  /** Whether the result indicates an error */
  isError?: boolean;
}

/**
 * Abstract base class for MCP client implementations
 * Provides common functionality and enforces interface compliance
 */
export abstract class BaseMCPClient implements MCPClientInterface {
  protected port: number;
  protected timeout: number;
  protected requestId: number = 1;

  constructor(port: number = 3001, timeout: number = 5000) {
    this.port = port;
    this.timeout = timeout;
  }

  abstract callTool(toolName: string, args: Record<string, any>): Promise<any>;
  abstract getBusinessContext(filePath: string, line: number): Promise<any>;
  abstract ping(): Promise<boolean>;
  abstract updateConfig(port: number, timeout: number): void;
  abstract shutdown(): Promise<void>;

  getPort(): number {
    return this.port;
  }

  getHealthStatus(): {
    isHealthy: boolean;
    endpoint: string;
    errorStats?: any;
  } {
    return {
      isHealthy: true,
      endpoint: `http://localhost:${this.port}`,
    };
  }

  /**
   * Generate unique request ID
   */
  protected generateRequestId(): string {
    return `mcp_req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Validate tool arguments
   */
  protected validateToolArgs(toolName: string, args: any): void {
    if (!args || typeof args !== "object") {
      throw new Error("Arguments must be a valid object");
    }
  }

  /**
   * Create error response
   */
  protected createErrorResponse(
    code: ErrorCode,
    message: string,
    originalError?: any
  ): ErrorResponse {
    return {
      code,
      message,
      details: originalError?.message || originalError,
      timestamp: new Date(),
      requestId: this.generateRequestId(),
    };
  }
}

/**
 * Factory for creating MCP client instances
 */
export class MCPClientFactory {
  /**
   * Create a local MCP client
   * @param config - Client configuration
   * @returns Local MCP client instance
   */
  static createLocalClient(config: MCPClientConfig): MCPClientInterface {
    const { LocalMCPAdapter } = require("./LocalMCPAdapter");
    return new LocalMCPAdapter(config.port, config.timeout);
  }

  /**
   * Create a remote MCP client
   * @param config - Client configuration
   * @returns Remote MCP client instance
   */
  static createRemoteClient(config: MCPClientConfig): MCPClientInterface {
    const { RemoteMCPAdapter } = require("./RemoteMCPAdapter");
    
    if (!config.endpoint) {
      throw new Error("Remote endpoint is required for remote MCP client");
    }
    
    return new RemoteMCPAdapter(
      config.endpoint,
      config.port,
      config.timeout,
      config.apiKey
    );
  }

  /**
   * Create a hybrid MCP client (local + remote)
   * @param localConfig - Local client configuration
   * @param remoteConfig - Remote client configuration
   * @returns Hybrid MCP client instance
   */
  static createHybridClient(
    localConfig: MCPClientConfig,
    remoteConfig?: MCPClientConfig
  ): MCPClientInterface {
    // This could wrap existing HybridMCPClient or create new implementation
    throw new Error("Hybrid MCP adapter not yet implemented");
  }
}

/**
 * MCP connection status enumeration
 */
export enum MCPConnectionStatus {
  DISCONNECTED = "disconnected",
  CONNECTING = "connecting",
  CONNECTED = "connected",
  ERROR = "error",
}

/**
 * MCP connection info interface
 */
export interface MCPConnectionInfo {
  status: MCPConnectionStatus;
  endpoint: string;
  lastConnected?: Date;
  errorMessage?: string;
  latency?: number;
}