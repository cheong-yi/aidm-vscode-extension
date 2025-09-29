/**
 * Unit tests for SessionService
 */

import { SessionService, UserSession } from '../../../services/sessionService';
import * as vscode from 'vscode';

// Mock VSCode extension context
const mockContext: vscode.ExtensionContext = {
    subscriptions: [],
    workspaceState: {} as vscode.Memento,
    globalState: {} as vscode.Memento,
    extensionPath: '',
    extensionUri: {} as vscode.Uri,
    environmentVariableCollection: {} as vscode.EnvironmentVariableCollection,
    asAbsolutePath: jest.fn(),
    storageUri: {} as vscode.Uri,
    globalStorageUri: {} as vscode.Uri,
    logUri: {} as vscode.Uri,
    secretStorage: {} as vscode.SecretStorage,
    extensionMode: vscode.ExtensionMode.Test,
    extension: {} as vscode.Extension<any>,
    secrets: {} as vscode.SecretStorage,
    logPath: '',
    globalStoragePath: '',
    storagePath: ''
};

describe('SessionService', () => {
    let sessionService: SessionService;

    beforeEach(() => {
        sessionService = new SessionService(mockContext, {
            sessionTimeoutMinutes: 30,
            maxConcurrentSessions: 3,
            cleanupIntervalMinutes: 1
        });
    });

    afterEach(() => {
        if (sessionService) {
            sessionService.dispose();
        }
    });

    describe('createSession', () => {
        it('should create a session with valid parameters', async () => {
            const tenantId = 'tenant1';
            const userId = 'user1';
            const ipAddress = '192.168.1.1';
            const userAgent = 'Mozilla/5.0';

            const sessionId = await sessionService.createSession(tenantId, userId, ipAddress, userAgent);

            expect(sessionId).toBeDefined();
            expect(sessionId).toMatch(/^sess_/);

            const session = sessionService.getSession(sessionId);
            expect(session).toBeDefined();
            expect(session?.userId).toBe(userId);
            expect(session?.tenantId).toBe(tenantId);
            expect(session?.ipAddress).toBe(ipAddress);
            expect(session?.userAgent).toBe(userAgent);
            expect(session?.isActive).toBe(true);
        });

        it('should create session without optional parameters', async () => {
            const tenantId = 'tenant1';
            const userId = 'user1';

            const sessionId = await sessionService.createSession(tenantId, userId);

            expect(sessionId).toBeDefined();
            const session = sessionService.getSession(sessionId);
            expect(session?.userId).toBe(userId);
            expect(session?.tenantId).toBe(tenantId);
            expect(session?.ipAddress).toBeUndefined();
            expect(session?.userAgent).toBeUndefined();
        });

        it('should enforce max concurrent sessions limit', async () => {
            const tenantId = 'tenant1';
            const userId = 'user1';

            // Create maximum allowed sessions
            const session1 = await sessionService.createSession(tenantId, userId);
            const session2 = await sessionService.createSession(tenantId, userId);
            const session3 = await sessionService.createSession(tenantId, userId);

            // All sessions should be active
            expect(sessionService.getSession(session1)).toBeDefined();
            expect(sessionService.getSession(session2)).toBeDefined();
            expect(sessionService.getSession(session3)).toBeDefined();

            // Creating a 4th session should terminate the oldest (first) session
            const session4 = await sessionService.createSession(tenantId, userId);

            expect(sessionService.getSession(session1)).toBeNull(); // Should be terminated
            expect(sessionService.getSession(session2)).toBeDefined();
            expect(sessionService.getSession(session3)).toBeDefined();
            expect(sessionService.getSession(session4)).toBeDefined();
        });

        it('should throw error when service is disposed', async () => {
            sessionService.dispose();

            await expect(sessionService.createSession('tenant1', 'user1'))
                .rejects.toThrow('SessionService has been disposed');
        });
    });

    describe('updateSessionActivity', () => {
        it('should update last activity timestamp', async () => {
            const sessionId = await sessionService.createSession('tenant1', 'user1');
            const originalSession = sessionService.getSession(sessionId);
            const originalActivity = originalSession?.lastActivity;

            // Wait a bit to ensure timestamp difference
            await new Promise(resolve => setTimeout(resolve, 10));

            await sessionService.updateSessionActivity(sessionId);

            const updatedSession = sessionService.getSession(sessionId);
            expect(updatedSession?.lastActivity).not.toBe(originalActivity);
            expect(new Date(updatedSession!.lastActivity).getTime())
                .toBeGreaterThan(new Date(originalActivity!).getTime());
        });

        it('should handle non-existent session gracefully', async () => {
            await expect(sessionService.updateSessionActivity('invalid-session'))
                .resolves.not.toThrow();
        });

        it('should handle disposed service gracefully', async () => {
            sessionService.dispose();
            await expect(sessionService.updateSessionActivity('session-id'))
                .resolves.not.toThrow();
        });
    });

    describe('terminateSession', () => {
        it('should terminate an active session', async () => {
            const sessionId = await sessionService.createSession('tenant1', 'user1');

            expect(sessionService.getSession(sessionId)).toBeDefined();

            await sessionService.terminateSession(sessionId);

            expect(sessionService.getSession(sessionId)).toBeNull();
        });

        it('should handle non-existent session gracefully', async () => {
            await expect(sessionService.terminateSession('invalid-session'))
                .resolves.not.toThrow();
        });

        it('should handle disposed service gracefully', async () => {
            sessionService.dispose();
            await expect(sessionService.terminateSession('session-id'))
                .resolves.not.toThrow();
        });
    });

    describe('getSession', () => {
        it('should return active session', async () => {
            const sessionId = await sessionService.createSession('tenant1', 'user1');
            const session = sessionService.getSession(sessionId);

            expect(session).toBeDefined();
            expect(session?.sessionId).toBe(sessionId);
            expect(session?.isActive).toBe(true);
        });

        it('should return null for non-existent session', () => {
            const session = sessionService.getSession('invalid-session');
            expect(session).toBeNull();
        });

        it('should return null for terminated session', async () => {
            const sessionId = await sessionService.createSession('tenant1', 'user1');
            await sessionService.terminateSession(sessionId);

            const session = sessionService.getSession(sessionId);
            expect(session).toBeNull();
        });

        it('should return null when service is disposed', async () => {
            const sessionId = await sessionService.createSession('tenant1', 'user1');
            sessionService.dispose();

            const session = sessionService.getSession(sessionId);
            expect(session).toBeNull();
        });
    });

    describe('getUserSessions', () => {
        it('should return all active sessions for a user', async () => {
            const tenantId = 'tenant1';
            const userId = 'user1';

            const session1 = await sessionService.createSession(tenantId, userId);
            const session2 = await sessionService.createSession(tenantId, userId);
            await sessionService.createSession('tenant2', userId); // Different tenant
            await sessionService.createSession(tenantId, 'user2'); // Different user

            const userSessions = sessionService.getUserSessions(userId, tenantId);

            expect(userSessions).toHaveLength(2);
            expect(userSessions.some(s => s.sessionId === session1)).toBe(true);
            expect(userSessions.some(s => s.sessionId === session2)).toBe(true);
        });

        it('should return empty array when service is disposed', async () => {
            await sessionService.createSession('tenant1', 'user1');
            sessionService.dispose();

            const userSessions = sessionService.getUserSessions('user1', 'tenant1');
            expect(userSessions).toEqual([]);
        });
    });

    describe('getSessionStats', () => {
        it('should return correct session statistics', async () => {
            await sessionService.createSession('tenant1', 'user1');
            await sessionService.createSession('tenant1', 'user2');
            await sessionService.createSession('tenant2', 'user3');

            const stats = sessionService.getSessionStats();

            expect(stats.total).toBe(3);
            expect(stats.active).toBe(3);
            expect(stats.byTenant['tenant1']).toBe(2);
            expect(stats.byTenant['tenant2']).toBe(1);
        });

        it('should exclude terminated sessions from active count', async () => {
            const session1 = await sessionService.createSession('tenant1', 'user1');
            const session2 = await sessionService.createSession('tenant1', 'user2');

            await sessionService.terminateSession(session1);

            const stats = sessionService.getSessionStats();

            expect(stats.total).toBe(2);
            expect(stats.active).toBe(1);
            expect(stats.byTenant['tenant1']).toBe(1);
        });

        it('should return zero stats when service is disposed', async () => {
            await sessionService.createSession('tenant1', 'user1');
            sessionService.dispose();

            const stats = sessionService.getSessionStats();
            expect(stats.total).toBe(0);
            expect(stats.active).toBe(0);
            expect(stats.byTenant).toEqual({});
        });
    });

    describe('dispose', () => {
        it('should clean up resources and mark service as disposed', async () => {
            const sessionId = await sessionService.createSession('tenant1', 'user1');

            expect(sessionService.getSession(sessionId)).toBeDefined();

            sessionService.dispose();

            // Service should be marked as disposed
            expect(sessionService.getSession(sessionId)).toBeNull();
            expect(sessionService.getSessionStats().active).toBe(0);

            // Should handle multiple dispose calls gracefully
            expect(() => sessionService.dispose()).not.toThrow();
        });

        it('should terminate all active sessions on disposal', async () => {
            await sessionService.createSession('tenant1', 'user1');
            await sessionService.createSession('tenant1', 'user2');
            await sessionService.createSession('tenant2', 'user3');

            const statsBefore = sessionService.getSessionStats();
            expect(statsBefore.active).toBe(3);

            sessionService.dispose();

            const statsAfter = sessionService.getSessionStats();
            expect(statsAfter.active).toBe(0);
        });
    });

    describe('session ID generation', () => {
        it('should generate unique session IDs', async () => {
            const sessionIds = new Set();

            for (let i = 0; i < 10; i++) {
                const sessionId = await sessionService.createSession('tenant1', `user${i}`);
                expect(sessionIds.has(sessionId)).toBe(false);
                sessionIds.add(sessionId);
            }

            expect(sessionIds.size).toBe(10);
        });

        it('should generate session IDs with correct format', async () => {
            const sessionId = await sessionService.createSession('tenant1', 'user1');

            expect(sessionId).toMatch(/^sess_[a-z0-9]+_[a-z0-9]{9}$/);
        });
    });

    describe('session timeout and cleanup', () => {
        it('should handle session cleanup configuration', () => {
            const customService = new SessionService(mockContext, {
                sessionTimeoutMinutes: 60,
                maxConcurrentSessions: 5,
                cleanupIntervalMinutes: 2
            });

            // Test that service initializes with custom config
            expect(customService).toBeDefined();

            customService.dispose();
        });

        it('should use default configuration when no config provided', () => {
            const defaultService = new SessionService(mockContext);

            expect(defaultService).toBeDefined();

            defaultService.dispose();
        });
    });
});