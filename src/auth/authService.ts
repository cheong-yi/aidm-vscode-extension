// authService.ts
import * as vscode from 'vscode';
import { AuthState, SSOError } from './authTypes';
import { authStateManager, DEFAULT_AUTH_STATE } from './authStateManager';
import { TokenHelper } from './laks/tokenHelper';
import { CONFIG } from '../common/config';
import { CredentialsService } from './credentialsService';
import { SessionService } from './sessionService';
import { getLocalServerInstance } from './laks/localServer';
import { log } from '../utils/logger'; // Import log function
import { AgencyService } from './agencyService';
import { ApiService } from '../api/apiService';
import { SecureTokenManager, RefreshResult } from './secureTokenManager';

export class AuthService {
    private credentialsService: CredentialsService;
    private sessionService: SessionService;
    private secretStorage: vscode.SecretStorage;
    private apiService: ApiService;
    private agencyService: AgencyService;
    private secureTokenManager: SecureTokenManager;
    
    constructor(private context: vscode.ExtensionContext) {
        this.credentialsService = new CredentialsService();
        this.sessionService = new SessionService(context);
        this.secretStorage = context.secrets;
        this.apiService = new ApiService();
        this.agencyService = new AgencyService(this.apiService, this.sessionService);

        // Initialize secure token manager with refresh callback
        this.secureTokenManager = new SecureTokenManager(
            this.secretStorage,
            this.handleTokenRefresh.bind(this)
        );

        // Initialize TokenHelper with secure token manager for backward compatibility
        TokenHelper.initializeWithSecureManager(this.secureTokenManager);

        log('INFO', 'AuthService', 'Initializing AuthService with secure token management');

        // Migrate any existing tokens and load session state
        this.initializeSecureAuth().then(() => {
            log('INFO', 'AuthService', 'Secure authentication initialization completed');
        });
    }

    /**
     * Initialize secure authentication by migrating existing tokens and loading session state
     */
    private async initializeSecureAuth(): Promise<void> {
        try {
            // Migrate any existing tokens from insecure storage
            await this.secureTokenManager.migrateFromGlobalState(this.context.globalState);

            // Load session state with secure token
            const savedState = await this.loadSessionState();
            authStateManager.updateState(savedState);
        } catch (error) {
            log('ERROR', 'AuthService', 'Failed to initialize secure authentication', { error });
        }
    }

    /**
     * Handle token refresh using the credentials service
     */
    private async handleTokenRefresh(refreshToken: string): Promise<RefreshResult> {
        try {
            log('INFO', 'AuthService', 'Attempting token refresh');

            // Call the credentials service to refresh the token
            const refreshResult = await this.credentialsService.refreshToken(refreshToken);

            if (refreshResult.success && refreshResult.accessToken) {
                log('INFO', 'AuthService', 'Token refresh successful');

                // Update the current auth state with the new token
                const currentState = this.authState;
                const updatedState: AuthState = {
                    ...currentState,
                    token: refreshResult.accessToken
                };

                // Save the updated state
                await this.saveSessionState(updatedState);
                authStateManager.updateState({ token: refreshResult.accessToken });

                return {
                    success: true,
                    accessToken: refreshResult.accessToken,
                    refreshToken: refreshResult.refreshToken
                };
            } else {
                log('WARN', 'AuthService', 'Token refresh failed - invalid response from credentials service');
                return { success: false, error: refreshResult.error || 'Invalid refresh response' };
            }
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            log('ERROR', 'AuthService', 'Token refresh failed', { error: errorMessage });
            return { success: false, error: errorMessage };
        }
    }

    private async storePassword(password: string): Promise<void> {
        await this.secretStorage.store('genie-password', password);
        log('DEBUG', 'AuthService', 'Stored user password securely.');
    }

    private async clearPassword(): Promise<void> {
        await this.secretStorage.delete('genie-password');
        log('DEBUG', 'AuthService', 'Cleared stored password.');
    }

    private async getStoredPassword(): Promise<string | undefined> {
        try {
            const password = await this.secretStorage.get('genie-password');
            log('DEBUG', 'AuthService', 'Retrieved stored password.');
            return password;
        } catch (error) {
            log('ERROR', 'AuthService', 'Error retrieving password', { error });
            return undefined;
        }
    }

    private async storeLoginMethod(isAdLogin: boolean): Promise<void> {
        await this.secretStorage.store('genie-login-method', isAdLogin.toString());
        log('DEBUG', 'AuthService', `Stored login method: ${isAdLogin ? 'AD Login' : 'Normal Login'}`);
    }

    public async getStoredLoginMethod(): Promise<boolean | undefined> {
        try {
            const method = await this.secretStorage.get('genie-login-method');
            log('DEBUG', 'AuthService', 'Retrieved stored login method', { method });
            return method ? method === 'true' : undefined;
        } catch (error) {
            log('ERROR', 'AuthService', 'Error retrieving login method', { error });
            return undefined;
        }
    }

    private async clearLoginMethod(): Promise<void> {
        await this.secretStorage.delete('genie-login-method');
        log('DEBUG', 'AuthService', 'Cleared stored login method.');
    }

