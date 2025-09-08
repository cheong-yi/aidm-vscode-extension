/**
 * TaskViewState Class
 * Manages webview state including expanded tasks, filters, and search queries
 * REF-012: Extract state management from TaskWebviewProvider
 *
 * This class centralizes all webview state management with VSCode workspace persistence.
 * Single Responsibility: Manage and persist webview UI state
 */

import * as vscode from "vscode";

/**
 * Interface for persisted view state
 */
interface ViewStateData {
  expandedTaskId?: string | null;
  filter?: string;
  searchQuery?: string;
  lastUpdated?: number;
}

/**
 * TaskViewState manages all webview state including accordion expansion,
 * filters, and search queries with VSCode workspace persistence.
 */
export class TaskViewState {
  private expandedTaskId: string | null = null;
  private currentFilter: string = 'all';
  private searchQuery: string = '';
  private readonly stateKey = 'taskmaster.viewState';

  constructor(private readonly context: vscode.ExtensionContext) {
    this.loadState();
  }

  /**
   * Set the currently expanded task ID
   * @param taskId - Task ID to expand, or null to collapse all
   */
  setExpandedTask(taskId: string | null): void {
    this.expandedTaskId = taskId;
    this.saveState();
  }

  /**
   * Get the currently expanded task ID
   * @returns Currently expanded task ID or null
   */
  getExpandedTask(): string | null {
    return this.expandedTaskId;
  }

  /**
   * Set the current filter
   * @param filter - Filter string (e.g., 'all', 'pending', 'completed')
   */
  setFilter(filter: string): void {
    this.currentFilter = filter;
    this.saveState();
  }

  /**
   * Get the current filter
   * @returns Current filter string
   */
  getFilter(): string {
    return this.currentFilter;
  }

  /**
   * Set the current search query
   * @param query - Search query string
   */
  setSearchQuery(query: string): void {
    this.searchQuery = query;
    this.saveState();
  }

  /**
   * Get the current search query
   * @returns Current search query string
   */
  getSearchQuery(): string {
    return this.searchQuery;
  }

  /**
   * Toggle expanded state for a task (accordion behavior)
   * @param taskId - Task ID to toggle
   * @returns Whether the task is now expanded
   */
  toggleExpanded(taskId: string): boolean {
    const wasExpanded = this.expandedTaskId === taskId;
    
    if (wasExpanded) {
      // Collapse currently expanded task
      this.expandedTaskId = null;
    } else {
      // Expand new task (accordion behavior)
      this.expandedTaskId = taskId;
    }
    
    this.saveState();
    return !wasExpanded;
  }

  /**
   * Check if a specific task is expanded
   * @param taskId - Task ID to check
   * @returns Whether the task is expanded
   */
  isTaskExpanded(taskId: string): boolean {
    return this.expandedTaskId === taskId;
  }

  /**
   * Load state from VSCode workspace storage
   */
  private loadState(): void {
    try {
      const state = this.context.workspaceState.get<ViewStateData>(this.stateKey, {});
      
      this.expandedTaskId = state.expandedTaskId || null;
      this.currentFilter = state.filter || 'all';
      this.searchQuery = state.searchQuery || '';

      console.debug('TaskViewState: State loaded from workspace storage:', {
        expandedTaskId: this.expandedTaskId,
        filter: this.currentFilter,
        searchQuery: this.searchQuery,
        lastUpdated: state.lastUpdated ? new Date(state.lastUpdated).toISOString() : 'never'
      });
    } catch (error) {
      console.warn('TaskViewState: Failed to load state from workspace storage:', error);
      // Use default values
      this.expandedTaskId = null;
      this.currentFilter = 'all';
      this.searchQuery = '';
    }
  }

  /**
   * Save state to VSCode workspace storage
   */
  private saveState(): void {
    try {
      const state: ViewStateData = {
        expandedTaskId: this.expandedTaskId,
        filter: this.currentFilter,
        searchQuery: this.searchQuery,
        lastUpdated: Date.now()
      };

      this.context.workspaceState.update(this.stateKey, state);

      console.debug('TaskViewState: State saved to workspace storage:', {
        expandedTaskId: this.expandedTaskId,
        filter: this.currentFilter,
        searchQuery: this.searchQuery,
        timestamp: Date.now()
      });
    } catch (error) {
      console.warn('TaskViewState: Failed to save state to workspace storage:', error);
    }
  }

  /**
   * Reset all state to defaults
   */
  resetState(): void {
    this.expandedTaskId = null;
    this.currentFilter = 'all';
    this.searchQuery = '';
    this.saveState();
    
    console.debug('TaskViewState: State reset to defaults');
  }

  /**
   * Get a summary of current state for debugging
   */
  getStateSummary(): { expandedTaskId: string | null; filter: string; searchQuery: string } {
    return {
      expandedTaskId: this.expandedTaskId,
      filter: this.currentFilter,
      searchQuery: this.searchQuery
    };
  }
}