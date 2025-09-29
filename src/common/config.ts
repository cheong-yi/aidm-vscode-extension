/**
 * Stub config file - Replace with actual OAuth configuration
 * This was referenced by the copied auth system
 */

export const CONFIG = {
  auth: {
    authority: 'https://login.microsoftonline.com/your-tenant-id',
    clientId: 'your-client-id',
    scopes: 'openid profile email',
    redirectUri: 'http://localhost:3000/callback'
  },
  api: {
    baseUrl: 'https://aidm-dev.accenture.com/dev'
  }
};

// TODO: Replace with actual OAuth configuration for your organization
// This is just a stub to make the imports work