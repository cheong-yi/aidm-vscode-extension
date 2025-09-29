// filepath: /Users/ray/Developer/GENiE-VSCode/src/services/auth/agencyService.ts
import { Agency } from '../api/apiTypes';
import { ApiService } from '../api/apiService';
import { log } from '../utils/logger';
import { SessionService } from './sessionService';
import { authStateManager } from './authStateManager';

/**
 * Service for managing agency-related operations
 */
export class AgencyService {
    constructor(
        private readonly apiService: ApiService,
        private readonly sessionService: SessionService
    ) {}

    /**
     * Fetch all agencies and store them in the session
     * @returns Promise with array of fetched agencies
     */
    async fetchAndStoreAgencies(): Promise<Agency[]> {
        log('INFO', 'AgencyService', 'Fetching all agencies');
        
        try {
            // Use empty string to get all agencies
            const agencies = await this.apiService.searchAgencies("");
            
            if (agencies && agencies.length > 0) {
                log('INFO', 'AgencyService', 'Successfully fetched agencies', { count: agencies.length });
                
                // Store in session
                this.sessionService.saveAgencies(agencies);
                
                // Update auth state
                authStateManager.updateState({ agencies });
                
                return agencies;
            } else {
                log('WARN', 'AgencyService', 'No agencies found or error occurred');
                return [];
            }
        } catch (error) {
            log('ERROR', 'AgencyService', 'Failed to fetch agencies', { error });
            return [];
        }
    }
    
    /**
     * Get all agencies from session
     */
    getAgencies(): Agency[] {
        const agencies = this.sessionService.getAgencies();
        log('INFO', 'AgencyService', 'Retrieved agencies from session', { count: agencies.length });
        return agencies;
    }
    
    /**
     * Find agency by ID
     * @param id Agency ID to find
     * @returns Agency or undefined if not found
     */
    getAgencyById(id: number): Agency | undefined {
        const agencies = this.sessionService.getAgencies();
        return agencies.find(agency => agency.id === id);
    }
    
    /**
     * Find agency by name
     * @param name Agency name to find
     * @returns Agency or undefined if not found
     */
    getAgencyByName(name: string): Agency | undefined {
        const agencies = this.sessionService.getAgencies();
        return agencies.find(agency => agency.agencyName === name);
    }
}