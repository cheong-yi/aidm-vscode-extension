/**
 * TaskApiTokenProvider - Simple interface for token management
 * Follows existing auth patterns from AuthService
 */

export interface TaskApiTokenProvider {
  /**
   * Get current authentication token
   * @returns Bearer token or null if not authenticated
   */
  getToken(): string | null;

  /**
   * Get current user email
   * @returns User email or null if not authenticated
   */
  getUserEmail(): string | null;

  /**
   * Check if user is currently authenticated
   */
  isAuthenticated(): boolean;

  /**
   * Get user context for API calls
   */
  getUserContext(): {
    email: string;
    agencyId: number;
    projectId: number;
  } | null;
}