/**
 * MarkdownTaskParser - Basic class structure for parsing markdown task files
 * Recovery Task 2.1.2: Minimal class that compiles and can be instantiated
 * Recovery Task 2.1.3: Added parseTasksFromFile method with mock data
 * Recovery Task 2.1.4: Added parseTaskFromMarkdown method for individual task parsing
 * Enhanced Task 2.6.1: Update mock data to include estimatedDuration and enhanced test results
 * Enhanced Task 2.6.3: Add realistic ISO timestamp mock data for relative time testing
 * DATA-001: Implement file reading in parseTasksFromFile method
 * Task 4: Add comprehensive file path validation with user feedback
 * Requirements: 3.1-3.6, 4.1-4.4, 7.1-7.6, 6.8, 6.9, 7.7, 4.8, 7.9, 9.3
 */

import { promises as fs, existsSync, constants } from "fs";
import * as path from "path";
import {
  Task,
  TaskStatus,
  TaskComplexity,
  TaskPriority,
  TestStatusEnum,
  STATUS_DISPLAY_NAMES,
} from "../types/tasks";
import { FailingTestScenarios } from "../mock/FailingTestScenarios";
import { TimestampGenerator } from "../mock/TimestampGenerator";

export class MarkdownTaskParser {
  constructor() {
    // Empty constructor - just make it compile
  }

