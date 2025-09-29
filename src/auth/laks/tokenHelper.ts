// tokenHelper.ts
import * as vscode from 'vscode';

export class TokenHelper {
    
    static setToken(token: string): void {
        vscode.workspace.getConfiguration().update('tdlc-code-assist.auth.token', token, true);
    }
    
    static getToken(): string | undefined {
        return vscode.workspace.getConfiguration('tdlc-code-assist').get('auth.token');
    }
    
    static clearToken(): void {
        vscode.workspace.getConfiguration().update('tdlc-code-assist.auth.token', undefined, true);
    }
}