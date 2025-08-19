/**
 * Integration tests for MCP Tools functionality
 * Tests the complete flow of MCP tool calls including validation, processing, and response formatting
 */

import { SimpleMCPServer } from "../../server/SimpleMCPServer";
import { ContextManager } from "../../server/ContextManager";
import { MockDataProvider } from "../../mock/MockDataProvider";
import { JSONRPCRequest, ToolCallRequest } from "../../types/jsonrpc";
import * as http from "http";

describe("MCP Tools Integration Tests", () => {
  let mcpServer: SimpleMCPServer;
  let contextManager: ContextManager;
  let mockDataProvider: MockDataProvider;
  const testPort = 3001;

  beforeAll(async () => {
    // Initialize components
    mockDataProvider = new MockDataProvider();
    contextManager = new ContextManager(mockDataProvider);
    mcpServer = new SimpleMCPServer(testPort, contextManager);

    // Start server
    await mcpServer.start();
  });

  afterAll(async () => {
    // Clean up
    await mcpServer.stop();
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
      expect(response.result.tools).toHaveLength(3);

      const toolNames = response.result.tools.map((tool: any) => tool.name);
      expect(toolNames).toContain("get_business_context");
      expect(toolNames).toContain("get_requirement_details");
      expect(toolNames).toContain("get_code_context");
    });

    it("should include proper schema definitions for each tool", async () => {
      const request: JSONRPCRequest = {
        jsonrpc: "2.0",
        method: "tools/list",
        id: "test-2",
      };

      const response = await makeHTTPRequest(request);
      const tools = response.result.tools;

      // Check get_business_context schema
      const businessContextTool = tools.find(
        (t: any) => t.name === "get_business_context"
      );
      expect(businessContextTool).toBeDefined();
      expect(businessContextTool.inputSchema.type).toBe("object");
      expect(businessContextTool.inputSchema.required).toContain("filePath");
      expect(businessContextTool.inputSchema.required).toContain("startLine");
      expect(businessContextTool.inputSchema.required).toContain("endLine");
      expect(businessContextTool.inputSchema.additionalProperties).toBe(false);

      // Check get_requirement_details schema
      const requirementTool = tools.find(
        (t: any) => t.name === "get_requirement_details"
      );
      expect(requirementTool).toBeDefined();
      expect(requirementTool.inputSchema.type).toBe("object");
      expect(requirementTool.inputSchema.required).toContain("requirementId");
      expect(
        requirementTool.inputSchema.properties.requirementId.pattern
      ).toBeDefined();
    });
  });

  describe("get_business_context Tool", () => {
    it("should return business context for valid code location", async () => {
      const request: ToolCallRequest = {
        jsonrpc: "2.0",
        method: "tools/call",
        params: {
          name: "get_business_context",
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
      // Should return either business context or a helpful message
      expect(response.result.content[0].text).toMatch(
        /(Business Context for|No business context available)/
      );
      expect(response.result.content[0].text).toContain("UserService.ts");
    });

    it("should validate required arguments", async () => {
      const request: ToolCallRequest = {
        jsonrpc: "2.0",
        method: "tools/call",
        params: {
          name: "get_business_context",
          arguments: {
            filePath: "src/test.ts",
            // Missing startLine and endLine
          },
        },
        id: "test-4",
      };

      const response = await makeHTTPRequest(request);

      expect(response.result.content[0].text).toContain("Validation error");
      expect(response.result.isError).toBe(true);
    });

    it("should validate line number constraints", async () => {
      const request: ToolCallRequest = {
        jsonrpc: "2.0",
        method: "tools/call",
        params: {
          name: "get_business_context",
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
          name: "get_business_context",
          arguments: {
            filePath: "src/nonexistent.ts",
            startLine: 1,
            endLine: 10,
          },
        },
        id: "test-6",
      };

      const response = await makeHTTPRequest(request);

      expect(response.result.content[0].text).toContain(
        "No business context available"
      );
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
          name: "get_business_context",
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

      // Create multiple requests that will take some time
      const requests = Array.from({ length: 3 }, (_, i) => ({
        jsonrpc: "2.0" as const,
        method: "tools/call",
        params: {
          name: "get_business_context",
          arguments: {
            filePath: `src/concurrent${i}.ts`,
            startLine: 1,
            endLine: 10,
          },
        },
        id: `capacity-${i}`,
      }));

      const promises = requests.map((req) => makeHTTPRequest(req));
      const responses = await Promise.all(promises);

      // At least one should be rejected due to capacity
      const rejectedResponses = responses.filter(
        (r) =>
          r.error && r.error.message.includes("too many concurrent requests")
      );

      expect(rejectedResponses.length).toBeGreaterThan(0);

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

      // Unknown tools return a result with error content, not an error response
      expect(response.result).toBeDefined();
      expect(response.result.content[0].text).toContain("Validation error");
      expect(response.result.content[0].text).toContain("Unknown tool");
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
