import * as vscode from 'vscode';
import { AuthState } from './authTypes';
import { log } from '../utils/logger';
import { Agency } from '../api/apiTypes';

export class SessionService {
    constructor(private context: vscode.ExtensionContext) {}

    public loadSessionData(): AuthState {
        log('INFO', 'SessionService', 'Loading session data from global state');
        const agencies = this.context.globalState.get<Agency[]>('agencies', []);
        
        return {
            isLoggedIn: this.context.globalState.get('isLoggedIn', false),
            username: this.context.globalState.get('username', ''),
            email: this.context.globalState.get('email', ''),
            agency_id: this.context.globalState.get('agency_id', NaN),
            agency_name: this.context.globalState.get('agency_name', ''),
            isProjectAdmin: this.context.globalState.get('isProjectAdmin', false),
            isSuperAdmin: this.context.globalState.get('isSuperAdmin', false),
            project_id: this.context.globalState.get('project_id', NaN),
            token: this.context.globalState.get('token', ''),
            agencies: agencies
        };
    }

    public saveSessionData(state: AuthState): void {
        log('INFO', 'SessionService', 'Saving session data to global state');
        Object.entries(state).forEach(([key, value]) => {
            this.context.globalState.update(key, value);
        });
    }
    
    public saveAgencies(agencies: Agency[]): void {
        log('INFO', 'SessionService', 'Saving agencies to global state', { count: agencies.length });
        this.context.globalState.update('agencies', agencies);
    }
    
    public getAgencies(): Agency[] {
        return this.context.globalState.get<Agency[]>('agencies', []);
    }
}