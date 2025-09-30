import axios from 'axios';
import { CONFIG } from '../common/config';
import { LoginResponse } from './authTypes';
import { log } from '../utils/logger';

interface RefreshTokenResponse {
    success: boolean;
    accessToken?: string;
    refreshToken?: string;
    error?: string;
}

export class CredentialsService {
    public async login(username: string, password: string, is_ad_login_successful: boolean): Promise<LoginResponse> {
        log("INFO", "CredentialsService", "Attempting credentials login");
        const base_url = `${CONFIG.api.baseUrl}/authorize_login_with_username_password`;
        
        try {
            const response = await axios.post<LoginResponse>(base_url, {
                username,
                password,
                is_successful_AD_logged_in: is_ad_login_successful
            });

            if (response.data.status !== "Success") {
                throw new Error(response.statusText || "Login failed");
            }

            return response.data;
        } catch (error) {
            console.error('[CredentialsService] Error during login:', error);
            throw error;
        }
    }

    /**
     * Refresh an expired access token using a refresh token
     * @param refreshToken The refresh token to use for getting a new access token
     * @returns Promise containing the refresh result with new tokens
     */
    public async refreshToken(refreshToken: string): Promise<RefreshTokenResponse> {
        log("INFO", "CredentialsService", "Attempting token refresh");
        const refreshUrl = `${CONFIG.api.baseUrl}/refresh_token`;

        try {
            const response = await axios.post(refreshUrl, {
                refresh_token: refreshToken
            }, {
                headers: {
                    'Content-Type': 'application/json'
                },
                timeout: 10000 // 10 second timeout
            });

            if (response.status === 200 && response.data.access_token) {
                log("INFO", "CredentialsService", "Token refresh successful");
                return {
                    success: true,
                    accessToken: response.data.access_token,
                    refreshToken: response.data.refresh_token || refreshToken // Use new refresh token if provided
                };
            } else {
                log("WARN", "CredentialsService", "Token refresh failed - invalid response", { status: response.status });
                return {
                    success: false,
                    error: response.data.error || 'Invalid refresh token response'
                };
            }
        } catch (error) {
            if (axios.isAxiosError(error)) {
                const status = error.response?.status;
                const errorMessage = error.response?.data?.error || error.message;

                log("ERROR", "CredentialsService", "Token refresh failed", {
                    status,
                    error: errorMessage
                });

                // Handle specific error cases
                if (status === 401 || status === 403) {
                    return {
                        success: false,
                        error: 'Refresh token expired or invalid'
                    };
                } else if (status === 429) {
                    return {
                        success: false,
                        error: 'Too many refresh attempts - please try again later'
                    };
                } else {
                    return {
                        success: false,
                        error: `Token refresh failed: ${errorMessage}`
                    };
                }
            } else {
                log("ERROR", "CredentialsService", "Unexpected error during token refresh", { error });
                return {
                    success: false,
                    error: 'Network error during token refresh'
                };
            }
        }
    }
}