/**
 * JSONTaskParser Unit Tests
 * CRITICAL-2: Test JSON parsing functionality for nested contexts
 */

import { JSONTaskParser } from "../../../services/JSONTaskParser";
import {
  Task,
  TaskStatus,
  TaskComplexity,
  TaskPriority,
} from "../../../types/tasks";

// Mock vscode module
jest.mock("vscode", () => ({
  Uri: {
    file: jest.fn((path: string) => ({
      fsPath: path,
      toString: () => `file://${path}`,
      scheme: "file",
      authority: "",
      path: path,
    })),
  },
  workspace: {
    fs: {
      readFile: jest.fn(),
      stat: jest.fn(),
    },
  },
  FileSystemError: class MockFileSystemError extends Error {
    code: string;
    constructor(code: string, message: string) {
      super(message);
      this.code = code;
    }
  },
  FileType: {
    File: 1,
  },
}));

describe("JSONTaskParser", () => {
  let parser: JSONTaskParser;
  const mockVscode = require("vscode");

  beforeEach(() => {
    parser = new JSONTaskParser();
    jest.clearAllMocks();
  });

  describe("VS Code Filesystem API Integration", () => {
    it("should use VS Code filesystem API to read task file", async () => {
      // Arrange
      const fileUri = mockVscode.Uri.file("/workspace/tasks.json");
      const mockFileContent = Buffer.from(
        '{"master":{"tasks":[{"id":"1","title":"Test"}]}}',
        "utf8"
      );
      mockVscode.workspace.fs.readFile = jest
        .fn()
        .mockResolvedValue(mockFileContent);
      mockVscode.workspace.fs.stat = jest.fn().mockResolvedValue({
        type: mockVscode.FileType.File,
        size: 100,
      });

      // Act
      const result = await parser.parseTasksFromFile(fileUri);

      // Assert
      expect(mockVscode.workspace.fs.readFile).toHaveBeenCalledWith(fileUri);
      expect(mockVscode.workspace.fs.stat).toHaveBeenCalledWith(fileUri);
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe("1");
    });

    it("should reject malformed URIs with corrupted paths", async () => {
      // Arrange
      const malformedUri = {
        fsPath: "\\\\tasks.json",
        toString: () => "file:///\\\\tasks.json",
        scheme: "file",
        authority: "",
        path: "/\\\\tasks.json",
      };

      // Act & Assert
      await expect(
        parser.parseTasksFromFile(malformedUri as any)
      ).rejects.toThrow("Malformed URI detected");
    });

    it("should handle FileNotFound errors from VS Code API", async () => {
      // Arrange
      const fileUri = mockVscode.Uri.file("/nonexistent/tasks.json");
      const fileSystemError = new mockVscode.FileSystemError(
        "FileNotFound",
        "File not found"
      );
      mockVscode.workspace.fs.stat = jest
        .fn()
        .mockRejectedValue(fileSystemError);

      // Act & Assert
      await expect(parser.parseTasksFromFile(fileUri)).rejects.toThrow(
        "Tasks file validation failed: Tasks file not found: /nonexistent/tasks.json"
      );
    });

    it("should handle NoPermissions errors from VS Code API", async () => {
      // Arrange
      const fileUri = mockVscode.Uri.file("/restricted/tasks.json");
      const fileSystemError = new mockVscode.FileSystemError(
        "NoPermissions",
        "Permission denied"
      );
      mockVscode.workspace.fs.stat = jest
        .fn()
        .mockRejectedValue(fileSystemError);

      // Act & Assert
      await expect(parser.parseTasksFromFile(fileUri)).rejects.toThrow(
        "Tasks file validation failed: Cannot read tasks file: Permission denied for /restricted/tasks.json"
      );
    });

    it("should log comprehensive URI validation details", async () => {
      // Arrange
      const consoleSpy = jest.spyOn(console, "log");
      const fileUri = mockVscode.Uri.file("\\tasks.json");
      mockVscode.workspace.fs.stat = jest
        .fn()
        .mockRejectedValue(
          new mockVscode.FileSystemError("FileNotFound", "File not found")
        );

      // Act
      try {
        await parser.parseTasksFromFile(fileUri);
      } catch (error) {
        // Expected to fail, we're testing logging
      }

      // Assert - Verify our enhanced URI validation logging statements
      expect(consoleSpy).toHaveBeenCalledWith(
        "[JSONTaskParser] Processing URI: file://\\tasks.json"
      );
      expect(consoleSpy).toHaveBeenCalledWith(
        "[JSONTaskParser] FSPath: \\tasks.json"
      );
      expect(consoleSpy).toHaveBeenCalledWith(
        "[JSONTaskParser] Path segments:",
        ["\\tasks.json"]
      );
      expect(consoleSpy).toHaveBeenCalledWith("[JSONTaskParser] Scheme: file");
      expect(consoleSpy).toHaveBeenCalledWith("[JSONTaskParser] Authority: ");

      // Verify that we're getting comprehensive logging (5 total calls for URI validation)
      expect(consoleSpy).toHaveBeenCalledTimes(5);

      consoleSpy.mockRestore();
    });
  });

  describe("parseTasksFromJSONContent", () => {
    it("should parse nested contexts JSON structure", async () => {
      const jsonData = {
        master: {
          tasks: [
            {
              id: 1,
              title: "Test Task 1",
              description: "Test Description 1",
              details: "Test Details 1", // Added: test new details field
              testStrategy: "Test Strategy 1", // Added: test new testStrategy field
              priority: "high",
              dependencies: [],
              status: "done",
              subtasks: [], // Added: test new subtasks field
            },
          ],
        },
        "sldc-code-ingestrion": {
          tasks: [
            {
              id: 2,
              title: "Test Task 2",
              description: "Test Description 2",
              details: "Test Details 2", // Added: test new details field
              testStrategy: "Test Strategy 2", // Added: test new testStrategy field
              priority: "medium",
              dependencies: [1],
              status: "pending",
              subtasks: [], // Added: test new subtasks field
            },
          ],
        },
      };

      const result = parser.parseTasksFromJSONContent(jsonData);

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe("1");
      expect(result[0].title).toBe("Test Task 1");
      expect(result[0].details).toBe("Test Details 1"); // Added: verify details field
      expect(result[0].testStrategy).toBe("Test Strategy 1"); // Added: verify testStrategy field
      expect(result[0].subtasks).toEqual([]); // Added: verify subtasks field
      expect(result[0].status).toBe(TaskStatus.COMPLETED);
      expect(result[0].complexity).toBe(TaskComplexity.HIGH);
      expect(result[1].id).toBe("2");
      expect(result[1].title).toBe("Test Task 2");
      expect(result[1].details).toBe("Test Details 2"); // Added: verify details field
      expect(result[1].testStrategy).toBe("Test Strategy 2"); // Added: verify testStrategy field
      expect(result[1].subtasks).toEqual([]); // Added: verify subtasks field
      expect(result[1].status).toBe(TaskStatus.NOT_STARTED);
      expect(result[1].complexity).toBe(TaskComplexity.MEDIUM);
    });

    it("should handle empty JSON data", () => {
      const result = parser.parseTasksFromJSONContent({});
      expect(result).toHaveLength(0);
    });

    it("should handle malformed JSON data", () => {
      const result = parser.parseTasksFromJSONContent(null);
      expect(result).toHaveLength(0);
    });

    it("should map status values correctly", () => {
      // Arrange
      const jsonData = {
        test: {
          tasks: [
            { id: "1", title: "Task 1", status: "not_started" },
            { id: "2", title: "Task 2", status: "in_progress" },
            { id: "3", title: "Task 3", status: "review" }, // Old value
            { id: "4", title: "Task 4", status: "ready_for_review" }, // New value
            { id: "5", title: "Task 5", status: "completed" },
          ],
        },
      };

      // Act
      const result = parser.parseTasksFromJSONContent(jsonData);

      // Assert
      expect(result).toHaveLength(5);
      expect(result[0].status).toBe(TaskStatus.NOT_STARTED);
      expect(result[1].status).toBe(TaskStatus.IN_PROGRESS);
      expect(result[2].status).toBe(TaskStatus.REVIEW); // Should map old "review" to REVIEW
      expect(result[3].status).toBe(TaskStatus.REVIEW); // Should map new "ready_for_review" to REVIEW
      expect(result[4].status).toBe(TaskStatus.COMPLETED);
    });

    it("should provide default values for missing fields", () => {
      const mockJSONData = {
        test: {
          tasks: [
            {
              id: 1,
              title: "Minimal Task",
            },
          ],
        },
      };

      const result = parser.parseTasksFromJSONContent(mockJSONData);

      expect(result[0].description).toBe("Minimal Task");
      expect(result[0].status).toBe(TaskStatus.NOT_STARTED);
      expect(result[0].complexity).toBe(TaskComplexity.LOW);
      expect(result[0].priority).toBe(TaskPriority.MEDIUM);
      expect(result[0].dependencies).toEqual([]);
      expect(result[0].requirements).toEqual(["1"]);
      expect(result[0].estimatedDuration).toBe("15-20 min");
      expect(result[0].isExecutable).toBe(true);
    });
  });

  describe("flattenContexts", () => {
    it("should flatten nested contexts into single task array", () => {
      const mockJSONData = {
        context1: {
          tasks: [
            { id: 1, title: "Task 1" },
            { id: 2, title: "Task 2" },
          ],
        },
        context2: {
          tasks: [{ id: 3, title: "Task 3" }],
        },
      };

      // Access private method for testing
      const result = (parser as any).flattenContexts(mockJSONData);

      expect(result).toHaveLength(3);
      expect(result[0].id).toBe(1);
      expect(result[0].context).toBe("context1");
      expect(result[1].id).toBe(2);
      expect(result[1].context).toBe("context1");
      expect(result[2].id).toBe(3);
      expect(result[2].context).toBe("context2");
    });
  });
});
