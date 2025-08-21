/**
 * Mock Task Data for Testing
 * Realistic enterprise task hierarchies with various states and dependencies
 * Requirements: 2.1, 3.1-3.6, 4.1-4.4, 7.1-7.6
 */

import {
  Task,
  TaskStatus,
  TaskComplexity,
  TaskPriority,
  TestStatus,
} from "../types/tasks";

/**
 * Generate realistic enterprise task data for testing
 */
export class TaskMockDataGenerator {
  private static readonly taskTitles = {
    // Core Infrastructure
    infrastructure: [
      "Database Schema Migration",
      "API Gateway Implementation",
      "Load Balancer Configuration",
      "Monitoring Dashboard Setup",
      "Security Audit Implementation",
      "CI/CD Pipeline Optimization",
      "Container Orchestration Setup",
      "Backup and Recovery System",
      "Performance Testing Framework",
      "Logging and Analytics Platform",
    ],
    // Business Features
    features: [
      "User Authentication System",
      "Payment Processing Integration",
      "Reporting Dashboard",
      "Data Export Functionality",
      "Real-time Notifications",
      "Search and Filtering",
      "Bulk Operations Support",
      "Audit Trail Implementation",
      "Multi-language Support",
      "Mobile App Development",
    ],
    // Quality Assurance
    qa: [
      "Unit Test Coverage",
      "Integration Test Suite",
      "End-to-End Testing",
      "Performance Testing",
      "Security Testing",
      "Accessibility Testing",
      "Cross-browser Testing",
      "Mobile Testing",
      "API Testing",
      "Database Testing",
    ],
    // Documentation
    docs: [
      "API Documentation",
      "User Manual Creation",
      "Developer Guide",
      "Architecture Documentation",
      "Deployment Guide",
      "Troubleshooting Guide",
      "Code Comments",
      "README Updates",
      "Change Log Maintenance",
      "Knowledge Base Articles",
    ],
  };

  private static readonly assignees = [
    "alice.developer",
    "bob.architect",
    "carol.qa",
    "dave.devops",
    "eve.frontend",
    "frank.backend",
    "grace.ux",
    "henry.techlead",
    "iris.senior",
    "jack.junior",
  ];

  private static readonly tags = [
    "frontend",
    "backend",
    "database",
    "api",
    "security",
    "performance",
    "testing",
    "documentation",
    "devops",
    "ui/ux",
    "mobile",
    "analytics",
    "monitoring",
    "logging",
  ];

  /**
   * Generate a complete enterprise task hierarchy
   */
  static generateEnterpriseTasks(): Task[] {
    const tasks: Task[] = [];
    let taskId = 1;

    // Phase 1: Foundation & Infrastructure
    const foundationTasks = this.generatePhaseTasks(
      "Foundation & Infrastructure",
      taskId,
      5,
      {
        complexity: [TaskComplexity.HIGH, TaskComplexity.EXTREME],
        priority: [TaskPriority.HIGH, TaskPriority.CRITICAL],
        status: [TaskStatus.COMPLETED, TaskStatus.IN_PROGRESS],
      }
    );
    tasks.push(...foundationTasks);
    taskId += foundationTasks.length;

    // Phase 2: Core Business Logic
    const coreTasks = this.generatePhaseTasks(
      "Core Business Logic",
      taskId,
      8,
      {
        complexity: [TaskComplexity.MEDIUM, TaskComplexity.HIGH],
        priority: [TaskPriority.HIGH, TaskPriority.MEDIUM],
        status: [
          TaskStatus.IN_PROGRESS,
          TaskStatus.REVIEW,
          TaskStatus.NOT_STARTED,
        ],
        dependencies: foundationTasks.map((t) => t.id),
      }
    );
    tasks.push(...coreTasks);
    taskId += coreTasks.length;

    // Phase 3: User Interface & Experience
    const uiTasks = this.generatePhaseTasks(
      "User Interface & Experience",
      taskId,
      6,
      {
        complexity: [TaskComplexity.MEDIUM, TaskComplexity.HIGH],
        priority: [TaskPriority.MEDIUM, TaskPriority.HIGH],
        status: [TaskStatus.NOT_STARTED, TaskStatus.IN_PROGRESS],
        dependencies: coreTasks.slice(0, 4).map((t) => t.id), // Depend on core business logic
      }
    );
    tasks.push(...uiTasks);
    taskId += uiTasks.length;

    // Phase 4: Quality Assurance & Testing
    const qaTasks = this.generatePhaseTasks(
      "Quality Assurance & Testing",
      taskId,
      7,
      {
        complexity: [TaskComplexity.LOW, TaskComplexity.MEDIUM],
        priority: [TaskPriority.MEDIUM, TaskPriority.HIGH],
        status: [TaskStatus.NOT_STARTED, TaskStatus.BLOCKED],
        dependencies: [
          ...coreTasks.map((t) => t.id),
          ...uiTasks.map((t) => t.id),
        ],
      }
    );
    tasks.push(...qaTasks);
    taskId += qaTasks.length;

    // Phase 5: Documentation & Deployment
    const deploymentTasks = this.generatePhaseTasks(
      "Documentation & Deployment",
      taskId,
      4,
      {
        complexity: [TaskComplexity.LOW, TaskComplexity.MEDIUM],
        priority: [TaskPriority.MEDIUM, TaskPriority.LOW],
        status: [TaskStatus.NOT_STARTED],
        dependencies: [
          ...coreTasks.map((t) => t.id),
          ...uiTasks.map((t) => t.id),
          ...qaTasks.map((t) => t.id),
        ],
      }
    );
    tasks.push(...deploymentTasks);

    // Add some blocked tasks due to dependencies
    this.addBlockedTasks(tasks);

    // Add some tasks with test results
    this.addTestResults(tasks);

    // Add some edge cases
    this.addEdgeCaseTasks(tasks);

    return tasks;
  }

