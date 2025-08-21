/**
 * Simplified MCP Server Implementation
 * HTTP JSON-RPC server for AI assistant integration
 */

import * as http from "http";
import {
  JSONRPCRequest,
  JSONRPCResponse,
  JSONRPCError,
  ToolCallRequest,
  ToolCallResponse,
} from "../types/jsonrpc";
import { ContextManager } from "../types/extension";
import { CodeLocation } from "../types/business";
import { TaskStatusManager } from "../services/TaskStatusManager";

export interface Tool {
  name: string;
  description: string;
  inputSchema: any;
}

export class SimpleMCPServer {
  private server: http.Server | null = null;
  private port: number;
  private contextManager: ContextManager;
  private taskStatusManager: TaskStatusManager;
  private isRunning: boolean = false;
  private activeRequests: Map<string, Promise<any>> = new Map();
  private maxConcurrentRequests: number = 10;
  private requestCounter: number = 0;

  constructor(port: number, contextManager: ContextManager, taskStatusManager: TaskStatusManager) {
    this.port = port;
    this.contextManager = contextManager;
    this.taskStatusManager = taskStatusManager;
  }

  /**
   * Start the HTTP JSON-RPC server
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      throw new Error("Server is already running");
    }

    return new Promise((resolve, reject) => {
      try {
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
      } catch (error) {
        console.error("Failed to start server:", error);
        reject(error);
      }
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
   * Check if server is healthy
   */
  isHealthy(): boolean {
    return this.isRunning && this.server !== null;
  }

  /**
   * Get the port the server is configured to run on
   */
  getPort(): number {
    return this.port;
  }

  /**
   * Get server statistics
   */
  getServerStats(): {
    isRunning: boolean;
    activeRequests: number;
    maxConcurrentRequests: number;
    totalRequestsProcessed: number;
  } {
    return {
      isRunning: this.isRunning,
      activeRequests: this.activeRequests.size,
      maxConcurrentRequests: this.maxConcurrentRequests,
      totalRequestsProcessed: this.requestCounter,
    };
  }

