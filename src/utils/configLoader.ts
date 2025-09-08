import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';

/**
 * Configuration loader with multiple fallback sources
 */
export class ConfigLoader {
  private static readonly CONFIG_FILE = '.aidm/config.json';
  private static readonly ENV_PREFIX = 'AIDM_';

  /**
   * Load configuration with priority order:
   * 1. VS Code settings (highest priority)
   * 2. .aidm/config.json file
   * 3. Environment variables
   * 4. Default values
   */
  static loadConfig(): any {
    const config: any = {};

    // Load from .aidm/config.json file
    const fileConfig = this.loadFileConfig();
    Object.assign(config, fileConfig);

    // Load from environment variables
    const envConfig = this.loadEnvConfig();
    Object.assign(config, envConfig);

    // Load from VS Code settings (highest priority)
    const vscodeConfig = this.loadVSCodeConfig();
    Object.assign(config, vscodeConfig);

    return config;
  }

  /**
   * Load configuration from .aidm/config.json file
   */
  private static loadFileConfig(): any {
    try {
      const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || process.cwd();
      const configPath = path.join(workspaceRoot, this.CONFIG_FILE);
      
      if (fs.existsSync(configPath)) {
        const configData = fs.readFileSync(configPath, 'utf-8');
        const parsed = JSON.parse(configData);
        console.log(`📁 Loaded configuration from ${this.CONFIG_FILE}`);
        return parsed;
      }
    } catch (error) {
      console.warn(`⚠️  Failed to load ${this.CONFIG_FILE}:`, error);
    }
    return {};
  }

  /**
   * Load configuration from environment variables
   */
  private static loadEnvConfig(): any {
    const config: any = {};
    
    // MCP Server settings
    if (process.env[`${this.ENV_PREFIX}MCP_PORT`]) {
      config.mcpServer = config.mcpServer || {};
      config.mcpServer.port = parseInt(process.env[`${this.ENV_PREFIX}MCP_PORT`]!);
    }
    
    if (process.env[`${this.ENV_PREFIX}MCP_TIMEOUT`]) {
      config.mcpServer = config.mcpServer || {};
      config.mcpServer.timeout = parseInt(process.env[`${this.ENV_PREFIX}MCP_TIMEOUT`]!);
    }

    // Mock settings
    if (process.env[`${this.ENV_PREFIX}MOCK_ENABLED`]) {
      config.mock = config.mock || {};
      config.mock.enabled = process.env[`${this.ENV_PREFIX}MOCK_ENABLED`] === 'true';
    }

    if (Object.keys(config).length > 0) {
      console.log('🔧 Loaded configuration from environment variables');
    }
    
    return config;
  }

  /**
   * Load configuration from VS Code settings
   */
  private static loadVSCodeConfig(): any {
    const config = vscode.workspace.getConfiguration();
    const vscodeConfig: any = {};

    // MCP Server settings
    const mcpPort = config.get<number>('aidmVscodeExtension.mcpServer.port');
    if (mcpPort !== undefined) {
      vscodeConfig.mcpServer = vscodeConfig.mcpServer || {};
      vscodeConfig.mcpServer.port = mcpPort;
    }

    const mcpTimeout = config.get<number>('aidmVscodeExtension.mcpServer.timeout');
    if (mcpTimeout !== undefined) {
      vscodeConfig.mcpServer = vscodeConfig.mcpServer || {};
      vscodeConfig.mcpServer.timeout = mcpTimeout;
    }

    // Mock settings
    const mockEnabled = config.get<boolean>('aidmVscodeExtension.mock.enabled');
    if (mockEnabled !== undefined) {
      vscodeConfig.mock = vscodeConfig.mock || {};
      vscodeConfig.mock.enabled = mockEnabled;
    }

    if (Object.keys(vscodeConfig).length > 0) {
      console.log('⚙️  Loaded configuration from VS Code settings');
    }

    return vscodeConfig;
  }

  /**
   * Get specific configuration value with fallback
   */
  static getConfigValue<T>(key: string, defaultValue: T): T {
    const config = this.loadConfig();
    const keys = key.split('.');
    let value: any = config;
    
    for (const k of keys) {
      if (value && typeof value === 'object' && k in value) {
        value = value[k];
      } else {
        return defaultValue;
      }
    }
    
    return value !== undefined ? value : defaultValue;
  }
}
