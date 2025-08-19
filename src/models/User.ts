/**
 * User Models
 * Type definitions for user-related entities
 */

export interface User {
  id: string;
  username: string;
  email: string;
  phone?: string;
  ssn?: string;
  mfaEnabled: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserProfile {
  userId: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  preferences?: Record<string, any>;
  updatedAt: Date;
}

export interface AuthenticationResult {
  success: boolean;
  user?: User;
  sessionToken?: string;
  expiresAt?: Date;
  error?: string;
  requiresMFA?: boolean;
  mfaChallenge?: string;
}
