import { Task, TaskSearchFilters, TaskStatus, TaskComplexity, TaskPriority } from '../types/tasks';

/**
 * TaskFilterService - Handles all task filtering logic
 * Extracted from TaskWebviewProvider to maintain single responsibility principle
 */
export class TaskFilterService {
  /**
   * Filter tasks by assignee (used by "My Tasks" filter)
   */
  public filterByAssignee(tasks: Task[], currentUser: string = 'dev-team'): Task[] {
    return tasks.filter(task => {
      const assignee = task.assignee || 'dev-team';
      return assignee === currentUser || assignee === 'dev-team';
    });
  }

  /**
   * Apply comprehensive filters to task list
   */
  public applyFilters(tasks: Task[], filters: TaskSearchFilters): Task[] {
    let filteredTasks = [...tasks];

    // Filter by status
    if (filters.status && filters.status.length > 0) {
      filteredTasks = filteredTasks.filter(task => 
        filters.status!.includes(task.status)
      );
    }

    // Filter by complexity
    if (filters.complexity && filters.complexity.length > 0) {
      filteredTasks = filteredTasks.filter(task => 
        filters.complexity!.includes(task.complexity)
      );
    }

    // Filter by priority
    if (filters.priority && filters.priority.length > 0) {
      filteredTasks = filteredTasks.filter(task => 
        task.priority && filters.priority!.includes(task.priority)
      );
    }

    // Filter by assignee
    if (filters.assignee) {
      filteredTasks = this.filterByAssignee(filteredTasks, filters.assignee);
    }

    // Filter by tags
    if (filters.tags && filters.tags.length > 0) {
      filteredTasks = filteredTasks.filter(task => 
        task.tags && task.tags.some(tag => filters.tags!.includes(tag))
      );
    }

    // Filter by requirements
    if (filters.requirements && filters.requirements.length > 0) {
      filteredTasks = filteredTasks.filter(task => 
        task.requirements && task.requirements.some(req => filters.requirements!.includes(req))
      );
    }

    // Filter by date ranges
    if (filters.createdAfter || filters.createdBefore) {
      filteredTasks = filteredTasks.filter(task => {
        const createdDate = new Date(task.createdDate);
        if (filters.createdAfter && createdDate < filters.createdAfter) {
          return false;
        }
        if (filters.createdBefore && createdDate > filters.createdBefore) {
          return false;
        }
        return true;
      });
    }

    if (filters.modifiedAfter || filters.modifiedBefore) {
      filteredTasks = filteredTasks.filter(task => {
        const modifiedDate = new Date(task.lastModified);
        if (filters.modifiedAfter && modifiedDate < filters.modifiedAfter) {
          return false;
        }
        if (filters.modifiedBefore && modifiedDate > filters.modifiedBefore) {
          return false;
        }
        return true;
      });
    }

    return filteredTasks;
  }

  /**
   * Generate filter JavaScript for webview
   * Used by TaskHTMLGenerator to create client-side filtering
   */
  public generateFilterScript(): string {
    return `
      document.addEventListener('DOMContentLoaded', function() {
        const filterToggle = document.getElementById('my-tasks-filter');
        if (filterToggle) {
          filterToggle.addEventListener('change', function() {
            const isChecked = this.checked;
            const taskItems = document.querySelectorAll('.task-item');
            
            taskItems.forEach(item => {
              const assignee = item.dataset.assignee;
              if (isChecked) {
                // Show only tasks assigned to current user or dev-team
                if (assignee === 'dev-team' || assignee === 'current-user') {
                  item.style.display = 'block';
                } else {
                  item.style.display = 'none';
                }
              } else {
                // Show all tasks
                item.style.display = 'block';
              }
            });
          });
        }
      });`;
  }

  /**
   * Create default filter for "My Tasks" functionality
   */
  public createMyTasksFilter(currentUser: string = 'dev-team'): TaskSearchFilters {
    return {
      assignee: currentUser
    };
  }

  /**
   * Validate filter parameters
   */
  public validateFilters(filters: TaskSearchFilters): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Validate date ranges
    if (filters.createdAfter && filters.createdBefore && 
        filters.createdAfter > filters.createdBefore) {
      errors.push('createdAfter must be before createdBefore');
    }

    if (filters.modifiedAfter && filters.modifiedBefore && 
        filters.modifiedAfter > filters.modifiedBefore) {
      errors.push('modifiedAfter must be before modifiedBefore');
    }

    // Validate enum values
    if (filters.status) {
      const validStatuses = Object.values(TaskStatus);
      const invalidStatuses = filters.status.filter(status => !validStatuses.includes(status));
      if (invalidStatuses.length > 0) {
        errors.push(`Invalid status values: ${invalidStatuses.join(', ')}`);
      }
    }

    if (filters.complexity) {
      const validComplexities = Object.values(TaskComplexity);
      const invalidComplexities = filters.complexity.filter(complexity => !validComplexities.includes(complexity));
      if (invalidComplexities.length > 0) {
        errors.push(`Invalid complexity values: ${invalidComplexities.join(', ')}`);
      }
    }

    if (filters.priority) {
      const validPriorities = Object.values(TaskPriority);
      const invalidPriorities = filters.priority.filter(priority => !validPriorities.includes(priority));
      if (invalidPriorities.length > 0) {
        errors.push(`Invalid priority values: ${invalidPriorities.join(', ')}`);
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }
}