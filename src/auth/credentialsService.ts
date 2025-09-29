import axios from 'axios';
import { CONFIG } from '../common/config';
import { LoginResponse } from './authTypes';
import { log } from '../utils/logger';

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
}