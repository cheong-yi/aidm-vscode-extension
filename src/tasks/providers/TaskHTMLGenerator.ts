import * as vscode from "vscode";
import { Task, TaskStatus, STATUS_DISPLAY_NAMES } from "../../types/tasks";
// Import bundled CSS content at build time
import cssContent from './styles.css';
// Import bundled JavaScript content at build time
import jsContent from './webview.js';

/**
 * TaskHTMLGenerator - Responsible for generating all HTML content for the task webview
 * Extracted from TaskWebviewProvider to maintain single responsibility principle
 */
export class TaskHTMLGenerator {
  private logoDataUri: string = "";
  private webview?: vscode.Webview;
  private static templateCache = new Map<string, string>();
  
  // CSS and JavaScript now bundled at build time (no caching needed)

  constructor(private extensionUri: vscode.Uri) {}

  /**
   * Load template from external file with caching using VSCode filesystem API
   */
  private async loadTemplate(templateName: string): Promise<string> {
    if (!TaskHTMLGenerator.templateCache.has(templateName)) {
      const templateUri = vscode.Uri.joinPath(
        this.extensionUri, 
        'src', 'tasks', 'templates', 
        `${templateName}.html`
      );
      
      try {
        const templateBytes = await vscode.workspace.fs.readFile(templateUri);
        const template = Buffer.from(templateBytes).toString('utf8');
        TaskHTMLGenerator.templateCache.set(templateName, template);
      } catch (error) {
        console.warn(`Failed to load template ${templateName}:`, error);
        // Fallback to inline template
        TaskHTMLGenerator.templateCache.set(templateName, this.getFallbackTemplate(templateName));
      }
    }
    return TaskHTMLGenerator.templateCache.get(templateName)!;
  }

