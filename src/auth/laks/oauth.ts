import * as jwt from 'jsonwebtoken';
import * as vscode from 'vscode';
import { TokenHelper } from './tokenHelper';

export function log(message: string): void {
    console.log(`[Auth Module]: ${message}`);
}

export function isTokenExpired(token: string): boolean {
    try {
        const decoded: any = jwt.decode(token);
        if (!decoded || !decoded.exp) {
            throw new Error("Token does not have an expiration date.");
        }
        const currentTime = Math.floor(Date.now() / 1000);
        return decoded.exp < currentTime;
    } catch (error) {
        if (error instanceof Error) {
            vscode.window.showErrorMessage(error.message);
        } else {
            vscode.window.showErrorMessage(`Error decoding token.`);
        }
        return false;
    }
}

export function validateCurrentToken(): boolean {
    const token = TokenHelper.getTokenSync(); // Use sync version for backward compatibility
    if (!token) {
        log("No token found.");
        vscode.window.showErrorMessage("No token found. Please authenticate.");
        return false;
    }
    if (isTokenExpired(token)) {
        log("Token has expired.");
        vscode.window.showErrorMessage("Token has expired. Please reauthenticate.");
        return false;
    }
    log("Token is valid.");
    return true;
}