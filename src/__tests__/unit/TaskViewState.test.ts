/**
 * TaskViewState Unit Tests
 * REF-012: Test extracted state management functionality
 */

import * as vscode from 'vscode';
import { TaskViewState } from '../../tasks/providers/TaskViewState';

// Mock VSCode extension context
const createMockContext = (): vscode.ExtensionContext => {
  const storage = new Map<string, any>();
  
  return {
    workspaceState: {
      get: <T>(key: string, defaultValue?: T): T => {
        return storage.get(key) ?? defaultValue;
      },
      update: (key: string, value: any): Thenable<void> => {
        storage.set(key, value);
        return Promise.resolve();
      },
      keys: (): readonly string[] => Array.from(storage.keys())
    }
  } as unknown as vscode.ExtensionContext;
};

describe('TaskViewState', () => {
  let context: vscode.ExtensionContext;
  let viewState: TaskViewState;

  beforeEach(() => {
    context = createMockContext();
    viewState = new TaskViewState(context);
  });

  describe('Expanded Task Management', () => {
    it('should start with no expanded task', () => {
      expect(viewState.getExpandedTask()).toBeNull();
    });

    it('should set and get expanded task', () => {
      viewState.setExpandedTask('task-1');
      expect(viewState.getExpandedTask()).toBe('task-1');
    });

    it('should clear expanded task when set to null', () => {
      viewState.setExpandedTask('task-1');
      viewState.setExpandedTask(null);
      expect(viewState.getExpandedTask()).toBeNull();
    });

    it('should toggle task expansion correctly', () => {
      // First toggle should expand
      const isExpanded1 = viewState.toggleExpanded('task-1');
      expect(isExpanded1).toBe(true);
      expect(viewState.getExpandedTask()).toBe('task-1');

      // Second toggle should collapse
      const isExpanded2 = viewState.toggleExpanded('task-1');
      expect(isExpanded2).toBe(false);
      expect(viewState.getExpandedTask()).toBeNull();
    });

    it('should implement accordion behavior (only one task expanded)', () => {
      viewState.setExpandedTask('task-1');
      expect(viewState.getExpandedTask()).toBe('task-1');

      viewState.setExpandedTask('task-2');
      expect(viewState.getExpandedTask()).toBe('task-2');
    });

    it('should correctly identify expanded tasks', () => {
      viewState.setExpandedTask('task-1');
      
      expect(viewState.isTaskExpanded('task-1')).toBe(true);
      expect(viewState.isTaskExpanded('task-2')).toBe(false);
    });
  });

  describe('Filter Management', () => {
    it('should start with "all" filter', () => {
      expect(viewState.getFilter()).toBe('all');
    });

    it('should set and get filter', () => {
      viewState.setFilter('pending');
      expect(viewState.getFilter()).toBe('pending');
    });
  });

  describe('Search Query Management', () => {
    it('should start with empty search query', () => {
      expect(viewState.getSearchQuery()).toBe('');
    });

    it('should set and get search query', () => {
      viewState.setSearchQuery('test query');
      expect(viewState.getSearchQuery()).toBe('test query');
    });
  });

  describe('State Persistence', () => {
    it('should persist state to workspace storage', () => {
      viewState.setExpandedTask('task-1');
      viewState.setFilter('completed');
      viewState.setSearchQuery('search test');

      // Create new instance with same context (simulates reload)
      const newViewState = new TaskViewState(context);
      
      expect(newViewState.getExpandedTask()).toBe('task-1');
      expect(newViewState.getFilter()).toBe('completed');
      expect(newViewState.getSearchQuery()).toBe('search test');
    });
  });

  describe('State Reset', () => {
    it('should reset all state to defaults', () => {
      viewState.setExpandedTask('task-1');
      viewState.setFilter('pending');
      viewState.setSearchQuery('test');

      viewState.resetState();

      expect(viewState.getExpandedTask()).toBeNull();
      expect(viewState.getFilter()).toBe('all');
      expect(viewState.getSearchQuery()).toBe('');
    });
  });

  describe('State Summary', () => {
    it('should provide accurate state summary', () => {
      viewState.setExpandedTask('task-1');
      viewState.setFilter('pending');
      viewState.setSearchQuery('test query');

      const summary = viewState.getStateSummary();
      
      expect(summary).toEqual({
        expandedTaskId: 'task-1',
        filter: 'pending',
        searchQuery: 'test query'
      });
    });
  });
});