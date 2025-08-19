/**
 * Integration Tests for SimpleMCPServer
 * Tests HTTP JSON-RPC communication and tool call handling
 */

import { SimpleMCPServer } from "../../server/SimpleMCPServer";
import { ContextManager } from "../../server/ContextManager";
import { MockDataProvider } from "../../mock/MockDataProvider";
import { JSONRPCRequest, ToolCallRequest } from "../../types/jsonrpc";
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
  const testPort = 3004;

  beforeAll(async () => {
    // Setup mock data provider and context manager
    mockDataProvider = new MockDataProvider({
      dataSize: "small",
      responseDelay: 0,
      errorRate: 0,
    });

    contextManager = new ContextManager(mockDataProvider);

    // Create and start server
    server = new SimpleMCPServer(testPort, contextManager);
    await server.start();

    // Wait for server to be ready
    await new Promise((resolve) => setTimeout(resolve, 100));
  });

  afterAll(async () => {
    if (server) {
      await server.stop();
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
      expect(response.data.result.tools).toHaveLength(1);

      const tool = response.data.result.tools[0];
      expect(tool.name).toBe("get_code_context");
      expect(tool.description).toBeDefined();
      expect(tool.inputSchema).toBeDefined();
      expect(tool.inputSchema.properties).toBeDefined();
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
        content.includes("Business Context:") ||
          content.includes("No business context available")
      ).toBe(true);
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
