/**
 * Enterprise Coordinator
 * Thin coordination layer that delegates to ConfigService, AuditService, and SessionService
 * Replaces the fat EnterpriseManager following VSCode extension best practices
 */

import * as vscode from 'vscode';
import { ConfigService, EnterpriseSettings } from './configService';
import { AuditService, AuditEvent } from './auditService';
import { SessionService, UserSession } from './sessionService';

/**
 * Simple data structure for enterprise context
 */
export interface EnterpriseContext {
    tenantId: string;
    userId?: string;
    isAuthenticated: boolean;
    features: string[];
}

/**
 * Thin coordinator that delegates to dedicated services
 * No business logic - only coordination and delegation
 */
export class EnterpriseCoordinator {
    private configService: ConfigService;
    private auditService: AuditService;
    private sessionService: SessionService;

    constructor(private context: vscode.ExtensionContext) {
        // Initialize all services via dependency injection
        this.configService = new ConfigService(context);
        this.auditService = new AuditService(this.configService, context);
        this.sessionService = new SessionService(context, {
            sessionTimeoutMinutes: 30,
            maxConcurrentSessions: 3,
            cleanupIntervalMinutes: 1
        });
    }

    /**
     * Get current enterprise configuration (delegates to ConfigService)
     */
    public getConfiguration(): EnterpriseSettings {
        return this.configService.getEnterpriseConfig();
    }

    /**
     * Check if a feature is enabled (delegates to ConfigService)
     */
    public isFeatureEnabled(feature: string): boolean {
        return this.configService.isFeatureEnabled(feature);
    }

    /**
     * Create a new user session (delegates to SessionService + audits)
     */
    public async createSession(tenantId: string, userId: string): Promise<string> {
        const sessionId = await this.sessionService.createSession(tenantId, userId);

        // Audit the session creation
        await this.auditService.auditEvent({
            eventType: 'auth',
            userId,
            tenantId,
            sessionId,
            action: 'session_created',
            severity: 'low',
            success: true
        });

        return sessionId;
    }

    /**
     * Record audit event (delegates to AuditService)
     */
    public async auditEvent(event: Omit<AuditEvent, 'timestamp'>): Promise<void> {
        return this.auditService.auditEvent(event);
    }

    /**
     * Get enterprise context for a tenant (simple coordination logic)
     */
    public getEnterpriseContext(tenantId: string, userId?: string): EnterpriseContext {
        const config = this.getConfiguration();

        return {
            tenantId,
            userId,
            isAuthenticated: Boolean(userId),
            features: this.getEnabledFeatures(config)
        };
    }

    /**
     * Get user session (delegates to SessionService)
     */
    public getSession(sessionId: string): UserSession | null {
        return this.sessionService.getSession(sessionId);
    }

    /**
     * Update session activity (delegates to SessionService)
     */
    public async updateSessionActivity(sessionId: string): Promise<void> {
        return this.sessionService.updateSessionActivity(sessionId);
    }

    /**
     * Terminate session (delegates to SessionService + audits)
     */
    public async terminateSession(sessionId: string): Promise<void> {
        const session = this.sessionService.getSession(sessionId);
        if (session) {
            await this.sessionService.terminateSession(sessionId);

            // Audit the session termination
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
     * Simple helper to extract enabled features from configuration
     */
    private getEnabledFeatures(config: EnterpriseSettings): string[] {
        const features: string[] = [];

        if (config.enabled) features.push('enterprise');
        if (config.auditEnabled) features.push('audit');
        if (config.multiTenant) features.push('multiTenant');

        return features;
    }

    /**
     * Dispose all services
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
 * Global enterprise coordinator instance
 */
let enterpriseCoordinatorInstance: EnterpriseCoordinator | null = null;

/**
 * Initialize the enterprise coordinator (replaces initializeEnterpriseManager)
 */
export function initializeEnterpriseManager(context: vscode.ExtensionContext): EnterpriseCoordinator {
    if (!enterpriseCoordinatorInstance) {
        enterpriseCoordinatorInstance = new EnterpriseCoordinator(context);
    }
    return enterpriseCoordinatorInstance;
}

/**
 * Get the enterprise coordinator instance (replaces getEnterpriseManager)
 */
export function getEnterpriseManager(): EnterpriseCoordinator | null {
    return enterpriseCoordinatorInstance;
}

/**
 * Dispose the enterprise coordinator (replaces disposeEnterpriseManager)
 */
export function disposeEnterpriseManager(): void {
    if (enterpriseCoordinatorInstance) {
        enterpriseCoordinatorInstance.dispose();
        enterpriseCoordinatorInstance = null;
    }
}