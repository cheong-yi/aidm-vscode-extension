/**
 * Session Service
 * Handles user session lifecycle management for enterprise environments
 * Following VSCode extension patterns with proper disposal and context usage
 */

import * as vscode from 'vscode';
import { LoggerFactory } from '../utils/logger';

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

export interface SessionConfig {
    sessionTimeoutMinutes: number;
    maxConcurrentSessions: number;
    cleanupIntervalMinutes: number;
}

export class SessionService {
    private activeSessions: Map<string, UserSession> = new Map();
    private cleanupInterval?: NodeJS.Timeout;
    private readonly sessionConfig: SessionConfig;
    private isDisposed = false;
    private logger = LoggerFactory.getLogger('SessionService');

    constructor(
        private context: vscode.ExtensionContext,
        config?: Partial<SessionConfig>
    ) {
        // Set default configuration
        this.sessionConfig = {
            sessionTimeoutMinutes: 30,
            maxConcurrentSessions: 3,
            cleanupIntervalMinutes: 1,
            ...config
        };

        this.logger.info('Initialized with session management', {
            timeout: this.sessionConfig.sessionTimeoutMinutes + ' minutes',
            maxSessions: this.sessionConfig.maxConcurrentSessions
        });

        this.startSessionCleanup();
    }

    /**
     * Create a new user session
     */
    public async createSession(
        tenantId: string,
        userId: string,
        ipAddress?: string,
        userAgent?: string
    ): Promise<string> {
        if (this.isDisposed) {
            throw new Error('SessionService has been disposed');
        }

        try {
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

            if (existingSessions.length >= this.sessionConfig.maxConcurrentSessions) {
                // Terminate oldest session
                const oldestSession = existingSessions.sort((a, b) =>
                    new Date(a.startTime).getTime() - new Date(b.startTime).getTime())[0];
                await this.terminateSession(oldestSession.sessionId);

                this.logger.info('Terminated oldest session due to concurrent limit', {
                    userId,
                    tenantId,
                    terminatedSessionId: oldestSession.sessionId
                });
            }

            this.activeSessions.set(sessionId, session);

            this.logger.info('Session created successfully', {
                sessionId,
                userId,
                tenantId,
                ipAddress: ipAddress ? `${ipAddress.substring(0, 8)}...` : undefined // Partial IP for privacy
            });

            return sessionId;

        } catch (error) {
            this.logger.error('Failed to create session', error, {
                tenantId,
                userId,
                error: error instanceof Error ? error.message : 'Unknown error'
            });
            throw new Error('Failed to create session');
        }
    }

