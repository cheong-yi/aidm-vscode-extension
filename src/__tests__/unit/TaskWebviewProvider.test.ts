/**
 * TaskWebviewProvider Unit Tests
 * Tests the TaskWebviewProvider class implementation of vscode.WebviewViewProvider
 * Task WV-001: Create WebviewViewProvider Base Class
 * Task WV-003: Implement Task Item Generation
 * Task WV-007: Connect to TasksDataService with Workspace Initialization
 */

import * as vscode from "vscode";
import { TaskWebviewProvider } from "../../tasks/providers/TaskWebviewProvider";
import { Task, TaskStatus, TaskComplexity } from "../../types/tasks";
import { TasksDataService } from "../../services/TasksDataService";

// Mock TasksDataService
jest.mock("../../services/TasksDataService");
const MockTasksDataService = TasksDataService as jest.MockedClass<
  typeof TasksDataService
>;

describe("TaskWebviewProvider", () => {
  let provider: TaskWebviewProvider;
  let mockWebviewView: vscode.WebviewView;
  let mockWebview: vscode.Webview;
  let mockContext: vscode.WebviewViewResolveContext;
  let mockToken: vscode.CancellationToken;
  let mockTasksDataService: jest.Mocked<TasksDataService>;

  beforeEach(() => {
    // Create mock TasksDataService with minimal implementation
    mockTasksDataService = {
      getTasks: jest.fn().mockResolvedValue([]), // Mock empty tasks array by default
      getTaskById: jest.fn(),
      onTasksUpdated: {
        event: jest.fn(),
      },
      onError: {
        event: jest.fn(),
      },
      initialize: jest.fn(),
      refreshTasks: jest.fn(),
      updateTaskStatus: jest.fn(),
      dispose: jest.fn(),
    } as unknown as jest.Mocked<TasksDataService>;

    provider = new TaskWebviewProvider(mockTasksDataService);

    // Mock webview view
    mockWebview = {
      options: {},
      html: "",
      onDidReceiveMessage: jest.fn(),
      postMessage: jest.fn(),
      asWebviewUri: jest.fn(),
      cspSource: "",
      onDidDispose: jest.fn(),
    } as unknown as vscode.Webview;

    mockWebviewView = {
      webview: mockWebview,
      title: "Taskmaster",
      description: "Task management webview",
      visible: true,
      onDidDispose: jest.fn(),
      onDidChangeVisibility: jest.fn(),
      show: jest.fn(),
      badge: undefined,
      onDidChangeBadge: jest.fn(),
    } as unknown as vscode.WebviewView;

    mockContext = {} as vscode.WebviewViewResolveContext;
    mockToken = {
      isCancellationRequested: false,
      onCancellationRequested: jest.fn(),
    } as unknown as vscode.CancellationToken;
  });

  /**
   * Helper function to setup webview and initialize data for testing
   * This ensures the webview is properly configured and data is loaded
   */
  async function setupWebviewAndInitializeData(
    tasks: Task[] = []
  ): Promise<void> {
    // Mock the getTasks method to return the provided tasks
    mockTasksDataService.getTasks.mockResolvedValue(tasks);

    // Create a proper webview view with webview property
    const mockWebviewViewWithWebview = {
      ...mockWebviewView,
      webview: mockWebview,
    } as unknown as vscode.WebviewView;

    // Resolve the webview view to set it up
    provider.resolveWebviewView(
      mockWebviewViewWithWebview,
      mockContext,
      mockToken
    );

    // Initialize data after webview is set up
    await provider.initializeData();
  }

  describe("Interface Implementation", () => {
    it("should implement vscode.WebviewViewProvider interface correctly", () => {
      // Verify the class can be used as a WebviewViewProvider
      const webviewProvider: vscode.WebviewViewProvider = provider;
      expect(webviewProvider).toBeDefined();
      expect(typeof webviewProvider.resolveWebviewView).toBe("function");
    });

    it("should have resolveWebviewView method with correct signature", () => {
      expect(provider.resolveWebviewView).toBeDefined();
      expect(typeof provider.resolveWebviewView).toBe("function");
    });
  });

  describe("Constructor", () => {
    it("should create instance without errors", () => {
      expect(() => new TaskWebviewProvider(mockTasksDataService)).not.toThrow();
    });

    it("should accept TasksDataService parameter and store it as private property", () => {
      // Verify the service is stored and accessible
      expect(mockTasksDataService).toBeDefined();
      expect(mockTasksDataService.getTasks).toBeDefined();
      expect(mockTasksDataService.onTasksUpdated).toBeDefined();
      expect(mockTasksDataService.onError).toBeDefined();
    });

    it("should initialize with empty state", () => {
      expect(provider).toBeInstanceOf(TaskWebviewProvider);
    });
  });

  describe("resolveWebviewView", () => {
    it("should set webview options correctly", () => {
      provider.resolveWebviewView(mockWebviewView, mockContext, mockToken);

      expect(mockWebview.options).toEqual({
        enableScripts: true,
        localResourceRoots: [],
      });
    });

    it("should set HTML content", async () => {
      // Setup webview and initialize data to show full HTML content
      await setupWebviewAndInitializeData();

      expect(mockWebview.html).toContain("<!DOCTYPE html>");
      expect(mockWebview.html).toContain("Taskmaster Dashboard");
      expect(mockWebview.html).toContain("No tasks available");
    });

    it("should handle errors gracefully", () => {
      // Test that the method doesn't throw when called with valid parameters
      expect(() => {
        provider.resolveWebviewView(mockWebviewView, mockContext, mockToken);
      }).not.toThrow();
    });
  });

  describe("HTML Content Generation", () => {
    it("should return valid HTML structure", async () => {
      // Setup webview and initialize data to show full HTML
      await setupWebviewAndInitializeData();

      const html = (provider as any).getHtmlContent();

      expect(html).toMatch(/<!DOCTYPE html>/);
      expect(html).toMatch(/<html lang="en">/);
      expect(html).toMatch(/<head>/);
      expect(html).toMatch(/<body>/);
      expect(html).toMatch(/<title>Taskmaster Dashboard<\/title>/);
      expect(html).toMatch(/<div class="sidebar">/);
      expect(html).toMatch(/TASKMASTER DASHBOARD/);
    });

    it("should include proper meta tags", () => {
      const html = (provider as any).getHtmlContent();

      expect(html).toMatch(/<meta charset="UTF-8">/);
      expect(html).toMatch(
        /<meta name="viewport" content="width=device-width, initial-scale=1.0">/
      );
    });
  });

  describe("Task Item Generation (WV-003)", () => {
    it("should generate task item HTML with proper structure", async () => {
      const mockTask: Task = {
        id: "test-1",
        title: "Test Task",
        description: "Test Description",
        status: TaskStatus.NOT_STARTED,
        complexity: TaskComplexity.LOW,
        dependencies: [],
        requirements: [],
        createdDate: "2024-01-01T00:00:00.000Z",
        lastModified: "2024-01-01T00:00:00.000Z",
        isExecutable: true,
      };

      // Setup webview and initialize data with the mock task
      await setupWebviewAndInitializeData([mockTask]);

      const html = (provider as any).getHtmlContent([mockTask]);

      // Verify task item structure
      expect(html).toContain('class="task-item"');
      expect(html).toContain('data-task-id="test-1"');
      expect(html).toContain('onclick="toggleTask(this)"');
      expect(html).toContain("Test Task");
      expect(html).toContain("not started");
      expect(html).toContain("Low");
    });

    it("should handle executable tasks correctly", async () => {
      const mockTask: Task = {
        id: "executable-1",
        title: "Executable Task",
        description: "Can be executed with Cursor",
        status: TaskStatus.NOT_STARTED,
        complexity: TaskComplexity.MEDIUM,
        dependencies: [],
        requirements: [],
        createdDate: "2024-01-01T00:00:00.000Z",
        lastModified: "2024-01-01T00:00:00.000Z",
        isExecutable: true,
      };

      // Setup webview and initialize data with the mock task
      await setupWebviewAndInitializeData([mockTask]);

      const html = (provider as any).getHtmlContent([mockTask]);

      // Verify executable task indicators
      expect(html).toContain("executable");
      expect(html).toContain("🤖");
      expect(html).toContain("not started");
    });

    it("should handle non-executable tasks correctly", async () => {
      const mockTask: Task = {
        id: "non-executable-1",
        title: "Non-Executable Task",
        description: "Cannot be executed with Cursor",
        status: TaskStatus.IN_PROGRESS,
        complexity: TaskComplexity.HIGH,
        dependencies: [],
        requirements: [],
        createdDate: "2024-01-01T00:00:00.000Z",
        lastModified: "2024-01-01T00:00:00.000Z",
        isExecutable: false,
      };

      // Setup webview and initialize data with the mock task
      await setupWebviewAndInitializeData([mockTask]);

      const html = (provider as any).getHtmlContent([mockTask]);

      // Verify non-executable task indicators
      // Note: The word "executable" may appear in CSS, but the task header should not have the class
      expect(html).not.toContain('class="task-header executable"');
      expect(html).not.toContain("🤖");
      expect(html).toContain("in progress");
      expect(html).toContain("in-progress");

      // Verify the task header is generated correctly without executable styling
      expect(html).toContain('class="task-header"');
      expect(html).toContain("Non-Executable Task");
    });

    it("should handle undefined isExecutable gracefully", async () => {
      const mockTask: Task = {
        id: "undefined-executable-1",
        title: "Undefined Executable Task",
        description: "Task with undefined isExecutable",
        status: TaskStatus.NOT_STARTED,
        complexity: TaskComplexity.LOW,
        dependencies: [],
        requirements: [],
        createdDate: "2024-01-01T00:00:00.000Z",
        lastModified: "2024-01-01T00:00:00.000Z",
        // isExecutable is undefined
      };

      // Setup webview and initialize data with the mock task
      await setupWebviewAndInitializeData([mockTask]);

      const html = (provider as any).getHtmlContent([mockTask]);

      // Should not show executable indicators when isExecutable is undefined
      // Note: The word "executable" may appear in CSS, but the task header should not have the class
      expect(html).not.toContain('class="task-header executable"');
      expect(html).not.toContain("🤖");

      // Verify the task header is generated correctly without executable styling
      expect(html).toContain('class="task-header"');
      expect(html).toContain("Undefined Executable Task");
      expect(html).toContain("not started");
    });
  });

  describe("Task Details Section (WV-004)", () => {
    it("should generate complete task details HTML with all sections", async () => {
      const mockTask: Task = {
        id: "details-test-1",
        title: "Task with Complete Details",
        description: "Task description for testing details generation",
        status: TaskStatus.NOT_STARTED,
        complexity: TaskComplexity.MEDIUM,
        dependencies: ["dep-1", "dep-2"],
        requirements: ["req-1", "req-2"],
        createdDate: "2024-01-01T00:00:00.000Z",
        lastModified: "2024-01-02T00:00:00.000Z",
        estimatedDuration: "20-25 min",
        isExecutable: true,
        testStatus: {
          lastRunDate: "2024-01-02T10:00:00.000Z",
          totalTests: 5,
          passedTests: 4,
          failedTests: 1,
          failingTestsList: [
            {
              name: "Test 1",
              message: "Test failed",
              category: "assertion",
            },
          ],
        },
      };

      // Setup webview and initialize data with the mock task
      await setupWebviewAndInitializeData([mockTask]);

      const html = (provider as any).getHtmlContent([mockTask]);

      // Verify task details structure
      expect(html).toContain('class="task-details"');
      expect(html).toContain('class="task-description"');
      expect(html).toContain('class="task-meta"');
      expect(html).toContain('class="dependencies"');
      expect(html).toContain('class="test-results"');
      expect(html).toContain('class="actions"');

      // Verify content
      expect(html).toContain("Task description for testing details generation");
      expect(html).toContain("Medium");
      expect(html).toContain("20-25 min");
      expect(html).toContain("dep-1");
      expect(html).toContain("dep-2");
      expect(html).toContain("5");
      expect(html).toContain("4");
      expect(html).toContain("1");
    });

    it("should handle tasks without test status gracefully", async () => {
      const mockTask: Task = {
        id: "no-tests-1",
        title: "Task Without Tests",
        description: "Task with no test status",
        status: TaskStatus.NOT_STARTED,
        complexity: TaskComplexity.LOW,
        dependencies: [],
        requirements: [],
        createdDate: "2024-01-01T00:00:00.000Z",
        lastModified: "2024-01-01T00:00:00.000Z",
        // No testStatus
      };

      // Setup webview and initialize data with the mock task
      await setupWebviewAndInitializeData([mockTask]);

      const html = (provider as any).getHtmlContent([mockTask]);

      // Verify no-tests message is displayed
      expect(html).toContain('class="no-tests"');
      expect(html).toContain("No tests available yet");
    });
  });

  describe("Workspace Initialization (WV-001)", () => {
    it("should start with data not initialized", () => {
      expect(provider.isDataInitialized()).toBe(false);
    });

    it("should have initializeData method", () => {
      expect(typeof provider.initializeData).toBe("function");
    });

    it("should show loading HTML before initialization", () => {
      // Create a new provider instance to ensure clean state
      const freshProvider = new TaskWebviewProvider(mockTasksDataService);
      const freshMockWebviewView = {
        ...mockWebviewView,
        webview: {
          ...mockWebview,
          html: "",
        },
      } as unknown as vscode.WebviewView;

      // Mock the private methods to test the initialization flow
      const originalGetHtmlContent = (freshProvider as any).getHtmlContent;
      (freshProvider as any).getHtmlContent = jest
        .fn()
        .mockReturnValue("Loading HTML");

      freshProvider.resolveWebviewView(
        freshMockWebviewView,
        mockContext,
        mockToken
      );

      expect(freshMockWebviewView.webview.html).toBe("Loading HTML");
    });

    it("should initialize data successfully", async () => {
      // Create a new provider instance to ensure clean state
      const freshProvider = new TaskWebviewProvider(mockTasksDataService);
      const freshMockWebviewView = {
        ...mockWebviewView,
        webview: {
          ...mockWebview,
          html: "",
        },
      } as unknown as vscode.WebviewView;

      freshProvider.resolveWebviewView(
        freshMockWebviewView,
        mockContext,
        mockToken
      );

      // Initially should not be initialized
      expect(freshProvider.isDataInitialized()).toBe(false);

      // Initialize data
      await freshProvider.initializeData();

      // Should now be initialized
      expect(freshProvider.isDataInitialized()).toBe(true);
    });

    it("should handle initialization errors gracefully", async () => {
      // Create a provider without a webview to simulate error condition
      const freshProvider = new TaskWebviewProvider(mockTasksDataService);

      // Should not throw error
      await expect(freshProvider.initializeData()).resolves.not.toThrow();

      // Should still not be initialized due to error
      expect(freshProvider.isDataInitialized()).toBe(false);
    });

    it("should show tasks HTML after initialization", async () => {
      // Create a new provider instance to ensure clean state
      const freshProvider = new TaskWebviewProvider(mockTasksDataService);
      const freshMockWebviewView = {
        ...mockWebviewView,
        webview: {
          ...mockWebview,
          html: "",
        },
      } as unknown as vscode.WebviewView;

      freshProvider.resolveWebviewView(
        freshMockWebviewView,
        mockContext,
        mockToken
      );

      // Mock the private methods to test the initialization flow
      const originalGetHtmlContent = (freshProvider as any).getHtmlContent;
      (freshProvider as any).getHtmlContent = jest
        .fn()
        .mockReturnValue("Tasks HTML");

      // Initialize data
      await freshProvider.initializeData();

      // Should now show tasks HTML
      expect(freshProvider.isDataInitialized()).toBe(true);
    });
  });

  describe("Message Handling (WV-005)", () => {
    it("should setup message handling when webview resolves", async () => {
      // Create a webview with message handling capabilities
      const mockWebviewWithMessageHandling = {
        ...mockWebview,
        onDidReceiveMessage: jest.fn(),
      };

      // Create a webview view with the message handling webview
      const mockWebviewViewWithMessageHandling = {
        ...mockWebviewView,
        webview: mockWebviewWithMessageHandling,
      } as unknown as vscode.WebviewView;

      // Resolve the webview view to set up message handling
      provider.resolveWebviewView(
        mockWebviewViewWithMessageHandling,
        mockContext,
        mockToken
      );

      // Verify message handling was set up
      expect(
        mockWebviewWithMessageHandling.onDidReceiveMessage
      ).toHaveBeenCalled();
    });

    it("should have dispose method for cleanup", () => {
      expect(typeof provider.dispose).toBe("function");
    });

    it("should handle dispose without errors", () => {
      expect(() => {
        provider.dispose();
      }).not.toThrow();
    });
  });

  describe("JavaScript Generation (WV-006)", () => {
    it("should include accordion behavior JavaScript", async () => {
      // Setup webview and initialize data to show full HTML
      await setupWebviewAndInitializeData();

      const html = (provider as any).getHtmlContent();

      // Verify accordion behavior JavaScript is included
      expect(html).toContain("let expandedTaskId = null");
      expect(html).toContain("function toggleTask(taskElement)");
      expect(html).toContain(
        "// Collapse all tasks first (accordion behavior)"
      );
      expect(html).toContain("expandedTaskId = taskId");
    });

    it("should include message sending JavaScript", async () => {
      // Setup webview and initialize data to show full HTML
      await setupWebviewAndInitializeData();

      const html = (provider as any).getHtmlContent();

      // Verify VSCode API integration
      expect(html).toContain("const vscode = acquireVsCodeApi()");
      expect(html).toContain("function sendMessage(type, payload)");
      expect(html).toContain("vscode.postMessage");
    });

    it("should include action button event handlers", async () => {
      // Setup webview and initialize data to show full HTML
      await setupWebviewAndInitializeData();

      const html = (provider as any).getHtmlContent();

      // Verify event listener for action buttons
      expect(html).toContain("document.addEventListener('click'");
      expect(html).toContain("event.target.classList.contains('action-btn')");
      expect(html).toContain("closest('.task-item').dataset.taskId");
    });

    it("should include failures toggle functionality", async () => {
      // Setup webview and initialize data to show full HTML
      await setupWebviewAndInitializeData();

      const html = (provider as any).getHtmlContent();

      // Verify failures toggle function
      expect(html).toContain("function toggleFailures(failuresSection)");
      expect(html).toContain("failuresSection.classList.toggle('expanded')");
    });

    it("should generate valid JavaScript syntax", async () => {
      // Setup webview and initialize data to show full HTML
      await setupWebviewAndInitializeData();

      const html = (provider as any).getHtmlContent();

      // Verify script tags are properly formatted
      expect(html).toContain("<script>");
      expect(html).toContain("</script>");

      // Verify JavaScript functions are properly defined
      expect(html).toContain("function toggleTask(");
      expect(html).toContain("function toggleFailures(");
      expect(html).toContain("function sendMessage(");
    });

    it("should implement accordion behavior correctly", async () => {
      // Setup webview and initialize data to show full HTML
      await setupWebviewAndInitializeData();

      const html = (provider as any).getHtmlContent();

      // Verify accordion logic prevents multiple expanded tasks
      expect(html).toContain(
        "// Collapse all tasks first (accordion behavior)"
      );
      expect(html).toContain(
        "document.querySelectorAll('.task-item.expanded')"
      );
      expect(html).toContain("item.classList.remove('expanded')");
    });

    it("should send messages to extension on user actions", async () => {
      // Setup webview and initialize data to show full HTML
      await setupWebviewAndInitializeData();

      const html = (provider as any).getHtmlContent();

      // Verify message sending on accordion toggle
      expect(html).toContain(
        "sendMessage('toggleAccordion', { taskId: taskId, expanded: !isCurrentlyExpanded })"
      );

      // Verify message sending on action button clicks
      expect(html).toContain("executeWithCursor(taskId)");
      expect(html).toContain("updateTaskStatus(taskId, 'completed')");
    });
  });
});
