import axios, { AxiosRequestConfig } from 'axios';
import { CONFIG } from '../../common/config';
import { TokenHelper } from './tokenHelper';
import { log } from '../../utils/logger';

export async function exchangeCodeForToken(code: string): Promise<string> {

    // token exchange logic
    try {
        const tokenUrl = CONFIG.auth.authority + '/oauth2/v2.0/token';
        
        const http_header: AxiosRequestConfig = {
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
        };

        const params = {
            client_id: CONFIG.auth.clientId,
            code: code,
            grant_type: 'authorization_code',
            scope: CONFIG.auth.scopes,
            redirect_uri: CONFIG.auth.redirectUri,
        };

        const response = await axios.post(tokenUrl, params, http_header);
        const accessToken = response.data.access_token;
        
        if (accessToken) {
            TokenHelper.setToken(accessToken);
            log('INFO', 'TokenService', 'Access token successfully retrieved');
            return accessToken;
        } else {
            log('WARN', 'TokenService', 'Access token response was empty');
            return '';
        }
    } catch (error) {
        log('ERROR', 'TokenService', 'Token exchange failed', { error: error instanceof Error ? error.message : 'Unknown error' });
        throw error;
    }
}

// tokenService.ts
// import axios from 'axios';
// import { AUTH_CONFIG, API_CONFIG } from '../../../common/config';
// import { TokenHelper } from './tokenHelper';

// export async function exchangeCodeForToken(code: string): Promise<string> {
//     try {
//         // Instead of directly exchanging the code, send it to your backend
//         const response = await axios.post(`${API_CONFIG.BASE_URL}/auth/exchange-token`, {
//             code: code,
//             redirect_uri: AUTH_CONFIG.SSO.REDIRECT_URI
//         });

//         const { access_token } = response.data;
        
//         if (access_token) {
//             TokenHelper.setToken(access_token);
//             console.log('Access token successfully retrieved');
//             return access_token;
//         } else {
//             console.log('Access token is returned as empty');
//             return '';
//         }
//     } catch (error) {
//         console.error('Token exchange error:', error);
//         throw error;
//     }
// }
