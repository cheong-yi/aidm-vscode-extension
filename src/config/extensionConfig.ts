/**
 * Global Extension Configuration
 * Change these values to rebrand the extension
 */

export const EXTENSION_CONFIG = {
  // Extension Identity
  name: "aidm-vscode-extension",
  displayName: "AiDM VSCode Extension",
  description:
    "Bridge business requirements and code implementation with AI-powered context for enterprise development",

  // Command Category (appears in Command Palette)
  commandCategory: "AiDM",

  // Configuration Namespace
  configNamespace: "aidmVscodeExtension",

  // Publisher Info
  publisher: "aidm-team",

  // Branding
  outputChannelName: "AiDM Extension",
  statusBarPrefix: "AiDM:",

  // Messages
  activationMessage: "🚀 AiDM Extension: Starting activation...",
  successMessage: "✅ AiDM Extension: Activated successfully!",
  helloMessage: "👋 Hello from AiDM VSCode Extension!",

  // Demo/Presentation specific
  demoTitle: "AiDM VSCode Extension Demo",
  demoOutputChannel: "AiDM Demo",
} as const;

// Helper function to get command ID
export function getCommandId(command: string): string {
  return `${EXTENSION_CONFIG.name}.${command}`;
}

// Helper function to get configuration key
export function getConfigKey(key: string): string {
  return `${EXTENSION_CONFIG.configNamespace}.${key}`;
}
