/**
 * Jest Setup File
 * Global test configuration and mocks
 */

// Global test timeout
jest.setTimeout(10000);

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
    timeout: number = 5000,
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
