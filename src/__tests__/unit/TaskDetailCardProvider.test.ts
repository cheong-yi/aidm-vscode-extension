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
import { Task, TaskStatus } from "../../tasks/types";
import { TestStatus } from "../../tasks/types/taskEnums";

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
        dependencies: [],
        requirements: [],
        createdDate: "2024-01-01T00:00:00.000Z",
        lastModified: "2024-01-01T00:00:00.000Z",
        testStatus: {
          lastRunDate: "2024-01-01T10:00:00.000Z",
          totalTests: 10,
          passedTests: 8,
          failedTests: 2,
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
        dependencies: [],
        requirements: [],
        createdDate: "2024-01-01T00:00:00.000Z",
        lastModified: "2024-01-01T00:00:00.000Z",
        testStatus: {
          lastRunDate: "2024-01-01T10:00:00.000Z",
          totalTests: 10,
          passedTests: 8,
          failedTests: 2,
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
  });

  describe("Action Buttons Rendering", () => {
    it("should render executable actions for not started executable tasks", () => {
      const mockTask: Task = {
        id: "test-1",
        title: "Test Task",
        description: "Test Description",
        status: TaskStatus.NOT_STARTED,
        complexity: "low" as any,
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
        dependencies: [],
        requirements: [],
        createdDate: "2024-01-01T00:00:00.000Z",
        lastModified: "2024-01-01T00:00:00.000Z",
        testStatus: {
          lastRunDate: "2024-01-01T10:00:00.000Z",
          totalTests: 10,
          passedTests: 8,
          failedTests: 2,
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
});
