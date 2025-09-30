// tokenHelper.ts
import * as vscode from 'vscode';
import { SecureTokenManager } from '../secureTokenManager';
import { log } from '../../utils/logger';

/**
 * Legacy TokenHelper class maintained for backward compatibility
 *
 * @deprecated This class stores tokens insecurely in VSCode workspace configuration.
 * Use SecureTokenManager directly for new implementations.
 * This class will be removed in a future version after complete migration.
 */
export class TokenHelper {
    private static secureTokenManager: SecureTokenManager | null = null;

    /**
     * Initialize with SecureTokenManager instance for enhanced security
     * @param manager SecureTokenManager instance
     */
    static initializeWithSecureManager(manager: SecureTokenManager): void {
        this.secureTokenManager = manager;
        log('INFO', 'TokenHelper', 'Initialized with secure token manager');
    }

    /**
     * Set token using secure storage when available, fallback to legacy storage
     * @deprecated Use SecureTokenManager.storeToken() directly
     */
    static async setToken(token: string): Promise<void> {
        if (this.secureTokenManager) {
            try {
                await this.secureTokenManager.storeToken(token);
                log('DEBUG', 'TokenHelper', 'Token stored securely');
                return;
            } catch (error) {
                log('ERROR', 'TokenHelper', 'Failed to store token securely, falling back to legacy', {
                    error: error instanceof Error ? error.message : String(error)
                });
            }
        }

        // Legacy fallback - insecure storage
        vscode.workspace.getConfiguration().update('tdlc-code-assist.auth.token', token, true);
        log('WARN', 'TokenHelper', 'Token stored using legacy insecure method');
    }

    /**
     * Get token from secure storage when available, fallback to legacy storage
     * @deprecated Use SecureTokenManager.getToken() directly
     */
    static async getToken(): Promise<string | undefined> {
        if (this.secureTokenManager) {
            try {
                const secureToken = await this.secureTokenManager.getToken();
                if (secureToken) {
                    log('DEBUG', 'TokenHelper', 'Retrieved token from secure storage');
                    return secureToken;
                }
            } catch (error) {
                log('ERROR', 'TokenHelper', 'Failed to retrieve secure token, falling back to legacy', {
                    error: error instanceof Error ? error.message : String(error)
                });
            }
        }

        // Legacy fallback - insecure storage
        const legacyToken = vscode.workspace.getConfiguration('tdlc-code-assist').get<string>('auth.token');
        if (legacyToken) {
            log('WARN', 'TokenHelper', 'Retrieved token from legacy insecure storage');
        }
        return legacyToken;
    }

    /**
     * Synchronous version for backward compatibility (returns only legacy token)
     * @deprecated Use async getToken() or SecureTokenManager.getToken() directly
     */
    static getTokenSync(): string | undefined {
        log('WARN', 'TokenHelper', 'Using deprecated synchronous token retrieval');
        return vscode.workspace.getConfiguration('tdlc-code-assist').get('auth.token');
    }

    /**
     * Clear token from both secure and legacy storage
     * @deprecated Use SecureTokenManager.clearTokens() directly
     */
    static async clearToken(): Promise<void> {
        const promises: Promise<any>[] = [];

        // Clear from secure storage
        if (this.secureTokenManager) {
            try {
                promises.push(this.secureTokenManager.clearTokens());
                log('DEBUG', 'TokenHelper', 'Cleared secure tokens');
            } catch (error) {
                log('ERROR', 'TokenHelper', 'Failed to clear secure tokens', {
                    error: error instanceof Error ? error.message : String(error)
                });
            }
        }

        // Clear from legacy storage
        promises.push(
            Promise.resolve(vscode.workspace.getConfiguration().update('tdlc-code-assist.auth.token', undefined, true))
        );

        await Promise.allSettled(promises);
        log('INFO', 'TokenHelper', 'Token cleanup completed');
    }

    /**
     * Synchronous version for backward compatibility (clears only legacy token)
     * @deprecated Use async clearToken() or SecureTokenManager.clearTokens() directly
     */
    static clearTokenSync(): void {
        log('WARN', 'TokenHelper', 'Using deprecated synchronous token clearing');
        vscode.workspace.getConfiguration().update('tdlc-code-assist.auth.token', undefined, true);
    }

    /**
     * Check if token is valid using secure validation when available
     * @deprecated Use SecureTokenManager.isTokenValid() directly
     */
    static async isTokenValid(): Promise<boolean> {
        if (this.secureTokenManager) {
            try {
                return await this.secureTokenManager.isTokenValid();
            } catch (error) {
                log('ERROR', 'TokenHelper', 'Failed to validate token securely', {
                    error: error instanceof Error ? error.message : String(error)
                });
                return false;
            }
        }

        // Legacy validation - basic existence check only
        const legacyToken = this.getTokenSync();
        return !!legacyToken;
    }

    /**
     * Get token expiry using secure manager when available
     * @deprecated Use SecureTokenManager.getTokenExpiry() directly
     */
    static async getTokenExpiry(): Promise<number | null> {
        if (this.secureTokenManager) {
            try {
                return await this.secureTokenManager.getTokenExpiry();
            } catch (error) {
                log('ERROR', 'TokenHelper', 'Failed to get token expiry securely', {
                    error: error instanceof Error ? error.message : String(error)
                });
                return null;
            }
        }

        log('WARN', 'TokenHelper', 'Token expiry not available in legacy mode');
        return null;
    }
}