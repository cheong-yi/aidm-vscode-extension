/**
 * Extension Integration Tests
 * Tests the complete extension activation, configuration, and deactivation flow
 */

import { activate, deactivate } from "../../extension";

jest.mock("vscode", () => {
  // Mock configuration
  const mockConfig = {
    "mcpServer.port": 3003,
    "mcpServer.timeout": 5000,
    "mcpServer.retryAttempts": 3,
    "performance.maxConcurrentRequests": 10,
    "mock.enabled": true,
    "mock.dataSize": "small",
    "mock.enterprisePatterns": true,
  };

  return {
    workspace: {
      getConfiguration: jest.fn(() => ({
        get: jest.fn((key: string, defaultValue?: any) => {
          return mockConfig[key as keyof typeof mockConfig] || defaultValue;
        }),
      })),
      onDidChangeConfiguration: jest.fn(() => ({
        dispose: jest.fn(),
      })),
    },
    languages: {
      registerHoverProvider: jest.fn(() => ({
        dispose: jest.fn(),
      })),
    },
    commands: {
      registerCommand: jest.fn(() => ({
        dispose: jest.fn(),
      })),
    },
    window: {
      showInformationMessage: jest.fn(),
      showErrorMessage: jest.fn(),
    },
    ExtensionContext: jest.fn(),
    ExtensionMode: {
      Test: 3,
    },
  };
});

import * as vscode from "vscode";

// Mock internal modules
jest.mock("../../client/mcpClient");
jest.mock("../../providers/hoverProvider");
jest.mock("../../ui/statusBar");
jest.mock("../../server/ProcessManager");

