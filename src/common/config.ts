/**
 * Central configuration for the AIDM VSCode Extension
 * Includes OAuth configuration and authentication behavior settings
 */

export enum AuthPromptStrategy {
  CONTEXTUAL = 'contextual',    // Show prompt when API needed
  PERSISTENT = 'persistent',    // Always show if not authenticated
  NEVER = 'never'               // Never show prompts (enterprise override)
}

/**
 * Environment-aware configuration that supports multiple deployment environments
 * Production values should be set via VS Code settings or environment variables
 */
function getEnvironmentConfig() {
  // Try to get configuration from VS Code settings first, then fall back to environment variables
  const vscodeConfig = require('vscode').workspace?.getConfiguration?.('aidmVscodeExtension');

  return {
    tenantId: vscodeConfig?.get('auth.tenantId') || process.env.AIDM_TENANT_ID || 'common',
    clientId: vscodeConfig?.get('auth.clientId') || process.env.AIDM_CLIENT_ID || '',
    apiBaseUrl: vscodeConfig?.get('api.baseUrl') || process.env.AIDM_API_BASE_URL || 'https://aidm-dev.accenture.com/dev'
  };
}

export const CONFIG = {
  auth: {
    get authority() {
      const config = getEnvironmentConfig();
      return `https://login.microsoftonline.com/${config.tenantId}`;
    },
    get clientId() {
      const config = getEnvironmentConfig();
      if (!config.clientId) {
        console.warn('[CONFIG] OAuth client ID not configured. Please set aidmVscodeExtension.auth.clientId in VS Code settings or AIDM_CLIENT_ID environment variable.');
      }
      return config.clientId;
    },
    scopes: 'openid profile email',
    redirectUri: 'http://localhost:3000/callback',
    timeoutSeconds: 30
  },
  api: {
    get baseUrl() {
      const config = getEnvironmentConfig();
      return config.apiBaseUrl;
    }
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

/**
 * PRODUCTION CONFIGURATION NOTES:
 *
 * For production deployment, configure the following VS Code settings:
 * - aidmVscodeExtension.auth.tenantId: Your Azure AD tenant ID or 'common' for multi-tenant
 * - aidmVscodeExtension.auth.clientId: Your registered Azure AD application client ID
 * - aidmVscodeExtension.api.baseUrl: Your production API endpoint URL
 *
 * Alternatively, set environment variables:
 * - AIDM_TENANT_ID: Azure AD tenant ID
 * - AIDM_CLIENT_ID: Azure AD application client ID
 * - AIDM_API_BASE_URL: Production API base URL
 *
 * Security considerations:
 * - Client ID is not sensitive and can be stored in VS Code settings
 * - Never store client secrets in this configuration (use Azure's public client flow)
 * - Tenant ID should match your organization's Azure AD tenant
 * - API base URL should use HTTPS in production
 */