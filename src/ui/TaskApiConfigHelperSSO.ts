/**
 * TaskApiConfigHelperSSO - Configuration UI for SSO-integrated task API
 * Uses existing AuthService instead of manual token configuration
 *
 * NOTE: This is a stub implementation - SSO integration is not yet complete
 */

import * as vscode from 'vscode';
import { AuthService } from '../auth/authService';

export interface ApiConfigResult {
  configured: boolean;
  requiresReload: boolean;
}

// Stub implementation to prevent compilation errors - SSO integration is incomplete
export class TaskApiConfigHelperSSO {
  static async configureTaskApi(): Promise<ApiConfigResult> {
    console.warn('[TaskApiConfigHelperSSO] SSO integration is not yet implemented');
    vscode.window.showInformationMessage('SSO integration is not yet implemented');
    return { configured: false, requiresReload: false };
  }

  static async testConnection(): Promise<void> {
    console.warn('[TaskApiConfigHelperSSO] SSO integration is not yet implemented');
    vscode.window.showInformationMessage('SSO integration is not yet implemented');
  }
}