/**
 * Basic extension tests
 */

import * as vscode from "vscode";
import { activate, deactivate } from "../extension";

describe("Extension", () => {
  let mockContext: vscode.ExtensionContext;

  beforeEach(() => {
    mockContext = {
      subscriptions: [],
      workspaceState: {
        get: jest.fn(),
        update: jest.fn(),
      },
      globalState: {
        get: jest.fn(),
        update: jest.fn(),
      },
      extensionPath: "/mock/path",
      storagePath: "/mock/storage",
      globalStoragePath: "/mock/global-storage",
      logPath: "/mock/log",
    } as any;
  });

  describe("activate", () => {
    it("should activate without errors", () => {
      expect(() => activate(mockContext)).not.toThrow();
    });

    it("should log activation message", () => {
      const consoleSpy = jest.spyOn(console, "log");
      activate(mockContext);
      expect(consoleSpy).toHaveBeenCalledWith(
        "🚀 AiDM VSCode Extension activation started!"
      );
    });

    it("should register TaskDetailCardProvider as webview view provider", () => {
      const registerWebviewViewProviderSpy = jest.spyOn(
        vscode.window,
        "registerWebviewViewProvider"
      );
      activate(mockContext);

      expect(registerWebviewViewProviderSpy).toHaveBeenCalledWith(
        "aidm-vscode-extension.task-details",
        expect.any(Object) // TaskDetailCardProvider instance
      );
    });

    it("should add webview provider registration to context subscriptions", () => {
      activate(mockContext);

      // Verify that the registration was added to subscriptions
      expect(mockContext.subscriptions.length).toBeGreaterThan(0);

      // Check if any subscription is related to webview provider
      const hasWebviewSubscription = mockContext.subscriptions.some(
        (sub) => sub && typeof sub === "object" && "dispose" in sub
      );
      expect(hasWebviewSubscription).toBe(true);
    });
  });

  describe("deactivate", () => {
    it("should deactivate without errors", () => {
      expect(() => deactivate()).not.toThrow();
    });
  });
});
