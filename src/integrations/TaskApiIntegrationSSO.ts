/**
 * TaskApiIntegrationSSO - Enhanced integration using existing SSO authentication
 * Automatically manages authentication using AuthService
 *
 * NOTE: This is a stub implementation - SSO integration is not yet complete
 */

import * as vscode from 'vscode';
import { TasksDataService } from '../services/TasksDataService';
import { AuthService } from '../auth/authService';

// Stub implementation to prevent compilation errors - SSO integration is incomplete
export class TaskApiIntegrationSSO {
  constructor(
    private tasksDataService: TasksDataService,
    private authService: AuthService,
    private context: vscode.ExtensionContext
  ) {
    console.warn('[TaskApiIntegrationSSO] SSO integration is not yet implemented');
  }

  async initialize(): Promise<void> {
    console.warn('[TaskApiIntegrationSSO] SSO integration is not yet implemented');
  }

  dispose(): void {
    console.warn('[TaskApiIntegrationSSO] SSO integration is not yet implemented');
  }
}