/**
 * Enterprise Manager Service
 * Centralized management for enterprise configuration, multi-tenant authentication,
 * audit logging, and feature flag evaluation
 */

import * as vscode from 'vscode';
import {
    EnterpriseConfiguration,
    TenantConfig,
    EnterpriseFeatureFlags,
    AuditConfig,
    BrandingConfig,
    DEFAULT_ENTERPRISE_CONFIG,
    validateEnterpriseConfig,
    mergeEnterpriseConfig,
    isFeatureEnabled,
    isFeatureEnabledForTenant,
    isMultiTenant,
    isComplianceModeEnabled,
    isAuditingEnabled
} from '../common/enterpriseConfig';
import { ConfigService } from './configService';
import { AuditService } from './auditService';
import { SessionService, UserSession } from './sessionService';

export interface EnterpriseContext {
    tenantId: string;
    userId?: string;
    sessionId?: string;
    features: EnterpriseFeatureFlags;
    branding: BrandingConfig;
    complianceMode: boolean;
    auditingEnabled: boolean;
}

export class EnterpriseManager {
    private config: EnterpriseConfiguration;
    private configService: ConfigService;
    private auditService: AuditService;
    private sessionService: SessionService;

    constructor(private context: vscode.ExtensionContext) {
        this.config = DEFAULT_ENTERPRISE_CONFIG;
        this.configService = new ConfigService(context);
        this.auditService = new AuditService(this.configService, context);
        this.sessionService = new SessionService(context, {
            sessionTimeoutMinutes: 30,
            maxConcurrentSessions: 3,
            cleanupIntervalMinutes: 1
        });
        this.initializeConfiguration();
    }

    /**
     * Initialize enterprise configuration using ConfigService
     */
    private async initializeConfiguration(): Promise<void> {
        try {
            // Load from VSCode settings via ConfigService
            const vscodeConfig = this.configService.getFullEnterpriseConfiguration();

            // Convert ConfigService format to full EnterpriseConfiguration
            this.config = this.convertToEnterpriseConfiguration(vscodeConfig);

            // Validate configuration
            const validation = validateEnterpriseConfig(this.config);
            if (!validation.valid) {
                await this.auditService.auditEvent({
                    eventType: 'configuration_change',
                    action: 'configuration_validation_failed',
                    details: { errors: validation.errors },
                    severity: 'high',
                    success: false,
                    errorMessage: `Configuration validation failed: ${validation.errors.join(', ')}`
                });

                // Use default config if validation fails
                this.config = DEFAULT_ENTERPRISE_CONFIG;
            } else {
                await this.auditService.auditEvent({
                    eventType: 'configuration_change',
                    action: 'configuration_loaded',
                    details: { version: this.config.version },
                    severity: 'low',
                    success: true
                });
            }

            // Watch for configuration changes
            this.configService.onConfigChanged(() => {
                this.initializeConfiguration();
            });

        } catch (error) {
            await this.auditService.auditEvent({
                eventType: 'system_event',
                action: 'configuration_load_error',
                details: { error: String(error) },
                severity: 'critical',
                success: false,
                errorMessage: String(error)
            });

            // Fallback to default configuration
            this.config = DEFAULT_ENTERPRISE_CONFIG;
        }
    }

