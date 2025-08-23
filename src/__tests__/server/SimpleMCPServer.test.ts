/**
 * Unit Tests for SimpleMCPServer
 * Tests MCP tool registration, validation, and handler methods
 */

import { SimpleMCPServer } from "../../server/SimpleMCPServer";
import { ContextManager } from "../../server/ContextManager";
import { MockDataProvider } from "../../mock/MockDataProvider";
import { TaskStatusManager } from "../../services/TaskStatusManager";
import { MarkdownTaskParser } from "../../services/MarkdownTaskParser";
import { JSONRPCRequest, ToolCallRequest } from "../../types/jsonrpc";
import {
  Task,
  TaskStatus,
  TestStatus,
  TaskPriority,
  TestStatusEnum,
} from "../../types/tasks";

describe("SimpleMCPServer Unit Tests", () => {
  let server: SimpleMCPServer;
  let mockContextManager: any;
  let mockTaskStatusManager: any;
  let mockMarkdownParser: any;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Create mock instances with proper jest mocking
    mockMarkdownParser = {
      parseTasksFromFile: jest.fn(),
    };

    mockTaskStatusManager = {
      getTasks: jest.fn(),
      getTaskById: jest.fn(),
      updateTaskStatus: jest.fn(),
      refreshTasksFromFile: jest.fn(),
      getTaskDependencies: jest.fn(),
      validateStatusTransition: jest.fn(),
    };

    mockContextManager = {
      getBusinessContext: jest.fn(),
      getRequirementById: jest.fn(),
    };

    // Create server instance
    server = new SimpleMCPServer(
      3000,
      mockContextManager,
      mockTaskStatusManager
    );
  });

  describe("Tool Registration", () => {
    it("should register all required task tools in tools list", async () => {
      // Mock the tools/list response
      const mockRequest: JSONRPCRequest = {
        jsonrpc: "2.0",
        method: "tools/list",
        id: "test-1",
      };

      // Use reflection to access private method for testing
      const toolsListResponse = await (server as any).handleToolsList(
        mockRequest
      );

      expect(toolsListResponse.result.tools).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ name: "tasks/list" }),
          expect.objectContaining({ name: "tasks/get" }),
          expect.objectContaining({ name: "tasks/update-status" }),
          expect.objectContaining({ name: "tasks/refresh" }),
          expect.objectContaining({ name: "tasks/dependencies" }),
          expect.objectContaining({ name: "tasks/test-results" }),
        ])
      );
    });

    it("should include correct input schema for tasks/refresh", async () => {
      const mockRequest: JSONRPCRequest = {
        jsonrpc: "2.0",
        method: "tools/list",
        id: "test-2",
      };

      const toolsListResponse = await (server as any).handleToolsList(
        mockRequest
      );
      const refreshTool = toolsListResponse.result.tools.find(
        (t: any) => t.name === "tasks/refresh"
      );

      expect(refreshTool).toBeDefined();
      expect(refreshTool.inputSchema).toEqual({
        type: "object",
        properties: {},
        additionalProperties: false,
      });
    });

    it("should include correct input schema for tasks/dependencies", async () => {
      const mockRequest: JSONRPCRequest = {
        jsonrpc: "2.0",
        method: "tools/list",
        id: "test-3",
      };

      const toolsListResponse = await (server as any).handleToolsList(
        mockRequest
      );
      const dependenciesTool = toolsListResponse.result.tools.find(
        (t: any) => t.name === "tasks/dependencies"
      );

      expect(dependenciesTool).toBeDefined();
      expect(dependenciesTool.inputSchema).toEqual({
        type: "object",
        properties: {
          id: {
            type: "string",
            description: "The unique identifier of the task",
          },
        },
        required: ["id"],
        additionalProperties: false,
      });
    });

    it("should include correct input schema for tasks/test-results", async () => {
      const mockRequest: JSONRPCRequest = {
        jsonrpc: "2.0",
        method: "tools/list",
        id: "test-4",
      };

      const toolsListResponse = await (server as any).handleToolsList(
        mockRequest
      );
      const testResultsTool = toolsListResponse.result.tools.find(
        (t: any) => t.name === "tasks/test-results"
      );

      expect(testResultsTool).toBeDefined();
      expect(testResultsTool.inputSchema).toEqual({
        type: "object",
        properties: {
          id: {
            type: "string",
            description: "The unique identifier of the task",
          },
        },
        required: ["id"],
        additionalProperties: false,
      });
    });
  });

  describe("Tool Validation", () => {
    it("should validate tasks/refresh with no arguments", () => {
      const validationError = (server as any).validateToolArguments(
        "tasks/refresh",
        {}
      );
      expect(validationError).toBeNull();
    });

    it("should validate tasks/dependencies with valid ID", () => {
      const validationError = (server as any).validateToolArguments(
        "tasks/dependencies",
        { id: "task-123" }
      );
      expect(validationError).toBeNull();
    });

    it("should validate tasks/test-results with valid ID", () => {
      const validationError = (server as any).validateToolArguments(
        "tasks/test-results",
        { id: "task-123" }
      );
      expect(validationError).toBeNull();
    });

    it("should reject tasks/dependencies without ID", () => {
      const validationError = (server as any).validateToolArguments(
        "tasks/dependencies",
        {}
      );
      expect(validationError).toBe("id is required and must be a string");
    });

    it("should reject tasks/test-results without ID", () => {
      const validationError = (server as any).validateToolArguments(
        "tasks/test-results",
        {}
      );
      expect(validationError).toBe("id is required and must be a string");
    });

    it("should reject tasks/dependencies with non-string ID", () => {
      const validationError = (server as any).validateToolArguments(
        "tasks/dependencies",
        { id: 123 }
      );
      expect(validationError).toBe("id is required and must be a string");
    });

    it("should reject tasks/test-results with non-string ID", () => {
      const validationError = (server as any).validateToolArguments(
        "tasks/test-results",
        { id: 123 }
      );
      expect(validationError).toBe("id is required and must be a string");
    });
  });

  describe("Tool Execution", () => {
    describe("tasks/refresh", () => {
      it("should call refreshTasksFromFile and return success response", async () => {
        const mockTasks: Task[] = [
          {
            id: "task-1",
            title: "Test Task 1",
            description: "Description 1",
            status: TaskStatus.NOT_STARTED,
            complexity: "low" as any,
            priority: TaskPriority.MEDIUM,
            dependencies: [],
            requirements: [],
            createdDate: "2024-01-01T00:00:00Z",
            lastModified: "2024-01-01T00:00:00Z",
          },
          {
            id: "task-2",
            title: "Test Task 2",
            description: "Description 2",
            status: TaskStatus.IN_PROGRESS,
            complexity: "medium" as any,
            priority: TaskPriority.MEDIUM,
            dependencies: [],
            requirements: [],
            createdDate: "2024-01-01T00:00:00Z",
            lastModified: "2024-01-01T00:00:00Z",
          },
        ];

        mockTaskStatusManager.refreshTasksFromFile.mockResolvedValue();
        mockTaskStatusManager.getTasks.mockResolvedValue(mockTasks);

        const mockRequest: ToolCallRequest = {
          jsonrpc: "2.0",
          method: "tools/call",
          id: "test-5",
          params: {
            name: "tasks/refresh",
            arguments: {},
          },
        };

        const response = await (server as any).handleToolCall(mockRequest);

        expect(mockTaskStatusManager.refreshTasksFromFile).toHaveBeenCalled();
        expect(mockTaskStatusManager.getTasks).toHaveBeenCalled();

        expect(response.result.content[0].text).toContain(
          "Tasks refreshed successfully"
        );
        expect(response.result.content[0].text).toContain('"taskCount": 2');
        expect(response.result.content[0].text).toContain('"refreshedAt"');
      });

      it("should handle errors in tasks/refresh", async () => {
        const error = new Error("Refresh failed");
        mockTaskStatusManager.refreshTasksFromFile.mockRejectedValue(error);

        const mockRequest: ToolCallRequest = {
          jsonrpc: "2.0",
          method: "tools/call",
          id: "test-6",
          params: {
            name: "tasks/refresh",
            arguments: {},
          },
        };

        const response = await (server as any).handleToolCall(mockRequest);

        expect(response.result.isError).toBe(true);
        expect(response.result.content[0].text).toContain(
          "Error executing tool tasks/refresh"
        );
        expect(response.result.content[0].text).toContain("Refresh failed");
      });
    });

    describe("tasks/dependencies", () => {
      it("should return dependencies with metadata", async () => {
        const mockDependencies = ["dep-1", "dep-2", "dep-3"];
        mockTaskStatusManager.getTaskDependencies.mockResolvedValue(
          mockDependencies
        );

        const mockRequest: ToolCallRequest = {
          jsonrpc: "2.0",
          method: "tools/call",
          id: "test-7",
          params: {
            name: "tasks/dependencies",
            arguments: { id: "task-123" },
          },
        };

        const response = await (server as any).handleToolCall(mockRequest);

        expect(mockTaskStatusManager.getTaskDependencies).toHaveBeenCalledWith(
          "task-123"
        );

        expect(response.result.content[0].text).toContain(
          '"taskId": "task-123"'
        );
        expect(response.result.content[0].text).toContain('"dependencies": [');
        expect(response.result.content[0].text).toContain('"dep-1"');
        expect(response.result.content[0].text).toContain('"dep-2"');
        expect(response.result.content[0].text).toContain('"dep-3"');
        expect(response.result.content[0].text).toContain(
          '"dependencyCount": 3'
        );
        expect(response.result.content[0].text).toContain(
          '"hasDependencies": true'
        );
      });

      it("should handle empty dependencies", async () => {
        mockTaskStatusManager.getTaskDependencies.mockResolvedValue([]);

        const mockRequest: ToolCallRequest = {
          jsonrpc: "2.0",
          method: "tools/call",
          id: "test-8",
          params: {
            name: "tasks/dependencies",
            arguments: { id: "task-123" },
          },
        };

        const response = await (server as any).handleToolCall(mockRequest);

        expect(response.result.content[0].text).toContain('"dependencies": []');
        expect(response.result.content[0].text).toContain(
          '"dependencyCount": 0'
        );
        expect(response.result.content[0].text).toContain(
          '"hasDependencies": false'
        );
      });

      it("should handle errors in tasks/dependencies", async () => {
        const error = new Error("Dependencies failed");
        mockTaskStatusManager.getTaskDependencies.mockRejectedValue(error);

        const mockRequest: ToolCallRequest = {
          jsonrpc: "2.0",
          method: "tools/call",
          id: "test-9",
          params: {
            name: "tasks/dependencies",
            arguments: { id: "task-123" },
          },
        };

        const response = await (server as any).handleToolCall(mockRequest);

        expect(response.result.isError).toBe(true);
        expect(response.result.content[0].text).toContain(
          "Error executing tool tasks/dependencies"
        );
        expect(response.result.content[0].text).toContain(
          "Dependencies failed"
        );
      });
    });

    describe("tasks/test-results", () => {
      it("should return test results with summary statistics", async () => {
        const mockTestStatus: TestStatus = {
          totalTests: 10,
          passedTests: 8,
          failedTests: 2,
          status: TestStatusEnum.PARTIAL,
          lastRunDate: "2024-01-01T00:00:00Z",
          coverage: 85.5,
        };

        const mockTask: Task = {
          id: "task-123",
          title: "Test Task",
          description: "A test task",
          status: TaskStatus.IN_PROGRESS,
          complexity: "medium" as any,
          priority: TaskPriority.MEDIUM,
          dependencies: [],
          requirements: [],
          createdDate: "2024-01-01T00:00:00Z",
          lastModified: "2024-01-01T00:00:00Z",
          testStatus: mockTestStatus,
        };

        mockTaskStatusManager.getTaskById.mockResolvedValue(mockTask);

        const mockRequest: ToolCallRequest = {
          jsonrpc: "2.0",
          method: "tools/call",
          id: "test-10",
          params: {
            name: "tasks/test-results",
            arguments: { id: "task-123" },
          },
        };

        const response = await (server as any).handleToolCall(mockRequest);

        expect(mockTaskStatusManager.getTaskById).toHaveBeenCalledWith(
          "task-123"
        );

        expect(response.result.content[0].text).toContain(
          '"hasTestResults": true'
        );
        expect(response.result.content[0].text).toContain('"total": 10');
        expect(response.result.content[0].text).toContain('"passed": 8');
        expect(response.result.content[0].text).toContain('"failed": 2');
        expect(response.result.content[0].text).toContain(
          '"passRate": "80.0%"'
        );
      });

      it("should handle task not found", async () => {
        mockTaskStatusManager.getTaskById.mockResolvedValue(null);

        const mockRequest: ToolCallRequest = {
          jsonrpc: "2.0",
          method: "tools/call",
          id: "test-11",
          params: {
            name: "tasks/test-results",
            arguments: { id: "task-123" },
          },
        };

        const response = await (server as any).handleToolCall(mockRequest);

        expect(response.result.content[0].text).toContain(
          '"hasTestResults": false'
        );
        expect(response.result.content[0].text).toContain(
          "Task with ID 'task-123' not found"
        );
      });

      it("should handle task without test status", async () => {
        const mockTask: Task = {
          id: "task-123",
          title: "Test Task",
          description: "A test task",
          status: TaskStatus.IN_PROGRESS,
          complexity: "medium" as any,
          priority: TaskPriority.MEDIUM,
          dependencies: [],
          requirements: [],
          createdDate: "2024-01-01T00:00:00Z",
          lastModified: "2024-01-01T00:00:00Z",
          // No testStatus
        };

        mockTaskStatusManager.getTaskById.mockResolvedValue(mockTask);

        const mockRequest: ToolCallRequest = {
          jsonrpc: "2.0",
          method: "tools/call",
          id: "test-12",
          params: {
            name: "tasks/test-results",
            arguments: { id: "task-123" },
          },
        };

        const response = await (server as any).handleToolCall(mockRequest);

        expect(response.result.content[0].text).toContain(
          '"hasTestResults": false'
        );
        expect(response.result.content[0].text).toContain(
          "No test results available for this task"
        );
      });

      it("should handle errors in tasks/test-results", async () => {
        const error = new Error("Test results failed");
        mockTaskStatusManager.getTaskById.mockRejectedValue(error);

        const mockRequest: ToolCallRequest = {
          jsonrpc: "2.0",
          method: "tools/call",
          id: "test-13",
          params: {
            name: "tasks/test-results",
            arguments: { id: "task-123" },
          },
        };

        const response = await (server as any).handleToolCall(mockRequest);

        expect(response.result.isError).toBe(true);
        expect(response.result.content[0].text).toContain(
          "Error executing tool tasks/test-results"
        );
        expect(response.result.content[0].text).toContain(
          "Test results failed"
        );
      });
    });
  });
});
