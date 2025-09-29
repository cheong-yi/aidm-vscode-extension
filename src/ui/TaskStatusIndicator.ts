/**
 * TaskStatusIndicator - Clear online/offline status indicator
 * Single responsibility: Show task data source status
 */

import * as vscode from 'vscode';

export enum TaskDataSource {
  API_ONLINE = 'api_online',
  LOCAL_OFFLINE = 'local_offline',
  NOT_CONFIGURED = 'not_configured',
  NOT_AUTHENTICATED = 'not_authenticated',
}

export interface TaskStatusInfo {
  source: TaskDataSource;
  user?: string;
  lastFetch?: Date;
  taskCount?: number;
}

export class TaskStatusIndicator {
  private statusBarItem: vscode.StatusBarItem;
  private currentStatus?: TaskStatusInfo;

  constructor() {
    this.statusBarItem = vscode.window.createStatusBarItem(
      vscode.StatusBarAlignment.Right,
      100
    );
  }

  /**
   * Update status display
   */
  updateStatus(status: TaskStatusInfo): void {
    this.currentStatus = status;

    switch (status.source) {
      case TaskDataSource.API_ONLINE:
        this.showOnlineStatus(status);
        break;
      case TaskDataSource.LOCAL_OFFLINE:
        this.showOfflineStatus(status);
        break;
      case TaskDataSource.NOT_CONFIGURED:
        this.showNotConfiguredStatus();
        break;
      case TaskDataSource.NOT_AUTHENTICATED:
        this.showNotAuthenticatedStatus();
        break;
    }

    this.statusBarItem.show();
  }

  /**
   * Hide status indicator
   */
  hide(): void {
    this.statusBarItem.hide();
  }

  /**
   * Dispose resources
   */
  dispose(): void {
    this.statusBarItem.dispose();
  }

  private showOnlineStatus(status: TaskStatusInfo): void {
    this.statusBarItem.text = '$(cloud) Tasks Online';
    this.statusBarItem.tooltip = this.buildOnlineTooltip(status);
    this.statusBarItem.backgroundColor = undefined;
    this.statusBarItem.color = undefined;
    this.statusBarItem.command = 'aidm.taskApi.status';
  }

  private showOfflineStatus(status: TaskStatusInfo): void {
    this.statusBarItem.text = '$(circle-slash) Tasks OFFLINE';
    this.statusBarItem.tooltip = this.buildOfflineTooltip(status);
    this.statusBarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.warningBackground');
    this.statusBarItem.color = undefined;
    this.statusBarItem.command = 'aidm.taskApi.status';
  }

  private showNotConfiguredStatus(): void {
    this.statusBarItem.text = '$(gear) Configure Tasks';
    this.statusBarItem.tooltip = 'Task API not configured. Click to configure.';
    this.statusBarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.errorBackground');
    this.statusBarItem.color = undefined;
    this.statusBarItem.command = 'aidm.taskApi.configure';
  }

  private showNotAuthenticatedStatus(): void {
    this.statusBarItem.text = '$(account) Login Required';
    this.statusBarItem.tooltip = 'Please log in to access tasks. Click to authenticate.';
    this.statusBarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.errorBackground');
    this.statusBarItem.color = undefined;
    this.statusBarItem.command = 'aidm.auth.login'; // Assuming this command exists
  }

  private buildOnlineTooltip(status: TaskStatusInfo): string {
    const parts = [
      'Tasks connected to API',
      '',
      `User: ${status.user || 'Unknown'}`,
    ];

    if (status.lastFetch) {
      parts.push(`Last update: ${this.formatTimestamp(status.lastFetch)}`);
    }

    if (status.taskCount !== undefined) {
      parts.push(`Tasks loaded: ${status.taskCount}`);
    }

    parts.push('', 'Click for details');

    return parts.join('\n');
  }

  private buildOfflineTooltip(status: TaskStatusInfo): string {
    const parts = [
      'OFFLINE MODE - Read Only',
      '',
      'Using local tasks.json file',
      'API connection unavailable',
    ];

    if (status.taskCount !== undefined) {
      parts.push(`Local tasks: ${status.taskCount}`);
    }

    parts.push('', 'Click to configure API connection');

    return parts.join('\n');
  }

  private formatTimestamp(date: Date): string {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMinutes = Math.floor(diffMs / 60000);

    if (diffMinutes < 1) {
      return 'Just now';
    } else if (diffMinutes < 60) {
      return `${diffMinutes} minute${diffMinutes === 1 ? '' : 's'} ago`;
    } else {
      const diffHours = Math.floor(diffMinutes / 60);
      if (diffHours < 24) {
        return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`;
      } else {
        return date.toLocaleString();
      }
    }
  }

  /**
   * Show temporary message (e.g., for connection attempts)
   */
  showTemporaryMessage(message: string, iconId: string, durationMs: number = 3000): void {
    const originalText = this.statusBarItem.text;
    const originalTooltip = this.statusBarItem.tooltip;
    const originalBackground = this.statusBarItem.backgroundColor;

    this.statusBarItem.text = `$(${iconId}) ${message}`;
    this.statusBarItem.tooltip = message;
    this.statusBarItem.backgroundColor = undefined;

    setTimeout(() => {
      this.statusBarItem.text = originalText;
      this.statusBarItem.tooltip = originalTooltip;
      this.statusBarItem.backgroundColor = originalBackground;
    }, durationMs);
  }
}