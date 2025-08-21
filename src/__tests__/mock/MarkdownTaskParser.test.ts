/**
 * MarkdownTaskParser Tests
 * Tests for parsing, validation, and serialization of tasks.md files
 * Requirements: 2.1, 3.1-3.6, 4.1-4.4, 7.1-7.6
 */

import { jest } from "@jest/globals";
import * as fs from "fs";
import * as path from "path";
import {
  MarkdownTaskParser,
  ParsedTaskSection,
  MarkdownParseResult,
} from "../../services/MarkdownTaskParser";
import {
  Task,
  TaskStatus,
  TaskComplexity,
  TaskPriority,
} from "../../types/tasks";
import { mockTaskData } from "../../mock/taskMockData";

// Mock fs module
jest.mock("fs");

// Mock the fs.promises object directly
const mockReadFile = jest.fn();
const mockWriteFile = jest.fn();

// Mock the entire fs module
const mockedFs = fs as jest.Mocked<typeof fs>;
mockedFs.promises = {
  readFile: mockReadFile,
  writeFile: mockWriteFile,
} as any;

describe("MarkdownTaskParser", () => {
  let parser: MarkdownTaskParser;
  let tempDir: string;

  beforeEach(() => {
    parser = new MarkdownTaskParser();
    tempDir = "/tmp/test-tasks";

    // Reset mocks
    jest.clearAllMocks();
  });

  describe("parseTasksFromFile", () => {
    it("should parse a valid tasks.md file correctly", async () => {
      const mockContent = `# Project Tasks

## Completed
- [x] 1.1 User Authentication System
  - Implement secure login/logout functionality
  - _Requirements: REQ-001, REQ-002_

## In Progress
- [ ] 1.2 Payment Processing
  - Integrate with payment gateway
  - _Requirements: REQ-003_

## Not Started
- [ ] 1.3 Reporting Dashboard
  - Create analytics dashboard
  - _Requirements: REQ-004_`;

      mockReadFile.mockResolvedValue(mockContent);

      const result = await parser.parseTasksFromFile("/path/to/tasks.md");

      expect(result.tasks).toHaveLength(3);
      expect(result.sections).toHaveLength(3);
      expect(result.metadata.totalTasks).toBe(3);
      expect(result.metadata.completedTasks).toBe(1);
      expect(result.metadata.inProgressTasks).toBe(1);
      expect(result.metadata.blockedTasks).toBe(0);
      expect(result.metadata.parseTime).toBeGreaterThan(0);
      expect(result.metadata.fileSize).toBe(mockContent.length);
    });

    it("should handle empty file gracefully", async () => {
      mockReadFile.mockResolvedValue("");

      const result = await parser.parseTasksFromFile("/path/to/empty.md");

      expect(result.tasks).toHaveLength(0);
      expect(result.sections).toHaveLength(0);
      expect(result.metadata.totalTasks).toBe(0);
    });

    it("should parse tasks without descriptions", async () => {
      const mockContent = `# Simple Tasks
- [x] 1.1 Task One
- [ ] 1.2 Task Two`;

      mockReadFile.mockResolvedValue(mockContent);

      const result = await parser.parseTasksFromFile("/path/to/simple.md");

      expect(result.tasks).toHaveLength(2);
      expect(result.tasks[0].description).toBe("");
      expect(result.tasks[1].description).toBe("");
    });

    it("should parse nested section structure", async () => {
      const mockContent = `# Main Project
## Phase 1
### Sprint 1
- [x] 1.1.1 Task A
- [ ] 1.1.2 Task B

## Phase 2
- [ ] 2.1 Task C`;

      mockReadFile.mockResolvedValue(mockContent);

      const result = await parser.parseTasksFromFile("/path/to/nested.md");

      expect(result.sections).toHaveLength(3);
      expect(result.tasks).toHaveLength(3);
    });

    it("should handle complex task descriptions", async () => {
      const mockContent = `# Complex Tasks
- [ ] 1.1 Complex Task
  - First line of description
  - Second line with more details
  - Third line with technical specs
  - _Requirements: REQ-001, REQ-002_`;

      mockReadFile.mockResolvedValue(mockContent);

      const result = await parser.parseTasksFromFile("/path/to/long-desc.md");

      expect(result.tasks).toHaveLength(1);
      expect(result.tasks[0].description).toContain("First line of description");
      expect(result.tasks[0].description).toContain("Second line with more details");
      expect(result.tasks[0].description).toContain("Third line with technical specs");
    });

    it("should handle file read errors gracefully", async () => {
      const error = new Error("File not found");
      mockReadFile.mockRejectedValue(error);

      await expect(
        parser.parseTasksFromFile("/path/to/nonexistent.md")
      ).rejects.toThrow(
        "Failed to parse tasks from file /path/to/nonexistent.md: File not found"
      );
    });

    it("should parse tasks with special characters in titles", async () => {
      const mockContent = `# Special Tasks
- [ ] 1.1 Task with @#$%^&*()_+-=[]{}|;:,.<>?
  - Handle special characters
  - _Requirements: REQ-SPECIAL_`;

      mockReadFile.mockResolvedValue(mockContent);

      const result = await parser.parseTasksFromFile("/path/to/special.md");

      expect(result.tasks).toHaveLength(1);
      expect(result.tasks[0].title).toContain("@#$%^&*()_+-=[]{}|;:,.<>?");
    });
  });

  describe("validateTaskData", () => {
    it("should validate valid task data", () => {
      const validTasks: Task[] = [
        {
          id: "1.1",
          title: "Valid Task",
          description: "A valid task",
          status: TaskStatus.NOT_STARTED,
          complexity: TaskComplexity.MEDIUM,
          dependencies: [],
          requirements: ["REQ-001"],
          createdDate: new Date(),
          lastModified: new Date(),
        },
      ];

      const result = parser.validateTaskData(validTasks);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it("should detect missing required fields", () => {
      const invalidTasks: Task[] = [
        {
          id: "",
          title: "Invalid Task",
          description: "Missing ID",
          status: TaskStatus.NOT_STARTED,
          complexity: TaskComplexity.MEDIUM,
          dependencies: [],
          requirements: [],
          createdDate: new Date(),
          lastModified: new Date(),
        },
      ];

      const result = parser.validateTaskData(invalidTasks);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain("Task missing ID: Invalid Task");
    });

    it("should detect missing titles", () => {
      const invalidTasks: Task[] = [
        {
          id: "1.1",
          title: "",
          description: "Missing title",
          status: TaskStatus.NOT_STARTED,
          complexity: TaskComplexity.MEDIUM,
          dependencies: [],
          requirements: [],
          createdDate: new Date(),
          lastModified: new Date(),
        },
      ];

      const result = parser.validateTaskData(invalidTasks);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain("Task missing title: 1.1");
    });

    it("should detect circular dependencies", () => {
      const circularTasks: Task[] = [
        {
          id: "1.1",
          title: "Task A",
          description: "Depends on B",
          status: TaskStatus.NOT_STARTED,
          complexity: TaskComplexity.MEDIUM,
          dependencies: ["1.2"],
          requirements: [],
          createdDate: new Date(),
          lastModified: new Date(),
        },
        {
          id: "1.2",
          title: "Task B",
          description: "Depends on A",
          status: TaskStatus.NOT_STARTED,
          complexity: TaskComplexity.MEDIUM,
          dependencies: ["1.1"],
          requirements: [],
          createdDate: new Date(),
          lastModified: new Date(),
        },
      ];

      const result = parser.validateTaskData(circularTasks);

      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.includes("Circular dependencies detected"))).toBe(true);
    });

    it("should warn about completed tasks without test status", () => {
      const completedTask: Task[] = [
        {
          id: "1.1",
          title: "Completed Task",
          description: "A completed task",
          status: TaskStatus.COMPLETED,
          complexity: TaskComplexity.MEDIUM,
          dependencies: [],
          requirements: [],
          createdDate: new Date(),
          lastModified: new Date(),
        },
      ];

      const result = parser.validateTaskData(completedTask);

      expect(result.isValid).toBe(true);
      expect(result.warnings).toContain("Completed task 1.1 has no test status");
    });

    it("should detect invalid dependencies", () => {
      const tasksWithInvalidDeps: Task[] = [
        {
          id: "1.1",
          title: "Task with invalid deps",
          description: "Has invalid dependencies",
          status: TaskStatus.NOT_STARTED,
          complexity: TaskComplexity.MEDIUM,
          dependencies: ["1.2", "1.3"],
          requirements: [],
          createdDate: new Date(),
          lastModified: new Date(),
        },
      ];

      const result = parser.validateTaskData(tasksWithInvalidDeps);

      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.includes("invalid dependencies"))).toBe(true);
    });
  });

  describe("serializeTasksToFile", () => {
    it("should serialize tasks back to markdown format", async () => {
      const sections: ParsedTaskSection[] = [
        {
          heading: "Test Section",
          level: 2,
          tasks: [
            {
              id: "1.1",
              title: "Test Task",
              description: "A test task",
              status: TaskStatus.COMPLETED,
              complexity: TaskComplexity.MEDIUM,
              dependencies: [],
              requirements: ["REQ-001"],
              createdDate: new Date(),
              lastModified: new Date(),
            },
          ],
        },
      ];

      mockWriteFile.mockResolvedValue(undefined);

      await parser.serializeTasksToFile("/path/to/output.md", sections);

      expect(mockWriteFile).toHaveBeenCalledWith(
        "/path/to/output.md",
        expect.stringContaining("# Test Section"),
        "utf-8"
      );
    });

    it("should handle write errors gracefully", async () => {
      const sections: ParsedTaskSection[] = [];
      const error = new Error("Permission denied");
      mockWriteFile.mockRejectedValue(error);

      await expect(
        parser.serializeTasksToFile("/path/to/protected.md", sections)
      ).rejects.toThrow(
        "Failed to serialize tasks to file /path/to/protected.md: Permission denied"
      );
    });
  });

  describe("updateTaskStatus", () => {
    it("should update task status in markdown content", async () => {
      const mockContent = `# Tasks
- [ ] 1.1 Task to update
  - Description here`;

      mockReadFile.mockResolvedValue(mockContent);
      mockWriteFile.mockResolvedValue(undefined);

      const result = await parser.updateTaskStatus(
        "/path/to/tasks.md",
        "1.1",
        TaskStatus.COMPLETED
      );

      expect(result).toBe(true);
      expect(mockWriteFile).toHaveBeenCalled();
    });

    it("should handle task not found", async () => {
      const mockContent = `# Tasks
- [ ] 1.1 Existing task`;

      mockReadFile.mockResolvedValue(mockContent);
      mockWriteFile.mockResolvedValue(undefined);

      const result = await parser.updateTaskStatus(
        "/path/to/tasks.md",
        "1.2",
        TaskStatus.COMPLETED
      );

      expect(result).toBe(false);
    });

    it("should handle file read errors", async () => {
      const error = new Error("File read error");
      mockReadFile.mockRejectedValue(error);

      await expect(
        parser.updateTaskStatus(
          "/path/to/tasks.md",
          "1.1",
          TaskStatus.COMPLETED
        )
      ).rejects.toThrow("Failed to update task status: File read error");
    });
  });

  describe("Performance and Edge Cases", () => {
    it("should parse large files within performance target (<300ms for 100+ tasks)", async () => {
      // Generate a large mock file with 100+ tasks
      const largeContent = Array.from({ length: 100 }, (_, i) => 
        `- [ ] ${i + 1}.1 Task ${i + 1}\n  - Description for task ${i + 1}`
      ).join('\n\n');
      
      mockReadFile.mockResolvedValue(largeContent);

      const startTime = performance.now();
      const result = await parser.parseTasksFromFile("/path/to/large.md");
      const parseTime = performance.now() - startTime;

      expect(result.tasks.length).toBeGreaterThan(100);
      expect(parseTime).toBeLessThan(300);
    });

    it("should handle very long descriptions", async () => {
      const longDescription = Array.from({ length: 50 }, (_, i) => 
        `  - Line ${i + 1} of very long description with technical details and requirements`
      ).join('\n');
      
      const mockContent = `# Long Description Task
- [ ] 1.1 Task with long description
${longDescription}
  - _Requirements: REQ-LONG_`;

      mockReadFile.mockResolvedValue(mockContent);

      const result = await parser.parseTasksFromFile("/path/to/long-desc.md");

      expect(result.tasks).toHaveLength(1);
      expect(result.tasks[0].description).toBe(longDescription);
    });

    it("should handle malformed markdown gracefully", async () => {
      const malformedContent = `# Incomplete
- [ ] 1.1 Task
  - Description
# Another section
- [ ] 2.1 Another task
  - Another description
  - _Requirements: REQ-001, REQ-002

# Third section
- [ ] 3.1 Third task`;

      mockReadFile.mockResolvedValue(malformedContent);

      const result = await parser.parseTasksFromFile("/path/to/malformed.md");

      expect(result.tasks).toHaveLength(4);
      expect(result.tasks[0].status).toBe(TaskStatus.NOT_STARTED);
      expect(result.tasks[1].status).toBe(TaskStatus.NOT_STARTED);
      expect(result.tasks[2].status).toBe(TaskStatus.NOT_STARTED);
      expect(result.tasks[3].status).toBe(TaskStatus.NOT_STARTED);
    });

    it("should handle tasks with empty requirements", async () => {
      const mockContent = `# Empty Requirements
- [ ] 1.1 Task without requirements
  - Description here
  - _Requirements: _`;

      mockReadFile.mockResolvedValue(mockContent);

      const result = await parser.parseTasksFromFile("/path/to/empty-reqs.md");

      expect(result.tasks).toHaveLength(1);
      expect(result.tasks[0].requirements).toEqual([""]);
    });

    it("should handle various checkbox formats", async () => {
      const mockContent = `# Mixed States
- [x] 1.1 Completed task
- [ ] 1.2 Incomplete task
- [X] 1.3 Uppercase X task
- [ x] 1.4 Space before X task`;

      mockReadFile.mockResolvedValue(mockContent);

      const result = await parser.parseTasksFromFile("/path/to/mixed.md");

      expect(result.tasks).toHaveLength(4);
      expect(result.tasks[0].status).toBe(TaskStatus.COMPLETED);
      expect(result.tasks[1].status).toBe(TaskStatus.NOT_STARTED);
      expect(result.tasks[2].status).toBe(TaskStatus.COMPLETED);
      expect(result.tasks[3].status).toBe(TaskStatus.COMPLETED);
    });
  });
});
