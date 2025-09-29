/**
 * Audit Service
 * Handles audit event collection, batching, and logging using VSCode OutputChannel
 */

import * as vscode from 'vscode';
import { ConfigService } from './configService';

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

export class AuditService {
    private outputChannel: vscode.OutputChannel;
    private eventQueue: AuditEvent[] = [];
    private flushInterval?: NodeJS.Timeout;
    private readonly BATCH_SIZE = 100;
    private readonly FLUSH_INTERVAL_MS = 60000; // 1 minute

    constructor(
        private configService: ConfigService,
        private context: vscode.ExtensionContext
    ) {
        this.outputChannel = vscode.window.createOutputChannel('AiDM Audit Log');

        if (this.isAuditingEnabled()) {
            this.startPeriodicFlush();
        }
    }

    /**
     * Record an audit event
     */
    public async auditEvent(event: Omit<AuditEvent, 'timestamp'>): Promise<void> {
        if (!this.isAuditingEnabled()) {
            return;
        }

        const auditEvent: AuditEvent = {
            ...event,
            timestamp: new Date().toISOString()
        };

        // Mask sensitive data if required
        if (this.shouldMaskSensitiveData() && auditEvent.details) {
            auditEvent.details = this.maskSensitiveData(auditEvent.details);
        }

        this.eventQueue.push(auditEvent);

        // Flush immediately for critical events
        if (event.severity === 'critical') {
            await this.flushEvents();
        }

        // Check if we need to flush due to batch size
        if (this.eventQueue.length >= this.BATCH_SIZE) {
            await this.flushEvents();
        }
    }

    /**
     * Check if auditing is enabled via configuration
     */
    public isAuditingEnabled(): boolean {
        return this.configService.isFeatureEnabled('audit');
    }

    /**
     * Start periodic flushing of audit events
     */
    private startPeriodicFlush(): void {
        this.flushInterval = setInterval(async () => {
            await this.flushEvents();
        }, this.FLUSH_INTERVAL_MS);
    }

    /**
     * Flush queued audit events to the output channel
     */
    private async flushEvents(): Promise<void> {
        if (this.eventQueue.length === 0) {
            return;
        }

        const events = this.eventQueue.splice(0, this.BATCH_SIZE);

        try {
            for (const event of events) {
                const logEntry = this.formatLogEntry(event);
                this.outputChannel.appendLine(logEntry);
            }

            // Show output channel for critical events to ensure visibility
            const hasCritical = events.some(e => e.severity === 'critical');
            if (hasCritical) {
                this.outputChannel.show(true);
            }

        } catch (error) {
            // Log flush failure but don't throw to avoid affecting main application
            console.error('Failed to flush audit events to output channel:', error);

            // Re-queue failed events for retry
            this.eventQueue.unshift(...events);
        }
    }

    /**
     * Format audit event for output channel display
     */
    private formatLogEntry(event: AuditEvent): string {
        const timestamp = event.timestamp;
        const level = event.severity.toUpperCase().padEnd(8);
        const type = event.eventType.padEnd(15);
        const status = event.success ? 'SUCCESS' : 'FAILED';
        const action = event.action;

        let logLine = `[${timestamp}] ${level} ${type} ${status} ${action}`;

        if (event.userId) {
            logLine += ` | User: ${event.userId}`;
        }

        if (event.tenantId) {
            logLine += ` | Tenant: ${event.tenantId}`;
        }

        if (event.resource) {
            logLine += ` | Resource: ${event.resource}`;
        }

        if (event.errorMessage) {
            logLine += ` | Error: ${event.errorMessage}`;
        }

        if (event.details && Object.keys(event.details).length > 0) {
            logLine += ` | Details: ${JSON.stringify(event.details)}`;
        }

        return logLine;
    }

    /**
     * Check if sensitive data masking is enabled
     */
    private shouldMaskSensitiveData(): boolean {
        const config = this.configService.getFullEnterpriseConfiguration();
        return config.audit?.sensitiveDataMasking ?? true;
    }

    /**
     * Mask sensitive data in audit event details
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
     * Clean up resources
     */
    public dispose(): void {
        if (this.flushInterval) {
            clearInterval(this.flushInterval);
            this.flushInterval = undefined;
        }

        // Flush any remaining events before disposal
        this.flushEvents().catch(console.error);

        if (this.outputChannel) {
            this.outputChannel.dispose();
        }
    }
}