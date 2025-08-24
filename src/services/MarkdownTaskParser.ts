/**
 * MarkdownTaskParser - Basic class structure for parsing markdown task files
 * Recovery Task 2.1.2: Minimal class that compiles and can be instantiated
 * Recovery Task 2.1.3: Added parseTasksFromFile method with mock data
 * Recovery Task 2.1.4: Added parseTaskFromMarkdown method for individual task parsing
 * Enhanced Task 2.6.1: Update mock data to include estimatedDuration and enhanced test results
 * Enhanced Task 2.6.3: Add realistic ISO timestamp mock data for relative time testing
 * DATA-001: Implement file reading in parseTasksFromFile method
 * Requirements: 3.1-3.6, 4.1-4.4, 7.1-7.6, 6.8, 6.9, 7.7, 4.8, 7.9, 9.3
 */

import { promises as fs } from "fs";
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
   * Parse tasks from a markdown file and return parsed Task objects
   * DATA-001: Implement actual file reading instead of mock data
   *
   * @param filePath - Path to the markdown file
   * @returns Promise<Task[]> - Array of parsed Task objects from file content
   */
  async parseTasksFromFile(filePath: string): Promise<Task[]> {
    try {
      const fileContent = await fs.readFile(filePath, 'utf-8');
      return this.parseTasksFromMarkdownContent(fileContent);
    } catch (error) {
      console.error(`Failed to read tasks file: ${filePath}`, error);
      throw new Error(`Could not read tasks file: ${error instanceof Error ? error.message : String(error)}`);
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
      return [];
    }

    const lines = markdownContent.trim().split('\n');
    const tasks: Task[] = [];

    for (const line of lines) {
      const trimmedLine = line.trim();
      
      // Skip empty lines
      if (!trimmedLine) continue;

      // Check for task lines (- [x] or - [ ] format)
      if (trimmedLine.startsWith('- [')) {
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
            assignee: task.assignee || 'dev-team',
            estimatedHours: task.estimatedHours || 1,
            actualHours: task.actualHours || 0,
            estimatedDuration: task.estimatedDuration || '15-20 min',
            isExecutable: task.isExecutable !== undefined ? task.isExecutable : (task.status === TaskStatus.NOT_STARTED),
            tags: task.tags || ['task'],
            statusDisplayName: task.statusDisplayName || STATUS_DISPLAY_NAMES[task.status],
            testStatus: task.testStatus
          };
          tasks.push(enhancedTask);
        }
      }
    }

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
}
