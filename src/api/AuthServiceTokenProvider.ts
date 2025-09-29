/**
 * AuthServiceTokenProvider - Implementation using existing AuthService
 * Bridges existing SSO auth with task API
 */

import { TaskApiTokenProvider } from './TaskApiTokenProvider';
import { AuthService } from '../auth/authService';
import { UserIdentityService } from '../auth/userIdentityService';

export class AuthServiceTokenProvider implements TaskApiTokenProvider {
  private userIdentityService: UserIdentityService | null = null;
  private cachedUserContext: {
    email: string;
    agencyId: number;
    projectId: number;
    stableUserId?: string;
  } | null = null;

  constructor(private authService: AuthService) {}

  /**
   * Initialize the identity service with base URL
   * Must be called after construction to enable stable user ID resolution
   */
  initializeIdentityService(baseUrl: string): void {
    this.userIdentityService = new UserIdentityService(
      baseUrl,
      () => this.getAuthHeaders()
    );
  }

  getToken(): string | null {
    const authState = this.authService.authState;
    return authState.isLoggedIn ? authState.token : null;
  }

  getUserEmail(): string | null {
    const authState = this.authService.authState;
    return authState.isLoggedIn ? authState.email : null;
  }

  isAuthenticated(): boolean {
    const authState = this.authService.authState;
    return authState.isLoggedIn && !!authState.token;
  }

  getUserContext(): {
    email: string;
    agencyId: number;
    projectId: number;
    stableUserId?: string;
  } | null {
    const authState = this.authService.authState;

    if (!this.isAuthenticated()) {
      return null;
    }

    // Return cached context if available and user hasn't changed
    if (this.cachedUserContext && this.cachedUserContext.email === authState.email) {
      return this.cachedUserContext;
    }

    // Create new context
    const context = {
      email: authState.email,
      agencyId: authState.agency_id,
      projectId: authState.project_id,
    };

    // Attempt async resolution of stable user ID in background
    if (this.userIdentityService) {
      this.resolveStableUserIdAsync(context);
    }

    // Cache and return context (stable user ID will be updated asynchronously)
    this.cachedUserContext = context;
    return context;
  }

  /**
   * Asynchronously resolve stable user ID and update cached context
   */
  private async resolveStableUserIdAsync(context: {
    email: string;
    agencyId: number;
    projectId: number;
    stableUserId?: string;
  }): Promise<void> {
    if (!this.userIdentityService) {
      return;
    }

    try {
      const identityResult = await this.userIdentityService.resolveStableUserId(
        context.email,
        context.agencyId,
        context.projectId
      );

      if (identityResult.success && identityResult.stableUserId) {
        // Update cached context with resolved stable user ID
        if (this.cachedUserContext && this.cachedUserContext.email === context.email) {
          this.cachedUserContext.stableUserId = identityResult.stableUserId;
        }
      }
    } catch (error) {
      console.warn('Failed to resolve stable user ID in background:', error);
    }
  }

  /**
   * Clear cached user context (e.g., on logout)
   */
  clearUserContext(): void {
    this.cachedUserContext = null;
  }

  /**
   * Get authentication headers for API calls
   */
  private getAuthHeaders(): Record<string, string> {
    const token = this.getToken();
    const userContext = this.getUserContext();

    if (!token || !userContext) {
      throw new Error('Authentication required');
    }

    return {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      'X-Agency-ID': userContext.agencyId.toString(),
      'X-Project-ID': userContext.projectId.toString(),
      'X-User-Email': userContext.email,
    };
  }
}