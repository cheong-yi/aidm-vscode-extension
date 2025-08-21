/**
 * MarkdownTaskParser - Basic class structure for parsing markdown task files
 * Recovery Task 2.1.2: Minimal class that compiles and can be instantiated
 * Recovery Task 2.1.3: Added parseTasksFromFile method with mock data
 * Recovery Task 2.1.4: Added parseTaskFromMarkdown method for individual task parsing
 * Requirements: 3.1-3.6, 4.1-4.4, 7.1-7.6
 */

import { Task, TaskStatus, TaskComplexity, TaskPriority } from "../types/tasks";

export class MarkdownTaskParser {
  constructor() {
    // Empty constructor - just make it compile
  }

  /**
   * Parse tasks from a markdown file and return mock Task data
   * Recovery Task 2.1.3: Returns hardcoded mock data for now
   *
   * @param filePath - Path to the markdown file (ignored for mock implementation)
   * @returns Promise<Task[]> - Array of mock Task objects
   */
  async parseTasksFromFile(filePath: string): Promise<Task[]> {
    // Hardcode 3 realistic Task objects with different statuses and properties
    const mockTasks: Task[] = [
      {
        id: "task-1",
        title: "Setup Project Structure",
        description:
          "Create basic project directories and files for the AiDM VSCode extension",
        status: TaskStatus.COMPLETED,
        complexity: TaskComplexity.LOW,
        dependencies: [],
        requirements: ["1.1", "1.2"],
        createdDate: new Date("2024-01-01"),
        lastModified: new Date("2024-01-02"),
        assignee: "dev-team",
        estimatedHours: 2,
        actualHours: 1.5,
        priority: TaskPriority.HIGH,
        tags: ["setup", "foundation"],
      },
      {
        id: "task-2",
        title: "Implement Data Models",
        description:
          "Create core data model interfaces for Task, Requirement, and Business Context",
        status: TaskStatus.IN_PROGRESS,
        complexity: TaskComplexity.MEDIUM,
        dependencies: ["task-1"],
        requirements: ["2.1", "2.2", "2.3"],
        createdDate: new Date("2024-01-02"),
        lastModified: new Date("2024-01-03"),
        assignee: "senior-dev",
        estimatedHours: 8,
        actualHours: 4,
        priority: TaskPriority.MEDIUM,
        tags: ["data-models", "interfaces"],
      },
      {
        id: "task-3",
        title: "Design MCP Server Architecture",
        description:
          "Design the Model Context Protocol server structure and communication patterns",
        status: TaskStatus.NOT_STARTED,
        complexity: TaskComplexity.HIGH,
        dependencies: ["task-2"],
        requirements: ["3.1", "3.2", "3.3", "3.4"],
        createdDate: new Date("2024-01-03"),
        lastModified: new Date("2024-01-03"),
        assignee: "architect",
        estimatedHours: 16,
        actualHours: 0,
        priority: TaskPriority.CRITICAL,
        tags: ["architecture", "mcp", "protocol"],
      },
    ];

    return mockTasks;
  }

  /**
   * Parse individual task from markdown string into Task object
   * Recovery Task 2.1.4: Simple string parsing for checkbox format
   *
   * @param markdownContent - Markdown string containing task information
   * @returns Task | null - Parsed Task object or null if parsing fails
   */
  parseTaskFromMarkdown(markdownContent: string): Task | null {
    try {
      if (!markdownContent || !markdownContent.trim()) {
        return null;
      }

      const lines = markdownContent.trim().split("\n");
      const firstLine = lines[0].trim();

      // Step 1: Check if line starts with dash
      if (!firstLine.startsWith("-")) {
        return null;
      }

      // Step 2: Remove the dash and trim
      let remaining = firstLine.substring(1).trim();

      // Step 3: Check for checkbox format [x] or [ ]
      if (!remaining.startsWith("[") || remaining.length < 3) {
        return null;
      }

      // Step 4: Extract checkbox status
      const checkboxEnd = remaining.indexOf("]");
      if (checkboxEnd === -1 || checkboxEnd !== 2) {
        return null; // Should be exactly [x] or [ ]
      }

      const checkboxContent = remaining.substring(1, 2);
      const isCompleted = checkboxContent === "x";

      // Only allow 'x' or ' ' (space) as valid checkbox content
      if (checkboxContent !== "x" && checkboxContent !== " ") {
        return null;
      }

      // Step 5: Extract task info after checkbox
      remaining = remaining.substring(3).trim(); // Remove "] " and trim

      if (!remaining) {
        return null; // No task content after checkbox
      }

      // Step 6: Extract ID and title - find first space to separate ID from title
      const firstSpaceIndex = remaining.indexOf(" ");

      let id: string;
      let title: string;

      if (firstSpaceIndex === -1) {
        // No space found, treat entire string as ID
        id = remaining;
        title = "Untitled Task";
      } else {
        id = remaining.substring(0, firstSpaceIndex).trim();
        title = remaining.substring(firstSpaceIndex + 1).trim();
      }

      // Step 7: Create basic task object
      return {
        id,
        title,
        description: title,
        status: isCompleted ? TaskStatus.COMPLETED : TaskStatus.NOT_STARTED,
        complexity: TaskComplexity.LOW,
        dependencies: [],
        requirements: [id],
        createdDate: new Date(),
        lastModified: new Date(),
        priority: TaskPriority.MEDIUM,
      };
    } catch (error) {
      return null;
    }
  }
}
