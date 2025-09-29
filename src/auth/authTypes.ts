import { Agency } from '../api/apiTypes';

export interface AuthState {
    isLoggedIn: boolean;
    username: string;
    email: string;
    agency_id: number;
    agency_name: string;
    isProjectAdmin: boolean;
    isSuperAdmin: boolean;
    project_id: number;
    token: string;
    agencies?: Agency[];
}

export interface SSOError {
    message: string;
    errorCode?: string;
    name?: string;
    stack?: string;
}

export interface LoginResponse {
    status: string;
    agency_id: number;
    agency_name: string;
    isProjectAdmin: boolean;
    isSuperAdmin: boolean;
    project_id: number;
    token: string;
}

export interface IAuthService {
    loginWithCredentials(username: string, password: string, is_ad_login_successful: boolean): Promise<{ success: boolean, message: string }>;
    performSSOLogin(): Promise<{ success: boolean; message: string; error?: SSOError }>;
    logout(): void;
    get authState(): AuthState;
}
