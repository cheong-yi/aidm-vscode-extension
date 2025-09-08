/**
 * Jest Setup File
 * Global test configuration and mocks
 */

// Global test timeout - increased for integration tests
jest.setTimeout(30000);

// Test utilities
export const testUtils = {
  delay: (ms: number) => new Promise((resolve) => setTimeout(resolve, ms)),

  createMockError: (message: string, code?: string) => {
    const error = new Error(message);
    if (code) {
      (error as any).code = code;
    }
    return error;
  },

  expectEventuallyToBe: async (
    getValue: () => any,
    expectedValue: any,
    timeout: number = 10000, // Increased timeout
    interval: number = 100
  ) => {
    const startTime = Date.now();

    while (Date.now() - startTime < timeout) {
      const currentValue = getValue();
      if (currentValue === expectedValue) {
        return;
      }
      await new Promise((resolve) => setTimeout(resolve, interval));
    }

    throw new Error(
      `Expected ${getValue()} to eventually be ${expectedValue}, but timeout reached`
    );
  },
};

// Global AuditLogger cleanup tracking
const auditLoggerInstances: any[] = [];

// Helper to track AuditLogger instances
export const trackAuditLogger = (instance: any) => {
  auditLoggerInstances.push(instance);
};

// Cleanup all AuditLogger instances after tests
afterAll(async () => {
  // Cleanup all tracked AuditLogger instances
  for (const instance of auditLoggerInstances) {
    if (instance && typeof instance.cleanup === 'function') {
      try {
        await instance.cleanup();
      } catch (error) {
        // Ignore cleanup errors
      }
    }
  }
  
  // Clear the tracking array
  auditLoggerInstances.length = 0;
  
  // Use Jest's fake timers to prevent real timers from running
  jest.useFakeTimers();
  
  // Clear any remaining timers
  jest.clearAllTimers();
  
  // Restore real timers
  jest.useRealTimers();
  
  // Give a small delay to allow any pending operations to complete
  await new Promise(resolve => setTimeout(resolve, 100));
});

// Cleanup after each test to prevent timer accumulation
afterEach(() => {
  // Use Jest's fake timers to prevent real timers from running
  jest.useFakeTimers();
  
  // Clear any timers that might have been set during the test
  jest.clearAllTimers();
  
  // Restore real timers
  jest.useRealTimers();
});
