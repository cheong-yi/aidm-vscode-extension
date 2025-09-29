import { EventEmitter } from 'events';
import { log } from '../utils/logger';
import { AuthState } from './authTypes';

export const DEFAULT_AUTH_STATE: AuthState = {
    isLoggedIn: false,
    username: '',
    email: '',
    agency_id: -1,
    agency_name: '',
    isProjectAdmin: false,
    isSuperAdmin: false,
    project_id: -1,
    token: '',
    agencies: []
};

class AuthStateManager {
    private static instance: AuthStateManager;
    private eventEmitter: EventEmitter;
    private currentState: AuthState;

    private constructor() {
        this.eventEmitter = new EventEmitter();
        this.currentState = { ...DEFAULT_AUTH_STATE };
    }

    public static getInstance(): AuthStateManager {
        if (!AuthStateManager.instance) {
            AuthStateManager.instance = new AuthStateManager();
        }
        return AuthStateManager.instance;
    }

    public getState(): AuthState {
        return { ...this.currentState };
    }

    public updateState(newState: Partial<AuthState>): void {
        const previousState = { ...this.currentState };
        this.currentState = {
            ...this.currentState,
            ...newState
        };
        
        // Only emit if there are actual changes
        if (JSON.stringify(previousState) !== JSON.stringify(this.currentState)) {
            log("INFO", "AuthStateManager","State updated:");
            this.eventEmitter.emit('stateChanged', this.currentState);
        }
    }

    public resetState(): void {
        this.currentState = { ...DEFAULT_AUTH_STATE };
        log("INFO", "AuthStateManager", "State reset to defaults");
        this.eventEmitter.emit('stateChanged', this.currentState);
    }

    public subscribe(callback: (state: AuthState) => void): () => void {
        this.eventEmitter.on('stateChanged', callback);
        // Return unsubscribe function
        return () => {
            this.eventEmitter.off('stateChanged', callback);
        };
    }
}

export const authStateManager = AuthStateManager.getInstance();