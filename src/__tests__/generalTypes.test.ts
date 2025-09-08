/**
 * Type definition tests
 */

import {
  JSONRPCRequest,
  JSONRPCResponse,
  ToolCallRequest,
  RequirementType,
  Priority,
  ConnectionStatus,
  ErrorCode,
} from "../types";

describe("Type Definitions", () => {
  describe("JSON-RPC Types", () => {
    it("should create valid JSONRPCRequest", () => {
      const request: JSONRPCRequest = {
        jsonrpc: "2.0",
        method: "test_method",
        params: { test: "value" },
        id: 1,
      };

      expect(request.jsonrpc).toBe("2.0");
      expect(request.method).toBe("test_method");
      expect(request.id).toBe(1);
    });

    it("should create valid JSONRPCResponse", () => {
      const response: JSONRPCResponse = {
        jsonrpc: "2.0",
        result: { success: true },
        id: 1,
      };

      expect(response.jsonrpc).toBe("2.0");
      expect(response.result).toEqual({ success: true });
    });

    it("should create valid ToolCallRequest", () => {
      const toolCall: ToolCallRequest = {
        jsonrpc: "2.0",
        method: "tools/call",
        params: {
          name: "get_code_context",
          arguments: { filePath: "test.ts" },
        },
        id: 1,
      };

      expect(toolCall.method).toBe("tools/call");
      expect(toolCall.params.name).toBe("get_code_context");
    });
  });

  describe("Business Types", () => {
    it("should have correct RequirementType enum values", () => {
      expect(RequirementType.FUNCTIONAL).toBe("functional");
      expect(RequirementType.BUSINESS).toBe("business");
    });

    it("should have correct Priority enum values", () => {
      expect(Priority.LOW).toBe("low");
      expect(Priority.HIGH).toBe("high");
    });
  });

  describe("Extension Types", () => {
    it("should have correct ConnectionStatus enum values", () => {
      expect(ConnectionStatus.Connected).toBe("connected");
      expect(ConnectionStatus.Disconnected).toBe("disconnected");
    });

    it("should have correct ErrorCode enum values", () => {
      expect(ErrorCode.CONNECTION_FAILED).toBe("CONNECTION_FAILED");
      expect(ErrorCode.DATA_NOT_FOUND).toBe("DATA_NOT_FOUND");
    });
  });
});
