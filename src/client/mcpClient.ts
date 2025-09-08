/**
 * HTTP JSON-RPC Client for MCP Server Communication
 */

import axios, { AxiosInstance, AxiosResponse } from "axios";
import * as vscode from "vscode";
import {
  JSONRPCRequest,
  JSONRPCResponse,
  ToolCallRequest,
  ToolCallResponse,
  MCPCommunication,
} from "../types/jsonrpc";
import { ErrorCode, ErrorResponse } from "../types/extension";
import { ErrorHandler, ErrorContext } from "../utils/errorHandler";

export class MCPClient {
  private httpClient: AxiosInstance;
  private config: MCPCommunication;
  private requestId: number = 1;
  private errorHandler: ErrorHandler;
  private remoteConfig?: {
    url: string;
    apiKey?: string;
    enabled: boolean;
  };

  constructor(port: number = 3001, timeout: number = 5000) {
    this.errorHandler = new ErrorHandler();
    this.config = {
      endpoint: `http://localhost:${port}/rpc`,
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      timeout,
    };

    this.httpClient = axios.create({
      baseURL: this.config.endpoint,
      timeout: this.config.timeout,
      headers: this.config.headers,
    });

    // Load remote configuration from VS Code settings
    this.loadRemoteConfig();
  }

  /**
   * Send a JSON-RPC request to the MCP server
   */
  private async sendRequest(request: JSONRPCRequest): Promise<JSONRPCResponse> {
    try {
      const response: AxiosResponse<JSONRPCResponse> =
        await this.httpClient.post("", request);

      if (response.data.error) {
        throw new Error(
          `MCP Server Error: ${response.data.error.message} (Code: ${response.data.error.code})`
        );
      }

      return response.data;
    } catch (error) {
      // If it's already an Error with our expected message format, re-throw it
      if (
        error instanceof Error &&
        error.message.includes("MCP Server Error:")
      ) {
        throw error;
      }

      if (axios.isAxiosError(error)) {
        if (error.code === "ECONNREFUSED") {
          throw this.createErrorResponse(
            ErrorCode.CONNECTION_FAILED,
            "MCP server is not running or not accessible",
            error
          );
        }
        if (error.code === "ECONNABORTED") {
          throw this.createErrorResponse(
            ErrorCode.TIMEOUT,
            "Request timed out",
            error
          );
        }
      }
      throw this.createErrorResponse(
        ErrorCode.INTERNAL_ERROR,
        "Failed to communicate with MCP server",
        error
      );
    }
  }

  /**
   * Call a tool on the MCP server
   */
  async callTool(toolName: string, args: Record<string, any>): Promise<any> {
    const request: ToolCallRequest = {
      jsonrpc: "2.0",
      method: "tools/call",
      params: {
        name: toolName,
        arguments: args,
      },
      id: this.requestId++,
    };

    const response = await this.sendRequest(request);
    return response.result;
  }

  /**
   * Get business context for a code location with error handling
   */
  async getBusinessContext(filePath: string, line: number): Promise<any> {
    // Log request details for debugging
    console.log("MCPClient - Requesting context for:", { filePath, line });

    const context: ErrorContext = {
      operation: "getBusinessContext",
      component: "MCPClient",
      requestId: this.generateRequestId(),
      metadata: { filePath, line },
    };

    console.log('[MCPClient] Business context requested:', context.metadata);

    return await this.errorHandler.executeWithErrorHandling(
      async () => {
        const response = await this.callTool("get_business_context", {
          filePath,
          startLine: line,
          endLine: line,
        });

        console.log(
          "MCPClient - Raw response:",
          JSON.stringify(response, null, 2)
        );

        // Validate response format
        if (typeof response === "string" && response.startsWith("Invalid")) {
          throw new Error(`Server error: ${response}`);
        }

        return response;
      },
      context,
      {
        enableRecovery: true,
        maxRetries: 2,
      }
    );
  }

  /**
   * Test server connectivity with audit logging
   */
  async ping(): Promise<boolean> {
    const context: ErrorContext = {
      operation: "ping",
      component: "MCPClient",
      requestId: this.generateRequestId(),
    };

    try {
      const request: JSONRPCRequest = {
        jsonrpc: "2.0",
        method: "ping",
        id: this.requestId++,
      };

      await this.sendRequest(request);

      console.log('[MCPClient] MCP server ping successful:', { endpoint: this.config.endpoint });

      return true;
    } catch (error) {
      console.error('[MCPClient] MCP server ping failed:', {
        error: error instanceof Error ? error.message : String(error),
        endpoint: this.config.endpoint
      });
      return false;
    }
  }

  /**
   * Load remote configuration from VS Code settings
   */
  private loadRemoteConfig(): void {
    // Use the extension namespace for settings
    const config = vscode.workspace.getConfiguration();
    this.remoteConfig = {
      url: config.get<string>("aidmVscodeExtension.remote.mcpServerUrl", ""),
      apiKey: config.get<string>("aidmVscodeExtension.remote.apiKey", ""),
      enabled: config.get<boolean>("aidmVscodeExtension.remote.enabled", false),
    };
  }

  /**
   * Update configuration
   */
  updateConfig(port: number, timeout: number): void {
    this.config.endpoint = `http://localhost:${port}/rpc`;
    this.config.timeout = timeout;

    // Reload remote config
    this.loadRemoteConfig();

    // Use remote endpoint if enabled and configured
    const endpoint = this.shouldUseRemote()
      ? this.remoteConfig!.url
      : this.config.endpoint;

    const headers: Record<string, string> = { ...this.config.headers };
    if (this.remoteConfig?.apiKey) {
      headers["Authorization"] = `Bearer ${this.remoteConfig.apiKey}`;
    }

    this.httpClient = axios.create({
      baseURL: endpoint,
      timeout: this.config.timeout,
      headers,
    });
  }

  /**
   * Check if we should use remote MCP server
   */
  private shouldUseRemote(): boolean {
    return !!(this.remoteConfig?.enabled && this.remoteConfig?.url);
  }

  /**
   * Set remote configuration
   */
  setRemoteConfig(url: string, apiKey?: string): void {
    this.remoteConfig = {
      url,
      apiKey,
      enabled: true,
    };

    // Update HTTP client to use remote endpoint
    const headers: Record<string, string> = { ...this.config.headers };
    if (apiKey) {
      headers["Authorization"] = `Bearer ${apiKey}`;
    }

    this.httpClient = axios.create({
      baseURL: url,
      timeout: this.config.timeout,
      headers,
    });
  }

  private createErrorResponse(
    code: ErrorCode,
    message: string,
    originalError?: any
  ): ErrorResponse {
    return {
      code,
      message,
      details: originalError?.message || originalError,
      timestamp: new Date(),
      requestId: this.requestId.toString(),
    };
  }

  /**
   * Generate unique request ID
   */
  private generateRequestId(): string {
    return `mcp_req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get client health status
   */
  getHealthStatus(): {
    isHealthy: boolean;
    endpoint: string;
    errorStats: any;
  } {
    return {
      isHealthy: true, // Would implement actual health check
      endpoint: this.config.endpoint,
      errorStats: this.errorHandler.getErrorStats(),
    };
  }

  /**
   * Get the current port number
   */
  getPort(): number {
    const match = this.config.endpoint.match(/:(\d+)/);
    return match ? parseInt(match[1], 10) : 3000;
  }

  /**
   * Shutdown client gracefully
   */
  async shutdown(): Promise<void> {
    try {
      // No audit logger to shutdown

      console.log('[MCPClient] Client shutdown');
    } catch (error) {
      console.error("Error during MCP client shutdown:", error);
    }
  }
}
