/**
 * Enterprise Configuration Interfaces
 * Simple interfaces that map directly to VSCode settings schema from package.json
 * Supports static bundling and VSCode extension best practices
 */

import * as vscode from 'vscode';

// Simple configuration that maps directly to package.json settings
export interface EnterpriseSettings {
    enabled: boolean;
    ssoProvider: 'microsoft' | 'okta' | 'custom';
    auditEnabled: boolean;
    multiTenant: boolean;
    defaultTenant: string;
    features: EnterpriseFeatures;
}

export interface EnterpriseFeatures {
    offlineMode: boolean;
    apiIntegration: boolean;
    taskStreaming: boolean;
    advancedReporting: boolean;
    dataExport: boolean;
    bulkOperations: boolean;
    customBranding: boolean;
    userManagement: boolean;
    webhookIntegration: boolean;
    performanceMonitoring: boolean;
}

// Simple SSO configuration
export interface SSOSettings {
    provider: 'microsoft' | 'okta' | 'custom';
    enforcement: 'optional' | 'required' | 'strict';
    clientId: string;
    authority: string;
    scopes: string[];
}

// Simple audit configuration (no SIEM/webhook overengineering)
export interface AuditSettings {
    enabled: boolean;
    level: 'minimal' | 'standard' | 'comprehensive';
    retention: number; // days
    sensitiveDataMasking: boolean;
}

// Simple compliance settings
export interface ComplianceSettings {
    dataRetentionDays: number;
    encryptionAtRest: boolean;
    encryptionInTransit: boolean;
    requireMFA: boolean;
    sessionTimeout: number; // minutes
    maxConcurrentSessions: number;
    ipWhitelist: string[];
}

// Simple branding configuration
export interface BrandingSettings {
    companyName: string;
    logoUrl: string;
    primaryColor: string;
    secondaryColor: string;
    customCSS: string;
}

// Simple system limits
export interface SystemSettings {
    maxUsers: number;
    apiRateLimit: number; // requests per minute
    memoryLimit: number; // MB
}

// Simple monitoring settings
export interface MonitoringSettings {
    enabled: boolean;
    alertEmail: string[];
    errorRateThreshold: number; // percentage
    responseTimeThreshold: number; // milliseconds
}

// Utility functions for VSCode configuration integration
export function getEnterpriseSettings(config: vscode.WorkspaceConfiguration): EnterpriseSettings {
    return {
        enabled: config.get('enabled', false),
        ssoProvider: config.get('sso.provider', 'microsoft') as 'microsoft' | 'okta' | 'custom',
        auditEnabled: config.get('audit.enabled', false),
        multiTenant: config.get('multiTenant', false),
        defaultTenant: config.get('defaultTenant', 'default'),
        features: {
            offlineMode: config.get('features.offlineMode', true),
            apiIntegration: config.get('features.apiIntegration', true),
            taskStreaming: config.get('features.taskStreaming', false),
            advancedReporting: config.get('features.advancedReporting', false),
            dataExport: config.get('features.dataExport', true),
            bulkOperations: config.get('features.bulkOperations', false),
            customBranding: config.get('features.customBranding', false),
            userManagement: config.get('features.userManagement', false),
            webhookIntegration: config.get('features.webhookIntegration', false),
            performanceMonitoring: config.get('features.performanceMonitoring', false)
        }
    };
}

export function getSSOSettings(config: vscode.WorkspaceConfiguration): SSOSettings {
    return {
        provider: config.get('sso.provider', 'microsoft') as 'microsoft' | 'okta' | 'custom',
        enforcement: config.get('sso.enforcement', 'optional') as 'optional' | 'required' | 'strict',
        clientId: config.get('sso.clientId', ''),
        authority: config.get('sso.authority', ''),
        scopes: config.get('sso.scopes', ['openid', 'profile', 'email'])
    };
}

export function getAuditSettings(config: vscode.WorkspaceConfiguration): AuditSettings {
    return {
        enabled: config.get('audit.enabled', false),
        level: config.get('audit.level', 'standard') as 'minimal' | 'standard' | 'comprehensive',
        retention: config.get('audit.retention', 365),
        sensitiveDataMasking: config.get('audit.sensitiveDataMasking', true)
    };
}

export function getComplianceSettings(config: vscode.WorkspaceConfiguration): ComplianceSettings {
    return {
        dataRetentionDays: config.get('compliance.dataRetentionDays', 365),
        encryptionAtRest: config.get('compliance.encryptionAtRest', false),
        encryptionInTransit: config.get('compliance.encryptionInTransit', true),
        requireMFA: config.get('compliance.requireMFA', false),
        sessionTimeout: config.get('compliance.sessionTimeout', 480),
        maxConcurrentSessions: config.get('compliance.maxConcurrentSessions', 3),
        ipWhitelist: config.get('compliance.ipWhitelist', [])
    };
}

export function getBrandingSettings(config: vscode.WorkspaceConfiguration): BrandingSettings {
    return {
        companyName: config.get('branding.companyName', ''),
        logoUrl: config.get('branding.logoUrl', ''),
        primaryColor: config.get('branding.primaryColor', '#0078d4'),
        secondaryColor: config.get('branding.secondaryColor', '#106ebe'),
        customCSS: config.get('branding.customCSS', '')
    };
}

export function getSystemSettings(config: vscode.WorkspaceConfiguration): SystemSettings {
    return {
        maxUsers: config.get('system.maxUsers', 1000),
        apiRateLimit: config.get('system.apiRateLimit', 1000),
        memoryLimit: config.get('system.memoryLimit', 512)
    };
}

export function getMonitoringSettings(config: vscode.WorkspaceConfiguration): MonitoringSettings {
    return {
        enabled: config.get('monitoring.enabled', false),
        alertEmail: config.get('monitoring.alertEmail', []),
        errorRateThreshold: config.get('monitoring.errorRateThreshold', 5),
        responseTimeThreshold: config.get('monitoring.responseTimeThreshold', 5000)
    };
}

// Simple feature flag evaluation
export function isFeatureEnabled(settings: EnterpriseSettings, feature: keyof EnterpriseFeatures): boolean {
    return settings.features[feature] || false;
}

// Helper function to get all enterprise configuration from VSCode settings
export function getFullEnterpriseConfig(): {
    settings: EnterpriseSettings;
    sso: SSOSettings;
    audit: AuditSettings;
    compliance: ComplianceSettings;
    branding: BrandingSettings;
    system: SystemSettings;
    monitoring: MonitoringSettings;
} {
    const config = vscode.workspace.getConfiguration('aidmVscodeExtension.enterprise');

    return {
        settings: getEnterpriseSettings(config),
        sso: getSSOSettings(config),
        audit: getAuditSettings(config),
        compliance: getComplianceSettings(config),
        branding: getBrandingSettings(config),
        system: getSystemSettings(config),
        monitoring: getMonitoringSettings(config)
    };
}

// Simple validation helper
export function isEnterpriseEnabled(): boolean {
    const config = vscode.workspace.getConfiguration('aidmVscodeExtension.enterprise');
    return config.get('enabled', false);
}