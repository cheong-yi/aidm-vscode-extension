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


export interface UserSession {
    sessionId: string;
    userId: string;
    tenantId: string;
    startTime: string;
    lastActivity: string;
    ipAddress?: string;
    userAgent?: string;
    isActive: boolean;
}

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
    private activeSessions: Map<string, UserSession> = new Map();
    private sessionCleanupInterval?: NodeJS.Timeout;
    private configService: ConfigService;
    private auditService: AuditService;

    constructor(private context: vscode.ExtensionContext) {
        this.config = DEFAULT_ENTERPRISE_CONFIG;
        this.configService = new ConfigService(context);
        this.auditService = new AuditService(this.configService, context);
        this.initializeConfiguration();
        this.startSessionCleanup();
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
        const sessionId = this.generateSessionId();
        const session: UserSession = {
            sessionId,
            userId,
            tenantId,
            startTime: new Date().toISOString(),
            lastActivity: new Date().toISOString(),
            ipAddress,
            userAgent,
            isActive: true
        };

        // Check concurrent session limits
        const existingSessions = Array.from(this.activeSessions.values())
            .filter(s => s.userId === userId && s.tenantId === tenantId && s.isActive);

        if (existingSessions.length >= this.config.compliance.accessControl.maxConcurrentSessions) {
            // Terminate oldest session
            const oldestSession = existingSessions.sort((a, b) =>
                new Date(a.startTime).getTime() - new Date(b.startTime).getTime())[0];
            await this.terminateSession(oldestSession.sessionId);
        }

        this.activeSessions.set(sessionId, session);

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
        const session = this.activeSessions.get(sessionId);
        if (session && session.isActive) {
            session.lastActivity = new Date().toISOString();
            this.activeSessions.set(sessionId, session);
        }
    }

    /**
     * Terminate a user session
     */
    public async terminateSession(sessionId: string): Promise<void> {
        const session = this.activeSessions.get(sessionId);
        if (session) {
            session.isActive = false;
            this.activeSessions.set(sessionId, session);

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
        const session = this.activeSessions.get(sessionId);
        return session && session.isActive ? session : null;
    }

    /**
     * Clean up expired sessions
     */
    private startSessionCleanup(): void {
        this.sessionCleanupInterval = setInterval(async () => {
            const now = new Date();
            const timeoutMs = this.config.compliance.accessControl.sessionTimeout * 60 * 1000;

            for (const [sessionId, session] of this.activeSessions) {
                if (session.isActive) {
                    const lastActivity = new Date(session.lastActivity);
                    if (now.getTime() - lastActivity.getTime() > timeoutMs) {
                        await this.terminateSession(sessionId);
                    }
                }
            }
        }, 60000); // Check every minute
    }


    /**
     * Generate a unique session ID
     */
    private generateSessionId(): string {
        return `sess_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Clean up resources
     */
    public dispose(): void {
        if (this.sessionCleanupInterval) {
            clearInterval(this.sessionCleanupInterval);
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