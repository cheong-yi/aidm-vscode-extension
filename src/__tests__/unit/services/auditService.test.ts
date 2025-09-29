/**
 * Unit tests for AuditService
 */

import * as vscode from 'vscode';
import { AuditService, AuditEvent } from '../../../services/auditService';
import { ConfigService } from '../../../services/configService';

// Mock VSCode API
const mockOutputChannelAppendLine = jest.fn();
const mockOutputChannelShow = jest.fn();
const mockOutputChannelDispose = jest.fn();

jest.mock('vscode', () => ({
    window: {
        createOutputChannel: jest.fn(() => ({
            appendLine: mockOutputChannelAppendLine,
            show: mockOutputChannelShow,
            dispose: mockOutputChannelDispose
        }))
    }
}));

// Mock ConfigService
jest.mock('../../../services/configService');
const MockedConfigService = ConfigService as jest.MockedClass<typeof ConfigService>;

describe('AuditService', () => {
    let auditService: AuditService;
    let mockConfigService: jest.Mocked<ConfigService>;
    let mockContext: vscode.ExtensionContext;

    beforeEach(() => {
        jest.clearAllMocks();
        jest.useFakeTimers();

        mockContext = {} as vscode.ExtensionContext;
        mockConfigService = new MockedConfigService(mockContext) as jest.Mocked<ConfigService>;

        // Default: auditing enabled
        mockConfigService.isFeatureEnabled.mockReturnValue(true);
        mockConfigService.getFullEnterpriseConfiguration.mockReturnValue({
            audit: { sensitiveDataMasking: true }
        });

        auditService = new AuditService(mockConfigService, mockContext);
    });

    afterEach(() => {
        auditService?.dispose();
        jest.useRealTimers();
    });

    describe('constructor', () => {
        test('should create output channel', () => {
            expect(vscode.window.createOutputChannel).toHaveBeenCalledWith('AiDM Audit Log');
        });

        test('should start periodic flush when auditing is enabled', () => {
            mockConfigService.isFeatureEnabled.mockReturnValue(true);
            const service = new AuditService(mockConfigService, mockContext);

            // Verify timer was set
            expect(jest.getTimerCount()).toBeGreaterThan(0);

            service.dispose();
        });

        test('should not start periodic flush when auditing is disabled', () => {
            mockConfigService.isFeatureEnabled.mockReturnValue(false);
            const service = new AuditService(mockConfigService, mockContext);

            // No timers should be set
            expect(jest.getTimerCount()).toBe(0);

            service.dispose();
        });
    });

    describe('auditEvent', () => {
        test('should queue audit event when auditing is enabled', async () => {
            const event: Omit<AuditEvent, 'timestamp'> = {
                eventType: 'user_action',
                action: 'test_action',
                severity: 'low',
                success: true
            };

            await auditService.auditEvent(event);

            // Event should be queued but not flushed yet
            expect(mockOutputChannelAppendLine).not.toHaveBeenCalled();
        });

        test('should not queue audit event when auditing is disabled', async () => {
            mockConfigService.isFeatureEnabled.mockReturnValue(false);

            const event: Omit<AuditEvent, 'timestamp'> = {
                eventType: 'user_action',
                action: 'test_action',
                severity: 'low',
                success: true
            };

            await auditService.auditEvent(event);

            expect(mockOutputChannelAppendLine).not.toHaveBeenCalled();
        });

        test('should flush immediately for critical events', async () => {
            const event: Omit<AuditEvent, 'timestamp'> = {
                eventType: 'system_event',
                action: 'critical_failure',
                severity: 'critical',
                success: false
            };

            await auditService.auditEvent(event);

            expect(mockOutputChannelAppendLine).toHaveBeenCalledTimes(1);
            expect(mockOutputChannelShow).toHaveBeenCalledWith(true);
        });

        test('should mask sensitive data when enabled', async () => {
            const event: Omit<AuditEvent, 'timestamp'> = {
                eventType: 'api_call',
                action: 'authentication',
                severity: 'low',
                success: true,
                details: {
                    username: 'testuser',
                    password: 'secret123',
                    token: 'abc123',
                    normalData: 'visible'
                }
            };

            await auditService.auditEvent(event);

            // Force flush to check the event
            jest.advanceTimersByTime(60000);

            const logCall = mockOutputChannelAppendLine.mock.calls[0][0];
            expect(logCall).toContain('[MASKED]');
            expect(logCall).toContain('normalData');
            expect(logCall).not.toContain('secret123');
            expect(logCall).not.toContain('abc123');
        });

        test('should not mask sensitive data when disabled', async () => {
            mockConfigService.getFullEnterpriseConfiguration.mockReturnValue({
                audit: { sensitiveDataMasking: false }
            });

            const event: Omit<AuditEvent, 'timestamp'> = {
                eventType: 'api_call',
                action: 'authentication',
                severity: 'low',
                success: true,
                details: {
                    password: 'secret123',
                    token: 'abc123'
                }
            };

            await auditService.auditEvent(event);

            // Force flush
            jest.advanceTimersByTime(60000);

            const logCall = mockOutputChannelAppendLine.mock.calls[0][0];
            expect(logCall).toContain('secret123');
            expect(logCall).toContain('abc123');
        });

        test('should flush when batch size is reached', async () => {
            // Add 100 events (batch size)
            for (let i = 0; i < 100; i++) {
                await auditService.auditEvent({
                    eventType: 'user_action',
                    action: `test_action_${i}`,
                    severity: 'low',
                    success: true
                });
            }

            expect(mockOutputChannelAppendLine).toHaveBeenCalledTimes(100);
        });
    });

    describe('isAuditingEnabled', () => {
        test('should return true when audit feature is enabled', () => {
            mockConfigService.isFeatureEnabled.mockReturnValue(true);
            expect(auditService.isAuditingEnabled()).toBe(true);
        });

        test('should return false when audit feature is disabled', () => {
            mockConfigService.isFeatureEnabled.mockReturnValue(false);
            expect(auditService.isAuditingEnabled()).toBe(false);
        });
    });

    describe('periodic flush', () => {
        test('should flush events on timer interval', async () => {
            const event: Omit<AuditEvent, 'timestamp'> = {
                eventType: 'user_action',
                action: 'test_action',
                severity: 'low',
                success: true
            };

            await auditService.auditEvent(event);

            // Advance timer by flush interval (60 seconds)
            jest.advanceTimersByTime(60000);

            expect(mockOutputChannelAppendLine).toHaveBeenCalledTimes(1);
        });

        test('should handle multiple flush cycles', async () => {
            await auditService.auditEvent({
                eventType: 'user_action',
                action: 'action1',
                severity: 'low',
                success: true
            });

            // First flush
            jest.advanceTimersByTime(60000);
            expect(mockOutputChannelAppendLine).toHaveBeenCalledTimes(1);

            // Add another event
            await auditService.auditEvent({
                eventType: 'user_action',
                action: 'action2',
                severity: 'low',
                success: true
            });

            // Second flush
            jest.advanceTimersByTime(60000);
            expect(mockOutputChannelAppendLine).toHaveBeenCalledTimes(2);
        });
    });

    describe('log formatting', () => {
        test('should format basic log entry correctly', async () => {
            const event: Omit<AuditEvent, 'timestamp'> = {
                eventType: 'user_action',
                action: 'test_action',
                severity: 'low',
                success: true
            };

            await auditService.auditEvent(event);
            jest.advanceTimersByTime(60000);

            const logCall = mockOutputChannelAppendLine.mock.calls[0][0];
            expect(logCall).toMatch(/\[\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z\]/);
            expect(logCall).toContain('LOW');
            expect(logCall).toContain('user_action');
            expect(logCall).toContain('SUCCESS');
            expect(logCall).toContain('test_action');
        });

        test('should format log entry with all fields', async () => {
            const event: Omit<AuditEvent, 'timestamp'> = {
                eventType: 'api_call',
                userId: 'user123',
                tenantId: 'tenant456',
                action: 'data_access',
                resource: 'sensitive_data',
                severity: 'high',
                success: false,
                errorMessage: 'Access denied',
                details: { reason: 'insufficient_permissions' }
            };

            await auditService.auditEvent(event);
            jest.advanceTimersByTime(60000);

            const logCall = mockOutputChannelAppendLine.mock.calls[0][0];
            expect(logCall).toContain('HIGH');
            expect(logCall).toContain('api_call');
            expect(logCall).toContain('FAILED');
            expect(logCall).toContain('data_access');
            expect(logCall).toContain('User: user123');
            expect(logCall).toContain('Tenant: tenant456');
            expect(logCall).toContain('Resource: sensitive_data');
            expect(logCall).toContain('Error: Access denied');
            expect(logCall).toContain('Details:');
            expect(logCall).toContain('insufficient_permissions');
        });
    });

    describe('dispose', () => {
        test('should clear flush interval', () => {
            auditService.dispose();

            const timerCount = jest.getTimerCount();
            expect(timerCount).toBe(0);
        });

        test('should dispose output channel', () => {
            auditService.dispose();
            expect(mockOutputChannelDispose).toHaveBeenCalled();
        });

        test('should flush remaining events on dispose', () => {
            // Add an event
            auditService.auditEvent({
                eventType: 'user_action',
                action: 'final_action',
                severity: 'low',
                success: true
            });

            auditService.dispose();

            // Should have attempted to flush
            expect(mockOutputChannelAppendLine).toHaveBeenCalled();
        });
    });
});