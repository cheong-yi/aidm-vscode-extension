/**
 * MarkdownTaskParser Unit Tests
 * Recovery Task 2.1.2: Test minimal class structure
 * Recovery Task 2.1.3: Test parseTasksFromFile method with mock data
 * Requirements: 3.1.1 - Basic MarkdownTaskParser instantiation
 */

import { jest } from '@jest/globals';
import { MarkdownTaskParser } from '../MarkdownTaskParser';
import { Task, TaskStatus, TaskComplexity, TaskPriority } from '../../types/tasks';

describe('MarkdownTaskParser', () => {
  let parser: MarkdownTaskParser;

  beforeEach(() => {
    parser = new MarkdownTaskParser();
  });

  // Test 1: Basic instantiation
  it('should create MarkdownTaskParser instance successfully', () => {
    expect(parser).toBeDefined();
    expect(parser).toBeInstanceOf(MarkdownTaskParser);
  });

  // Test 2: Constructor behavior
  it('should not throw error when constructor is called', () => {
    expect(() => {
      new MarkdownTaskParser();
    }).not.toThrow();
  });

  // Test 3: Import/export
  it('should be importable as a class', () => {
    expect(MarkdownTaskParser).toBeDefined();
    expect(typeof MarkdownTaskParser).toBe('function');
  });

  // Test 4: Type checking
  it('should be instanceof MarkdownTaskParser', () => {
    expect(parser).toBeInstanceOf(MarkdownTaskParser);
  });

  describe('MarkdownTaskParser - parseTasksFromFile', () => {
    // Test 1: Return type and promise
    it('should return Promise<Task[]> when parseTasksFromFile is called', async () => {
      const result = parser.parseTasksFromFile('test.md');
      expect(result).toBeInstanceOf(Promise);
      
      const tasks = await result;
      expect(Array.isArray(tasks)).toBe(true);
      expect(tasks.length).toBeGreaterThan(0);
    });

    // Test 2: Mock data structure
    it('should return array of valid Task objects with required properties', async () => {
      const tasks = await parser.parseTasksFromFile('test.md');
      
      expect(tasks.length).toBeGreaterThanOrEqual(2);
      expect(tasks.length).toBeLessThanOrEqual(3);
      
      tasks.forEach(task => {
        expect(task).toHaveProperty('id');
        expect(task).toHaveProperty('title');
        expect(task).toHaveProperty('description');
        expect(task).toHaveProperty('status');
        expect(task).toHaveProperty('complexity');
        expect(task).toHaveProperty('dependencies');
        expect(task).toHaveProperty('requirements');
        expect(task).toHaveProperty('createdDate');
        expect(task).toHaveProperty('lastModified');
      });
    });

    // Test 3: Consistent data
    it('should return consistent mock data on multiple calls', async () => {
      const firstCall = await parser.parseTasksFromFile('test1.md');
      const secondCall = await parser.parseTasksFromFile('test2.md');
      
      expect(firstCall).toEqual(secondCall);
      expect(firstCall.length).toBe(secondCall.length);
      
      // Check that task IDs are consistent
      const firstIds = firstCall.map(t => t.id).sort();
      const secondIds = secondCall.map(t => t.id).sort();
      expect(firstIds).toEqual(secondIds);
    });

    // Test 4: Different task statuses
    it('should return tasks with different status values', async () => {
      const tasks = await parser.parseTasksFromFile('test.md');
      
      const statuses = tasks.map(t => t.status);
      const uniqueStatuses = [...new Set(statuses)];
      
      expect(uniqueStatuses.length).toBeGreaterThan(1);
      expect(statuses).toContain(TaskStatus.COMPLETED);
      expect(statuses).toContain(TaskStatus.IN_PROGRESS);
    });

    // Test 5: No errors
    it('should not throw errors when called with any filePath', async () => {
      const testPaths = ['test.md', 'README.md', 'tasks.md', 'nonexistent.md', ''];
      
      for (const filePath of testPaths) {
        await expect(parser.parseTasksFromFile(filePath)).resolves.toBeDefined();
      }
    });
  });
});
