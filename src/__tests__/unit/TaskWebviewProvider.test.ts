/**
 * TaskWebviewProvider Unit Tests
 * Tests for TaskWebviewProvider class functionality
 * Task WV-014-VALIDATE: File path validation for git operations
 */

import { TaskWebviewProvider } from "../../tasks/providers/TaskWebviewProvider";
import { TasksDataService } from "../../services";
import * as vscode from "vscode";

// Mock vscode.ExtensionContext
const mockContext = {
  workspaceState: {
    get: jest.fn(),
    update: jest.fn(),
  },
  subscriptions: [],
} as unknown as vscode.ExtensionContext;

// Mock TasksDataService
const mockTasksDataService = {
  getTasks: jest.fn(),
  onTasksUpdated: { event: jest.fn() },
  onError: { event: jest.fn() },
  refreshTasks: jest.fn(),
} as unknown as TasksDataService;

describe("TaskWebviewProvider", () => {
  let provider: TaskWebviewProvider;

  beforeEach(() => {
    provider = new TaskWebviewProvider(mockTasksDataService, mockContext);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("validateFilePath", () => {
    test("should reject path traversal attempts", () => {
      // Arrange
      const maliciousPath = "../../../etc/passwd";

      // Act & Assert
      expect(() => (provider as any).validateFilePath(maliciousPath)).toThrow(
        "File path cannot contain path traversal sequences (..)"
      );
    });

    test("should reject absolute paths", () => {
      // Arrange
      const absolutePath = "/etc/hosts";

      // Act & Assert
      expect(() => (provider as any).validateFilePath(absolutePath)).toThrow(
        "File path must be relative to workspace root"
      );
    });

    test("should reject paths starting with separators", () => {
      // Arrange
      const separatorPath = "./src/components/TaskViewer.ts";

      // Act & Assert
      expect(() => (provider as any).validateFilePath(separatorPath)).toThrow(
        "File path should not start with separator"
      );
    });

    test("should reject empty or whitespace-only paths", () => {
      // Arrange
      const emptyPath = "";
      const whitespacePath = "   ";

      // Act & Assert
      expect(() => (provider as any).validateFilePath(emptyPath)).toThrow(
        "File path is required and must be a string"
      );
      expect(() => (provider as any).validateFilePath(whitespacePath)).toThrow(
        "File path is required and must be a string"
      );
    });

    test("should reject non-string inputs", () => {
      // Arrange
      const nullPath = null as any;
      const undefinedPath = undefined as any;
      const numberPath = 123 as any;

      // Act & Assert
      expect(() => (provider as any).validateFilePath(nullPath)).toThrow(
        "File path is required and must be a string"
      );
      expect(() => (provider as any).validateFilePath(undefinedPath)).toThrow(
        "File path is required and must be a string"
      );
      expect(() => (provider as any).validateFilePath(numberPath)).toThrow(
        "File path is required and must be a string"
      );
    });

    test("should reject paths with leading/trailing whitespace", () => {
      // Arrange
      const whitespacePath = "  src/components/TaskViewer.ts  ";

      // Act & Assert
      expect(() => (provider as any).validateFilePath(whitespacePath)).toThrow(
        "File path contains leading or trailing whitespace"
      );
    });

    test("should accept valid relative paths", () => {
      // Arrange
      const validPaths = [
        "src/components/TaskViewer.ts",
        "package.json",
        "src/__tests__/unit/TaskWebviewProvider.test.ts",
        "dist/extension.js",
        "README.md",
      ];

      // Act & Assert
      validPaths.forEach((path) => {
        const result = (provider as any).validateFilePath(path);
        expect(result).toBe(path);
      });
    });

    test("should accept paths with subdirectories and extensions", () => {
      // Arrange
      const complexPath = "src/tasks/providers/TaskWebviewProvider.ts";

      // Act
      const result = (provider as any).validateFilePath(complexPath);

      // Assert
      expect(result).toBe(complexPath);
    });
  });
});
