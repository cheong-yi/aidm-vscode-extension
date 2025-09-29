/**
 * UserIdentityService - Resolves stable user IDs from email addresses
 * Provides caching and fallback mechanisms for user identity resolution
 */

import * as vscode from 'vscode';

export interface UserIdentity {
  email: string;
  stableUserId: string;
  resolvedAt: number;
  agencyId: number;
  projectId: number;
}

export interface IdentityResolutionResult {
  success: boolean;
  stableUserId?: string;
  error?: string;
  fallbackToEmail?: boolean;
}

export class UserIdentityService {
  private readonly CACHE_KEY_PREFIX = 'userIdentity';
  private readonly CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
  private readonly API_TIMEOUT_MS = 5000;

  constructor(
    private baseUrl: string,
    private getAuthHeaders: () => Record<string, string>
  ) {}

  /**
   * Resolve stable user ID from email with caching
   */
  async resolveStableUserId(
    email: string,
    agencyId: number,
    projectId: number
  ): Promise<IdentityResolutionResult> {
    try {
      // Check cache first
      const cached = await this.getCachedIdentity(email);
      if (cached && this.isCacheValid(cached)) {
        return {
          success: true,
          stableUserId: cached.stableUserId,
        };
      }

      // Resolve via API
      const resolved = await this.resolveFromApi(email, agencyId, projectId);
      if (resolved.success && resolved.stableUserId) {
        // Cache the result
        await this.cacheIdentity({
          email,
          stableUserId: resolved.stableUserId,
          resolvedAt: Date.now(),
          agencyId,
          projectId,
        });

        return resolved;
      }

      // Fallback to email if resolution fails
      console.warn(`Failed to resolve stable user ID for ${email}, falling back to email`);
      return {
        success: true,
        stableUserId: email,
        fallbackToEmail: true,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`Identity resolution failed for ${email}:`, errorMessage);

      // Fallback to email on any error
      return {
        success: true,
        stableUserId: email,
        fallbackToEmail: true,
        error: errorMessage,
      };
    }
  }

  /**
   * Resolve user identity via API call
   */
  private async resolveFromApi(
    email: string,
    agencyId: number,
    projectId: number
  ): Promise<IdentityResolutionResult> {
    try {
      const url = `${this.baseUrl}/API/v1/identity/resolve`;
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          ...this.getAuthHeaders(),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          agencyId,
          projectId,
        }),
        signal: AbortSignal.timeout(this.API_TIMEOUT_MS),
      });

      if (!response.ok) {
        return {
          success: false,
          error: `HTTP ${response.status}: ${response.statusText}`,
        };
      }

      const data = await response.json();

      if (!data.stableUserId) {
        return {
          success: false,
          error: 'Invalid response: missing stableUserId',
        };
      }

      return {
        success: true,
        stableUserId: data.stableUserId,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  /**
   * Get cached identity from VSCode workspace storage
   */
  private async getCachedIdentity(email: string): Promise<UserIdentity | null> {
    try {
      const cacheKey = `${this.CACHE_KEY_PREFIX}.${email}`;
      const cached = await vscode.workspace.getConfiguration().get<UserIdentity>(cacheKey);
      return cached || null;
    } catch (error) {
      console.warn('Failed to read cached identity:', error);
      return null;
    }
  }

  /**
   * Cache identity in VSCode workspace storage
   */
  private async cacheIdentity(identity: UserIdentity): Promise<void> {
    try {
      const cacheKey = `${this.CACHE_KEY_PREFIX}.${identity.email}`;
      const config = vscode.workspace.getConfiguration();
      await config.update(cacheKey, identity, vscode.ConfigurationTarget.Workspace);
    } catch (error) {
      console.warn('Failed to cache identity:', error);
      // Don't throw - caching failure shouldn't break the flow
    }
  }

  /**
   * Check if cached identity is still valid
   */
  private isCacheValid(identity: UserIdentity): boolean {
    const now = Date.now();
    const age = now - identity.resolvedAt;
    return age < this.CACHE_TTL_MS;
  }

  /**
   * Clear cached identity for a specific email
   */
  async clearCachedIdentity(email: string): Promise<void> {
    try {
      const cacheKey = `${this.CACHE_KEY_PREFIX}.${email}`;
      const config = vscode.workspace.getConfiguration();
      await config.update(cacheKey, undefined, vscode.ConfigurationTarget.Workspace);
    } catch (error) {
      console.warn('Failed to clear cached identity:', error);
    }
  }

  /**
   * Clear all cached identities
   */
  async clearAllCachedIdentities(): Promise<void> {
    try {
      const config = vscode.workspace.getConfiguration();
      const allSettings = config.inspect('');

      if (allSettings?.workspaceValue) {
        const workspaceSettings = allSettings.workspaceValue as Record<string, any>;

        for (const key of Object.keys(workspaceSettings)) {
          if (key.startsWith(this.CACHE_KEY_PREFIX)) {
            await config.update(key, undefined, vscode.ConfigurationTarget.Workspace);
          }
        }
      }
    } catch (error) {
      console.warn('Failed to clear all cached identities:', error);
    }
  }
}