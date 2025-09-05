import * as vscode from "vscode";
import { Task, TaskStatus, STATUS_DISPLAY_NAMES } from "../../types/tasks";

/**
 * TaskHTMLGenerator - Responsible for generating all HTML content for the task webview
 * Extracted from TaskWebviewProvider to maintain single responsibility principle
 */
export class TaskHTMLGenerator {
  private logoDataUri: string = "";

  constructor(private extensionUri: vscode.Uri) {}

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
   * Generate loading HTML for workspace initialization state
   */
  generateLoadingHTML(): string {
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="Content-Security-Policy" 
          content="default-src 'none'; style-src 'unsafe-inline' 'self'; script-src 'unsafe-inline' 'self'; img-src vscode-resource: https: data: 'self'; font-src vscode-resource: https: 'self'; connect-src 'self';">
    <title>Taskmaster</title>
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
          content="default-src 'none'; style-src 'unsafe-inline' 'self'; script-src 'unsafe-inline' 'self'; img-src vscode-resource: https: data: 'self'; font-src vscode-resource: https: 'self'; connect-src 'self';">
    <title>Taskmaster Dashboard</title>
    <style>
        ${this.generateStyles()}
    </style>
</head>
<body>
    <!-- NEW: Top-level branding container above sidebar -->
    <div class="top-branding">
        <div class="branding-content">
            <img src="${this.logoDataUri}" alt="AiDM" class="aidm-logo" />
        </div>
    </div>
    
    <!-- MODIFIED: Sidebar without internal branding -->
    <div class="sidebar">
        <div class="sidebar-content">
            ${this.generateWebviewHeader()}
            <div class="task-list">
                ${taskListHTML}
            </div>
        </div>
    </div>
    ${this.generateScripts()}
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
    }" data-assignee="${this.escapeHtml(assignee)}">
      ${this.generateTaskHeader(task, statusClass, statusDisplay, isExecutable)}
      ${this.generateTaskDetails(task)}
      ${subtasksHtml}
    </div>`;
  }

  /**
   * Generate CSS styles for the webview
   */
  private generateStyles(): string {
    return `/* WEBVIEW CONTAINER RESET - CSS-001 */
        html, body {
            margin: 0 !important;
            padding: 0 !important;
            height: 100% !important;
            width: 100% !important;
            overflow: hidden !important;
            background: var(--vscode-sideBar-background, #f3f3f3) !important;
            color: var(--vscode-sideBar-foreground, #333) !important;
            font-family: var(--vscode-font-family, 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif) !important;
            font-size: var(--vscode-font-size, 13px) !important;
            box-sizing: border-box !important;
        }
        
        /* Task container styles */
        .task-item {
            margin-bottom: 12px;
            border: 1px solid var(--vscode-panel-border, #ddd);
            border-radius: 6px;
            background: var(--vscode-editor-background, white);
            overflow: hidden;
        }
        
        .no-tasks {
            padding: 20px;
            text-align: center;
            color: var(--vscode-descriptionForeground, #666);
            font-style: italic;
        }`;
  }

  /**
   * Generate JavaScript for the webview
   */
  private generateScripts(): string {
    return `<script>
      // Placeholder for JavaScript functionality
      console.log('TaskHTMLGenerator scripts loaded');
    </script>`;
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
    // Simplified for initial implementation
    return "";
  }

  private generateTaskHeader(task: Task, statusClass: string, statusDisplay: string, isExecutable: boolean): string {
    return `<div class="task-header ${statusClass}">
      <h3>${this.escapeHtml(task.title)}</h3>
      <span class="status-badge">${statusDisplay}</span>
    </div>`;
  }

  private generateTaskDetails(task: Task): string {
    return `<div class="task-details">
      <p>${this.escapeHtml(task.description || "No description available")}</p>
    </div>`;
  }

  private escapeHtml(text: string | undefined | null): string {
    if (!text) return "";

    const htmlEntities: Record<string, string> = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    };

    return text.replace(/[&<>"']/g, (char) => htmlEntities[char] || char);
  }
}