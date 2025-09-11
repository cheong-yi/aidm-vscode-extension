import * as vscode from "vscode";
import * as fs from "fs";
import * as path from "path";
import { Task, TaskStatus, STATUS_DISPLAY_NAMES } from "../../types/tasks";
// Import bundled CSS content at build time
import cssContent from './styles.css';

/**
 * TaskHTMLGenerator - Responsible for generating all HTML content for the task webview
 * Extracted from TaskWebviewProvider to maintain single responsibility principle
 */
export class TaskHTMLGenerator {
  private logoDataUri: string = "";
  private webview?: vscode.Webview;
  
  // Static cache for JavaScript (CSS now bundled at build time)
  private static jsCache: string = '';

  constructor(private extensionUri: vscode.Uri) {}

  /**
   * Set the webview reference for resource URI generation
   */
  setWebview(webview: vscode.Webview): void {
    this.webview = webview;
  }

  /**
   * Set the logo data URI (called from TaskWebviewProvider when logo is loaded)
   */
  setLogoDataUri(logoDataUri: string): void {
    this.logoDataUri = logoDataUri;
  }

  /**
   * Generate the complete HTML content for the webview
   */
  generateFullHTML(tasks: Task[], expandedId: string | null = null): string {
    return this.generateTaskmasterHTML(tasks);
  }

  /**
   * Send task data to webview for safe rendering (replaces HTML escaping)
   */
  sendTaskDataToWebview(tasks: Task[], webview: any): void {
    const taskData = tasks.map((task) => ({
      id: task.id,
      title: task.title || "",
      description: task.description || "No description available",
      testStrategy:
        task.testStrategy && task.testStrategy.trim()
          ? task.testStrategy
          : "No test strategy specified",
      dependencies: task.dependencies || [],
      subtasks: task.subtasks || [],
      assignee: task.assignee || "dev-team",
    }));

    webview.postMessage({
      type: "updateTaskData",
      tasks: taskData,
    });
  }

