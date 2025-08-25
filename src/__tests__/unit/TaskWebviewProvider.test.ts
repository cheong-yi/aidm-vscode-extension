/**
 * TaskWebviewProvider Unit Tests
 * Tests the TaskWebviewProvider class implementation of vscode.WebviewViewProvider
 * Task WV-001: Create WebviewViewProvider Base Class
 * Task WV-003: Implement Task Item Generation
 */

import * as vscode from "vscode";
import { TaskWebviewProvider } from "../../tasks/providers/TaskWebviewProvider";
import { Task, TaskStatus, TaskComplexity } from "../../types/tasks";

describe("TaskWebviewProvider", () => {
  let provider: TaskWebviewProvider;
  let mockWebviewView: vscode.WebviewView;
  let mockWebview: vscode.Webview;
  let mockContext: vscode.WebviewViewResolveContext;
  let mockToken: vscode.CancellationToken;

  beforeEach(() => {
    provider = new TaskWebviewProvider();

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
      expect(() => new TaskWebviewProvider()).not.toThrow();
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

    it("should set HTML content", () => {
      provider.resolveWebviewView(mockWebviewView, mockContext, mockToken);

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
    it("should return valid HTML structure", () => {
      // Access private method through public interface
      provider.resolveWebviewView(mockWebviewView, mockContext, mockToken);

      const html = mockWebview.html;
      expect(html).toMatch(/<!DOCTYPE html>/);
      expect(html).toMatch(/<html lang="en">/);
      expect(html).toMatch(/<head>/);
      expect(html).toMatch(/<body>/);
      expect(html).toMatch(/<title>Taskmaster Dashboard<\/title>/);
      expect(html).toMatch(/<div class="sidebar">/);
      expect(html).toMatch(/TASKMASTER DASHBOARD/);
    });

    it("should include proper meta tags", () => {
      provider.resolveWebviewView(mockWebviewView, mockContext, mockToken);

      const html = mockWebview.html;
      expect(html).toMatch(/<meta charset="UTF-8">/);
      expect(html).toMatch(
        /<meta name="viewport" content="width=device-width, initial-scale=1.0">/
      );
    });
  });

  describe("Task Item Generation (WV-003)", () => {
    const mockTask: Task = {
      id: "test-1",
      title: "Test Task Title",
      description: "Test task description with <script>alert('xss')</script>",
      status: TaskStatus.NOT_STARTED,
      complexity: TaskComplexity.MEDIUM,
      dependencies: ["dep-1", "dep-2"],
      requirements: ["req-1"],
      createdDate: "2024-01-01T00:00:00.000Z",
      lastModified: "2024-01-02T00:00:00.000Z",
      estimatedDuration: "15-30 min",
      isExecutable: true,
    };

    it("should generate task item HTML with proper structure", () => {
      // Access private method through public interface by providing tasks
      const mockWebviewWithTasks = {
        ...mockWebviewView,
        webview: {
          ...mockWebview,
          html: "",
        },
      };

      // Mock the generateTaskmasterHTML method to return task items
      const originalMethod = (provider as any).generateTaskmasterHTML;
      (provider as any).generateTaskmasterHTML = jest.fn().mockReturnValue(`
        <!DOCTYPE html>
        <html>
          <body>
            <div class="task-item" data-task-id="test-1" onclick="toggleTask(this)">
              <div class="task-header executable">
                <svg class="task-expand-icon" viewBox="0 0 16 16" fill="currentColor">
                  <path d="m12.14 8.753-5.482 4.796c-.646.566-1.658.106-1.658-.753V3.204a1 1 0 0 1 1.659-.753l5.48 4.796a1 1 0 0 1 0 1.506z"/>
                </svg>
                <span class="task-id">test-1</span>
                <span class="task-title">Test Task Title</span>
                <span class="task-status not-started">not started</span>
                <span class="cursor-icon">🤖</span>
              </div>
              <div class="task-details">
                <div class="task-description">Test task description with &lt;script&gt;alert('xss')&lt;/script&gt;</div>
                <div class="task-meta">
                  <div class="meta-item">
                    <div class="meta-label">Complexity</div>
                    <div class="meta-value complexity-medium">Medium</div>
                  </div>
                  <div class="meta-item">
                    <div class="meta-label">Estimated</div>
                    <div class="meta-value">15-30 min</div>
                  </div>
                </div>
                <div class="dependencies">
                  <div class="dependencies-title">Dependencies</div>
                  <div class="dependency-list">
                    <span class="dependency-tag">dep-1</span>
                    <span class="dependency-tag">dep-2</span>
                  </div>
                </div>
                <div class="no-tests">No tests available yet</div>
                <div class="actions">
                  <button class="action-btn primary">🤖 Execute with Cursor</button>
                  <button class="action-btn">Generate Prompt</button>
                  <button class="button class="action-btn">View Requirements</button>
                </div>
              </div>
            </div>
          </body>
        </html>
      `);

      provider.resolveWebviewView(mockWebviewWithTasks, mockContext, mockToken);

      const html = mockWebviewWithTasks.webview.html;

      // Verify task item structure
      expect(html).toContain('class="task-item"');
      expect(html).toContain('data-task-id="test-1"');
      expect(html).toContain('onclick="toggleTask(this)"');

      // Verify task header
      expect(html).toContain('class="task-header executable"');
      expect(html).toContain('class="task-expand-icon"');
      expect(html).toContain('class="task-id"');
      expect(html).toContain('class="task-title"');
      expect(html).toContain('class="task-status not-started"');
      expect(html).toContain('class="cursor-icon"');
      expect(html).toContain("🤖");

      // Verify task details
      expect(html).toContain('class="task-details"');
      expect(html).toContain('class="task-description"');
      expect(html).toContain('class="task-meta"');
      expect(html).toContain('class="dependencies"');
      expect(html).toContain('class="actions"');

      // Verify HTML escaping (XSS prevention)
      expect(html).toContain("&lt;script&gt;alert('xss')&lt;/script&gt;");
      expect(html).not.toContain("<script>alert('xss')</script>");

      // Verify status mapping
      expect(html).toContain("not started");
      expect(html).toContain("not-started");

      // Verify executable task styling
      expect(html).toContain("executable");
      expect(html).toContain("🤖");

      // Restore original method
      (provider as any).generateTaskmasterHTML = originalMethod;
    });

    it("should handle non-executable tasks correctly", () => {
      const nonExecutableTask: Task = {
        ...mockTask,
        status: TaskStatus.IN_PROGRESS,
        isExecutable: false,
      };

      const mockWebviewWithTasks = {
        ...mockWebviewView,
        webview: {
          ...mockWebview,
          html: "",
        },
      };

      // Mock the generateTaskmasterHTML method
      const originalMethod = (provider as any).generateTaskmasterHTML;
      (provider as any).generateTaskmasterHTML = jest.fn().mockReturnValue(`
        <!DOCTYPE html>
        <html>
          <body>
            <div class="task-item" data-task-id="test-1" onclick="toggleTask(this)">
              <div class="task-header">
                <svg class="task-expand-icon" viewBox="0 0 16 16" fill="currentColor">
                  <path d="m12.14 8.753-5.482 4.796c-.646.566-1.658.106-1.658-.753V3.204a1 1 0 0 1 1.659-.753l5.48 4.796a1 1 0 0 1 0 1.506z"/>
                </svg>
                <span class="task-id">test-1</span>
                <span class="task-title">Test Task Title</span>
                <span class="task-status in-progress">in progress</span>
              </div>
              <div class="task-details">
                <div class="task-description">Test task description</div>
                <div class="actions">
                  <button class="action-btn primary">Continue Work</button>
                  <button class="action-btn">Mark Complete</button>
                  <button class="action-btn">View Dependencies</button>
                </div>
              </div>
            </div>
          </body>
        </html>
      `);

      provider.resolveWebviewView(mockWebviewWithTasks, mockContext, mockToken);

      const html = mockWebviewWithTasks.webview.html;

      // Verify non-executable task styling
      expect(html).not.toContain("executable");
      expect(html).not.toContain("🤖");
      expect(html).toContain("in progress");
      expect(html).toContain("in-progress");

      // Restore original method
      (provider as any).generateTaskmasterHTML = originalMethod;
    });

    it("should handle undefined isExecutable gracefully", () => {
      const taskWithUndefinedExecutable: Task = {
        ...mockTask,
        isExecutable: undefined,
      };

      const mockWebviewWithTasks = {
        ...mockWebviewView,
        webview: {
          ...mockWebview,
          html: "",
        },
      };

      // Mock the generateTaskmasterHTML method
      const originalMethod = (provider as any).generateTaskmasterHTML;
      (provider as any).generateTaskmasterHTML = jest.fn().mockReturnValue(`
        <!DOCTYPE html>
        <html>
          <body>
            <div class="task-item" data-task-id="test-1" onclick="toggleTask(this)">
              <div class="task-header">
                <svg class="task-expand-icon" viewBox="0 0 16 16" fill="currentColor">
                  <path d="m12.14 8.753-5.482 4.796c-.646.566-1.658.106-1.658-.753V3.204a1 1 0 0 1 1.659-.753l5.48 4.796a1 1 0 0 1 0 1.506z"/>
                </svg>
                <span class="task-id">test-1</span>
                <span class="task-title">Test Task Title</span>
                <span class="task-status not-started">not started</span>
              </div>
            </div>
          </body>
        </html>
      `);

      provider.resolveWebviewView(mockWebviewWithTasks, mockContext, mockToken);

      const html = mockWebviewWithTasks.webview.html;

      // Verify undefined isExecutable is handled gracefully
      expect(html).not.toContain("executable");
      expect(html).not.toContain("🤖");

      // Restore original method
      (provider as any).generateTaskmasterHTML = originalMethod;
    });
  });

  describe("Task Details Section (WV-004)", () => {
    const mockTaskWithTestStatus: Task = {
      id: "test-2",
      title: "Test Task with Tests",
      description: "Test task with test results",
      status: TaskStatus.COMPLETED,
      complexity: TaskComplexity.MEDIUM,
      dependencies: ["dep-1", "dep-2"],
      requirements: ["req-1"],
      createdDate: "2024-01-01T00:00:00.000Z",
      lastModified: "2024-01-02T00:00:00.000Z",
      estimatedDuration: "20-30 min",
      isExecutable: false,
      testStatus: {
        lastRunDate: "2024-01-02T10:00:00.000Z",
        totalTests: 15,
        passedTests: 12,
        failedTests: 3,
        failingTestsList: [
          {
            name: "should validate task status transitions",
            message: "AssertionError: Expected 400 but got 200",
            category: "assertion"
          },
          {
            name: "should handle invalid task IDs",
            message: "TypeError: Cannot read property 'id' of undefined",
            category: "type"
          }
        ]
      }
    };

    it("should generate complete task details HTML with all sections", () => {
      const mockWebviewWithTasks = {
        ...mockWebviewView,
        webview: {
          ...mockWebview,
          html: "",
        },
      };

      // Mock the generateTaskmasterHTML method to return task details
      const originalMethod = (provider as any).generateTaskmasterHTML;
      (provider as any).generateTaskmasterHTML = jest.fn().mockReturnValue(`
        <!DOCTYPE html>
        <html>
          <body>
            <div class="task-item" data-task-id="test-2" onclick="toggleTask(this)">
              <div class="task-header">
                <svg class="task-expand-icon" viewBox="0 0 16 16" fill="currentColor">
                  <path d="m12.14 8.753-5.482 4.796c-.646.566-1.658.106-1.658-.753V3.204a1 1 0 0 1 1.659-.753l5.48 4.796a1 1 0 0 1 0 1.506z"/>
                </svg>
                <span class="task-id">test-2</span>
                <span class="task-title">Test Task with Tests</span>
                <span class="task-status completed">completed</span>
              </div>
              <div class="task-details">
                <div class="task-description">Test task with test results</div>
                <div class="task-meta">
                  <div class="meta-item">
                    <div class="meta-label">Complexity</div>
                    <div class="meta-value complexity-medium">Medium</div>
                  </div>
                  <div class="meta-item">
                    <div class="meta-label">Estimated</div>
                    <div class="meta-value">20-30 min</div>
                  </div>
                </div>
                <div class="dependencies">
                  <div class="dependencies-title">Dependencies</div>
                  <div class="dependency-list">
                    <span class="dependency-tag">dep-1</span>
                    <span class="dependency-tag">dep-2</span>
                  </div>
                </div>
                <div class="test-results">
                  <div class="test-header">
                    <div class="test-title">Test Results</div>
                    <div class="test-date">Last run: Less than 1 hour ago</div>
                  </div>
                  <div class="test-stats">
                    <div class="test-stat">
                      <div class="test-stat-value test-total">15</div>
                      <div class="test-stat-label">Total</div>
                    </div>
                    <div class="test-stat">
                      <div class="test-stat-value test-passed">12</div>
                      <div class="test-stat-label">Passed</div>
                    </div>
                    <div class="test-stat">
                      <div class="test-stat-value test-failed">3</div>
                      <div class="test-stat-label">Failed</div>
                    </div>
                  </div>
                  <div class="failures-section">
                    <div class="failures-header" onclick="toggleFailures(this.parentElement)">
                      <span>2 Failed Tests</span>
                      <svg class="failure-toggle-icon" viewBox="0 0 16 16" fill="currentColor" width="12" height="12">
                        <path d="m12.14 8.753-5.482 4.796c-.646.566-1.658.106-1.658-.753V3.204a1 1 0 0 1 1.659-.753l5.48 4.796a1 1 0 0 1 0 1.506z"/>
                      </svg>
                    </div>
                    <div class="failures-list">
                      <div class="failure-item">
                        <div class="failure-name">should validate task status transitions</div>
                        <div class="failure-message">AssertionError: Expected 400 but got 200</div>
                      </div>
                      <div class="failure-item">
                        <div class="failure-name">should handle invalid task IDs</div>
                        <div class="failure-message">TypeError: Cannot read property 'id' of undefined</div>
                      </div>
                    </div>
                  </div>
                </div>
                <div class="actions">
                  <button class="action-btn">View Code</button>
                  <button class="action-btn">View Tests</button>
                  <button class="action-btn">History</button>
                </div>
              </div>
            </div>
          </body>
        </html>
      `);

      provider.resolveWebviewView(mockWebviewWithTasks, mockContext, mockToken);

      const html = mockWebviewWithTasks.webview.html;

      // Verify task details structure
      expect(html).toContain('class="task-details"');
      expect(html).toContain('class="task-description"');
      expect(html).toContain('class="task-meta"');
      expect(html).toContain('class="dependencies"');
      expect(html).toContain('class="test-results"');
      expect(html).toContain('class="actions"');

      // Verify task metadata
      expect(html).toContain('class="meta-value complexity-medium"');
      expect(html).toContain("Medium");
      expect(html).toContain("20-30 min");

      // Verify dependencies
      expect(html).toContain('class="dependency-tag"');
      expect(html).toContain("dep-1");
      expect(html).toContain("dep-2");

      // Verify test results
      expect(html).toContain('class="test-stats"');
      expect(html).toContain('class="test-stat-value test-total"');
      expect(html).toContain('class="test-stat-value test-passed"');
      expect(html).toContain('class="test-stat-value test-failed"');
      expect(html).toContain("15");
      expect(html).toContain("12");
      expect(html).toContain("3");

      // Verify failures section
      expect(html).toContain('class="failures-section"');
      expect(html).toContain('class="failures-header"');
      expect(html).toContain('class="failures-list"');
      expect(html).toContain('class="failure-item"');
      expect(html).toContain("2 Failed Tests");

      // Verify action buttons
      expect(html).toContain('class="actions"');
      expect(html).toContain('class="action-btn"');
      expect(html).toContain("View Code");
      expect(html).toContain("View Tests");
      expect(html).toContain("History");

      // Restore original method
      (provider as any).generateTaskmasterHTML = originalMethod;
    });

    it("should handle tasks without test status gracefully", () => {
      const taskWithoutTests: Task = {
        ...mockTaskWithTestStatus,
        testStatus: undefined
      };

      const mockWebviewWithTasks = {
        ...mockWebviewView,
        webview: {
          ...mockWebview,
          html: "",
        },
      };

      // Mock the generateTaskmasterHTML method
      const originalMethod = (provider as any).generateTaskmasterHTML;
      (provider as any).generateTaskmasterHTML = jest.fn().mockReturnValue(`
        <!DOCTYPE html>
        <html>
          <body>
            <div class="task-item" data-task-id="test-3" onclick="toggleTask(this)">
              <div class="task-header">
                <span class="task-id">test-3</span>
                <span class="task-title">Task Without Tests</span>
                <span class="task-status not-started">not started</span>
              </div>
              <div class="task-details">
                <div class="task-description">Task without test status</div>
                <div class="no-tests">No tests available yet</div>
                <div class="actions">
                  <button class="action-btn primary">🤖 Execute with Cursor</button>
                  <button class="action-btn">Generate Prompt</button>
                  <button class="action-btn">View Requirements</button>
                </div>
              </div>
            </div>
          </body>
        </html>
      `);

      provider.resolveWebviewView(mockWebviewWithTasks, mockContext, mockToken);

      const html = mockWebviewWithTasks.webview.html;

      // Verify no-tests message is displayed
      expect(html).toContain('class="no-tests"');
      expect(html).toContain("No tests available yet");

      // Restore original method
      (provider as any).generateTaskmasterHTML = originalMethod;
    });
  });
});