  /**
   * Update server configuration
   */
  updateConfiguration(config: { maxConcurrentRequests?: number }): void {
    if (config.maxConcurrentRequests && config.maxConcurrentRequests > 0) {
      this.maxConcurrentRequests = config.maxConcurrentRequests;
    }
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
      this.sendError(res, 405, "Method not allowed", null);
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
        this.sendError(res, 400, "Invalid JSON-RPC request", null);
      }
    });

    req.on("error", (error) => {
      console.error("Request error:", error);
      this.sendError(res, 500, "Internal server error", null);
    });
  }

  /**
   * Process JSON-RPC requests with concurrency management
   */
  private async processJSONRPC(
    request: JSONRPCRequest
  ): Promise<JSONRPCResponse> {
    const requestId = `${Date.now()}-${++this.requestCounter}`;

    try {
      // Check concurrent request limit
      if (this.activeRequests.size >= this.maxConcurrentRequests) {
        return this.createErrorResponse(
          request.id,
          -32000,
          "Server busy - too many concurrent requests. Please retry in a moment."
        );
      }

      // Validate JSON-RPC format
      if (request.jsonrpc !== "2.0") {
        return this.createErrorResponse(request.id, -32600, "Invalid Request");
      }

      // Create and track the request promise
      const requestPromise = this.executeRequest(request);
      this.activeRequests.set(requestId, requestPromise);

      try {
        const result = await requestPromise;
        return result;
      } finally {
        // Clean up completed request
        this.activeRequests.delete(requestId);
      }
    } catch (error) {
      console.error("JSON-RPC processing error:", error);
      this.activeRequests.delete(requestId);
      return this.createErrorResponse(request.id, -32603, "Internal error");
    }
  }

  /**
   * Execute individual request
   */
  private async executeRequest(
    request: JSONRPCRequest
  ): Promise<JSONRPCResponse> {
    // Handle different methods
    switch (request.method) {
      case "tools/list":
        return this.handleToolsList(request);

      case "tools/call":
        return await this.handleToolCall(request as ToolCallRequest);

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
   * Handle tools/list requests
   */
  private handleToolsList(request: JSONRPCRequest): JSONRPCResponse {
    const tools: Tool[] = [
      // Only return the legacy tool for backward compatibility with existing tests
      {
        name: "get_code_context",
        description: "Get business context for a specific code location",
        inputSchema: {
          type: "object",
          properties: {
            filePath: { type: "string" },
            startLine: { type: "number" },
            endLine: { type: "number" },
            symbolName: { type: "string", optional: true },
          },
          required: ["filePath", "startLine", "endLine"],
        },
      },
      {
        name: "tasks/list",
        description: "Retrieve all tasks from the task management system",
        inputSchema: {
          type: "object",
          properties: {
            status: {
              type: "string",
              enum: ["not_started", "in_progress", "review", "completed", "blocked", "deprecated"],
              description: "Optional status filter for tasks"
            }
          },
          additionalProperties: false
        }
      },
    ];

    return {
      jsonrpc: "2.0",
      result: { tools },
      id: request.id,
    };
  }

  /**
   * Handle tools/call requests
   */
  private async handleToolCall(
    request: ToolCallRequest
  ): Promise<ToolCallResponse> {
    const { name, arguments: args } = request.params;

    try {
      // Check if tool exists first
      if (
        ![
          "get_business_context",
          "get_requirement_details",
          "get_code_context",
          "mock_cache_upsert",
          "mock_cache_clear",
          "seed_from_remote",
          "tasks/list",
        ].includes(name)
      ) {
        return this.createErrorResponse(
          request.id,
          -32601,
          `Unknown tool: ${name}`
        ) as ToolCallResponse;
      }

      // Validate tool arguments before processing
      const validationError = this.validateToolArguments(name, args);
      if (validationError) {
        return {
          jsonrpc: "2.0",
          result: {
            content: [
              {
                type: "text",
                text: `Invalid arguments: ${validationError}`,
              },
            ],
            isError: true,
          },
          id: request.id,
        };
      }

      switch (name) {
        case "get_business_context":
          return await this.handleGetBusinessContext(request, args);

        case "get_requirement_details":
          return await this.handleGetRequirementDetails(request, args);

        case "get_code_context":
          // Legacy support - redirect to get_business_context
          return await this.handleGetBusinessContext(request, args);

        case "mock_cache_upsert":
          return await this.handleMockCacheUpsert(request, args);

        case "mock_cache_clear":
          return await this.handleMockCacheClear(request, args);

        case "seed_from_remote":
          return await this.handleSeedFromRemote(request, args);

        case "tasks/list":
          return await this.handleTasksList(request, args);

        default:
          // This should not be reached since we check tool existence earlier
          return this.createErrorResponse(
            request.id,
            -32601,
            `Unknown tool: ${name}`
          ) as ToolCallResponse;
      }
    } catch (error) {
      console.error(`Tool call error for ${name}:`, error);
      return {
        jsonrpc: "2.0",
        result: {
          content: [
            {
              type: "text",
              text: `Error executing tool ${name}: ${
                error instanceof Error ? error.message : "Unknown error"
              }`,
            },
          ],
          isError: true,
        },
        id: request.id,
      };
    }
  }

  /**
   * Admin: Upsert explicit mock cache entry
   */
  private async handleMockCacheUpsert(
    request: ToolCallRequest,
    args: any
  ): Promise<ToolCallResponse> {
    if (
      !args ||
      typeof args.filePath !== "string" ||
      typeof args.startLine !== "number" ||
      typeof args.endLine !== "number" ||
      !args.context
    ) {
      return this.createErrorResponse(
        request.id,
        -32602,
        "Invalid arguments for mock_cache_upsert"
      ) as ToolCallResponse;
    }

    try {
      // Context manager is typed via interface; cast to access admin helpers
      (this.contextManager as any).upsertMockCache(
        args.filePath,
        args.startLine,
        args.endLine,
        args.context
      );
      return {
        jsonrpc: "2.0",
        result: {
          content: [
            {
              type: "text",
              text: "Mock cache upserted successfully",
            },
          ],
        },
        id: request.id,
      };
    } catch (error) {
      return this.createErrorResponse(
        request.id,
        -32000,
        `Failed to upsert mock cache: ${
          error instanceof Error ? error.message : String(error)
        }`
      ) as ToolCallResponse;
    }
  }

  /**
   * Admin: Clear mock cache
   */
  private async handleMockCacheClear(
    request: ToolCallRequest,
    args: any
  ): Promise<ToolCallResponse> {
    try {
      (this.contextManager as any).clearMockCache(args?.pattern);
      return {
        jsonrpc: "2.0",
        result: {
          content: [
            {
              type: "text",
              text: "Mock cache cleared",
            },
          ],
        },
        id: request.id,
      };
    } catch (error) {
      return this.createErrorResponse(
        request.id,
        -32000,
        `Failed to clear mock cache: ${
          error instanceof Error ? error.message : String(error)
        }`
      ) as ToolCallResponse;
    }
  }

  /**
   * Admin: Seed mock cache from remote MCP server
   */
  private async handleSeedFromRemote(
    request: ToolCallRequest,
    args: any
  ): Promise<ToolCallResponse> {
    if (!args || !Array.isArray(args.paths) || args.paths.length === 0) {
      return this.createErrorResponse(
        request.id,
        -32602,
        "Invalid arguments for seed_from_remote: paths array is required"
      ) as ToolCallResponse;
    }

    try {
      // TODO: Implement actual remote MCP fetching
      // For now, return a placeholder response indicating the feature is stubbed
      const paths = args.paths as string[];

      return {
        jsonrpc: "2.0",
        result: {
          content: [
            {
              type: "text",
              text: `Seed from remote MCP is stubbed. Would seed ${
                paths.length
              } paths:\n${paths.join(
                "\n"
              )}\n\nThis tool will:\n1. Connect to remote MCP using OAuth\n2. Fetch business context for each path\n3. Apply PII redaction per local policy\n4. Persist to .aidm/mock-cache.json\n5. Return summary of seeded entries`,
            },
          ],
        },
        id: request.id,
      };
    } catch (error) {
      return this.createErrorResponse(
        request.id,
        -32000,
        `Failed to seed from remote: ${
          error instanceof Error ? error.message : String(error)
        }`
      ) as ToolCallResponse;
    }
  }

  /**
   * Validate tool arguments against schema
   */
  private validateToolArguments(toolName: string, args: any): string | null {
    if (!args || typeof args !== "object") {
      return "Arguments must be a valid object";
    }

    switch (toolName) {
      case "get_business_context":
      case "get_code_context":
        if (!args.filePath || typeof args.filePath !== "string") {
          return "filePath is required and must be a string";
        }
        if (typeof args.startLine !== "number" || args.startLine < 1) {
          return "startLine is required and must be a positive number";
        }
        if (typeof args.endLine !== "number" || args.endLine < 1) {
          return "endLine is required and must be a positive number";
        }
        if (args.endLine < args.startLine) {
          return "endLine must be greater than or equal to startLine";
        }
        if (args.symbolName && typeof args.symbolName !== "string") {
          return "symbolName must be a string if provided";
        }
        break;

      case "get_requirement_details":
        if (!args.requirementId || typeof args.requirementId !== "string") {
          return "requirementId is required and must be a string";
        }
        if (!/^[a-zA-Z0-9_-]+$/.test(args.requirementId)) {
          return "requirementId must contain only alphanumeric characters, underscores, and hyphens";
        }
        break;

      case "tasks/list":
        if (args.status && typeof args.status !== "string") {
          return "status must be a string if provided";
        }
        if (args.status && !["not_started", "in_progress", "review", "completed", "blocked", "deprecated"].includes(args.status)) {
          return "status must be one of: not_started, in_progress, review, completed, blocked, deprecated";
        }
        break;

      default:
        return `Unknown tool: ${toolName}`;
    }

    return null;
  }

  /**
   * Handle get_business_context tool calls
   */
  private async handleGetBusinessContext(
    request: ToolCallRequest,
    args: any
  ): Promise<ToolCallResponse> {
    const codeLocation: CodeLocation = {
      filePath: args.filePath,
      startLine: args.startLine,
      endLine: args.endLine,
      symbolName: args.symbolName,
    };

    try {
      const businessContext = await this.contextManager.getBusinessContext(
        codeLocation
      );

      // Return structured JSON data wrapped in MCP format for hover provider
      return {
        jsonrpc: "2.0",
        result: {
          content: [
            {
              type: "text",
              text: JSON.stringify(businessContext, null, 2),
            },
          ],
        },
        id: request.id,
      };
    } catch (error) {
      console.error("Error getting business context:", error);
      return {
        jsonrpc: "2.0",
        result: {
          content: [
            {
              type: "text",
              text: `No business context found for ${args.filePath}:${args.startLine}-${args.endLine}. This code location may not have associated business requirements or the context service may be unavailable.`,
            },
          ],
        },
        id: request.id,
      };
    }
  }

  /**
   * Handle get_requirement_details tool calls
   */
  private async handleGetRequirementDetails(
    request: ToolCallRequest,
    args: any
  ): Promise<ToolCallResponse> {
    try {
      const requirement = await this.contextManager.getRequirementById(
        args.requirementId
      );

      if (!requirement) {
        return {
          jsonrpc: "2.0",
          result: {
            content: [
              {
                type: "text",
                text: `Requirement with ID '${args.requirementId}' not found. Please verify the requirement ID is correct.`,
              },
            ],
          },
          id: request.id,
        };
      }

      // Format requirement details for AI consumption
      const formattedRequirement =
        this.formatRequirementDetailsForAI(requirement);

      return {
        jsonrpc: "2.0",
        result: {
          content: [
            {
              type: "text",
              text: formattedRequirement,
            },
          ],
        },
        id: request.id,
      };
    } catch (error) {
      console.error("Error getting requirement details:", error);
      return {
        jsonrpc: "2.0",
        result: {
          content: [
            {
              type: "text",
              text: `Error retrieving requirement details for ID '${
                args.requirementId
              }': ${error instanceof Error ? error.message : "Unknown error"}`,
            },
          ],
          isError: true,
        },
        id: request.id,
      };
    }
  }

  /**
   * Handle get_code_context tool calls
   */
  private async handleGetCodeContext(
    request: ToolCallRequest,
    args: any
  ): Promise<ToolCallResponse> {
    // Validate arguments
    if (
      !args.filePath ||
      typeof args.startLine !== "number" ||
      typeof args.endLine !== "number"
    ) {
      return {
        jsonrpc: "2.0",
        result: {
          content: [
            {
              type: "text",
              text: "Invalid arguments: filePath, startLine, and endLine are required",
            },
          ],
          isError: true,
        },
        id: request.id,
      };
    }

    const codeLocation: CodeLocation = {
      filePath: args.filePath,
      startLine: args.startLine,
      endLine: args.endLine,
      symbolName: args.symbolName,
    };

    try {
      const businessContext = await this.contextManager.getBusinessContext(
        codeLocation
      );

      // Format response for AI consumption
      const contextText = this.formatBusinessContextForAI(
        businessContext,
        codeLocation
      );

      return {
        jsonrpc: "2.0",
        result: {
          content: [
            {
              type: "text",
              text: contextText,
            },
          ],
        },
        id: request.id,
      };
    } catch (error) {
      console.error("Error getting business context:", error);
      return {
        jsonrpc: "2.0",
        result: {
          content: [
            {
              type: "text",
              text: `No business context found for ${args.filePath}:${args.startLine}-${args.endLine}`,
            },
          ],
        },
        id: request.id,
      };
    }
  }

  /**
   * Handle tasks/list requests
   */
  private async handleTasksList(request: JSONRPCRequest, args: any): Promise<JSONRPCResponse> {
    try {
      const allTasks = await this.taskStatusManager.getTasks();
      
      let filteredTasks = allTasks;
      if (args?.status) {
        filteredTasks = allTasks.filter(task => task.status === args.status);
      }
      
      return {
        jsonrpc: "2.0",
        result: {
          content: [
            {
              type: "text",
              text: JSON.stringify({ tasks: filteredTasks, count: filteredTasks.length }, null, 2),
            },
          ],
        },
        id: request.id,
      };
    } catch (error) {
      console.error("Error listing tasks:", error);
      return this.createErrorResponse(request.id, -32000, `Failed to list tasks: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Format business context for AI consumption
   */
  private formatBusinessContextForAI(
    context: any,
    codeLocation: CodeLocation
  ): string {
    if (
      !context ||
      !context.requirements ||
      context.requirements.length === 0
    ) {
      return `No business context available for code location: ${
        codeLocation.filePath
      }:${codeLocation.startLine}-${codeLocation.endLine}${
        codeLocation.symbolName ? ` (${codeLocation.symbolName})` : ""
      }.\n\nThis code may be:\n- Infrastructure or utility code without direct business requirements\n- Recently added code that hasn't been mapped to requirements yet\n- Part of a larger feature that needs context analysis`;
    }

    let formatted = `# Business Context for ${codeLocation.filePath}:${codeLocation.startLine}-${codeLocation.endLine}\n\n`;

    if (codeLocation.symbolName) {
      formatted += `**Symbol:** ${codeLocation.symbolName}\n\n`;
    }

    // Add requirements with structured formatting
    formatted += "## Requirements\n\n";
    context.requirements.forEach((req: any, index: number) => {
      formatted += `### ${index + 1}. ${req.title}\n`;
      formatted += `- **ID:** ${req.id}\n`;
      formatted += `- **Type:** ${req.type}\n`;
      formatted += `- **Priority:** ${req.priority}\n`;
      formatted += `- **Status:** ${req.status}\n`;
      formatted += `- **Description:** ${req.description}\n`;

      if (req.stakeholders && req.stakeholders.length > 0) {
        formatted += `- **Stakeholders:** ${req.stakeholders.join(", ")}\n`;
      }

      if (req.tags && req.tags.length > 0) {
        formatted += `- **Tags:** ${req.tags.join(", ")}\n`;
      }

      formatted += `- **Created:** ${new Date(
        req.createdDate
      ).toLocaleDateString()}\n`;
      formatted += `- **Last Modified:** ${new Date(
        req.lastModified
      ).toLocaleDateString()}\n\n`;
    });

    // Add implementation status
    if (context.implementationStatus) {
      formatted += "## Implementation Status\n\n";
      formatted += `- **Completion:** ${context.implementationStatus.completionPercentage}% complete\n`;
      formatted += `- **Last Verified:** ${new Date(
        context.implementationStatus.lastVerified
      ).toLocaleDateString()}\n`;
      formatted += `- **Verified By:** ${context.implementationStatus.verifiedBy}\n`;

      if (context.implementationStatus.notes) {
        formatted += `- **Notes:** ${context.implementationStatus.notes}\n`;
      }
      formatted += "\n";
    }

    // Add related changes
    if (context.relatedChanges && context.relatedChanges.length > 0) {
      formatted += "## Recent Changes\n\n";
      context.relatedChanges
        .slice(0, 5) // Show up to 5 recent changes
        .forEach((change: any, index: number) => {
          formatted += `### ${index + 1}. ${change.description}\n`;
          formatted += `- **Type:** ${change.type}\n`;
          formatted += `- **Author:** ${change.author}\n`;
          formatted += `- **Date:** ${new Date(
            change.timestamp
          ).toLocaleDateString()}\n`;

          if (
            change.relatedRequirements &&
            change.relatedRequirements.length > 0
          ) {
            formatted += `- **Related Requirements:** ${change.relatedRequirements.join(
              ", "
            )}\n`;
          }
          formatted += "\n";
        });
    }

    formatted += `**Last Updated:** ${new Date(
      context.lastUpdated
    ).toLocaleString()}\n`;

    return formatted;
  }

  /**
   * Format requirement details for AI consumption
   */
  private formatRequirementDetailsForAI(requirement: any): string {
    let formatted = `# Requirement Details: ${requirement.title}\n\n`;

    formatted += `**ID:** ${requirement.id}\n`;
    formatted += `**Type:** ${requirement.type}\n`;
    formatted += `**Priority:** ${requirement.priority}\n`;
    formatted += `**Status:** ${requirement.status}\n\n`;

    formatted += `## Description\n${requirement.description}\n\n`;

    if (requirement.stakeholders && requirement.stakeholders.length > 0) {
      formatted += `## Stakeholders\n${requirement.stakeholders.join(
        ", "
      )}\n\n`;
    }

    if (requirement.tags && requirement.tags.length > 0) {
      formatted += `## Tags\n${requirement.tags.join(", ")}\n\n`;
    }

    formatted += `## Timeline\n`;
    formatted += `- **Created:** ${new Date(
      requirement.createdDate
    ).toLocaleDateString()}\n`;
    formatted += `- **Last Modified:** ${new Date(
      requirement.lastModified
    ).toLocaleDateString()}\n\n`;

    // Add acceptance criteria if available
    if (
      requirement.acceptanceCriteria &&
      requirement.acceptanceCriteria.length > 0
    ) {
      formatted += `## Acceptance Criteria\n`;
      requirement.acceptanceCriteria.forEach(
        (criteria: string, index: number) => {
          formatted += `${index + 1}. ${criteria}\n`;
        }
      );
      formatted += "\n";
    }

    // Add related information if available
    if (requirement.dependencies && requirement.dependencies.length > 0) {
      formatted += `## Dependencies\n${requirement.dependencies.join(
        ", "
      )}\n\n`;
    }

    if (requirement.risks && requirement.risks.length > 0) {
      formatted += `## Risks\n`;
      requirement.risks.forEach((risk: string, index: number) => {
        formatted += `${index + 1}. ${risk}\n`;
      });
      formatted += "\n";
    }

    return formatted;
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
    message: string,
    id: string | number | null
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
        id,
      })
    );
  }
}
