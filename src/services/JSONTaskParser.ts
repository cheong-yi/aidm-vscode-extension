/**
 * JSONTaskParser - Parses nested contexts JSON task files
 * CRITICAL-2: Replace markdown parser for tasks.json with nested contexts structure
 * Requirements: 3.1-3.6, 4.1-4.4, 7.1-7.6
 * Task 6.0.1: Migrated to VS Code filesystem API
 */

import * as vscode from "vscode";
import {
  Task,
  TaskStatus,
  TaskComplexity,
  TaskPriority,
  TestStatusEnum,
  STATUS_DISPLAY_NAMES,
} from "../types/tasks";

export class JSONTaskParser {
  constructor() {
    // Empty constructor for instantiation
  }

  /**
   * Validate tasks.json file exists and is readable using VS Code filesystem API
   *
   * @param fileUri - VS Code URI to the tasks.json file to validate
   * @returns Promise<{isValid: boolean, error?: string}> - Validation result with error details
   */
  private async validateTasksFile(
    fileUri: vscode.Uri
  ): Promise<{ isValid: boolean; error?: string }> {
    console.log(
      `[JSONTaskParser] Validating tasks file: ${fileUri.toString()}`
    );
    console.log(`[JSONTaskParser] File system path: ${fileUri.fsPath}`);
    console.log(`[JSONTaskParser] Scheme: ${fileUri.scheme}`);
    console.log(`[JSONTaskParser] Authority: ${fileUri.authority}`);

    try {
      // Check if file exists and get stats using VS Code API
      console.log(
        `[JSONTaskParser] Attempting to stat file: ${fileUri.fsPath}`
      );
      const stats = await vscode.workspace.fs.stat(fileUri);

      console.log(`[JSONTaskParser] File stats retrieved successfully`);
      console.log(
        `[JSONTaskParser] File type: ${
          stats.type === vscode.FileType.File
            ? "File"
            : stats.type === vscode.FileType.Directory
            ? "Directory"
            : "Unknown"
        }`
      );
      console.log(`[JSONTaskParser] File size: ${stats.size} bytes`);
      console.log(`[JSONTaskParser] File creation time: ${stats.ctime} ms`);
      console.log(`[JSONTaskParser] File modification time: ${stats.mtime} ms`);

      // Check if path is actually a file (not a directory)
      if (stats.type !== vscode.FileType.File) {
        console.log(
          `[JSONTaskParser] Path exists but is not a file: ${fileUri.fsPath}`
        );
        return {
          isValid: false,
          error: `Path exists but is not a file: ${fileUri.fsPath}`,
        };
      }

      // Check if file has content (not empty)
      if (stats.size === 0) {
        console.log(`[JSONTaskParser] Tasks file is empty: ${fileUri.fsPath}`);
        return {
          isValid: false,
          error: `Tasks file is empty: ${fileUri.fsPath}`,
        };
      }

      console.log(
        `[JSONTaskParser] File validation successful: ${fileUri.fsPath}`
      );
      console.log(
        `[JSONTaskParser] File is readable and contains ${stats.size} bytes of data`
      );
      return { isValid: true };
    } catch (error) {
      console.log(
        `[JSONTaskParser] File validation error occurred: ${
          error instanceof Error ? error.message : String(error)
        }`
      );

      if (error instanceof vscode.FileSystemError) {
        console.log(
          `[JSONTaskParser] VS Code FileSystemError detected with code: ${error.code}`
        );

        if (error.code === "FileNotFound") {
          console.log(
            `[JSONTaskParser] File not found error: ${fileUri.fsPath}`
          );
          return {
            isValid: false,
            error: `Tasks file not found: ${fileUri.fsPath}`,
          };
        }
        if (error.code === "NoPermissions") {
          console.log(
            `[JSONTaskParser] Permission denied error: ${fileUri.fsPath}`
          );
          return {
            isValid: false,
            error: `Cannot read tasks file: Permission denied for ${fileUri.fsPath}`,
          };
        }
        if (error.code === "Unavailable") {
          console.log(
            `[JSONTaskParser] File unavailable error: ${fileUri.fsPath}`
          );
          return {
            isValid: false,
            error: `Tasks file is unavailable: ${fileUri.fsPath}`,
          };
        }
      }

      console.log(
        `[JSONTaskParser] Unknown error type during validation: ${
          error instanceof Error ? error.constructor.name : typeof error
        }`
      );
      return {
        isValid: false,
        error: `Cannot read tasks file: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
      };
    }
  }

  /**
   * Parse tasks from a JSON file and return parsed Task objects using VS Code filesystem API
   * PATH-FIX-002: Removed string path support to prevent URI corruption
   *
   * @param fileUri - VS Code URI to the JSON file (string paths no longer supported)
   * @returns Promise<Task[]> - Array of parsed Task objects from file content
   */
  async parseTasksFromFile(fileUri: vscode.Uri): Promise<Task[]> {
    // PATH-FIX-002: Enhanced debug logging to trace URI handling
    console.log(`[JSONTaskParser] Processing URI: ${fileUri.toString()}`);
    console.log(`[JSONTaskParser] FSPath: ${fileUri.fsPath}`);
    console.log(`[JSONTaskParser] Path segments:`, fileUri.path.split("/"));
    console.log(`[JSONTaskParser] Scheme: ${fileUri.scheme}`);
    console.log(`[JSONTaskParser] Authority: ${fileUri.authority}`);

    // PATH-FIX-002: Validate URI is not corrupted
    if (
      !fileUri.fsPath ||
      fileUri.fsPath.includes("\\\\") ||
      fileUri.fsPath === "\\" ||
      fileUri.fsPath === ""
    ) {
      throw new Error(
        `Malformed URI detected. URI: ${fileUri.toString()}, FSPath: "${
          fileUri.fsPath
        }"`
      );
    }