  /**
   * Generate loading HTML for workspace initialization state
   */
  generateLoadingHTML(): string {
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="Content-Security-Policy" 
          content="default-src 'none'; style-src vscode-resource: 'unsafe-inline' 'self'; script-src vscode-resource: 'unsafe-inline' 'self'; img-src vscode-resource: https: data: 'self'; font-src vscode-resource: https: 'self'; connect-src 'self';">
    <title>Taskmaster</title>
    <style>
      body { 
        font-family: var(--vscode-font-family); 
        padding: 20px; 
        background: var(--vscode-editor-background);
        color: var(--vscode-editor-foreground);
        margin: 0;
      }
      #taskmaster-root {
        text-align: center;
        padding: 40px 20px;
      }
      h3 {
        color: var(--vscode-titleBar-activeForeground);
        margin-bottom: 16px;
      }
      p {
        color: var(--vscode-descriptionForeground);
      }
    </style>
</head>
<body>
    <div id="taskmaster-root">
        <h3>Loading Tasks...</h3>
        <p>Please wait while workspace initializes...</p>
    </div>
</body>
</html>`;
  }

  /**
   * Generate complete Taskmaster dashboard HTML with CSS and JavaScript
   */
  private generateTaskmasterHTML(tasks: Task[]): string {
    const taskListHTML =
      tasks.length > 0
        ? tasks.map((task) => this.generateTaskItem(task)).join("")
        : '<div class="no-tasks">No tasks available</div>';

    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="Content-Security-Policy" 
          content="default-src 'none'; style-src vscode-resource: 'unsafe-inline' 'self'; script-src vscode-resource: 'unsafe-inline' 'self'; img-src vscode-resource: https: data: 'self'; font-src vscode-resource: https: 'self'; connect-src 'self';">
    <title>Taskmaster Dashboard</title>
    <style>
${this.getInlineCSS()}
    </style>
</head>
<body>
    <!-- NEW: Top-level branding container above sidebar -->
    <div class="top-branding">
        <div class="branding-content">
            <img src="${this.logoDataUri}" alt="AiDM" class="aidm-logo" />
        </div>
    </div>
    
    <!-- MODIFIED: Sidebar with Taskmaster header -->
    <div class="sidebar">
        <div class="sidebar-header">
            TASKMASTER DASHBOARD
        </div>
        <div class="sidebar-content">
            ${this.generateWebviewHeader()}
            <div class="task-list">
                ${taskListHTML}
            </div>
        </div>
    </div>
    <script>
${this.getInlineJavaScript()}
    </script>
</body>
</html>`;
  }

  /**
   * Generate webview header with filter controls
   */
  private generateWebviewHeader(): string {
    return `<div class="webview-header">
      <div class="filter-controls">
        <label class="filter-toggle">
          <input type="checkbox" id="my-tasks-filter" />
          <span class="filter-checkbox">
            <svg class="filter-icon" viewBox="0 0 16 16" width="12" height="12" fill="currentColor">
              <path d="M6 12a1 1 0 01-.707-.293l-3-3a1 1 0 111.414-1.414L6 9.586l6.293-6.293a1 1 0 111.414 1.414l-7 7A1 1 0 016 12z"/>
            </svg>
          </span>
          <span class="filter-label">View My Tasks</span>
        </label>
      </div>
    </div>`;
  }

  /**
   * Generate individual task item HTML
   */
  private generateTaskItem(task: Task): string {
    const statusClass = this.getStatusClass(task.status);
    const statusDisplay = STATUS_DISPLAY_NAMES[task.status] || task.status;
    const isExecutable = false; // Disabled for now
    const subtasksHtml = this.generateSubtasksSection(task);
    const assignee = task.assignee || "dev-team";

    return `<div class="task-item" data-task-id="${
      task.id
    }" data-assignee="${assignee}">
      ${this.generateTaskHeader(task, statusClass, statusDisplay, isExecutable)}
      ${this.generateTaskDetails(task)}
      ${subtasksHtml}
    </div>`;
  }

  // Helper methods (simplified versions for initial implementation)
  private getStatusClass(status: TaskStatus): string {
    switch (status) {
      case TaskStatus.COMPLETED:
        return "status-completed";
      case TaskStatus.IN_PROGRESS:
        return "status-in-progress";
      case TaskStatus.NOT_STARTED:
        return "status-not-started";
      default:
        return "status-unknown";
    }
  }

  private generateSubtasksSection(task: Task): string {
    if (!task.subtasks || task.subtasks.length === 0) {
      return "";
    }

    const subtaskItems = task.subtasks
      .map((subtask) => this.generateExpandableSubtaskItem(subtask, task.id))
      .join("");

    return `<div class="subtasks-section">
      <div class="subtasks-header">Subtasks (${task.subtasks.length})</div>
      <div class="subtasks-list">${subtaskItems}</div>
    </div>`;
  }

  private generateExpandableSubtaskItem(
    subtask: any,
    parentTaskId: string
  ): string {
    const subtaskIdStr = String(subtask.id);
    const subtaskId = `${parentTaskId}.${subtaskIdStr}`;
    const statusClass = this.getSubtaskStatusClass(subtask.status);

    return `<div class="subtask-item" data-subtask-id="${subtaskIdStr}" data-parent-id="${parentTaskId}" data-full-id="${subtaskId}">
      <div class="subtask-header">
        <span class="subtask-id">${parentTaskId}.${subtaskIdStr}</span>
        <span class="subtask-title" data-subtask-field="title"></span>
        <span class="subtask-status ${statusClass}">${subtask.status}</span>
      </div>
    </div>`;
  }

  private getSubtaskStatusClass(status: string): string {
    return status.toLowerCase().replace(/[^a-z0-9]/g, "-");
  }

  private generateTaskHeader(
    task: Task,
    statusClass: string,
    statusDisplay: string,
    isExecutable: boolean
  ): string {
    const executableIcon = ""; // Disabled for now
    const executableClass = ""; // Disabled for now

    return `<div class="task-header${executableClass}">
      <svg class="task-expand-icon" viewBox="0 0 16 16" fill="currentColor" onclick="toggleTask(this.closest('.task-item'))">
        <path d="m12.14 8.753-5.482 4.796c-.646.566-1.658.106-1.658-.753V3.204a1 1 0 0 1 1.659-.753l5.48 4.796a1 1 0 0 1 0 1.506z"/>
      </svg>
      <span class="task-id">${task.id}</span>
      <span class="task-title" data-task-field="title"></span>
      <span class="task-status ${statusClass}">${statusDisplay}</span>
      ${executableIcon}
    </div>`;
  }

  private generateTaskDetails(task: Task): string {
    return `<div class="task-details">
      <div class="task-description" data-task-field="description"></div>
      ${this.generateTestStrategy(task)}
      ${this.generateTaskMeta(task)}
      ${this.generateDependencies(task)}
      ${this.generateTestResults(task)}
      ${this.generateActions(task)}
    </div>`;
  }

  private generateTestStrategy(task: Task): string {
    return `<div class="task-test-strategy">
      <div class="test-strategy-title">Test Strategy</div>
      <div class="test-strategy-content" data-task-field="testStrategy"></div>
    </div>`;
  }

  private generateTaskMeta(task: Task): string {
    const complexityClass = `complexity-${task.complexity}`;

    return `<div class="task-meta">
      <div class="meta-item">
        <div class="meta-label">Complexity</div>
        <div class="meta-value ${complexityClass}">${
      task.complexity.charAt(0).toUpperCase() + task.complexity.slice(1)
    }</div>
      </div>
      <div class="meta-item">
        <div class="meta-label">Estimated</div>
        <div class="meta-value">${
          task.estimatedDuration || "Not specified"
        }</div>
      </div>
    </div>`;
  }

  private generateDependencies(task: Task): string {
    return `<div class="dependencies">
      <div class="dependencies-title">Dependencies</div>
      <div class="dependency-list" data-task-field="dependencies">
        <!-- Dependencies will be populated via postMessage -->
      </div>
    </div>`;
  }

  private generateTestResults(task: Task): string {
    if (!task.testStatus || task.testStatus.totalTests === 0) {
      return '<div class="no-tests">No tests available yet</div>';
    }

    const testStatus = task.testStatus;
    const hasFailures = testStatus.failedTests > 0;

    return `<div class="test-results">
      <div class="test-header">
        <div class="test-title">Test Results</div>
        <div class="test-date">Last run: ${
          testStatus.lastRunDate
            ? this.formatRelativeTime(testStatus.lastRunDate)
            : "Not run yet"
        }</div>
      </div>
      ${this.generateTestStats(testStatus)}
      ${
        hasFailures
          ? this.generateFailuresSection(testStatus.failingTestsList || [])
          : ""
      }
    </div>`;
  }

  private generateTestStats(testStatus: any): string {
    return `<div class="test-stats">
      <div class="test-stat">
        <div class="test-stat-value test-total">${testStatus.totalTests}</div>
        <div class="test-stat-label">Total</div>
      </div>
      <div class="test-stat">
        <div class="test-stat-value test-passed">${testStatus.passedTests}</div>
        <div class="test-stat-label">Passed</div>
      </div>
      <div class="test-stat">
        <div class="test-stat-value test-failed">${testStatus.failedTests}</div>
        <div class="test-stat-label">Failed</div>
      </div>
    </div>`;
  }

  private generateFailuresSection(failingTestsList: any[]): string {
    if (!failingTestsList || failingTestsList.length === 0) {
      return "";
    }

    const failuresHTML = failingTestsList
      .map(
        (failure) => `
        <div class="failure-item">
          <div class="failure-name" data-failure-field="name"></div>
          <div class="failure-message" data-failure-field="message"></div>
        </div>
      `
      )
      .join("");

    return `<div class="failures-section">
      <div class="failures-header" onclick="toggleFailures(this.parentElement)">
        <span>${failingTestsList.length} Failed Tests</span>
        <svg class="failure-toggle-icon" viewBox="0 0 16 16" fill="currentColor" width="12" height="12">
          <path d="m12.14 8.753-5.482 4.796c-.646.566-1.658.106-1.658-.753V3.204a1 1 0 0 1 1.659-.753l5.48 4.796a1 1 0 0 1 0 1.506z"/>
        </svg>
      </div>
      <div class="failures-list">
        ${failuresHTML}
      </div>
    </div>`;
  }

  private generateActions(task: Task): string {
    return `<div class="actions">
      <!-- Actions removed for demo presentation -->
    </div>`;
  }

  private formatRelativeTime(dateString: string): string {
    // Simple implementation for now
    return new Date(dateString).toLocaleString();
  }

  /**
   * Get bundled CSS content (bundled at build time, no file system access)
   */
  private getInlineCSS(): string {
    // CSS is now bundled at build time via webpack raw-loader
    return cssContent;
  }

  /**
   * Get cached JavaScript content for webview (loaded once, used forever)
   * Uses VSCode extension context for proper resource loading
   */
  private getInlineJavaScript(): string {
    // Return cached JavaScript if already loaded
    if (TaskHTMLGenerator.jsCache) {
      return TaskHTMLGenerator.jsCache;
    }

    try {
      // Use VSCode extension URI to properly resolve the webview.js path
      const jsUri = vscode.Uri.joinPath(this.extensionUri, 'src', 'tasks', 'providers', 'webview.js');
      TaskHTMLGenerator.jsCache = fs.readFileSync(jsUri.fsPath, "utf8");
      return TaskHTMLGenerator.jsCache;
    } catch (error) {
      console.warn(
        "TaskHTMLGenerator: Could not read webview.js, using fallback:",
        error
      );
      // Fallback to minimal JavaScript if file reading fails
      const fallbackJS = `
        function toggleTask(taskElement) {
          const taskId = taskElement.dataset.taskId;
          if (!taskId) return;
          
          const isExpanded = taskElement.classList.contains('expanded');
          document.querySelectorAll('.task-item.expanded').forEach(item => {
            item.classList.remove('expanded');
          });
          
          if (!isExpanded) {
            taskElement.classList.add('expanded');
          }
        }
      `;
      TaskHTMLGenerator.jsCache = fallbackJS;
      return fallbackJS;
    }
  }
}
