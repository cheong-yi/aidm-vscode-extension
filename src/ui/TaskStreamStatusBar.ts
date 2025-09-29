/**
 * TaskStreamStatusBar - Simple status bar indicator for streaming connection
 * Provides visual feedback to users about streaming status
 */

import * as vscode from 'vscode';
import { TaskStreamStatus } from '../services/TaskStreamService';

export class TaskStreamStatusBar {
  private statusBarItem: vscode.StatusBarItem;
  private currentStatus: TaskStreamStatus | null = null;

  constructor() {
    this.statusBarItem = vscode.window.createStatusBarItem(
      vscode.StatusBarAlignment.Right,
      100
    );

    // Default state - hidden until streaming is configured
    this.statusBarItem.hide();
  }

  /**
   * Update status bar based on streaming connection state
   */
  updateStatus(status: TaskStreamStatus): void {
    this.currentStatus = status;

    if (status.connected) {
      this.showConnectedState();
    } else if (status.reconnecting) {
      this.showReconnectingState(status.reconnectAttempts);
    } else {
      this.showDisconnectedState();
    }

    this.statusBarItem.show();
  }

  /**
   * Hide status bar (when streaming is disabled)
   */
  hide(): void {
    this.statusBarItem.hide();
  }

  /**
   * Show status bar with current state
   */
  show(): void {
    if (this.currentStatus) {
      this.updateStatus(this.currentStatus);
    } else {
      this.showDisconnectedState();
    }
    this.statusBarItem.show();
  }

  /**
   * Get current status for external queries
   */
  getCurrentStatus(): TaskStreamStatus | null {
    return this.currentStatus;
  }

  /**
   * Dispose resources
   */
  dispose(): void {
    this.statusBarItem.dispose();
  }

  private showConnectedState(): void {
    this.statusBarItem.text = '$(sync) Tasks Live';
    this.statusBarItem.tooltip = this.buildConnectedTooltip();
    this.statusBarItem.backgroundColor = undefined;
    this.statusBarItem.color = undefined;
    this.statusBarItem.command = 'aidm.taskStream.status';
  }

  private showReconnectingState(attempts: number): void {
    this.statusBarItem.text = '$(sync~spin) Reconnecting...';
    this.statusBarItem.tooltip = this.buildReconnectingTooltip(attempts);
    this.statusBarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.warningBackground');
    this.statusBarItem.color = undefined;
    this.statusBarItem.command = 'aidm.taskStream.status';
  }

  private showDisconnectedState(): void {
    this.statusBarItem.text = '$(circle-slash) Tasks Offline';
    this.statusBarItem.tooltip = this.buildDisconnectedTooltip();
    this.statusBarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.errorBackground');
    this.statusBarItem.color = undefined;
    this.statusBarItem.command = 'aidm.taskStream.configure';
  }

  private buildConnectedTooltip(): string {
    if (!this.currentStatus) return 'Real-time task updates active';

    const parts = [
      'Real-time task updates active',
      '',
      `Connected: ${this.formatTimestamp(this.currentStatus.lastConnected)}`,
    ];

    if (this.currentStatus.reconnectAttempts > 0) {
      parts.push(`Previous reconnection attempts: ${this.currentStatus.reconnectAttempts}`);
    }

    parts.push('', 'Click for connection details');

    return parts.join('\n');
  }

  private buildReconnectingTooltip(attempts: number): string {
    const parts = [
      'Reconnecting to task stream...',
      '',
      `Attempt: ${attempts} of 5`,
    ];

    if (this.currentStatus?.lastConnected) {
      parts.push(`Last connected: ${this.formatTimestamp(this.currentStatus.lastConnected)}`);
    }

    parts.push('', 'Click for connection details');

    return parts.join('\n');
  }

  private buildDisconnectedTooltip(): string {
    const parts = [
      'Task streaming unavailable',
      '',
      'Using local task data only',
    ];

    if (this.currentStatus?.lastConnected) {
      parts.push(`Last connected: ${this.formatTimestamp(this.currentStatus.lastConnected)}`);
    }

    parts.push('', 'Click to configure streaming');

    return parts.join('\n');
  }

  private formatTimestamp(date?: Date): string {
    if (!date) return 'Never';

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
   * Show a temporary status message (e.g., for connection attempts)
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

  /**
   * Check if streaming is configured and show appropriate initial state
   */
  initializeFromConfiguration(): void {
    const config = vscode.workspace.getConfiguration('aidmVscodeExtension.taskStream');
    const enabled = config.get<boolean>('enabled', false);

    if (!enabled) {
      this.hide();
      return;
    }

    // Show disconnected state initially - will be updated when connection attempts are made
    this.currentStatus = {
      connected: false,
      reconnecting: false,
      reconnectAttempts: 0,
    };

    this.showDisconnectedState();
    this.show();
  }
}