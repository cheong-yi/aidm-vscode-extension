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
        "Enterprise AI Context extension is now active!"
      );
    });
  });

  describe("deactivate", () => {
    it("should deactivate without errors", () => {
      expect(() => deactivate()).not.toThrow();
    });
  });
});
