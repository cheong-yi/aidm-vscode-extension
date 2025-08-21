/**
 * Task Management Tests for SimpleMCPServer
 * Tests the task management tools integration
 */

import { SimpleMCPServer } from "../../server/SimpleMCPServer";
import { ContextManager } from "../../server/ContextManager";
import { MockDataProvider } from "../../mock/MockDataProvider";
import { TaskStatusManager } from "../../services/TaskStatusManager";
import { MarkdownTaskParser } from "../../services/MarkdownTaskParser";
import { Task, TaskStatus } from "../../types/tasks";

// Mock the services
jest.mock("../../services/TaskStatusManager");
jest.mock("../../services/MarkdownTaskParser");

describe("SimpleMCPServer Task Management", () => {
  let server: SimpleMCPServer;
  let contextManager: ContextManager;
  let mockDataProvider: MockDataProvider;
  let mockTaskStatusManager: jest.Mocked<TaskStatusManager>;
  let mockMarkdownParser: jest.Mocked<MarkdownTaskParser>;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Create mock services
    mockTaskStatusManager = {
      getAllTasks: jest.fn(),
      getTaskById: jest.fn(),
      updateTask: jest.fn(),
      loadTasksFromFile: jest.fn(),
      getTaskDependencyGraph: jest.fn(),
    } as any;

    mockMarkdownParser = {
      parseTasksFromFile: jest.fn(),
      validateTaskData: jest.fn(),
      serializeTasksToFile: jest.fn(),
      updateTaskStatus: jest.fn(),
    } as any;

    // Mock the constructor to return our mock
    (
      TaskStatusManager as jest.MockedClass<typeof TaskStatusManager>
    ).mockImplementation(() => mockTaskStatusManager);
    (
      MarkdownTaskParser as jest.MockedClass<typeof MarkdownTaskParser>
    ).mockImplementation(() => mockMarkdownParser);

    // Setup mock data provider and context manager
    mockDataProvider = new MockDataProvider({
      dataSize: "small",
      responseDelay: 0,
      errorRate: 0,
    });

    contextManager = new ContextManager(mockDataProvider);

    // Create server instance
    server = new SimpleMCPServer(3000, contextManager);
  });

  describe("Task Management Tools", () => {
    it("should list all tasks", async () => {
      const mockTasks: Task[] = [
        {
          id: "1.1",
          title: "Test Task 1",
          description: "First test task",
          status: TaskStatus.NOT_STARTED,
          complexity: "medium" as any,
          dependencies: [],
          requirements: ["REQ-001"],
          createdDate: new Date(),
          lastModified: new Date(),
        },
        {
          id: "1.2",
          title: "Test Task 2",
          description: "Second test task",
          status: TaskStatus.COMPLETED,
          complexity: "high" as any,
          dependencies: ["1.1"],
          requirements: ["REQ-002"],
          createdDate: new Date(),
          lastModified: new Date(),
        },
      ];

      mockTaskStatusManager.getAllTasks.mockReturnValue(mockTasks);

      // Test the tool call handling
      const response = await (server as any).handleTasksList(
        { id: "test-1" } as any,
        {}
      );

      expect(response.result.content[0].text).toContain("Tasks list:");
      expect(response.result.content[0].text).toContain("Test Task 1");
      expect(response.result.content[0].text).toContain("Test Task 2");
      expect(mockTaskStatusManager.getAllTasks).toHaveBeenCalled();
    });

    it("should get task by ID", async () => {
      const mockTask: Task = {
        id: "1.1",
        title: "Test Task",
        description: "A test task",
        status: TaskStatus.IN_PROGRESS,
        complexity: "medium" as any,
        dependencies: [],
        requirements: ["REQ-001"],
        createdDate: new Date(),
        lastModified: new Date(),
        priority: "high" as any,
      };

      mockTaskStatusManager.getTaskById.mockReturnValue(mockTask);

      const response = await (server as any).handleTasksGet(
        { id: "test-2" } as any,
        { taskId: "1.1" }
      );

      expect(response.result.content[0].text).toContain(
        "Task Details: Test Task"
      );
      expect(response.result.content[0].text).toContain("**ID:** 1.1");
      expect(response.result.content[0].text).toContain(
        "**Status:** in_progress"
      );
      expect(mockTaskStatusManager.getTaskById).toHaveBeenCalledWith("1.1");
    });

    it("should handle task not found", async () => {
      mockTaskStatusManager.getTaskById.mockReturnValue(undefined);

      const response = await (server as any).handleTasksGet(
        { id: "test-3" } as any,
        { taskId: "999.999" }
      );

      expect(response.result.isError).toBe(true);
      expect(response.result.content[0].text).toContain("not found");
    });

    it("should update task status", async () => {
      const mockUpdateResult = {
        success: true,
        taskId: "1.1",
        previousStatus: TaskStatus.NOT_STARTED,
        newStatus: TaskStatus.IN_PROGRESS,
        updatedAt: new Date(),
      };

      mockTaskStatusManager.updateTask.mockResolvedValue(mockUpdateResult);

      const response = await (server as any).handleTasksUpdateStatus(
        { id: "test-4" } as any,
        { taskId: "1.1", newStatus: TaskStatus.IN_PROGRESS }
      );

      expect(response.result.content[0].text).toContain("Task status updated");
      expect(response.result.content[0].text).toContain("1.1 -> in_progress");
      expect(mockTaskStatusManager.updateTask).toHaveBeenCalledWith({
        taskId: "1.1",
        status: TaskStatus.IN_PROGRESS,
      });
    });

    it("should refresh tasks from file", async () => {
      mockTaskStatusManager.loadTasksFromFile.mockResolvedValue();

      const response = await (server as any).handleTasksRefresh(
        { id: "test-5" } as any,
        { filePath: "/path/to/tasks.md" }
      );

      expect(response.result.content[0].text).toContain("Tasks refreshed from");
      expect(mockTaskStatusManager.loadTasksFromFile).toHaveBeenCalledWith(
        "/path/to/tasks.md"
      );
    });

    it("should get task dependencies", async () => {
      const mockDependencyGraph = {
        taskId: "1.1",
        dependencies: ["1.0"],
        dependents: ["1.2"],
        circularDependencies: [],
        isBlocked: false,
        blockingTasks: [],
      };

      mockTaskStatusManager.getTaskById.mockReturnValue({} as Task);
      mockTaskStatusManager.getTaskDependencyGraph.mockReturnValue(
        mockDependencyGraph
      );

      const response = await (server as any).handleTasksDependencies(
        { id: "test-6" } as any,
        { taskId: "1.1" }
      );

      expect(response.result.content[0].text).toContain(
        "Dependencies for task 1.1"
      );
      expect(response.result.content[0].text).toContain("Dependencies: 1.0");
      expect(response.result.content[0].text).toContain("Dependents: 1.2");
      expect(mockTaskStatusManager.getTaskDependencyGraph).toHaveBeenCalledWith(
        "1.1"
      );
    });

    it("should get task test results", async () => {
      const mockTask: Task = {
        id: "1.1",
        title: "Test Task",
        description: "A test task",
        status: TaskStatus.COMPLETED,
        complexity: "medium" as any,
        dependencies: [],
        requirements: [],
        createdDate: new Date(),
        lastModified: new Date(),
        testStatus: {
          totalTests: 10,
          passedTests: 8,
          failedTests: 2,
          coverage: 80,
          lastRunDate: new Date(),
        },
      };

      mockTaskStatusManager.getTaskById.mockReturnValue(mockTask);

      const response = await (server as any).handleTasksTestResults(
        { id: "test-7" } as any,
        { taskId: "1.1" }
      );

      expect(response.result.content[0].text).toContain(
        "Test results for task 1.1"
      );
      expect(response.result.content[0].text).toContain("Total Tests: 10");
      expect(response.result.content[0].text).toContain("Passed: 8");
      expect(response.result.content[0].text).toContain("Failed: 2");
      expect(response.result.content[0].text).toContain("Coverage: 80%");
    });

    it("should handle missing test results", async () => {
      const mockTask: Task = {
        id: "1.1",
        title: "Test Task",
        description: "A test task",
        status: TaskStatus.NOT_STARTED,
        complexity: "medium" as any,
        dependencies: [],
        requirements: [],
        createdDate: new Date(),
        lastModified: new Date(),
      };

      mockTaskStatusManager.getTaskById.mockReturnValue(mockTask);

      const response = await (server as any).handleTasksTestResults(
        { id: "test-8" } as any,
        { taskId: "1.1" }
      );

      expect(response.result.content[0].text).toContain(
        "No test results found"
      );
    });
  });

  describe("Error Handling", () => {
    it("should handle missing task ID in get request", async () => {
      const response = await (server as any).handleTasksGet(
        { id: "test-error-1" } as any,
        {}
      );

      expect(response.result.isError).toBe(true);
      expect(response.result.content[0].text).toContain("Task ID is required");
    });

    it("should handle missing parameters in update request", async () => {
      const response = await (server as any).handleTasksUpdateStatus(
        { id: "test-error-2" } as any,
        { taskId: "1.1" }
      );

      expect(response.result.isError).toBe(true);
      expect(response.result.content[0].text).toContain(
        "Task ID and new status are required"
      );
    });

    it("should handle missing file path in refresh request", async () => {
      const response = await (server as any).handleTasksRefresh(
        { id: "test-error-3" } as any,
        {}
      );

      expect(response.result.isError).toBe(true);
      expect(response.result.content[0].text).toContain(
        "File path is required"
      );
    });

    it("should handle missing task ID in dependencies request", async () => {
      const response = await (server as any).handleTasksDependencies(
        { id: "test-error-4" } as any,
        {}
      );

      expect(response.result.isError).toBe(true);
      expect(response.result.content[0].text).toContain("Task ID is required");
    });

    it("should handle missing task ID in test results request", async () => {
      const response = await (server as any).handleTasksTestResults(
        { id: "test-error-5" } as any,
        {}
      );

      expect(response.result.isError).toBe(true);
      expect(response.result.content[0].text).toContain("Task ID is required");
    });
  });
});
