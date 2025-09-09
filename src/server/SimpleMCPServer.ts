/**
 * Simplified MCP Server Implementation
 * Basic HTTP JSON-RPC server
 */

import * as http from "http";
import {
  JSONRPCRequest,
  JSONRPCResponse,
  ToolCallRequest,
  ToolCallResponse,
} from "../types/jsonrpc";

export interface Tool {
  name: string;
  description: string;
  inputSchema: any;
}

export class SimpleMCPServer {
  private server: http.Server | null = null;
  private port: number;
  private isRunning: boolean = false;

  constructor(port: number, contextManager?: any, jsonTaskParser?: any) {
    this.port = port;
    // Simplified server ignores contextManager and jsonTaskParser
  }


  /**
   * Start the HTTP JSON-RPC server
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      throw new Error("Server is already running");
    }

    return new Promise((resolve, reject) => {
      this.server = http.createServer((req, res) => {
        this.handleRequest(req, res);
      });

      this.server.listen(this.port, () => {
        this.isRunning = true;
        console.log(`MCP Server started on port ${this.port}`);
        resolve();
      });

      this.server.on("error", (error) => {
        console.error("Server error:", error);
        reject(error);
      });
    });
  }

  /**
   * Stop the HTTP server
   */
  async stop(): Promise<void> {
    if (!this.server || !this.isRunning) {
      return;
    }

    return new Promise((resolve) => {
      this.server!.close(() => {
        this.isRunning = false;
        this.server = null;
        console.log("MCP Server stopped");
        resolve();
      });
    });
  }

  /**
   * Get the port the server is configured to run on
   */
  getPort(): number {
    return this.port;
  }

  /**
   * Check if server is running
   */
  isHealthy(): boolean {
    return this.isRunning;
  }

  /**
   * Get server statistics (simplified version)
   */
  getServerStats(): {
    isRunning: boolean;
    activeRequests: number;
    maxConcurrentRequests: number;
    totalRequestsProcessed: number;
  } {
    return {
      isRunning: this.isRunning,
      activeRequests: 0,
      maxConcurrentRequests: 10,
      totalRequestsProcessed: 0,
    };
  }

  /**
   * Handle incoming HTTP requests
   */
  private async handleRequest(
    req: http.IncomingMessage,
    res: http.ServerResponse
  ): Promise<void> {
    // Set CORS headers
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");

    // Handle preflight requests
    if (req.method === "OPTIONS") {
      res.writeHead(200);
      res.end();
      return;
    }

    // Only accept POST requests
    if (req.method !== "POST") {
      this.sendError(res, 405, "Method not allowed");
      return;
    }

    // Parse request body
    let body = "";
    req.on("data", (chunk) => {
      body += chunk.toString();
    });

    req.on("end", async () => {
      try {
        const jsonRequest: JSONRPCRequest = JSON.parse(body);
        const response = await this.processJSONRPC(jsonRequest);
        this.sendResponse(res, response);
      } catch (error) {
        console.error("Request processing error:", error);
        this.sendError(res, 400, "Invalid JSON-RPC request");
      }
    });
  }

  /**
   * Process JSON-RPC requests
   */
  private async processJSONRPC(
    request: JSONRPCRequest
  ): Promise<JSONRPCResponse> {
    // Validate JSON-RPC format
    if (request.jsonrpc !== "2.0") {
      return this.createErrorResponse(request.id, -32600, "Invalid Request");
    }

    return this.executeRequest(request);
  }

  /**
   * Execute individual request
   */
  private async executeRequest(
    request: JSONRPCRequest
  ): Promise<JSONRPCResponse> {
    // Handle basic methods only
    switch (request.method) {
      case "ping":
        return {
          jsonrpc: "2.0",
          result: "pong",
          id: request.id,
        };

      default:
        return this.createErrorResponse(request.id, -32601, "Method not found");
    }
  }


  /**
   * Create JSON-RPC error response
   */
  private createErrorResponse(
    id: string | number,
    code: number,
    message: string
  ): JSONRPCResponse {
    return {
      jsonrpc: "2.0",
      error: {
        code,
        message,
      },
      id,
    };
  }

  /**
   * Send HTTP response
   */
  private sendResponse(
    res: http.ServerResponse,
    response: JSONRPCResponse
  ): void {
    res.setHeader("Content-Type", "application/json");
    res.writeHead(200);
    res.end(JSON.stringify(response));
  }

  /**
   * Send HTTP error response
   */
  private sendError(
    res: http.ServerResponse,
    statusCode: number,
    message: string
  ): void {
    res.setHeader("Content-Type", "application/json");
    res.writeHead(statusCode);
    res.end(
      JSON.stringify({
        jsonrpc: "2.0",
        error: {
          code: statusCode,
          message,
        },
        id: null,
      })
    );
  }
}