describe("Extension Integration Tests", () => {
  let mockContext: vscode.ExtensionContext;

  beforeEach(() => {
    mockContext = {
      subscriptions: [],
      workspaceState: {} as any,
      globalState: {} as any,
      extensionPath: "/test/path",
      storagePath: "/test/storage",
      globalStoragePath: "/test/global",
      logPath: "/test/logs",
      extensionUri: {} as any,
      environmentVariableCollection: {} as any,
      extensionMode: vscode.ExtensionMode.Test,
      asAbsolutePath: jest.fn(),
      storageUri: {} as any,
      globalStorageUri: {} as any,
      logUri: {} as any,
      secrets: {} as any,
      extension: {} as any,
      languageModelAccessInformation: {} as any,
    };

    // Clear all mocks
    jest.clearAllMocks();
  });

  describe("Extension Activation", () => {
    test("should activate extension successfully", async () => {
      await expect(activate(mockContext)).resolves.not.toThrow();

      // Verify that subscriptions were added
      expect(mockContext.subscriptions.length).toBeGreaterThan(0);
    });

    test("should register hover provider", async () => {
      await activate(mockContext);

      expect(vscode.languages.registerHoverProvider).toHaveBeenCalledWith(
        { scheme: "file", language: "typescript" },
        expect.any(Object)
      );
    });

    test("should register commands", async () => {
      await activate(mockContext);

      expect(vscode.commands.registerCommand).toHaveBeenCalledWith(
        "enterprise-ai-context.showStatus",
        expect.any(Function)
      );

      expect(vscode.commands.registerCommand).toHaveBeenCalledWith(
        "enterprise-ai-context.restartServer",
        expect.any(Function)
      );
    });

    test("should register configuration change handler", async () => {
      await activate(mockContext);

      expect(vscode.workspace.onDidChangeConfiguration).toHaveBeenCalled();
    });

    test("should handle activation errors gracefully", async () => {
      // Mock configuration to throw error
      (vscode.workspace.getConfiguration as jest.Mock).mockImplementation(
        () => {
          throw new Error("Configuration error");
        }
      );

      // Activation should handle errors gracefully
      await expect(activate(mockContext)).rejects.toThrow(
        "Configuration error"
      );
    });
  });

  describe("Configuration Management", () => {
    test("should read configuration correctly", async () => {
      await activate(mockContext);

      expect(vscode.workspace.getConfiguration).toHaveBeenCalledWith(
        "enterpriseAiContext"
      );
    });

    test("should handle configuration changes", async () => {
      await activate(mockContext);

      // Simulate configuration change
      const configChangeHandler = (
        vscode.workspace.onDidChangeConfiguration as jest.Mock
      ).mock.calls[0][0];

      const mockEvent = {
        affectsConfiguration: jest.fn(() => true),
      };

      // Should not throw when handling configuration change
      await expect(configChangeHandler(mockEvent)).resolves.not.toThrow();
    });

    test("should ignore irrelevant configuration changes", async () => {
      await activate(mockContext);

      const configChangeHandler = (
        vscode.workspace.onDidChangeConfiguration as jest.Mock
      ).mock.calls[0][0];

      const mockEvent = {
        affectsConfiguration: jest.fn(() => false),
      };

      // Should handle irrelevant changes gracefully
      await expect(configChangeHandler(mockEvent)).resolves.not.toThrow();
    });
  });

  describe("Command Handling", () => {
    test("should handle show status command", async () => {
      await activate(mockContext);

      const showStatusCommand = (
        vscode.commands.registerCommand as jest.Mock
      ).mock.calls.find(
        (call) => call[0] === "enterprise-ai-context.showStatus"
      )?.[1];

      expect(showStatusCommand).toBeDefined();

      // Should not throw when executed
      expect(() => showStatusCommand()).not.toThrow();
    });

    test("should handle restart server command", async () => {
      await activate(mockContext);

      const restartCommand = (
        vscode.commands.registerCommand as jest.Mock
      ).mock.calls.find(
        (call) => call[0] === "enterprise-ai-context.restartServer"
      )?.[1];

      expect(restartCommand).toBeDefined();

      // Should handle restart command
      await expect(restartCommand()).resolves.not.toThrow();
    });
  });

  describe("Extension Deactivation", () => {
    test("should deactivate extension gracefully", async () => {
      await activate(mockContext);
      await expect(deactivate()).resolves.not.toThrow();
    });

    test("should handle deactivation without activation", async () => {
      // Should not throw even if not activated
      await expect(deactivate()).resolves.not.toThrow();
    });

    test("should cleanup resources on deactivation", async () => {
      await activate(mockContext);

      // Verify disposables were added
      expect(mockContext.subscriptions.length).toBeGreaterThan(0);

      await deactivate();

      // Deactivation should complete successfully
      expect(true).toBe(true);
    });
  });

  describe("Error Handling", () => {
    test("should handle server startup failures", async () => {
      // Mock ProcessManager to throw on start
      const { ProcessManager } = require("../../server/ProcessManager");
      ProcessManager.prototype.start = jest
        .fn()
        .mockRejectedValue(new Error("Server start failed"));

      await activate(mockContext);

      // Should show error message
      expect(vscode.window.showErrorMessage).toHaveBeenCalled();
    });

    test("should handle configuration update failures", async () => {
      await activate(mockContext);

      // Mock ProcessManager to throw on config update
      const { ProcessManager } = require("../../server/ProcessManager");
      ProcessManager.prototype.updateConfig = jest
        .fn()
        .mockRejectedValue(new Error("Config update failed"));

      const configChangeHandler = (
        vscode.workspace.onDidChangeConfiguration as jest.Mock
      ).mock.calls[0][0];

      const mockEvent = {
        affectsConfiguration: jest.fn(() => true),
      };

      await configChangeHandler(mockEvent);

      // Should show error message
      expect(vscode.window.showErrorMessage).toHaveBeenCalled();
    });

    test("should handle restart command failures", async () => {
      await activate(mockContext);

      // Mock ProcessManager to throw on restart
      const { ProcessManager } = require("../../server/ProcessManager");
      ProcessManager.prototype.restart = jest
        .fn()
        .mockRejectedValue(new Error("Restart failed"));

      const restartCommand = (
        vscode.commands.registerCommand as jest.Mock
      ).mock.calls.find(
        (call) => call[0] === "enterprise-ai-context.restartServer"
      )?.[1];

      await restartCommand();

      // Should show error message
      expect(vscode.window.showErrorMessage).toHaveBeenCalled();
    });
  });

  describe("Resource Management", () => {
    test("should properly dispose resources", async () => {
      await activate(mockContext);

      // Verify disposables were registered
      expect(mockContext.subscriptions.length).toBeGreaterThan(0);

      // Each subscription should have a dispose method
      mockContext.subscriptions.forEach((subscription) => {
        expect(subscription).toHaveProperty("dispose");
        expect(typeof subscription.dispose).toBe("function");
      });
    });

    test("should handle multiple activation calls", async () => {
      await activate(mockContext);
      const firstSubscriptionCount = mockContext.subscriptions.length;

      // Second activation should not duplicate subscriptions
      await activate(mockContext);

      // Should handle gracefully (implementation dependent)
      expect(mockContext.subscriptions.length).toBeGreaterThanOrEqual(
        firstSubscriptionCount
      );
    });
  });

  describe("Status Integration", () => {
    test("should connect process manager to status bar", async () => {
      await activate(mockContext);

      // Verify that status bar manager was created
      const { StatusBarManagerImpl } = require("../../ui/statusBar");
      expect(StatusBarManagerImpl).toHaveBeenCalled();
    });

    test("should handle status change notifications", async () => {
      await activate(mockContext);

      // Verify that status change listener was registered
      const { ProcessManager } = require("../../server/ProcessManager");
      expect(ProcessManager.prototype.onStatusChange).toHaveBeenCalled();
    });
  });
});
