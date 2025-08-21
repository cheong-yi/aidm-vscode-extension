/**
 * TasksDataService Simple Import Test
 * Recovery Task 2.1.1: Verify basic export functionality
 */

import { TasksDataService } from '../TasksDataService';

describe('TasksDataService Simple Import', () => {
  it('should be importable directly from file', () => {
    expect(TasksDataService).toBeDefined();
    expect(typeof TasksDataService).toBe('function');
  });

  it('should create instance when imported directly', () => {
    const service = new TasksDataService();
    expect(service).toBeInstanceOf(TasksDataService);
  });
});
