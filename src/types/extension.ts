/**
 * VSCode Extension Types
 * Interfaces for extension components and configuration
 */

import { BusinessContext, CodeLocation } from "./business";

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
