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

  describe("generateTaskMeta", () => {
    test("should generate metadata HTML with test strategy when present", () => {
      // Arrange
      const task = {
        id: "1",
        complexity: "high",
        estimatedDuration: "15-30 min",
        testStrategy:
          "Unit test client initializations in the Base Agent. Validate that `docker-compose up` successfully starts all required services without errors.",
      };

      // Act
      const result = (provider as any).generateTaskMeta(task);

      // Assert
      expect(result).toContain("Test Strategy");
      expect(result).toContain(
        "Unit test client initializations in the Base Agent"
      );
      expect(result).toContain("Complexity");
      expect(result).toContain("Estimated");
      expect(result).toContain("High");
      expect(result).toContain("15-30 min");
    });

    test("should generate metadata HTML with fallback text when test strategy is missing", () => {
      // Arrange
      const task = {
        id: "2",
        complexity: "medium",
        estimatedDuration: "20-25 min",
        // testStrategy is intentionally omitted
      };

      // Act
      const result = (provider as any).generateTaskMeta(task);

      // Assert
      expect(result).toContain("Test Strategy");
      expect(result).toContain("No test strategy specified");
      expect(result).toContain("Complexity");
      expect(result).toContain("Estimated");
      expect(result).toContain("Medium");
      expect(result).toContain("20-25 min");
    });

    test("should generate metadata HTML with fallback text when test strategy is empty", () => {
      // Arrange
      const task = {
        id: "3",
        complexity: "low",
        estimatedDuration: "10-15 min",
        testStrategy: "",
      };

      // Act
      const result = (provider as any).generateTaskMeta(task);

      // Assert
      expect(result).toContain("Test Strategy");
      expect(result).toContain("No test strategy specified");
      expect(result).toContain("Complexity");
      expect(result).toContain("Estimated");
      expect(result).toContain("Low");
      expect(result).toContain("10-15 min");
    });

    test("should generate metadata HTML with fallback text when test strategy is whitespace only", () => {
      // Arrange
      const task = {
        id: "4",
        complexity: "high",
        estimatedDuration: "30-45 min",
        testStrategy: "   ",
      };

      // Act
      const result = (provider as any).generateTaskMeta(task);

      // Assert
      expect(result).toContain("Test Strategy");
      expect(result).toContain("No test strategy specified");
      expect(result).toContain("Complexity");
      expect(result).toContain("Estimated");
      expect(result).toContain("High");
      expect(result).toContain("30-45 min");
    });

    test("should escape HTML in test strategy content", () => {
      // Arrange
      const task = {
        id: "5",
        complexity: "medium",
        estimatedDuration: "15-20 min",
        testStrategy:
          "Test with <script>alert('xss')</script> and > < characters",
      };

      // Act
      const result = (provider as any).generateTaskMeta(task);

      // Assert
      expect(result).toContain("Test Strategy");
      expect(result).toContain(
        "&lt;script&gt;alert(&#39;xss&#39;)&lt;/script&gt;"
      );
      expect(result).not.toContain("<script>");
      expect(result).not.toContain("alert('xss')");
    });
  });

  describe("generateTestStrategy", () => {
    test("should generate test strategy HTML when test strategy is present", () => {
      // Arrange
      const task = {
        id: "1",
        testStrategy:
          "Unit test client initializations in the Base Agent. Validate that `docker-compose up` successfully starts all required services without errors.",
      };

      // Act
      const result = (provider as any).generateTestStrategy(task);

      // Assert
      expect(result).toContain("task-test-strategy");
      expect(result).toContain("test-strategy-title");
      expect(result).toContain("test-strategy-content");
      expect(result).toContain("Test Strategy");
      expect(result).toContain(
        "Unit test client initializations in the Base Agent"
      );
    });

    test("should generate test strategy HTML with fallback when test strategy is missing", () => {
      // Arrange
      const task = {
        id: "2",
        // testStrategy is intentionally omitted
      };

      // Act
      const result = (provider as any).generateTestStrategy(task);

      // Assert
      expect(result).toContain("task-test-strategy");
      expect(result).toContain("Test Strategy");
      expect(result).toContain("No test strategy specified");
    });

    test("should generate test strategy HTML with fallback when test strategy is empty", () => {
      // Arrange
      const task = {
        id: "3",
        testStrategy: "",
      };

      // Act
      const result = (provider as any).generateTestStrategy(task);

      // Assert
      expect(result).toContain("task-test-strategy");
      expect(result).toContain("Test Strategy");
      expect(result).toContain("No test strategy specified");
    });

    test("should escape HTML in test strategy content", () => {
      // Arrange
      const task = {
        id: "4",
        testStrategy:
          "Test with <script>alert('xss')</script> and > < characters",
      };

      // Act
      const result = (provider as any).generateTestStrategy(task);

      // Assert
      expect(result).toContain(
        "&lt;script&gt;alert(&#39;xss&#39;)&lt;/script&gt;"
      );
      expect(result).not.toContain("<script>");
      expect(result).not.toContain("alert('xss')");
    });
  });

  describe("generateTaskDetails", () => {
    test("should include test strategy section between description and metadata", () => {
      // Arrange
      const task = {
        id: "1",
        description: "Test task description",
        testStrategy: "Unit test strategy for this task",
        complexity: "medium",
        estimatedDuration: "15-20 min",
        dependencies: [],
        testStatus: { totalTests: 0 },
        implementation: {},
      };

      // Act
      const result = (provider as any).generateTaskDetails(task);

      // Assert
      expect(result).toContain("task-description");
      expect(result).toContain("task-test-strategy");
      expect(result).toContain("task-meta");

      // Verify order: description -> test strategy -> metadata
      const descriptionIndex = result.indexOf("task-description");
      const testStrategyIndex = result.indexOf("task-test-strategy");
      const metadataIndex = result.indexOf("task-meta");

      expect(descriptionIndex).toBeLessThan(testStrategyIndex);
      expect(testStrategyIndex).toBeLessThan(metadataIndex);
    });

    test("should handle task without test strategy gracefully", () => {
      // Arrange
      const task = {
        id: "2",
        description: "Another test task",
        complexity: "low",
        estimatedDuration: "10-15 min",
        dependencies: [],
        testStatus: { totalTests: 0 },
        implementation: {},
        // testStrategy is intentionally omitted
      };

      // Act
      const result = (provider as any).generateTaskDetails(task);

      // Assert
      expect(result).toContain("task-description");
      expect(result).toContain("task-test-strategy");
      expect(result).toContain("No test strategy specified");
      expect(result).toContain("task-meta");
    });
  });
});
