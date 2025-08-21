/**
 * TaskStatusManager Tests
 * Tests for task status management, dependencies, and business logic
 * Requirements: 2.1, 3.1-3.6, 4.1-4.4, 7.1-7.6
 */

import { jest } from '@jest/globals';
import { TaskStatusManager, StatusTransitionRule, TaskUpdateResult } from '../../services/TaskStatusManager';
import { MarkdownTaskParser } from '../../services/MarkdownTaskParser';
import { Task, TaskStatus, TaskComplexity, TaskPriority, TestStatus } from '../../types/tasks';
import { mockTaskData } from '../../mock/taskMockData';

// Mock MarkdownTaskParser
jest.mock('../../services/MarkdownTaskParser');
const MockedMarkdownTaskParser = MarkdownTaskParser as jest.MockedClass<typeof MarkdownTaskParser>;

describe('TaskStatusManager', () => {
  let taskStatusManager: TaskStatusManager;
  let mockParser: jest.Mocked<MarkdownTaskParser>;

  beforeEach(() => {
    mockParser = new MockedMarkdownTaskParser() as jest.Mocked<MarkdownTaskParser>;
    taskStatusManager = new TaskStatusManager(mockParser);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('loadTasksFromFile', () => {
    it('should load tasks from file successfully', async () => {
      const mockParseResult = {
        sections: [
          {
            heading: 'Test Section',
            level: 2,
            tasks: mockTaskData.small
          }
        ],
        tasks: mockTaskData.small,
        metadata: {
          totalTasks: mockTaskData.small.length,
          completedTasks: 0,
          inProgressTasks: 0,
          blockedTasks: 0,
          parseTime: 50,
          fileSize: 1000
        }
      };

      mockParser.parseTasksFromFile.mockResolvedValue(mockParseResult);
      mockParser.validateTaskData.mockReturnValue({
        isValid: true,
        errors: [],
        warnings: []
      });

      await taskStatusManager.loadTasksFromFile('/path/to/tasks.md');

      expect(mockParser.parseTasksFromFile).toHaveBeenCalledWith('/path/to/tasks.md');
      expect(mockParser.validateTaskData).toHaveBeenCalledWith(mockTaskData.small);
      expect(taskStatusManager.getAllTasks()).toHaveLength(mockTaskData.small.length);
    });

    it('should handle validation errors', async () => {
      const mockParseResult = {
        sections: [],
        tasks: mockTaskData.small,
        metadata: {
          totalTasks: mockTaskData.small.length,
          completedTasks: 0,
          inProgressTasks: 0,
          blockedTasks: 0,
          parseTime: 50,
          fileSize: 1000
        }
      };

      mockParser.parseTasksFromFile.mockResolvedValue(mockParseResult);
      mockParser.validateTaskData.mockReturnValue({
        isValid: false,
        errors: ['Task 1.1 has invalid dependencies'],
        warnings: []
      });

      await expect(taskStatusManager.loadTasksFromFile('/path/to/tasks.md'))
        .rejects
        .toThrow('Task validation failed: Task 1.1 has invalid dependencies');
    });

    it('should handle validation warnings gracefully', async () => {
      const mockParseResult = {
        sections: [],
        tasks: mockTaskData.small,
        metadata: {
          totalTasks: mockTaskData.small.length,
          completedTasks: 0,
          inProgressTasks: 0,
          blockedTasks: 0,
          parseTime: 50,
          fileSize: 1000
        }
      };

      mockParser.parseTasksFromFile.mockResolvedValue(mockParseResult);
      mockParser.validateTaskData.mockReturnValue({
        isValid: true,
        errors: [],
        warnings: ['Task 1.1 has no description']
      });

      // Should not throw for warnings
      await taskStatusManager.loadTasksFromFile('/path/to/tasks.md');
      expect(taskStatusManager.getAllTasks()).toHaveLength(mockTaskData.small.length);
    });

    it('should handle parser errors', async () => {
      const error = new Error('File not found');
      mockParser.parseTasksFromFile.mockRejectedValue(error);

      await expect(taskStatusManager.loadTasksFromFile('/path/to/nonexistent.md'))
        .rejects
        .toThrow('Failed to load tasks: File not found');
    });
  });

  describe('task retrieval methods', () => {
    beforeEach(async () => {
      // Load some test data
      const mockParseResult = {
        sections: [],
        tasks: mockTaskData.small,
        metadata: {
          totalTasks: mockTaskData.small.length,
          completedTasks: 0,
          inProgressTasks: 0,
          blockedTasks: 0,
          parseTime: 50,
          fileSize: 1000
        }
      };

      mockParser.parseTasksFromFile.mockResolvedValue(mockParseResult);
      mockParser.validateTaskData.mockReturnValue({
        isValid: true,
        errors: [],
        warnings: []
      });

      await taskStatusManager.loadTasksFromFile('/path/to/tasks.md');
    });

    it('should get all tasks', () => {
      const tasks = taskStatusManager.getAllTasks();
      expect(tasks).toHaveLength(mockTaskData.small.length);
      expect(tasks[0]).toHaveProperty('id');
      expect(tasks[0]).toHaveProperty('title');
      expect(tasks[0]).toHaveProperty('status');
    });

    it('should get task by ID', () => {
      const task = taskStatusManager.getTaskById('1.1');
      expect(task).toBeDefined();
      expect(task?.id).toBe('1.1');
    });

    it('should return undefined for non-existent task ID', () => {
      const task = taskStatusManager.getTaskById('999.999');
      expect(task).toBeUndefined();
    });

    it('should get tasks by status', () => {
      const notStartedTasks = taskStatusManager.getTasksByStatus(TaskStatus.NOT_STARTED);
      expect(notStartedTasks.every(t => t.status === TaskStatus.NOT_STARTED)).toBe(true);
    });

    it('should get tasks by section', () => {
      // Mock sections for this test
      const mockSections = [
        {
          heading: 'Test Section',
          level: 2,
          tasks: mockTaskData.small.slice(0, 3)
        }
      ];

      // Manually set sections for testing
      (taskStatusManager as any).sections = mockSections;

      const sectionTasks = taskStatusManager.getTasksBySection('Test Section');
      expect(sectionTasks).toHaveLength(3);
    });

    it('should return empty array for non-existent section', () => {
      const sectionTasks = taskStatusManager.getTasksBySection('Non-existent Section');
      expect(sectionTasks).toHaveLength(0);
    });
  });

  describe('task status updates', () => {
    let testTask: Task;

    beforeEach(async () => {
      testTask = {
        id: '1.1',
        title: 'Test Task',
        description: 'A test task',
        status: TaskStatus.NOT_STARTED,
        complexity: TaskComplexity.MEDIUM,
        dependencies: [],
        requirements: ['REQ-001'],
        createdDate: new Date(),
        lastModified: new Date()
      };

      const mockParseResult = {
        sections: [],
        tasks: [testTask],
        metadata: {
          totalTasks: 1,
          completedTasks: 0,
          inProgressTasks: 0,
          blockedTasks: 0,
          parseTime: 50,
          fileSize: 1000
        }
      };

      mockParser.parseTasksFromFile.mockResolvedValue(mockParseResult);
      mockParser.validateTaskData.mockReturnValue({
        isValid: true,
        errors: [],
        warnings: []
      });

      await taskStatusManager.loadTasksFromFile('/path/to/tasks.md');
    });

    it('should update task status successfully', async () => {
      mockParser.updateTaskStatus.mockResolvedValue(true);

      const result = await taskStatusManager.updateTaskStatus('1.1', TaskStatus.IN_PROGRESS);

      expect(result.success).toBe(true);
      expect(result.taskId).toBe('1.1');
      expect(result.previousStatus).toBe(TaskStatus.NOT_STARTED);
      expect(result.newStatus).toBe(TaskStatus.IN_PROGRESS);
      expect(result.updatedAt).toBeInstanceOf(Date);

      const updatedTask = taskStatusManager.getTaskById('1.1');
      expect(updatedTask?.status).toBe(TaskStatus.IN_PROGRESS);
      expect(updatedTask?.lastModified).toBeInstanceOf(Date);
    });

    it('should reject invalid status transitions', async () => {
      await expect(taskStatusManager.updateTaskStatus('1.1', TaskStatus.COMPLETED))
        .rejects
        .toThrow('Invalid status transition: Invalid transition from not_started to completed');
    });

    it('should reject status updates for non-existent tasks', async () => {
      await expect(taskStatusManager.updateTaskStatus('999.999', TaskStatus.IN_PROGRESS))
        .rejects
        .toThrow('Task not found: 999.999');
    });

    it('should handle file update errors gracefully', async () => {
      mockParser.updateTaskStatus.mockResolvedValue(false);

      const result = await taskStatusManager.updateTaskStatus('1.1', TaskStatus.IN_PROGRESS);

      expect(result.success).toBe(true); // Status update succeeds locally
      expect(mockParser.updateTaskStatus).toHaveBeenCalledWith('/path/to/tasks.md', '1.1', TaskStatus.IN_PROGRESS);
    });

    it('should update file when filePath is provided', async () => {
      mockParser.updateTaskStatus.mockResolvedValue(true);

      await taskStatusManager.updateTaskStatus('1.1', TaskStatus.IN_PROGRESS, '/custom/path.md');

      expect(mockParser.updateTaskStatus).toHaveBeenCalledWith('/custom/path.md', '1.1', TaskStatus.IN_PROGRESS);
    });
  });

  describe('dependency management', () => {
    let dependentTask: Task;
    let dependencyTask: Task;

    beforeEach(async () => {
      dependencyTask = {
        id: '1.1',
        title: 'Dependency Task',
        description: 'A task that others depend on',
        status: TaskStatus.NOT_STARTED,
        complexity: TaskComplexity.MEDIUM,
        dependencies: [],
        requirements: ['REQ-001'],
        createdDate: new Date(),
        lastModified: new Date()
      };

      dependentTask = {
        id: '1.2',
        title: 'Dependent Task',
        description: 'A task that depends on 1.1',
        status: TaskStatus.NOT_STARTED,
        complexity: TaskComplexity.MEDIUM,
        dependencies: ['1.1'],
        requirements: ['REQ-002'],
        createdDate: new Date(),
        lastModified: new Date()
      };

      const mockParseResult = {
        sections: [],
        tasks: [dependencyTask, dependentTask],
        metadata: {
          totalTasks: 2,
          completedTasks: 0,
          inProgressTasks: 0,
          blockedTasks: 0,
          parseTime: 50,
          fileSize: 1000
        }
      };

      mockParser.parseTasksFromFile.mockResolvedValue(mockParseResult);
      mockParser.validateTaskData.mockReturnValue({
        isValid: true,
        errors: [],
        warnings: []
      });

      await taskStatusManager.loadTasksFromFile('/path/to/tasks.md');
    });

    it('should block dependent tasks when dependencies are incomplete', async () => {
      // Try to start dependent task
      await expect(taskStatusManager.updateTaskStatus('1.2', TaskStatus.IN_PROGRESS))
        .rejects
        .toThrow('Dependency validation failed: Task has incomplete dependencies: 1.1');
    });

    it('should allow dependent tasks when dependencies are completed', async () => {
      // Complete dependency first
      mockParser.updateTaskStatus.mockResolvedValue(true);
      await taskStatusManager.updateTaskStatus('1.1', TaskStatus.COMPLETED);

      // Now dependent task should be able to start
      const result = await taskStatusManager.updateTaskStatus('1.2', TaskStatus.IN_PROGRESS);
      expect(result.success).toBe(true);
    });

    it('should automatically block tasks when dependencies become incomplete', async () => {
      // Start dependent task first
      mockParser.updateTaskStatus.mockResolvedValue(true);
      await taskStatusManager.updateTaskStatus('1.1', TaskStatus.IN_PROGRESS);
      await taskStatusManager.updateTaskStatus('1.2', TaskStatus.IN_PROGRESS);

      // Mark dependency as blocked
      await taskStatusManager.updateTaskStatus('1.1', TaskStatus.BLOCKED);

      // Dependent task should now be blocked
      const updatedDependentTask = taskStatusManager.getTaskById('1.2');
      expect(updatedDependentTask?.status).toBe(TaskStatus.BLOCKED);
    });

    it('should unblock tasks when dependencies are completed', async () => {
      // Set up blocked dependent task
      dependentTask.status = TaskStatus.BLOCKED;
      dependencyTask.status = TaskStatus.IN_PROGRESS;

      const mockParseResult = {
        sections: [],
        tasks: [dependencyTask, dependentTask],
        metadata: {
          totalTasks: 2,
          completedTasks: 0,
          inProgressTasks: 1,
          blockedTasks: 1,
          parseTime: 50,
          fileSize: 1000
        }
      };

      mockParser.parseTasksFromFile.mockResolvedValue(mockParseResult);
      mockParser.validateTaskData.mockReturnValue({
        isValid: true,
        errors: [],
        warnings: []
      });

      await taskStatusManager.loadTasksFromFile('/path/to/tasks.md');

      // Complete dependency
      mockParser.updateTaskStatus.mockResolvedValue(true);
      await taskStatusManager.updateTaskStatus('1.1', TaskStatus.COMPLETED);

      // Dependent task should be unblocked
      const updatedDependentTask = taskStatusManager.getTaskById('1.2');
      expect(updatedDependentTask?.status).toBe(TaskStatus.NOT_STARTED);
    });
  });

  describe('task statistics', () => {
    beforeEach(async () => {
      const mockParseResult = {
        sections: [],
        tasks: mockTaskData.medium,
        metadata: {
          totalTasks: mockTaskData.medium.length,
          completedTasks: 0,
          inProgressTasks: 0,
          blockedTasks: 0,
          parseTime: 50,
          fileSize: 1000
        }
      };

      mockParser.parseTasksFromFile.mockResolvedValue(mockParseResult);
      mockParser.validateTaskData.mockReturnValue({
        isValid: true,
        errors: [],
        warnings: []
      });

      await taskStatusManager.loadTasksFromFile('/path/to/tasks.md');
    });

    it('should calculate task statistics correctly', () => {
      const stats = taskStatusManager.getTaskStatistics();

      expect(stats.totalTasks).toBe(mockTaskData.medium.length);
      expect(stats.completedTasks).toBeGreaterThanOrEqual(0);
      expect(stats.inProgressTasks).toBeGreaterThanOrEqual(0);
      expect(stats.blockedTasks).toBeGreaterThanOrEqual(0);
      expect(stats.notStartedTasks).toBeGreaterThanOrEqual(0);
      expect(stats.averageCompletionTime).toBeGreaterThanOrEqual(0);
      expect(stats.testCoverage).toBeGreaterThanOrEqual(0);
      expect(stats.priorityDistribution).toBeDefined();
      expect(stats.complexityDistribution).toBeDefined();
    });

    it('should calculate priority distribution', () => {
      const stats = taskStatusManager.getTaskStatistics();

      const totalPriorityCount = Object.values(stats.priorityDistribution).reduce((sum, count) => sum + count, 0);
      expect(totalPriorityCount).toBeGreaterThan(0);
      expect(totalPriorityCount).toBeLessThanOrEqual(stats.totalTasks);
    });

    it('should calculate complexity distribution', () => {
      const stats = taskStatusManager.getTaskStatistics();

      const totalComplexityCount = Object.values(stats.complexityDistribution).reduce((sum, count) => sum + count, 0);
      expect(totalComplexityCount).toBeGreaterThan(0);
      expect(totalComplexityCount).toBeLessThanOrEqual(stats.totalTasks);
    });
  });

  describe('task search', () => {
    beforeEach(async () => {
      const mockParseResult = {
        sections: [],
        tasks: mockTaskData.medium,
        metadata: {
          totalTasks: mockTaskData.medium.length,
          completedTasks: 0,
          inProgressTasks: 0,
          blockedTasks: 0,
          parseTime: 50,
          fileSize: 1000
        }
      };

      mockParser.parseTasksFromFile.mockResolvedValue(mockParseResult);
      mockParser.validateTaskData.mockReturnValue({
        isValid: true,
        errors: [],
        warnings: []
      });

      await taskStatusManager.loadTasksFromFile('/path/to/tasks.md');
    });

    it('should search tasks by text query', () => {
      const results = taskStatusManager.searchTasks('Authentication');
      expect(results.length).toBeGreaterThan(0);
      expect(results.every(t => 
        t.title.toLowerCase().includes('authentication') ||
        t.description.toLowerCase().includes('authentication')
      )).toBe(true);
    });

    it('should search tasks by ID', () => {
      const results = taskStatusManager.searchTasks('1.1');
      expect(results.length).toBeGreaterThan(0);
      expect(results.every(t => t.id.includes('1.1'))).toBe(true);
    });

    it('should filter tasks by status', () => {
      const results = taskStatusManager.searchTasks('', { status: [TaskStatus.NOT_STARTED] });
      expect(results.every(t => t.status === TaskStatus.NOT_STARTED)).toBe(true);
    });

    it('should filter tasks by complexity', () => {
      const results = taskStatusManager.searchTasks('', { complexity: [TaskComplexity.HIGH] });
      expect(results.every(t => t.complexity === TaskComplexity.HIGH)).toBe(true);
    });

    it('should filter tasks by priority', () => {
      const results = taskStatusManager.searchTasks('', { priority: [TaskPriority.HIGH] });
      expect(results.every(t => t.priority === TaskPriority.HIGH)).toBe(true);
    });

    it('should filter tasks by assignee', () => {
      const results = taskStatusManager.searchTasks('', { assignee: 'alice.developer' });
      expect(results.every(t => t.assignee === 'alice.developer')).toBe(true);
    });

    it('should filter tasks by tags', () => {
      const results = taskStatusManager.searchTasks('', { tags: ['frontend'] });
      expect(results.every(t => t.tags && t.tags.includes('frontend'))).toBe(true);
    });

    it('should return empty results for no matches', () => {
      const results = taskStatusManager.searchTasks('nonexistentterm');
      expect(results).toHaveLength(0);
    });
  });

  describe('edge cases and error handling', () => {
    it('should handle tasks with circular dependencies gracefully', async () => {
      const circularTask1: Task = {
        id: '999.1',
        title: 'Circular Task 1',
        description: 'Depends on Circular Task 2',
        status: TaskStatus.NOT_STARTED,
        complexity: TaskComplexity.MEDIUM,
        dependencies: ['999.2'],
        requirements: ['REQ-999'],
        createdDate: new Date(),
        lastModified: new Date()
      };

      const circularTask2: Task = {
        id: '999.2',
        title: 'Circular Task 2',
        description: 'Depends on Circular Task 1',
        status: TaskStatus.NOT_STARTED,
        complexity: TaskComplexity.MEDIUM,
        dependencies: ['999.1'],
        requirements: ['REQ-998'],
        createdDate: new Date(),
        lastModified: new Date()
      };

      const mockParseResult = {
        sections: [],
        tasks: [circularTask1, circularTask2],
        metadata: {
          totalTasks: 2,
          completedTasks: 0,
          inProgressTasks: 0,
          blockedTasks: 0,
          parseTime: 50,
          fileSize: 1000
        }
      };

      mockParser.parseTasksFromFile.mockResolvedValue(mockParseResult);
      mockParser.validateTaskData.mockReturnValue({
        isValid: false,
        errors: ['Circular dependencies detected: 999.1 -> 999.2 -> 999.1'],
        warnings: []
      });

      await expect(taskStatusManager.loadTasksFromFile('/path/to/circular.md'))
        .rejects
        .toThrow('Task validation failed: Circular dependencies detected: 999.1 -> 999.2 -> 999.1');
    });

    it('should handle tasks with missing optional fields', async () => {
      const minimalTask: Task = {
        id: '1.1',
        title: 'Minimal Task',
        description: '',
        status: TaskStatus.NOT_STARTED,
        complexity: TaskComplexity.MEDIUM,
        dependencies: [],
        requirements: [],
        createdDate: new Date(),
        lastModified: new Date()
      };

      const mockParseResult = {
        sections: [],
        tasks: [minimalTask],
        metadata: {
          totalTasks: 1,
          completedTasks: 0,
          inProgressTasks: 0,
          blockedTasks: 0,
          parseTime: 50,
          fileSize: 1000
        }
      };

      mockParser.parseTasksFromFile.mockResolvedValue(mockParseResult);
      mockParser.validateTaskData.mockReturnValue({
        isValid: true,
        errors: [],
        warnings: ['Task 1.1 has no description']
      });

      await taskStatusManager.loadTasksFromFile('/path/to/minimal.md');
      const task = taskStatusManager.getTaskById('1.1');
      expect(task).toBeDefined();
      expect(task?.description).toBe('');
    });
  });

  describe('performance tests', () => {
    it('should handle large task sets efficiently', async () => {
      const largeTaskSet = mockTaskData.large;
      
      const mockParseResult = {
        sections: [],
        tasks: largeTaskSet,
        metadata: {
          totalTasks: largeTaskSet.length,
          completedTasks: 0,
          inProgressTasks: 0,
          blockedTasks: 0,
          parseTime: 50,
          fileSize: 1000
        }
      };

      mockParser.parseTasksFromFile.mockResolvedValue(mockParseResult);
      mockParser.validateTaskData.mockReturnValue({
        isValid: true,
        errors: [],
        warnings: []
      });

      const startTime = performance.now();
      await taskStatusManager.loadTasksFromFile('/path/to/large.md');
      const loadTime = performance.now() - startTime;

      expect(loadTime).toBeLessThan(500); // Should load 100+ tasks in <500ms
      expect(taskStatusManager.getAllTasks()).toHaveLength(largeTaskSet.length);
    });

    it('should search large task sets efficiently', async () => {
      const largeTaskSet = mockTaskData.large;
      
      const mockParseResult = {
        sections: [],
        tasks: largeTaskSet,
        metadata: {
          totalTasks: largeTaskSet.length,
          completedTasks: 0,
          inProgressTasks: 0,
          blockedTasks: 0,
          parseTime: 50,
          fileSize: 1000
        }
      };

      mockParser.parseTasksFromFile.mockResolvedValue(mockParseResult);
      mockParser.validateTaskData.mockReturnValue({
        isValid: true,
        errors: [],
        warnings: []
      });

      await taskStatusManager.loadTasksFromFile('/path/to/large.md');

      const startTime = performance.now();
      const results = taskStatusManager.searchTasks('', { status: [TaskStatus.NOT_STARTED] });
      const searchTime = performance.now() - startTime;

      expect(searchTime).toBeLessThan(100); // Should search in <100ms
      expect(results.length).toBeGreaterThan(0);
    });
  });
});
