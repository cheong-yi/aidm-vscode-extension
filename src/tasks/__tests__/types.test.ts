/**
 * Task Types Unit Tests
 * Requirements: 1.1, 1.2, 2.1, 7.1
 */

import { jest } from '@jest/globals';
import { 
  TaskStatus, 
  TaskComplexity, 
  TaskPriority, 
  TestStatus as TestStatusEnum 
} from '../types/taskEnums';
import { 
  Task, 
  TaskTestStatus, 
  ValidationResult, 
  TaskContext 
} from '../types/taskTypes';

describe('Task Enums', () => {
  describe('TaskStatus', () => {
    it('should have all required status values', () => {
      expect(TaskStatus.NOT_STARTED).toBe('not_started');
      expect(TaskStatus.IN_PROGRESS).toBe('in_progress');
      expect(TaskStatus.REVIEW).toBe('review');
      expect(TaskStatus.COMPLETED).toBe('completed');
      expect(TaskStatus.BLOCKED).toBe('blocked');
      expect(TaskStatus.DEPRECATED).toBe('deprecated');
    });
  });

  describe('TaskComplexity', () => {
    it('should have all required complexity values', () => {
      expect(TaskComplexity.LOW).toBe('low');
      expect(TaskComplexity.MEDIUM).toBe('medium');
      expect(TaskComplexity.HIGH).toBe('high');
      expect(TaskComplexity.EXTREME).toBe('extreme');
    });
  });

  describe('TaskPriority', () => {
    it('should have all required priority values', () => {
      expect(TaskPriority.LOW).toBe('low');
      expect(TaskPriority.MEDIUM).toBe('medium');
      expect(TaskPriority.HIGH).toBe('high');
      expect(TaskPriority.CRITICAL).toBe('critical');
    });
  });

  describe('TestStatus', () => {
    it('should have all required test status values', () => {
      expect(TestStatusEnum.NOT_RUN).toBe('not_run');
      expect(TestStatusEnum.PASSING).toBe('passing');
      expect(TestStatusEnum.FAILING).toBe('failing');
      expect(TestStatusEnum.PARTIAL).toBe('partial');
      expect(TestStatusEnum.ERROR).toBe('error');
    });
  });
});

describe('Task Types', () => {
  describe('Task interface', () => {
    it('should allow creation of a valid task', () => {
      const task: Task = {
        id: '1.1',
        title: 'Setup Project Structure',
        description: 'Create directory structure for task management components',
        status: TaskStatus.NOT_STARTED,
        complexity: TaskComplexity.MEDIUM,
        priority: TaskPriority.HIGH,
        dependencies: [],
        requirements: ['6.1', '6.2', '6.3'],
        createdDate: "2024-01-01T00:00:00Z",
        lastModified: "2024-01-01T00:00:00Z",
        assignee: 'developer',
        estimatedHours: 4,
        tags: ['setup', 'infrastructure']
      };

      expect(task.id).toBe('1.1');
      expect(task.title).toBe('Setup Project Structure');
      expect(task.status).toBe(TaskStatus.NOT_STARTED);
      expect(task.complexity).toBe(TaskComplexity.MEDIUM);
      expect(task.priority).toBe(TaskPriority.HIGH);
    });
  });

  describe('TaskTestStatus interface', () => {
    it('should allow creation of valid test status', () => {
      const testStatus: TaskTestStatus = {
        lastRunDate: "2024-01-01T00:00:00Z",
        totalTests: 20,
        passedTests: 18,
        failedTests: 2,
        status: TestStatusEnum.PARTIAL,
        coverage: 90,
        executionTime: 1500
      };

      expect(testStatus.totalTests).toBe(20);
      expect(testStatus.passedTests).toBe(18);
      expect(testStatus.failedTests).toBe(2);
      expect(testStatus.coverage).toBe(90);
    });
  });

  describe('ValidationResult interface', () => {
    it('should allow creation of validation results', () => {
      const validResult: ValidationResult = {
        isValid: true,
        errors: [],
        warnings: [],
        suggestions: ['Consider adding more detailed description']
      };

      const invalidResult: ValidationResult = {
        isValid: false,
        errors: ['Task ID is required', 'Title cannot be empty'],
        warnings: ['Description is very short'],
        suggestions: ['Add more context to the description']
      };

      expect(validResult.isValid).toBe(true);
      expect(validResult.errors).toHaveLength(0);
      expect(invalidResult.isValid).toBe(false);
      expect(invalidResult.errors).toHaveLength(2);
    });
  });

  describe('TaskContext interface', () => {
    it('should allow creation of task context', () => {
      const task: Task = {
        id: '1.1',
        title: 'Test Task',
        description: 'Test Description',
        status: TaskStatus.NOT_STARTED,
        complexity: TaskComplexity.LOW,
        priority: TaskPriority.MEDIUM,
        dependencies: [],
        requirements: [],
        createdDate: "2024-01-01T00:00:00Z",
        lastModified: "2024-01-01T00:00:00Z"
      };

      const context: TaskContext = {
        task,
        relatedRequirements: ['REQ-001', 'REQ-002'],
        codeMappings: ['src/tasks/types/taskTypes.ts'],
        businessContext: 'Core infrastructure setup',
        dependencies: [],
        blockers: [],
        progressPercentage: 0
      };

      expect(context.task.id).toBe('1.1');
      expect(context.relatedRequirements).toHaveLength(2);
      expect(context.codeMappings).toHaveLength(1);
      expect(context.progressPercentage).toBe(0);
    });
  });
});
