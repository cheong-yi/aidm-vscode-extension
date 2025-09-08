/**
 * Task Data Contract Validation Tests
 * Task 2.6.4: Validate enhanced mock response structure matches API
 * Requirements: 6.8, 6.9
 *
 * This test suite validates that all enhanced Task fields match the design document interface exactly,
 * including FailingTest structure, STATUS_DISPLAY_NAMES mapping, and TestStatus enhanced fields.
 */

import { jest } from "@jest/globals";
import {
  TaskValidator,
  TaskValidationResult,
  FailingTestValidationResult,
} from "../../utils/TaskValidator";
import {
  Task,
  TaskStatus,
  TaskComplexity,
  TaskPriority,
  TestStatus,
  TestStatusEnum,
  FailingTest,
  STATUS_DISPLAY_NAMES,
} from "../../types/tasks";

describe("TaskValidator - Enhanced Mock Data Contract Validation", () => {
  describe("Task Interface Field Validation", () => {
    it("should validate complete Task with all enhanced properties", () => {
      // Arrange: Create a complete task with all enhanced fields
      const completeTask: Task = {
        id: "test-1",
        title: "Complete Test Task",
        description:
          "A task with all enhanced properties for validation testing",
        status: TaskStatus.NOT_STARTED,
        complexity: TaskComplexity.MEDIUM,
        dependencies: ["task-0"],
        requirements: ["REQ-001"],
        createdDate: "2024-01-01T00:00:00.000Z",
        lastModified: "2024-01-02T00:00:00.000Z",
        assignee: "developer",
        estimatedHours: 4,
        actualHours: 0,
        estimatedDuration: "15-30 min",
        isExecutable: true,
        priority: TaskPriority.HIGH,
        tags: ["test", "enhanced"],
        statusDisplayName: STATUS_DISPLAY_NAMES[TaskStatus.NOT_STARTED],
        testStatus: {
          lastRunDate: "2024-01-01T12:00:00.000Z",
          totalTests: 20,
          passedTests: 18,
          failedTests: 2,
          status: TestStatusEnum.PARTIAL,
          testSuite: "TaskValidator.test.ts",
          coverage: 90,
          failingTestsList: [
            {
              name: "should validate task status transitions",
              message: "AssertionError: Expected 400 but got 200",
              category: "assertion",
              stackTrace: "at Object.<anonymous> (test.js:10:5)",
            },
            {
              name: "should handle invalid task IDs",
              message: "TypeError: Cannot read property 'id' of undefined",
              category: "type",
            },
          ],
        },
      };

      // Act
      const result = TaskValidator.validateTask(completeTask);

      // Assert
      expect(result.isValid).toBe(true);
      expect(result.contractCompliance).toBe(true);
      expect(result.missingFields).toHaveLength(0);
      expect(result.invalidFieldTypes).toHaveLength(0);
      expect(result.errors).toHaveLength(0);
      expect(result.validationDetails.fieldValidations).toEqual({
        id: true,
        title: true,
        description: true,
        status: true,
        complexity: true,
        dependencies: true,
        requirements: true,
        createdDate: true,
        lastModified: true,
      });
    });

    it("should detect missing required fields", () => {
      // Arrange: Create task missing required fields
      const incompleteTask = {
        id: "test-2",
        title: "Incomplete Task",
        // Missing: description, status, complexity, dependencies, requirements, createdDate, lastModified
      };

      // Act
      const result = TaskValidator.validateTask(incompleteTask);

      // Assert
      expect(result.isValid).toBe(false);
      expect(result.contractCompliance).toBe(false);
      expect(result.missingFields).toContain("description");
      expect(result.missingFields).toContain("status");
      expect(result.missingFields).toContain("complexity");
      expect(result.missingFields).toContain("dependencies");
      expect(result.missingFields).toContain("requirements");
      expect(result.missingFields).toContain("createdDate");
      expect(result.missingFields).toContain("lastModified");
      expect(result.errors).toContain(
        "Missing required fields: description, status, complexity, dependencies, requirements, createdDate, lastModified"
      );
    });

    it("should detect invalid field types", () => {
      // Arrange: Create task with invalid field types
      const invalidTypeTask = {
        id: 123, // Should be string
        title: "Invalid Type Task",
        description: "Task with invalid field types",
        status: "invalid_status", // Should be TaskStatus enum
        complexity: "invalid_complexity", // Should be TaskComplexity enum
        dependencies: "not_an_array", // Should be array
        requirements: "not_an_array", // Should be array
        createdDate: "2024-01-01T00:00:00Z", // Should be string
        lastModified: "2024-01-01T00:00:00.000Z",
        estimatedDuration: 123, // Should be string
        isExecutable: "true", // Should be boolean
      };

      // Act
      const result = TaskValidator.validateTask(invalidTypeTask);

      // Assert
      expect(result.isValid).toBe(false);
      expect(result.contractCompliance).toBe(false);
      expect(result.invalidFieldTypes).toContain(
        "id: expected string, got number"
      );
      expect(result.invalidFieldTypes).toContain(
        "dependencies: expected array, got string"
      );
      expect(result.invalidFieldTypes).toContain(
        "requirements: expected array, got string"
      );
      expect(result.invalidFieldTypes).toContain(
        "estimatedDuration: expected string, got number"
      );
      expect(result.invalidFieldTypes).toContain(
        "isExecutable: expected boolean, got string"
      );
    });

    it("should validate enhanced optional fields when present", () => {
      // Arrange: Create task with enhanced optional fields
      const enhancedTask: Task = {
        id: "test-3",
        title: "Enhanced Optional Fields Task",
        description: "Task testing enhanced optional fields",
        status: TaskStatus.IN_PROGRESS,
        complexity: TaskComplexity.HIGH,
        priority: TaskPriority.MEDIUM,
        dependencies: [],
        requirements: [],
        createdDate: "2024-01-01T00:00:00.000Z",
        lastModified: "2024-01-02T00:00:00.000Z",
        estimatedDuration: "45-60 min",
        isExecutable: false,
        statusDisplayName: STATUS_DISPLAY_NAMES[TaskStatus.IN_PROGRESS],
      };

      // Act
      const result = TaskValidator.validateTask(enhancedTask);

      // Assert
      expect(result.isValid).toBe(true);
      expect(result.contractCompliance).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it("should warn about not_started tasks with isExecutable: false", () => {
      // Arrange: Create not_started task that's not executable
      const nonExecutableTask: Task = {
        id: "test-4",
        title: "Non-Executable Task",
        description: "A not_started task that's not executable",
        status: TaskStatus.NOT_STARTED,
        complexity: TaskComplexity.LOW,
        priority: TaskPriority.MEDIUM,
        dependencies: [],
        requirements: [],
        createdDate: "2024-01-01T00:00:00.000Z",
        lastModified: "2024-01-01T00:00:00.000Z",
        isExecutable: false, // Should typically be true for not_started
      };

      // Act
      const result = TaskValidator.validateTask(nonExecutableTask);

      // Assert
      expect(result.isValid).toBe(true); // Still valid, just a warning
      expect(result.warnings).toContain(
        "not_started tasks should typically have isExecutable: true for Cursor integration"
      );
    });
  });

  describe("FailingTest Structure Validation", () => {
    it("should validate valid FailingTest objects", () => {
      // Arrange: Create valid failing test objects for each category
      const validFailingTests: FailingTest[] = [
        {
          name: "Assertion Test",
          message: "Expected 200 but got 400",
          category: "assertion",
          stackTrace: "at Object.<anonymous> (test.js:15:5)",
        },
        {
          name: "Type Test",
          message: "Cannot read property 'id' of undefined",
          category: "type",
        },
        {
          name: "Filesystem Test",
          message: "Permission denied",
          category: "filesystem",
        },
        {
          name: "Timeout Test",
          message: "Test timed out after 5000ms",
          category: "timeout",
        },
        {
          name: "Network Test",
          message: "Network request failed",
          category: "network",
        },
      ];

      // Act & Assert: Validate each failing test
      validFailingTests.forEach((failingTest, index) => {
        const result = TaskValidator.validateFailingTest(failingTest);
        expect(result.isValid).toBe(true);
        expect(result.categoryValidation).toBe(true);
        expect(result.requiredFieldsPresent).toBe(true);
        expect(result.errors).toHaveLength(0);
      });
    });

    it("should detect missing required fields in FailingTest", () => {
      // Arrange: Create failing test missing required fields
      const incompleteFailingTest = {
        name: "Incomplete Test",
        // Missing: message, category
      };

      // Act
      const result = TaskValidator.validateFailingTest(incompleteFailingTest);

      // Assert
      expect(result.isValid).toBe(false);
      expect(result.requiredFieldsPresent).toBe(false);
      expect(result.errors).toContain("message must be a string");
      expect(result.errors).toContain(
        "category must be one of: assertion, type, filesystem, timeout, network"
      );
    });

    it("should detect invalid category values", () => {
      // Arrange: Create failing test with invalid category
      const invalidCategoryTest = {
        name: "Invalid Category Test",
        message: "Test message",
        category: "invalid_category", // Not in valid categories
      };

      // Act
      const result = TaskValidator.validateFailingTest(invalidCategoryTest);

      // Assert
      expect(result.isValid).toBe(false);
      expect(result.categoryValidation).toBe(false);
      expect(result.errors).toContain(
        "category must be one of: assertion, type, filesystem, timeout, network"
      );
    });

    it("should validate optional stackTrace field", () => {
      // Arrange: Create failing test with invalid stackTrace type
      const invalidStackTraceTest = {
        name: "Invalid Stack Trace Test",
        message: "Test message",
        category: "assertion",
        stackTrace: 123, // Should be string
      };

      // Act
      const result = TaskValidator.validateFailingTest(invalidStackTraceTest);

      // Assert
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain("stackTrace must be a string if present");
    });
  });

  describe("Date Format Validation", () => {
    it("should validate ISO 8601 date strings", () => {
      // Arrange: Valid ISO date strings
      const validDates = [
        "2024-01-01T00:00:00Z",
        "2024-01-01T00:00:00.000Z",
        "2024-01-01T12:30:45Z",
        "2024-01-01T12:30:45.123Z",
        "2024-12-31T23:59:59.999Z",
      ];

      // Act & Assert: Each date should be valid
      validDates.forEach((dateString) => {
        const task: Task = {
          id: "date-test",
          title: "Date Test Task",
          description: "Task for testing date validation",
          status: TaskStatus.COMPLETED,
          complexity: TaskComplexity.LOW,
          priority: TaskPriority.MEDIUM,
          dependencies: [],
          requirements: [],
          createdDate: dateString,
          lastModified: dateString,
        };

        const result = TaskValidator.validateTask(task);
        expect(result.isValid).toBe(true);
        expect(result.validationDetails.dateValidations.createdDate).toBe(true);
        expect(result.validationDetails.dateValidations.lastModified).toBe(
          true
        );
      });
    });

    it("should reject invalid date formats", () => {
      // Arrange: Invalid date strings
      const invalidDates = [
        "2024-13-01T00:00:00Z", // Invalid month
        "2024-01-32T00:00:00Z", // Invalid day
        "2024-01-01T25:00:00Z", // Invalid hour
        "2024-01-01T00:60:00Z", // Invalid minute
        "not-a-date",
        "",
        null,
        undefined,
      ];

      // Act & Assert: Each invalid date should be rejected
      invalidDates.forEach((invalidDate) => {
        if (invalidDate !== null && invalidDate !== undefined) {
          const task: any = {
            id: "invalid-date-test",
            title: "Invalid Date Test Task",
            description: "Task for testing invalid date validation",
            status: TaskStatus.COMPLETED,
            complexity: TaskComplexity.LOW,
            priority: TaskPriority.MEDIUM,
            dependencies: [],
            requirements: [],
            createdDate: invalidDate,
            lastModified: "2024-01-01T00:00:00Z",
          };

          const result = TaskValidator.validateTask(task);
          expect(result.validationDetails.dateValidations.createdDate).toBe(
            false
          );
        }
      });
    });
  });

  describe("Status Display Names Mapping Validation", () => {
    it("should validate complete STATUS_DISPLAY_NAMES mapping", () => {
      // Act
      const result = TaskValidator.validateStatusDisplayNamesMapping();

      // Assert
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it("should cover all TaskStatus enum values", () => {
      // Arrange: Get all TaskStatus enum values
      const allStatuses = Object.values(TaskStatus);

      // Act & Assert: Each status should have a display name
      allStatuses.forEach((status) => {
        expect(STATUS_DISPLAY_NAMES[status]).toBeDefined();
        expect(typeof STATUS_DISPLAY_NAMES[status]).toBe("string");
        expect(STATUS_DISPLAY_NAMES[status].length).toBeGreaterThan(0);
      });
    });

    it("should have consistent display name format", () => {
      // Arrange: Get all display names
      const displayNames = Object.values(STATUS_DISPLAY_NAMES);

      // Act & Assert: All display names should be lowercase with spaces
      displayNames.forEach((displayName) => {
        expect(displayName).toMatch(/^[a-z\s]+$/);
        expect(displayName).not.toMatch(/[A-Z]/); // No uppercase letters
        expect(displayName).not.toMatch(/[_-]/); // No underscores or hyphens
      });
    });
  });

  describe("TestStatus Enhanced Fields Validation", () => {
    it("should validate TestStatus with all enhanced fields", () => {
      // Arrange: Create complete TestStatus with enhanced fields
      const completeTestStatus: TestStatus = {
        lastRunDate: "2024-01-01T12:00:00.000Z",
        totalTests: 25,
        passedTests: 22,
        failedTests: 3,
        status: TestStatusEnum.PARTIAL,
        testSuite: "EnhancedTestStatus.test.ts",
        coverage: 88,
        failingTestsList: [
          {
            name: "Test 1",
            message: "Assertion failed",
            category: "assertion",
          },
          {
            name: "Test 2",
            message: "Type error",
            category: "type",
          },
          {
            name: "Test 3",
            message: "File not found",
            category: "filesystem",
          },
        ],
      };

      // Act
      const result = TaskValidator.validateTestStatus(completeTestStatus);

      // Assert
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it("should validate TestStatus with minimal required fields", () => {
      // Arrange: Create TestStatus with only required fields
      const minimalTestStatus: TestStatus = {
        totalTests: 10,
        passedTests: 10,
        failedTests: 0,
        status: TestStatusEnum.PASSING,
      };

      // Act
      const result = TaskValidator.validateTestStatus(minimalTestStatus);

      // Assert
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it("should detect missing required TestStatus fields", () => {
      // Arrange: Create TestStatus missing required fields
      const incompleteTestStatus = {
        totalTests: 10,
        // Missing: passedTests, failedTests
      };

      // Act
      const result = TaskValidator.validateTestStatus(incompleteTestStatus);

      // Assert
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain("passedTests must be a number");
      expect(result.errors).toContain("failedTests must be a number");
    });

    it("should validate failingTestsList array structure", () => {
      // Arrange: Create TestStatus with invalid failingTestsList
      const invalidTestStatus = {
        totalTests: 10,
        passedTests: 8,
        failedTests: 2,
        failingTestsList: "not_an_array", // Should be array
      };

      // Act
      const result = TaskValidator.validateTestStatus(invalidTestStatus);

      // Assert
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain("failingTestsList must be an array");
    });
  });

  describe("JSON-RPC Response Format Validation", () => {
    it("should validate successful JSON-RPC response with tasks", () => {
      // Arrange: Create valid JSON-RPC response
      const validResponse = {
        jsonrpc: "2.0",
        id: 1,
        result: {
          content: [
            {
              text: JSON.stringify({
                tasks: [
                  {
                    id: "task-1",
                    title: "Test Task 1",
                    description: "Test description",
                    status: TaskStatus.COMPLETED,
                    complexity: TaskComplexity.LOW,
                    dependencies: [],
                    requirements: [],
                    createdDate: "2024-01-01T00:00:00Z",
                    lastModified: "2024-01-01T00:00:00Z",
                  },
                ],
              }),
            },
          ],
        },
      };

      // Act
      const result = TaskValidator.validateJSONRPCResponse(validResponse);

      // Assert
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it("should validate error JSON-RPC response", () => {
      // Arrange: Create error JSON-RPC response
      const errorResponse = {
        jsonrpc: "2.0",
        id: 1,
        error: {
          code: -32603,
          message: "Internal server error",
        },
      };

      // Act
      const result = TaskValidator.validateJSONRPCResponse(errorResponse);

      // Assert
      expect(result.isValid).toBe(true); // Error responses are valid JSON-RPC
      expect(result.errors).toHaveLength(0);
    });

    it("should detect invalid JSON-RPC structure", () => {
      // Arrange: Create invalid JSON-RPC response
      const invalidResponse = {
        jsonrpc: "1.0", // Wrong version
        id: null, // Invalid ID type (null is not number or string)
        result: {
          content: "not_an_array", // Invalid content structure
        },
      };

      // Act
      const result = TaskValidator.validateJSONRPCResponse(invalidResponse);

      // Assert
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain("Response must have jsonrpc: '2.0'");
      expect(result.errors).toContain("Response must have a valid id field");
    });

    it("should validate content array with empty tasks", () => {
      // Arrange: Create response with empty tasks array
      const emptyTasksResponse = {
        jsonrpc: "2.0",
        id: 1,
        result: {
          content: [
            {
              text: JSON.stringify({ tasks: [] }),
            },
          ],
        },
      };

      // Act
      const result = TaskValidator.validateJSONRPCResponse(emptyTasksResponse);

      // Assert
      expect(result.isValid).toBe(true);
      expect(result.warnings).toContain("Content array is empty");
    });
  });

  describe("Mock Data Structure Validation", () => {
    it("should validate complete mock data structure", () => {
      // Arrange: Create complete mock data structure
      const mockData = {
        tasks: [
          {
            id: "mock-1",
            title: "Mock Task 1",
            description: "First mock task",
            status: TaskStatus.NOT_STARTED,
            complexity: TaskComplexity.MEDIUM,
            dependencies: [],
            requirements: ["REQ-001"],
            createdDate: "2024-01-01T00:00:00Z",
            lastModified: "2024-01-01T00:00:00Z",
            estimatedDuration: "20-30 min",
            isExecutable: true,
            statusDisplayName: STATUS_DISPLAY_NAMES[TaskStatus.NOT_STARTED],
          },
          {
            id: "mock-2",
            title: "Mock Task 2",
            description: "Second mock task",
            status: TaskStatus.COMPLETED,
            complexity: TaskComplexity.HIGH,
            dependencies: ["mock-1"],
            requirements: ["REQ-002"],
            createdDate: "2024-01-01T00:00:00Z",
            lastModified: "2024-01-02T00:00:00Z",
            estimatedDuration: "45-60 min",
            isExecutable: false,
            statusDisplayName: STATUS_DISPLAY_NAMES[TaskStatus.COMPLETED],
            testStatus: {
              lastRunDate: "2024-01-02T12:00:00Z",
              totalTests: 15,
              passedTests: 15,
              failedTests: 0,
              coverage: 100,
            },
          },
        ],
        metadata: {
          totalTasks: 2,
          lastUpdated: "2024-01-02T00:00:00Z",
        },
      };

      // Act
      const result = TaskValidator.validateMockDataStructure(mockData);

      // Assert
      expect(result.isValid).toBe(true);
      expect(result.contractCompliance).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it("should validate mock data without tasks array", () => {
      // Arrange: Create mock data without tasks
      const mockDataWithoutTasks = {
        metadata: {
          totalTasks: 0,
          lastUpdated: "2024-01-01T00:00:00Z",
        },
      };

      // Act
      const result =
        TaskValidator.validateMockDataStructure(mockDataWithoutTasks);

      // Assert
      expect(result.isValid).toBe(true);
      expect(result.contractCompliance).toBe(true);
    });
  });

  describe("Integration with Existing Validation Patterns", () => {
    it("should work with existing ValidationResult interface", () => {
      // Arrange: Create validation result using existing interface
      const validationResult: TaskValidationResult = {
        isValid: true,
        errors: [],
        warnings: [],
        contractCompliance: true,
        missingFields: [],
        invalidFieldTypes: [],
        validationDetails: {
          fieldValidations: {},
          enumValidations: {},
          dateValidations: {},
        },
      };

      // Act & Assert: Should compile and work with existing patterns
      expect(validationResult.isValid).toBe(true);
      expect(validationResult.contractCompliance).toBe(true);
    });

    it("should integrate with existing error handling patterns", () => {
      // Arrange: Create task with validation errors
      const invalidTask = {
        id: "integration-test",
        // Missing required fields
      };

      // Act
      const result = TaskValidator.validateTask(invalidTask);

      // Assert: Should follow existing error handling patterns
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0]).toMatch(/Missing required fields:/);
    });
  });

  describe("Performance Considerations", () => {
    it("should complete validation within performance targets", () => {
      // Arrange: Create large task array for performance testing
      const largeTaskArray = Array.from({ length: 100 }, (_, index) => ({
        id: `perf-test-${index}`,
        title: `Performance Test Task ${index}`,
        description: `Task ${index} for performance testing`,
        status: TaskStatus.NOT_STARTED,
        complexity: TaskComplexity.LOW,
        dependencies: [],
        requirements: [],
        createdDate: "2024-01-01T00:00:00Z",
        lastModified: "2024-01-01T00:00:00Z",
        estimatedDuration: "15-20 min",
        isExecutable: true,
        statusDisplayName: STATUS_DISPLAY_NAMES[TaskStatus.NOT_STARTED],
      }));

      const mockData = { tasks: largeTaskArray };

      // Act: Measure validation time
      const startTime = performance.now();
      const result = TaskValidator.validateMockDataStructure(mockData);
      const endTime = performance.now();
      const validationTime = endTime - startTime;

      // Assert: Should complete within 50ms target
      expect(validationTime).toBeLessThan(50);
      expect(result.isValid).toBe(true);
      expect(result.contractCompliance).toBe(true);
    });
  });
});
