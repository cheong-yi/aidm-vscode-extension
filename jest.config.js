module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  roots: ["<rootDir>/src"],
  testMatch: ["**/__tests__/**/*.test.ts", "**/?(*.)+(spec|test).ts"],
  transform: {
    "^.+\\.ts$": ["ts-jest", {
      tsconfig: "tsconfig.test.json"
    }],
  },
  collectCoverageFrom: [
    "src/**/*.ts",
    "!src/**/*.d.ts",
    "!src/**/*.test.ts",
  ],
  coverageDirectory: "coverage",
  coverageReporters: ["text", "lcov", "html"],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },
  setupFilesAfterEnv: ["<rootDir>/src/__tests__/jest.setup.ts"],
  moduleFileExtensions: ["ts", "js", "json"],
  testTimeout: 30000, // Increased timeout for integration tests
  moduleNameMapper: {
    "^vscode$": "<rootDir>/src/__tests__/__mocks__/vscode.ts",
    // Mock CSS and JS imports for webpack raw-loader
    "\\.(css|scss)$": "<rootDir>/src/__tests__/__mocks__/mockAsset.js",
    "\\.(js)$": "<rootDir>/src/__tests__/__mocks__/mockAsset.js",
  },
  // Better handling for integration tests
  testPathIgnorePatterns: [
    "/node_modules/",
    "/dist/",
    "/coverage/"
  ],
  // Increase timeout for slow tests
  slowTestThreshold: 10,
  // Better error reporting
  verbose: true,
  // Async cleanup configuration
  detectOpenHandles: true,
  forceExit: true,
  // Better async operation handling
  testEnvironmentOptions: {
    url: "http://localhost",
  },
};