    /**
     * Update session activity timestamp
     */
    public async updateSessionActivity(sessionId: string): Promise<void> {
        if (this.isDisposed) {
            return;
        }

        try {
            const session = this.activeSessions.get(sessionId);
            if (session && session.isActive) {
                session.lastActivity = new Date().toISOString();
                this.activeSessions.set(sessionId, session);

                this.logger.debug('Session activity updated', {
                    sessionId,
                    userId: session.userId
                });
            } else {
                this.logger.warn('Attempted to update inactive or missing session', {
                    sessionId
                });
            }
        } catch (error) {
            this.logger.error('Failed to update session activity', error, {
                sessionId,
                error: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    }

    /**
     * Terminate a user session
     */
    public async terminateSession(sessionId: string): Promise<void> {
        if (this.isDisposed) {
            return;
        }

        try {
            const session = this.activeSessions.get(sessionId);
            if (session) {
                session.isActive = false;
                this.activeSessions.set(sessionId, session);

                this.logger.info('Session terminated', {
                    sessionId,
                    userId: session.userId,
                    tenantId: session.tenantId,
                    duration: Math.floor((Date.now() - new Date(session.startTime).getTime()) / 1000 / 60) + ' minutes'
                });
            } else {
                this.logger.warn('Attempted to terminate non-existent session', {
                    sessionId
                });
            }
        } catch (error) {
            this.logger.error('Failed to terminate session', error, {
                sessionId,
                error: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    }

    /**
     * Get active session by ID
     */
    public getSession(sessionId: string): UserSession | null {
        if (this.isDisposed) {
            return null;
        }

        const session = this.activeSessions.get(sessionId);
        return session && session.isActive ? session : null;
    }

    /**
     * Get all active sessions for a user
     */
    public getUserSessions(userId: string, tenantId: string): UserSession[] {
        if (this.isDisposed) {
            return [];
        }

        return Array.from(this.activeSessions.values())
            .filter(s => s.userId === userId && s.tenantId === tenantId && s.isActive);
    }

    /**
     * Get session statistics
     */
    public getSessionStats(): { total: number; active: number; byTenant: Record<string, number> } {
        if (this.isDisposed) {
            return { total: 0, active: 0, byTenant: {} };
        }

        const sessions = Array.from(this.activeSessions.values());
        const activeSessions = sessions.filter(s => s.isActive);

        const byTenant: Record<string, number> = {};
        activeSessions.forEach(session => {
            byTenant[session.tenantId] = (byTenant[session.tenantId] || 0) + 1;
        });

        return {
            total: sessions.length,
            active: activeSessions.length,
            byTenant
        };
    }

    /**
     * Clean up expired sessions
     */
    private startSessionCleanup(): void {
        if (this.isDisposed) {
            return;
        }

        this.cleanupInterval = setInterval(async () => {
            if (this.isDisposed) {
                return;
            }

            try {
                const now = new Date();
                const timeoutMs = this.sessionConfig.sessionTimeoutMinutes * 60 * 1000;
                let expiredCount = 0;

                for (const [sessionId, session] of this.activeSessions) {
                    if (session.isActive) {
                        const lastActivity = new Date(session.lastActivity);
                        if (now.getTime() - lastActivity.getTime() > timeoutMs) {
                            await this.terminateSession(sessionId);
                            expiredCount++;
                        }
                    }
                }

                if (expiredCount > 0) {
                    this.logger.info('Session cleanup completed', {
                        expiredSessions: expiredCount,
                        activeSessions: this.getSessionStats().active
                    });
                }

                // Clean up inactive sessions from memory (keep for audit for a while)
                const cleanupTime = now.getTime() - (24 * 60 * 60 * 1000); // 24 hours
                for (const [sessionId, session] of this.activeSessions) {
                    if (!session.isActive && new Date(session.lastActivity).getTime() < cleanupTime) {
                        this.activeSessions.delete(sessionId);
                    }
                }

            } catch (error) {
                this.logger.error('Session cleanup failed', error, {
                    error: error instanceof Error ? error.message : 'Unknown error'
                });
            }
        }, this.sessionConfig.cleanupIntervalMinutes * 60 * 1000);

        this.logger.debug('Session cleanup started', {
            intervalMinutes: this.sessionConfig.cleanupIntervalMinutes
        });
    }

    /**
     * Generate a unique session ID
     */
    private generateSessionId(): string {
        const timestamp = Date.now().toString(36);
        const randomPart = Math.random().toString(36).substring(2, 11);
        return `sess_${timestamp}_${randomPart}`;
    }

    /**
     * Clean up resources following VSCode extension disposal pattern
     */
    public dispose(): void {
        if (this.isDisposed) {
            return;
        }

        this.isDisposed = true;

        // Clear cleanup interval
        if (this.cleanupInterval) {
            clearInterval(this.cleanupInterval);
            this.cleanupInterval = undefined;
        }

        // Terminate all active sessions
        const activeSessions = Array.from(this.activeSessions.values())
            .filter(s => s.isActive);

        for (const session of activeSessions) {
            session.isActive = false;
            this.activeSessions.set(session.sessionId, session);
        }

        this.logger.info('SessionService disposed', {
            terminatedSessions: activeSessions.length
        });

        // Clear sessions map
        this.activeSessions.clear();
    }
}