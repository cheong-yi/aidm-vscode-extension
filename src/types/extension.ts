/**
 * VSCode Extension Types
 * Interfaces for extension components and configuration
 * Includes JSON-RPC 2.0 Protocol Types for MCP communication
 */

// Inline business types (removed business.ts dependency)
interface CodeLocation {
  filePath: string;
  startLine: number;
  endLine: number;
  symbolName?: string;
  symbolType?: string;
}

interface BusinessContext {
  requirements: any[];
  implementationStatus: any;
  relatedChanges: any[];
  lastUpdated: Date;
  functionMappings?: Record<string, any>;
}

export interface ExtensionConfiguration {
  mcpServer: {
    port: number;
    timeout: number;
    retryAttempts: number;
  };
  cache: {
    enabled: boolean;
    maxSize: number;
    ttl: number;
  };
  mock: {
    enabled: boolean;
    dataSize: "small" | "medium" | "large";
    enterprisePatterns: boolean;
  };
  performance: {
    hoverDelay: number;
    searchThrottle: number;
    maxConcurrentRequests: number;
  };
}

export enum ConnectionStatus {
  Connected = "connected",
  Disconnected = "disconnected",
  Connecting = "connecting",
  Error = "error",
}

export interface ErrorResponse {
  code: ErrorCode;
  message: string;
  details?: any;
  timestamp: Date;
  requestId: string;
}

export enum ErrorCode {
  CONNECTION_FAILED = "CONNECTION_FAILED",
  DATA_NOT_FOUND = "DATA_NOT_FOUND",
  INVALID_REQUEST = "INVALID_REQUEST",
  TIMEOUT = "TIMEOUT",
  INTERNAL_ERROR = "INTERNAL_ERROR",
}

/**
 * Interface for error recovery strategies
 */
export interface ErrorRecoveryStrategy {
  canRecover(error: Error, context: any): boolean;
  recover(error: Error, context: any): Promise<any>;
  maxRetries: number;
  retryDelay: number;
}

/**
 * Interface for hover provider functionality
 */
export interface BusinessContextHoverProvider {
  getSupportedLanguages(): string[];
}

/**
 * Interface for status bar management
 */
export interface StatusBarManager {
  updateConnectionStatus(status: ConnectionStatus): void;
  showHealthMetrics(): void;
  handleStatusClick(): void;
}

/**
 * Interface for context management
 */
export interface ContextManager {
  getBusinessContext(codeLocation: CodeLocation): Promise<BusinessContext>;
  getRequirementById(id: string): Promise<any>;
  invalidateCache(pattern?: string): void;
}

// ============================================================================
// JSON-RPC 2.0 Protocol Types (consolidated from jsonrpc.ts)
// ============================================================================

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
