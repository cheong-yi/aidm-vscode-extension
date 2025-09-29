/**
 * Enterprise Configuration System
 * Provides comprehensive multi-tenant, audit logging, compliance, and feature flag support
 * for enterprise deployments of the AiDM VSCode Extension
 */

export interface TenantConfig {
    tenantId: string;
    displayName: string;
    ssoProvider: 'microsoft' | 'okta' | 'ping' | 'custom';
    customAuthority?: string;
    clientId: string;
    scopes: string[];
    branding: BrandingConfig;
    complianceProfile: ComplianceProfile;
}

export interface BrandingConfig {
    companyName: string;
    logoUrl?: string;
    logoBase64?: string; // For offline deployments
    primaryColor: string;
    secondaryColor: string;
    accentColor?: string;
    customCSS?: string;
    faviconUrl?: string;
    headerBackgroundColor?: string;
    textColor?: string;
}

export interface AuditConfig {
    enabled: boolean;
    level: 'minimal' | 'standard' | 'comprehensive';
    destinations: AuditDestination[];
    retention: number; // days
    sensitiveDataMasking: boolean;
    includeUserActions: boolean;
    includeSystemEvents: boolean;
    includePerformanceMetrics: boolean;
    batchSize: number;
    flushInterval: number; // milliseconds
    encryptLogs: boolean;
}

export interface AuditDestination {
    type: 'local' | 'siem' | 'cloud' | 'webhook';
    endpoint?: string;
    apiKey?: string;
    headers?: Record<string, string>;
    enabled: boolean;
}

export interface ComplianceProfile {
    dataRetention: {
        userDataDays: number;
        auditLogsDays: number;
        taskDataDays: number;
        autoDelete: boolean;
    };
    encryption: {
        atRest: boolean;
        inTransit: boolean;
        keyRotation: boolean;
        keyRotationDays: number;
    };
    accessControl: {
        requireMFA: boolean;
        sessionTimeout: number; // minutes
        maxConcurrentSessions: number;
        ipWhitelisting: string[]; // CIDR blocks
        geographicRestrictions: string[]; // country codes
    };
    dataExport: {
        enabled: boolean;
        requireApproval: boolean;
        approverRoles: string[];
        maxExportSize: number; // MB
        allowedFormats: ('json' | 'csv' | 'xml')[];
    };
}

export interface EnterpriseFeatureFlags {
    // Authentication & Security
    ssoRequired: boolean;
    ssoEnforcement: 'optional' | 'required' | 'strict';
    offlineMode: boolean;
    localAuthentication: boolean;

    // API & Integration Features
    apiIntegration: boolean;
    taskStreaming: boolean;
    webhookIntegration: boolean;
    thirdPartyConnectors: boolean;
    customApiEndpoints: boolean;

    // Advanced Features
    advancedReporting: boolean;
    analyticsCollection: boolean;
    performanceMonitoring: boolean;
    errorReporting: boolean;

    // Data & Export
    dataExport: boolean;
    bulkOperations: boolean;
    dataImport: boolean;
    backupRestore: boolean;

    // UI & UX
    customBranding: boolean;
    darkModeForced: boolean;
    compactView: boolean;
    advancedFiltering: boolean;

    // Admin & Management
    multiTenant: boolean;
    userManagement: boolean;
    roleBasedAccess: boolean;
    auditLogging: boolean;
    complianceMode: boolean;

    // Development & Debugging
    debugMode: boolean;
    telemetry: boolean;
    betaFeatures: boolean;

    // Administrative overrides (can override user preferences)
    adminOverrides: Record<string, boolean>;
}

export interface SecurityPolicies {
    passwordPolicy: {
        minLength: number;
        requireUppercase: boolean;
        requireLowercase: boolean;
        requireNumbers: boolean;
        requireSpecialChars: boolean;
        expirationDays: number;
    };
    networkSecurity: {
        allowedDomains: string[];
        blockedDomains: string[];
        requireHttps: boolean;
        certificateValidation: boolean;
    };
    contentSecurity: {
        allowScriptExecution: boolean;
        allowExternalResources: boolean;
        sanitizeInputs: boolean;
        validateFileUploads: boolean;
    };
}

export interface EnterpriseEnvironment {
    environmentType: 'development' | 'staging' | 'production';
    deploymentMode: 'cloud' | 'on-premise' | 'hybrid';
    region: string;
    availabilityZone?: string;
    loadBalancing: boolean;
    clustering: boolean;
}

export interface EnterpriseConfiguration {
    // Core Configuration
    version: string;
    lastUpdated: string;
    environment: EnterpriseEnvironment;

    // Multi-Tenant Configuration
    multiTenant: boolean;
    defaultTenant: string;
    tenants: Record<string, TenantConfig>;

