/**
 * Jest test setup file
 * Global test configuration and mocks
 */

// Mock VSCode API for testing
const mockVSCode = {
  window: {
    showInformationMessage: jest.fn(),
    showErrorMessage: jest.fn(),
    showWarningMessage: jest.fn(),
    createStatusBarItem: jest.fn(() => ({
      text: "",
      tooltip: "",
      show: jest.fn(),
      hide: jest.fn(),
      dispose: jest.fn(),
    })),
  },
  workspace: {
    getConfiguration: jest.fn(() => ({
      get: jest.fn(),
      update: jest.fn(),
    })),
  },
  languages: {
    registerHoverProvider: jest.fn(),
  },
  commands: {
    registerCommand: jest.fn(),
  },
  StatusBarAlignment: {
    Left: 1,
    Right: 2,
  },
  Hover: class MockHover {
    constructor(public contents: any, public range?: any) {}
  },
  MarkdownString: class MockMarkdownString {
    constructor(public value: string = "") {}
    appendMarkdown(value: string) {
      this.value += value;
      return this;
    }
  },
};

// Make vscode module available globally for tests
(global as any).vscode = mockVSCode;

// Mock axios for HTTP requests
jest.mock("axios");

// Set up console logging for tests
const originalConsoleError = console.error;
beforeEach(() => {
  console.error = jest.fn();
});

afterEach(() => {
  console.error = originalConsoleError;
  jest.clearAllMocks();
});
