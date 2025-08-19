/**
 * Unit tests for StatusBarManager
 */

import * as vscode from "vscode";
import { StatusBarManagerImpl } from "../../ui/statusBar";
import { MCPClient } from "../../client/mcpClient";
import { ConnectionStatus } from "../../types/extension";

// Mock VSCode
jest.mock("vscode");

// Mock MCPClient
jest.mock("../../client/mcpClient");

describe("StatusBarManagerImpl", () => {
  let statusBarManager: StatusBarManagerImpl;
  let mockMCPClient: jest.Mocked<MCPClient>;
  let mockStatusBarItem: any;
  let mockShowInformationMessage: jest.Mock;
  let mockExecuteCommand: jest.Mock;

  beforeEach(() => {
    // Reset all mocks
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

    // Mock VSCode window methods
    mockShowInformationMessage = jest.fn().mockResolvedValue(undefined);
    mockExecuteCommand = jest.fn().mockResolvedValue(undefined);

    (vscode.window.createStatusBarItem as jest.Mock).mockReturnValue(
      mockStatusBarItem
    );
    (vscode.window.showInformationMessage as jest.Mock) =
      mockShowInformationMessage;
    (vscode.commands.executeCommand as jest.Mock) = mockExecuteCommand;

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

    // Create mock MCP client
    mockMCPClient = {
      ping: jest.fn(),
      updateConfig: jest.fn(),
    } as any;
  });

  afterEach(() => {
    if (statusBarManager) {
      statusBarManager.dispose();
    }
  });

  describe("initialization", () => {
    it("should create status bar item with correct properties", () => {
      // Create status bar manager
      statusBarManager = new StatusBarManagerImpl(mockMCPClient);

      expect(vscode.window.createStatusBarItem).toHaveBeenCalledWith(
        vscode.StatusBarAlignment.Right,
        100
      );
      expect(mockStatusBarItem.command).toBe(
        "enterprise-ai-context.showStatus"
      );
      expect(mockStatusBarItem.show).toHaveBeenCalled();
    });

    it("should initialize with disconnected status", () => {
      // Create status bar manager
      statusBarManager = new StatusBarManagerImpl(mockMCPClient);

      expect(mockStatusBarItem.text).toBe("$(x) AI Context");
      expect(mockStatusBarItem.tooltip).toBe(
        "Enterprise AI Context: Disconnected from MCP server"
      );
    });
  });

  describe("updateConnectionStatus", () => {
    beforeEach(() => {
      statusBarManager = new StatusBarManagerImpl(mockMCPClient);
    });

    it("should update status to connected", () => {
      statusBarManager.updateConnectionStatus(ConnectionStatus.Connected);

      expect(mockStatusBarItem.text).toBe("$(check) AI Context");
      expect(mockStatusBarItem.backgroundColor).toBeUndefined();
      expect(mockStatusBarItem.tooltip).toBe(
        "Enterprise AI Context: Connected to MCP server"
      );
    });

    it("should update status to connecting", () => {
      statusBarManager.updateConnectionStatus(ConnectionStatus.Connecting);

      expect(mockStatusBarItem.text).toBe("$(sync~spin) AI Context");
      expect(mockStatusBarItem.backgroundColor).toEqual(
        new vscode.ThemeColor("statusBarItem.warningBackground")
      );
      expect(mockStatusBarItem.tooltip).toBe(
        "Enterprise AI Context: Connecting to MCP server..."
      );
    });

    it("should update status to disconnected", () => {
      statusBarManager.updateConnectionStatus(ConnectionStatus.Disconnected);

      expect(mockStatusBarItem.text).toBe("$(x) AI Context");
      expect(mockStatusBarItem.backgroundColor).toEqual(
        new vscode.ThemeColor("statusBarItem.errorBackground")
      );
      expect(mockStatusBarItem.tooltip).toBe(
        "Enterprise AI Context: Disconnected from MCP server"
      );
    });

    it("should update status to error", () => {
      statusBarManager.updateConnectionStatus(ConnectionStatus.Error);

      expect(mockStatusBarItem.text).toBe("$(warning) AI Context");
      expect(mockStatusBarItem.backgroundColor).toEqual(
        new vscode.ThemeColor("statusBarItem.errorBackground")
      );
      expect(mockStatusBarItem.tooltip).toBe(
        "Enterprise AI Context: Connection error"
      );
    });
  });

  describe("showHealthMetrics", () => {
    beforeEach(() => {
      statusBarManager = new StatusBarManagerImpl(mockMCPClient);
    });

    it("should show connected status message with correct actions", () => {
      statusBarManager.updateConnectionStatus(ConnectionStatus.Connected);

      statusBarManager.showHealthMetrics();

      expect(mockShowInformationMessage).toHaveBeenCalledWith(
        "Enterprise AI Context is connected and ready.",
        "Open Settings"
      );
    });

    it("should show disconnected status message with reconnect action", () => {
      statusBarManager.updateConnectionStatus(ConnectionStatus.Disconnected);

      statusBarManager.showHealthMetrics();

      expect(mockShowInformationMessage).toHaveBeenCalledWith(
        "Enterprise AI Context is disconnected. The MCP server may not be running.",
        "Reconnect",
        "Open Settings"
      );
    });

    it("should show error status message with reconnect action", () => {
      statusBarManager.updateConnectionStatus(ConnectionStatus.Error);

      statusBarManager.showHealthMetrics();

      expect(mockShowInformationMessage).toHaveBeenCalledWith(
        "Enterprise AI Context encountered a connection error.",
        "Reconnect",
        "Open Settings"
      );
    });

    it("should handle open settings action", async () => {
      statusBarManager.updateConnectionStatus(ConnectionStatus.Connected);
      mockShowInformationMessage.mockResolvedValue("Open Settings");

      statusBarManager.showHealthMetrics();
      await Promise.resolve();

      expect(mockExecuteCommand).toHaveBeenCalledWith(
        "workbench.action.openSettings",
        "enterpriseAiContext"
      );
    });
  });

  describe("handleStatusClick", () => {
    beforeEach(() => {
      statusBarManager = new StatusBarManagerImpl(mockMCPClient);
    });

    it("should call showHealthMetrics", () => {
      const showHealthMetricsSpy = jest.spyOn(
        statusBarManager,
        "showHealthMetrics"
      );

      statusBarManager.handleStatusClick();

      expect(showHealthMetricsSpy).toHaveBeenCalled();
    });
  });

  describe("dispose", () => {
    it("should dispose status bar item", () => {
      statusBarManager = new StatusBarManagerImpl(mockMCPClient);

      statusBarManager.dispose();

      expect(mockStatusBarItem.dispose).toHaveBeenCalled();
    });
  });
});