    /**
     * Convert ConfigService format to full EnterpriseConfiguration
     */
    private convertToEnterpriseConfiguration(config: any): EnterpriseConfiguration {
        const enterpriseConfig: EnterpriseConfiguration = {
            ...DEFAULT_ENTERPRISE_CONFIG,
            multiTenant: config.multiTenant,
            defaultTenant: config.defaultTenant,

            features: {
                ssoRequired: config.sso.enforcement !== 'optional',
                ssoEnforcement: config.sso.enforcement,
                offlineMode: config.features.offlineMode,
                localAuthentication: config.sso.enforcement === 'optional',
                apiIntegration: config.features.apiIntegration,
                taskStreaming: config.features.taskStreaming,
                webhookIntegration: config.features.webhookIntegration,
                thirdPartyConnectors: false,
                customApiEndpoints: false,
                advancedReporting: config.features.advancedReporting,
                analyticsCollection: config.monitoring.enabled,
                performanceMonitoring: config.features.performanceMonitoring,
                errorReporting: true,
                dataExport: config.features.dataExport,
                bulkOperations: config.features.bulkOperations,
                dataImport: false,
                backupRestore: false,
                customBranding: config.features.customBranding,
                darkModeForced: false,
                compactView: false,
                advancedFiltering: true,
                multiTenant: config.multiTenant,
                userManagement: config.features.userManagement,
                roleBasedAccess: false,
                auditLogging: config.audit.enabled,
                complianceMode: config.compliance.dataRetentionDays > 365,
                debugMode: false,
                telemetry: false,
                betaFeatures: false,
                adminOverrides: {}
            },

            audit: {
                enabled: config.audit.enabled,
                level: config.audit.level,
                destinations: config.audit.destinations.map((dest: string) => ({
                    type: dest as any,
                    enabled: true
                })),
                retention: config.audit.retention,
                sensitiveDataMasking: config.audit.sensitiveDataMasking,
                includeUserActions: true,
                includeSystemEvents: false,
                includePerformanceMetrics: false,
                batchSize: 100,
                flushInterval: 60000,
                encryptLogs: false
            },

            compliance: {
                dataRetention: {
                    userDataDays: config.compliance.dataRetentionDays,
                    auditLogsDays: config.audit.retention,
                    taskDataDays: config.compliance.dataRetentionDays,
                    autoDelete: false
                },
                encryption: {
                    atRest: config.compliance.encryptionAtRest,
                    inTransit: config.compliance.encryptionInTransit,
                    keyRotation: false,
                    keyRotationDays: 90
                },
                accessControl: {
                    requireMFA: config.compliance.requireMFA,
                    sessionTimeout: config.compliance.sessionTimeout,
                    maxConcurrentSessions: config.compliance.maxConcurrentSessions,
                    ipWhitelisting: config.compliance.ipWhitelist,
                    geographicRestrictions: []
                },
                dataExport: {
                    enabled: config.features.dataExport,
                    requireApproval: false,
                    approverRoles: ['admin'],
                    maxExportSize: 100,
                    allowedFormats: ['json', 'csv']
                }
            },

            globalBranding: {
                companyName: config.branding.companyName,
                logoUrl: config.branding.logoUrl,
                primaryColor: config.branding.primaryColor,
                secondaryColor: config.branding.secondaryColor,
                customCSS: config.branding.customCSS
            },

            system: {
                maxUsers: config.system.maxUsers,
                maxTenantsPerInstance: 10,
                apiRateLimit: config.system.apiRateLimit,
                concurrentConnections: 100,
                memoryLimit: config.system.memoryLimit,
                diskUsageLimit: 1024
            },

            monitoring: {
                enabled: config.monitoring.enabled,
                metricsCollection: config.monitoring.enabled,
                alerting: {
                    enabled: config.monitoring.enabled,
                    emailRecipients: config.monitoring.alertEmail,
                    thresholds: {
                        errorRate: config.monitoring.errorRateThreshold,
                        responseTime: config.monitoring.responseTimeThreshold,
                        memoryUsage: 80,
                        diskUsage: 85
                    }
                }
            },

            tenants: {}
        };

        // Add tenant configuration if enabled
        if (config.multiTenant) {
            const defaultTenantId = config.defaultTenant || 'default';
            enterpriseConfig.tenants = {
                [defaultTenantId]: {
                    tenantId: defaultTenantId,
                    displayName: config.branding.companyName || 'Default Organization',
                    ssoProvider: config.sso.provider,
                    customAuthority: config.sso.authority,
                    clientId: config.sso.clientId,
                    scopes: config.sso.scopes,
                    branding: enterpriseConfig.globalBranding,
                    complianceProfile: enterpriseConfig.compliance
                }
            };
        }

        return enterpriseConfig;
    }