  /**
   * Generate tasks for a specific phase
   */
  private static generatePhaseTasks(
    phaseName: string,
    startId: number,
    count: number,
    options: {
      complexity?: TaskComplexity[];
      priority?: TaskPriority[];
      status?: TaskStatus[];
      dependencies?: string[];
    }
  ): Task[] {
    const tasks: Task[] = [];
    const phaseTitles = this.getPhaseTitles(phaseName);

    for (let i = 0; i < count; i++) {
      const taskId = `${startId + i}.${Math.floor(Math.random() * 3) + 1}`;
      const title = phaseTitles[i % phaseTitles.length];
      const complexity = this.randomChoice(
        options.complexity || [TaskComplexity.MEDIUM]
      );
      const priority = this.randomChoice(
        options.priority || [TaskPriority.MEDIUM]
      );
      const status = this.randomChoice(
        options.status || [TaskStatus.NOT_STARTED]
      );
      const assignee = this.randomChoice(this.assignees);
      const tags = this.randomSubset(
        this.tags,
        Math.floor(Math.random() * 3) + 1
      );

      const task: Task = {
        id: taskId,
        title: `${phaseName}: ${title}`,
        description: this.generateTaskDescription(title, complexity),
        status,
        complexity,
        priority,
        dependencies: options.dependencies || [],
        requirements: this.generateRequirements(taskId),
        createdDate: this.randomDate(
          new Date(2024, 0, 1),
          new Date(2024, 5, 1)
        ),
        lastModified: this.randomDate(new Date(2024, 5, 1), new Date()),
        assignee,
        estimatedHours: this.estimateHours(complexity),
        actualHours:
          status === TaskStatus.COMPLETED
            ? this.estimateHours(complexity)
            : undefined,
        tags,
      };

      tasks.push(task);
    }

    return tasks;
  }

  /**
   * Get titles for a specific phase
   */
  private static getPhaseTitles(phaseName: string): string[] {
    switch (phaseName) {
      case "Foundation & Infrastructure":
        return this.taskTitles.infrastructure;
      case "Core Business Logic":
        return this.taskTitles.features;
      case "User Interface & Experience":
        return this.taskTitles.features.slice(0, 6);
      case "Quality Assurance & Testing":
        return this.taskTitles.qa;
      case "Documentation & Deployment":
        return this.taskTitles.docs;
      default:
        return this.taskTitles.features;
    }
  }

  /**
   * Generate task description based on title and complexity
   */
  private static generateTaskDescription(
    title: string,
    complexity: TaskComplexity
  ): string {
    const descriptions = {
      [TaskComplexity.LOW]: [
        `Implement basic ${title.toLowerCase()} functionality with minimal complexity.`,
        `Create simple ${title.toLowerCase()} following established patterns.`,
        `Add ${title.toLowerCase()} with straightforward requirements.`,
      ],
      [TaskComplexity.MEDIUM]: [
        `Develop ${title.toLowerCase()} with moderate complexity and integration requirements.`,
        `Implement ${title.toLowerCase()} including error handling and edge cases.`,
        `Build ${title.toLowerCase()} with multiple components and data flow.`,
      ],
      [TaskComplexity.HIGH]: [
        `Architect and implement complex ${title.toLowerCase()} with multiple subsystems.`,
        `Develop ${title.toLowerCase()} requiring significant design decisions and optimization.`,
        `Create ${title.toLowerCase()} with complex business logic and performance requirements.`,
      ],
      [TaskComplexity.EXTREME]: [
        `Design and implement enterprise-grade ${title.toLowerCase()} with critical business impact.`,
        `Develop ${title.toLowerCase()} requiring advanced architecture patterns and scalability.`,
        `Create ${title.toLowerCase()} with complex integrations, security, and compliance requirements.`,
      ],
    };

    return this.randomChoice(descriptions[complexity]);
  }

