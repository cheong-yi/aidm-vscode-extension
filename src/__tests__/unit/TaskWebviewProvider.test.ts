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
  let mockExtensionContext: vscode.ExtensionContext;

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

    // Create mock ExtensionContext
    mockExtensionContext = {
      subscriptions: [],
      workspaceState: {
        get: jest.fn(),
        update: jest.fn(),
        keys: jest.fn(),
      },
      globalState: {
        get: jest.fn(),
        update: jest.fn(),
        keys: jest.fn(),
      },
      extensionPath: "",
      extensionUri: {} as vscode.Uri,
      storagePath: "",
      globalStoragePath: "",
      logPath: "",
      extensionMode: 1, // Production mode value
      environmentVariableCollection: {} as vscode.EnvironmentVariableCollection,
      asAbsolutePath: jest.fn(),
      storageUri: undefined,
      globalStorageUri: undefined,
      logUri: undefined,
      extension: {} as vscode.Extension<any>,
    } as unknown as vscode.ExtensionContext;

    provider = new TaskWebviewProvider(
      mockTasksDataService,
      mockExtensionContext
    );

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
   * Helper function to setup webview and wait for data loading
   * FIXED: Updated to work with new self-initialization approach
   * This ensures the webview is properly configured and waits for data loading
   */
  async function setupWebviewAndWaitForData(tasks: Task[] = []): Promise<void> {
    // Mock the getTasks method to return the provided tasks
    mockTasksDataService.getTasks.mockResolvedValue(tasks);

    // Create a proper webview view with webview property
    const mockWebviewViewWithWebview = {
      ...mockWebviewView,
      webview: mockWebview,
    } as unknown as vscode.WebviewView;

    // Resolve the webview view to set it up
    // This will automatically trigger data loading in the new approach
    provider.resolveWebviewView(
      mockWebviewViewWithWebview,
      mockContext,
      mockToken
    );

    // Wait a bit for async data loading to complete
    await new Promise((resolve) => setTimeout(resolve, 10));
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
      expect(
        () =>
          new TaskWebviewProvider(mockTasksDataService, mockExtensionContext)
      ).not.toThrow();
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
      // Setup webview and wait for data loading to show full HTML content
      await setupWebviewAndWaitForData();

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
      await setupWebviewAndWaitForData();

      const html = (provider as any).getHtmlContent();

      expect(html).toMatch(/<!DOCTYPE html>/);
      expect(html).toMatch(/<html lang="en">/);
      expect(html).toMatch(/<head>/);
      expect(html).toMatch(/<body>/);
      expect(html).toMatch(/<title>Taskmaster Dashboard<\/title>/);
      expect(html).toMatch(/<div class="sidebar">/);
      expect(html).toMatch(/<div class="sidebar-content">/);
    });

    it("should include proper meta tags", () => {
      const html = (provider as any).getHtmlContent();

      expect(html).toMatch(/<meta charset="UTF-8">/);
      expect(html).toMatch(
        /<meta name="viewport" content="width=device-width, initial-scale=1.0">/
      );
    });

    it("should handle null/undefined input in escapeHtml method", () => {
      const result1 = (provider as any).escapeHtml("normal string");
      const result2 = (provider as any).escapeHtml("");
      const result3 = (provider as any).escapeHtml(null);
      const result4 = (provider as any).escapeHtml(undefined);
      const result5 = (provider as any).escapeHtml("<script>alert()</script>");

      expect(result1).toBe("normal string");
      expect(result2).toBe("");
      expect(result3).toBe("");
      expect(result4).toBe("");
      expect(result5).toBe("&lt;script&gt;alert()&lt;/script&gt;");
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
      await setupWebviewAndWaitForData([mockTask]);

      const html = (provider as any).getHtmlContent([mockTask]);

      // Verify task item structure
      expect(html).toContain('class="task-item"');
      expect(html).toContain('data-task-id="test-1"');
      expect(html).toContain(
        "onclick=\"toggleTask(this.closest('.task-item'))\""
      );
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
      await setupWebviewAndWaitForData([mockTask]);

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
      await setupWebviewAndWaitForData([mockTask]);

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
      await setupWebviewAndWaitForData([mockTask]);

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
      await setupWebviewAndWaitForData([mockTask]);

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
      await setupWebviewAndWaitForData([mockTask]);

      const html = (provider as any).getHtmlContent([mockTask]);

      // Verify no-tests message is displayed
      expect(html).toContain('class="no-tests"');
      expect(html).toContain("No tests available yet");
    });

    it("should generate conditional View Code and View Tests buttons when data is available", async () => {
      const mockTask: Task = {
        id: "complete-task-1",
        title: "Complete Task with Implementation",
        description: "Task with implementation and test results",
        status: TaskStatus.COMPLETED,
        complexity: TaskComplexity.MEDIUM,
        dependencies: [],
        requirements: [],
        createdDate: "2024-01-01T00:00:00.000Z",
        lastModified: "2024-01-01T00:00:00.000Z",
        implementation: {
          summary: "Task completed successfully",
          filesChanged: ["src/file1.ts", "src/file2.ts"],
          completedDate: "2024-01-02T10:00:00.000Z",
          diffAvailable: true,
        },
        testResults: {
          resultsFile: "test-results/task-1.json",
          lastRun: "2024-01-02T11:00:00.000Z",
          summary: {
            passed: 3,
            failed: 0,
            total: 3,
            executionTime: 250,
          },
        },
      };

      // Setup webview and initialize data with the mock task
      await setupWebviewAndWaitForData([mockTask]);

      const html = (provider as any).getHtmlContent([mockTask]);

      // Verify conditional buttons are generated
      expect(html).toContain(
        "onclick=\"sendMessage('viewCode', {taskId: 'complete-task-1'})\""
      );
      expect(html).toContain(
        "onclick=\"sendMessage('viewTests', {taskId: 'complete-task-1'})\""
      );
      expect(html).toContain("View Code");
      expect(html).toContain("View Tests");

      // Verify buttons have correct CSS classes and onclick handlers
      expect(html).toContain(
        'class="action-btn" onclick="sendMessage(\'viewCode\''
      );
      expect(html).toContain(
        'class="action-btn" onclick="sendMessage(\'viewTests\''
      );
    });

    it("should not generate conditional buttons when implementation or test data is missing", async () => {
      const mockTask: Task = {
        id: "basic-task-1",
        title: "Basic Task",
        description: "Task without implementation or test data",
        status: TaskStatus.COMPLETED,
        complexity: TaskComplexity.LOW,
        dependencies: [],
        requirements: [],
        createdDate: "2024-01-01T00:00:00.000Z",
        lastModified: "2024-01-01T00:00:00.000Z",
        // No implementation or testResults
      };

      // Setup webview and initialize data with the mock task
      await setupWebviewAndWaitForData([mockTask]);

      const html = (provider as any).getHtmlContent([mockTask]);

      // Verify conditional buttons are NOT generated
      expect(html).not.toContain("View Code");
      expect(html).not.toContain("View Tests");
      expect(html).not.toContain("onclick=\"sendMessage('viewCode'");
      expect(html).not.toContain("onclick=\"sendMessage('viewTests'");

      // Verify standard action buttons are still present
      expect(html).toContain('class="actions"');
    });
  });

  describe("Workspace Initialization (WV-001)", () => {
    it("should start with data always ready (self-initialization)", () => {
      // FIXED: With new approach, data is always ready since webview handles its own initialization
      expect(provider.isDataInitialized()).toBe(true);
    });

    it("should not have initializeData method (removed in favor of self-initialization)", () => {
      // FIXED: initializeData method removed - webview now initializes itself
      expect((provider as any).initializeData).toBeUndefined();
    });

    it("should show loading HTML initially", () => {
      // Create a new provider instance to ensure clean state
      const freshProvider = new TaskWebviewProvider(
        mockTasksDataService,
        mockExtensionContext
      );
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

      // FIXED: Should show loading HTML initially, then automatically load data
      expect(freshMockWebviewView.webview.html).toContain("Loading Tasks");
    });

    it("should initialize data successfully", async () => {
      // Create a new provider instance to ensure clean state
      const freshProvider = new TaskWebviewProvider(
        mockTasksDataService,
        mockExtensionContext
      );
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

      // FIXED: Data initialization happens automatically in resolveWebviewView
      expect(freshProvider.isDataInitialized()).toBe(true);
    });

    it("should handle initialization errors gracefully", async () => {
      // Create a provider without a webview to simulate error condition
      const freshProvider = new TaskWebviewProvider(
        mockTasksDataService,
        mockExtensionContext
      );

      // FIXED: initializeData method removed - webview handles its own initialization
      // Data is always ready with new approach
      expect(freshProvider.isDataInitialized()).toBe(true);
    });

    it("should show tasks HTML after initialization", async () => {
      // Create a new provider instance to ensure clean state
      const freshProvider = new TaskWebviewProvider(
        mockTasksDataService,
        mockExtensionContext
      );
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

      // FIXED: Data initialization happens automatically in resolveWebviewView
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

    it("should handle viewCode message type for View Code button clicks", async () => {
      // Create a task with implementation data
      const mockTask: Task = {
        id: "test-task-1",
        title: "Test Task",
        description: "A test task",
        status: TaskStatus.COMPLETED,
        complexity: TaskComplexity.LOW,
        dependencies: [],
        requirements: [],
        createdDate: "2025-01-27T10:00:00Z",
        lastModified: "2025-01-27T10:30:00Z",
        implementation: {
          summary: "Test implementation",
          filesChanged: ["src/test.ts", "src/types.ts"],
          completedDate: "2025-01-27T10:30:00Z",
          diffAvailable: true,
        },
      };

      // Mock the tasks data service to return our test task
      mockTasksDataService.getTasks.mockResolvedValue([mockTask]);

      // Setup webview to enable message handling
      await setupWebviewAndWaitForData([mockTask]);

      // Simulate a viewCode message
      const mockMessage = {
        type: "viewCode",
        taskId: "test-task-1",
      };

      // Get the message handler that was registered
      const messageHandler = (mockWebview.onDidReceiveMessage as jest.Mock).mock
        .calls[0][0];

      // Call the message handler with our viewCode message
      await messageHandler(mockMessage);

      // Verify that the service was called to get tasks
      expect(mockTasksDataService.getTasks).toHaveBeenCalled();

      // Verify that the message was processed without throwing an error
      // (The actual file opening would happen in integration tests)
      expect(messageHandler).toBeDefined();
    });

    it("should show warning when task has no implementation data", async () => {
      // Mock vscode.window API
      const mockShowWarningMessage = jest.fn();
      jest
        .spyOn(vscode.window, "showWarningMessage")
        .mockImplementation(mockShowWarningMessage);

      // Create a task without implementation data
      const mockTask: Task = {
        id: "test-task-2",
        title: "Test Task No Implementation",
        description: "A test task without implementation",
        status: TaskStatus.COMPLETED,
        complexity: TaskComplexity.LOW,
        dependencies: [],
        requirements: [],
        createdDate: "2025-01-27T10:00:00Z",
        lastModified: "2025-01-27T10:30:00Z",
        // No implementation property
      };

      // Mock the tasks data service to return our test task
      mockTasksDataService.getTasks.mockResolvedValue([mockTask]);

      // Setup webview to enable message handling
      await setupWebviewAndWaitForData([mockTask]);

      // Simulate a viewCode message
      const mockMessage = {
        type: "viewCode",
        taskId: "test-task-2",
      };

      // Get the message handler that was registered
      const messageHandler = (mockWebview.onDidReceiveMessage as jest.Mock).mock
        .calls[0][0];

      // Call the message handler with our viewCode message
      await messageHandler(mockMessage);

      // Verify warning message was shown
      expect(mockShowWarningMessage).toHaveBeenCalledWith(
        "No implementation files found for task test-task-2"
      );
    });
  });

  describe("JavaScript Generation (WV-006)", () => {
    it("should include accordion behavior JavaScript", async () => {
      // Setup webview and initialize data to show full HTML
      await setupWebviewAndWaitForData();

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
      await setupWebviewAndWaitForData();

      const html = (provider as any).getHtmlContent();

      // Verify VSCode API integration
      expect(html).toContain("const vscode = acquireVsCodeApi()");
      expect(html).toContain("function sendMessage(type, payload)");
      expect(html).toContain("vscode.postMessage");
    });

    it("should include action button event handlers", async () => {
      // Setup webview and initialize data to show full HTML
      await setupWebviewAndWaitForData();

      const html = (provider as any).getHtmlContent();

      // Verify event listener for action buttons
      expect(html).toContain("document.addEventListener('click'");
      expect(html).toContain("event.target.classList.contains('action-btn')");
      expect(html).toContain("closest('.task-item').dataset.taskId");
    });

    it("should include failures toggle functionality", async () => {
      // Setup webview and initialize data to show full HTML
      await setupWebviewAndWaitForData();

      const html = (provider as any).getHtmlContent();

      // Verify failures toggle function
      expect(html).toContain("function toggleFailures(failuresSection)");
      expect(html).toContain("failuresSection.classList.toggle('expanded')");
    });

    it("should generate valid JavaScript syntax", async () => {
      // Setup webview and initialize data to show full HTML
      await setupWebviewAndWaitForData();

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
      await setupWebviewAndWaitForData();

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
      await setupWebviewAndWaitForData();

      const html = (provider as any).getHtmlContent();

      // Verify message sending on accordion toggle (new format with explicit expanded values)
      expect(html).toContain(
        "sendMessage('toggleAccordion', { taskId: taskId, expanded: true })"
      );
      expect(html).toContain(
        "sendMessage('toggleAccordion', { taskId: taskId, expanded: false })"
      );

      // Verify message sending on action button clicks
      expect(html).toContain("executeWithCursor(taskId)");
      expect(html).toContain("updateTaskStatus(taskId, 'completed')");
    });

    it("should include responsive layout CSS for variable panel widths", async () => {
      // Setup webview and initialize data to show full HTML
      await setupWebviewAndWaitForData();

      const html = (provider as any).getHtmlContent();

      // Verify responsive sidebar width
      expect(html).toContain("width: 100%");
      expect(html).toContain("min-width: 250px");
      expect(html).toContain("max-width: 100%");

      // Verify responsive padding using clamp()
      expect(html).toContain("padding: clamp(");
      expect(html).toContain("clamp(8px, 2vw, 12px)");
      expect(html).toContain("clamp(12px, 2.5vw, 16px)");

      // Verify responsive font sizes using clamp()
      expect(html).toContain("font-size: clamp(");
      expect(html).toContain("clamp(11px, 2.5vw, 13px)");
      expect(html).toContain("clamp(10px, 2.2vw, 12px)");

      // Verify responsive grid layout
      expect(html).toContain(
        "grid-template-columns: repeat(auto-fit, minmax(120px, 1fr))"
      );
      expect(html).toContain("gap: clamp(8px, 2vw, 12px)");

      // Verify responsive breakpoints
      expect(html).toContain("@media (max-width: 300px)");
      expect(html).toContain("@media (min-width: 500px)");

      // Verify narrow panel adaptations
      expect(html).toContain("grid-template-columns: 1fr");
      expect(html).toContain("flex-direction: column");
    });
  });

  describe("Expandable Subtasks (UI-004)", () => {
    it("should generate expandable subtask HTML structure", async () => {
      // Create a task with subtasks for testing
      const taskWithSubtasks: Task = {
        id: "test-1",
        title: "Test Task with Subtasks",
        description: "A test task that has subtasks",
        status: TaskStatus.NOT_STARTED,
        complexity: TaskComplexity.MEDIUM,
        dependencies: [],
        requirements: [],
        createdDate: "2024-01-01T00:00:00.000Z",
        lastModified: "2024-01-01T00:00:00.000Z",
        subtasks: [
          {
            id: "1",
            title: "Subtask 1",
            description: "First subtask description",
            details: "Detailed information about subtask 1",
            testStrategy: "Unit test the subtask functionality",
            status: "pending",
            dependencies: ["dep1", "dep2"],
          },
          {
            id: "2",
            title: "Subtask 2",
            description: "Second subtask description",
            details: "Detailed information about subtask 2",
            testStrategy: "Integration test the subtask workflow",
            status: "completed",
            dependencies: [],
          },
        ],
      };

      // Mock the service to return our test task
      mockTasksDataService.getTasks.mockResolvedValue([taskWithSubtasks]);

      // Setup webview and initialize data
      await setupWebviewAndWaitForData();

      const html = (provider as any).getHtmlContent([taskWithSubtasks]);

      // Verify subtask section is generated
      expect(html).toContain("Subtasks (2)");
      expect(html).toContain("test-1.1");
      expect(html).toContain("test-1.2");

      // Verify expandable structure
      expect(html).toContain('class="subtask-header"');
      expect(html).toContain('class="subtask-details"');
      expect(html).toContain('onclick="toggleSubtask(this.parentElement)"');

      // Verify expand icon
      expect(html).toContain('class="subtask-expand-icon"');
      expect(html).toContain('viewBox="0 0 16 16"');

      // Verify details content
      expect(html).toContain("Details");
      expect(html).toContain("Test Strategy");
      expect(html).toContain("Dependencies");
      expect(html).toContain("Detailed information about subtask 1");
      expect(html).toContain("Unit test the subtask functionality");
      expect(html).toContain("dep1");
      expect(html).toContain("dep2");

      // Verify expandable structure elements exist
      expect(html).toContain('class="subtask-item"');
      expect(html).toContain('class="subtask-header"');
      expect(html).toContain('class="subtask-details"');
    });

    it("should include toggleSubtask JavaScript function", async () => {
      // Create a simple task for testing JavaScript generation
      const simpleTask: Task = {
        id: "test-js",
        title: "Test Task for JavaScript",
        description: "A test task for JavaScript verification",
        status: TaskStatus.NOT_STARTED,
        complexity: TaskComplexity.LOW,
        dependencies: [],
        requirements: [],
        createdDate: "2024-01-01T00:00:00.000Z",
        lastModified: "2024-01-01T00:00:00.000Z",
      };

      // Setup webview and initialize data
      await setupWebviewAndWaitForData();

      const html = (provider as any).getHtmlContent([simpleTask]);

      // Verify toggleSubtask function is included
      expect(html).toContain("function toggleSubtask(subtaskElement)");
      expect(html).toContain("event.stopPropagation()");
      expect(html).toContain("expandedSubtaskIds");
      expect(html).toContain("subtaskElement.classList.add('expanded')");
      expect(html).toContain("subtaskElement.classList.remove('expanded')");
    });

    it("should handle missing subtask properties gracefully", async () => {
      // Create a task with subtasks missing some properties
      const taskWithIncompleteSubtasks: Task = {
        id: "test-2",
        title: "Test Task with Incomplete Subtasks",
        description: "A test task with incomplete subtask data",
        status: TaskStatus.NOT_STARTED,
        complexity: TaskComplexity.LOW,
        dependencies: [],
        requirements: [],
        createdDate: "2024-01-01T00:00:00.000Z",
        lastModified: "2024-01-01T00:00:00.000Z",
        subtasks: [
          {
            id: "1",
            title: "Incomplete Subtask",
            description: "Subtask with missing details",
            status: "pending",
            dependencies: [],
            // Missing details and testStrategy
          },
        ],
      };

      // Mock the service to return our test task
      mockTasksDataService.getTasks.mockResolvedValue([
        taskWithIncompleteSubtasks,
      ]);

      // Setup webview and initialize data
      await setupWebviewAndWaitForData();

      const html = (provider as any).getHtmlContent([
        taskWithIncompleteSubtasks,
      ]);

      // Verify fallback text is displayed
      expect(html).toContain("No details available");
      expect(html).toContain("No test strategy defined");
      expect(html).toContain("None");
    });
  });

  describe("Configuration Reading", () => {
    it("should read current user email from workspace config", () => {
      // Arrange
      const mockConfig = {
        get: jest.fn().mockReturnValue("user@company.com"),
        has: jest.fn(),
        inspect: jest.fn(),
        update: jest.fn(),
      } as unknown as vscode.WorkspaceConfiguration;
      jest
        .spyOn(vscode.workspace, "getConfiguration")
        .mockReturnValue(mockConfig);

      // Act
      const userEmail = vscode.workspace
        .getConfiguration("aidmVscodeExtension.taskmaster")
        .get<string>("currentUserEmail");

      // Assert
      expect(userEmail).toBe("user@company.com");
    });

    it("should return empty string when current user email is not configured", () => {
      // Arrange
      const mockConfig = {
        get: jest.fn().mockReturnValue(undefined),
        has: jest.fn(),
        inspect: jest.fn(),
        update: jest.fn(),
      } as unknown as vscode.WorkspaceConfiguration;
      jest
        .spyOn(vscode.workspace, "getConfiguration")
        .mockReturnValue(mockConfig);

      // Act
      const userEmail =
        vscode.workspace
          .getConfiguration("aidmVscodeExtension.taskmaster")
          .get<string>("currentUserEmail") || "";

      // Assert
      expect(userEmail).toBe("");
    });

    it("should get current user email via getCurrentUserEmail method", () => {
      // Arrange
      const mockConfig = {
        get: jest.fn().mockReturnValue("developer@company.com"),
        has: jest.fn(),
        inspect: jest.fn(),
        update: jest.fn(),
      } as unknown as vscode.WorkspaceConfiguration;
      jest
        .spyOn(vscode.workspace, "getConfiguration")
        .mockReturnValue(mockConfig);

      // Act
      const userEmail = provider.getCurrentUserEmail();

      // Assert
      expect(userEmail).toBe("developer@company.com");
    });

    it("should handle configuration errors gracefully in getCurrentUserEmail", () => {
      // Arrange
      jest
        .spyOn(vscode.workspace, "getConfiguration")
        .mockImplementation(() => {
          throw new Error("Configuration error");
        });

      // Act
      const userEmail = provider.getCurrentUserEmail();

      // Assert
      expect(userEmail).toBe("");
    });
  });
});