    // Feature Flags
    features: EnterpriseFeatureFlags;

    // Audit & Compliance
    audit: AuditConfig;
    compliance: ComplianceProfile;
    security: SecurityPolicies;

    // Global Branding (fallback)
    globalBranding: BrandingConfig;

    // System Configuration
    system: {
        maxUsers: number;
        maxTenantsPerInstance: number;
        apiRateLimit: number; // requests per minute
        concurrentConnections: number;
        memoryLimit: number; // MB
        diskUsageLimit: number; // MB
    };

    // Integration Configuration
    integrations: {
        microsoft: {
            enabled: boolean;
            defaultScopes: string[];
            customEndpoints?: Record<string, string>;
        };
        okta: {
            enabled: boolean;
            defaultDomain?: string;
            customScopes?: string[];
        };
        slack: {
            enabled: boolean;
            webhookUrl?: string;
            channels?: string[];
        };
        teams: {
            enabled: boolean;
            webhookUrl?: string;
            channels?: string[];
        };
    };

    // Monitoring & Alerts
    monitoring: {
        enabled: boolean;
        metricsCollection: boolean;
        alerting: {
            enabled: boolean;
            emailRecipients: string[];
            webhookUrl?: string;
            thresholds: {
                errorRate: number; // percentage
                responseTime: number; // milliseconds
                memoryUsage: number; // percentage
                diskUsage: number; // percentage
            };
        };
    };
}

// Default Enterprise Configuration
export const DEFAULT_ENTERPRISE_CONFIG: EnterpriseConfiguration = {
    version: '1.0.0',
    lastUpdated: new Date().toISOString(),
    environment: {
        environmentType: 'production',
        deploymentMode: 'cloud',
        region: 'us-east-1',
        loadBalancing: false,
        clustering: false
    },
    multiTenant: false,
    defaultTenant: 'default',
    tenants: {
        default: {
            tenantId: 'default',
            displayName: 'Default Organization',
            ssoProvider: 'microsoft',
            clientId: '',
            scopes: ['openid', 'profile', 'email'],
            branding: {
                companyName: 'Your Company',
                primaryColor: '#0078d4',
                secondaryColor: '#106ebe',
                textColor: '#323130'
            },
            complianceProfile: {
                dataRetention: {
                    userDataDays: 365,
                    auditLogsDays: 2555, // 7 years
                    taskDataDays: 1095, // 3 years
                    autoDelete: false
                },
                encryption: {
                    atRest: true,
                    inTransit: true,
                    keyRotation: true,
                    keyRotationDays: 90
                },
                accessControl: {
                    requireMFA: false,
                    sessionTimeout: 480, // 8 hours
                    maxConcurrentSessions: 3,
                    ipWhitelisting: [],
                    geographicRestrictions: []
                },
                dataExport: {
                    enabled: true,
                    requireApproval: false,
                    approverRoles: ['admin'],
                    maxExportSize: 100, // MB
                    allowedFormats: ['json', 'csv']
                }
            }
        }
    },
    features: {
        ssoRequired: false,
        ssoEnforcement: 'optional',
        offlineMode: true,
        localAuthentication: true,
        apiIntegration: true,
        taskStreaming: false,
        webhookIntegration: false,
        thirdPartyConnectors: false,
        customApiEndpoints: false,
        advancedReporting: false,
        analyticsCollection: false,
        performanceMonitoring: false,
        errorReporting: true,
        dataExport: true,
        bulkOperations: false,
        dataImport: false,
        backupRestore: false,
        customBranding: false,
        darkModeForced: false,
        compactView: false,
        advancedFiltering: true,
        multiTenant: false,
        userManagement: false,
        roleBasedAccess: false,
        auditLogging: false,
        complianceMode: false,
        debugMode: false,
        telemetry: false,
        betaFeatures: false,
        adminOverrides: {}
    },
    audit: {
        enabled: false,
        level: 'standard',
        destinations: [
            {
                type: 'local',
                enabled: true
            }
        ],
        retention: 365,
        sensitiveDataMasking: true,
        includeUserActions: true,
        includeSystemEvents: false,
        includePerformanceMetrics: false,
        batchSize: 100,
        flushInterval: 60000, // 1 minute
        encryptLogs: false
    },
    compliance: {
        dataRetention: {
            userDataDays: 365,
            auditLogsDays: 2555,
            taskDataDays: 1095,
            autoDelete: false
        },
        encryption: {
            atRest: false,
            inTransit: true,
            keyRotation: false,
            keyRotationDays: 90
        },
        accessControl: {
            requireMFA: false,
            sessionTimeout: 480,
            maxConcurrentSessions: 5,
            ipWhitelisting: [],
            geographicRestrictions: []
        },
        dataExport: {
            enabled: true,
            requireApproval: false,
            approverRoles: ['admin'],
            maxExportSize: 100,
            allowedFormats: ['json', 'csv']
        }
    },
    security: {
        passwordPolicy: {
            minLength: 8,
            requireUppercase: true,
            requireLowercase: true,
            requireNumbers: true,
            requireSpecialChars: false,
            expirationDays: 90
        },
        networkSecurity: {
            allowedDomains: [],
            blockedDomains: [],
            requireHttps: true,
            certificateValidation: true
        },
        contentSecurity: {
            allowScriptExecution: false,
            allowExternalResources: true,
            sanitizeInputs: true,
            validateFileUploads: true
        }
    },
    globalBranding: {
        companyName: 'AiDM',
        primaryColor: '#0078d4',
        secondaryColor: '#106ebe',
        textColor: '#323130'
    },
    system: {
        maxUsers: 1000,
        maxTenantsPerInstance: 10,
        apiRateLimit: 1000,
        concurrentConnections: 100,
        memoryLimit: 512,
        diskUsageLimit: 1024
    },
    integrations: {
        microsoft: {
            enabled: true,
            defaultScopes: ['openid', 'profile', 'email', 'User.Read']
        },
        okta: {
            enabled: false
        },
        slack: {
            enabled: false
        },
        teams: {
            enabled: false
        }
    },
    monitoring: {
        enabled: false,
        metricsCollection: false,
        alerting: {
            enabled: false,
            emailRecipients: [],
            thresholds: {
                errorRate: 5,
                responseTime: 5000,
                memoryUsage: 80,
                diskUsage: 85
            }
        }
    }
};