  /**
   * Generate requirements references
   */
  private static generateRequirements(taskId: string): string[] {
    const reqIds = [];
    const numReqs = Math.floor(Math.random() * 3) + 1;

    for (let i = 0; i < numReqs; i++) {
      const reqId = `REQ-${Math.floor(Math.random() * 100) + 1}`;
      reqIds.push(reqId);
    }

    return reqIds;
  }

  /**
   * Estimate hours based on complexity
   */
  private static estimateHours(complexity: TaskComplexity): number {
    const estimates = {
      [TaskComplexity.LOW]: [2, 4, 6, 8],
      [TaskComplexity.MEDIUM]: [8, 16, 24, 32],
      [TaskComplexity.HIGH]: [32, 48, 64, 80],
      [TaskComplexity.EXTREME]: [80, 120, 160, 200],
    };

    return this.randomChoice(estimates[complexity]);
  }

  /**
   * Add blocked tasks due to dependencies
   */
  private static addBlockedTasks(tasks: Task[]): void {
    // Find some tasks that should be blocked
    const tasksWithDependencies = tasks.filter(
      (t) => t.dependencies.length > 0
    );

    for (const task of tasksWithDependencies.slice(0, 3)) {
      // Check if dependencies are incomplete
      const incompleteDeps = task.dependencies.filter((depId) => {
        const depTask = tasks.find((t) => t.id === depId);
        return depTask && depTask.status !== TaskStatus.COMPLETED;
      });

      if (incompleteDeps.length > 0) {
        task.status = TaskStatus.BLOCKED;
      }
    }
  }

  /**
   * Add test results to completed tasks
   */
  private static addTestResults(tasks: Task[]): void {
    const completedTasks = tasks.filter(
      (t) => t.status === TaskStatus.COMPLETED
    );

    for (const task of completedTasks.slice(
      0,
      Math.floor(completedTasks.length * 0.7)
    )) {
      const totalTests = Math.floor(Math.random() * 50) + 10;
      const passedTests =
        Math.floor(totalTests * 0.85) +
        Math.floor(Math.random() * (totalTests * 0.15));
      const failedTests = totalTests - passedTests;

      task.testStatus = {
        lastRunDate: this.randomDate(task.lastModified, new Date()),
        totalTests,
        passedTests,
        failedTests,
        testSuite: this.randomChoice([
          "Unit Tests",
          "Integration Tests",
          "E2E Tests",
          "Performance Tests",
        ]),
        coverage: Math.floor(Math.random() * 20) + 80, // 80-100% coverage
        failingTestsList:
          failedTests > 0 ? this.generateFailingTests(failedTests) : undefined,
      };
    }
  }

  /**
   * Generate failing test details
   */
  private static generateFailingTests(
    count: number
  ): { name: string; message: string; stackTrace?: string }[] {
    const testNames = [
      "testUserAuthentication",
      "testPaymentProcessing",
      "testDataValidation",
      "testAPIEndpoints",
      "testDatabaseOperations",
      "testErrorHandling",
      "testPerformanceMetrics",
      "testSecurityFeatures",
    ];

    const failingTests = [];
    for (let i = 0; i < count; i++) {
      failingTests.push({
        name: this.randomChoice(testNames),
        message: `Test failed due to ${this.randomChoice([
          "timeout",
          "assertion error",
          "network issue",
          "data mismatch",
        ])}`,
        stackTrace:
          Math.random() > 0.5
            ? "Error: Test assertion failed\n    at Test.run (/test/runner.js:45:15)"
            : undefined,
      });
    }

    return failingTests;
  }

