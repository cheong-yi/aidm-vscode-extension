/**
 * RepositoryContextService - Detects repository context for task filtering
 * Single Responsibility: Extract git repository information from workspace
 * Task: REPO-CTX-001
 */

import * as vscode from 'vscode';
import { log } from '../utils/logger';

export interface RepositoryContext {
  /** Repository name (from folder or git remote) */
  repoName: string;

  /** Git remote URL (if available) */
  remoteUrl?: string;

  /** Repository identifier for API calls (sanitized) */
  repoId: string;

  /** Workspace folder */
  workspaceFolder: vscode.WorkspaceFolder;
}

export class RepositoryContextService {
  /**
   * Get repository context for current workspace
   * Falls back gracefully if git is not available
   */
  async getRepositoryContext(): Promise<RepositoryContext | null> {
    const workspaceFolders = vscode.workspace.workspaceFolders;

    if (!workspaceFolders || workspaceFolders.length === 0) {
      log('WARN', 'RepositoryContextService', 'No workspace folder available');
      return null;
    }

    const workspaceFolder = workspaceFolders[0];

    try {
      // Try to get git remote URL
      const gitExtension = vscode.extensions.getExtension('vscode.git')?.exports;
      const api = gitExtension?.getAPI(1);

      if (api && api.repositories.length > 0) {
        const repo = api.repositories[0];
        const remote = repo.state.remotes.find((r: any) => r.name === 'origin');

        if (remote?.fetchUrl) {
          const repoName = this.extractRepoNameFromUrl(remote.fetchUrl);
          const repoId = this.sanitizeRepoId(repoName);

          log('INFO', 'RepositoryContextService', `Detected git repo: ${repoName}`);

          return {
            repoName,
            remoteUrl: remote.fetchUrl,
            repoId,
            workspaceFolder
          };
        }
      }
    } catch (error) {
      log('WARN', 'RepositoryContextService', 'Failed to get git remote', { error });
    }

    // Fallback to workspace folder name
    const repoName = workspaceFolder.name;
    const repoId = this.sanitizeRepoId(repoName);

    log('INFO', 'RepositoryContextService', `Using workspace folder name as repo: ${repoName}`);

    return {
      repoName,
      repoId,
      workspaceFolder
    };
  }

  /**
   * Extract repository name from git remote URL
   * Handles various formats: https, ssh, etc.
   */
  private extractRepoNameFromUrl(url: string): string {
    // Remove .git suffix
    let repoName = url.replace(/\.git$/, '');

    // Extract from various URL formats
    // https://github.com/org/repo -> repo
    // git@github.com:org/repo -> repo
    // ssh://git@github.com/org/repo -> repo

    const httpsMatch = repoName.match(/https?:\/\/[^/]+\/(?:[^/]+\/)*([^/]+)/);
    if (httpsMatch) {
      return httpsMatch[1];
    }

    const sshMatch = repoName.match(/git@[^:]+:(?:[^/]+\/)*([^/]+)/);
    if (sshMatch) {
      return sshMatch[1];
    }

    const pathMatch = repoName.match(/\/([^/]+)$/);
    if (pathMatch) {
      return pathMatch[1];
    }

    return repoName;
  }

  /**
   * Sanitize repository ID for use in API calls
   * Removes special characters, keeps alphanumeric and hyphens
   */
  private sanitizeRepoId(repoName: string): string {
    return repoName
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
  }
}
