/**
 * Unit tests for ConfigService
 */

import * as vscode from 'vscode';
import { ConfigService, EnterpriseSettings } from '../../../services/configService';

// Mock VSCode API
const mockGetConfiguration = jest.fn();
const mockOnDidChangeConfiguration = jest.fn();

jest.mock('vscode', () => ({
    workspace: {
        getConfiguration: mockGetConfiguration,
        onDidChangeConfiguration: mockOnDidChangeConfiguration
    },
    EventEmitter: class {
        fire = jest.fn();
        event = jest.fn();
        dispose = jest.fn();
    },
    Disposable: {
        from: jest.fn(() => ({ dispose: jest.fn() }))
    }
}));

describe('ConfigService', () => {
    let configService: ConfigService;
    let mockContext: vscode.ExtensionContext;

    beforeEach(() => {
        jest.clearAllMocks();
        mockContext = {} as vscode.ExtensionContext;

        // Setup default mock configuration
        mockGetConfiguration.mockReturnValue({
            get: jest.fn((key: string, defaultValue?: any) => {
                const configs: Record<string, any> = {
                    'enabled': false,
                    'sso.provider': 'microsoft',
                    'audit.enabled': false,
                    'multiTenant': false,
                    'sso.enforcement': 'optional',
                    'features.offlineMode': true,
                    'features.apiIntegration': true,
                    'features.taskStreaming': false,
                    'features.webhookIntegration': false,
                    'features.advancedReporting': false,
                    'features.performanceMonitoring': false,
                    'features.dataExport': true,
                    'features.bulkOperations': false,
                    'features.customBranding': false,
                    'features.userManagement': false
                };
                return configs[key] !== undefined ? configs[key] : defaultValue;
            })
        });

        mockOnDidChangeConfiguration.mockReturnValue({ dispose: jest.fn() });
        configService = new ConfigService(mockContext);
    });

    afterEach(() => {
        configService?.dispose();
    });

    describe('getEnterpriseConfig', () => {
        test('should return basic enterprise settings with defaults', () => {
            const result = configService.getEnterpriseConfig();

            expect(result).toEqual({
                enabled: false,
                ssoProvider: 'microsoft',
                auditEnabled: false,
                multiTenant: false
            });
        });

        test('should return enabled enterprise settings when configured', () => {
            mockGetConfiguration.mockReturnValue({
                get: jest.fn((key: string, defaultValue?: any) => {
                    const configs: Record<string, any> = {
                        'enabled': true,
                        'sso.provider': 'okta',
                        'audit.enabled': true,
                        'multiTenant': true
                    };
                    return configs[key] !== undefined ? configs[key] : defaultValue;
                })
            });

            const result = configService.getEnterpriseConfig();

            expect(result).toEqual({
                enabled: true,
                ssoProvider: 'okta',
                auditEnabled: true,
                multiTenant: true
            });
        });
    });

    describe('isEnterpriseEnabled', () => {
        test('should return false when enterprise is disabled', () => {
            const result = configService.isEnterpriseEnabled();
            expect(result).toBe(false);
        });

        test('should return true when enterprise is enabled', () => {
            mockGetConfiguration.mockReturnValue({
                get: jest.fn((key: string, defaultValue?: any) => {
                    return key === 'enabled' ? true : defaultValue;
                })
            });

            const result = configService.isEnterpriseEnabled();
            expect(result).toBe(true);
        });
    });

    describe('isFeatureEnabled', () => {
        test('should return correct values for various features', () => {
            expect(configService.isFeatureEnabled('sso')).toBe(false); // enforcement is 'optional'
            expect(configService.isFeatureEnabled('audit')).toBe(false);
            expect(configService.isFeatureEnabled('multiTenant')).toBe(false);
            expect(configService.isFeatureEnabled('offlineMode')).toBe(true);
            expect(configService.isFeatureEnabled('apiIntegration')).toBe(true);
            expect(configService.isFeatureEnabled('taskStreaming')).toBe(false);
            expect(configService.isFeatureEnabled('unknownFeature')).toBe(false);
        });

        test('should return true for SSO when enforcement is required', () => {
            mockGetConfiguration.mockReturnValue({
                get: jest.fn((key: string, defaultValue?: any) => {
                    const configs: Record<string, any> = {
                        'sso.enforcement': 'required'
                    };
                    return configs[key] !== undefined ? configs[key] : defaultValue;
                })
            });

            expect(configService.isFeatureEnabled('sso')).toBe(true);
        });
    });

    describe('onConfigChanged', () => {
        test('should register configuration change callback', () => {
            const mockCallback = jest.fn();
            const disposable = configService.onConfigChanged(mockCallback);

            expect(disposable).toBeDefined();
            expect(typeof disposable.dispose).toBe('function');
        });
    });

    describe('getFullEnterpriseConfiguration', () => {
        test('should return complete configuration structure', () => {
            const result = configService.getFullEnterpriseConfiguration();

            expect(result).toHaveProperty('enabled');
            expect(result).toHaveProperty('multiTenant');
            expect(result).toHaveProperty('defaultTenant');
            expect(result).toHaveProperty('sso');
            expect(result).toHaveProperty('features');
            expect(result).toHaveProperty('audit');
            expect(result).toHaveProperty('compliance');
            expect(result).toHaveProperty('branding');
            expect(result).toHaveProperty('system');
            expect(result).toHaveProperty('monitoring');

            expect(result.sso).toHaveProperty('provider');
            expect(result.sso).toHaveProperty('enforcement');
            expect(result.features).toHaveProperty('offlineMode');
            expect(result.audit).toHaveProperty('enabled');
        });
    });

    describe('dispose', () => {
        test('should dispose of resources', () => {
            expect(() => configService.dispose()).not.toThrow();
        });
    });
});