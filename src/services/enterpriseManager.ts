/**
 * Enterprise Manager Service
 * Centralized management for enterprise configuration, multi-tenant authentication,
 * audit logging, and feature flag evaluation
 */

import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
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

export interface AuditEvent {
    timestamp: string;
    eventType: 'auth' | 'user_action' | 'system_event' | 'api_call' | 'data_access' | 'configuration_change';
    userId?: string;
    tenantId?: string;
    action: string;
    resource?: string;
    details?: Record<string, any>;
    userAgent?: string;
    ipAddress?: string;
    sessionId?: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    success: boolean;
    errorMessage?: string;
}

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
    private auditEventQueue: AuditEvent[] = [];
    private sessionCleanupInterval?: NodeJS.Timeout;
    private auditFlushInterval?: NodeJS.Timeout;
    private configWatcher?: vscode.FileSystemWatcher;

    constructor(private context: vscode.ExtensionContext) {
        this.config = DEFAULT_ENTERPRISE_CONFIG;
        this.initializeConfiguration();
        this.startSessionCleanup();
        this.startAuditFlushing();
    }

    /**
     * Initialize enterprise configuration from VSCode settings and external config file
     */
    private async initializeConfiguration(): Promise<void> {
        try {
            // Load from VSCode settings
            const vscodeConfig = this.loadVSCodeConfiguration();

            // Load from external config file if specified
            let fileConfig: Partial<EnterpriseConfiguration> = {};
            const configPath = vscodeConfig.configPath;
            if (configPath) {
                fileConfig = await this.loadConfigurationFile(configPath);
            }

            // Merge configurations (file overrides VSCode settings, VSCode settings override defaults)
            this.config = mergeEnterpriseConfig(
                mergeEnterpriseConfig(DEFAULT_ENTERPRISE_CONFIG, vscodeConfig),
                fileConfig
            );

            // Validate merged configuration
            const validation = validateEnterpriseConfig(this.config);
            if (!validation.valid) {
                await this.auditEvent({
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
                await this.auditEvent({
                    eventType: 'configuration_change',
                    action: 'configuration_loaded',
                    details: { version: this.config.version },
                    severity: 'low',
                    success: true
                });
            }

            // Watch for configuration file changes
            if (configPath) {
                this.watchConfigurationFile(configPath);
            }

        } catch (error) {
            await this.auditEvent({
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
     * Load configuration from VSCode settings
     */
    private loadVSCodeConfiguration(): Partial<EnterpriseConfiguration> {
        const config = vscode.workspace.getConfiguration('aidmVscodeExtension.enterprise');

        const vscodeConfig: Partial<EnterpriseConfiguration> = {
            multiTenant: config.get('multiTenant', false),
            defaultTenant: config.get('defaultTenant', 'default'),

            features: {
                ssoRequired: config.get('sso.enforcement', 'optional') !== 'optional',
                ssoEnforcement: config.get('sso.enforcement', 'optional') as any,
                offlineMode: config.get('features.offlineMode', true),
                localAuthentication: config.get('sso.enforcement', 'optional') === 'optional',
                apiIntegration: config.get('features.apiIntegration', true),
                taskStreaming: config.get('features.taskStreaming', false),
                webhookIntegration: config.get('features.webhookIntegration', false),
                thirdPartyConnectors: false,
                customApiEndpoints: false,
                advancedReporting: config.get('features.advancedReporting', false),
                analyticsCollection: config.get('monitoring.enabled', false),
                performanceMonitoring: config.get('features.performanceMonitoring', false),
                errorReporting: true,
                dataExport: config.get('features.dataExport', true),
                bulkOperations: config.get('features.bulkOperations', false),
                dataImport: false,
                backupRestore: false,
                customBranding: config.get('features.customBranding', false),
                darkModeForced: false,
                compactView: false,
                advancedFiltering: true,
                multiTenant: config.get('multiTenant', false),
                userManagement: config.get('features.userManagement', false),
                roleBasedAccess: false,
                auditLogging: config.get('audit.enabled', false),
                complianceMode: config.get('compliance.dataRetentionDays', 365) > 365,
                debugMode: false,
                telemetry: false,
                betaFeatures: false,
                adminOverrides: {}
            },

            audit: {
                enabled: config.get('audit.enabled', false),
                level: config.get('audit.level', 'standard') as any,
                destinations: (config.get('audit.destinations', ['local']) as string[]).map(dest => ({
                    type: dest as any,
                    enabled: true
                })),
                retention: config.get('audit.retention', 365),
                sensitiveDataMasking: config.get('audit.sensitiveDataMasking', true),
                includeUserActions: true,
                includeSystemEvents: false,
                includePerformanceMetrics: false,
                batchSize: 100,
                flushInterval: 60000,
                encryptLogs: false
            },

            compliance: {
                dataRetention: {
                    userDataDays: config.get('compliance.dataRetentionDays', 365),
                    auditLogsDays: config.get('audit.retention', 365),
                    taskDataDays: config.get('compliance.dataRetentionDays', 365),
                    autoDelete: false
                },
                encryption: {
                    atRest: config.get('compliance.encryptionAtRest', false),
                    inTransit: config.get('compliance.encryptionInTransit', true),
                    keyRotation: false,
                    keyRotationDays: 90
                },
                accessControl: {
                    requireMFA: config.get('compliance.requireMFA', false),
                    sessionTimeout: config.get('compliance.sessionTimeout', 480),
                    maxConcurrentSessions: config.get('compliance.maxConcurrentSessions', 3),
                    ipWhitelisting: config.get('compliance.ipWhitelist', []),
                    geographicRestrictions: []
                },
                dataExport: {
                    enabled: config.get('features.dataExport', true),
                    requireApproval: false,
                    approverRoles: ['admin'],
                    maxExportSize: 100,
                    allowedFormats: ['json', 'csv']
                }
            },

            globalBranding: {
                companyName: config.get('branding.companyName', ''),
                logoUrl: config.get('branding.logoUrl', ''),
                primaryColor: config.get('branding.primaryColor', '#0078d4'),
                secondaryColor: config.get('branding.secondaryColor', '#106ebe'),
                customCSS: config.get('branding.customCSS', '')
            },

            system: {
                maxUsers: config.get('system.maxUsers', 1000),
                maxTenantsPerInstance: 10,
                apiRateLimit: config.get('system.apiRateLimit', 1000),
                concurrentConnections: 100,
                memoryLimit: config.get('system.memoryLimit', 512),
                diskUsageLimit: 1024
            },

            monitoring: {
                enabled: config.get('monitoring.enabled', false),
                metricsCollection: config.get('monitoring.enabled', false),
                alerting: {
                    enabled: config.get('monitoring.enabled', false),
                    emailRecipients: config.get('monitoring.alertEmail', []),
                    thresholds: {
                        errorRate: config.get('monitoring.errorRateThreshold', 5),
                        responseTime: config.get('monitoring.responseTimeThreshold', 5000),
                        memoryUsage: 80,
                        diskUsage: 85
                    }
                }
            }
        };

        // Add tenant configuration if enabled
        if (vscodeConfig.multiTenant) {
            const defaultTenantId = vscodeConfig.defaultTenant || 'default';
            vscodeConfig.tenants = {
                [defaultTenantId]: {
                    tenantId: defaultTenantId,
                    displayName: config.get('branding.companyName', 'Default Organization'),
                    ssoProvider: config.get('sso.provider', 'microsoft') as any,
                    customAuthority: config.get('sso.authority', ''),
                    clientId: config.get('sso.clientId', ''),
                    scopes: config.get('sso.scopes', ['openid', 'profile', 'email']),
                    branding: vscodeConfig.globalBranding!,
                    complianceProfile: vscodeConfig.compliance!
                }
            };
        }

        return vscodeConfig;
    }

    /**
     * Load configuration from external JSON file
     */
    private async loadConfigurationFile(configPath: string): Promise<Partial<EnterpriseConfiguration>> {
        try {
            const absolutePath = path.isAbsolute(configPath)
                ? configPath
                : path.join(vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || '', configPath);

            if (!fs.existsSync(absolutePath)) {
                throw new Error(`Configuration file not found: ${absolutePath}`);
            }

            const configContent = fs.readFileSync(absolutePath, 'utf8');
            const config = JSON.parse(configContent) as Partial<EnterpriseConfiguration>;

            return config;
        } catch (error) {
            throw new Error(`Failed to load configuration file: ${error}`);
        }
    }

    /**
     * Watch configuration file for changes
     */
    private watchConfigurationFile(configPath: string): void {
        const absolutePath = path.isAbsolute(configPath)
            ? configPath
            : path.join(vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || '', configPath);

        this.configWatcher = vscode.workspace.createFileSystemWatcher(absolutePath);

        this.configWatcher.onDidChange(async () => {
            await this.auditEvent({
                eventType: 'configuration_change',
                action: 'configuration_file_changed',
                details: { configPath },
                severity: 'medium',
                success: true
            });

            // Reload configuration
            await this.initializeConfiguration();
        });
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
        return isFeatureEnabled(this.config, feature);
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

        await this.auditEvent({
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

            await this.auditEvent({
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
     * Record an audit event
     */
    public async auditEvent(event: Omit<AuditEvent, 'timestamp'>): Promise<void> {
        if (!isAuditingEnabled(this.config)) {
            return;
        }

        const auditEvent: AuditEvent = {
            ...event,
            timestamp: new Date().toISOString()
        };

        // Mask sensitive data if required
        if (this.config.audit.sensitiveDataMasking && auditEvent.details) {
            auditEvent.details = this.maskSensitiveData(auditEvent.details);
        }

        this.auditEventQueue.push(auditEvent);

        // Flush immediately for critical events
        if (event.severity === 'critical') {
            await this.flushAuditEvents();
        }
    }

    /**
     * Mask sensitive data in audit events
     */
    private maskSensitiveData(data: Record<string, any>): Record<string, any> {
        const masked = { ...data };
        const sensitiveKeys = ['password', 'token', 'secret', 'key', 'authorization', 'cookie'];

        for (const key in masked) {
            if (sensitiveKeys.some(sensitive => key.toLowerCase().includes(sensitive))) {
                masked[key] = '[MASKED]';
            }
        }

        return masked;
    }

    /**
     * Start audit event flushing
     */
    private startAuditFlushing(): void {
        if (!isAuditingEnabled(this.config)) {
            return;
        }

        this.auditFlushInterval = setInterval(async () => {
            await this.flushAuditEvents();
        }, this.config.audit.flushInterval);
    }

    /**
     * Flush audit events to configured destinations
     */
    private async flushAuditEvents(): Promise<void> {
        if (this.auditEventQueue.length === 0) {
            return;
        }

        const events = this.auditEventQueue.splice(0, this.config.audit.batchSize);

        for (const destination of this.config.audit.destinations) {
            if (!destination.enabled) {
                continue;
            }

            try {
                await this.writeAuditEvents(destination, events);
            } catch (error) {
                // Log audit write failure but don't throw to avoid affecting main application
                console.error(`Failed to write audit events to ${destination.type}:`, error);
            }
        }
    }

    /**
     * Write audit events to a specific destination
     */
    private async writeAuditEvents(destination: any, events: AuditEvent[]): Promise<void> {
        switch (destination.type) {
            case 'local':
                await this.writeLocalAuditLog(events);
                break;
            case 'webhook':
                if (destination.endpoint) {
                    await this.sendWebhookAuditEvents(destination, events);
                }
                break;
            // Additional destinations (SIEM, cloud) would be implemented here
            default:
                console.warn(`Unsupported audit destination: ${destination.type}`);
        }
    }

    /**
     * Write audit events to local file
     */
    private async writeLocalAuditLog(events: AuditEvent[]): Promise<void> {
        const logDir = path.join(this.context.globalStorageUri.fsPath, 'audit');
        const logFile = path.join(logDir, `audit-${new Date().toISOString().split('T')[0]}.json`);

        // Ensure directory exists
        if (!fs.existsSync(logDir)) {
            fs.mkdirSync(logDir, { recursive: true });
        }

        // Append events to daily log file
        for (const event of events) {
            fs.appendFileSync(logFile, JSON.stringify(event) + '\n');
        }
    }

    /**
     * Send audit events via webhook
     */
    private async sendWebhookAuditEvents(destination: any, events: AuditEvent[]): Promise<void> {
        const payload = {
            events,
            source: 'aidm-vscode-extension',
            timestamp: new Date().toISOString()
        };

        const response = await fetch(destination.endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...destination.headers
            },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            throw new Error(`Webhook request failed: ${response.status} ${response.statusText}`);
        }
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

        if (this.auditFlushInterval) {
            clearInterval(this.auditFlushInterval);
        }

        if (this.configWatcher) {
            this.configWatcher.dispose();
        }

        // Flush remaining audit events before shutdown
        this.flushAuditEvents().catch(console.error);
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