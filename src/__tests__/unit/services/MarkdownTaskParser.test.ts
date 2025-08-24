/**
 * MarkdownTaskParser Unit Tests
 * Recovery Task 2.1.2: Test minimal class structure
 * Recovery Task 2.1.3: Test parseTasksFromFile method with mock data
 * Recovery Task 2.1.4: Test parseTaskFromMarkdown method for individual task parsing
 * Requirements: 3.1.1 - Basic MarkdownTaskParser instantiation
 */

import { jest } from "@jest/globals";
import { promises as fs } from "fs";
import { MarkdownTaskParser } from "../../../services/MarkdownTaskParser";
import {
  Task,
  TaskStatus,
  TaskComplexity,
  TaskPriority,
} from "../../../types/tasks";

describe("MarkdownTaskParser", () => {
  let parser: MarkdownTaskParser;

  beforeEach(() => {
    parser = new MarkdownTaskParser();
  });

  // Test 1: Basic instantiation
  it("should create MarkdownTaskParser instance successfully", () => {
    expect(parser).toBeDefined();
    expect(parser).toBeInstanceOf(MarkdownTaskParser);
  });

  // Test 2: Constructor behavior
  it("should not throw error when constructor is called", () => {
    expect(() => {
      new MarkdownTaskParser();
    }).not.toThrow();
  });

  // Test 3: Import/export
  it("should be importable as a class", () => {
    expect(MarkdownTaskParser).toBeDefined();
    expect(typeof MarkdownTaskParser).toBe("function");
  });

  // Test 4: Type checking
  it("should be instanceof MarkdownTaskParser", () => {
    expect(parser).toBeInstanceOf(MarkdownTaskParser);
  });

  describe("MarkdownTaskParser - parseTasksFromFile", () => {
    // Test 1: Return type and promise
    it("should return Promise<Task[]> when parseTasksFromFile is called", async () => {
      // Arrange
      const mockFileContent = `
- [x] 1.1 Create basic structure ✅
- [ ] 1.2 Add functionality
`;
      jest.spyOn(fs, "readFile").mockResolvedValue(mockFileContent);

      const result = parser.parseTasksFromFile("test.md");
      expect(result).toBeInstanceOf(Promise);

      const tasks = await result;
      expect(Array.isArray(tasks)).toBe(true);
      expect(tasks.length).toBeGreaterThan(0);
    });

    // Test 2: Mock data structure
    it("should return array of valid Task objects with required properties", async () => {
      // Arrange
      const mockFileContent = `
- [x] 2.1 Create basic structure ✅
- [ ] 2.2 Add functionality
- [x] 2.3 Test implementation ✅
`;
      jest.spyOn(fs, "readFile").mockResolvedValue(mockFileContent);

      const tasks = await parser.parseTasksFromFile("test.md");

      expect(tasks.length).toBeGreaterThanOrEqual(2);
      expect(tasks.length).toBeLessThanOrEqual(10);

      tasks.forEach((task) => {
        expect(task).toHaveProperty("id");
        expect(task).toHaveProperty("title");
        expect(task).toHaveProperty("description");
        expect(task).toHaveProperty("status");
        expect(task).toHaveProperty("complexity");
        expect(task).toHaveProperty("dependencies");
        expect(task).toHaveProperty("requirements");
        expect(task).toHaveProperty("createdDate");
        expect(task).toHaveProperty("lastModified");
      });
    });

    // Test 3: Consistent structure (content may vary due to randomization)
    it("should return consistent structure on multiple calls", async () => {
      // Arrange
      const mockFileContent = `
- [x] 3.1 Create basic structure ✅
- [ ] 3.2 Add functionality
- [x] 3.3 Test implementation ✅
`;
      jest.spyOn(fs, "readFile").mockResolvedValue(mockFileContent);

      const firstCall = await parser.parseTasksFromFile("test1.md");
      const secondCall = await parser.parseTasksFromFile("test2.md");

      // Structure should be consistent
      expect(firstCall.length).toBe(secondCall.length);

      // Check that task IDs are consistent
      const firstIds = firstCall.map((t) => t.id).sort();
      const secondIds = secondCall.map((t) => t.id).sort();
      expect(firstIds).toEqual(secondIds);

      // Check that all tasks have the same structure
      firstCall.forEach((task, index) => {
        const secondTask = secondCall[index];
        expect(task.id).toBe(secondTask.id);
        expect(task.title).toBe(secondTask.title);
        expect(task.status).toBe(secondTask.status);
        expect(task.complexity).toBe(secondTask.complexity);
        expect(task.dependencies).toEqual(secondTask.dependencies);
        expect(task.requirements).toEqual(secondTask.requirements);
      });
    });

    // Test 4: Different task statuses
    it("should return tasks with different status values", async () => {
      // Arrange
      const mockFileContent = `
- [x] 4.1 Create basic structure ✅
- [ ] 4.2 Add functionality
- [x] 4.3 Test implementation ✅
`;
      jest.spyOn(fs, "readFile").mockResolvedValue(mockFileContent);

      const tasks = await parser.parseTasksFromFile("test.md");

      const statuses = tasks.map((t) => t.status);
      const uniqueStatuses = [...new Set(statuses)];

      expect(uniqueStatuses.length).toBeGreaterThan(1);
      expect(statuses).toContain(TaskStatus.COMPLETED);
      expect(statuses).toContain(TaskStatus.NOT_STARTED);
    });

    // Test 5: File reading errors are handled
    it("should handle file reading errors gracefully", async () => {
      // Arrange
      const errorMessage = "ENOENT: no such file or directory";
      jest.spyOn(fs, "readFile").mockRejectedValue(new Error(errorMessage));

      // Act & Assert
      await expect(parser.parseTasksFromFile("nonexistent.md")).rejects.toThrow(
        "Could not read tasks file: ENOENT: no such file or directory"
      );
    });

    // DATA-001: Test file reading functionality
    it("should read and parse tasks from actual tasks.md file", async () => {
      // Arrange
      const mockFileContent = `
### 1. Set up project structure
- [x] 1.1 Create directory structure for task management components ✅
- [ ] 1.2 Define core task type interfaces and enums
`;
      jest.spyOn(fs, "readFile").mockResolvedValue(mockFileContent);

      // Act
      const result = await parser.parseTasksFromFile("./tasks.md");

      // Assert
      expect(result).toHaveLength(2);
      expect(result[0].id).toBe("1.1");
      expect(result[0].status).toBe(TaskStatus.COMPLETED);
      expect(result[1].id).toBe("1.2");
      expect(result[1].status).toBe(TaskStatus.NOT_STARTED);
    });

    // DATA-001: Test file reading error handling
    it("should throw descriptive error when file cannot be read", async () => {
      // Arrange
      const filePath = "./nonexistent.md";
      const errorMessage = "ENOENT: no such file or directory";
      jest.spyOn(fs, "readFile").mockRejectedValue(new Error(errorMessage));

      // Act & Assert
      await expect(parser.parseTasksFromFile(filePath)).rejects.toThrow(
        "Could not read tasks file: ENOENT: no such file or directory"
      );
    });

    // DATA-001: Test parseTasksFromMarkdownContent method
    it("should parse markdown content into Task objects", () => {
      // Arrange
      const markdownContent = `
- [x] 2.1 Create basic structure ✅
- [ ] 2.2 Add functionality
- [x] 2.3 Test implementation ✅
`;

      // Act
      const result = parser.parseTasksFromMarkdownContent(markdownContent);

      // Assert
      expect(result).toHaveLength(3);
      expect(result[0].id).toBe("2.1");
      expect(result[0].status).toBe(TaskStatus.COMPLETED);
      expect(result[1].id).toBe("2.2");
      expect(result[1].status).toBe(TaskStatus.NOT_STARTED);
      expect(result[2].id).toBe("2.3");
      expect(result[2].status).toBe(TaskStatus.COMPLETED);
    });

    // DATA-001: Test empty markdown content handling
    it("should return empty array for empty markdown content", () => {
      // Arrange
      const emptyContent = "";
      const whitespaceContent = "   \n  \n  ";

      // Act
      const emptyResult = parser.parseTasksFromMarkdownContent(emptyContent);
      const whitespaceResult =
        parser.parseTasksFromMarkdownContent(whitespaceContent);

      // Assert
      expect(emptyResult).toEqual([]);
      expect(whitespaceResult).toEqual([]);
    });
  });

  describe("MarkdownTaskParser - parseTaskFromMarkdown", () => {
    // Test 1: Valid markdown parsing
    it("should parse valid task markdown into Task object", () => {
      const markdown =
        "- [ ] 1.1 Setup Project Structure\n  - Description: Create directories";
      const task = parser.parseTaskFromMarkdown(markdown);

      expect(task).not.toBeNull();
      expect(task).toHaveProperty("id", "1.1");
      expect(task).toHaveProperty("title", "Setup Project Structure");
      expect(task).toHaveProperty("status", TaskStatus.NOT_STARTED);
    });

    // Test 2: Null for invalid input
    it("should return null for invalid markdown format", () => {
      const invalidInputs = [
        "Invalid markdown format",
        "- 1.1 Missing checkbox",
        "1.1 No dash prefix",
        "Just some text",
      ];

      invalidInputs.forEach((input) => {
        const result = parser.parseTaskFromMarkdown(input);
        expect(result).toBeNull();
      });
    });

    // Test 3: Required properties
    it("should extract all required Task properties from markdown", () => {
      const markdown =
        "- [x] 2.3 Implement Data Models\n  - Description: Create interfaces";
      const task = parser.parseTaskFromMarkdown(markdown);

      expect(task).not.toBeNull();
      expect(task).toHaveProperty("id");
      expect(task).toHaveProperty("title");
      expect(task).toHaveProperty("description");
      expect(task).toHaveProperty("status");
      expect(task).toHaveProperty("complexity");
      expect(task).toHaveProperty("dependencies");
      expect(task).toHaveProperty("requirements");
      expect(task).toHaveProperty("createdDate");
      expect(task).toHaveProperty("lastModified");
      expect(task).toHaveProperty("priority");
    });

    // Test 4: Status detection
    it("should detect completed status from [x] checkbox", () => {
      const completedMarkdown = "- [x] 3.1 Design Architecture";
      const notStartedMarkdown = "- [ ] 3.2 Implement Protocol";

      const completedTask = parser.parseTaskFromMarkdown(completedMarkdown);
      const notStartedTask = parser.parseTaskFromMarkdown(notStartedMarkdown);

      expect(completedTask).not.toBeNull();
      expect(notStartedTask).not.toBeNull();
      expect(completedTask?.status).toBe(TaskStatus.COMPLETED);
      expect(notStartedTask?.status).toBe(TaskStatus.NOT_STARTED);
    });

    // Test 5: Error handling
    it("should return null for empty or malformed input without throwing", () => {
      const problematicInputs = [
        "",
        "   ",
        null as any,
        undefined as any,
        "- [invalid] 1.1 Bad format",
        "- [ ]",
        "- [ ] ",
        "[] 1.1 Missing dash",
      ];

      problematicInputs.forEach((input) => {
        expect(() => {
          const result = parser.parseTaskFromMarkdown(input);
          expect(result).toBeNull();
        }).not.toThrow();
      });
    });

    // Test 6: Edge cases
    it("should handle edge cases gracefully", () => {
      // Single character ID
      const singleCharId = "- [ ] A Simple Task";
      const singleCharTask = parser.parseTaskFromMarkdown(singleCharId);
      expect(singleCharTask).not.toBeNull();
      expect(singleCharTask?.id).toBe("A");
      expect(singleCharTask?.title).toBe("Simple Task");

      // Long title
      const longTitle =
        "- [ ] 1.1 This is a very long task title that should be parsed correctly";
      const longTitleTask = parser.parseTaskFromMarkdown(longTitle);
      expect(longTitleTask).not.toBeNull();
      expect(longTitleTask?.id).toBe("1.1");
      expect(longTitleTask?.title).toBe(
        "This is a very long task title that should be parsed correctly"
      );

      // Whitespace handling
      const whitespaceInput = "  - [ ]  1.1   Trimmed Task  ";
      const whitespaceTask = parser.parseTaskFromMarkdown(whitespaceInput);
      expect(whitespaceTask).not.toBeNull();
      expect(whitespaceTask?.id).toBe("1.1");
      expect(whitespaceTask?.title).toBe("Trimmed Task");
    });
  });

  describe("MarkdownTaskParser - updateTaskInFile", () => {
    // Reset mocks between tests to ensure isolation
    afterEach(() => {
      jest.restoreAllMocks();
    });

    // PERSIST-001: Test status update persistence
    it("should update task status in tasks.md file", async () => {
      // Arrange
      const mockFileContent = `
# Tasks
- [x] 1.1 Create directory structure ✅
- [ ] 1.2 Define core interfaces
`;
      const expectedContent = `
# Tasks
- [x] 1.1 Create directory structure ✅
- [x] 1.2 Define core interfaces ✅
`;
      jest.spyOn(fs, "readFile").mockResolvedValue(mockFileContent);
      jest.spyOn(fs, "writeFile").mockResolvedValue();

      // Act
      const result = await parser.updateTaskInFile("./tasks.md", "1.2", {
        status: TaskStatus.COMPLETED,
      });

      // Assert
      expect(result).toBe(true);
      expect(fs.writeFile).toHaveBeenCalledWith(
        "./tasks.md",
        expectedContent,
        "utf-8"
      );
    });

    // PERSIST-001: Test status icon mapping
    it("should apply correct status icons for different task statuses", async () => {
      // Arrange
      const mockFileContent = `
# Tasks
- [ ] 1.1 Task one
- [ ] 1.2 Task two
`;
      jest.spyOn(fs, "readFile").mockResolvedValue(mockFileContent);
      jest.spyOn(fs, "writeFile").mockResolvedValue();

      // Act - Update to different statuses
      await parser.updateTaskInFile("./tasks.md", "1.1", {
        status: TaskStatus.IN_PROGRESS,
      });
      await parser.updateTaskInFile("./tasks.md", "1.2", {
        status: TaskStatus.BLOCKED,
      });

      // Assert - Check that writeFile was called with correct icons
      expect(fs.writeFile).toHaveBeenCalledTimes(2);
      const firstCall = (fs.writeFile as jest.Mock).mock.calls[0];
      const secondCall = (fs.writeFile as jest.Mock).mock.calls[1];

      expect(firstCall[1]).toContain("🔄"); // IN_PROGRESS icon
      expect(secondCall[1]).toContain("❌"); // BLOCKED icon
    });

    // PERSIST-001: Test task not found scenario
    it("should return false when task ID is not found in file", async () => {
      // Arrange
      const mockFileContent = `
# Tasks
- [ ] 1.1 Task one
`;
      jest.spyOn(fs, "readFile").mockResolvedValue(mockFileContent);
      jest.spyOn(fs, "writeFile").mockResolvedValue();

      // Act
      const result = await parser.updateTaskInFile(
        "./tasks.md",
        "nonexistent",
        { status: TaskStatus.COMPLETED }
      );

      // Assert
      expect(result).toBe(false);
      expect(fs.writeFile).not.toHaveBeenCalled();
    });

    // PERSIST-001: Test file reading error handling
    it("should handle file reading errors gracefully", async () => {
      // Arrange
      const errorMessage = "ENOENT: no such file or directory";
      jest.spyOn(fs, "readFile").mockRejectedValue(new Error(errorMessage));

      // Act & Assert
      await expect(
        parser.updateTaskInFile("./nonexistent.md", "1.1", {
          status: TaskStatus.COMPLETED,
        })
      ).rejects.toThrow("ENOENT: no such file or directory");
    });

    // PERSIST-001: Test file writing error handling
    it("should handle file writing errors gracefully", async () => {
      // Arrange
      const mockFileContent = `
# Tasks
- [ ] 1.1 Task one
`;
      const errorMessage = "EACCES: permission denied";
      jest.spyOn(fs, "readFile").mockResolvedValue(mockFileContent);
      jest.spyOn(fs, "writeFile").mockRejectedValue(new Error(errorMessage));

      // Act & Assert
      await expect(
        parser.updateTaskInFile("./tasks.md", "1.1", {
          status: TaskStatus.COMPLETED,
        })
      ).rejects.toThrow("EACCES: permission denied");
    });
  });
});
