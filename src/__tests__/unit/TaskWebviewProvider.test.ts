/**
 * TaskWebviewProvider Unit Tests
 * Tests the TaskWebviewProvider class implementation of vscode.WebviewViewProvider
 * Task WV-001: Create WebviewViewProvider Base Class
 */

import * as vscode from "vscode";
import { TaskWebviewProvider } from "../../tasks/providers/TaskWebviewProvider";

describe("TaskWebviewProvider", () => {
  let provider: TaskWebviewProvider;
  let mockWebviewView: vscode.WebviewView;
  let mockWebview: vscode.Webview;
  let mockContext: vscode.WebviewViewResolveContext;
  let mockToken: vscode.CancellationToken;

  beforeEach(() => {
    provider = new TaskWebviewProvider();

    // Mock webview view
    mockWebview = {
      options: {},
      html: "",
      onDidReceiveMessage: jest.fn(),
      postMessage: jest.fn(),
      asWebviewUri: jest.fn(),
      cspSource: "",
      onDidDispose: jest.fn(),
    } as unknown as vscode.Webview;

    mockWebviewView = {
      webview: mockWebview,
      title: "Taskmaster",
      description: "Task management webview",
      visible: true,
      onDidDispose: jest.fn(),
      onDidChangeVisibility: jest.fn(),
      show: jest.fn(),
      badge: undefined,
      onDidChangeBadge: jest.fn(),
    } as unknown as vscode.WebviewView;

    mockContext = {} as vscode.WebviewViewResolveContext;
    mockToken = {
      isCancellationRequested: false,
      onCancellationRequested: jest.fn(),
    } as unknown as vscode.CancellationToken;
  });

  describe("Interface Implementation", () => {
    it("should implement vscode.WebviewViewProvider interface correctly", () => {
      // Verify the class can be used as a WebviewViewProvider
      const webviewProvider: vscode.WebviewViewProvider = provider;
      expect(webviewProvider).toBeDefined();
      expect(typeof webviewProvider.resolveWebviewView).toBe("function");
    });

    it("should have resolveWebviewView method with correct signature", () => {
      expect(provider.resolveWebviewView).toBeDefined();
      expect(typeof provider.resolveWebviewView).toBe("function");
    });
  });

  describe("Constructor", () => {
    it("should create instance without errors", () => {
      expect(() => new TaskWebviewProvider()).not.toThrow();
    });

    it("should initialize with empty state", () => {
      expect(provider).toBeInstanceOf(TaskWebviewProvider);
    });
  });

  describe("resolveWebviewView", () => {
    it("should set webview options correctly", () => {
      provider.resolveWebviewView(mockWebviewView, mockContext, mockToken);

      expect(mockWebview.options).toEqual({
        enableScripts: true,
        localResourceRoots: [],
      });
    });

    it("should set HTML content", () => {
      provider.resolveWebviewView(mockWebviewView, mockContext, mockToken);

      expect(mockWebview.html).toContain("<!DOCTYPE html>");
      expect(mockWebview.html).toContain("Taskmaster");
      expect(mockWebview.html).toContain("Tasks Loading...");
    });

    it("should handle errors gracefully", () => {
      // Test that the method doesn't throw when called with valid parameters
      expect(() => {
        provider.resolveWebviewView(mockWebviewView, mockContext, mockToken);
      }).not.toThrow();
    });
  });

  describe("HTML Content Generation", () => {
    it("should return valid HTML structure", () => {
      // Access private method through public interface
      provider.resolveWebviewView(mockWebviewView, mockContext, mockToken);

      const html = mockWebview.html;
      expect(html).toMatch(/<!DOCTYPE html>/);
      expect(html).toMatch(/<html lang="en">/);
      expect(html).toMatch(/<head>/);
      expect(html).toMatch(/<body>/);
      expect(html).toMatch(/<title>Taskmaster<\/title>/);
      expect(html).toMatch(/<div id="taskmaster-root">/);
      expect(html).toMatch(/<h3>Tasks Loading...<\/h3>/);
    });

    it("should include proper meta tags", () => {
      provider.resolveWebviewView(mockWebviewView, mockContext, mockToken);

      const html = mockWebview.html;
      expect(html).toMatch(/<meta charset="UTF-8">/);
      expect(html).toMatch(
        /<meta name="viewport" content="width=device-width, initial-scale=1.0">/
      );
    });
  });
});
