/**
 * Failing Test Scenarios Generator
 * Task 2.6.2: Create comprehensive failing test scenarios with realistic errors
 * Requirements: 5.8, 7.7
 *
 * Generates realistic FailingTest objects covering all error categories:
 * - assertion: Test logic failures, expect mismatches
 * - type: TypeScript/type-related errors
 * - filesystem: File access, permission errors
 * - timeout: Test execution timeouts
 * - network: API/service communication failures
 */

import { FailingTest } from "../types/tasks";

export interface FailingTestScenario {
  name: string;
  message: string;
  stackTrace?: string;
  category: "assertion" | "type" | "filesystem" | "timeout" | "network";
}

export class FailingTestScenarios {
  /**
   * Generate comprehensive failing test scenarios covering all error categories
   * @returns Array of FailingTest objects with realistic error scenarios
   */
  static generateComprehensiveScenarios(): FailingTest[] {
    return [
      // Assertion Category - Test logic failures and expect mismatches
      {
        name: "should validate task status transitions",
        message:
          "AssertionError: Expected status 'blocked' but received 'in_progress'",
        stackTrace:
          "at Object.<anonymous> (/test/status-transitions.test.ts:45:12)\n    at TaskStatusManager.validateStatusTransition (/src/services/TaskStatusManager.ts:23:8)",
        category: "assertion",
      },
      {
        name: "should handle task dependency validation",
        message: "AssertionError: Expected dependency count to be 2, but got 3",
        stackTrace:
          "at Object.<anonymous> (/test/dependency-validation.test.ts:67:15)\n    at validateDependencies (/src/validation/dependencies.ts:34:12)",
        category: "assertion",
      },
      {
        name: "should validate task complexity levels",
        message:
          "AssertionError: Expected complexity 'medium' but received 'high'",
        stackTrace:
          "at Object.<anonymous> (/test/complexity-validation.test.ts:89:23)\n    at TaskComplexityValidator.validate (/src/validation/complexity.ts:56:18)",
        category: "assertion",
      },
      {
        name: "should verify estimated duration format",
        message:
          "AssertionError: Expected duration format '15-30 min' but got '15 minutes'",
        stackTrace:
          "at Object.<anonymous> (/test/duration-format.test.ts:123:45)\n    at DurationFormatter.format (/src/utils/duration.ts:78:29)",
        category: "assertion",
      },
      {
        name: "should validate test coverage thresholds",
        message: "AssertionError: Expected coverage >= 90%, but got 85%",
        stackTrace:
          "at Object.<anonymous> (/test/coverage-validation.test.ts:156:78)\n    at CoverageValidator.checkThreshold (/src/validation/coverage.ts:92:34)",
        category: "assertion",
      },

      // Type Category - TypeScript and type-related errors
      {
        name: "should handle task data serialization",
        message:
          "TypeError: Cannot read property 'estimatedDuration' of undefined",
        stackTrace:
          "at TaskWebviewProvider.formatDuration (/src/tasks/providers/TaskWebviewProvider.ts:23:8)\n    at renderTaskDetails (/src/ui/task-details.ts:67:15)",
        category: "type",
      },
      {
        name: "should validate task ID format",
        message: "TypeError: Parameter 'id' must be a string, received number",
        stackTrace:
          "at validateTaskId (/src/validation/task-id.ts:23:8)\n    at TaskService.getTaskById (/src/services/TaskService.ts:45:12)",
        category: "type",
      },
      {
        name: "should handle optional task properties",
        message: "TypeError: Cannot read property 'testStatus' of null",
        stackTrace:
          "at renderTestResults (/src/ui/test-results.ts:45:12)\n    at TaskDetailCard.render (/src/ui/task-detail-card.ts:89:23)",
        category: "type",
      },
      {
        name: "should validate task status enum values",
        message: "TypeError: 'invalid_status' is not a valid TaskStatus value",
        stackTrace:
          "at TaskStatusValidator.validate (/src/validation/status.ts:34:18)\n    at TaskStatusManager.updateStatus (/src/services/TaskStatusManager.ts:67:29)",
        category: "type",
      },
      {
        name: "should handle task priority assignment",
        message: "TypeError: Cannot assign 'urgent' to TaskPriority type",
        stackTrace:
          "at assignTaskPriority (/src/utils/priority.ts:56:12)\n    at TaskCreator.create (/src/services/TaskCreator.ts:78:34)",
        category: "type",
      },

      // Filesystem Category - File access and permission errors
      {
        name: "should persist task updates to file",
        message: "EACCES: permission denied, open '/workspace/tasks.md'",
        stackTrace:
          "at Object.writeFileSync (fs.js:1234:12)\n    at TaskFileWriter.write (/src/utils/file-writer.ts:67:15)",
        category: "filesystem",
      },
      {
        name: "should read task configuration from disk",
        message:
          "ENOENT: no such file or directory, open './config/tasks.json'",
        stackTrace:
          "at Object.readFileSync (fs.js:567:8)\n    at ConfigLoader.load (/src/config/loader.ts:34:23)",
        category: "filesystem",
      },
      {
        name: "should create backup of tasks file",
        message: "ENOSPC: no space left on device",
        stackTrace:
          "at Object.writeFileSync (fs.js:890:12)\n    at BackupService.create (/src/services/backup.ts:89:45)",
        category: "filesystem",
      },
      {
        name: "should validate file permissions",
        message: "EACCES: permission denied, access '/var/log/task-audit.log'",
        stackTrace:
          "at Object.accessSync (fs.js:234:18)\n    at AuditLogger.log (/src/security/audit.ts:123:67)",
        category: "filesystem",
      },
      {
        name: "should handle file locking conflicts",
        message:
          "EBUSY: resource busy or locked, open '/workspace/.aidm/task-cache.json'",
        stackTrace:
          "at Object.openSync (fs.js:456:12)\n    at CacheManager.update (/src/cache/manager.ts:156:78)",
        category: "filesystem",
      },

      // Timeout Category - Test execution timeouts
      {
        name: "should fetch tasks from MCP server",
        message: "Test timeout: Operation exceeded 5000ms limit",
        stackTrace:
          "at Object.<anonymous> (/test/mcp-integration.test.ts:234:56)\n    at fetchTasksFromServer (/src/services/mcp-client.ts:89:123)",
        category: "timeout",
      },
      {
        name: "should process large task datasets",
        message:
          "Test timeout: Processing 1000+ tasks exceeded 10 second limit",
        stackTrace:
          "at Object.<anonymous> (/test/performance/large-dataset.test.ts:456:78)\n    at TaskProcessor.process (/src/services/task-processor.ts:234:156)",
        category: "timeout",
      },
      {
        name: "should validate complex dependency trees",
        message:
          "Test timeout: Dependency resolution for deep tree exceeded 8 second limit",
        stackTrace:
          "at Object.<anonymous> (/test/dependency-resolution.test.ts:567:89)\n    at DependencyResolver.resolve (/src/services/dependency-resolver.ts:345:234)",
        category: "timeout",
      },
      {
        name: "should generate comprehensive test reports",
        message: "Test timeout: Report generation exceeded 15 second limit",
        stackTrace:
          "at Object.<anonymous> (/test/report-generation.test.ts:678:123)\n    at ReportGenerator.generate (/src/services/report-generator.ts:456:345)",
        category: "timeout",
      },
      {
        name: "should handle concurrent task updates",
        message:
          "Test timeout: Concurrent update simulation exceeded 12 second limit",
        stackTrace:
          "at Object.<anonymous> (/test/concurrency/updates.test.ts:789:156)\n    at ConcurrencyTester.simulate (/src/testing/concurrency.ts:567:456)",
        category: "timeout",
      },

      // Network Category - API and service communication failures
      {
        name: "should update task status via API",
        message:
          "NetworkError: fetch failed - Connection refused on localhost:3001",
        stackTrace:
          "at fetch (/src/services/api-client.ts:123:45)\n    at TaskAPIService.updateStatus (/src/services/task-api.ts:234:67)",
        category: "network",
      },
      {
        name: "should sync tasks with remote repository",
        message: "NetworkError: Request timeout after 10000ms",
        stackTrace:
          "at fetchWithTimeout (/src/utils/network.ts:89:123)\n    at RemoteSyncService.sync (/src/services/remote-sync.ts:345:234)",
        category: "network",
      },
      {
        name: "should authenticate with MCP server",
        message: "NetworkError: SSL certificate verification failed",
        stackTrace:
          "at secureRequest (/src/utils/ssl.ts:234:156)\n    at MCPServerClient.authenticate (/src/client/mcp-client.ts:456:345)",
        category: "network",
      },
      {
        name: "should handle rate limiting responses",
        message: "NetworkError: 429 Too Many Requests - Rate limit exceeded",
        stackTrace:
          "at handleResponse (/src/utils/response-handler.ts:345:234)\n    at TaskService.bulkUpdate (/src/services/task-service.ts:567:456)",
        category: "network",
      },
      {
        name: "should recover from network interruptions",
        message: "NetworkError: ECONNRESET - Connection reset by peer",
        stackTrace:
          "at handleConnectionError (/src/utils/connection.ts:456:345)\n    at NetworkManager.retry (/src/services/network-manager.ts:678:567)",
        category: "network",
      },
    ];
  }

