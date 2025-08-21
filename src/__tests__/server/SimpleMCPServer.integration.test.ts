/**
 * Integration Tests for SimpleMCPServer
 * Tests HTTP JSON-RPC communication and tool call handling
 */

import { SimpleMCPServer } from "../../server/SimpleMCPServer";
import { ContextManager } from "../../server/ContextManager";
import { MockDataProvider } from "../../mock/MockDataProvider";
import { TaskStatusManager } from "../../services/TaskStatusManager";
import { MarkdownTaskParser } from "../../services/MarkdownTaskParser";
import { trackAuditLogger } from "../jest.setup";
import { JSONRPCRequest, ToolCallRequest } from "../../types/jsonrpc";
import { getNextAvailablePort } from "../utils/testPorts";
import * as http from "http";

// Helper function to make HTTP requests
function makeRequest(
  port: number,
  data: any,
  method: string = "POST"
): Promise<{ status: number; data: any; headers: any }> {
  return new Promise((resolve, reject) => {
    const postData = method === "POST" ? JSON.stringify(data) : "";

    const options = {
      hostname: "localhost",
      port: port,
      path: "/",
      method: method,
      headers:
        method === "POST"
          ? {
              "Content-Type": "application/json",
              "Content-Length": Buffer.byteLength(postData),
            }
          : {},
    };

    const req = http.request(options, (res) => {
      let responseData = "";

      res.on("data", (chunk) => {
        responseData += chunk;
      });

      res.on("end", () => {
        try {
          const parsedData = responseData ? JSON.parse(responseData) : {};
          resolve({
            status: res.statusCode || 0,
            data: parsedData,
            headers: res.headers,
          });
        } catch (error) {
          resolve({
            status: res.statusCode || 0,
            data: responseData,
            headers: res.headers,
          });
        }
      });
    });

    req.on("error", (error) => {
      reject(error);
    });

    if (method === "POST" && postData) {
      req.write(postData);
    }
    req.end();
  });
}

