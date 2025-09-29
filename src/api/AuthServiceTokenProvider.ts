/**
 * AuthServiceTokenProvider - Implementation using existing AuthService
 * Bridges existing SSO auth with task API
 */

import { TaskApiTokenProvider } from './TaskApiTokenProvider';
import { AuthService } from '../auth/authService';

export class AuthServiceTokenProvider implements TaskApiTokenProvider {
  constructor(private authService: AuthService) {}

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
  } | null {
    const authState = this.authService.authState;

    if (!this.isAuthenticated()) {
      return null;
    }

    return {
      email: authState.email,
      agencyId: authState.agency_id,
      projectId: authState.project_id,
    };
  }
}