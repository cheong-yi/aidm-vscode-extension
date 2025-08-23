/**
 * MarkdownTaskParser - Basic class structure for parsing markdown task files
 * Recovery Task 2.1.2: Minimal class that compiles and can be instantiated
 * Recovery Task 2.1.3: Added parseTasksFromFile method with mock data
 * Recovery Task 2.1.4: Added parseTaskFromMarkdown method for individual task parsing
 * Enhanced Task 2.6.1: Update mock data to include estimatedDuration and enhanced test results
 * Enhanced Task 2.6.3: Add realistic ISO timestamp mock data for relative time testing
 * Requirements: 3.1-3.6, 4.1-4.4, 7.1-7.6, 6.8, 6.9, 7.7, 4.8, 7.9, 9.3
 */

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
   * Parse tasks from a markdown file and return enhanced mock Task data
   * Enhanced Task 2.6.1: Includes estimatedDuration, isExecutable, and enhanced test results
   *
   * @param filePath - Path to the markdown file (ignored for mock implementation)
   * @returns Promise<Task[]> - Array of enhanced mock Task objects
   */
  async parseTasksFromFile(filePath: string): Promise<Task[]> {
    // Enhanced mock tasks with realistic timestamps for comprehensive relative time testing
    // Task 2.6.3: Use TimestampGenerator for varied timestamp scenarios
    const mockTasks: Task[] = [
      {
        id: "3.1.1",
        title: "Create TaskTreeItem class with basic properties",
        description:
          "Create TaskTreeItem class extending vscode.TreeItem with basic properties (label, description, contextValue). Implement logic to assign appropriate icons based on task status.",
        status: TaskStatus.COMPLETED,
        complexity: TaskComplexity.LOW,
        dependencies: [],
        requirements: ["1.1"],
        createdDate: TimestampGenerator.generateScenarioTimestamp({
          name: "two_days",
          description: "2 days ago",
          minutesAgo: 2880,
          expectedRelativeTime: "2 days ago",
        }),
        lastModified: TimestampGenerator.generateScenarioTimestamp({
          name: "five_hours",
          description: "5 hours ago",
          minutesAgo: 300,
          expectedRelativeTime: "5 hours ago",
        }),
        assignee: "dev-team",
        estimatedHours: 2,
        actualHours: 1.5,
        estimatedDuration: "15-20 min",
        isExecutable: false,
        priority: TaskPriority.HIGH,
        tags: ["ui", "foundation"],
        statusDisplayName: STATUS_DISPLAY_NAMES[TaskStatus.COMPLETED],
        testStatus: {
          lastRunDate: TimestampGenerator.generateScenarioTimestamp({
            name: "two_hours",
            description: "2 hours ago",
            minutesAgo: 120,
            expectedRelativeTime: "2 hours ago",
          }),
          totalTests: 8,
          passedTests: 8,
          failedTests: 0,
          testSuite: "TaskTreeItem.test.ts",
          coverage: 95,
          status: TestStatusEnum.PASSING,
        },
      },
      {
        id: "3.1.2",
        title: "Add TaskTreeItem status indicator property",
        description:
          "Add iconPath property with status-based theme icons to TaskTreeItem. Implement logic to assign appropriate icons based on task status.",
        status: TaskStatus.NOT_STARTED,
        complexity: TaskComplexity.LOW,
        dependencies: ["3.1.1"],
        requirements: ["2.2"],
        createdDate: TimestampGenerator.generateScenarioTimestamp({
          name: "yesterday",
          description: "1 day ago",
          minutesAgo: 1440,
          expectedRelativeTime: "1 day ago",
        }),
        lastModified: TimestampGenerator.generateScenarioTimestamp({
          name: "yesterday",
          description: "1 day ago",
          minutesAgo: 1440,
          expectedRelativeTime: "1 day ago",
        }),
        assignee: "dev-team",
        estimatedHours: 1,
        actualHours: 0,
        estimatedDuration: "15-20 min",
        isExecutable: true,
        priority: TaskPriority.MEDIUM,
        tags: ["ui", "status-indicators"],
        statusDisplayName: STATUS_DISPLAY_NAMES[TaskStatus.NOT_STARTED],
        testStatus: undefined,
      },
      {
        id: "2.5.3",
        title: "Add tasks/update-status tool to SimpleMCPServer",
        description:
          "Implement the tasks/update-status MCP tool in SimpleMCPServer to handle task status update requests from the VSCode extension.",
        status: TaskStatus.COMPLETED,
        complexity: TaskComplexity.MEDIUM,
        dependencies: ["2.5.1", "2.5.2"],
        requirements: [],
        createdDate: TimestampGenerator.generateScenarioTimestamp({
          name: "three_days",
          description: "3 days ago",
          minutesAgo: 4320,
          expectedRelativeTime: "3 days ago",
        }),
        lastModified: TimestampGenerator.generateScenarioTimestamp({
          name: "five_hours",
          description: "5 hours ago",
          minutesAgo: 300,
          expectedRelativeTime: "5 hours ago",
        }),
        assignee: "senior-dev",
        estimatedHours: 4,
        actualHours: 3.5,
        estimatedDuration: "25-30 min",
        isExecutable: false,
        priority: TaskPriority.HIGH,
        tags: ["mcp", "server", "api"],
        statusDisplayName: STATUS_DISPLAY_NAMES[TaskStatus.COMPLETED],
        testStatus: {
          lastRunDate: TimestampGenerator.generateScenarioTimestamp({
            name: "two_hours",
            description: "2 hours ago",
            minutesAgo: 120,
            expectedRelativeTime: "2 hours ago",
          }),
          totalTests: 18,
          passedTests: 15,
          failedTests: 3,
          failingTestsList: FailingTestScenarios.generateScenariosForCategory(
            "assertion"
          )
            .slice(0, 1)
            .concat(
              FailingTestScenarios.generateScenariosForCategory("type").slice(
                0,
                1
              ),
              FailingTestScenarios.generateScenariosForCategory(
                "filesystem"
              ).slice(0, 1)
            ),
          testSuite: "SimpleMCPServer.test.ts",
          coverage: 85,
          status: TestStatusEnum.PARTIAL,
        },
      },
      {
        id: "2.6.1",
        title:
          "Update mock data to include estimatedDuration and enhanced test results",
        description:
          "Update existing mock task data in TasksDataService to include estimatedDuration field in '15-30 min' format, add isExecutable property logic for not_started tasks, and create comprehensive FailingTest mock data with proper error categories.",
        status: TaskStatus.IN_PROGRESS,
        complexity: TaskComplexity.MEDIUM,
        dependencies: ["2.2.1", "2.2.2", "2.2.3"],
        requirements: ["6.8", "6.9", "7.7"],
        createdDate: TimestampGenerator.generateScenarioTimestamp({
          name: "one_day",
          description: "1 day ago",
          minutesAgo: 1440,
          expectedRelativeTime: "1 day ago",
        }),
        lastModified: TimestampGenerator.generateScenarioTimestamp({
          name: "five_hours",
          description: "5 hours ago",
          minutesAgo: 300,
          expectedRelativeTime: "5 hours ago",
        }),
        assignee: "dev-team",
        estimatedHours: 3,
        actualHours: 1.5,
        estimatedDuration: "25-30 min",
        isExecutable: false,
        priority: TaskPriority.HIGH,
        tags: ["mock-data", "enhancement", "testing"],
        statusDisplayName: STATUS_DISPLAY_NAMES[TaskStatus.IN_PROGRESS],
        testStatus: {
          lastRunDate: TimestampGenerator.generateScenarioTimestamp({
            name: "five_hours",
            description: "5 hours ago",
            minutesAgo: 300,
            expectedRelativeTime: "5 hours ago",
          }),
          totalTests: 12,
          passedTests: 10,
          failedTests: 2,
          failingTestsList: FailingTestScenarios.generateScenariosForCategory(
            "assertion"
          )
            .slice(0, 1)
            .concat(
              FailingTestScenarios.generateScenariosForCategory("type").slice(
                0,
                1
              )
            ),
          testSuite: "EnhancedMockData.test.ts",
          coverage: 88,
          status: TestStatusEnum.PARTIAL,
        },
      },
      {
        id: "3.2.1",
        title: "Implement TimeFormattingUtility for relative timestamps",
        description:
          "Create TimeFormattingUtility class to format ISO timestamps as relative time strings (e.g., '2 hours ago', '3 days ago'). Integrate with Taskmaster Dashboard for consistent time display.",
        status: TaskStatus.NOT_STARTED,
        complexity: TaskComplexity.MEDIUM,
        dependencies: ["3.1.1", "3.1.2"],
        requirements: ["6.10", "7.8"],
        createdDate: TimestampGenerator.generateScenarioTimestamp({
          name: "yesterday",
          description: "1 day ago",
          minutesAgo: 1440,
          expectedRelativeTime: "1 day ago",
        }),
        lastModified: TimestampGenerator.generateScenarioTimestamp({
          name: "yesterday",
          description: "1 day ago",
          minutesAgo: 1440,
          expectedRelativeTime: "1 day ago",
        }),
        assignee: "dev-team",
        estimatedHours: 6,
        actualHours: 0,
        estimatedDuration: "30-45 min",
        isExecutable: true,
        priority: TaskPriority.MEDIUM,
        tags: ["utility", "time-formatting", "ui"],
        statusDisplayName: STATUS_DISPLAY_NAMES[TaskStatus.NOT_STARTED],
        testStatus: undefined,
      },
      {
        id: "4.1.1",
        title: "Create comprehensive test suite for Taskmaster Dashboard",
        description:
          "Develop comprehensive test coverage for all Taskmaster Dashboard components including unit tests, integration tests, and end-to-end workflow testing.",
        status: TaskStatus.NOT_STARTED,
        complexity: TaskComplexity.HIGH,
        dependencies: ["3.2.1", "2.6.1"],
        requirements: ["7.9", "7.10"],
        createdDate: TimestampGenerator.generateScenarioTimestamp({
          name: "yesterday",
          description: "1 day ago",
          minutesAgo: 1440,
          expectedRelativeTime: "1 day ago",
        }),
        lastModified: TimestampGenerator.generateScenarioTimestamp({
          name: "yesterday",
          description: "1 day ago",
          minutesAgo: 1440,
          expectedRelativeTime: "1 day ago",
        }),
        assignee: "qa-team",
        estimatedHours: 12,
        actualHours: 0,
        estimatedDuration: "45-60 min",
        isExecutable: true,
        priority: TaskPriority.CRITICAL,
        tags: ["testing", "quality", "coverage"],
        statusDisplayName: STATUS_DISPLAY_NAMES[TaskStatus.NOT_STARTED],
        testStatus: undefined,
      },
      {
        id: "5.1.1",
        title: "Performance optimization for large task lists",
        description:
          "Implement virtual scrolling and efficient rendering for task lists with 100+ items. Optimize memory usage and response times for enterprise-scale deployments.",
        status: TaskStatus.BLOCKED,
        complexity: TaskComplexity.EXTREME,
        dependencies: ["4.1.1", "3.2.1"],
        requirements: ["8.1", "8.2"],
        createdDate: TimestampGenerator.generateScenarioTimestamp({
          name: "yesterday",
          description: "1 day ago",
          minutesAgo: 1440,
          expectedRelativeTime: "1 day ago",
        }),
        lastModified: TimestampGenerator.generateScenarioTimestamp({
          name: "five_hours",
          description: "5 hours ago",
          minutesAgo: 300,
          expectedRelativeTime: "5 hours ago",
        }),
        assignee: "performance-team",
        estimatedHours: 20,
        actualHours: 0,
        estimatedDuration: "2-3 hours",
        isExecutable: false,
        priority: TaskPriority.CRITICAL,
        tags: ["performance", "optimization", "scalability"],
        statusDisplayName: STATUS_DISPLAY_NAMES[TaskStatus.BLOCKED],
        testStatus: {
          lastRunDate: TimestampGenerator.generateScenarioTimestamp({
            name: "two_hours",
            description: "2 hours ago",
            minutesAgo: 120,
            expectedRelativeTime: "2 hours ago",
          }),
          totalTests: 25,
          passedTests: 20,
          failedTests: 5,
          failingTestsList: FailingTestScenarios.generateBalancedScenarios(5),
          testSuite: "Performance.test.ts",
          coverage: 92,
          status: TestStatusEnum.PARTIAL,
        },
      },
      {
        id: "2.6.2",
        title: "Create comprehensive failing test scenarios",
        description:
          "Create comprehensive failing test scenarios with proper error categorization that matches the expandable list mockup design for test results display. Must cover all 5 error categories with realistic error messages and stack traces.",
        status: TaskStatus.COMPLETED,
        complexity: TaskComplexity.MEDIUM,
        dependencies: ["2.6.1"],
        requirements: ["5.8", "7.7"],
        createdDate: TimestampGenerator.generateScenarioTimestamp({
          name: "five_hours",
          description: "5 hours ago",
          minutesAgo: 300,
          expectedRelativeTime: "5 hours ago",
        }),
        lastModified: TimestampGenerator.generateScenarioTimestamp({
          name: "two_hours",
          description: "2 hours ago",
          minutesAgo: 120,
          expectedRelativeTime: "2 hours ago",
        }),
        assignee: "dev-team",
        estimatedHours: 3,
        actualHours: 2.5,
        estimatedDuration: "25-30 min",
        isExecutable: false,
        priority: TaskPriority.HIGH,
        tags: ["testing", "error-handling", "mock-data"],
        statusDisplayName: STATUS_DISPLAY_NAMES[TaskStatus.COMPLETED],
        testStatus: {
          lastRunDate: TimestampGenerator.generateScenarioTimestamp({
            name: "two_hours",
            description: "2 hours ago",
            minutesAgo: 120,
            expectedRelativeTime: "2 hours ago",
          }),
          totalTests: 22,
          passedTests: 18,
          failedTests: 4,
          failingTestsList: FailingTestScenarios.generateBalancedScenarios(4),
          testSuite: "FailingTestScenarios.test.ts",
          coverage: 90,
          status: TestStatusEnum.PARTIAL,
        },
      },
      {
        id: "3.3.1",
        title: "Implement test results display component",
        description:
          "Create collapsible test results display component that shows test statistics, expandable failure sections, and categorized error display matching the mockup design requirements.",
        status: TaskStatus.IN_PROGRESS,
        complexity: TaskComplexity.MEDIUM,
        dependencies: ["2.6.2", "3.1.1"],
        requirements: ["7.7", "7.8"],
        createdDate: TimestampGenerator.generateScenarioTimestamp({
          name: "five_hours",
          description: "5 hours ago",
          minutesAgo: 300,
          expectedRelativeTime: "5 hours ago",
        }),
        lastModified: TimestampGenerator.generateScenarioTimestamp({
          name: "five_hours",
          description: "5 hours ago",
          minutesAgo: 300,
          expectedRelativeTime: "5 hours ago",
        }),
        assignee: "ui-team",
        estimatedHours: 6,
        actualHours: 2,
        estimatedDuration: "30-45 min",
        isExecutable: false,
        priority: TaskPriority.MEDIUM,
        tags: ["ui", "test-results", "components"],
        statusDisplayName: STATUS_DISPLAY_NAMES[TaskStatus.IN_PROGRESS],
        testStatus: {
          lastRunDate: TimestampGenerator.generateScenarioTimestamp({
            name: "two_hours",
            description: "2 hours ago",
            minutesAgo: 120,
            expectedRelativeTime: "2 hours ago",
          }),
          totalTests: 15,
          passedTests: 12,
          failedTests: 3,
          failingTestsList: FailingTestScenarios.generateRandomScenarios(3),
          testSuite: "TestResultsDisplay.test.ts",
          coverage: 80,
          status: TestStatusEnum.PARTIAL,
        },
      },
      {
        id: "4.2.1",
        title: "Integration testing for error handling workflows",
        description:
          "Develop comprehensive integration tests for error handling workflows including network failures, file system errors, and timeout scenarios to ensure robust error recovery.",
        status: TaskStatus.NOT_STARTED,
        complexity: TaskComplexity.HIGH,
        dependencies: ["2.6.2", "3.3.1"],
        requirements: ["7.9", "7.10"],
        createdDate: TimestampGenerator.generateScenarioTimestamp({
          name: "five_hours",
          description: "5 hours ago",
          minutesAgo: 300,
          expectedRelativeTime: "5 hours ago",
        }),
        lastModified: TimestampGenerator.generateScenarioTimestamp({
          name: "five_hours",
          description: "5 hours ago",
          minutesAgo: 300,
          expectedRelativeTime: "5 hours ago",
        }),
        assignee: "qa-team",
        estimatedHours: 8,
        actualHours: 0,
        estimatedDuration: "45-60 min",
        isExecutable: true,
        priority: TaskPriority.HIGH,
        tags: ["integration-testing", "error-handling", "workflows"],
        statusDisplayName: STATUS_DISPLAY_NAMES[TaskStatus.NOT_STARTED],
        testStatus: undefined,
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
        createdDate: new Date().toISOString(),
        lastModified: new Date().toISOString(),
        priority: TaskPriority.MEDIUM,
      };
    } catch (error) {
      return null;
    }
  }
}
