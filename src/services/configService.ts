/**
 * Configuration Service
 * Manages enterprise configuration using VSCode settings API exclusively
 */

import * as vscode from 'vscode';

export interface EnterpriseSettings {
    enabled: boolean;
    ssoProvider: 'microsoft' | 'okta' | 'custom';
    auditEnabled: boolean;
    multiTenant: boolean;
}

export class ConfigService {
    private readonly configChangeEmitter = new vscode.EventEmitter<void>();
    private disposable: vscode.Disposable;

    constructor(private context: vscode.ExtensionContext) {
        // Watch for configuration changes using VSCode's built-in API
        this.disposable = vscode.workspace.onDidChangeConfiguration((event) => {
            if (event.affectsConfiguration('aidmVscodeExtension.enterprise')) {
                this.configChangeEmitter.fire();
            }
        });
    }

    /**
     * Get current enterprise configuration from VSCode settings
     */
    public getEnterpriseConfig(): EnterpriseSettings {
        const config = vscode.workspace.getConfiguration('aidmVscodeExtension.enterprise');

        return {
            enabled: config.get('enabled', false),
            ssoProvider: config.get('sso.provider', 'microsoft') as 'microsoft' | 'okta' | 'custom',
            auditEnabled: config.get('audit.enabled', false),
            multiTenant: config.get('multiTenant', false)
        };
    }

    /**
     * Register callback for configuration changes
     */
    public onConfigChanged(callback: () => void): vscode.Disposable {
        return this.configChangeEmitter.event(callback);
    }

    /**
     * Check if enterprise features are enabled
     */
    public isEnterpriseEnabled(): boolean {
        const config = vscode.workspace.getConfiguration('aidmVscodeExtension.enterprise');
        return config.get('enabled', false);
    }

    /**
     * Check if a specific feature is enabled
     */
    public isFeatureEnabled(feature: string): boolean {
        const config = vscode.workspace.getConfiguration('aidmVscodeExtension.enterprise');

        // Map common feature checks to configuration keys
        switch (feature) {
            case 'sso':
                return config.get('sso.enforcement', 'optional') !== 'optional';
            case 'audit':
                return config.get('audit.enabled', false);
            case 'multiTenant':
                return config.get('multiTenant', false);
            case 'offlineMode':
                return config.get('features.offlineMode', true);
            case 'apiIntegration':
                return config.get('features.apiIntegration', true);
            case 'taskStreaming':
                return config.get('features.taskStreaming', false);
            case 'webhookIntegration':
                return config.get('features.webhookIntegration', false);
            case 'advancedReporting':
                return config.get('features.advancedReporting', false);
            case 'performanceMonitoring':
                return config.get('features.performanceMonitoring', false);
            case 'dataExport':
                return config.get('features.dataExport', true);
            case 'bulkOperations':
                return config.get('features.bulkOperations', false);
            case 'customBranding':
                return config.get('features.customBranding', false);
            case 'userManagement':
                return config.get('features.userManagement', false);
            default:
                return false;
        }
    }

    /**
     * Get full enterprise configuration for internal use
     */
    public getFullEnterpriseConfiguration(): any {
        const config = vscode.workspace.getConfiguration('aidmVscodeExtension.enterprise');

        return {
            enabled: config.get('enabled', false),
            multiTenant: config.get('multiTenant', false),
            defaultTenant: config.get('defaultTenant', 'default'),

            sso: {
                provider: config.get('sso.provider', 'microsoft'),
                enforcement: config.get('sso.enforcement', 'optional'),
                clientId: config.get('sso.clientId', ''),
                authority: config.get('sso.authority', ''),
                scopes: config.get('sso.scopes', ['openid', 'profile', 'email'])
            },

            features: {
                offlineMode: config.get('features.offlineMode', true),
                apiIntegration: config.get('features.apiIntegration', true),
                taskStreaming: config.get('features.taskStreaming', false),
                webhookIntegration: config.get('features.webhookIntegration', false),
                advancedReporting: config.get('features.advancedReporting', false),
                performanceMonitoring: config.get('features.performanceMonitoring', false),
                dataExport: config.get('features.dataExport', true),
                bulkOperations: config.get('features.bulkOperations', false),
                customBranding: config.get('features.customBranding', false),
                userManagement: config.get('features.userManagement', false)
            },

            audit: {
                enabled: config.get('audit.enabled', false),
                level: config.get('audit.level', 'standard'),
                destinations: config.get('audit.destinations', ['local']),
                retention: config.get('audit.retention', 365),
                sensitiveDataMasking: config.get('audit.sensitiveDataMasking', true)
            },

            compliance: {
                dataRetentionDays: config.get('compliance.dataRetentionDays', 365),
                encryptionAtRest: config.get('compliance.encryptionAtRest', false),
                encryptionInTransit: config.get('compliance.encryptionInTransit', true),
                requireMFA: config.get('compliance.requireMFA', false),
                sessionTimeout: config.get('compliance.sessionTimeout', 480),
                maxConcurrentSessions: config.get('compliance.maxConcurrentSessions', 3),
                ipWhitelist: config.get('compliance.ipWhitelist', [])
            },

            branding: {
                companyName: config.get('branding.companyName', ''),
                logoUrl: config.get('branding.logoUrl', ''),
                primaryColor: config.get('branding.primaryColor', '#0078d4'),
                secondaryColor: config.get('branding.secondaryColor', '#106ebe'),
                customCSS: config.get('branding.customCSS', '')
            },

            system: {
                maxUsers: config.get('system.maxUsers', 1000),
                apiRateLimit: config.get('system.apiRateLimit', 1000),
                memoryLimit: config.get('system.memoryLimit', 512)
            },

            monitoring: {
                enabled: config.get('monitoring.enabled', false),
                alertEmail: config.get('monitoring.alertEmail', []),
                errorRateThreshold: config.get('monitoring.errorRateThreshold', 5),
                responseTimeThreshold: config.get('monitoring.responseTimeThreshold', 5000)
            }
        };
    }

    /**
     * Dispose of resources
     */
    public dispose(): void {
        this.disposable.dispose();
        this.configChangeEmitter.dispose();
    }
}