  /**
   * Provide fallback templates for critical templates
   */
  private getFallbackTemplate(templateName: string): string {
    switch (templateName) {
      case 'task-item':
        return '<div class="task-item" data-task-id="{{id}}" data-assignee="{{assignee}}">{{header}}{{details}}{{subtasks}}</div>';
      case 'task-header':
        return '<div class="task-header{{executableClass}}"><svg class="task-expand-icon" viewBox="0 0 16 16" fill="currentColor" onclick="toggleTask(this.closest(\'.task-item\'))"><path d="m12.14 8.753-5.482 4.796c-.646.566-1.658.106-1.658-.753V3.204a1 1 0 0 1 1.659-.753l5.48 4.796a1 1 0 0 1 0 1.506z"/></svg><span class="task-id">{{id}}</span><span class="task-title" data-task-field="title"></span><span class="task-status {{statusClass}}">{{statusDisplay}}</span>{{executableIcon}}</div>';
      case 'task-details':
        return '<div class="task-details"><div class="task-description" data-task-field="description"></div>{{testStrategy}}{{taskMeta}}{{dependencies}}{{testResults}}{{actions}}</div>';
      default:
        return '<div>{{content}}</div>';
    }
  }

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
  async generateFullHTML(tasks: Task[], expandedId: string | null = null, authStatusBanner: string = ''): Promise<string> {
    return await this.generateTaskmasterHTML(tasks, authStatusBanner);
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
  private async generateTaskmasterHTML(tasks: Task[], authStatusBanner: string = ''): Promise<string> {
    const taskListHTML =
      tasks.length > 0
        ? (await Promise.all(tasks.map((task) => this.generateTaskItem(task)))).join("")
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
${this.getAuthStatusCSS()}
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
            ${authStatusBanner}
            ${this.generateWebviewHeader()}
            <div class="task-list">
                ${taskListHTML}
            </div>
        </div>
    </div>
    <script>
${this.getInlineJavaScript()}
${this.getAuthJavaScript()}
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
  private async generateTaskItem(task: Task): Promise<string> {
    const statusClass = this.getStatusClass(task.status);
    const statusDisplay = STATUS_DISPLAY_NAMES[task.status] || task.status;
    const isExecutable = false; // Disabled for now
    const subtasksHtml = this.generateSubtasksSection(task);
    const assignee = task.assignee || "dev-team";

    const template = await this.loadTemplate('task-item');
    return template
      .replace('{{id}}', task.id)
      .replace('{{assignee}}', assignee)
      .replace('{{header}}', await this.generateTaskHeader(task, statusClass, statusDisplay, isExecutable))
      .replace('{{details}}', await this.generateTaskDetails(task))
      .replace('{{subtasks}}', subtasksHtml);
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

  private async generateTaskHeader(
    task: Task,
    statusClass: string,
    statusDisplay: string,
    isExecutable: boolean
  ): Promise<string> {
    const executableIcon = ""; // Disabled for now
    const executableClass = ""; // Disabled for now

    const template = await this.loadTemplate('task-header');
    return template
      .replace('{{executableClass}}', executableClass)
      .replace('{{id}}', task.id)
      .replace('{{statusClass}}', statusClass)
      .replace('{{statusDisplay}}', statusDisplay)
      .replace('{{executableIcon}}', executableIcon);
  }

  private async generateTaskDetails(task: Task): Promise<string> {
    const template = await this.loadTemplate('task-details');
    return template
      .replace('{{testStrategy}}', this.generateTestStrategy(task))
      .replace('{{taskMeta}}', this.generateTaskMeta(task))
      .replace('{{dependencies}}', this.generateDependencies(task))
      .replace('{{testResults}}', this.generateTestResults(task))
      .replace('{{actions}}', this.generateActions(task));
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
   * Get bundled JavaScript content (bundled at build time, no file system access)
   */
  private getInlineJavaScript(): string {
    // JavaScript is now bundled at build time via webpack raw-loader
    return jsContent;
  }

  /**
   * Get authentication status CSS
   * @private method for auth UI styling
   */
  private getAuthStatusCSS(): string {
    return `
      /* Authentication Status Styles */
      .auth-status {
        margin: 8px 0;
        padding: 8px 12px;
        border-radius: 4px;
        display: flex;
        align-items: center;
        font-size: 12px;
        border: 1px solid transparent;
      }

      .auth-status.authenticated {
        background-color: var(--vscode-editorGutter-addedBackground, rgba(129, 184, 139, 0.1));
        border-color: var(--vscode-editorGutter-addedBackground, rgba(129, 184, 139, 0.3));
        color: var(--vscode-editor-foreground);
      }

      .auth-status.contextual-prompt {
        background-color: var(--vscode-editorWarning-background, rgba(255, 193, 7, 0.1));
        border-color: var(--vscode-editorWarning-foreground, rgba(255, 193, 7, 0.3));
        color: var(--vscode-editor-foreground);
        flex-direction: column;
        align-items: stretch;
      }

      .auth-status.persistent-prompt {
        background-color: var(--vscode-editorError-background, rgba(255, 86, 86, 0.1));
        border-color: var(--vscode-editorError-foreground, rgba(255, 86, 86, 0.3));
        color: var(--vscode-editor-foreground);
        flex-direction: column;
        align-items: stretch;
      }

      .auth-status.offline-mode {
        background-color: var(--vscode-editorInfo-background, rgba(54, 162, 235, 0.1));
        border-color: var(--vscode-editorInfo-foreground, rgba(54, 162, 235, 0.3));
        color: var(--vscode-editor-foreground);
      }

      .auth-indicator {
        margin-right: 6px;
        font-size: 14px;
      }

      .auth-text {
        flex: 1;
      }

      .auth-prompt-content {
        display: flex;
        flex-direction: column;
        gap: 8px;
      }

      .auth-prompt-content > :first-child {
        display: flex;
        align-items: center;
        margin-bottom: 4px;
      }

      .auth-prompt-icon {
        margin-right: 6px;
        font-size: 14px;
      }

      .auth-prompt-text {
        flex: 1;
        font-size: 11px;
        color: var(--vscode-descriptionForeground);
      }

      .auth-login-btn, .auth-offline-btn {
        background: var(--vscode-button-background);
        color: var(--vscode-button-foreground);
        border: none;
        border-radius: 2px;
        padding: 4px 8px;
        font-size: 11px;
        cursor: pointer;
        margin-right: 6px;
      }

      .auth-login-btn:hover, .auth-offline-btn:hover {
        background: var(--vscode-button-hoverBackground);
      }

      .auth-offline-btn {
        background: var(--vscode-button-secondaryBackground, rgba(255, 255, 255, 0.1));
        color: var(--vscode-button-secondaryForeground, var(--vscode-editor-foreground));
      }

      .auth-offline-btn:hover {
        background: var(--vscode-button-secondaryHoverBackground, rgba(255, 255, 255, 0.15));
      }
    `;
  }

  /**
   * Get authentication JavaScript handlers
   * @private method for auth interaction handlers
   */
  private getAuthJavaScript(): string {
    return `
      // Authentication interaction handlers
      function handleAuthLogin() {
        const vscode = acquireVsCodeApi();
        vscode.postMessage({ type: 'authLogin' });
      }

      function handleOfflineMode() {
        const vscode = acquireVsCodeApi();
        vscode.postMessage({ type: 'offlineMode' });
      }

      function handleRefreshAuth() {
        const vscode = acquireVsCodeApi();
        vscode.postMessage({ type: 'refreshAuth' });
      }
    `;
  }
}