describe("SimpleMCPServer Integration Tests", () => {
  let server: SimpleMCPServer;
  let contextManager: ContextManager;
  let mockDataProvider: MockDataProvider;
  let taskStatusManager: TaskStatusManager;
  const testPort = getNextAvailablePort();

  beforeAll(async () => {
    // Setup mock data provider and context manager
    mockDataProvider = new MockDataProvider({
      dataSize: "small",
      responseDelay: 0,
      errorRate: 0,
    });

    contextManager = new ContextManager(mockDataProvider);
    taskStatusManager = new TaskStatusManager(new MarkdownTaskParser());

    // Track AuditLogger instances for cleanup
    if (contextManager && (contextManager as any).auditLogger) {
      trackAuditLogger((contextManager as any).auditLogger);
    }

    // Create and start server
    server = new SimpleMCPServer(testPort, contextManager, taskStatusManager);
    await server.start();

    // Wait for server to be ready
    await new Promise((resolve) => setTimeout(resolve, 100));
  });

  afterAll(async () => {
    if (server) {
      await server.stop();
    }

    // Cleanup AuditLogger instances
    if (contextManager && (contextManager as any).auditLogger) {
      try {
        await (contextManager as any).auditLogger.cleanup();
      } catch (error) {
        // Ignore cleanup errors
      }
    }
  });

  describe("Server Lifecycle", () => {
    test("should start server successfully", () => {
      expect(server.isHealthy()).toBe(true);
    });
  });

  describe("HTTP JSON-RPC Communication", () => {
    test("should handle valid JSON-RPC request", async () => {
      const request: JSONRPCRequest = {
        jsonrpc: "2.0",
        method: "tools/list",
        id: 1,
      };

      const response = await makeRequest(testPort, request);

      expect(response.status).toBe(200);
      expect(response.data.jsonrpc).toBe("2.0");
      expect(response.data.id).toBe(1);
      expect(response.data.result).toBeDefined();
      expect(response.data.result.tools).toBeInstanceOf(Array);
    });

    test("should reject invalid JSON-RPC version", async () => {
      const request = {
        jsonrpc: "1.0",
        method: "tools/list",
        id: 1,
      };

      const response = await makeRequest(testPort, request);

      expect(response.status).toBe(200);
      expect(response.data.error).toBeDefined();
      expect(response.data.error.code).toBe(-32600);
      expect(response.data.error.message).toBe("Invalid Request");
    });

    test("should handle unknown method", async () => {
      const request: JSONRPCRequest = {
        jsonrpc: "2.0",
        method: "unknown/method",
        id: 1,
      };

      const response = await makeRequest(testPort, request);

      expect(response.status).toBe(200);
      expect(response.data.error).toBeDefined();
      expect(response.data.error.code).toBe(-32601);
      expect(response.data.error.message).toBe("Method not found");
    });

    test("should reject non-POST requests", async () => {
      const response = await makeRequest(testPort, null, "GET");
      expect(response.status).toBe(405);
    });
  });

  describe("Tools List Endpoint", () => {
    test("should return available tools", async () => {
      const request: JSONRPCRequest = {
        jsonrpc: "2.0",
        method: "tools/list",
        id: "test-1",
      };

      const response = await makeRequest(testPort, request);

      expect(response.status).toBe(200);
      expect(response.data.result.tools).toHaveLength(7);

      // Check get_code_context tool
      const contextTool = response.data.result.tools.find(
        (t: any) => t.name === "get_code_context"
      );
      expect(contextTool).toBeDefined();
      expect(contextTool.description).toBeDefined();
      expect(contextTool.inputSchema).toBeDefined();
      expect(contextTool.inputSchema.properties).toBeDefined();

      // Check tasks/list tool
      const tasksTool = response.data.result.tools.find(
        (t: any) => t.name === "tasks/list"
      );
      expect(tasksTool).toBeDefined();
      expect(tasksTool.description).toBe(
        "Retrieve all tasks from the task management system"
      );
      expect(tasksTool.inputSchema.type).toBe("object");
      expect(tasksTool.inputSchema.properties.status).toBeDefined();
      expect(tasksTool.inputSchema.properties.status.enum).toContain(
        "in_progress"
      );

      // Check tasks/get tool
      const getTaskTool = response.data.result.tools.find(
        (t: any) => t.name === "tasks/get"
      );
      expect(getTaskTool).toBeDefined();
      expect(getTaskTool.description).toBe(
        "Retrieve a specific task by its ID"
      );
      expect(getTaskTool.inputSchema.type).toBe("object");
      expect(getTaskTool.inputSchema.properties.id).toBeDefined();
      expect(getTaskTool.inputSchema.required).toContain("id");
      expect(getTaskTool.inputSchema.additionalProperties).toBe(false);

      // Check tasks/update-status tool
      const updateStatusTool = response.data.result.tools.find(
        (t: any) => t.name === "tasks/update-status"
      );
      expect(updateStatusTool).toBeDefined();
      expect(updateStatusTool.description).toBe(
        "Update the status of a specific task"
      );
      expect(updateStatusTool.inputSchema.type).toBe("object");
      expect(updateStatusTool.inputSchema.properties.id).toBeDefined();
      expect(updateStatusTool.inputSchema.properties.newStatus).toBeDefined();
      expect(updateStatusTool.inputSchema.properties.newStatus.enum).toContain(
        "in_progress"
      );
      expect(updateStatusTool.inputSchema.required).toContain("id");
      expect(updateStatusTool.inputSchema.required).toContain("newStatus");
      expect(updateStatusTool.inputSchema.additionalProperties).toBe(false);

      // Check tasks/refresh tool
      const refreshTool = response.data.result.tools.find(
        (t: any) => t.name === "tasks/refresh"
      );
      expect(refreshTool).toBeDefined();
      expect(refreshTool.description).toBe(
        "Refresh task data from the source file"
      );
      expect(refreshTool.inputSchema.type).toBe("object");
      expect(refreshTool.inputSchema.properties).toEqual({});
      expect(refreshTool.inputSchema.additionalProperties).toBe(false);

      // Check tasks/dependencies tool
      const dependenciesTool = response.data.result.tools.find(
        (t: any) => t.name === "tasks/dependencies"
      );
      expect(dependenciesTool).toBeDefined();
      expect(dependenciesTool.description).toBe(
        "Get dependency information for a specific task"
      );
      expect(dependenciesTool.inputSchema.type).toBe("object");
      expect(dependenciesTool.inputSchema.properties.id).toBeDefined();
      expect(dependenciesTool.inputSchema.properties.id.type).toBe("string");
      expect(dependenciesTool.inputSchema.required).toContain("id");
      expect(dependenciesTool.inputSchema.additionalProperties).toBe(false);

      // Check tasks/test-results tool
      const testResultsTool = response.data.result.tools.find(
        (t: any) => t.name === "tasks/test-results"
      );
      expect(testResultsTool).toBeDefined();
      expect(testResultsTool.description).toBe(
        "Get test results for a specific task"
      );
      expect(testResultsTool.inputSchema.type).toBe("object");
      expect(testResultsTool.inputSchema.properties.id).toBeDefined();
      expect(testResultsTool.inputSchema.properties.id.type).toBe("string");
      expect(testResultsTool.inputSchema.required).toContain("id");
      expect(testResultsTool.inputSchema.additionalProperties).toBe(false);
    });
  });

  describe("Get Code Context Tool", () => {
    test("should handle valid get_code_context request", async () => {
      const request: ToolCallRequest = {
        jsonrpc: "2.0",
        method: "tools/call",
        params: {
          name: "get_code_context",
          arguments: {
            filePath: "src/auth/AuthService.ts",
            startLine: 10,
            endLine: 20,
            symbolName: "authenticate",
          },
        },
        id: "test-context-1",
      };

      const response = await makeRequest(testPort, request);

      expect(response.status).toBe(200);
      expect(response.data.jsonrpc).toBe("2.0");
      expect(response.data.id).toBe("test-context-1");
      expect(response.data.result).toBeDefined();
      expect(response.data.result.content).toBeInstanceOf(Array);
      expect(response.data.result.content[0].type).toBe("text");
      expect(response.data.result.content[0].text).toBeDefined();
    });

    test("should handle missing required arguments", async () => {
      const request: ToolCallRequest = {
        jsonrpc: "2.0",
        method: "tools/call",
        params: {
          name: "get_code_context",
          arguments: {
            filePath: "src/test.ts",
            // Missing startLine and endLine
          },
        },
        id: "test-invalid-1",
      };

      const response = await makeRequest(testPort, request);

      expect(response.status).toBe(200);
      expect(response.data.result.isError).toBe(true);
      expect(response.data.result.content[0].text).toContain(
        "Invalid arguments"
      );
    });

    test("should handle unknown tool name", async () => {
      const request: ToolCallRequest = {
        jsonrpc: "2.0",
        method: "tools/call",
        params: {
          name: "unknown_tool",
          arguments: {},
        },
        id: "test-unknown-tool",
      };

      const response = await makeRequest(testPort, request);

      expect(response.status).toBe(200);
      expect(response.data.error).toBeDefined();
      expect(response.data.error.message).toContain("Unknown tool");
    });

    test("should return formatted business context", async () => {
      const request: ToolCallRequest = {
        jsonrpc: "2.0",
        method: "tools/call",
        params: {
          name: "get_code_context",
          arguments: {
            filePath: "src/auth/AuthService.ts",
            startLine: 1,
            endLine: 10,
          },
        },
        id: "test-format",
      };

      const response = await makeRequest(testPort, request);

      expect(response.status).toBe(200);
      const content = response.data.result.content[0].text;

      // Check that the response contains expected sections
      expect(typeof content).toBe("string");
      expect(content.length).toBeGreaterThan(0);

      // Should contain business context information or no context message
      expect(
        content.includes("Business Context for") ||
          content.includes("No business context available") ||
          content.includes("No business context found")
      ).toBe(true);
    });
  });

  describe("Tasks List Tool", () => {
    test("should handle tasks/list request without filter", async () => {
      const request: ToolCallRequest = {
        jsonrpc: "2.0",
        method: "tools/call",
        params: {
          name: "tasks/list",
          arguments: {},
        },
        id: "test-tasks-1",
      };

      const response = await makeRequest(testPort, request);

      expect(response.status).toBe(200);
      expect(response.data.jsonrpc).toBe("2.0");
      expect(response.data.id).toBe("test-tasks-1");
      expect(response.data.result).toBeDefined();
      expect(response.data.result.content).toBeInstanceOf(Array);
      expect(response.data.result.content[0].type).toBe("text");

      // Parse the response content to check structure
      const content = response.data.result.content[0].text;
      expect(typeof content).toBe("string");
      expect(content.length).toBeGreaterThan(0);
    });

    test("should handle tasks/list request with status filter", async () => {
      const request: ToolCallRequest = {
        jsonrpc: "2.0",
        method: "tools/call",
        params: {
          name: "tasks/list",
          arguments: {
            status: "in_progress",
          },
        },
        id: "test-tasks-2",
      };

      const response = await makeRequest(testPort, request);

      expect(response.status).toBe(200);
      expect(response.data.jsonrpc).toBe("2.0");
      expect(response.data.id).toBe("test-tasks-2");
      expect(response.data.result).toBeDefined();
      expect(response.data.result.content).toBeInstanceOf(Array);
    });

    test("should reject invalid status filter", async () => {
      const request: ToolCallRequest = {
        jsonrpc: "2.0",
        method: "tools/call",
        params: {
          name: "tasks/list",
          arguments: {
            status: "invalid_status",
          },
        },
        id: "test-tasks-invalid",
      };

      const response = await makeRequest(testPort, request);

      expect(response.status).toBe(200);
      expect(response.data.result.isError).toBe(true);
      expect(response.data.result.content[0].text).toContain(
        "Invalid arguments"
      );
    });
  });

  describe("Tasks Get Tool", () => {
    test("should handle tasks/get request with valid ID", async () => {
      const request: ToolCallRequest = {
        jsonrpc: "2.0",
        method: "tools/call",
        params: {
          name: "tasks/get",
          arguments: {
            id: "task-123",
          },
        },
        id: "test-get-task-1",
      };

      const response = await makeRequest(testPort, request);

      expect(response.status).toBe(200);
      expect(response.data.jsonrpc).toBe("2.0");
      expect(response.data.id).toBe("test-get-task-1");
      expect(response.data.result).toBeDefined();
      expect(response.data.result.content).toBeInstanceOf(Array);
      expect(response.data.result.content[0].type).toBe("text");

      // Parse the response content to check structure
      const content = response.data.result.content[0].text;
      expect(typeof content).toBe("string");
      expect(content.length).toBeGreaterThan(0);
    });

    test("should handle tasks/get request with missing ID", async () => {
      const request: ToolCallRequest = {
        jsonrpc: "2.0",
        method: "tools/call",
        params: {
          name: "tasks/get",
          arguments: {},
        },
        id: "test-get-task-missing-id",
      };

      const response = await makeRequest(testPort, request);

      expect(response.status).toBe(200);
      expect(response.data.result.isError).toBe(true);
      expect(response.data.result.content[0].text).toContain(
        "Invalid arguments"
      );
    });

    test("should handle tasks/get request with invalid ID type", async () => {
      const request: ToolCallRequest = {
        jsonrpc: "2.0",
        method: "tools/call",
        params: {
          name: "tasks/get",
          arguments: {
            id: 123, // Invalid: should be string
          },
        },
        id: "test-get-task-invalid-id",
      };

      const response = await makeRequest(testPort, request);

      expect(response.status).toBe(200);
      expect(response.data.result.isError).toBe(true);
      expect(response.data.result.content[0].text).toContain(
        "Invalid arguments"
      );
    });
  });

  describe("Tasks Update Status Tool", () => {
    test("should handle tasks/update-status request with valid parameters", async () => {
      const request: ToolCallRequest = {
        jsonrpc: "2.0",
        method: "tools/call",
        params: {
          name: "tasks/update-status",
          arguments: {
            id: "task-123",
            newStatus: "in_progress",
          },
        },
        id: "test-update-status-1",
      };

      const response = await makeRequest(testPort, request);

      expect(response.status).toBe(200);
      expect(response.data.jsonrpc).toBe("2.0");
      expect(response.data.id).toBe("test-update-status-1");
      expect(response.data.result).toBeDefined();
      expect(response.data.result.content).toBeInstanceOf(Array);
      expect(response.data.result.content[0].type).toBe("text");

      // Parse the response content to check structure
      const content = response.data.result.content[0].text;
      expect(typeof content).toBe("string");
      expect(content.length).toBeGreaterThan(0);
    });

    test("should handle tasks/update-status request with missing ID", async () => {
      const request: ToolCallRequest = {
        jsonrpc: "2.0",
        method: "tools/call",
        params: {
          name: "tasks/update-status",
          arguments: {
            newStatus: "in_progress",
            // Missing id
          },
        },
        id: "test-update-status-missing-id",
      };

      const response = await makeRequest(testPort, request);

      expect(response.status).toBe(200);
      expect(response.data.result.isError).toBe(true);
      expect(response.data.result.content[0].text).toContain(
        "Invalid arguments"
      );
    });

    test("should handle tasks/update-status request with missing newStatus", async () => {
      const request: ToolCallRequest = {
        jsonrpc: "2.0",
        method: "tools/call",
        params: {
          name: "tasks/update-status",
          arguments: {
            id: "task-123",
            // Missing newStatus
          },
        },
        id: "test-update-status-missing-status",
      };

      const response = await makeRequest(testPort, request);

      expect(response.status).toBe(200);
      expect(response.data.result.isError).toBe(true);
      expect(response.data.result.content[0].text).toContain(
        "Invalid arguments"
      );
    });

    test("should handle tasks/update-status request with invalid status value", async () => {
      const request: ToolCallRequest = {
        jsonrpc: "2.0",
        method: "tools/call",
        params: {
          name: "tasks/update-status",
          arguments: {
            id: "task-123",
            newStatus: "invalid_status", // Invalid status value
          },
        },
        id: "test-update-status-invalid-status",
      };

      const response = await makeRequest(testPort, request);

      expect(response.status).toBe(200);
      expect(response.data.result.isError).toBe(true);
      expect(response.data.result.content[0].text).toContain(
        "Invalid arguments"
      );
    });

    test("should handle tasks/update-status request with invalid ID type", async () => {
      const request: ToolCallRequest = {
        jsonrpc: "2.0",
        method: "tools/call",
        params: {
          name: "tasks/update-status",
          arguments: {
            id: 123, // Invalid: should be string
            newStatus: "in_progress",
          },
        },
        id: "test-update-status-invalid-id-type",
      };

      const response = await makeRequest(testPort, request);

      expect(response.status).toBe(200);
      expect(response.data.result.isError).toBe(true);
      expect(response.data.result.content[0].text).toContain(
        "Invalid arguments"
      );
    });

    test("should handle tasks/update-status request with invalid newStatus type", async () => {
      const request: ToolCallRequest = {
        jsonrpc: "2.0",
        method: "tools/call",
        params: {
          name: "tasks/update-status",
          arguments: {
            id: "task-123",
            newStatus: 123, // Invalid: should be string
          },
        },
        id: "test-update-status-invalid-status-type",
      };

      const response = await makeRequest(testPort, request);

      expect(response.status).toBe(200);
      expect(response.data.result.isError).toBe(true);
      expect(response.data.result.content[0].text).toContain(
        "Invalid arguments"
      );
    });
  });

  describe("CORS Headers", () => {
    test("should include CORS headers in response", async () => {
      const request: JSONRPCRequest = {
        jsonrpc: "2.0",
        method: "tools/list",
        id: 1,
      };

      const response = await makeRequest(testPort, request);

      expect(response.headers["access-control-allow-origin"]).toBe("*");
    });

    test("should handle OPTIONS preflight request", async () => {
      const response = await makeRequest(testPort, null, "OPTIONS");

      expect(response.status).toBe(200);
      expect(response.headers["access-control-allow-methods"]).toContain(
        "POST"
      );
    });
  });
});
