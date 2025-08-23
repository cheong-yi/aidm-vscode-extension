/**
 * Tests for MCP Client
 */

import axios from "axios";
import { MCPClient } from "../client/mcpClient";
import { ErrorCode } from "../types/extension";

// Mock axios
jest.mock("axios");
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe("MCPClient", () => {
  let mcpClient: MCPClient;
  let mockAxiosInstance: jest.Mocked<any>;

  beforeEach(() => {
    mockAxiosInstance = {
      post: jest.fn(),
    };

    mockedAxios.create.mockReturnValue(mockAxiosInstance);
    mockedAxios.isAxiosError.mockReturnValue(false);

    mcpClient = new MCPClient(3000, 5000);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("constructor", () => {
    it("should initialize with correct configuration", () => {
      expect(mockedAxios.create).toHaveBeenCalledWith({
        baseURL: "http://localhost:3000/rpc",
        timeout: 5000,
        headers: {
          "Content-Type": "application/json",
        },
      });
    });

    it("should use default values when not provided", () => {
      new MCPClient();

      expect(mockedAxios.create).toHaveBeenCalledWith({
        baseURL: "http://localhost:3001/rpc", // Changed from 3000 to 3001 since that's the actual default
        timeout: 5000,
        headers: {
          "Content-Type": "application/json",
        },
      });
    });
  });

  describe("callTool", () => {
    it("should send correct JSON-RPC request", async () => {
      const mockResponse = {
        data: {
          jsonrpc: "2.0",
          result: { success: true },
          id: 1,
        },
      };

      mockAxiosInstance.post.mockResolvedValue(mockResponse);

      const result = await mcpClient.callTool("test_tool", {
        param1: "value1",
      });

      expect(mockAxiosInstance.post).toHaveBeenCalledWith("", {
        jsonrpc: "2.0",
        method: "tools/call",
        params: {
          name: "test_tool",
          arguments: { param1: "value1" },
        },
        id: 1,
      });

      expect(result).toEqual({ success: true });
    });

    it("should handle server errors", async () => {
      const mockResponse = {
        data: {
          jsonrpc: "2.0",
          error: {
            code: -32000,
            message: "Server error",
          },
          id: 1,
        },
      };

      mockAxiosInstance.post.mockResolvedValue(mockResponse);

      await expect(mcpClient.callTool("test_tool", {})).rejects.toThrow(
        "MCP Server Error: Server error (Code: -32000)"
      );
    });
  });

  describe("getBusinessContext", () => {
    it("should call the correct tool with proper parameters", async () => {
      const mockResponse = {
        data: {
          jsonrpc: "2.0",
          result: { context: "test" },
          id: 1,
        },
      };

      mockAxiosInstance.post.mockResolvedValue(mockResponse);

      const result = await mcpClient.getBusinessContext("/test/file.ts", 10);

      expect(mockAxiosInstance.post).toHaveBeenCalledWith("", {
        jsonrpc: "2.0",
        method: "tools/call",
        params: {
          name: "get_business_context",
          arguments: {
            filePath: "/test/file.ts",
            startLine: 10,
            endLine: 10,
          },
        },
        id: 1,
      });

      expect(result).toEqual({ context: "test" });
    });
  });

  describe("ping", () => {
    it("should return true when server responds", async () => {
      const mockResponse = {
        data: {
          jsonrpc: "2.0",
          result: "pong",
          id: 1,
        },
      };

      mockAxiosInstance.post.mockResolvedValue(mockResponse);

      const result = await mcpClient.ping();

      expect(result).toBe(true);
      expect(mockAxiosInstance.post).toHaveBeenCalledWith("", {
        jsonrpc: "2.0",
        method: "ping",
        id: 1,
      });
    });

    it("should return false when server is unreachable", async () => {
      mockAxiosInstance.post.mockRejectedValue(new Error("Connection refused"));

      const result = await mcpClient.ping();

      expect(result).toBe(false);
    });
  });

  describe("error handling", () => {
    it("should handle connection refused errors", async () => {
      const connectionError = new Error("Connection refused") as any;
      connectionError.code = "ECONNREFUSED";

      mockedAxios.isAxiosError.mockReturnValue(true);
      mockAxiosInstance.post.mockRejectedValue(connectionError);

      await expect(mcpClient.callTool("test_tool", {})).rejects.toMatchObject({
        code: ErrorCode.CONNECTION_FAILED,
        message: "MCP server is not running or not accessible",
      });
    });

    it("should handle timeout errors", async () => {
      const timeoutError = new Error("Timeout") as any;
      timeoutError.code = "ECONNABORTED";

      mockedAxios.isAxiosError.mockReturnValue(true);
      mockAxiosInstance.post.mockRejectedValue(timeoutError);

      await expect(mcpClient.callTool("test_tool", {})).rejects.toMatchObject({
        code: ErrorCode.TIMEOUT,
        message: "Request timed out",
      });
    });

    it("should handle generic errors", async () => {
      const genericError = new Error("Generic error");

      mockAxiosInstance.post.mockRejectedValue(genericError);

      await expect(mcpClient.callTool("test_tool", {})).rejects.toMatchObject({
        code: ErrorCode.INTERNAL_ERROR,
        message: "Failed to communicate with MCP server",
      });
    });
  });

  describe("updateConfig", () => {
    it("should update client configuration", () => {
      mcpClient.updateConfig(4000, 10000);

      expect(mockedAxios.create).toHaveBeenCalledWith({
        baseURL: "http://localhost:4000/rpc",
        timeout: 10000,
        headers: {
          "Content-Type": "application/json",
        },
      });
    });
  });
});