    // Validate file before attempting to parse
    const validation = await this.validateTasksFile(fileUri);
    if (!validation.isValid) {
      console.error(
        `[JSONTaskParser] File validation failed: ${validation.error}`
      );
      throw new Error(`Tasks file validation failed: ${validation.error}`);
    }

    console.log(
      `[JSONTaskParser] File validation passed, proceeding with parsing`
    );
    console.log(
      `[JSONTaskParser] File exists and is accessible: ${fileUri.fsPath}`
    );

    try {
      // Use VS Code filesystem API instead of Node.js fs
      console.log(
        `[JSONTaskParser] Reading file content from: ${fileUri.fsPath}`
      );
      const fileContent = await vscode.workspace.fs.readFile(fileUri);
      const contentString = Buffer.from(fileContent).toString("utf8");

      console.log(
        `[JSONTaskParser] Successfully read file, content length: ${contentString.length} characters`
      );

      const jsonData = JSON.parse(contentString);
      const parsedTasks = this.parseTasksFromJSONContent(jsonData);
      console.log(
        `[JSONTaskParser] Parsed ${parsedTasks.length} tasks from file content`
      );

      return parsedTasks;
    } catch (error) {
      console.error(
        `[JSONTaskParser] Failed to parse ${fileUri.toString()}:`,
        error
      );

      // Enhanced error logging for debugging
      console.log(
        `[JSONTaskParser] Error type: ${
          error instanceof Error ? error.constructor.name : typeof error
        }`
      );
      if (error instanceof vscode.FileSystemError) {
        console.log(
          `[JSONTaskParser] VS Code FileSystemError detected with code: ${error.code}`
        );
        console.log(
          `[JSONTaskParser] File system error details: ${error.message}`
        );
      }

      // Handle VS Code filesystem errors specifically
      if (error instanceof vscode.FileSystemError) {
        if (error.code === "FileNotFound") {
          throw new Error(`Tasks file not found: ${fileUri.fsPath}`);
        }
        if (error.code === "NoPermissions") {
          throw new Error(
            `Cannot read tasks file: Permission denied for ${fileUri.fsPath}`
          );
        }
      }

      // Handle JSON parsing errors
      if (error instanceof SyntaxError) {
        throw new Error(`Invalid JSON in tasks file: ${error.message}`);
      }

      throw new Error(
        `Could not read tasks file: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }

  /**
   * Parse multiple tasks from JSON content object
   *
   * @param jsonData - JSON object containing nested contexts with tasks
   * @returns Task[] - Array of parsed Task objects
   */
  parseTasksFromJSONContent(jsonData: any): Task[] {
    if (!jsonData || typeof jsonData !== "object") {
      console.log("[JSONTaskParser] No valid JSON data to parse");
      return [];
    }

    console.log(
      `[JSONTaskParser] Processing JSON data with ${
        Object.keys(jsonData).length
      } contexts`
    );

    // Flatten nested contexts into single task array
    const allTasks = this.flattenContexts(jsonData);
    console.log(
      `[JSONTaskParser] Flattened ${allTasks.length} total tasks from all contexts`
    );

    const tasks: Task[] = [];

    for (const taskObj of allTasks) {
      try {
        const task = this.parseTaskFromJSON(taskObj);
        if (task) {
          tasks.push(task);
          console.log(
            `[JSONTaskParser] Successfully parsed task: ${task.id} - ${task.title}`
          );
        } else {
          console.log(
            `[JSONTaskParser] Failed to parse task object: ${JSON.stringify(
              taskObj
            ).substring(0, 50)}...`
          );
        }
      } catch (error) {
        console.error(`[JSONTaskParser] Error parsing task object:`, error);
      }
    }

    console.log(
      `[JSONTaskParser] Completed parsing, found ${tasks.length} valid tasks`
    );
    return tasks;
  }

  /**
   * Flatten nested contexts into single task array
   *
   * @param jsonData - JSON object with nested contexts
   * @returns any[] - Flattened array of task objects
   */
  private flattenContexts(jsonData: any): any[] {
    const allTasks: any[] = [];

    for (const [contextName, contextData] of Object.entries(jsonData)) {
      if (
        contextData &&
        typeof contextData === "object" &&
        "tasks" in contextData
      ) {
        const contextTasks = (contextData as any).tasks || [];
        console.log(
          `[JSONTaskParser] Processing context '${contextName}' with ${contextTasks.length} tasks`
        );

        // Add context information to each task
        for (const task of contextTasks) {
          if (task && typeof task === "object") {
            allTasks.push({
              ...task,
              context: contextName,
            });
          }
        }
      }
    }

    return allTasks;
  }

  /**
   * Parse individual task from JSON object into Task interface
   *
   * @param taskObj - JSON task object from the file
   * @param context - Context name for the task
   * @returns Task | null - Parsed Task object or null if parsing fails
   */
  private parseTaskFromJSON(taskObj: any): Task | null {
    try {
      if (!taskObj || typeof taskObj !== "object") {
        return null;
      }

      // Ensure required fields exist
      const id = this.convertToString(taskObj.id);
      if (!id) {
        console.log("[JSONTaskParser] Task missing required id field");
        return null;
      }

      // Map JSON fields to Task interface
      const task: Task = {
        id,
        title: this.convertToString(taskObj.title) || "Untitled Task",
        description:
          this.convertToString(taskObj.description) ||
          this.convertToString(taskObj.title) ||
          "No description",
        details: this.convertToString(taskObj.details), // Added: map JSON details field
        testStrategy: this.convertToString(taskObj.testStrategy), // Added: map JSON testStrategy field
        status: this.mapStatus(taskObj.status),
        complexity: this.mapComplexity(taskObj.priority || taskObj.complexity),
        dependencies: this.convertToStringArray(taskObj.dependencies),
        requirements: this.convertToStringArray(taskObj.requirements) || [id],
        createdDate:
          this.convertToISOString(taskObj.createdDate) ||
          new Date().toISOString(),
        lastModified:
          this.convertToISOString(taskObj.lastModified) ||
          new Date().toISOString(),
        priority: this.mapPriority(taskObj.priority),
        assignee: this.convertToString(taskObj.assignee) || "dev-team",
        estimatedHours: this.convertToNumber(taskObj.estimatedHours) || 1,
        actualHours: this.convertToNumber(taskObj.actualHours) || 0,
        estimatedDuration:
          this.convertToString(taskObj.estimatedDuration) || "15-20 min",
        isExecutable: this.convertToBoolean(
          taskObj.isExecutable,
          this.mapStatus(taskObj.status) === TaskStatus.NOT_STARTED
        ),
        tags: this.convertToStringArray(taskObj.tags) || ["task"],
        statusDisplayName: STATUS_DISPLAY_NAMES[this.mapStatus(taskObj.status)],
        testStatus: this.parseTestStatus(taskObj.testStatus),
        parentTaskId: this.convertToString(taskObj.parentTaskId),
        subTasks: this.convertToStringArray(taskObj.subTasks), // Keep existing field
        subtasks: this.convertToSubtaskArray(taskObj.subtasks), // Added: map JSON subtasks field
        implementation: this.parseImplementation(taskObj.implementation),
        testResults: this.parseTestResults(taskObj.testResults),
        notes: this.convertToString(taskObj.notes),
        dueDate: this.convertToISOString(taskObj.dueDate),
      };

      // Ensure requirements always has a value
      if (!task.requirements || task.requirements.length === 0) {
        task.requirements = [id];
      }

      return task;
    } catch (error) {
      console.error("[JSONTaskParser] Error parsing task:", error);
      return null;
    }
  }

  /**
   * Parse test status from JSON object
   *
   * @param testStatusObj - Test status object from JSON
   * @returns TestStatus | undefined - Parsed test status or undefined
   */
  private parseTestStatus(testStatusObj: any): any {
    if (!testStatusObj || typeof testStatusObj !== "object") {
      return undefined;
    }

    return {
      lastRunDate: this.convertToISOString(testStatusObj.lastRunDate),
      totalTests: this.convertToNumber(testStatusObj.totalTests) || 0,
      passedTests: this.convertToNumber(testStatusObj.passedTests) || 0,
      failedTests: this.convertToNumber(testStatusObj.failedTests) || 0,
      failingTestsList: this.parseFailingTests(testStatusObj.failingTestsList),
      testSuite: this.convertToString(testStatusObj.testSuite),
      coverage: this.convertToNumber(testStatusObj.coverage),
      status: this.mapTestStatus(testStatusObj.status),
      errorMessage: this.convertToString(testStatusObj.errorMessage),
      executionTime: this.convertToNumber(testStatusObj.executionTime),
    };
  }

  /**
   * Parse failing tests array from JSON
   *
   * @param failingTestsArray - Array of failing test objects
   * @returns FailingTest[] | undefined - Parsed failing tests or undefined
   */
  private parseFailingTests(failingTestsArray: any): any[] | undefined {
    if (!Array.isArray(failingTestsArray)) {
      return undefined;
    }

    return failingTestsArray.map((test) => ({
      name: this.convertToString(test.name) || "Unknown Test",
      message: this.convertToString(test.message) || "No error message",
      stackTrace: this.convertToString(test.stackTrace),
      category: this.mapTestCategory(test.category),
      testFile: this.convertToString(test.testFile),
      lineNumber: this.convertToNumber(test.lineNumber),
      expectedValue: this.convertToString(test.expectedValue),
      actualValue: this.convertToString(test.actualValue),
    }));
  }

  /**
   * Parse implementation from JSON object
   *
   * @param impl - Implementation object from JSON
   * @returns TaskImplementation | undefined - Parsed implementation or undefined
   */
  private parseImplementation(impl: any): any {
    if (!impl || typeof impl !== "object") return undefined;

    return {
      summary: this.convertToString(impl.summary),
      filesChanged: this.convertToStringArray(impl.filesChanged),
      completedDate: this.convertToISOString(impl.completedDate),
      commitHash: this.convertToString(impl.commitHash),
      diffAvailable: this.convertToBoolean(impl.diffAvailable, false),
    };
  }

  /**
   * Parse test results from JSON object
   *
   * @param testResultsObj - Test results object from JSON
   * @returns TaskTestResults | undefined - Parsed test results or undefined
   */
  private parseTestResults(testResultsObj: any): any {
    if (!testResultsObj || typeof testResultsObj !== "object") return undefined;

    return {
      resultsFile: this.convertToString(testResultsObj.resultsFile),
      lastRun: this.convertToISOString(testResultsObj.lastRun),
      summary: testResultsObj.summary
        ? {
            passed: this.convertToNumber(testResultsObj.summary.passed) || 0,
            failed: this.convertToNumber(testResultsObj.summary.failed) || 0,
            total: this.convertToNumber(testResultsObj.summary.total) || 0,
            executionTime:
              this.convertToNumber(testResultsObj.summary.executionTime) || 0,
          }
        : undefined,
    };
  }

  // ============================================================================
  // HELPER METHODS FOR TYPE CONVERSION AND MAPPING
  // ============================================================================

  private convertToString(value: any): string | undefined {
    if (value === null || value === undefined) return undefined;
    return String(value);
  }

  private convertToStringArray(value: any): string[] {
    if (!Array.isArray(value)) return [];
    return value
      .map((item) => this.convertToString(item))
      .filter(Boolean) as string[];
  }

  private convertToSubtaskArray(value: any): any[] {
    if (!Array.isArray(value)) return [];
    return value
      .map((item) => {
        if (typeof item === "object" && item !== null) {
          return {
            id: this.convertToString(item.id) || "unknown",
            description:
              this.convertToString(item.description) || "No description",
            status: this.convertToString(item.status) || "pending",
          };
        }
        return null;
      })
      .filter(Boolean);
  }

  private convertToNumber(value: any): number | undefined {
    if (value === null || value === undefined) return undefined;
    const num = Number(value);
    return isNaN(num) ? undefined : num;
  }

  private convertToBoolean(value: any, defaultValue: boolean): boolean {
    if (value === null || value === undefined) return defaultValue;
    if (typeof value === "boolean") return value;
    if (typeof value === "string") {
      const lower = value.toLowerCase();
      if (lower === "true" || lower === "1" || lower === "yes") return true;
      if (lower === "false" || lower === "0" || lower === "no") return false;
    }
    return defaultValue;
  }

  private convertToISOString(value: any): string | undefined {
    if (!value) return undefined;
    try {
      const date = new Date(value);
      return isNaN(date.getTime()) ? undefined : date.toISOString();
    } catch {
      return undefined;
    }
  }

  private mapStatus(status: any): TaskStatus {
    if (!status) {
      console.debug(`[JSONTaskParser] Empty status, defaulting to NOT_STARTED`);
      return TaskStatus.NOT_STARTED;
    }

    const statusStr = String(status).toLowerCase();
    console.debug(
      `[JSONTaskParser] Mapping status: "${status}" -> "${statusStr}"`
    );

    switch (statusStr) {
      case "done":
      case "completed":
        console.debug(`[JSONTaskParser] Status mapped to COMPLETED`);
        return TaskStatus.COMPLETED;
      case "in_progress":
      case "in progress":
      case "in-progress":
        console.debug(`[JSONTaskParser] Status mapped to IN_PROGRESS`);
        return TaskStatus.IN_PROGRESS;
      case "review":
      case "ready_for_review":
      case "ready for review":
      case "ready-for-review":
        console.debug(`[JSONTaskParser] Status mapped to REVIEW`);
        return TaskStatus.REVIEW;
      case "blocked":
        console.debug(`[JSONTaskParser] Status mapped to BLOCKED`);
        return TaskStatus.BLOCKED;
      case "deprecated":
        console.debug(`[JSONTaskParser] Status mapped to DEPRECATED`);
        return TaskStatus.DEPRECATED;
      case "not_started":
      case "not started":
      case "not-started":
      case "pending":
      case "to do":
      case "todo":
      default:
        console.debug(
          `[JSONTaskParser] Status "${statusStr}" mapped to NOT_STARTED (default)`
        );
        return TaskStatus.NOT_STARTED;
    }
  }

  private mapComplexity(complexity: any): TaskComplexity {
    if (!complexity) return TaskComplexity.LOW;

    const complexityStr = String(complexity).toLowerCase();

    switch (complexityStr) {
      case "extreme":
        return TaskComplexity.EXTREME;
      case "high":
        return TaskComplexity.HIGH;
      case "medium":
        return TaskComplexity.MEDIUM;
      case "low":
      default:
        return TaskComplexity.LOW;
    }
  }

  private mapPriority(priority: any): TaskPriority {
    if (!priority) return TaskPriority.MEDIUM;

    const priorityStr = String(priority).toLowerCase();

    switch (priorityStr) {
      case "critical":
        return TaskPriority.CRITICAL;
      case "high":
        return TaskPriority.HIGH;
      case "low":
        return TaskPriority.LOW;
      case "medium":
      default:
        return TaskPriority.MEDIUM;
    }
  }

  private mapTestStatus(status: any): TestStatusEnum {
    if (!status) return TestStatusEnum.NOT_RUN;

    const statusStr = String(status).toLowerCase();

    switch (statusStr) {
      case "passing":
        return TestStatusEnum.PASSING;
      case "failing":
        return TestStatusEnum.FAILING;
      case "partial":
        return TestStatusEnum.PARTIAL;
      case "error":
        return TestStatusEnum.ERROR;
      case "not_run":
      default:
        return TestStatusEnum.NOT_RUN;
    }
  }

  private mapTestCategory(
    category: any
  ): "assertion" | "type" | "filesystem" | "timeout" | "network" {
    if (!category) return "assertion";

    const categoryStr = String(category).toLowerCase();

    switch (categoryStr) {
      case "type":
        return "type";
      case "filesystem":
        return "filesystem";
      case "timeout":
        return "timeout";
      case "network":
        return "network";
      case "assertion":
      default:
        return "assertion";
    }
  }
}
