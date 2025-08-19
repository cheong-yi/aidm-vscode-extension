/**
 * Integration tests for StatusBarManager with MCP Client
 */

import * as vscode from "vscode";
import { StatusBarManagerImpl } from "../../ui/statusBar";
import { MCPClient } from "../../client/mcpClient";
import { ConnectionStatus } from "../../types/extension";

// Mock VSCode
jest.mock("vscode");

describe("StatusBarManager Integration", () => {
  let statusBarManager: StatusBarManagerImpl;
  let mcpClient: MCPClient;
  let mockStatusBarItem: any;
  let mockAxios: any;

  beforeEach(() => {
    jest.clearAllMocks();

    // Create mock status bar item
    mockStatusBarItem = {
      text: "",
      tooltip: "",
      backgroundColor: undefined,
      command: "",
      show: jest.fn(),
      dispose: jest.fn(),
    };

    (vscode.window.createStatusBarItem as jest.Mock).mockReturnValue(
      mockStatusBarItem
    );
    (vscode.window.showInformationMessage as jest.Mock).mockResolvedValue(
      undefined
    );

    // Mock workspace configuration
    const mockConfig = {
      get: jest.fn((key: string, defaultValue?: any) => {
        if (key === "mcpServer.port") {
          return 3000;
        }
        if (key === "mcpServer.timeout") {
          return 5000;
        }
        return defaultValue;
      }),
    };
    (vscode.workspace.getConfiguration as jest.Mock).mockReturnValue(
      mockConfig
    );

    // Create real MCP client (will be mocked at HTTP level)
    mcpClient = new MCPClient(3000, 5000);

    // Mock axios for HTTP requests
    mockAxios = require("axios");
    mockAxios.create = jest.fn().mockReturnValue({
      post: jest.fn(),
    });
    mockAxios.isAxiosError = jest.fn().mockReturnValue(false);
  });

  afterEach(() => {
    if (statusBarManager) {
      statusBarManager.dispose();
    }
  });

  describe("initialization with MCP client", () => {
    it("should create status bar manager with MCP client", () => {
      statusBarManager = new StatusBarManagerImpl(mcpClient);

      expect(mockStatusBarItem.command).toBe(
        "enterprise-ai-context.showStatus"
      );
      expect(mockStatusBarItem.show).toHaveBeenCalled();
      expect(mockStatusBarItem.text).toBe("$(x) AI Context");
    });
  });

  describe("status display workflow", () => {
    beforeEach(() => {
      statusBarManager = new StatusBarManagerImpl(mcpClient);
    });

    it("should show appropriate message and actions for each status", () => {
      // Test connected status
      statusBarManager.updateConnectionStatus(ConnectionStatus.Connected);
      statusBarManager.showHealthMetrics();

      expect(vscode.window.showInformationMessage).toHaveBeenCalledWith(
        "Enterprise AI Context is connected and ready.",
        "Open Settings"
      );

      // Test disconnected status
      statusBarManager.updateConnectionStatus(ConnectionStatus.Disconnected);
      statusBarManager.showHealthMetrics();

      expect(vscode.window.showInformationMessage).toHaveBeenCalledWith(
        "Enterprise AI Context is disconnected. The MCP server may not be running.",
        "Reconnect",
        "Open Settings"
      );

      // Test error status
      statusBarManager.updateConnectionStatus(ConnectionStatus.Error);
      statusBarManager.showHealthMetrics();

      expect(vscode.window.showInformationMessage).toHaveBeenCalledWith(
        "Enterprise AI Context encountered a connection error.",
        "Reconnect",
        "Open Settings"
      );
    });

    it("should handle reconnect action with MCP client", async () => {
      // Mock user clicking reconnect
      (vscode.window.showInformationMessage as jest.Mock).mockResolvedValue(
        "Reconnect"
      );

      // Set to disconnected state
      statusBarManager.updateConnectionStatus(ConnectionStatus.Disconnected);

      // Clear mock calls to track reconnect behavior
      mockAxios.create.mockClear();

      // Trigger reconnect
      statusBarManager.showHealthMetrics();
      await Promise.resolve();

      // Should have created new HTTP client with updated config
      expect(mockAxios.create).toHaveBeenCalledWith({
        baseURL: "http://localhost:3000/rpc",
        timeout: 5000,
        headers: {
          "Content-Type": "application/json",
        },
      });
    });
  });

  describe("connection monitoring integration", () => {
    beforeEach(() => {
      statusBarManager = new StatusBarManagerImpl(mcpClient);
    });

    it("should integrate with MCP client for connection status", () => {
      // Test that status bar manager can update connection status
      statusBarManager.updateConnectionStatus(ConnectionStatus.Connected);
      expect(mockStatusBarItem.text).toBe("$(check) AI Context");

      statusBarManager.updateConnectionStatus(ConnectionStatus.Error);
      expect(mockStatusBarItem.text).toBe("$(warning) AI Context");

      statusBarManager.updateConnectionStatus(ConnectionStatus.Connecting);
      expect(mockStatusBarItem.text).toBe("$(sync~spin) AI Context");

      statusBarManager.updateConnectionStatus(ConnectionStatus.Disconnected);
      expect(mockStatusBarItem.text).toBe("$(x) AI Context");
    });

    it("should handle click events and show status", () => {
      const showHealthMetricsSpy = jest.spyOn(
        statusBarManager,
        "showHealthMetrics"
      );

      statusBarManager.handleStatusClick();

      expect(showHealthMetricsSpy).toHaveBeenCalled();
    });
  });

  describe("resource cleanup", () => {
    it("should properly dispose of resources", () => {
      statusBarManager = new StatusBarManagerImpl(mcpClient);

      statusBarManager.dispose();

      expect(mockStatusBarItem.dispose).toHaveBeenCalled();
    });
  });
});