  /**
   * Add edge case tasks for testing
   */
  private static addEdgeCaseTasks(tasks: Task[]): void {
    // Task with circular dependency (for testing validation)
    const circularTask: Task = {
      id: "999.1",
      title: "Circular Dependency Test Task",
      description:
        "This task has circular dependencies to test validation logic",
      status: TaskStatus.BLOCKED,
      complexity: TaskComplexity.MEDIUM,
      priority: TaskPriority.MEDIUM,
      dependencies: ["999.2"],
      requirements: ["REQ-999"],
      createdDate: new Date(2024, 5, 1),
      lastModified: new Date(2024, 5, 15),
      tags: ["testing", "edge-case"],
    };

    const circularDependency: Task = {
      id: "999.2",
      title: "Circular Dependency Test Task 2",
      description: "This task depends on the first circular task",
      status: TaskStatus.BLOCKED,
      complexity: TaskComplexity.MEDIUM,
      priority: TaskPriority.MEDIUM,
      dependencies: ["999.1"],
      requirements: ["REQ-998"],
      createdDate: new Date(2024, 5, 1),
      lastModified: new Date(2024, 5, 15),
      tags: ["testing", "edge-case"],
    };

    // Task with very long description
    const longDescTask: Task = {
      id: "998.1",
      title: "Task with Extremely Long Description",
      description:
        "This task has an extremely long description that tests the parsing and display capabilities of the task management system. It includes multiple paragraphs with various formatting and content to ensure that the system can handle realistic enterprise task descriptions that may contain detailed requirements, technical specifications, business context, and implementation notes. The description should be long enough to test UI components, search functionality, and any text processing features.",
      status: TaskStatus.IN_PROGRESS,
      complexity: TaskComplexity.HIGH,
      priority: TaskPriority.HIGH,
      dependencies: [],
      requirements: ["REQ-997"],
      createdDate: new Date(2024, 5, 1),
      lastModified: new Date(2024, 5, 20),
      assignee: "henry.techlead",
      estimatedHours: 64,
      actualHours: 32,
      tags: ["testing", "edge-case", "documentation"],
    };

    // Task with special characters in title
    const specialCharTask: Task = {
      id: "997.1",
      title: "Task with Special Characters: @#$%^&*()_+-=[]{}|;:,.<>?",
      description: "This task tests handling of special characters in titles",
      status: TaskStatus.NOT_STARTED,
      complexity: TaskComplexity.LOW,
      priority: TaskPriority.LOW,
      dependencies: [],
      requirements: ["REQ-996"],
      createdDate: new Date(2024, 5, 1),
      lastModified: new Date(2024, 5, 1),
      tags: ["testing", "edge-case"],
    };

    tasks.push(circularTask, circularDependency, longDescTask, specialCharTask);
  }

  /**
   * Generate sample tasks.md content
   */
  static generateSampleTasksMd(): string {
    const tasks = this.generateEnterpriseTasks();
    let content = "# Enterprise Project Tasks\n\n";

    // Group by status
    const statusGroups = {
      [TaskStatus.COMPLETED]: tasks.filter(
        (t) => t.status === TaskStatus.COMPLETED
      ),
      [TaskStatus.IN_PROGRESS]: tasks.filter(
        (t) => t.status === TaskStatus.IN_PROGRESS
      ),
      [TaskStatus.REVIEW]: tasks.filter((t) => t.status === TaskStatus.REVIEW),
      [TaskStatus.NOT_STARTED]: tasks.filter(
        (t) => t.status === TaskStatus.NOT_STARTED
      ),
      [TaskStatus.BLOCKED]: tasks.filter(
        (t) => t.status === TaskStatus.BLOCKED
      ),
    };

    for (const [status, statusTasks] of Object.entries(statusGroups)) {
      if (statusTasks.length > 0) {
        content += `## ${status.replace("_", " ").toUpperCase()}\n\n`;

        for (const task of statusTasks) {
          const checkbox = task.status === TaskStatus.COMPLETED ? "x" : " ";
          content += `- [${checkbox}] ${task.id} ${task.title}\n`;

          if (task.description) {
            content += `  - ${task.description}\n`;
          }

          if (task.assignee) {
            content += `  - Assignee: ${task.assignee}\n`;
          }

          if (task.estimatedHours) {
            content += `  - Estimated: ${task.estimatedHours}h\n`;
          }

          if (task.requirements && task.requirements.length > 0) {
            content += `  _Requirements: ${task.requirements.join(", ")}_\n`;
          }

          content += "\n";
        }
      }
    }

    return content;
  }

  /**
   * Utility: Random choice from array
   */
  private static randomChoice<T>(array: T[]): T {
    return array[Math.floor(Math.random() * array.length)];
  }

  /**
   * Utility: Random subset from array
   */
  private static randomSubset<T>(array: T[], count: number): T[] {
    const shuffled = [...array].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, count);
  }

  /**
   * Utility: Random date between two dates
   */
  private static randomDate(start: Date, end: Date): Date {
    return new Date(
      start.getTime() + Math.random() * (end.getTime() - start.getTime())
    );
  }
}

/**
 * Pre-generated mock data for immediate testing
 */
export const mockTaskData = {
  // Small dataset for quick tests
  small: TaskMockDataGenerator.generateEnterpriseTasks().slice(0, 10),

  // Medium dataset for integration tests
  medium: TaskMockDataGenerator.generateEnterpriseTasks().slice(0, 25),

  // Large dataset for performance tests
  large: TaskMockDataGenerator.generateEnterpriseTasks(),

  // Edge cases only
  edgeCases: TaskMockDataGenerator.generateEnterpriseTasks().filter(
    (t) =>
      t.id.startsWith("99") || t.id.startsWith("998") || t.id.startsWith("997")
  ),

  // Sample markdown content
  sampleMarkdown: TaskMockDataGenerator.generateSampleTasksMd(),
};