    public async loginWithCredentials(
        username: string, 
        password: string, 
        is_ad_login_successful: boolean
    ): Promise<{ success: boolean, message: string }> {
        log('INFO', 'AuthService', 'Attempting login', { username, is_ad_login_successful });

        try {
            const loginResponse = await this.credentialsService.login(username, password, is_ad_login_successful);
            log('INFO', 'AuthService', 'Login successful', { username });

            if (!is_ad_login_successful && password) {
                await this.storePassword(password);
            }
            await this.storeLoginMethod(is_ad_login_successful);

            // Super admin validation - no hardcoded defaults
            if (loginResponse.isSuperAdmin) {
                log('INFO', 'AuthService', 'Super admin login detected', { username });

                // Super admins must have valid project/agency from backend
                if (loginResponse.project_id === null || loginResponse.agency_id === null) {
                    log('WARN', 'AuthService', 'Super admin missing required project/agency assignment', { username });
                    throw new Error('Super admin account requires project and agency assignment. Please contact administrator.');
                }
            }

            // Store token securely
            await this.secureTokenManager.storeToken(loginResponse.token);

            const newState: AuthState = {
                isLoggedIn: true,
                username: username,
                email: username,
                agency_id: loginResponse.agency_id,
                agency_name: loginResponse.agency_name,
                isProjectAdmin: loginResponse.isProjectAdmin,
                isSuperAdmin: loginResponse.isSuperAdmin,
                project_id: loginResponse.project_id,
                token: loginResponse.token,
            };

            await this.context.globalState.update('username', username);
            this.sessionService.saveSessionData(newState);
            authStateManager.updateState(newState);
            
            // After successful login, fetch agencies 
            this.fetchAgencies();

            return { success: true, message: "Login successful" };
        } catch (error) {
            log('ERROR', 'AuthService', 'Login failed', { username, error });
            await this.clearPassword();
            await this.clearLoginMethod();
            return { success: false, message: "An error occurred during login. Please try again." };
        }
    }

    getStoredCredentials(): Promise<{ username?: string; password?: string }> {
        const username = this.context.globalState.get<string>('username');
        return this.getStoredPassword().then(password => ({
            username,
            password
        }));
    }

    async logout(): Promise<void> {
        await this.clearPassword();
        await this.clearLoginMethod();
        await this.secureTokenManager.clearTokens(); // Use secure token clearing
        await TokenHelper.clearToken(); // Legacy cleanup for backward compatibility
        await this.saveSessionState(DEFAULT_AUTH_STATE);
        await this.context.globalState.update('username', undefined);
        authStateManager.resetState();
    }

    async performOAuthLogin(): Promise<{ success: boolean; message: string; error?: SSOError }> {
        let received_token: string = '';
        try {
            const localServer = getLocalServerInstance();
            
            // Start OAuth flow and wait for server to be ready
            await localServer.start();

            // Create a promise to handle success or error events
            const authPromise = new Promise<void>((resolve, reject) => {
                localServer.events.once('success', (token) => {
                    log('INFO', 'AuthService', 'OAuth token received successfully');
                    received_token = token;
                    resolve(); // Resolve on success
                });

                localServer.events.once('error', (error) => {
                    console.error('Authentication error:', error);
                    reject(error); // Reject on error
                });
            });

            // Open the authentication URL
            const authUrl = `${CONFIG.auth.authority}/oauth2/v2.0/authorize?` + 
                `client_id=${CONFIG.auth.clientId}&` +
                `response_type=code&` +
                `scope=${encodeURIComponent(CONFIG.auth.scopes)}&` +
                `redirect_uri=${encodeURIComponent(CONFIG.auth.redirectUri)}`;
            await vscode.env.openExternal(vscode.Uri.parse(authUrl));

            vscode.window.showInformationMessage('Please complete the authentication in your browser.');

            // Wait for authentication to complete
            await authPromise;

            // Token validation or fetching user info logic here
            const isSuccess = await this.fetchUserInfo(received_token);
            
            if (!isSuccess) {
                throw new Error('Failed to fetch user info');
            }

            return { success: true, message: "OAuth login successful" };
        } catch (error: any) {
            console.error('OAuth login error:', error);
            return { 
                success: false, 
                message: error.message || "OAuth login failed", 
                error: {
                    message: error.message,
                    name: error.name,
                    stack: error.stack,
                },
            };
        }
    }


    private async fetchUserInfo(token: string) {
        try {
            // Store token securely first for validation
            await this.secureTokenManager.storeToken(token);

            // Validate token using secure manager
            const isValid = await this.secureTokenManager.isTokenValid();
            if (!isValid) {
                throw new Error('Token is invalid or expired');
            }

            // Extract username from token using secure method
            const username = this.extractUsernameFromToken(token);
            if (!username) {
                throw new Error('Invalid token structure - missing username');
            }

            const response = await this.loginWithCredentials(username, '', true);

            if (!response.success) {
                throw new Error('Failed to login with OAuth token');
            } else {
                return true;
            }
        } catch (error) {
            log('ERROR', 'AuthService', 'Error fetching user info', { error });
            throw new Error('Failed to fetch user information');
        }
    }