    /**
     * Get current enterprise configuration
     */
    public getConfiguration(): EnterpriseConfiguration {
        return { ...this.config };
    }

    /**
     * Get tenant configuration by ID
     */
    public getTenantConfiguration(tenantId: string): TenantConfig | null {
        return this.config.tenants[tenantId] || null;
    }

    /**
     * Get enterprise context for a specific tenant
     */
    public getEnterpriseContext(tenantId: string, userId?: string, sessionId?: string): EnterpriseContext {
        const tenant = this.getTenantConfiguration(tenantId);

        return {
            tenantId,
            userId,
            sessionId,
            features: this.config.features,
            branding: tenant?.branding || this.config.globalBranding,
            complianceMode: isComplianceModeEnabled(this.config),
            auditingEnabled: isAuditingEnabled(this.config)
        };
    }

    /**
     * Check if a feature is enabled globally
     */
    public isFeatureEnabled(feature: keyof EnterpriseFeatureFlags): boolean {
        return this.configService.isFeatureEnabled(feature as string) || isFeatureEnabled(this.config, feature);
    }

    /**
     * Check if a feature is enabled for a specific tenant
     */
    public isFeatureEnabledForTenant(tenantId: string, feature: keyof EnterpriseFeatureFlags): boolean {
        return isFeatureEnabledForTenant(this.config, tenantId, feature);
    }

    /**
     * Check if multi-tenant mode is enabled
     */
    public isMultiTenant(): boolean {
        return isMultiTenant(this.config);
    }

    /**
     * Create a new user session
     */
    public async createSession(tenantId: string, userId: string, ipAddress?: string, userAgent?: string): Promise<string> {
        const sessionId = await this.sessionService.createSession(tenantId, userId, ipAddress, userAgent);

        await this.auditService.auditEvent({
            eventType: 'auth',
            userId,
            tenantId,
            sessionId,
            action: 'session_created',
            details: { ipAddress, userAgent },
            ipAddress,
            userAgent,
            severity: 'low',
            success: true
        });

        return sessionId;
    }

    /**
     * Update session activity
     */
    public async updateSessionActivity(sessionId: string): Promise<void> {
        await this.sessionService.updateSessionActivity(sessionId);
    }

    /**
     * Terminate a user session
     */
    public async terminateSession(sessionId: string): Promise<void> {
        const session = this.sessionService.getSession(sessionId);
        if (session) {
            await this.sessionService.terminateSession(sessionId);

            await this.auditService.auditEvent({
                eventType: 'auth',
                userId: session.userId,
                tenantId: session.tenantId,
                sessionId,
                action: 'session_terminated',
                severity: 'low',
                success: true
            });
        }
    }

    /**
     * Get active session by ID
     */
    public getSession(sessionId: string): UserSession | null {
        return this.sessionService.getSession(sessionId);
    }


    /**
     * Clean up resources
     */
    public dispose(): void {
        if (this.sessionService) {
            this.sessionService.dispose();
        }

        if (this.configService) {
            this.configService.dispose();
        }

        if (this.auditService) {
            this.auditService.dispose();
        }
    }
}

/**
 * Global enterprise manager instance
 */
let enterpriseManagerInstance: EnterpriseManager | null = null;

/**
 * Initialize the enterprise manager
 */
export function initializeEnterpriseManager(context: vscode.ExtensionContext): EnterpriseManager {
    if (!enterpriseManagerInstance) {
        enterpriseManagerInstance = new EnterpriseManager(context);
    }
    return enterpriseManagerInstance;
}

/**
 * Get the enterprise manager instance
 */
export function getEnterpriseManager(): EnterpriseManager | null {
    return enterpriseManagerInstance;
}

/**
 * Dispose the enterprise manager
 */
export function disposeEnterpriseManager(): void {
    if (enterpriseManagerInstance) {
        enterpriseManagerInstance.dispose();
        enterpriseManagerInstance = null;
    }
}