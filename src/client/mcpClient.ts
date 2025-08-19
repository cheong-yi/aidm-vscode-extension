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

export class MCPClient {
  private httpClient: AxiosInstance;
  private config: MCPCommunication;
  private requestId: number = 1;

  constructor(port: number = 3000, timeout: number = 5000) {
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
   * Get business context for a code location
   */
  async getBusinessContext(filePath: string, line: number): Promise<any> {
    return this.callTool("get_business_context", {
      filePath,
      line,
    });
  }

  /**
   * Test server connectivity
   */
  async ping(): Promise<boolean> {
    try {
      const request: JSONRPCRequest = {
        jsonrpc: "2.0",
        method: "ping",
        id: this.requestId++,
      };

      await this.sendRequest(request);
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Update configuration
   */
  updateConfig(port: number, timeout: number): void {
    this.config.endpoint = `http://localhost:${port}/rpc`;
    this.config.timeout = timeout;

    this.httpClient = axios.create({
      baseURL: this.config.endpoint,
      timeout: this.config.timeout,
      headers: this.config.headers,
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
}