    private async loadSessionState(): Promise<Partial<AuthState>> {
        // Get token from secure storage
        const secureToken = await this.secureTokenManager.getToken();

        return {
            isLoggedIn: this.context.globalState.get('isLoggedIn'),
            username: this.context.globalState.get('username'),
            email: this.context.globalState.get('email'),
            agency_id: this.context.globalState.get('agency_id'),
            agency_name: this.context.globalState.get('agency_name'),
            isProjectAdmin: this.context.globalState.get('isProjectAdmin'),
            isSuperAdmin: this.context.globalState.get('isSuperAdmin'),
            project_id: this.context.globalState.get('project_id'),
            token: secureToken || TokenHelper.getTokenSync(), // Fallback for migration
        };
    }

    private async saveSessionState(state: AuthState): Promise<void> {
        const promises: Promise<void>[] = [];

        Object.entries(state).forEach(([key, value]) => {
            if (key === 'token') {
                // Store token securely
                promises.push(this.secureTokenManager.storeToken(value as string));
            } else {
                promises.push(this.context.globalState.update(key, value));
            }
        });

        await Promise.allSettled(promises);
    }

    get authState(): AuthState {
        return authStateManager.getState();
    }
    
    /**
     * Update the agency for super admin users
     * @param agency_id The new agency ID
     * @param agency_name The name of the new agency
     */
    public updateAgency(agency_id: number, agency_name: string): void {
        if (!this.authState.isSuperAdmin) {
            log('WARN', 'AuthService', 'Non-super admin attempted to change agency', { 
                username: this.authState.username 
            });
            return;
        }
        
        log('INFO', 'AuthService', 'Super admin changing agency', { 
            username: this.authState.username,
            from: this.authState.agency_id,
            to: agency_id
        });
        
        // Create a partial state with just the agency changes
        const agencyUpdate: Partial<AuthState> = {
            agency_id,
            agency_name
        };
        
        // Merge with current state to create a complete state
        const completeState: AuthState = {
            ...this.authState,
            ...agencyUpdate
        };
        
        // Update global state with the complete state
        this.sessionService.saveSessionData(completeState);
        
        // Update auth state manager
        authStateManager.updateState(agencyUpdate);
    }

    /**
     * Fetch all available agencies and store them in session
     * This is primarily useful for Super Admins who need to switch between agencies
     */
    public async fetchAgencies(): Promise<void> {
        if (!this.authState.isLoggedIn) {
            log('WARN', 'AuthService', 'Cannot fetch agencies: User not logged in');
            return;
        }
        
        try {
            log('INFO', 'AuthService', 'Fetching agencies for user', { 
                username: this.authState.username,
                isSuperAdmin: this.authState.isSuperAdmin
            });
            
            const agencies = await this.agencyService.fetchAndStoreAgencies();
            log('INFO', 'AuthService', 'Agencies fetched and stored', { count: agencies.length });
        } catch (error) {
            log('ERROR', 'AuthService', 'Failed to fetch agencies', { error });
        }
    }
    
    /**
     * Get all available agencies from the session
     * @returns Array of agencies or empty array if none found
     */
    public getAvailableAgencies() {
        return this.agencyService.getAgencies();
    }

    /**
     * Extract username from token using secure method (no unsafe decode)
     * @param token JWT token to extract username from
     * @returns username/upn or null if extraction fails
     */
    private extractUsernameFromToken(token: string): string | null {
        try {
            // Validate JWT structure (3 parts separated by dots)
            const parts = token.split('.');
            if (parts.length !== 3) {
                log('WARN', 'AuthService', 'Invalid JWT token structure');
                return null;
            }

            // Safely decode payload (middle part) without signature verification
            const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());

            // Extract username from common claims
            const username = payload.upn || payload.email || payload.preferred_username || payload.sub;

            if (!username) {
                log('WARN', 'AuthService', 'Token missing username claims');
                return null;
            }

            return username;
        } catch (error) {
            log('ERROR', 'AuthService', 'Failed to extract username from token', { error });
            return null;
        }
    }

    /**
     * Check if current user's token is still valid using secure token manager
     * Should be called before making authenticated API requests
     * @returns true if authenticated with valid token
     */
    public async isCurrentTokenValid(): Promise<boolean> {
        const currentState = this.authState;
        if (!currentState.isLoggedIn) {
            return false;
        }
        return await this.secureTokenManager.isTokenValid();
    }

    /**
     * Get current valid token, with automatic refresh if needed
     * @returns Valid token or null if not authenticated
     */
    public async getCurrentToken(): Promise<string | null> {
        if (!this.authState.isLoggedIn) {
            return null;
        }
        return await this.secureTokenManager.getToken();
    }

    /**
     * Get token expiry time for current user
     * @returns Expiry timestamp in milliseconds or null if no token
     */
    public async getCurrentTokenExpiry(): Promise<number | null> {
        if (!this.authState.isLoggedIn) {
            return null;
        }
        return await this.secureTokenManager.getTokenExpiry();
    }
}