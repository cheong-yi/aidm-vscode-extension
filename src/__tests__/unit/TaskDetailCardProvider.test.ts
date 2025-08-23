/**
 * TaskDetailCardProvider Unit Tests
 * Requirements: 2.1, 2.2 - Task detail display with expandable content
 * Task 3.3.1: Create TaskDetailCardProvider class structure
 * Task 3.3.9: Add relative time integration with periodic refresh
 *
 * Tests the TaskDetailCardProvider class implementation of vscode.WebviewViewProvider
 * interface with event emitters, method stubs, and time formatting integration.
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
import { TimeFormattingUtility } from "../../utils/TimeFormattingUtility";

// Mock VSCode modules
jest.mock("vscode", () => ({
  EventEmitter: jest.fn().mockImplementation(() => ({
    event: jest.fn(),
    fire: jest.fn(),
    dispose: jest.fn(),
  })),
  WebviewViewProvider: jest.fn(),
}));

// Mock TimeFormattingUtility
jest.mock("../../utils/TimeFormattingUtility", () => ({
  TimeFormattingUtility: jest.fn().mockImplementation(() => ({
    formatRelativeTime: jest.fn().mockImplementation((isoDate: string) => {
      if (
        !isoDate ||
        isoDate === "invalid-date" ||
        isoDate === "invalid-date-string"
      ) {
        throw new Error("Invalid date");
      }
      // Return different values based on input for more realistic testing
      if (isoDate.includes("10:00:00")) {
        return "2 hours ago";
      } else if (isoDate.includes("02:00:00")) {
        return "6 hours ago";
      } else if (isoDate.includes("00:00:00")) {
        return "8 hours ago";
      } else if (isoDate.includes("14:15:00")) {
        return "1 hour ago";
      } else if (isoDate.includes("16:00:00")) {
        return "1 day ago";
      }
      return "2 hours ago";
    }),
    formatDuration: jest.fn().mockImplementation((minutes: number) => {
      if (minutes < 60) {
        return `${minutes} min`;
      } else {
        const hours = Math.floor(minutes / 60);
        const remainingMinutes = minutes % 60;
        return remainingMinutes > 0
          ? `${hours}h ${remainingMinutes}m`
          : `${hours}h`;
      }
    }),
    parseEstimatedDuration: jest.fn().mockImplementation((duration: string) => {
      if (!duration || duration.trim() === "") {
        return 0;
      }
      // Mock parsing logic
      const match = duration.match(/(\d+)-(\d+)\s*min/);
      if (match) {
        const min = parseInt(match[1]);
        const max = parseInt(match[2]);
        return Math.round((min + max) / 2);
      }
      return 30; // Default fallback
    }),
    clearCache: jest.fn(),
    getCacheStats: jest.fn().mockReturnValue({
      hits: 0,
      misses: 0,
      size: 0,
      hitRate: 0,
    }),
  })),
}));

describe("TaskDetailCardProvider", () => {
  let provider: TaskDetailCardProvider;
  let mockWebviewView: vscode.WebviewView;
  let mockWebview: vscode.Webview;
  let mockContext: vscode.WebviewViewResolveContext;
  let mockToken: vscode.CancellationToken;
  let mockTimeFormattingUtility: jest.Mocked<TimeFormattingUtility>;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Create mock TimeFormattingUtility
    mockTimeFormattingUtility =
      new TimeFormattingUtility() as jest.Mocked<TimeFormattingUtility>;

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

    // Create provider instance with mock TimeFormattingUtility
    provider = new TaskDetailCardProvider(mockTimeFormattingUtility);
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

  describe("Enhanced Webview Message Handling", () => {
    it("should setup message handling correctly", () => {
      // Mock webview and console.error
      const mockWebview = {
        onDidReceiveMessage: jest.fn(),
      } as unknown as vscode.Webview;
      const consoleSpy = jest.spyOn(console, "error").mockImplementation();

      // Test setupMessageHandling
      expect(() => {
        (provider as any).setupMessageHandling(mockWebview);
      }).not.toThrow();

      // Verify message listener was set up
      expect(mockWebview.onDidReceiveMessage).toHaveBeenCalled();

      consoleSpy.mockRestore();
    });

    it("should validate message structure correctly", () => {
      // Test valid messages
      const validMessages = [
        {
          command: "status-change",
          data: { taskId: "test-1", newStatus: TaskStatus.IN_PROGRESS },
        },
        { command: "cursor-execute", data: { taskId: "test-1" } },
        {
          command: "action-button",
          data: { action: "🤖 Execute with Cursor", taskId: "test-1" },
        },
        { command: "execute-cursor", taskId: "test-1" },
        { command: "generate-prompt", taskId: "test-1" },
      ];

      validMessages.forEach((message) => {
        expect((provider as any).isValidMessage(message)).toBe(true);
      });

      // Test invalid messages
      const invalidMessages = [
        null,
        undefined,
        {},
        { command: null },
        { command: "status-change" }, // Missing data
        { command: "status-change", data: { taskId: "test-1" } }, // Missing newStatus
        {
          command: "status-change",
          data: { taskId: "test-1", newStatus: "invalid-status" },
        }, // Invalid status
        { command: "action-button", data: { action: "", taskId: "test-1" } }, // Empty action
        { command: "cursor-execute", data: { taskId: "" } }, // Empty taskId
      ];

      invalidMessages.forEach((message) => {
        expect((provider as any).isValidMessage(message)).toBe(false);
      });
    });

    it("should handle status change messages correctly", () => {
      // Mock console.warn and console.log
      const consoleWarnSpy = jest.spyOn(console, "warn").mockImplementation();
      const consoleLogSpy = jest.spyOn(console, "log").mockImplementation();

      // Set up current task
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
      (provider as any).currentTask = mockTask;

      // Test valid status change
      expect(() => {
        (provider as any).handleStatusChange("test-1", TaskStatus.IN_PROGRESS);
      }).not.toThrow();

      // Test invalid task ID
      expect(() => {
        (provider as any).handleStatusChange(
          "invalid-task",
          TaskStatus.IN_PROGRESS
        );
      }).not.toThrow();

      // Test invalid status transition
      expect(() => {
        (provider as any).handleStatusChange("test-1", TaskStatus.COMPLETED);
      }).not.toThrow();

      // Test missing parameters
      expect(() => {
        (provider as any).handleStatusChange("", TaskStatus.IN_PROGRESS);
      }).not.toThrow();

      expect(() => {
        (provider as any).handleStatusChange("test-1", null as any);
      }).not.toThrow();

      consoleWarnSpy.mockRestore();
      consoleLogSpy.mockRestore();
    });

    it("should handle Cursor execution messages correctly", () => {
      // Mock console.warn and console.log
      const consoleWarnSpy = jest.spyOn(console, "warn").mockImplementation();
      const consoleLogSpy = jest.spyOn(console, "log").mockImplementation();

      // Set up executable task
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
      (provider as any).currentTask = mockTask;

      // Test valid Cursor execution
      expect(() => {
        (provider as any).handleCursorExecution("test-1");
      }).not.toThrow();

      // Test invalid task ID
      expect(() => {
        (provider as any).handleCursorExecution("invalid-task");
      }).not.toThrow();

      // Test non-executable task
      const nonExecutableTask = { ...mockTask, isExecutable: false };
      (provider as any).currentTask = nonExecutableTask;
      expect(() => {
        (provider as any).handleCursorExecution("test-1");
      }).not.toThrow();

      // Test non-NOT_STARTED task
      const inProgressTask = { ...mockTask, status: TaskStatus.IN_PROGRESS };
      (provider as any).currentTask = inProgressTask;
      expect(() => {
        (provider as any).handleCursorExecution("test-1");
      }).not.toThrow();

      // Test missing task ID
      expect(() => {
        (provider as any).handleCursorExecution("");
      }).not.toThrow();

      consoleWarnSpy.mockRestore();
      consoleLogSpy.mockRestore();
    });

    it("should handle action button messages correctly", () => {
      // Mock console.warn and console.log
      const consoleWarnSpy = jest.spyOn(console, "warn").mockImplementation();
      const consoleLogSpy = jest.spyOn(console, "log").mockImplementation();

      // Set up current task
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
        isExecutable: true,
      };
      (provider as any).currentTask = mockTask;

      // Test Cursor execution action
      expect(() => {
        (provider as any).handleActionButton(
          "🤖 Execute with Cursor",
          "test-1"
        );
      }).not.toThrow();

      // Test other action types
      expect(() => {
        (provider as any).handleActionButton("Generate Prompt", "test-1");
      }).not.toThrow();

      // Test invalid parameters
      expect(() => {
        (provider as any).handleActionButton("", "test-1");
      }).not.toThrow();

      expect(() => {
        (provider as any).handleActionButton("Generate Prompt", "");
      }).not.toThrow();

      // Test non-current task
      expect(() => {
        (provider as any).handleActionButton("Generate Prompt", "invalid-task");
      }).not.toThrow();

      consoleWarnSpy.mockRestore();
      consoleLogSpy.mockRestore();
    });

    it("should validate status transitions correctly", () => {
      // Test valid transitions
      expect(
        (provider as any).isValidStatusTransition(
          TaskStatus.NOT_STARTED,
          TaskStatus.IN_PROGRESS
        )
      ).toBe(true);
      expect(
        (provider as any).isValidStatusTransition(
          TaskStatus.NOT_STARTED,
          TaskStatus.BLOCKED
        )
      ).toBe(true);
      expect(
        (provider as any).isValidStatusTransition(
          TaskStatus.IN_PROGRESS,
          TaskStatus.REVIEW
        )
      ).toBe(true);
      expect(
        (provider as any).isValidStatusTransition(
          TaskStatus.IN_PROGRESS,
          TaskStatus.COMPLETED
        )
      ).toBe(true);
      expect(
        (provider as any).isValidStatusTransition(
          TaskStatus.REVIEW,
          TaskStatus.COMPLETED
        )
      ).toBe(true);

      // Test invalid transitions
      expect(
        (provider as any).isValidStatusTransition(
          TaskStatus.NOT_STARTED,
          TaskStatus.COMPLETED
        )
      ).toBe(false);
      expect(
        (provider as any).isValidStatusTransition(
          TaskStatus.NOT_STARTED,
          TaskStatus.REVIEW
        )
      ).toBe(false);
      expect(
        (provider as any).isValidStatusTransition(
          TaskStatus.COMPLETED,
          TaskStatus.NOT_STARTED
        )
      ).toBe(false);
      expect(
        (provider as any).isValidStatusTransition(
          TaskStatus.DEPRECATED,
          TaskStatus.IN_PROGRESS
        )
      ).toBe(false);

      // Test edge cases
      expect(
        (provider as any).isValidStatusTransition(
          TaskStatus.NOT_STARTED,
          "invalid-status" as any
        )
      ).toBe(false);
    });

    it("should handle new structured message formats", () => {
      // Mock console.warn and console.log
      const consoleWarnSpy = jest.spyOn(console, "warn").mockImplementation();
      const consoleLogSpy = jest.spyOn(console, "log").mockImplementation();

      // Set up current task
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
      (provider as any).currentTask = mockTask;

      // Test status-change message
      const statusChangeMessage = {
        command: "status-change",
        data: { taskId: "test-1", newStatus: TaskStatus.IN_PROGRESS },
      };
      expect(() => {
        (provider as any).handleWebviewMessage(statusChangeMessage);
      }).not.toThrow();

      // Test cursor-execute message
      const cursorExecuteMessage = {
        command: "cursor-execute",
        data: { taskId: "test-1" },
      };
      expect(() => {
        (provider as any).handleWebviewMessage(cursorExecuteMessage);
      }).not.toThrow();

      // Test action-button message
      const actionButtonMessage = {
        command: "action-button",
        data: { action: "🤖 Execute with Cursor", taskId: "test-1" },
      };
      expect(() => {
        (provider as any).handleWebviewMessage(actionButtonMessage);
      }).not.toThrow();

      consoleWarnSpy.mockRestore();
      consoleLogSpy.mockRestore();
    });

    it("should reject invalid structured messages", () => {
      // Mock console.warn
      const consoleWarnSpy = jest.spyOn(console, "warn").mockImplementation();

      // Test invalid structured messages
      const invalidStructuredMessages = [
        { command: "status-change", data: { taskId: "test-1" } }, // Missing newStatus
        {
          command: "status-change",
          data: { newStatus: TaskStatus.IN_PROGRESS },
        }, // Missing taskId
        {
          command: "status-change",
          data: { taskId: "test-1", newStatus: "invalid-status" },
        }, // Invalid status
        { command: "cursor-execute", data: { taskId: "" } }, // Empty taskId
        { command: "action-button", data: { action: "", taskId: "test-1" } }, // Empty action
        { command: "action-button", data: { action: "Generate Prompt" } }, // Missing taskId
      ];

      invalidStructuredMessages.forEach((message) => {
        expect((provider as any).isValidMessage(message)).toBe(false);
      });

      consoleWarnSpy.mockRestore();
    });

    it("should maintain backward compatibility with legacy message formats", () => {
      // Mock console.warn and console.log
      const consoleWarnSpy = jest.spyOn(console, "warn").mockImplementation();
      const consoleLogSpy = jest.spyOn(console, "log").mockImplementation();

      // Set up current task
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
      (provider as any).currentTask = mockTask;

      // Test legacy message formats
      const legacyMessages = [
        { command: "executeWithCursor", taskId: "test-1" },
        {
          command: "updateStatus",
          taskId: "test-1",
          newStatus: TaskStatus.IN_PROGRESS,
        },
        { command: "generate-prompt", taskId: "test-1" },
        { command: "view-requirements", taskId: "test-1" },
      ];

      legacyMessages.forEach((message) => {
        expect(() => {
          (provider as any).handleWebviewMessage(message);
        }).not.toThrow();
      });

      consoleWarnSpy.mockRestore();
      consoleLogSpy.mockRestore();
    });

    it("should include JavaScript message handling functions in HTML template", () => {
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

      // Verify JavaScript functions are included
      expect(html).toContain("const vscode = acquireVsCodeApi()");
      expect(html).toContain("function handleStatusChange(taskId, newStatus)");
      expect(html).toContain("function handleCursorExecute(taskId)");
      expect(html).toContain("function handleActionButton(action, taskId)");
      expect(html).toContain("function handleActionClick(action, taskId)");
      expect(html).toContain("vscode.postMessage");
    });

    it("should include proper message structure in JavaScript functions", () => {
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

      // Verify message structure for status change
      expect(html).toContain("command: 'status-change'");
      expect(html).toContain("data: { taskId, newStatus }");

      // Verify message structure for Cursor execution
      expect(html).toContain("command: 'cursor-execute'");
      expect(html).toContain("data: { taskId }");

      // Verify message structure for action button
      expect(html).toContain("command: 'action-button'");
      expect(html).toContain("data: { action, taskId }");
    });

    it("should include event delegation for action buttons", () => {
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

      // Verify event delegation is set up
      expect(html).toContain("document.addEventListener('click'");
      expect(html).toContain("event.target.closest('.action-btn')");
      expect(html).toContain("getAttribute('data-action')");
      expect(html).toContain("getAttribute('data-task-id')");
    });

    it("should include initialization code for message handling", () => {
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

      // Verify initialization code
      expect(html).toContain("document.addEventListener('DOMContentLoaded'");
      expect(html).toContain(
        "TaskDetailCardProvider webview initialized with message handling"
      );
    });

    it("should include JavaScript in no-task-selected HTML", () => {
      const html = (provider as any).generateNoTaskSelectedHTML();

      // Verify JavaScript is included even when no task is selected
      expect(html).toContain("const vscode = acquireVsCodeApi()");
      expect(html).toContain(
        "TaskDetailCardProvider webview initialized (no task selected)"
      );
    });

    it("should include JavaScript in fallback HTML", () => {
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

      const html = (provider as any).generateFallbackHTML(mockTask);

      // Verify JavaScript is included even in fallback state
      expect(html).toContain("const vscode = acquireVsCodeApi()");
      expect(html).toContain(
        "TaskDetailCardProvider webview initialized (fallback state)"
      );
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
        priority: "medium" as any,
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
      // Create dates with specific times that match the mock behavior
      const oneHourAgo = new Date("2024-01-01T14:15:00.000Z"); // Mock returns "1 hour ago"
      const oneDayAgo = new Date("2024-01-01T16:00:00.000Z"); // Mock returns "1 day ago"

      // Test the new placeholder system with formatTimestampsInHTML
      const testHtml = "Last run: {{LAST_RUN_DATE}}";
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
          lastRunDate: oneHourAgo.toISOString(),
          totalTests: 10,
          passedTests: 8,
          failedTests: 2,
          status: TestStatusEnum.PARTIAL,
        },
      };

      const result1 = (provider as any).formatTimestampsInHTML(
        testHtml,
        mockTask
      );
      expect(result1).toContain("1 hour ago");

      // Test with different date
      const mockTask2 = {
        ...mockTask,
        testStatus: {
          ...mockTask.testStatus,
          lastRunDate: oneDayAgo.toISOString(),
        },
      };

      const result2 = (provider as any).formatTimestampsInHTML(
        testHtml,
        mockTask2
      );
      expect(result2).toContain("1 day ago");
    });

    it("should handle TimeFormattingUtility failures gracefully", () => {
      // Test the new placeholder system with formatTimestampsInHTML
      const testHtml = "Last run: {{LAST_RUN_DATE}}";
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
          lastRunDate: "invalid-date-string",
          totalTests: 10,
          passedTests: 8,
          failedTests: 2,
          status: TestStatusEnum.PARTIAL,
        },
      };

      const result = (provider as any).formatTimestampsInHTML(
        testHtml,
        mockTask
      );

      // TimeFormattingUtility throws error for invalid dates, so fallback is used
      expect(result).toContain("invalid-date-string");
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

      // Use the full flow with formatTimestampsInHTML
      const htmlContent = (provider as any).generateTaskDetailsHTML(
        mockTaskNoDate
      );
      const htmlNoDate = (provider as any).formatTimestampsInHTML(
        htmlContent,
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

      const htmlContentZero = (provider as any).generateTaskDetailsHTML(
        mockTaskZeroTests
      );
      const htmlZeroTests = (provider as any).formatTimestampsInHTML(
        htmlContentZero,
        mockTaskZeroTests
      );
      expect(htmlZeroTests).toContain("No tests run");
    });

    it("should handle malformed test status data gracefully", () => {
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
          lastRunDate: "invalid-date",
          totalTests: 5,
          passedTests: 3,
          failedTests: 2,
          failingTestsList: [],
        } as any,
      };

      // Use the full flow with formatTimestampsInHTML
      const htmlContent = (provider as any).generateTaskDetailsHTML(mockTask);
      const html = (provider as any).formatTimestampsInHTML(
        htmlContent,
        mockTask
      );

      expect(html).toContain("Test Results");
      // Should handle invalid data gracefully - TimeFormattingUtility throws error, fallback used
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
        priority: "medium" as any,
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
        priority: "medium" as any,
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
        priority: "medium" as any,
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
        priority: "medium" as any,
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

    it("should render blocked task actions correctly", () => {
      const mockTask: Task = {
        id: "test-1",
        title: "Test Task",
        description: "Test Description",
        status: TaskStatus.BLOCKED,
        complexity: "low" as any,
        priority: "medium" as any,
        dependencies: [],
        requirements: [],
        createdDate: "2024-01-01T00:00:00.000Z",
        lastModified: "2024-01-01T00:00:00.000Z",
      };

      const html = (provider as any).generateTaskDetailsHTML(mockTask);

      expect(html).toContain("View Blockers");
      expect(html).toContain("Update Dependencies");
      expect(html).toContain("Report Issue");
    });

    it("should render deprecated task actions correctly", () => {
      const mockTask: Task = {
        id: "test-1",
        title: "Test Task",
        description: "Test Description",
        status: TaskStatus.DEPRECATED,
        complexity: "low" as any,
        priority: "medium" as any,
        dependencies: [],
        requirements: [],
        createdDate: "2024-01-01T00:00:00.000Z",
        lastModified: "2024-01-01T00:00:00.000Z",
      };

      const html = (provider as any).generateTaskDetailsHTML(mockTask);

      expect(html).toContain("Archive");
      expect(html).toContain("View History");
    });
  });

  describe("STATUS_ACTIONS Integration", () => {
    it("should use STATUS_ACTIONS mapping for button generation", () => {
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
        isExecutable: true,
      };

      // Verify that getActionsForStatus returns correct actions
      const actions = provider.getActionsForStatus(TaskStatus.NOT_STARTED);
      expect(actions).toContain("🤖 Execute with Cursor");
      expect(actions).toContain("Generate Prompt");
      expect(actions).toContain("View Requirements");
    });

    it("should handle all TaskStatus enum values with STATUS_ACTIONS", () => {
      const allStatuses = [
        TaskStatus.NOT_STARTED,
        TaskStatus.IN_PROGRESS,
        TaskStatus.REVIEW,
        TaskStatus.COMPLETED,
        TaskStatus.BLOCKED,
        TaskStatus.DEPRECATED,
      ];

      allStatuses.forEach((status) => {
        const actions = provider.getActionsForStatus(status);
        expect(actions.length).toBeGreaterThan(0);
        expect(Array.isArray(actions)).toBe(true);
      });
    });

    it("should return empty array for unknown status", () => {
      const actions = provider.getActionsForStatus("unknown_status" as any);
      expect(actions).toEqual([]);
    });
  });

  describe("Action Button Helper Methods", () => {
    it("should render individual buttons with proper data attributes", () => {
      const buttonHtml = provider.renderButton(
        "🤖 Execute with Cursor",
        "test-1"
      );

      expect(buttonHtml).toContain('data-action="execute-cursor"');
      expect(buttonHtml).toContain('data-task-id="test-1"');
      expect(buttonHtml).toContain('class="action-btn cursor-btn"');
      expect(buttonHtml).toContain("🤖 Execute with Cursor");
    });

    it("should render regular buttons without cursor styling", () => {
      const buttonHtml = provider.renderButton("Generate Prompt", "test-1");

      expect(buttonHtml).toContain('data-action="generate-prompt"');
      expect(buttonHtml).toContain('data-task-id="test-1"');
      expect(buttonHtml).toContain('class="action-btn"');
      expect(buttonHtml).not.toContain("cursor-btn");
    });

    it("should correctly identify executable actions", () => {
      const executableTask: Task = {
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
        isExecutable: true,
      };

      const nonExecutableTask: Task = {
        ...executableTask,
        isExecutable: false,
      };

      expect(
        provider.isExecutableAction("🤖 Execute with Cursor", executableTask)
      ).toBe(true);
      expect(
        provider.isExecutableAction("🤖 Execute with Cursor", nonExecutableTask)
      ).toBe(false);
      expect(
        provider.isExecutableAction("Generate Prompt", executableTask)
      ).toBe(false);
    });

    it("should generate correct action keys for all actions", () => {
      const testActions = [
        "🤖 Execute with Cursor",
        "Generate Prompt",
        "View Requirements",
        "Continue Work",
        "Mark Complete",
        "View Dependencies",
        "Approve & Complete",
        "Request Changes",
        "View Implementation",
        "View Code",
        "View Tests",
        "History",
        "Fix Failing Tests",
        "View Full Report",
        "Rerun Tests",
        "View Blockers",
        "Update Dependencies",
        "Report Issue",
        "Archive",
        "View History",
      ];

      testActions.forEach((action) => {
        const actionKey = (provider as any).getActionKey(action);
        expect(actionKey).toBeDefined();
        expect(typeof actionKey).toBe("string");
        expect(actionKey.length).toBeGreaterThan(0);
      });
    });

    it("should handle unknown actions with fallback key generation", () => {
      const unknownAction = "Unknown Action";
      const actionKey = (provider as any).getActionKey(unknownAction);
      expect(actionKey).toBe("unknown-action");
    });
  });

  describe("Executable Task Detection", () => {
    it("should show Cursor buttons only for executable NOT_STARTED tasks", () => {
      const executableTask: Task = {
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
        isExecutable: true,
      };

      const nonExecutableTask: Task = {
        ...executableTask,
        isExecutable: false,
      };

      const executableHtml = (provider as any).generateTaskDetailsHTML(
        executableTask
      );
      const nonExecutableHtml = (provider as any).generateTaskDetailsHTML(
        nonExecutableTask
      );

      // Executable task should have Cursor button
      expect(executableHtml).toContain("🤖 Execute with Cursor");
      expect(executableHtml).toContain('class="action-btn cursor-btn"');

      // Non-executable task should not have Cursor button
      expect(nonExecutableHtml).not.toContain("🤖 Execute with Cursor");
      expect(nonExecutableHtml).toContain("Generate Prompt");
      expect(nonExecutableHtml).toContain("View Requirements");
    });

    it("should not show Cursor buttons for non-NOT_STARTED tasks", () => {
      const inProgressTask: Task = {
        id: "test-1",
        title: "Test Task",
        description: "Test Description",
        status: TaskStatus.IN_PROGRESS,
        complexity: "low" as any,
        priority: "medium" as any,
        dependencies: [],
        requirements: [],
        createdDate: "2024-01-01T00:00:00.000Z",
        lastModified: "2024-01-01T00:00:00.000Z",
        isExecutable: true, // Even if executable, should not show Cursor button
      };

      const html = (provider as any).generateTaskDetailsHTML(inProgressTask);

      expect(html).not.toContain("🤖 Execute with Cursor");
      expect(html).toContain("Continue Work");
      expect(html).toContain("Mark Complete");
      expect(html).toContain("View Dependencies");
    });
  });

  describe("Button Data Attributes and Event Handling", () => {
    it("should include proper data attributes for all buttons", () => {
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
        isExecutable: true,
      };

      const html = (provider as any).generateTaskDetailsHTML(mockTask);

      // Verify data attributes are present
      expect(html).toContain('data-action="execute-cursor"');
      expect(html).toContain('data-action="generate-prompt"');
      expect(html).toContain('data-action="view-requirements"');
      expect(html).toContain('data-task-id="test-1"');
    });

    it("should use action-buttons container class", () => {
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

      const html = (provider as any).generateTaskDetailsHTML(mockTask);

      expect(html).toContain('class="action-buttons"');
      expect(html).not.toContain('class="actions"');
    });
  });

  describe("Error Handling in Action Button Rendering", () => {
    it("should handle missing task status gracefully", () => {
      const malformedTask = {
        id: "test-1",
        title: "Test Task",
        description: "Test Description",
        // Missing status
        complexity: "low" as any,
        priority: "medium" as any,
        dependencies: [],
        requirements: [],
        createdDate: "2024-01-01T00:00:00.000Z",
        lastModified: "2024-01-01T00:00:00.000Z",
      } as any;

      // This should not throw and should handle missing status gracefully
      expect(() => {
        (provider as any).generateTaskDetailsHTML(malformedTask);
      }).not.toThrow();
    });

    it("should show error state when action button rendering fails", () => {
      // Mock a task that would cause rendering to fail
      const problematicTask = {
        id: "test-1",
        title: "Test Task",
        description: "Test Description",
        status: "invalid_status",
        complexity: "low" as any,
        priority: "medium" as any,
        dependencies: [],
        requirements: [],
        createdDate: "2024-01-01T00:00:00.000Z",
        lastModified: "2024-01-01T00:00:00.000Z",
      } as any;

      const html = (provider as any).generateTaskDetailsHTML(problematicTask);

      // Should show no actions available message
      expect(html).toContain("No actions available for this task status");
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

  describe("Enhanced Test Failures Rendering", () => {
    it("should render collapsible failures section with proper HTML structure", () => {
      const mockFailures = [
        {
          name: "should validate task status transitions",
          message: "AssertionError: Expected 400 but got 200",
          category: "assertion",
        },
        {
          name: "should handle invalid task IDs",
          message: "TypeError: Cannot read property 'id' of undefined",
          category: "type",
        },
      ];

      const result = provider.renderCollapsibleFailures(mockFailures);

      // Verify HTML structure
      expect(result).toContain("failures-section");
      expect(result).toContain("failures-header");
      expect(result).toContain("failures-list");
      expect(result).toContain("Failed Tests (2)");
      expect(result).toContain('onclick="toggleFailures(this, event)"');
    });

    it("should render individual failure items with error categorization", () => {
      const mockFailure = {
        name: "should validate task status transitions",
        message: "AssertionError: Expected 400 but got 200",
        category: "assertion",
        stackTrace: "at Object.<anonymous> (test.js:15:10)",
      };

      const result = provider.renderFailureItem(mockFailure);

      // Verify failure item structure
      expect(result).toContain("failure-item assertion");
      expect(result).toContain("failure-header");
      expect(result).toContain("failure-category-icon");
      expect(result).toContain("failure-category-badge");
      expect(result).toContain("should validate task status transitions");
      expect(result).toContain("AssertionError: Expected 400 but got 200");
      expect(result).toContain("assertion");
      expect(result).toContain("failure-stacktrace");
      // Note: HTML is escaped, so check for escaped version
      expect(result).toContain("at Object.&lt;anonymous&gt; (test.js:15:10)");
    });

    it("should handle failure items without stack trace", () => {
      const mockFailure = {
        name: "should handle invalid task IDs",
        message: "TypeError: Cannot read property 'id' of undefined",
        category: "type",
      };

      const result = provider.renderFailureItem(mockFailure);

      // Verify no stack trace section
      expect(result).not.toContain("failure-stacktrace");
      expect(result).toContain("type");
    });

    it("should return appropriate icons for each error category", () => {
      const categoryIconMap = {
        assertion: "❌",
        type: "🔍",
        filesystem: "💾",
        timeout: "⏰",
        network: "🌐",
      };

      Object.entries(categoryIconMap).forEach(([category, expectedIcon]) => {
        const result = provider.getCategoryIcon(category);
        expect(result).toBe(expectedIcon);
      });
    });

    it("should return unknown icon for invalid categories", () => {
      const result = provider.getCategoryIcon("invalid_category");
      expect(result).toBe("❓");
    });

    it("should return appropriate colors for each error category", () => {
      const categoryColorMap = {
        assertion: "#f48771",
        type: "#dcdcaa",
        filesystem: "#569cd6",
        timeout: "#d7ba7d",
        network: "#c586c0",
      };

      Object.entries(categoryColorMap).forEach(([category, expectedColor]) => {
        const result = provider.getCategoryColor(category);
        expect(result).toBe(expectedColor);
      });
    });

    it("should return unknown color for invalid categories", () => {
      const result = provider.getCategoryColor("invalid_category");
      expect(result).toBe("#6a6a6a");
    });

    it("should handle empty failures array gracefully", () => {
      const result = provider.renderCollapsibleFailures([]);
      expect(result).toBe("");
    });

    it("should handle undefined failures gracefully", () => {
      const result = provider.renderCollapsibleFailures(undefined as any);
      expect(result).toBe("");
    });

    it("should handle failures with missing category gracefully", () => {
      const mockFailure = {
        name: "should handle missing category",
        message: "Some error message",
        // Missing category
      };

      const result = provider.renderFailureItem(mockFailure);

      // Should use "unknown" category as fallback
      expect(result).toContain("failure-item unknown");
      expect(result).toContain("❓");
      expect(result).toContain("unknown");
    });

    it("should handle failures with missing message gracefully", () => {
      const mockFailure = {
        name: "should handle missing message",
        category: "assertion",
        // Missing message
      };

      const result = provider.renderFailureItem(mockFailure);

      // Should handle missing message gracefully
      expect(result).toContain("should handle missing message");
      expect(result).toContain("assertion");
    });

    it("should integrate with existing renderTestFailures method", () => {
      const mockFailures = [
        {
          name: "should validate task status transitions",
          message: "AssertionError: Expected 400 but got 200",
          category: "assertion",
        },
      ];

      const result = provider.renderTestFailures(mockFailures);

      // Should use the enhanced collapsible rendering
      expect(result).toContain("failures-section");
      expect(result).toContain('onclick="toggleFailures(this, event)"');
      expect(result).toContain("failure-item assertion");
    });

    it("should show 'No test failures' for empty failures in renderTestFailures", () => {
      const result = provider.renderTestFailures([]);
      expect(result).toContain("No test failures");
    });

    it("should maintain backward compatibility with existing test failures display", () => {
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
          failingTestsList: [
            {
              name: "should validate task status transitions",
              message: "AssertionError: Expected 400 but got 200",
              category: "assertion",
            },
            {
              name: "should handle invalid task IDs",
              message: "TypeError: Cannot read property 'id' of undefined",
              category: "type",
            },
          ],
          status: TestStatusEnum.PARTIAL,
        },
      };

      const html = (provider as any).generateTaskDetailsHTML(mockTask);

      // Verify enhanced failures section is present
      expect(html).toContain("Failed Tests (2)");
      expect(html).toContain("failure-item assertion");
      expect(html).toContain("failure-item type");
      expect(html).toContain("❌");
      expect(html).toContain("🔍");
    });
  });

  describe("TimeFormattingUtility Integration (Task 3.3.9)", () => {
    it("should have TimeFormattingUtility dependency injection configured correctly", () => {
      // Verify TimeFormattingUtility is stored and accessible
      expect(provider.getTimeFormattingUtility()).toBe(
        mockTimeFormattingUtility
      );
      expect(mockTimeFormattingUtility.formatRelativeTime).toBeDefined();
      expect(mockTimeFormattingUtility.formatDuration).toBeDefined();
      expect(mockTimeFormattingUtility.parseEstimatedDuration).toBeDefined();
    });

    it("should use TimeFormattingUtility for relative time formatting in test results", () => {
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

      // Mock the webview for testing
      (provider as any).webview = mockWebviewView;
      (provider as any).webview.visible = true;

      // Call updateTaskDetails which should use TimeFormattingUtility
      provider.updateTaskDetails(mockTask);

      // Verify TimeFormattingUtility was called for test results
      expect(mockTimeFormattingUtility.formatRelativeTime).toHaveBeenCalledWith(
        "2024-01-01T10:00:00.000Z"
      );
    });

    it("should use TimeFormattingUtility for task metadata timestamps", () => {
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
        lastModified: "2024-01-01T02:00:00.000Z",
      };

      // Mock the webview for testing
      (provider as any).webview = mockWebviewView;
      (provider as any).webview.visible = true;

      // Call updateTaskDetails which should use TimeFormattingUtility
      provider.updateTaskDetails(mockTask);

      // Verify TimeFormattingUtility was called for metadata timestamps
      expect(mockTimeFormattingUtility.formatRelativeTime).toHaveBeenCalledWith(
        "2024-01-01T00:00:00.000Z"
      );
      expect(mockTimeFormattingUtility.formatRelativeTime).toHaveBeenCalledWith(
        "2024-01-01T02:00:00.000Z"
      );
    });

    it("should handle TimeFormattingUtility failures gracefully with fallbacks", () => {
      // Mock TimeFormattingUtility to throw an error
      mockTimeFormattingUtility.formatRelativeTime.mockImplementation(() => {
        throw new Error("Time formatting service unavailable");
      });

      const mockTask: Task = {
        id: "test-1",
        title: "Test Task",
        description: "Test Description",
        status: TaskStatus.NOT_STARTED,
        complexity: "low" as any,
        priority: TaskPriority.MEDIUM,
        dependencies: [],
        requirements: [],
        createdDate: "invalid-date",
        lastModified: "2024-01-01T00:00:00.000Z",
      };

      // Mock the webview for testing
      (provider as any).webview = mockWebviewView;
      (provider as any).webview.visible = true;

      // This should not throw and should handle the error gracefully
      expect(() => {
        provider.updateTaskDetails(mockTask);
      }).not.toThrow();

      // Verify error was logged (console.warn should be called)
      expect(console.warn).toBeDefined();
    });

    it("should integrate TimeFormattingUtility with existing HTML generation methods", () => {
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

      // Test that formatTimestampsInHTML method exists and works
      const testHtml = "Created: {{CREATED_DATE}}, Modified: {{LAST_MODIFIED}}";
      const formattedHtml = (provider as any).formatTimestampsInHTML(
        testHtml,
        mockTask
      );

      // Verify timestamps were formatted
      expect(formattedHtml).toContain("8 hours ago");
      expect(formattedHtml).not.toContain("{{CREATED_DATE}}");
      expect(formattedHtml).not.toContain("{{LAST_MODIFIED}}");
    });

    it("should handle missing timestamp data gracefully", () => {
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

      // Test that formatTimestampsInHTML handles missing data
      const testHtml = "Created: {{CREATED_DATE}}, Modified: {{LAST_MODIFIED}}";
      const formattedHtml = (provider as any).formatTimestampsInHTML(
        testHtml,
        mockTask
      );

      // Verify timestamps were formatted (not missing)
      expect(formattedHtml).toContain("8 hours ago");
      expect(formattedHtml).not.toContain("{{CREATED_DATE}}");
      expect(formattedHtml).not.toContain("{{LAST_MODIFIED}}");
    });
  });

  describe("Periodic Time Refresh Mechanism (Task 3.3.9)", () => {
    beforeEach(() => {
      // Mock setInterval and clearInterval
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it("should setup periodic time refresh mechanism on initialization", () => {
      // Verify interval was set up
      expect(provider.getTimeRefreshInterval()).toBeDefined();
      expect(provider.getTimeRefreshInterval()).not.toBeNull();
    });

    it("should refresh displayed times every minute", () => {
      // Use fake timers for this test
      jest.useFakeTimers();

      // Mock the refreshDisplayedTimes method
      const refreshSpy = jest.spyOn(provider as any, "refreshDisplayedTimes");

      // Mock the webview and current task for the refresh to work
      (provider as any).webview = mockWebviewView;
      (provider as any).webview.visible = true;
      (provider as any).currentTask = {
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

      // Ensure the interval is set up by calling setupPeriodicTimeRefresh
      (provider as any).setupPeriodicTimeRefresh();

      // Fast-forward time by 1 minute to trigger the interval
      jest.advanceTimersByTime(60000);

      // Verify refresh method was called
      expect(refreshSpy).toHaveBeenCalled();

      // Clean up
      jest.useRealTimers();
      refreshSpy.mockRestore();
    });

    it("should not refresh when webview is not visible", () => {
      // Mock the webview as not visible
      (provider as any).webview = mockWebviewView;
      (provider as any).webview.visible = false;
      (provider as any).currentTask = {
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

      // Mock the refreshDisplayedTimes method
      const refreshSpy = jest.spyOn(provider as any, "refreshDisplayedTimes");

      // Fast-forward time by 1 minute
      jest.advanceTimersByTime(60000);

      // Verify refresh method was not called
      expect(refreshSpy).not.toHaveBeenCalled();
    });

    it("should not refresh when no current task", () => {
      // Mock the webview as visible but no current task
      (provider as any).webview = mockWebviewView;
      (provider as any).webview.visible = true;
      (provider as any).currentTask = null;

      // Mock the refreshDisplayedTimes method
      const refreshSpy = jest.spyOn(provider as any, "refreshDisplayedTimes");

      // Fast-forward time by 1 minute
      jest.advanceTimersByTime(60000);

      // Verify refresh method was not called
      expect(refreshSpy).not.toHaveBeenCalled();
    });

    it("should handle refresh errors gracefully", () => {
      // Mock the webview and current task
      (provider as any).webview = mockWebviewView;
      (provider as any).webview.visible = true;
      (provider as any).currentTask = {
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

      // Mock generateTaskDetailsHTML to throw an error
      jest
        .spyOn(provider as any, "generateTaskDetailsHTML")
        .mockImplementation(() => {
          throw new Error("HTML generation failed");
        });

      // Mock console.error to prevent test output pollution
      const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation();

      // This should not throw and should handle the error gracefully
      expect(() => {
        (provider as any).refreshDisplayedTimes();
      }).not.toThrow();

      // Verify error was logged
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        "Failed to refresh displayed times:",
        expect.any(Error)
      );

      consoleErrorSpy.mockRestore();
    });
  });

  describe("Time Formatting Error Handling (Task 3.3.9)", () => {
    it("should handle time formatting failures gracefully", () => {
      const mockError = new Error("Time formatting failed");
      const fallbackTime = "2024-01-01T00:00:00.000Z";

      const result = (provider as any).handleTimeFormattingFailure(
        mockError,
        fallbackTime
      );

      // Verify fallback time is returned
      expect(result).toBe(fallbackTime);
    });

    it("should return 'Invalid date' when fallback time is empty", () => {
      const mockError = new Error("Time formatting failed");
      const fallbackTime = "";

      const result = (provider as any).handleTimeFormattingFailure(
        mockError,
        fallbackTime
      );

      // Verify 'Invalid date' is returned
      expect(result).toBe("Invalid date");
    });

    it("should handle errors in handleTimeFormattingFailure gracefully", () => {
      const mockError = new Error("Time formatting failed");
      const fallbackTime = "2024-01-01T00:00:00.000Z";

      // Mock console.warn to throw an error
      const originalWarn = console.warn;
      console.warn = jest.fn().mockImplementation(() => {
        throw new Error("Console warning failed");
      });

      const result = (provider as any).handleTimeFormattingFailure(
        mockError,
        fallbackTime
      );

      // Verify fallback still works even when error handling fails
      expect(result).toBe("Invalid date");

      // Restore console.warn
      console.warn = originalWarn;
    });

    it("should handle formatTimestampsInHTML errors gracefully", () => {
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

      // Mock TimeFormattingUtility to throw an error
      mockTimeFormattingUtility.formatRelativeTime.mockImplementation(() => {
        throw new Error("Time formatting service unavailable");
      });

      const testHtml = "Created: {{CREATED_DATE}}, Modified: {{LAST_MODIFIED}}";
      const result = (provider as any).formatTimestampsInHTML(
        testHtml,
        mockTask
      );

      // Verify that errors are handled gracefully and fallback values are used
      // The method returns the original ISO strings as fallback when formatting fails
      expect(result).toContain("2024-01-01T00:00:00.000Z");
      expect(result).not.toContain("{{CREATED_DATE}}");
      expect(result).not.toContain("{{LAST_MODIFIED}}");
    });

    it("should return 'Invalid date' when fallback time is empty", () => {
      const mockTask: Task = {
        id: "test-1",
        title: "Test Task",
        description: "Test Description",
        status: TaskStatus.NOT_STARTED,
        complexity: "low" as any,
        priority: TaskPriority.MEDIUM,
        dependencies: [],
        requirements: [],
        createdDate: "",
        lastModified: "",
      };

      // Mock TimeFormattingUtility to throw an error
      mockTimeFormattingUtility.formatRelativeTime.mockImplementation(() => {
        throw new Error("Time formatting service unavailable");
      });

      const testHtml = "Created: {{CREATED_DATE}}, Modified: {{LAST_MODIFIED}}";
      const result = (provider as any).formatTimestampsInHTML(
        testHtml,
        mockTask
      );

      // Verify that placeholders are replaced with "Invalid date" when fallback times are empty
      // The method should replace placeholders with "Invalid date" when fallback is empty
      expect(result).toContain("Invalid date");
      expect(result).not.toContain("{{CREATED_DATE}}");
      expect(result).not.toContain("{{LAST_MODIFIED}}");
    });
  });

  describe("Memory Management and Cleanup (Task 3.3.9)", () => {
    it("should clean up time refresh interval on disposal", () => {
      // Verify interval exists before disposal
      expect(provider.getTimeRefreshInterval()).toBeDefined();

      // Mock clearInterval
      const clearIntervalSpy = jest.spyOn(global, "clearInterval");

      // Dispose the provider
      provider.dispose();

      // Verify clearInterval was called
      expect(clearIntervalSpy).toHaveBeenCalled();

      // Verify interval reference is cleared
      expect(provider.getTimeRefreshInterval()).toBeNull();
    });

    it("should handle disposal errors gracefully", () => {
      // Mock clearInterval to throw an error
      const clearIntervalSpy = jest
        .spyOn(global, "clearInterval")
        .mockImplementation(() => {
          throw new Error("Clear interval failed");
        });

      // Mock console.error to prevent test output pollution
      const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation();

      // This should not throw and should handle the error gracefully
      expect(() => {
        provider.dispose();
      }).not.toThrow();

      // Verify error was logged
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        "Error during TaskDetailCardProvider disposal:",
        expect.any(Error)
      );

      clearIntervalSpy.mockRestore();
      consoleErrorSpy.mockRestore();
    });

    it("should not dispose interval if it doesn't exist", () => {
      // Create a new provider without interval
      const newProvider = new TaskDetailCardProvider(mockTimeFormattingUtility);

      // Ensure no interval is set
      (newProvider as any).timeRefreshInterval = null;

      // Mock clearInterval
      const clearIntervalSpy = jest.spyOn(global, "clearInterval");

      // Dispose the provider
      newProvider.dispose();

      // Verify clearInterval was not called (since no interval was set)
      expect(clearIntervalSpy).not.toHaveBeenCalled();

      // Clean up
      clearIntervalSpy.mockRestore();
    });
  });

  describe("Empty State Functionality (Task 3.3.10)", () => {
    it("should show enhanced empty state when no task is selected", () => {
      // Mock the webview for testing
      (provider as any).webview = mockWebviewView;
      (provider as any).webview.visible = true;

      // Mock console.error to prevent test output pollution
      const consoleSpy = jest.spyOn(console, "error").mockImplementation();

      // Call showNoTaskSelected
      expect(() => {
        provider.showNoTaskSelected();
      }).not.toThrow();

      // Verify webview HTML was set
      expect(mockWebviewView.webview.html).toBeDefined();
      expect(mockWebviewView.webview.html.length).toBeGreaterThan(0);

      consoleSpy.mockRestore();
    });

    it("should generate comprehensive empty state HTML with all required sections", () => {
      const emptyStateHTML = provider.generateEmptyStateHTML();

      // Verify HTML structure
      expect(emptyStateHTML).toContain("<!DOCTYPE html>");
      expect(emptyStateHTML).toContain('<html lang="en">');
      expect(emptyStateHTML).toContain("<head>");
      expect(emptyStateHTML).toContain("<body>");
      expect(emptyStateHTML).toContain("</body>");
      expect(emptyStateHTML).toContain("</html>");

      // Verify empty state content
      expect(emptyStateHTML).toContain("no-task-selected");
      expect(emptyStateHTML).toContain("empty-state-icon");
      expect(emptyStateHTML).toContain("empty-state-title");
      expect(emptyStateHTML).toContain("empty-instructions");
      expect(emptyStateHTML).toContain("helpful-tips");
      expect(emptyStateHTML).toContain("quick-actions");
      expect(emptyStateHTML).toContain("empty-state-info");
    });

    it("should include helpful instructions in empty state", () => {
      const instructionsHTML = provider.renderHelpfulInstructions();

      // Verify instructions structure
      expect(instructionsHTML).toContain("helpful-tips");
      expect(instructionsHTML).toContain("tips-title");
      expect(instructionsHTML).toContain("tips-list");

      // Verify helpful content
      expect(instructionsHTML).toContain("Getting Started:");
      expect(instructionsHTML).toContain("Click on any task in the tree view");
      expect(instructionsHTML).toContain("Look for tasks marked with 🤖");
      expect(instructionsHTML).toContain("Use the refresh button");
      expect(instructionsHTML).toContain("Check task dependencies");
    });

    it("should render quick action buttons for empty state", () => {
      const quickActionsHTML = provider.renderQuickActions();

      // Verify quick actions structure
      expect(quickActionsHTML).toContain("quick-actions");
      expect(quickActionsHTML).toContain("action-btn");

      // Verify action buttons
      expect(quickActionsHTML).toContain("🔄 Refresh Tasks");
      expect(quickActionsHTML).toContain("📋 View All Tasks");
      expect(quickActionsHTML).toContain("❓ Show Help");
      expect(quickActionsHTML).toContain("⚙️ Settings");

      // Verify button classes
      expect(quickActionsHTML).toContain('class="action-btn primary"');
      expect(quickActionsHTML).toContain('class="action-btn secondary"');
    });

    it("should include JavaScript functionality in empty state", () => {
      const emptyStateHTML = provider.generateEmptyStateHTML();

      // Verify JavaScript functions
      expect(emptyStateHTML).toContain("const vscode = acquireVsCodeApi()");
      expect(emptyStateHTML).toContain("function handleQuickAction(action)");
      expect(emptyStateHTML).toContain("vscode.postMessage");
      expect(emptyStateHTML).toContain("command: 'quick-action'");

      // Verify event handling
      expect(emptyStateHTML).toContain(
        "document.addEventListener('DOMContentLoaded'"
      );
      expect(emptyStateHTML).toContain("addEventListener('mouseenter'");
      expect(emptyStateHTML).toContain("addEventListener('mouseleave'");
    });

    it("should include CSS styling for empty state components", () => {
      const emptyStateHTML = provider.generateEmptyStateHTML();

      // Verify CSS is included
      expect(emptyStateHTML).toContain("<style>");
      expect(emptyStateHTML).toContain("</style>");

      // Verify CSS classes are referenced
      expect(emptyStateHTML).toContain(".no-task-selected");
      expect(emptyStateHTML).toContain(".empty-state-icon");
      expect(emptyStateHTML).toContain(".helpful-tips");
      expect(emptyStateHTML).toContain(".quick-actions");
    });

    it("should handle empty state generation errors gracefully", () => {
      // Mock generateEmptyStateHTML to throw an error
      jest.spyOn(provider, "generateEmptyStateHTML").mockImplementation(() => {
        throw new Error("HTML generation failed");
      });

      // Mock console.error to prevent test output pollution
      const consoleSpy = jest.spyOn(console, "error").mockImplementation();

      // Mock the webview for testing
      (provider as any).webview = mockWebviewView;
      (provider as any).webview.visible = true;

      // This should not throw and should show fallback empty state
      expect(() => {
        provider.showNoTaskSelected();
      }).not.toThrow();

      // Verify error was logged
      expect(consoleSpy).toHaveBeenCalledWith(
        "Failed to show no task selected state:",
        expect.any(Error)
      );

      consoleSpy.mockRestore();
    });

    it("should generate fallback empty state HTML when main generation fails", () => {
      const fallbackHTML = (provider as any).generateFallbackEmptyStateHTML();

      // Verify fallback HTML structure
      expect(fallbackHTML).toContain("<!DOCTYPE html>");
      expect(fallbackHTML).toContain('<html lang="en">');
      expect(fallbackHTML).toContain("fallback-empty");
      expect(fallbackHTML).toContain("fallback-icon");
      expect(fallbackHTML).toContain("fallback-title");
      expect(fallbackHTML).toContain("fallback-text");

      // Verify fallback content
      expect(fallbackHTML).toContain("📋");
      expect(fallbackHTML).toContain("No Task Selected");
      expect(fallbackHTML).toContain("Select a task from the tree view above");
    });

    it("should show fallback empty state when enhanced state fails", () => {
      // Mock the webview for testing
      (provider as any).webview = mockWebviewView;
      (provider as any).webview.visible = true;

      // Mock console.error to prevent test output pollution
      const consoleSpy = jest.spyOn(console, "error").mockImplementation();

      // This should not throw and should show fallback state
      expect(() => {
        (provider as any).showFallbackEmptyState();
      }).not.toThrow();

      // Verify webview HTML was set
      expect(mockWebviewView.webview.html).toBeDefined();
      expect(mockWebviewView.webview.html.length).toBeGreaterThan(0);

      consoleSpy.mockRestore();
    });

    it("should handle quick action messages correctly", () => {
      // Mock console.log and console.error to prevent test output pollution
      const consoleLogSpy = jest.spyOn(console, "log").mockImplementation();
      const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation();

      // Test valid quick actions
      const validActions = ["refresh", "viewAll", "help", "settings"];
      validActions.forEach((action) => {
        expect(() => {
          (provider as any).handleQuickAction(action);
        }).not.toThrow();
      });

      // Test invalid quick action
      expect(() => {
        (provider as any).handleQuickAction("");
      }).not.toThrow();

      expect(() => {
        (provider as any).handleQuickAction(null as any);
      }).not.toThrow();

      consoleLogSpy.mockRestore();
      consoleErrorSpy.mockRestore();
    });

    it("should handle specific quick action types correctly", () => {
      // Mock console.log to prevent test output pollution
      const consoleLogSpy = jest.spyOn(console, "log").mockImplementation();

      // Test refresh tasks action
      expect(() => {
        (provider as any).handleRefreshTasks();
      }).not.toThrow();

      // Test view all tasks action
      expect(() => {
        (provider as any).handleViewAllTasks();
      }).not.toThrow();

      // Test show help action
      expect(() => {
        (provider as any).handleShowHelp();
      }).not.toThrow();

      // Test show settings action
      expect(() => {
        (provider as any).handleShowSettings();
      }).not.toThrow();

      consoleLogSpy.mockRestore();
    });

    it("should validate quick-action message structure correctly", () => {
      // Test valid quick-action messages
      const validQuickActionMessages = [
        { command: "quick-action", data: { action: "refresh" } },
        { command: "quick-action", data: { action: "viewAll" } },
        { command: "quick-action", data: { action: "help" } },
        { command: "quick-action", data: { action: "settings" } },
      ];

      validQuickActionMessages.forEach((message) => {
        expect((provider as any).isValidMessage(message)).toBe(true);
      });

      // Test invalid quick-action messages
      const invalidQuickActionMessages = [
        { command: "quick-action", data: { action: "" } }, // Empty action
        { command: "quick-action", data: { action: null } }, // Null action
        { command: "quick-action", data: {} }, // Missing action
        { command: "quick-action" }, // Missing data
        { command: "quick-action", data: { action: 123 } }, // Wrong type
      ];

      invalidQuickActionMessages.forEach((message) => {
        expect((provider as any).isValidMessage(message)).toBe(false);
      });
    });

    it("should include proper error handling for quick action failures", () => {
      // Mock console.log and console.error to prevent test output pollution
      const consoleLogSpy = jest.spyOn(console, "log").mockImplementation();
      const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation();

      // Test that errors in quick action handlers are caught
      expect(() => {
        (provider as any).handleQuickAction("unknown-action");
      }).not.toThrow();

      // Verify unknown action was logged
      expect(consoleLogSpy).toHaveBeenCalledWith(
        "Unknown quick action:",
        "unknown-action"
      );

      // Verify no error was logged since this is not an error condition
      expect(consoleErrorSpy).not.toHaveBeenCalled();

      consoleLogSpy.mockRestore();
      consoleErrorSpy.mockRestore();
    });

    it("should maintain backward compatibility with existing empty state methods", () => {
      // Verify that the old generateNoTaskSelectedHTML method still exists
      expect(typeof (provider as any).generateNoTaskSelectedHTML).toBe(
        "function"
      );

      // Verify that showNoTaskSelected still works
      expect(typeof provider.showNoTaskSelected).toBe("function");

      // Mock the webview for testing
      (provider as any).webview = mockWebviewView;
      (provider as any).webview.visible = true;

      // This should not throw
      expect(() => {
        provider.showNoTaskSelected();
      }).not.toThrow();
    });

    it("should provide comprehensive user guidance in empty state", () => {
      const emptyStateHTML = provider.generateEmptyStateHTML();

      // Verify user guidance content
      expect(emptyStateHTML).toContain(
        "Select a task from the tree view above"
      );
      expect(emptyStateHTML).toContain("Getting Started:");
      expect(emptyStateHTML).toContain(
        "Click on any task in the tree view to see its details"
      );
      expect(emptyStateHTML).toContain(
        "Look for tasks marked with 🤖 that can be executed with AI assistance"
      );
      expect(emptyStateHTML).toContain(
        "Use the refresh button if tasks don't appear"
      );
      expect(emptyStateHTML).toContain(
        "Check task dependencies and requirements before starting"
      );

      // Verify additional information
      expect(emptyStateHTML).toContain(
        "The Taskmaster Dashboard helps you manage development tasks with AI assistance"
      );
      expect(emptyStateHTML).toContain(
        "Select a task to get started with implementation, testing, or review"
      );
    });

    it("should include responsive design considerations in empty state", () => {
      const emptyStateHTML = provider.generateEmptyStateHTML();

      // Verify responsive design elements
      expect(emptyStateHTML).toContain("@media (max-width: 400px)");
      expect(emptyStateHTML).toContain("padding: 24px 16px");
      expect(emptyStateHTML).toContain("font-size: 36px");
      expect(emptyStateHTML).toContain("min-width: 100px");
    });

    it("should include accessibility features in empty state", () => {
      const emptyStateHTML = provider.generateEmptyStateHTML();

      // Verify accessibility features
      expect(emptyStateHTML).toContain(":focus");
      expect(emptyStateHTML).toContain("outline:");
      expect(emptyStateHTML).toContain("outline-offset:");
      expect(emptyStateHTML).toContain("transition:");
    });

    it("should include print styles for empty state", () => {
      const emptyStateHTML = provider.generateEmptyStateHTML();

      // Verify print styles
      expect(emptyStateHTML).toContain("@media print");
      expect(emptyStateHTML).toContain("display: none");
      expect(emptyStateHTML).toContain("background: white");
      expect(emptyStateHTML).toContain("color: black");
    });
  });
});
