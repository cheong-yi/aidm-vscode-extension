/**
 * Local MCP Adapter
 * Adapter for current local SimpleMCPServer implementation
 */

import { BaseMCPClient, MCPClientInterface } from "./MCPInterface";
import { SimpleMCPServer } from "../server/SimpleMCPServer";
import { ContextManager } from "../server/ContextManager";
import { JSONTaskParser } from "../services/JSONTaskParser";
import { MockDataProvider } from "../mock/MockDataProvider";
import { ErrorCode } from "../types/extension";

/**
 * Local MCP adapter that wraps SimpleMCPServer for direct access
 * Provides MCP client interface for local server operations
 */
export class LocalMCPAdapter extends BaseMCPClient {
  private server: SimpleMCPServer;
  private contextManager: ContextManager;
  private jsonTaskParser: JSONTaskParser;
  private isServerOwned: boolean = false;

  constructor(
    port: number = 3001,
    timeout: number = 5000,
    contextManager?: ContextManager,
    jsonTaskParser?: JSONTaskParser
  ) {
    super(port, timeout);
    
    // If managers not provided, create minimal instances
    this.contextManager = contextManager || new ContextManager(new MockDataProvider());
    this.jsonTaskParser = jsonTaskParser || new JSONTaskParser();
    
    this.server = new SimpleMCPServer(
      this.port,
      this.contextManager,
      this.jsonTaskParser
    );
    
    // Mark as owned if we created the managers
    this.isServerOwned = !contextManager && !jsonTaskParser;
  }

  /**
   * Call a tool on the local MCP server
   */
  async callTool(toolName: string, args: Record<string, any>): Promise<any> {
    this.validateToolArgs(toolName, args);

    try {
      // Ensure server is running
      if (!this.server.isHealthy()) {
        await this.server.start();
      }

      // Create JSON-RPC request
      const request = {
        jsonrpc: "2.0" as const,
        method: "tools/call",
        params: {
          name: toolName,
          arguments: args
        },
        id: this.generateRequestId()
      };

      // Process request directly through server
      const response = await this.processServerRequest(request);
      
      if (response.error) {
        throw new Error(`Tool call failed: ${response.error.message}`);
      }

      return response.result;
    } catch (error) {
      console.error(`Local tool call failed for ${toolName}:`, error);
      throw this.createErrorResponse(
        ErrorCode.INTERNAL_ERROR,
        `Failed to call tool ${toolName}: ${(error as Error).message}`,
        error
      );
    }
  }

  /**
   * Get business context for a code location
   */
  async getBusinessContext(filePath: string, line: number): Promise<any> {
    return this.callTool("get_business_context", {
      filePath,
      startLine: line,
      endLine: line
    });
  }

  /**
   * Test server connectivity
   */
  async ping(): Promise<boolean> {
    try {
      // Check if server is healthy first
      if (!this.server.isHealthy()) {
        await this.server.start();
      }

      // Create ping request
      const request = {
        jsonrpc: "2.0" as const,
        method: "ping",
        params: {},
        id: this.generateRequestId()
      };

      const response = await this.processServerRequest(request);
      return response.result === "pong";
    } catch (error) {
      console.error("Local ping failed:", error);
      return false;
    }
  }

  /**
   * Update client configuration
   */
  updateConfig(port: number, timeout: number): void {
    if (port !== this.port) {
      // Stop current server if we own it
      if (this.isServerOwned && this.server.isHealthy()) {
        this.server.stop().catch(console.error);
      }
      
      // Update port and recreate server
      this.port = port;
      this.server = new SimpleMCPServer(
        this.port,
        this.contextManager,
        this.jsonTaskParser
      );
    }
    
    this.timeout = timeout;
  }

  /**
   * Get client health status
   */
  getHealthStatus() {
    const serverStats = this.server.getServerStats();
    
    return {
      isHealthy: this.server.isHealthy(),
      endpoint: `http://localhost:${this.port}`,
      errorStats: {
        serverRunning: serverStats.isRunning,
        activeRequests: serverStats.activeRequests,
        totalRequests: serverStats.totalRequestsProcessed
      }
    };
  }

  /**
   * Shutdown client gracefully
   */
  async shutdown(): Promise<void> {
    try {
      if (this.isServerOwned && this.server.isHealthy()) {
        await this.server.stop();
      }
    } catch (error) {
      console.error("Error during local adapter shutdown:", (error as Error).message);
    }
  }

  /**
   * Get the underlying server instance
   * For advanced operations that need direct server access
   */
  getServer(): SimpleMCPServer {
    return this.server;
  }

  /**
   * Start the underlying server explicitly
   */
  async startServer(): Promise<void> {
    if (!this.server.isHealthy()) {
      await this.server.start();
    }
  }

  /**
   * Stop the underlying server explicitly
   */
  async stopServer(): Promise<void> {
    if (this.server.isHealthy()) {
      await this.server.stop();
    }
  }

  /**
   * Process request directly through the server
   * Bypasses HTTP layer for better performance
   */
  private async processServerRequest(request: any): Promise<any> {
    try {
      // Use reflection to access the private processJSONRPC method
      // This is safe since we control both the adapter and server
      const serverAny = this.server as any;
      
      if (typeof serverAny.processJSONRPC === 'function') {
        return await serverAny.processJSONRPC(request);
      } else {
        throw new Error("Unable to access server's processJSONRPC method");
      }
    } catch (error) {
      // Fallback to creating a proper error response
      return {
        jsonrpc: "2.0",
        error: {
          code: -32603,
          message: `Internal error: ${(error as Error).message}`
        },
        id: request.id
      };
    }
  }
}