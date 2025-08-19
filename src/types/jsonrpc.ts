/**
 * JSON-RPC 2.0 Protocol Types
 * Simplified implementation for MCP communication
 */

export interface JSONRPCRequest {
  jsonrpc: "2.0";
  method: string;
  params?: any;
  id: string | number;
}

export interface JSONRPCResponse {
  jsonrpc: "2.0";
  result?: any;
  error?: JSONRPCError;
  id: string | number;
}

export interface JSONRPCError {
  code: number;
  message: string;
  data?: any;
}

export interface JSONRPCNotification {
  jsonrpc: "2.0";
  method: string;
  params?: any;
}

/**
 * MCP Tool Call Request Format
 */
export interface ToolCallRequest extends JSONRPCRequest {
  method: "tools/call";
  params: {
    name: string;
    arguments: Record<string, any>;
  };
}

/**
 * MCP Tool Call Response Format
 */
export interface ToolCallResponse extends JSONRPCResponse {
  result?: {
    content: Array<{
      type: "text";
      text: string;
    }>;
    isError?: boolean;
  };
}

/**
 * HTTP JSON-RPC Communication Configuration
 */
export interface MCPCommunication {
  endpoint: string;
  method: "POST";
  headers: {
    "Content-Type": "application/json";
  };
  timeout: number;
}