  /**
   * Validate tasks.md file exists and is readable
   * Task 4: Comprehensive file path validation with detailed error reporting
   *
   * @param filePath - Path to the tasks.md file to validate
   * @returns Promise<{isValid: boolean, error?: string}> - Validation result with error details
   */
  private async validateTasksFile(
    filePath: string
  ): Promise<{ isValid: boolean; error?: string }> {
    try {
      // Check if file exists
      if (!existsSync(filePath)) {
        return {
          isValid: false,
          error: `Tasks file not found: ${path.basename(filePath)}`,
        };
      }

      // Check if path is actually a file (not a directory)
      const stats = await fs.stat(filePath);
      if (!stats.isFile()) {
        return {
          isValid: false,
          error: `Path exists but is not a file: ${path.basename(filePath)}`,
        };
      }

      // Check if file is readable
      await fs.access(filePath, constants.R_OK);

      // Check if file has content (not empty)
      if (stats.size === 0) {
        return {
          isValid: false,
          error: `Tasks file is empty: ${path.basename(filePath)}`,
        };
      }

      return { isValid: true };
    } catch (error) {
      return {
        isValid: false,
        error: `Cannot read tasks file: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
      };
    }
  }

  /**
   * Create an empty tasks.md file with basic structure
   * Task 4: Provide user option to create tasks.md when missing
   *
   * @param filePath - Path where to create the tasks.md file
   * @returns Promise<boolean> - True if file was created successfully
   */
  async createEmptyTasksFile(filePath: string): Promise<boolean> {
    try {
      const defaultContent = `# Tasks

## Development Tasks

- [ ] 1.1 Sample Task
  - Description: This is a sample task to get you started
  - Status: not started
  - Complexity: low
  - Estimated Duration: 15-20 min

## How to Use

1. Add tasks in the format: \`- [ ] TaskID Task Title\`
2. Mark completed tasks with: \`- [x] TaskID Task Title\`
3. Add additional details on subsequent lines
4. Save the file to see updates in the extension

## Task Format Examples

- [ ] 2.1 Implement Feature A
  - Description: Add new functionality to the system
  - Dependencies: 1.1
  - Requirements: User authentication, database schema
  - Estimated Duration: 2-3 hours

- [x] 2.2 Setup Development Environment
  - Description: Configure local development setup
  - Status: completed
  - Actual Duration: 45 min
`;

      // Ensure directory exists
      const dir = path.dirname(filePath);
      await fs.mkdir(dir, { recursive: true });

      // Create the file
      await fs.writeFile(filePath, defaultContent, "utf-8");

      console.log(`[MarkdownTaskParser] Created empty tasks file: ${filePath}`);
      return true;
    } catch (error) {
      console.error(
        `[MarkdownTaskParser] Failed to create tasks file: ${filePath}:`,
        error
      );
      return false;
    }
  }

  /**
   * Parse tasks from a markdown file and return parsed Task objects
   * Task 4: Enhanced with comprehensive file validation and user feedback
   * DATA-001: Implement actual file reading instead of mock data
   *
   * @param filePath - Path to the markdown file
   * @returns Promise<Task[]> - Array of parsed Task objects from file content
   */
  async parseTasksFromFile(filePath: string): Promise<Task[]> {
    console.log(`[MarkdownTaskParser] Validating tasks file: ${filePath}`);

    // Task 4: Validate file before attempting to parse
    const validation = await this.validateTasksFile(filePath);
    if (!validation.isValid) {
      console.error(
        `[MarkdownTaskParser] File validation failed: ${validation.error}`
      );

      // Note: User notification will be handled by the calling component
      // (extension.ts or TasksDataService) to maintain separation of concerns
      throw new Error(`Tasks file validation failed: ${validation.error}`);
    }

    console.log(
      `[MarkdownTaskParser] File validation passed, proceeding with parsing`
    );
    console.log(`[MarkdownTaskParser] File exists: ${existsSync(filePath)}`);
    console.log(
      `[MarkdownTaskParser] Resolved path: ${path.resolve(filePath)}`
    );

    try {
      const fileContent = await fs.readFile(filePath, "utf-8");
      console.log(
        `[MarkdownTaskParser] Successfully read file, content length: ${fileContent.length} characters`
      );

      const parsedTasks = this.parseTasksFromMarkdownContent(fileContent);
      console.log(
        `[MarkdownTaskParser] Parsed ${parsedTasks.length} tasks from file content`
      );

      return parsedTasks;
    } catch (error) {
      console.error(`[MarkdownTaskParser] Failed to parse ${filePath}:`, error);
      throw new Error(
        `Could not read tasks file: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }

  /**
   * Parse multiple tasks from markdown content string
   * DATA-001: Parse actual markdown content into Task objects
   *
   * @param markdownContent - Markdown string containing task information
   * @returns Task[] - Array of parsed Task objects
   */
  parseTasksFromMarkdownContent(markdownContent: string): Task[] {
    if (!markdownContent || !markdownContent.trim()) {
      console.log("[MarkdownTaskParser] No markdown content to parse");
      return [];
    }

    const lines = markdownContent.trim().split("\n");
    console.log(
      `[MarkdownTaskParser] Processing ${lines.length} lines of markdown content`
    );
    const tasks: Task[] = [];

    for (const line of lines) {
      const trimmedLine = line.trim();

      // Skip empty lines
      if (!trimmedLine) continue;

      // Check for task lines (- [x] or - [ ] format)
      if (trimmedLine.startsWith("- [")) {
        console.log(
          `[MarkdownTaskParser] Found task line: ${trimmedLine.substring(
            0,
            50
          )}...`
        );
        const task = this.parseTaskFromMarkdown(trimmedLine);
        if (task) {
          // Enhance the task with default values
          const enhancedTask: Task = {
            ...task,
            description: task.description || task.title,
            complexity: task.complexity || TaskComplexity.LOW,
            dependencies: task.dependencies || [],
            requirements: task.requirements || [task.id],
            createdDate: task.createdDate || new Date().toISOString(),
            lastModified: task.lastModified || new Date().toISOString(),
            priority: task.priority || TaskPriority.MEDIUM,
            assignee: task.assignee || "dev-team",
            estimatedHours: task.estimatedHours || 1,
            actualHours: task.actualHours || 0,
            estimatedDuration: task.estimatedDuration || "15-20 min",
            isExecutable:
              task.isExecutable !== undefined
                ? task.isExecutable
                : task.status === TaskStatus.NOT_STARTED,
            tags: task.tags || ["task"],
            statusDisplayName:
              task.statusDisplayName || STATUS_DISPLAY_NAMES[task.status],
            testStatus: task.testStatus,
          };
          tasks.push(enhancedTask);
          console.log(
            `[MarkdownTaskParser] Successfully parsed task: ${task.id} - ${task.title}`
          );
        } else {
          console.log(
            `[MarkdownTaskParser] Failed to parse task line: ${trimmedLine.substring(
              0,
              50
            )}...`
          );
        }
      }
    }

    console.log(
      `[MarkdownTaskParser] Completed parsing, found ${tasks.length} valid tasks`
    );
    return tasks;
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
        createdDate: new Date().toISOString(),
        lastModified: new Date().toISOString(),
        priority: TaskPriority.MEDIUM,
      };
    } catch (error) {
      return null;
    }
  }

  /**
   * Update task status in markdown file and persist changes
   * PERSIST-001: Implement status update persistence to tasks.md file
   *
   * @param filePath - Path to the markdown file
   * @param taskId - ID of the task to update
   * @param updates - Partial Task object containing updates
   * @returns Promise<boolean> - True if task was updated, false if not found
   */
  async updateTaskInFile(
    filePath: string,
    taskId: string,
    updates: Partial<Task>
  ): Promise<boolean> {
    try {
      const fileContent = await fs.readFile(filePath, "utf-8");
      const lines = fileContent.split("\n");
      let updated = false;

      const updatedLines = lines.map((line) => {
        // Match task line pattern: - [x] 1.1 Task title ✅ or - [ ] 1.1 Task title
        const taskMatch = line.match(
          /^(\s*- \[)([x\s])(\] )(\d+\.\d+(?:\.\d+)?)(.*?)(\s*(?:✅|❌|⏳|🔄|🚫)?\s*)$/
        );

        if (taskMatch && taskMatch[4] === taskId) {
          const checkbox = updates.status === TaskStatus.COMPLETED ? "x" : " ";
          const statusIcon = this.getStatusIcon(updates.status);
          const newLine = `${taskMatch[1]}${checkbox}${taskMatch[3]}${taskMatch[4]}${taskMatch[5]} ${statusIcon}`;
          updated = true;
          return newLine.trim();
        }
        return line;
      });

      if (updated) {
        await fs.writeFile(filePath, updatedLines.join("\n"), "utf-8");
        console.log(`Updated task ${taskId} status in ${filePath}`);
        return true;
      }
      return false;
    } catch (error) {
      console.error(
        `Failed to update task ${taskId} in file ${filePath}:`,
        error
      );
      throw error;
    }
  }

  /**
   * Get status icon for markdown display
   * PERSIST-001: Helper method for status icon mapping
   *
   * @param status - TaskStatus to get icon for
   * @returns string - Status icon emoji or empty string
   */
  private getStatusIcon(status?: TaskStatus): string {
    if (!status) return "";

    const iconMap = {
      [TaskStatus.COMPLETED]: "✅",
      [TaskStatus.IN_PROGRESS]: "🔄",
      [TaskStatus.REVIEW]: "⏳",
      [TaskStatus.BLOCKED]: "❌",
      [TaskStatus.NOT_STARTED]: "",
      [TaskStatus.DEPRECATED]: "🚫",
    };
    return iconMap[status] || "";
  }
}