  /**
   * Generate failing test scenarios for a specific error category
   * @param category - The error category to generate scenarios for
   * @returns Array of FailingTest objects for the specified category
   */
  static generateScenariosForCategory(
    category: "assertion" | "type" | "filesystem" | "timeout" | "network"
  ): FailingTest[] {
    const allScenarios = this.generateComprehensiveScenarios();
    return allScenarios.filter((scenario) => scenario.category === category);
  }

  /**
   * Generate a random selection of failing test scenarios
   * @param count - Number of scenarios to generate
   * @returns Array of randomly selected FailingTest objects
   */
  static generateRandomScenarios(count: number): FailingTest[] {
    const allScenarios = this.generateComprehensiveScenarios();
    const shuffled = [...allScenarios].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, Math.min(count, allScenarios.length));
  }

  /**
   * Generate failing test scenarios with specific failure counts
   * @param failureCount - Number of failures to generate
   * @returns Array of FailingTest objects with balanced category distribution
   */
  static generateBalancedScenarios(failureCount: number): FailingTest[] {
    const allScenarios = this.generateComprehensiveScenarios();
    const categories = [
      "assertion",
      "type",
      "filesystem",
      "timeout",
      "network",
    ] as const;
    const scenariosPerCategory = Math.ceil(failureCount / categories.length);

    const balancedScenarios: FailingTest[] = [];

    for (const category of categories) {
      const categoryScenarios = allScenarios.filter(
        (s) => s.category === category
      );
      const selected = categoryScenarios.slice(0, scenariosPerCategory);
      balancedScenarios.push(...selected);
    }

    // Shuffle and limit to exact failure count
    const shuffled = balancedScenarios.sort(() => 0.5 - Math.random());
    return shuffled.slice(0, failureCount);
  }

  /**
   * Validate and sanitize a FailingTest object
   * @param failingTest - The FailingTest object to validate
   * @returns Validated FailingTest object with fallback values if needed
   */
  static validateFailingTest(failingTest: Partial<FailingTest>): FailingTest {
    const validCategories = [
      "assertion",
      "type",
      "filesystem",
      "timeout",
      "network",
    ] as const;

    return {
      name: failingTest.name || "Unnamed test failure",
      message: failingTest.message || "No error message provided",
      stackTrace: failingTest.stackTrace,
      category: validCategories.includes(failingTest.category as any)
        ? (failingTest.category as any)
        : "assertion", // Fallback to assertion category
    };
  }

  /**
   * Generate realistic stack traces for specific error types
   * @param errorType - The type of error to generate stack trace for
   * @param fileName - The source file name
   * @param lineNumber - The line number where error occurred
   * @returns Realistic stack trace string
   */
  static generateStackTrace(
    errorType: "assertion" | "type",
    fileName: string,
    lineNumber: number
  ): string {
    const basePath = "/src";
    const methodNames = {
      assertion: ["validate", "assert", "expect", "check"],
      type: ["parse", "validate", "transform", "convert"],
    };

    const methodName =
      methodNames[errorType][
        Math.floor(Math.random() * methodNames[errorType].length)
      ];
    const className =
      fileName.replace(".ts", "").split("/").pop() || "UnknownClass";

    return `at Object.<anonymous> (/test/${fileName}:${lineNumber}:12)\n    at ${className}.${methodName} (${basePath}/${fileName}:${
      lineNumber + 5
    }:8)`;
  }
}
