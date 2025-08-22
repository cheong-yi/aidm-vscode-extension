/**
 * MarkdownTaskParser Unit Tests
 * Recovery Task 2.1.2: Test minimal class structure
 * Recovery Task 2.1.3: Test parseTasksFromFile method with mock data
 * Recovery Task 2.1.4: Test parseTaskFromMarkdown method for individual task parsing
 * Requirements: 3.1.1 - Basic MarkdownTaskParser instantiation
 */

import { jest } from "@jest/globals";
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
      const result = parser.parseTasksFromFile("test.md");
      expect(result).toBeInstanceOf(Promise);

      const tasks = await result;
      expect(Array.isArray(tasks)).toBe(true);
      expect(tasks.length).toBeGreaterThan(0);
    });

    // Test 2: Mock data structure
    it("should return array of valid Task objects with required properties", async () => {
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

    // Test 3: Consistent data
    it("should return consistent mock data on multiple calls", async () => {
      const firstCall = await parser.parseTasksFromFile("test1.md");
      const secondCall = await parser.parseTasksFromFile("test2.md");

      expect(firstCall).toEqual(secondCall);
      expect(firstCall.length).toBe(secondCall.length);

      // Check that task IDs are consistent
      const firstIds = firstCall.map((t) => t.id).sort();
      const secondIds = secondCall.map((t) => t.id).sort();
      expect(firstIds).toEqual(secondIds);
    });

    // Test 4: Different task statuses
    it("should return tasks with different status values", async () => {
      const tasks = await parser.parseTasksFromFile("test.md");

      const statuses = tasks.map((t) => t.status);
      const uniqueStatuses = [...new Set(statuses)];

      expect(uniqueStatuses.length).toBeGreaterThan(1);
      expect(statuses).toContain(TaskStatus.COMPLETED);
      expect(statuses).toContain(TaskStatus.IN_PROGRESS);
    });

    // Test 5: No errors
    it("should not throw errors when called with any filePath", async () => {
      const testPaths = [
        "test.md",
        "README.md",
        "tasks.md",
        "nonexistent.md",
        "",
      ];

      for (const filePath of testPaths) {
        await expect(
          parser.parseTasksFromFile(filePath)
        ).resolves.toBeDefined();
      }
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
});
