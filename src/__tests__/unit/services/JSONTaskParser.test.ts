/**
 * JSONTaskParser Unit Tests
 * CRITICAL-2: Test JSON parsing functionality for nested contexts
 */

import { JSONTaskParser } from "../../../services/JSONTaskParser";
import { TaskStatus, TaskComplexity, TaskPriority } from "../../../types/tasks";

describe("JSONTaskParser", () => {
  let parser: JSONTaskParser;

  beforeEach(() => {
    parser = new JSONTaskParser();
  });

  describe("parseTasksFromJSONContent", () => {
    it("should parse nested contexts JSON structure", async () => {
      const jsonData = {
        master: {
          tasks: [
            {
              id: 1,
              title: 'Test Task 1',
              description: 'Test Description 1',
              details: 'Test Details 1', // Added: test new details field
              testStrategy: 'Test Strategy 1', // Added: test new testStrategy field
              priority: 'high',
              dependencies: [],
              status: 'done',
              subtasks: [] // Added: test new subtasks field
            }
          ]
        },
        'sldc-code-ingestrion': {
          tasks: [
            {
              id: 2,
              title: 'Test Task 2',
              description: 'Test Description 2',
              details: 'Test Details 2', // Added: test new details field
              testStrategy: 'Test Strategy 2', // Added: test new testStrategy field
              priority: 'medium',
              dependencies: [1],
              status: 'pending',
              subtasks: [] // Added: test new subtasks field
            }
          ]
        }
      };

      const result = parser.parseTasksFromJSONContent(jsonData);

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('1');
      expect(result[0].title).toBe('Test Task 1');
      expect(result[0].details).toBe('Test Details 1'); // Added: verify details field
      expect(result[0].testStrategy).toBe('Test Strategy 1'); // Added: verify testStrategy field
      expect(result[0].subtasks).toEqual([]); // Added: verify subtasks field
      expect(result[0].status).toBe(TaskStatus.COMPLETED);
      expect(result[0].complexity).toBe(TaskComplexity.HIGH);
      expect(result[1].id).toBe('2');
      expect(result[1].title).toBe('Test Task 2');
      expect(result[1].details).toBe('Test Details 2'); // Added: verify details field
      expect(result[1].testStrategy).toBe('Test Strategy 2'); // Added: verify testStrategy field
      expect(result[1].subtasks).toEqual([]); // Added: verify subtasks field
      expect(result[1].status).toBe(TaskStatus.NOT_STARTED);
      expect(result[1].complexity).toBe(TaskComplexity.MEDIUM);
    });

    it("should handle empty JSON data", () => {
      const result = parser.parseTasksFromJSONContent({});
      expect(result).toHaveLength(0);
    });

    it("should handle malformed JSON data", () => {
      const result = parser.parseTasksFromJSONContent(null);
      expect(result).toHaveLength(0);
    });

    it("should map status values correctly", () => {
      const mockJSONData = {
        test: {
          tasks: [
            { id: 1, title: "Task 1", status: "done" },
            { id: 2, title: "Task 2", status: "in_progress" },
            { id: 3, title: "Task 3", status: "pending" },
            { id: 4, title: "Task 4", status: "blocked" },
            { id: 5, title: "Task 5", status: "review" }
          ]
        }
      };

      const result = parser.parseTasksFromJSONContent(mockJSONData);

      expect(result[0].status).toBe(TaskStatus.COMPLETED);
      expect(result[1].status).toBe(TaskStatus.IN_PROGRESS);
      expect(result[2].status).toBe(TaskStatus.NOT_STARTED);
      expect(result[3].status).toBe(TaskStatus.BLOCKED);
      expect(result[4].status).toBe(TaskStatus.REVIEW);
    });

    it("should provide default values for missing fields", () => {
      const mockJSONData = {
        test: {
          tasks: [
            {
              id: 1,
              title: "Minimal Task"
            }
          ]
        }
      };

      const result = parser.parseTasksFromJSONContent(mockJSONData);

      expect(result[0].description).toBe("Minimal Task");
      expect(result[0].status).toBe(TaskStatus.NOT_STARTED);
      expect(result[0].complexity).toBe(TaskComplexity.LOW);
      expect(result[0].priority).toBe(TaskPriority.MEDIUM);
      expect(result[0].dependencies).toEqual([]);
      expect(result[0].requirements).toEqual(["1"]);
      expect(result[0].estimatedDuration).toBe("15-20 min");
      expect(result[0].isExecutable).toBe(true);
    });
  });

  describe("flattenContexts", () => {
    it("should flatten nested contexts into single task array", () => {
      const mockJSONData = {
        context1: {
          tasks: [
            { id: 1, title: "Task 1" },
            { id: 2, title: "Task 2" }
          ]
        },
        context2: {
          tasks: [
            { id: 3, title: "Task 3" }
          ]
        }
      };

      // Access private method for testing
      const result = (parser as any).flattenContexts(mockJSONData);

      expect(result).toHaveLength(3);
      expect(result[0].id).toBe(1);
      expect(result[0].context).toBe("context1");
      expect(result[1].id).toBe(2);
      expect(result[1].context).toBe("context1");
      expect(result[2].id).toBe(3);
      expect(result[2].context).toBe("context2");
    });
  });
});
