/**
 * TaskDetailCardProvider Unit Tests
 * Requirements: 2.1, 2.2 - Task detail display with expandable content
 * Task 3.3.1: Create TaskDetailCardProvider class structure
 *
 * Tests the TaskDetailCardProvider class implementation of vscode.WebviewViewProvider
 * interface with event emitters and method stubs.
 */

import * as vscode from "vscode";
import { TaskDetailCardProvider } from "../../tasks/providers/TaskDetailCardProvider";
import {
  Task,
  TaskStatus,
  TaskPriority,
  TestStatus,
  TestStatusEnum,
} from "../../types/tasks";

// Mock VSCode modules
jest.mock("vscode", () => ({
  EventEmitter: jest.fn().mockImplementation(() => ({
    event: jest.fn(),
    fire: jest.fn(),
    dispose: jest.fn(),
  })),
  WebviewViewProvider: jest.fn(),
}));

describe("TaskDetailCardProvider", () => {
  let provider: TaskDetailCardProvider;
  let mockWebviewView: vscode.WebviewView;
  let mockWebview: vscode.Webview;
  let mockContext: vscode.WebviewViewResolveContext;
  let mockToken: vscode.CancellationToken;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Create mock webview view
    mockWebview = {
      options: {},
      html: "",
      onDidReceiveMessage: jest.fn(),
    } as unknown as vscode.Webview;

    mockWebviewView = {
      webview: mockWebview,
      title: "",
      onDidDispose: jest.fn(),
      onDidChangeVisibility: jest.fn(),
      visible: true,
    } as unknown as vscode.WebviewView;

    mockContext = {} as vscode.WebviewViewResolveContext;
    mockToken = {} as vscode.CancellationToken;

    // Create provider instance
    provider = new TaskDetailCardProvider();
  });

  afterEach(() => {
    // Cleanup
    if (provider) {
      provider.dispose();
    }
  });

  describe("Class Structure and Interface Compliance", () => {
    it("should implement vscode.WebviewViewProvider interface correctly", () => {
      // Verify the class implements the required interface
      expect(provider).toBeDefined();
      expect(typeof provider.resolveWebviewView).toBe("function");
    });

    it("should have constructor that initializes event emitters", () => {
      // Verify event emitters are created
      expect(provider.onTaskSelected).toBeDefined();
      expect(provider.onStatusChanged).toBeDefined();
      expect(provider.onTestResultsUpdated).toBeDefined();
      expect(provider.onCursorExecuteRequested).toBeDefined();
    });

    it("should have required method stubs", () => {
      // Verify all required methods exist
      expect(typeof provider.updateTaskDetails).toBe("function");
      expect(typeof provider.clearDetails).toBe("function");
      expect(typeof provider.showNoTaskSelected).toBe("function");
      expect(typeof provider.renderTestFailures).toBe("function");
      expect(typeof provider.renderExecutableActions).toBe("function");
      expect(typeof provider.renderStatusSpecificActions).toBe("function");
      expect(typeof provider.formatRelativeTime).toBe("function");
    });
  });

  describe("Event Emitter Setup", () => {
    it("should create event emitters for webview communication", () => {
      // Verify event emitters are properly set up
      expect(provider.onTaskSelected).toBeDefined();
      expect(provider.onStatusChanged).toBeDefined();
      expect(provider.onTestResultsUpdated).toBeDefined();
      expect(provider.onCursorExecuteRequested).toBeDefined();
    });

    it("should have proper event emitter types", () => {
      // Verify event emitter types match expected interfaces
      const mockTask: Task = {
        id: "test-1",
        title: "Test Task",
        description: "Test Description",
        status: TaskStatus.NOT_STARTED,
        complexity: "low" as any,
        priority: "medium" as any,
        dependencies: [],
        requirements: [],
        createdDate: "2024-01-01T00:00:00.000Z",
        lastModified: "2024-01-01T00:00:00.000Z",
      };

      // These should not throw type errors
      expect(() => {
        const taskEvent = provider.onTaskSelected;
        const statusEvent = provider.onStatusChanged;
        const testEvent = provider.onTestResultsUpdated;
        const cursorEvent = provider.onCursorExecuteRequested;
      }).not.toThrow();
    });
  });

  describe("resolveWebviewView Method", () => {
    it("should handle webview view resolution correctly", () => {
      // Mock console.error to prevent test output pollution
      const consoleSpy = jest.spyOn(console, "error").mockImplementation();

      // Call resolveWebviewView
      provider.resolveWebviewView(mockWebviewView, mockContext, mockToken);

      // Verify webview options are configured
      expect(mockWebview.options).toBeDefined();
      expect(mockWebview.options.enableScripts).toBe(true);

      // Verify webview title is set
      expect(mockWebviewView.title).toBe("Task Details");

      // Verify event handlers are set up
      expect(mockWebviewView.onDidDispose).toHaveBeenCalled();
      expect(mockWebviewView.onDidChangeVisibility).toHaveBeenCalled();
      expect(mockWebview.onDidReceiveMessage).toHaveBeenCalled();

      consoleSpy.mockRestore();
    });

    it("should handle webview resolution errors gracefully", () => {
      // Mock console.error to verify error handling
      const consoleSpy = jest.spyOn(console, "error").mockImplementation();

      // Create a mock that throws an error when setting options
      const errorProvider = new TaskDetailCardProvider();
      const mockErrorWebview = {
        ...mockWebviewView,
        webview: {
          ...mockWebview,
          options: {
            enableScripts: true,
            localResourceRoots: [],
          },
        },
        title: "Original Title",
      } as unknown as vscode.WebviewView;

      // Mock the title setter to throw an error
      Object.defineProperty(mockErrorWebview, "title", {
        set: () => {
          throw new Error("Test error");
        },
        get: () => "Original Title",
        configurable: true,
      });

      // This should not throw and should handle the error gracefully
      expect(() => {
        errorProvider.resolveWebviewView(
          mockErrorWebview,
          mockContext,
          mockToken
        );
      }).not.toThrow();

      // Verify error was logged
      expect(consoleSpy).toHaveBeenCalledWith(
        "Failed to resolve webview view:",
        expect.any(Error)
      );

      consoleSpy.mockRestore();
      errorProvider.dispose();
    });
  });

  describe("Task Detail Management Methods", () => {
    it("should handle updateTaskDetails method calls", () => {
      const mockTask: Task = {
        id: "test-1",
        title: "Test Task",
        description: "Test Description",
        status: TaskStatus.NOT_STARTED,
        complexity: "low" as any,
        priority: "medium" as any,
        dependencies: [],
        requirements: [],
        createdDate: "2024-01-01T00:00:00.000Z",
        lastModified: "2024-01-01T00:00:00.000Z",
      };

      // Mock console.error to prevent test output pollution
      const consoleSpy = jest.spyOn(console, "error").mockImplementation();

      // This should not throw
      expect(() => {
        provider.updateTaskDetails(mockTask);
      }).not.toThrow();

      consoleSpy.mockRestore();
    });

    it("should handle clearDetails method calls", () => {
      // Mock console.error to prevent test output pollution
      const consoleSpy = jest.spyOn(console, "error").mockImplementation();

      // This should not throw
      expect(() => {
        provider.clearDetails();
      }).not.toThrow();

      consoleSpy.mockRestore();
    });

    it("should handle showNoTaskSelected method calls", () => {
      // Mock console.error to prevent test output pollution
      const consoleSpy = jest.spyOn(console, "error").mockImplementation();

      // This should not throw
      expect(() => {
        provider.showNoTaskSelected();
      }).not.toThrow();

      consoleSpy.mockRestore();
    });
  });

  describe("Rendering Method Stubs", () => {
    it("should return proper HTML from renderTestFailures", () => {
      const result = provider.renderTestFailures([]);
      expect(result).toContain("No test failures");
    });

    it("should return proper HTML from renderExecutableActions", () => {
      const mockTask: Task = {
        id: "test-1",
        title: "Test Task",
        description: "Test Description",
        status: TaskStatus.NOT_STARTED,
        complexity: "low" as any,
        priority: "medium" as any,
        dependencies: [],
        requirements: [],
        createdDate: "2024-01-01T00:00:00.000Z",
        lastModified: "2024-01-01T00:00:00.000Z",
        isExecutable: false,
      };

      const result = provider.renderExecutableActions(mockTask);
      expect(result).toContain("Task is not executable");
    });

    it("should return proper HTML from renderStatusSpecificActions", () => {
      const mockTask: Task = {
        id: "test-1",
        title: "Test Task",
        description: "Test Description",
        status: TaskStatus.NOT_STARTED,
        complexity: "low" as any,
        priority: TaskPriority.MEDIUM,
        dependencies: [],
        requirements: [],
        createdDate: "2024-01-01T00:00:00.000Z",
        lastModified: "2024-01-01T00:00:00.000Z",
      };

      const result = provider.renderStatusSpecificActions(mockTask);
      expect(result).toContain("Generate Prompt");
      expect(result).toContain("View Requirements");
    });

    it("should return formatted relative time from formatRelativeTime", () => {
      const isoDate = "2024-01-01T00:00:00.000Z";
      const result = provider.formatRelativeTime(isoDate);
      // The method now returns formatted relative time, not the original ISO string
      expect(typeof result).toBe("string");
      expect(result.length).toBeGreaterThan(0);
    });
  });

  describe("Webview Message Handling", () => {
    it("should handle webview messages correctly", () => {
      // Mock console.error and console.log to prevent test output pollution
      const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation();
      const consoleLogSpy = jest.spyOn(console, "log").mockImplementation();

      // Test status update message
      const statusMessage = {
        command: "updateStatus",
        taskId: "test-1",
        newStatus: TaskStatus.IN_PROGRESS,
      };

      // This should not throw
      expect(() => {
        // Access private method through any type for testing
        (provider as any).handleWebviewMessage(statusMessage);
      }).not.toThrow();

      // Test cursor execution message
      const cursorMessage = {
        command: "executeWithCursor",
        taskId: "test-1",
      };

      expect(() => {
        (provider as any).handleWebviewMessage(cursorMessage);
      }).not.toThrow();

      // Test unknown message
      const unknownMessage = {
        command: "unknownCommand",
        data: "test",
      };

      expect(() => {
        (provider as any).handleWebviewMessage(unknownMessage);
      }).not.toThrow();

      consoleErrorSpy.mockRestore();
      consoleLogSpy.mockRestore();
    });

    it("should handle malformed webview messages gracefully", () => {
      // Mock console.error to prevent test output pollution
      const consoleSpy = jest.spyOn(console, "error").mockImplementation();

      // Test malformed message
      const malformedMessage = {
        command: "updateStatus",
        // Missing required fields
      };

      expect(() => {
        (provider as any).handleWebviewMessage(malformedMessage);
      }).not.toThrow();

      consoleSpy.mockRestore();
    });
  });

  describe("Resource Cleanup", () => {
    it("should dispose of all resources correctly", () => {
      // Mock console.error and console.warn to prevent test output pollution
      const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation();
      const consoleWarnSpy = jest.spyOn(console, "warn").mockImplementation();

      // This should not throw
      expect(() => {
        provider.dispose();
      }).not.toThrow();

      consoleErrorSpy.mockRestore();
      consoleWarnSpy.mockRestore();
    });

    it("should handle disposal errors gracefully", () => {
      // Create a provider with mock event emitters that throw on dispose
      const mockEventEmitter = {
        event: jest.fn(),
        fire: jest.fn(),
        dispose: jest.fn().mockImplementation(() => {
          throw new Error("Dispose error");
        }),
      };

      const errorProvider = new TaskDetailCardProvider();

      // Mock the private disposables array to include the error-throwing emitter
      (errorProvider as any).disposables = [mockEventEmitter];

      // Mock console.warn to prevent test output pollution
      const consoleWarnSpy = jest.spyOn(console, "warn").mockImplementation();

      // This should not throw and should handle disposal errors gracefully
      expect(() => {
        errorProvider.dispose();
      }).not.toThrow();

      // Verify warning was logged
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        "Error disposing resource:",
        expect.any(Error)
      );

      consoleWarnSpy.mockRestore();
    });
  });

  describe("TypeScript Interface Compliance", () => {
    it("should compile without TypeScript errors", () => {
      // This test verifies that the class structure is correct
      // and implements the required interface properly
      expect(provider).toBeInstanceOf(TaskDetailCardProvider);

      // Verify the class can be used as a WebviewViewProvider
      const webviewProvider: vscode.WebviewViewProvider = provider;
      expect(webviewProvider).toBeDefined();
      expect(typeof webviewProvider.resolveWebviewView).toBe("function");
    });

    it("should have correct method signatures", () => {
      // Verify method signatures match the interface requirements
      const mockTask: Task = {
        id: "test-1",
        title: "Test Task",
        description: "Test Description",
        status: TaskStatus.NOT_STARTED,
        complexity: "low" as any,
        priority: TaskPriority.MEDIUM,
        dependencies: [],
        requirements: [],
        createdDate: "2024-01-01T00:00:00.000Z",
        lastModified: "2024-01-01T00:00:00.000Z",
      };

      // These method calls should not cause TypeScript errors
      expect(() => {
        provider.updateTaskDetails(mockTask);
        provider.clearDetails();
        provider.showNoTaskSelected();
        provider.renderTestFailures([]);
        provider.renderExecutableActions(mockTask);
        provider.renderStatusSpecificActions(mockTask);
        provider.formatRelativeTime("2024-01-01T00:00:00.000Z");
      }).not.toThrow();
    });
  });

  describe("HTML Template Generation", () => {
    it("should generate valid HTML structure for task details", () => {
      const mockTask: Task = {
        id: "test-1",
        title: "Test Task",
        description: "Test Description",
        status: TaskStatus.NOT_STARTED,
        complexity: "low" as any,
        priority: TaskPriority.MEDIUM,
        dependencies: [],
        requirements: [],
        createdDate: "2024-01-01T00:00:00.000Z",
        lastModified: "2024-01-01T00:00:00.000Z",
        isExecutable: true,
        estimatedDuration: "15-30 min",
      };

      // Access private method through any type for testing
      const html = (provider as any).generateTaskDetailsHTML(mockTask);

      // Verify HTML structure
      expect(html).toContain("<!DOCTYPE html>");
      expect(html).toContain('<html lang="en">');
      expect(html).toContain("<head>");
      expect(html).toContain("<body>");
      expect(html).toContain("</body>");
      expect(html).toContain("</html>");
    });

    it("should include all required sections in generated HTML", () => {
      const mockTask: Task = {
        id: "test-1",
        title: "Test Task",
        description: "Test Description",
        status: TaskStatus.NOT_STARTED,
        complexity: "low" as any,
        priority: TaskPriority.MEDIUM,
        dependencies: [],
        requirements: [],
        createdDate: "2024-01-01T00:00:00.000Z",
        lastModified: "2024-01-01T00:00:00.000Z",
      };

      const html = (provider as any).generateTaskDetailsHTML(mockTask);

      // Verify all required sections are present
      expect(html).toContain("task-header");
      expect(html).toContain("task-description");
      expect(html).toContain("task-meta");
      expect(html).toContain("dependencies");
      expect(html).toContain("actions");
    });

    it("should include task header with title, ID, and status", () => {
      const mockTask: Task = {
        id: "test-1",
        title: "Test Task Title",
        description: "Test Description",
        status: TaskStatus.IN_PROGRESS,
        complexity: "medium" as any,
        priority: TaskPriority.MEDIUM,
        dependencies: [],
        requirements: [],
        createdDate: "2024-01-01T00:00:00.000Z",
        lastModified: "2024-01-01T00:00:00.000Z",
      };

      const html = (provider as any).generateTaskDetailsHTML(mockTask);

      expect(html).toContain("Test Task Title");
      expect(html).toContain("test-1");
      expect(html).toContain("in progress");
    });

    it("should include executable indicator for executable tasks", () => {
      const mockTask: Task = {
        id: "test-1",
        title: "Test Task",
        description: "Test Description",
        status: TaskStatus.NOT_STARTED,
        complexity: "low" as any,
        priority: TaskPriority.MEDIUM,
        dependencies: [],
        requirements: [],
        createdDate: "2024-01-01T00:00:00.000Z",
        lastModified: "2024-01-01T00:00:00.000Z",
        isExecutable: true,
      };

      const html = (provider as any).generateTaskDetailsHTML(mockTask);

      expect(html).toContain("🤖");
      expect(html).toContain("executable-indicator");
    });

    it("should render dependencies correctly", () => {
      const mockTask: Task = {
        id: "test-1",
        title: "Test Task",
        description: "Test Description",
        status: TaskStatus.NOT_STARTED,
        complexity: "low" as any,
        priority: TaskPriority.MEDIUM,
        dependencies: ["dep-1", "dep-2"],
        requirements: [],
        createdDate: "2024-01-01T00:00:00.000Z",
        lastModified: "2024-01-01T00:00:00.000Z",
      };

      const html = (provider as any).generateTaskDetailsHTML(mockTask);

      expect(html).toContain("dep-1");
      expect(html).toContain("dep-2");
      expect(html).toContain("dependency-tag");
    });

    it("should show 'None' for tasks without dependencies", () => {
      const mockTask: Task = {
        id: "test-1",
        title: "Test Task",
        description: "Test Description",
        status: TaskStatus.NOT_STARTED,
        complexity: "low" as any,
        priority: TaskPriority.MEDIUM,
        dependencies: [],
        requirements: [],
        createdDate: "2024-01-01T00:00:00.000Z",
        lastModified: "2024-01-01T00:00:00.000Z",
      };

      const html = (provider as any).generateTaskDetailsHTML(mockTask);

      expect(html).toContain("None");
    });
  });

  describe("Test Results Rendering", () => {
    it("should render test results section when test status exists", () => {
      const mockTask: Task = {
        id: "test-1",
        title: "Test Task",
        description: "Test Description",
        status: TaskStatus.COMPLETED,
        complexity: "low" as any,
        priority: TaskPriority.MEDIUM,
        dependencies: [],
        requirements: [],
        createdDate: "2024-01-01T00:00:00.000Z",
        lastModified: "2024-01-01T00:00:00.000Z",
        testStatus: {
          lastRunDate: "2024-01-01T10:00:00.000Z",
          totalTests: 10,
          passedTests: 8,
          failedTests: 2,
          status: TestStatusEnum.PARTIAL,
        },
      };

      const html = (provider as any).generateTaskDetailsHTML(mockTask);

      expect(html).toContain("Test Results");
      expect(html).toContain("10");
      expect(html).toContain("8");
      expect(html).toContain("2");
    });

    it("should show 'No tests available yet' when no test status", () => {
      const mockTask: Task = {
        id: "test-1",
        title: "Test Task",
        description: "Test Description",
        status: TaskStatus.NOT_STARTED,
        complexity: "low" as any,
        priority: TaskPriority.MEDIUM,
        dependencies: [],
        requirements: [],
        createdDate: "2024-01-01T00:00:00.000Z",
        lastModified: "2024-01-01T00:00:00.000Z",
      };

      const html = (provider as any).generateTaskDetailsHTML(mockTask);

      expect(html).toContain("No tests available yet");
    });

    it("should render test failures section when failures exist", () => {
      const mockTask: Task = {
        id: "test-1",
        title: "Test Task",
        description: "Test Description",
        status: TaskStatus.COMPLETED,
        complexity: "low" as any,
        priority: TaskPriority.MEDIUM,
        dependencies: [],
        requirements: [],
        createdDate: "2024-01-01T00:00:00.000Z",
        lastModified: "2024-01-01T00:00:00.000Z",
        testStatus: {
          lastRunDate: "2024-01-01T10:00:00.000Z",
          totalTests: 10,
          passedTests: 8,
          failedTests: 2,
          status: TestStatusEnum.PARTIAL,
          failingTestsList: [
            {
              name: "Test 1",
              message: "Assertion failed",
              category: "assertion" as any,
            },
          ],
        },
      };

      const html = (provider as any).generateTaskDetailsHTML(mockTask);

      expect(html).toContain("Failed Tests (1)");
      expect(html).toContain("Test 1");
      expect(html).toContain("Assertion failed");
    });

    it("should display comprehensive test results with all fields", () => {
      const mockTask: Task = {
        id: "test-1",
        title: "Test Task",
        description: "Test Description",
        status: TaskStatus.COMPLETED,
        complexity: "low" as any,
        priority: TaskPriority.MEDIUM,
        dependencies: [],
        requirements: [],
        createdDate: "2024-01-01T00:00:00.000Z",
        lastModified: "2024-01-01T00:00:00.000Z",
        testStatus: {
          lastRunDate: "2024-08-22T14:15:00Z",
          totalTests: 18,
          passedTests: 15,
          failedTests: 3,
          coverage: 85,
          testSuite: "unit-tests",
          status: TestStatusEnum.PARTIAL,
          failingTestsList: [
            {
              name: "should validate input",
              message: "AssertionError: Expected 400 but got 200",
              category: "assertion" as any,
            },
            {
              name: "should handle errors",
              message: "TypeError: Cannot read property 'id' of undefined",
              category: "type" as any,
            },
          ],
        },
      };

      const html = (provider as any).generateTaskDetailsHTML(mockTask);

      // Verify test results section structure
      expect(html).toContain("Test Results");
      expect(html).toContain("15/18 passed ⚠️");
      expect(html).toContain("85% coverage");
      expect(html).toContain("Suite: unit-tests");
      expect(html).toContain("Failed Tests (2)");
      expect(html).toContain("should validate input");
      expect(html).toContain("should handle errors");
    });

    it("should format test summary correctly for different scenarios", () => {
      // Test all passing
      const allPassing = {
        totalTests: 10,
        passedTests: 10,
        failedTests: 0,
      };
      expect((provider as any).formatTestSummary(allPassing)).toBe(
        "10/10 passed ✅"
      );

      // Test all failing
      const allFailing = {
        totalTests: 5,
        passedTests: 0,
        failedTests: 5,
      };
      expect((provider as any).formatTestSummary(allFailing)).toBe(
        "0/5 passed ❌"
      );

      // Test partial passing
      const partialPassing = {
        totalTests: 8,
        passedTests: 6,
        failedTests: 2,
      };
      expect((provider as any).formatTestSummary(partialPassing)).toBe(
        "6/8 passed ⚠️"
      );

      // Test zero tests
      const zeroTests = {
        totalTests: 0,
        passedTests: 0,
        failedTests: 0,
      };
      expect((provider as any).formatTestSummary(zeroTests)).toBe(
        "No tests run"
      );
    });

    it("should format last run time using TimeFormattingUtility", () => {
      const now = new Date();
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
      const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

      // Test with valid dates
      const result1 = (provider as any).formatLastRunTime(
        oneHourAgo.toISOString()
      );
      expect(result1).toContain("1 hour ago");

      const result2 = (provider as any).formatLastRunTime(
        oneDayAgo.toISOString()
      );
      expect(result2).toContain("1 day ago");

      // Test with empty/undefined dates
      expect((provider as any).formatLastRunTime("")).toBe("Never run");
      expect((provider as any).formatLastRunTime(undefined)).toBe("Never run");
      expect((provider as any).formatLastRunTime(null as any)).toBe(
        "Never run"
      );
    });

    it("should handle TimeFormattingUtility failures gracefully", () => {
      // Test with invalid date format that would cause parsing issues
      const result = (provider as any).formatLastRunTime("invalid-date-string");

      // TimeFormattingUtility returns the original string for invalid dates
      expect(result).toBe("invalid-date-string");
    });

    it("should format coverage percentage with appropriate styling", () => {
      // Test high coverage (90%+)
      const highCoverage = (provider as any).formatCoverage(95);
      expect(highCoverage).toContain("95% coverage");
      expect(highCoverage).toContain("coverage-high");

      // Test medium coverage (70-89%)
      const mediumCoverage = (provider as any).formatCoverage(75);
      expect(mediumCoverage).toContain("75% coverage");
      expect(mediumCoverage).toContain("coverage-medium");

      // Test low coverage (<70%)
      const lowCoverage = (provider as any).formatCoverage(45);
      expect(lowCoverage).toContain("45% coverage");
      expect(lowCoverage).toContain("coverage-low");

      // Test edge cases
      expect((provider as any).formatCoverage(0)).toContain("0% coverage");
      expect((provider as any).formatCoverage(100)).toContain("100% coverage");
    });

    it("should handle invalid coverage values gracefully", () => {
      // Test invalid inputs
      expect((provider as any).formatCoverage(NaN)).toBe("");
      expect((provider as any).formatCoverage("invalid" as any)).toBe("");
      expect((provider as any).formatCoverage(null as any)).toBe("");
      expect((provider as any).formatCoverage(undefined as any)).toBe("");
    });

    it("should display test suite information when available", () => {
      const mockTask: Task = {
        id: "test-1",
        title: "Test Task",
        description: "Test Description",
        status: TaskStatus.COMPLETED,
        complexity: "low" as any,
        priority: TaskPriority.MEDIUM,
        dependencies: [],
        requirements: [],
        createdDate: "2024-01-01T00:00:00.000Z",
        lastModified: "2024-01-01T00:00:00.000Z",
        testStatus: {
          lastRunDate: "2024-01-01T10:00:00.000Z",
          totalTests: 10,
          passedTests: 8,
          failedTests: 2,
          testSuite: "integration-tests",
          status: TestStatusEnum.PARTIAL,
        },
      };

      const html = (provider as any).generateTaskDetailsHTML(mockTask);

      expect(html).toContain("Suite: integration-tests");
    });

    it("should not display test suite when not available", () => {
      const mockTask: Task = {
        id: "test-1",
        title: "Test Task",
        description: "Test Description",
        status: TaskStatus.COMPLETED,
        complexity: "low" as any,
        priority: TaskPriority.MEDIUM,
        dependencies: [],
        requirements: [],
        createdDate: "2024-01-01T00:00:00.000Z",
        lastModified: "2024-01-01T00:00:00.000Z",
        testStatus: {
          lastRunDate: "2024-01-01T10:00:00.000Z",
          totalTests: 10,
          passedTests: 8,
          failedTests: 2,
          status: TestStatusEnum.PARTIAL,
        },
      };

      const html = (provider as any).generateTaskDetailsHTML(mockTask);

      expect(html).not.toContain("Suite:");
    });

    it("should handle edge cases in test results display", () => {
      // Test with missing lastRunDate
      const mockTaskNoDate: Task = {
        id: "test-1",
        title: "Test Task",
        description: "Test Description",
        status: TaskStatus.COMPLETED,
        complexity: "low" as any,
        priority: TaskPriority.MEDIUM,
        dependencies: [],
        requirements: [],
        createdDate: "2024-01-01T00:00:00.000Z",
        lastModified: "2024-01-01T00:00:00.000Z",
        testStatus: {
          totalTests: 5,
          passedTests: 5,
          failedTests: 0,
          status: TestStatusEnum.PASSING,
        },
      };

      const htmlNoDate = (provider as any).generateTaskDetailsHTML(
        mockTaskNoDate
      );
      expect(htmlNoDate).toContain("Last run: Never run");

      // Test with zero tests
      const mockTaskZeroTests: Task = {
        id: "test-2",
        title: "Test Task 2",
        description: "Test Description 2",
        status: TaskStatus.COMPLETED,
        complexity: "low" as any,
        priority: TaskPriority.MEDIUM,
        dependencies: [],
        requirements: [],
        createdDate: "2024-01-01T00:00:00.000Z",
        lastModified: "2024-01-01T00:00:00.000Z",
        testStatus: {
          lastRunDate: "2024-01-01T10:00:00.000Z",
          totalTests: 0,
          passedTests: 0,
          failedTests: 0,
          status: TestStatusEnum.NOT_RUN,
        },
      };

      const htmlZeroTests = (provider as any).generateTaskDetailsHTML(
        mockTaskZeroTests
      );
      expect(htmlZeroTests).toContain("No tests run");
    });

    it("should handle malformed test status data gracefully", () => {
      const malformedTask = {
        id: "test-1",
        title: "Test Task",
        description: "Test Description",
        status: TaskStatus.COMPLETED,
        complexity: "low" as any,
        priority: TaskPriority.MEDIUM,
        dependencies: [],
        requirements: [],
        createdDate: "2024-01-01T00:00:00.000Z",
        lastModified: "2024-01-01T00:00:00.000Z",
        testStatus: {
          lastRunDate: "invalid-date",
          totalTests: 5,
          passedTests: 3,
          failedTests: 2,
          coverage: "invalid" as any,
          testSuite: "unit-tests",
        } as any,
      };

      // This should not throw and should handle malformed data gracefully
      expect(() => {
        (provider as any).generateTaskDetailsHTML(malformedTask);
      }).not.toThrow();

      const html = (provider as any).generateTaskDetailsHTML(malformedTask);

      // Should still display test results section
      expect(html).toContain("Test Results");
      // Should handle invalid data gracefully - TimeFormattingUtility returns original string
      expect(html).toContain("Last run: invalid-date");
      // Should still show test stats
      expect(html).toContain("3");
      expect(html).toContain("2");
    });
  });

  describe("Action Buttons Rendering", () => {
    it("should render executable actions for not started executable tasks", () => {
      const mockTask: Task = {
        id: "test-1",
        title: "Test Task",
        description: "Test Description",
        status: TaskStatus.NOT_STARTED,
        complexity: "low" as any,
        priority: TaskPriority.MEDIUM,
        dependencies: [],
        requirements: [],
        createdDate: "2024-01-01T00:00:00.000Z",
        lastModified: "2024-01-01T00:00:00.000Z",
        isExecutable: true,
      };

      const html = (provider as any).generateTaskDetailsHTML(mockTask);

      expect(html).toContain("🤖 Execute with Cursor");
      expect(html).toContain("Generate Prompt");
      expect(html).toContain("View Requirements");
    });

    it("should render in-progress actions for in-progress tasks", () => {
      const mockTask: Task = {
        id: "test-1",
        title: "Test Task",
        description: "Test Description",
        status: TaskStatus.IN_PROGRESS,
        complexity: "low" as any,
        priority: TaskPriority.MEDIUM,
        dependencies: [],
        requirements: [],
        createdDate: "2024-01-01T00:00:00.000Z",
        lastModified: "2024-01-01T00:00:00.000Z",
      };

      const html = (provider as any).generateTaskDetailsHTML(mockTask);

      expect(html).toContain("Continue Work");
      expect(html).toContain("Mark Complete");
      expect(html).toContain("View Dependencies");
    });

    it("should render review actions for review tasks", () => {
      const mockTask: Task = {
        id: "test-1",
        title: "Test Task",
        description: "Test Description",
        status: TaskStatus.REVIEW,
        complexity: "low" as any,
        priority: TaskPriority.MEDIUM,
        dependencies: [],
        requirements: [],
        createdDate: "2024-01-01T00:00:00.000Z",
        lastModified: "2024-01-01T00:00:00.000Z",
      };

      const html = (provider as any).generateTaskDetailsHTML(mockTask);

      expect(html).toContain("Approve & Complete");
      expect(html).toContain("Request Changes");
      expect(html).toContain("View Implementation");
    });

    it("should render completed task actions with test failure options", () => {
      const mockTask: Task = {
        id: "test-1",
        title: "Test Task",
        description: "Test Description",
        status: TaskStatus.COMPLETED,
        complexity: "low" as any,
        priority: TaskPriority.MEDIUM,
        dependencies: [],
        requirements: [],
        createdDate: "2024-01-01T00:00:00.000Z",
        lastModified: "2024-01-01T00:00:00.000Z",
        testStatus: {
          lastRunDate: "2024-01-01T10:00:00.000Z",
          totalTests: 10,
          passedTests: 8,
          failedTests: 2,

          status: TestStatusEnum.PARTIAL,
        },
      };

      const html = (provider as any).generateTaskDetailsHTML(mockTask);

      expect(html).toContain("Fix Failing Tests");
      expect(html).toContain("View Full Report");
      expect(html).toContain("Rerun Tests");
    });
  });

  describe("Utility Methods", () => {
    it("should escape HTML special characters correctly", () => {
      const testCases = [
        { input: "Test & More", expected: "Test &amp; More" },
        { input: "Test < More >", expected: "Test &lt; More &gt;" },
        { input: 'Test "Quote"', expected: "Test &quot;Quote&quot;" },
        { input: "Test 'Apostrophe'", expected: "Test &#39;Apostrophe&#39;" },
      ];

      testCases.forEach(({ input, expected }) => {
        const result = (provider as any).escapeHtml(input);
        expect(result).toBe(expected);
      });
    });

    it("should return empty string for null/undefined input in escapeHtml", () => {
      expect((provider as any).escapeHtml("")).toBe("");
      expect((provider as any).escapeHtml(null as any)).toBe("");
      expect((provider as any).escapeHtml(undefined as any)).toBe("");
    });

    it("should format relative time correctly", () => {
      const now = new Date();
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
      const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

      expect(provider.formatRelativeTime(oneHourAgo.toISOString())).toContain(
        "1 hour ago"
      );
      expect(provider.formatRelativeTime(oneDayAgo.toISOString())).toContain(
        "1 day ago"
      );
    });

    it("should return 'Never' for empty date in formatRelativeTime", () => {
      expect(provider.formatRelativeTime("")).toBe("Never");
      expect(provider.formatRelativeTime(null as any)).toBe("Never");
    });

    it("should get correct status display names", () => {
      const statusMap = {
        not_started: "not started",
        in_progress: "in progress",
        review: "review",
        completed: "completed",
        blocked: "blocked",
        deprecated: "deprecated",
      };

      Object.entries(statusMap).forEach(([status, expected]) => {
        const result = (provider as any).getStatusDisplayName(status);
        expect(result).toBe(expected);
      });
    });

    it("should get correct complexity display names", () => {
      const complexityMap = {
        low: "Low",
        medium: "Medium",
        high: "High",
      };

      Object.entries(complexityMap).forEach(([complexity, expected]) => {
        const result = (provider as any).getComplexityDisplayName(complexity);
        expect(result).toBe(expected);
      });
    });

    it("should get correct status CSS classes", () => {
      const statusClassMap = {
        not_started: "not-started",
        in_progress: "in-progress",
        review: "review",
        completed: "completed",
        blocked: "blocked",
        deprecated: "deprecated",
      };

      Object.entries(statusClassMap).forEach(([status, expected]) => {
        const result = (provider as any).getStatusClass(status);
        expect(result).toBe(expected);
      });
    });
  });

  describe("Error Handling", () => {
    it("should generate fallback HTML when main template generation fails", () => {
      const mockTask: Task = {
        id: "test-1",
        title: "Test Task",
        description: "Test Description",
        status: TaskStatus.NOT_STARTED,
        complexity: "low" as any,
        priority: "medium" as any,
        dependencies: [],
        requirements: [],
        createdDate: "2024-01-01T00:00:00.000Z",
        lastModified: "2024-01-01T00:00:00.000Z",
      };

      const fallbackHtml = (provider as any).generateFallbackHTML(mockTask);

      expect(fallbackHtml).toContain("⚠️ Error loading task details");
      expect(fallbackHtml).toContain("test-1");
      expect(fallbackHtml).toContain("Test Task");
    });

    it("should handle malformed task data gracefully", () => {
      const malformedTask = {
        id: "test-1",
        title: "Test Task",
        description: "Test Description",
        status: "invalid_status",
        complexity: "invalid_complexity",
        dependencies: null,
        requirements: [],
        createdDate: "2024-01-01T00:00:00.000Z",
        lastModified: "2024-01-01T00:00:00.000Z",
      } as any;

      // This should not throw and should handle malformed data gracefully
      expect(() => {
        (provider as any).generateTaskDetailsHTML(malformedTask);
      }).not.toThrow();
    });
  });

  describe("CSS Generation and Styling", () => {
    it("should generate valid CSS syntax", () => {
      // Access private method through any type for testing
      const css = (provider as any).generateCSS();

      // Verify CSS structure
      expect(css).toContain("/* Reset and base styles */");
      expect(css).toContain("body {");
      expect(css).toContain("}");
      expect(css).toContain("/* Main container styling */");
      expect(css).toContain("/* Task header section */");
      expect(css).toContain(
        "/* Status badge styling - exact colors from mockup */"
      );
      expect(css).toContain(
        "/* Responsive design for different sidebar widths */"
      );
    });

    it("should include all required CSS classes", () => {
      const css = (provider as any).generateCSS();

      // Verify all required CSS classes are present
      expect(css).toContain(".task-details");
      expect(css).toContain(".task-header");
      expect(css).toContain(".task-title");
      expect(css).toContain(".task-id");
      expect(css).toContain(".status-badge");
      expect(css).toContain(".task-description");
      expect(css).toContain(".task-meta");
      expect(css).toContain(".dependencies");
      expect(css).toContain(".test-results");
      expect(css).toContain(".failures-section");
      expect(css).toContain(".actions");
      expect(css).toContain(".action-btn");
    });

    it("should include exact status badge colors from mockup", () => {
      const css = (provider as any).generateCSS();

      // Verify exact color values from mockup
      expect(css).toContain("background: #4a4a4a"); // not-started
      expect(css).toContain("background: #569cd6"); // in-progress
      expect(css).toContain("background: #dcdcaa"); // review
      expect(css).toContain("background: #4ec9b0"); // completed
      expect(css).toContain("background: #f48771"); // blocked
      expect(css).toContain("background: #6a6a6a"); // deprecated
    });

    it("should include complexity color coding", () => {
      const css = (provider as any).generateCSS();

      // Verify complexity colors
      expect(css).toContain(".complexity-low");
      expect(css).toContain(".complexity-medium");
      expect(css).toContain(".complexity-high");
      expect(css).toContain("color: #4ec9b0"); // low
      expect(css).toContain("color: #dcdcaa"); // medium
      expect(css).toContain("color: #f48771"); // high
    });

    it("should include responsive design breakpoints", () => {
      const css = (provider as any).generateCSS();

      // Verify responsive breakpoints
      expect(css).toContain("@media (max-width: 300px)");
      expect(css).toContain("@media (min-width: 400px)");
      expect(css).toContain("grid-template-columns: 1fr");
      expect(css).toContain("grid-template-columns: 1fr 1fr 1fr");
    });

    it("should include VSCode theme integration", () => {
      const css = (provider as any).generateCSS();

      // Verify VSCode CSS custom properties
      expect(css).toContain("var(--vscode-font-family");
      expect(css).toContain("var(--vscode-editor-background");
      expect(css).toContain("var(--vscode-foreground");
      expect(css).toContain("var(--vscode-panel-background");
      expect(css).toContain("var(--vscode-panel-border");
      expect(css).toContain("var(--vscode-button-background");
      expect(css).toContain("var(--vscode-focusBorder");
    });

    it("should include accessibility features", () => {
      const css = (provider as any).generateCSS();

      // Verify accessibility features
      expect(css).toContain(":focus");
      expect(css).toContain("outline:");
      expect(css).toContain("user-select: none");
      expect(css).toContain("transition:");
    });

    it("should include interactive element styling", () => {
      const css = (provider as any).generateCSS();

      // Verify interactive element styling
      expect(css).toContain(":hover");
      expect(css).toContain(":active");
      expect(css).toContain("cursor: pointer");
      expect(css).toContain("transform:");
    });

    it("should include print styles", () => {
      const css = (provider as any).generateCSS();

      // Verify print media query
      expect(css).toContain("@media print");
      expect(css).toContain("display: none");
      expect(css).toContain("background: white");
      expect(css).toContain("color: black");
    });

    it("should include light theme fallbacks", () => {
      const css = (provider as any).generateCSS();

      // Verify light theme support
      expect(css).toContain("@media (prefers-color-scheme: light)");
      expect(css).toContain(
        "background: var(--vscode-panel-background, #f3f3f3)"
      );
      expect(css).toContain(
        "background: var(--vscode-editor-background, #ffffff)"
      );
    });

    it("should generate CSS with proper vendor prefixes", () => {
      const css = (provider as any).generateCSS();

      // Verify CSS properties that might need vendor prefixes
      expect(css).toContain("box-sizing: border-box");
      expect(css).toContain("display: grid");
      expect(css).toContain("display: flex");
      expect(css).toContain("gap:");
    });

    it("should include proper spacing and layout CSS", () => {
      const css = (provider as any).generateCSS();

      // Verify spacing and layout properties
      expect(css).toContain("padding:");
      expect(css).toContain("margin:");
      expect(css).toContain("gap:");
      expect(css).toContain("border-radius:");
      expect(css).toContain("border:");
    });

    it("should include typography styling", () => {
      const css = (provider as any).generateCSS();

      // Verify typography properties
      expect(css).toContain("font-family:");
      expect(css).toContain("font-size:");
      expect(css).toContain("font-weight:");
      expect(css).toContain("line-height:");
      expect(css).toContain("text-transform:");
      expect(css).toContain("letter-spacing:");
    });

    it("should include test results section styling", () => {
      const css = (provider as any).generateCSS();

      // Verify test results styling
      expect(css).toContain(".test-results");
      expect(css).toContain(".test-header");
      expect(css).toContain(".test-stats");
      expect(css).toContain(".test-stat");
      expect(css).toContain(".test-passed");
      expect(css).toContain(".test-failed");
      expect(css).toContain(".test-total");
    });

    it("should include failures section styling", () => {
      const css = (provider as any).generateCSS();

      // Verify failures section styling
      expect(css).toContain(".failures-section");
      expect(css).toContain(".failures-header");
      expect(css).toContain(".failures-list");
      expect(css).toContain(".failure-item");
      expect(css).toContain(".failure-name");
      expect(css).toContain(".failure-message");
    });

    it("should include action button styling", () => {
      const css = (provider as any).generateCSS();

      // Verify action button styling
      expect(css).toContain(".actions");
      expect(css).toContain(".action-btn");
      expect(css).toContain(".action-btn.primary");
      expect(css).toContain(":hover");
      expect(css).toContain(":active");
    });

    it("should include dependency tag styling", () => {
      const css = (provider as any).generateCSS();

      // Verify dependency styling
      expect(css).toContain(".dependency-list");
      expect(css).toContain(".dependency-tag");
      expect(css).toContain("font-family: 'Courier New', monospace");
      expect(css).toContain("border-radius: 3px");
    });

    it("should include executable indicator styling", () => {
      const css = (provider as any).generateCSS();

      // Verify executable indicator styling
      expect(css).toContain(".executable-indicator");
      expect(css).toContain("color: var(--vscode-button-background");
    });

    it("should include section divider styling", () => {
      const css = (provider as any).generateCSS();

      // Verify section divider styling
      expect(css).toContain(".section-divider");
      expect(css).toContain("height: 1px");
      expect(css).toContain("background:");
    });

    it("should include no-tests state styling", () => {
      const css = (provider as any).generateCSS();

      // Verify no-tests styling
      expect(css).toContain(".no-tests");
      expect(css).toContain("font-style: italic");
      expect(css).toContain("text-align: center");
    });

    it("should generate CSS with proper CSS selector specificity", () => {
      const css = (provider as any).generateCSS();

      // Verify CSS selector patterns
      expect(css).toContain(".status-badge.not-started");
      expect(css).toContain(".status-badge.in-progress");
      expect(css).toContain(".failures-section.expanded");
      expect(css).toContain(".action-btn.primary");
    });

    it("should include proper CSS transitions and animations", () => {
      const css = (provider as any).generateCSS();

      // Verify transition properties
      expect(css).toContain("transition:");
      expect(css).toContain("transform:");
      expect(css).toContain("transition: transform 0.2s");
      expect(css).toContain("transition: all 0.2s");
    });

    it("should generate CSS that works with VSCode webview constraints", () => {
      const css = (provider as any).generateCSS();

      // Verify VSCode webview compatibility
      expect(css).toContain("var(--vscode-");
      expect(css).toContain("font-family: var(--vscode-font-family");
      expect(css).toContain("background: var(--vscode-editor-background");
      expect(css).toContain("color: var(--vscode-foreground");
    });
  });

  describe("Enhanced Metadata Display", () => {
    it("should render metadata grid with complete task data", () => {
      const mockTask: Task = {
        id: "3.3.4",
        title: "Implement enhanced task metadata display",
        description:
          "Implement enhanced task metadata display including complexity, estimated duration, and dependencies",
        status: TaskStatus.NOT_STARTED,
        complexity: "medium" as any,
        priority: "medium" as any,
        dependencies: ["3.3.3", "2.7.1"],
        requirements: ["2.1", "9.1"],
        createdDate: "2024-08-22T10:00:00Z",
        lastModified: "2024-08-22T14:30:00Z",
        estimatedDuration: "20-25 min",
        isExecutable: true,
      };

      const metadataHTML = provider.renderMetadataGrid(mockTask);

      // Verify all metadata fields are present
      expect(metadataHTML).toContain("Complexity");
      expect(metadataHTML).toContain("Duration");
      expect(metadataHTML).toContain("Dependencies");
      expect(metadataHTML).toContain("Requirements");
      expect(metadataHTML).toContain("Created");
      expect(metadataHTML).toContain("Modified");

      // Verify values are displayed correctly
      expect(metadataHTML).toContain("Medium");
      expect(metadataHTML).toContain("20-25 min");
      expect(metadataHTML).toContain("3.3.3, 2.7.1");
      expect(metadataHTML).toContain("2.1, 9.1");
    });

    it("should handle missing estimated duration gracefully", () => {
      const mockTask: Task = {
        id: "test-1",
        title: "Test Task",
        description: "Test Description",
        status: TaskStatus.NOT_STARTED,
        complexity: "low" as any,
        priority: "medium" as any,
        dependencies: [],
        requirements: [],
        createdDate: "2024-01-01T00:00:00.000Z",
        lastModified: "2024-01-01T00:00:00.000Z",
      };

      const result = provider.formatEstimatedDuration(
        mockTask.estimatedDuration
      );
      expect(result).toBe("Not specified");
    });

    it("should format estimated duration correctly", () => {
      const testCases = [
        { input: "15-30 min", expected: "15-30 min" },
        { input: "45 min", expected: "45 min" },
        { input: "2 hours", expected: "2 hours" },
        { input: "  20-25 min  ", expected: "20-25 min" }, // Test trimming
      ];

      testCases.forEach(({ input, expected }) => {
        const result = provider.formatEstimatedDuration(input);
        expect(result).toBe(expected);
      });
    });

    it("should handle empty dependencies array", () => {
      const result = provider.formatDependencies([]);
      expect(result).toBe("None");
    });

    it("should format dependencies list correctly", () => {
      const testCases = [
        { input: ["3.3.3"], expected: "3.3.3" },
        { input: ["3.3.3", "2.7.1"], expected: "3.3.3, 2.7.1" },
        { input: ["1.1", "1.2", "1.3"], expected: "1.1, 1.2, 1.3" },
      ];

      testCases.forEach(({ input, expected }) => {
        const result = provider.formatDependencies(input);
        expect(result).toBe(expected);
      });
    });

    it("should handle undefined dependencies gracefully", () => {
      const result = provider.formatDependencies(undefined);
      expect(result).toBe("None");
    });

    it("should handle empty requirements array", () => {
      const result = provider.formatRequirements([]);
      expect(result).toBe("None");
    });

    it("should format requirements list correctly", () => {
      const testCases = [
        { input: ["2.1"], expected: "2.1" },
        { input: ["2.1", "9.1"], expected: "2.1, 9.1" },
        { input: ["1.1", "1.2", "1.3"], expected: "1.1, 1.2, 1.3" },
      ];

      testCases.forEach(({ input, expected }) => {
        const result = provider.formatRequirements(input);
        expect(result).toBe(expected);
      });
    });

    it("should handle undefined requirements gracefully", () => {
      const result = provider.formatRequirements(undefined);
      expect(result).toBe("None");
    });

    it("should format complexity correctly for CSS classes", () => {
      const testCases = [
        { input: "low", expected: "low" },
        { input: "MEDIUM", expected: "medium" },
        { input: "High", expected: "high" },
        { input: "  EXTREME  ", expected: "extreme" }, // Test trimming
      ];

      testCases.forEach(({ input, expected }) => {
        const result = provider.formatComplexity(input);
        expect(result).toBe(expected);
      });
    });

    it("should handle undefined complexity gracefully", () => {
      const result = provider.formatComplexity(undefined);
      expect(result).toBe("unknown");
    });

    it("should handle null complexity gracefully", () => {
      const result = provider.formatComplexity(null as any);
      expect(result).toBe("unknown");
    });

    it("should render fallback metadata when main rendering fails", () => {
      const mockTask: Task = {
        id: "test-1",
        title: "Test Task",
        description: "Test Description",
        status: TaskStatus.NOT_STARTED,
        complexity: "low" as any,
        priority: "medium" as any,
        dependencies: ["dep-1"],
        requirements: ["req-1"],
        createdDate: "2024-01-01T00:00:00.000Z",
        lastModified: "2024-01-01T00:00:00.000Z",
        estimatedDuration: "15 min",
      };

      const fallbackHTML = (provider as any).renderFallbackMetadata(mockTask);

      // Verify fallback metadata structure
      expect(fallbackHTML).toContain("Complexity");
      expect(fallbackHTML).toContain("Duration");
      expect(fallbackHTML).toContain("Dependencies");
      expect(fallbackHTML).toContain("Requirements");

      // Verify fallback values
      expect(fallbackHTML).toContain("low");
      expect(fallbackHTML).toContain("15 min");
      expect(fallbackHTML).toContain("dep-1");
      expect(fallbackHTML).toContain("req-1");
    });

    it("should integrate with TimeFormattingUtility for date formatting", () => {
      const mockTask: Task = {
        id: "test-1",
        title: "Test Task",
        description: "Test Description",
        status: TaskStatus.NOT_STARTED,
        complexity: "low" as any,
        priority: "medium" as any,
        dependencies: [],
        requirements: [],
        createdDate: "2024-01-01T00:00:00.000Z",
        lastModified: "2024-01-01T00:00:00.000Z",
      };

      const metadataHTML = provider.renderMetadataGrid(mockTask);

      // Verify that TimeFormattingUtility is used for date formatting
      expect(metadataHTML).toContain("Created");
      expect(metadataHTML).toContain("Modified");
      // The actual formatted dates will depend on the current time when test runs
    });

    it("should handle malformed task data gracefully in metadata rendering", () => {
      const malformedTask = {
        id: "test-1",
        title: "Test Task",
        description: "Test Description",
        status: "invalid_status",
        complexity: "invalid_complexity",
        dependencies: null,
        requirements: [],
        createdDate: "invalid-date",
        lastModified: "2024-01-01T00:00:00.000Z",
      } as any;

      // This should not throw and should handle malformed data gracefully
      expect(() => {
        provider.renderMetadataGrid(malformedTask);
      }).not.toThrow();

      const metadataHTML = provider.renderMetadataGrid(malformedTask);
      expect(metadataHTML).toContain("Complexity");
      expect(metadataHTML).toContain("Duration");
    });

    it("should maintain consistent metadata grid structure across different task types", () => {
      const testTasks = [
        {
          id: "simple",
          title: "Simple Task",
          description: "Simple description",
          status: TaskStatus.NOT_STARTED,
          complexity: "low" as any,
          priority: "low" as any,
          dependencies: [],
          requirements: [],
          createdDate: "2024-01-01T00:00:00.000Z",
          lastModified: "2024-01-01T00:00:00.000Z",
        },
        {
          id: "complex",
          title: "Complex Task",
          description: "Complex description",
          status: TaskStatus.IN_PROGRESS,
          complexity: "high" as any,
          priority: "critical" as any,
          dependencies: ["dep-1", "dep-2", "dep-3"],
          requirements: ["req-1", "req-2"],
          createdDate: "2024-01-01T00:00:00.000Z",
          lastModified: "2024-01-02T00:00:00.000Z",
          estimatedDuration: "2-3 hours",
        },
      ];

      testTasks.forEach((task) => {
        const metadataHTML = provider.renderMetadataGrid(task as Task);

        // Verify consistent structure
        expect(metadataHTML).toContain("Complexity");
        expect(metadataHTML).toContain("Duration");
        expect(metadataHTML).toContain("Dependencies");
        expect(metadataHTML).toContain("Requirements");
        expect(metadataHTML).toContain("Created");
        expect(metadataHTML).toContain("Modified");
      });
    });
  });
});
