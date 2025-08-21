/**
 * TasksDataService Unit Tests
 * Recovery Task 2.1.1: Test minimal class structure
 * Recovery Task 2.2.1: Test interface compliance
 * Recovery Task 2.2.2: Test getTasks mock data
 * Recovery Task 2.2.3: Test getTaskById lookup
 * Requirements: 3.1.1 - Basic TasksDataService instantiation and interface
 */

import { jest } from "@jest/globals";
import { TasksDataService } from "../TasksDataService";
import {
  Task,
  TaskStatus,
  TaskComplexity,
  TaskPriority,
} from "../../types/tasks";

describe("TasksDataService", () => {
  let service: TasksDataService;

  beforeEach(() => {
    service = new TasksDataService();
  });

  // Task 2.1.1: Basic instantiation tests
  describe("Basic Instantiation", () => {
    it("should create TasksDataService instance successfully", () => {
      expect(service).toBeDefined();
      expect(service).toBeInstanceOf(TasksDataService);
    });

    it("should not throw error when constructor is called", () => {
      expect(() => {
        new TasksDataService();
      }).not.toThrow();
    });

    it("should be importable as a class", () => {
      expect(TasksDataService).toBeDefined();
      expect(typeof TasksDataService).toBe("function");
    });

    it("should be instanceof TasksDataService", () => {
      expect(service).toBeInstanceOf(TasksDataService);
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

  // Task 2.2.2: getTasks mock data tests
  describe("getTasks Method", () => {
    it("should return Promise<Task[]>", async () => {
      const result = await service.getTasks();
      expect(Array.isArray(result)).toBe(true);
    });

    it("should return array of valid Task objects", async () => {
      const tasks = await service.getTasks();
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

    it("should return consistent mock data on multiple calls", async () => {
      const firstCall = await service.getTasks();
      const secondCall = await service.getTasks();

      expect(firstCall).toEqual(secondCall);
      expect(firstCall.length).toBe(secondCall.length);
    });

    it("should return tasks with different status values", async () => {
      const tasks = await service.getTasks();
      const statuses = tasks.map((t) => t.status);

      expect(statuses).toContain(TaskStatus.COMPLETED);
      expect(statuses).toContain(TaskStatus.IN_PROGRESS);
      expect(statuses).toContain(TaskStatus.NOT_STARTED);
    });
  });

  // Task 2.2.3: getTaskById lookup tests
  describe("getTaskById Method", () => {
    it("should return Task object when ID exists", async () => {
      const task = await service.getTaskById("task-1");
      expect(task).toBeDefined();
      expect(task?.id).toBe("task-1");
      expect(task?.title).toBe("Setup Project Structure");
    });

    it("should return null when ID does not exist", async () => {
      const task = await service.getTaskById("non-existent-task");
      expect(task).toBeNull();
    });

    it("should return correct task for valid ID", async () => {
      const task = await service.getTaskById("task-2");
      expect(task).toBeDefined();
      expect(task?.id).toBe("task-2");
      expect(task?.title).toBe("Implement Data Models");
      expect(task?.status).toBe(TaskStatus.IN_PROGRESS);
      expect(task?.complexity).toBe(TaskComplexity.MEDIUM);
    });

    it("should handle empty string ID gracefully", async () => {
      const task = await service.getTaskById("");
      expect(task).toBeNull();
    });
  });
});
