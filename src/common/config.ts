/**
 * Central configuration for the AIDM VSCode Extension
 * Includes OAuth configuration and authentication behavior settings
 */

export enum AuthPromptStrategy {
  CONTEXTUAL = 'contextual',    // Show prompt when API needed
  PERSISTENT = 'persistent',    // Always show if not authenticated
  NEVER = 'never'               // Never show prompts (enterprise override)
}

export const CONFIG = {
  auth: {
    authority: 'https://login.microsoftonline.com/your-tenant-id',
    clientId: 'your-client-id',
    scopes: 'openid profile email',
    redirectUri: 'http://localhost:3000/callback'
  },
  api: {
    baseUrl: 'https://aidm-dev.accenture.com/dev'
  },
  authentication: {
    enabled: true,
    promptStrategy: AuthPromptStrategy.CONTEXTUAL,
    persistentPrompt: false,
    autoLogin: false,
    allowOfflineMode: true,
    contextualPromptText: 'Sign in to access live task data and API features',
    offlineModeText: 'Working offline - using cached/mock data'
  }
};

// TODO: Replace with actual OAuth configuration for your organization
// Extended with progressive authentication configuration - PROGRESSIVE-002