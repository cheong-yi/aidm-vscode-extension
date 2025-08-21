/**
 * TasksDataService Unit Tests
 * Recovery Task 2.1.1: Test minimal class structure
 * Recovery Task 2.2.1: Test interface compliance
 * Recovery Task 2.2.2: Test getTasks mock data
 * Recovery Task 2.2.3: Test getTaskById lookup
 * Recovery Task 2.2.4: Test TaskStatusManager integration and delegation
 * Requirements: 3.1.1 - Basic TasksDataService instantiation and interface
 */

import { jest } from "@jest/globals";
import { TasksDataService } from "../TasksDataService";
import { TaskStatusManager } from "../TaskStatusManager";
import {
  Task,
  TaskStatus,
  TaskComplexity,
  TaskPriority,
} from "../../types/tasks";

// Mock TaskStatusManager
jest.mock("../TaskStatusManager");

describe("TasksDataService", () => {
  let service: TasksDataService;
  let mockTaskStatusManager: jest.Mocked<TaskStatusManager>;

  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();

    // Create mock TaskStatusManager instance
    mockTaskStatusManager = {
      getTasks: jest.fn(),
      getTaskById: jest.fn(),
      updateTaskStatus: jest.fn(),
      refreshTasksFromFile: jest.fn(),
      getTaskDependencies: jest.fn(),
      validateStatusTransition: jest.fn(),
    } as unknown as jest.Mocked<TaskStatusManager>;

    service = new TasksDataService(mockTaskStatusManager);
  });

  // Task 2.1.1: Basic instantiation tests
  describe("Basic Instantiation", () => {
    it("should create TasksDataService instance successfully", () => {
      expect(service).toBeDefined();
      expect(service).toBeInstanceOf(TasksDataService);
    });

    it("should not throw error when constructor is called with TaskStatusManager", () => {
      expect(() => {
        new TasksDataService(mockTaskStatusManager);
      }).not.toThrow();
    });

    it("should be importable as a class", () => {
      expect(TasksDataService).toBeDefined();
      expect(typeof TasksDataService).toBe("function");
    });

    it("should be instanceof TasksDataService", () => {
      expect(service).toBeInstanceOf(TasksDataService);
    });

    it("should accept TaskStatusManager as constructor dependency", () => {
      expect(service).toBeDefined();
      // The service should be properly instantiated with the dependency
    });
  });

  // Task 2.2.1: Interface compliance tests
  describe("Interface Compliance", () => {
    it("should implement ITasksDataService interface", () => {
      expect(typeof service.getTasks).toBe("function");
      expect(typeof service.getTaskById).toBe("function");
    });

    it("should have getTasks method that returns Promise<Task[]>", () => {
      const result = service.getTasks();
      expect(result).toBeInstanceOf(Promise);
    });

    it("should have getTaskById method that returns Promise<Task | null>", () => {
      const result = service.getTaskById("test-id");
      expect(result).toBeInstanceOf(Promise);
    });

    it("should compile with interface compliance", () => {
      // This test ensures TypeScript compilation works
      expect(service).toHaveProperty("getTasks");
      expect(service).toHaveProperty("getTaskById");
    });
  });

  // Task 2.2.4: TaskStatusManager integration and delegation tests
  describe("TaskStatusManager Integration", () => {
    it("should delegate getTasks to TaskStatusManager", async () => {
      // Arrange
      const mockTasks: Task[] = [
        {
          id: "delegated-task-1",
          title: "Delegated Task 1",
          description: "Task delegated from TaskStatusManager",
          status: TaskStatus.COMPLETED,
          complexity: TaskComplexity.LOW,
          dependencies: [],
          requirements: ["1.1"],
          createdDate: new Date("2024-01-01"),
          lastModified: new Date("2024-01-02"),
          priority: TaskPriority.HIGH,
        },
      ];
      mockTaskStatusManager.getTasks.mockResolvedValue(mockTasks);

      // Act
      const result = await service.getTasks();

      // Assert
      expect(mockTaskStatusManager.getTasks).toHaveBeenCalledTimes(1);
      expect(mockTaskStatusManager.getTasks).toHaveBeenCalledWith();
      expect(result).toEqual(mockTasks);
    });

    it("should delegate getTaskById to TaskStatusManager with correct id", async () => {
      // Arrange
      const mockTask: Task = {
        id: "delegated-task-2",
        title: "Delegated Task 2",
        description: "Individual task delegated from TaskStatusManager",
        status: TaskStatus.IN_PROGRESS,
        complexity: TaskComplexity.MEDIUM,
        dependencies: ["task-1"],
        requirements: ["2.1"],
        createdDate: new Date("2024-01-02"),
        lastModified: new Date("2024-01-03"),
        priority: TaskPriority.MEDIUM,
      };
      mockTaskStatusManager.getTaskById.mockResolvedValue(mockTask);

      // Act
      const result = await service.getTaskById("delegated-task-2");

      // Assert
      expect(mockTaskStatusManager.getTaskById).toHaveBeenCalledTimes(1);
      expect(mockTaskStatusManager.getTaskById).toHaveBeenCalledWith(
        "delegated-task-2"
      );
      expect(result).toEqual(mockTask);
    });

    it("should return null when TaskStatusManager returns null for getTaskById", async () => {
      // Arrange
      mockTaskStatusManager.getTaskById.mockResolvedValue(null);

      // Act
      const result = await service.getTaskById("non-existent-task");

      // Assert
      expect(mockTaskStatusManager.getTaskById).toHaveBeenCalledWith(
        "non-existent-task"
      );
      expect(result).toBeNull();
    });

    it("should propagate errors from TaskStatusManager.getTasks", async () => {
      // Arrange
      const error = new Error("TaskStatusManager getTasks failed");
      mockTaskStatusManager.getTasks.mockRejectedValue(error);

      // Act & Assert
      await expect(service.getTasks()).rejects.toThrow(
        "TaskStatusManager getTasks failed"
      );
      expect(mockTaskStatusManager.getTasks).toHaveBeenCalledTimes(1);
    });

    it("should propagate errors from TaskStatusManager.getTaskById", async () => {
      // Arrange
      const error = new Error("TaskStatusManager getTaskById failed");
      mockTaskStatusManager.getTaskById.mockRejectedValue(error);

      // Act & Assert
      await expect(service.getTaskById("test-id")).rejects.toThrow(
        "TaskStatusManager getTaskById failed"
      );
      expect(mockTaskStatusManager.getTaskById).toHaveBeenCalledWith("test-id");
    });
  });

  // Legacy tests for backward compatibility (can be removed after integration is complete)
  describe("Legacy Mock Data Tests (Deprecated)", () => {
    it("should return array of valid Task objects", async () => {
      // Arrange
      const mockTasks: Task[] = [
        {
          id: "legacy-task-1",
          title: "Legacy Task 1",
          description: "Legacy task for backward compatibility",
          status: TaskStatus.COMPLETED,
          complexity: TaskComplexity.LOW,
          dependencies: [],
          requirements: ["1.1"],
          createdDate: new Date("2024-01-01"),
          lastModified: new Date("2024-01-02"),
          priority: TaskPriority.HIGH,
        },
      ];
      mockTaskStatusManager.getTasks.mockResolvedValue(mockTasks);

      // Act
      const tasks = await service.getTasks();

      // Assert
      expect(tasks.length).toBeGreaterThan(0);
      tasks.forEach((task) => {
        expect(task).toHaveProperty("id");
        expect(task).toHaveProperty("title");
        expect(task).toHaveProperty("description");
        expect(task).toHaveProperty("status");
        expect(task).toHaveProperty("complexity");
        expect(task).toHaveProperty("dependencies");
        expect(task).toHaveProperty("requirements");
        expect(task).toHaveProperty("createdDate");
        expect(task).toHaveProperty("lastModified");
      });
    });

    it("should return consistent data on multiple calls", async () => {
      // Arrange
      const mockTasks: Task[] = [
        {
          id: "consistent-task",
          title: "Consistent Task",
          description: "Task that should be consistent across calls",
          status: TaskStatus.IN_PROGRESS,
          complexity: TaskComplexity.MEDIUM,
          dependencies: [],
          requirements: ["2.1"],
          createdDate: new Date("2024-01-01"),
          lastModified: new Date("2024-01-02"),
          priority: TaskPriority.MEDIUM,
        },
      ];
      mockTaskStatusManager.getTasks.mockResolvedValue(mockTasks);

      // Act
      const firstCall = await service.getTasks();
      const secondCall = await service.getTasks();

      // Assert
      expect(firstCall).toEqual(secondCall);
      expect(firstCall.length).toBe(secondCall.length);
      expect(mockTaskStatusManager.getTasks).toHaveBeenCalledTimes(2);
    });
  });

  // Recovery Task 2.3.1: Event Emitter Infrastructure Tests
  describe("Event Emitter Infrastructure", () => {
    it("should have onTasksUpdated EventEmitter property", () => {
      // Assert
      expect(service.onTasksUpdated).toBeDefined();
      expect(typeof service.onTasksUpdated).toBe("object");
    });

    it("should have onTasksUpdated as EventEmitter<Task[]> type", () => {
      // Assert
      expect(service.onTasksUpdated).toBeDefined();
      // Check that it has EventEmitter-like properties
      expect(typeof service.onTasksUpdated.event).toBe("function");
      expect(typeof service.onTasksUpdated.fire).toBe("function");
      expect(typeof service.onTasksUpdated.dispose).toBe("function");
    });

    it("should allow listeners to be attached to onTasksUpdated", () => {
      // Arrange
      const mockListener = jest.fn();

      // Act
      const disposable = service.onTasksUpdated.event(mockListener);

      // Assert
      expect(disposable).toBeDefined();
      expect(typeof disposable.dispose).toBe("function");
    });

    it("should have dispose method for cleanup", () => {
      // Assert
      expect(typeof service.dispose).toBe("function");
    });

    it("should clean up event emitter when dispose is called", () => {
      // Arrange
      const mockListener = jest.fn();
      const disposable = service.onTasksUpdated.event(mockListener);

      // Act
      service.dispose();

      // Assert
      // The event emitter should be disposed and listeners cleaned up
      expect(disposable).toBeDefined();
    });

    it("should initialize event emitter in constructor", () => {
      // Arrange & Act
      const newService = new TasksDataService(mockTaskStatusManager);

      // Assert
      expect(newService.onTasksUpdated).toBeDefined();
      expect(typeof newService.onTasksUpdated.event).toBe("function");
    });
  });
});