// Configuration validation functions
export function validateEnterpriseConfig(config: Partial<EnterpriseConfiguration>): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Validate version
    if (!config.version) {
        errors.push('Configuration version is required');
    }

    // Validate tenants if multi-tenant is enabled
    if (config.multiTenant && (!config.tenants || Object.keys(config.tenants).length === 0)) {
        errors.push('Multi-tenant mode requires at least one tenant configuration');
    }

    // Validate default tenant exists
    if (config.defaultTenant && config.tenants && !config.tenants[config.defaultTenant]) {
        errors.push(`Default tenant '${config.defaultTenant}' not found in tenant configurations`);
    }

    // Validate audit destinations
    if (config.audit?.enabled && (!config.audit.destinations || config.audit.destinations.length === 0)) {
        errors.push('Audit logging enabled but no destinations configured');
    }

    // Validate compliance settings
    if (config.compliance?.accessControl?.sessionTimeout && config.compliance.accessControl.sessionTimeout < 5) {
        errors.push('Session timeout must be at least 5 minutes');
    }

    // Validate system limits
    if (config.system?.maxUsers && config.system.maxUsers < 1) {
        errors.push('Maximum users must be at least 1');
    }

    return {
        valid: errors.length === 0,
        errors
    };
}

export function mergeEnterpriseConfig(base: EnterpriseConfiguration, override: Partial<EnterpriseConfiguration>): EnterpriseConfiguration {
    return {
        ...base,
        ...override,
        features: { ...base.features, ...override.features },
        audit: { ...base.audit, ...override.audit },
        compliance: { ...base.compliance, ...override.compliance },
        security: { ...base.security, ...override.security },
        globalBranding: { ...base.globalBranding, ...override.globalBranding },
        system: { ...base.system, ...override.system },
        integrations: { ...base.integrations, ...override.integrations },
        monitoring: { ...base.monitoring, ...override.monitoring },
        tenants: { ...base.tenants, ...override.tenants }
    };
}

// Feature flag evaluation
export function isFeatureEnabled(config: EnterpriseConfiguration, feature: keyof EnterpriseFeatureFlags): boolean {
    // Check admin overrides first
    if (config.features.adminOverrides[feature] !== undefined) {
        return config.features.adminOverrides[feature];
    }

    // Check feature flag
    return config.features[feature] || false;
}

// Tenant-specific feature evaluation
export function isFeatureEnabledForTenant(config: EnterpriseConfiguration, tenantId: string, feature: keyof EnterpriseFeatureFlags): boolean {
    // Global feature check first
    if (!isFeatureEnabled(config, feature)) {
        return false;
    }

    // Tenant-specific overrides could be added here in the future
    return true;
}

// Configuration type guards
export function isMultiTenant(config: EnterpriseConfiguration): boolean {
    return config.multiTenant && Object.keys(config.tenants).length > 1;
}

export function isComplianceModeEnabled(config: EnterpriseConfiguration): boolean {
    return isFeatureEnabled(config, 'complianceMode');
}

export function isAuditingEnabled(config: EnterpriseConfiguration): boolean {
    return config.audit.enabled && isFeatureEnabled(config, 'auditLogging');
}