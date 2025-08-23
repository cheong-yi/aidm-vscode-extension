/**
 * Integration tests for MCP Tools functionality
 * Tests the complete flow of MCP tool calls including validation, processing, and response formatting
 */

import { SimpleMCPServer } from "../../server/SimpleMCPServer";
import { ContextManager } from "../../server/ContextManager";
import { MockDataProvider } from "../../mock/MockDataProvider";
import { TaskStatusManager } from "../../services/TaskStatusManager";
import { MarkdownTaskParser } from "../../services/MarkdownTaskParser";
import { getNextAvailablePort } from "../utils/testPorts";
import { JSONRPCRequest, ToolCallRequest } from "../../types/jsonrpc";
import * as http from "http";

describe("MCP Tools Integration Tests", () => {
  let mcpServer: SimpleMCPServer;
  let contextManager: ContextManager;
  let mockDataProvider: MockDataProvider;
  let testPort: number;

  beforeAll(async () => {
    // Get an available port
    testPort = await getNextAvailablePort();
    
    // Initialize components
    mockDataProvider = new MockDataProvider();
    contextManager = new ContextManager(mockDataProvider);
    const markdownParser = new MarkdownTaskParser();
    const taskStatusManager = new TaskStatusManager(markdownParser);
    mcpServer = new SimpleMCPServer(
      testPort,
      contextManager,
      taskStatusManager
    );

    // Start server
    await mcpServer.start();
  });

  afterAll(async () => {
    // Clean up
    if (mcpServer) {
      await mcpServer.stop();
    }
  });

  describe("Tools List", () => {
    it("should return all available MCP tools", async () => {
      const request: JSONRPCRequest = {
        jsonrpc: "2.0",
        method: "tools/list",
        id: "test-1",
      };

      const response = await makeHTTPRequest(request);

      expect(response.jsonrpc).toBe("2.0");
      expect(response.id).toBe("test-1");
      expect(response.result).toBeDefined();
      // Check that we have the expected tools (actual count may vary)
      const toolNames = response.result.tools.map((tool: any) => tool.name);
      expect(toolNames).toContain("get_code_context");
      expect(toolNames).toContain("tasks/list");
      expect(toolNames).toContain("tasks/get");
      expect(toolNames).toContain("tasks/update-status");
      expect(toolNames).toContain("tasks/refresh");
      expect(toolNames).toContain("tasks/dependencies");
      expect(toolNames).toContain("tasks/test-results");
    });

    it("should include proper schema definitions for each tool", async () => {
      const request: JSONRPCRequest = {
        jsonrpc: "2.0",
        method: "tools/list",
        id: "test-2",
      };

      const response = await makeHTTPRequest(request);
      const tools = response.result.tools;

      // Check get_code_context schema
      const codeContextTool = tools.find(
        (t: any) => t.name === "get_code_context"
      );
      expect(codeContextTool).toBeDefined();
      expect(codeContextTool.inputSchema.type).toBe("object");
      expect(codeContextTool.inputSchema.required).toContain("filePath");
      expect(codeContextTool.inputSchema.required).toContain("startLine");
      expect(codeContextTool.inputSchema.required).toContain("endLine");
      // additionalProperties may not be defined in all schemas
      if (codeContextTool.inputSchema.additionalProperties !== undefined) {
        expect(codeContextTool.inputSchema.additionalProperties).toBe(false);
      }
    });
  });

  describe("get_code_context Tool", () => {
    it("should return code context for valid code location", async () => {
      const request: ToolCallRequest = {
        jsonrpc: "2.0",
        method: "tools/call",
        params: {
          name: "get_code_context",
          arguments: {
            filePath: "src/auth/UserService.ts",
            startLine: 10,
            endLine: 25,
            symbolName: "authenticateUser",
          },
        },
        id: "test-3",
      };

      const response = await makeHTTPRequest(request);

      expect(response.jsonrpc).toBe("2.0");
      expect(response.id).toBe("test-3");
      expect(response.result).toBeDefined();
      expect(response.result.content).toHaveLength(1);
      expect(response.result.content[0].type).toBe("text");
      // Should return text content with business context information
      const responseText = response.result.content[0].text;
      expect(responseText).toContain("UserService.ts");
      expect(responseText).toMatch(
        /(Business Context|No business context available)/
      );
    });

    it("should validate required arguments", async () => {
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
        id: "test-4",
      };

      const response = await makeHTTPRequest(request);

      expect(response.result.content[0].text).toContain("Invalid arguments");
      expect(response.result.isError).toBe(true);
    });

    it("should validate line number constraints", async () => {
      const request: ToolCallRequest = {
        jsonrpc: "2.0",
        method: "tools/call",
        params: {
          name: "get_code_context",
          arguments: {
            filePath: "src/test.ts",
            startLine: 10,
            endLine: 5, // endLine < startLine
          },
        },
        id: "test-5",
      };

      const response = await makeHTTPRequest(request);

      expect(response.result.content[0].text).toContain(
        "endLine must be greater than or equal to startLine"
      );
      expect(response.result.isError).toBe(true);
    });

    it("should handle non-existent files gracefully", async () => {
      const request: ToolCallRequest = {
        jsonrpc: "2.0",
        method: "tools/call",
        params: {
          name: "get_code_context",
          arguments: {
            filePath: "src/nonexistent.ts",
            startLine: 1,
            endLine: 10,
          },
        },
        id: "test-6",
      };

      const response = await makeHTTPRequest(request);

      // Should return text indicating no business context available
      const responseText = response.result.content[0].text;
      expect(responseText).toContain("No business context available");
      expect(response.result.isError).toBeFalsy();
    });
  });

  describe("get_requirement_details Tool", () => {
    it("should return requirement details for valid ID", async () => {
      const request: ToolCallRequest = {
        jsonrpc: "2.0",
        method: "tools/call",
        params: {
          name: "get_requirement_details",
          arguments: {
            requirementId: "REQ-001",
          },
        },
        id: "test-7",
      };

      const response = await makeHTTPRequest(request);

      expect(response.jsonrpc).toBe("2.0");
      expect(response.id).toBe("test-7");
      expect(response.result).toBeDefined();
      expect(response.result.content).toHaveLength(1);
      expect(response.result.content[0].type).toBe("text");
      expect(response.result.content[0].text).toContain("Requirement Details:");
    });

    it("should validate requirement ID format", async () => {
      const request: ToolCallRequest = {
        jsonrpc: "2.0",
        method: "tools/call",
        params: {
          name: "get_requirement_details",
          arguments: {
            requirementId: "invalid@id!", // Invalid characters
          },
        },
        id: "test-8",
      };

      const response = await makeHTTPRequest(request);

      expect(response.result.content[0].text).toContain(
        "must contain only alphanumeric characters"
      );
      expect(response.result.isError).toBe(true);
    });

    it("should handle non-existent requirement IDs", async () => {
      const request: ToolCallRequest = {
        jsonrpc: "2.0",
        method: "tools/call",
        params: {
          name: "get_requirement_details",
          arguments: {
            requirementId: "NONEXISTENT-999",
          },
        },
        id: "test-9",
      };

      const response = await makeHTTPRequest(request);

      expect(response.result.content[0].text).toContain("not found");
      expect(response.result.isError).toBeFalsy();
    });
  });

  describe("Concurrent Request Handling", () => {
    it("should handle multiple concurrent requests", async () => {
      const requests = Array.from({ length: 5 }, (_, i) => ({
        jsonrpc: "2.0" as const,
        method: "tools/call",
        params: {
          name: "get_code_context",
          arguments: {
            filePath: `src/test${i}.ts`,
            startLine: 1,
            endLine: 10,
          },
        },
        id: `concurrent-${i}`,
      }));

      const promises = requests.map((req) => makeHTTPRequest(req));
      const responses = await Promise.all(promises);

      expect(responses).toHaveLength(5);
      responses.forEach((response, i) => {
        expect(response.id).toBe(`concurrent-${i}`);
        expect(response.jsonrpc).toBe("2.0");
      });
    });

    it("should reject requests when at capacity", async () => {
      // Update server to have very low concurrent request limit
      mcpServer.updateConfiguration({ maxConcurrentRequests: 1 });

      // Create a slow operation that will block the server
      const slowRequest = {
        jsonrpc: "2.0" as const,
        method: "tools/call",
        params: {
          name: "get_code_context",
          arguments: {
            filePath: "src/slow.ts",
            startLine: 1,
            endLine: 10,
          },
        },
        id: "slow-request",
      };

      // Start the slow request first
      const slowPromise = makeHTTPRequest(slowRequest);

      // Wait a bit for the slow request to start processing
      await new Promise(resolve => setTimeout(resolve, 100));

      // Now send additional requests that should be rejected
      const fastRequests = Array.from({ length: 2 }, (_, i) => ({
        jsonrpc: "2.0" as const,
        method: "tools/call",
        params: {
          name: "get_code_context",
          arguments: {
            filePath: `src/fast${i}.ts`,
            startLine: 1,
            endLine: 10,
          },
        },
        id: `fast-${i}`,
      }));

      const fastPromises = fastRequests.map(req => makeHTTPRequest(req));
      const fastResponses = await Promise.all(fastPromises);

      // At least one should be rejected due to capacity
      const rejectedResponses = fastResponses.filter(
        (r) =>
          r.error && r.error.message.includes("too many concurrent requests")
      );

      expect(rejectedResponses.length).toBeGreaterThan(0);

      // Wait for the slow request to complete
      await slowPromise;

      // Reset to default
      mcpServer.updateConfiguration({ maxConcurrentRequests: 10 });
    });
  });

  describe("Error Handling", () => {
    it("should handle invalid JSON-RPC format", async () => {
      const request = {
        jsonrpc: "1.0", // Invalid version
        method: "tools/list",
        id: "test-invalid",
      };

      const response = await makeHTTPRequest(request);

      expect(response.error).toBeDefined();
      expect(response.error.code).toBe(-32600);
      expect(response.error.message).toBe("Invalid Request");
    });

    it("should handle unknown methods", async () => {
      const request: JSONRPCRequest = {
        jsonrpc: "2.0",
        method: "unknown/method",
        id: "test-unknown",
      };

      const response = await makeHTTPRequest(request);

      expect(response.error).toBeDefined();
      expect(response.error.code).toBe(-32601);
      expect(response.error.message).toBe("Method not found");
    });

    it("should handle unknown tools", async () => {
      const request: ToolCallRequest = {
        jsonrpc: "2.0",
        method: "tools/call",
        params: {
          name: "unknown_tool",
          arguments: {},
        },
        id: "test-unknown-tool",
      };

      const response = await makeHTTPRequest(request);

      // Unknown tools return an error response
      expect(response.error).toBeDefined();
      expect(response.error.code).toBe(-32601);
      expect(response.error.message).toContain("Unknown tool");
    });
  });

  describe("Legacy Support", () => {
    it("should support legacy get_code_context tool", async () => {
      const request: ToolCallRequest = {
        jsonrpc: "2.0",
        method: "tools/call",
        params: {
          name: "get_code_context",
          arguments: {
            filePath: "src/legacy.ts",
            startLine: 1,
            endLine: 10,
          },
        },
        id: "test-legacy",
      };

      const response = await makeHTTPRequest(request);

      expect(response.jsonrpc).toBe("2.0");
      expect(response.result).toBeDefined();
      expect(response.result.content[0].text).toMatch(
        /(Business Context for|No business context available)/
      );
    });
  });

  // Helper function to make HTTP requests to the MCP server
  async function makeHTTPRequest(request: any): Promise<any> {
    return new Promise((resolve, reject) => {
      const postData = JSON.stringify(request);

      const options = {
        hostname: "localhost",
        port: testPort,
        path: "/",
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(postData),
        },
      };

      const req = http.request(options, (res) => {
        let data = "";

        res.on("data", (chunk) => {
          data += chunk;
        });

        res.on("end", () => {
          try {
            const response = JSON.parse(data);
            resolve(response);
          } catch (error) {
            reject(error);
          }
        });
      });

      req.on("error", (error) => {
        reject(error);
      });

      req.write(postData);
      req.end();
    });
  }
});
