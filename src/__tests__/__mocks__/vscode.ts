/**
 * VSCode API Mock
 * Mock implementation of VSCode API for testing
 */

export const window = {
  createStatusBarItem: jest.fn(() => ({
    show: jest.fn(),
    hide: jest.fn(),
    dispose: jest.fn(),
    text: "",
    tooltip: "",
    backgroundColor: undefined,
    command: undefined,
  })),
  showErrorMessage: jest.fn().mockResolvedValue(undefined),
  showWarningMessage: jest.fn().mockResolvedValue(undefined),
  showInformationMessage: jest.fn().mockResolvedValue(undefined),
  createOutputChannel: jest.fn(() => ({
    appendLine: jest.fn(),
    show: jest.fn(),
    hide: jest.fn(),
    dispose: jest.fn(),
  })),
  registerWebviewViewProvider: jest.fn(() => ({
    dispose: jest.fn(),
  })),
  registerTreeDataProvider: jest.fn(() => ({
    dispose: jest.fn(),
  })),
  createTreeView: jest.fn(() => ({
    onDidChangeSelection: jest.fn(() => ({
      dispose: jest.fn(),
    })),
    dispose: jest.fn(),
  })),
};

export const workspace = {
  getConfiguration: jest.fn(() => ({
    get: jest.fn(),
    update: jest.fn(),
    has: jest.fn(),
  })),
  onDidChangeConfiguration: jest.fn(),
  workspaceFolders: [],
  openTextDocument: jest.fn().mockResolvedValue({
    uri: { scheme: "file", fsPath: "/test/file.ts" },
    fileName: "file.ts",
    languageId: "typescript",
    lineCount: 10,
    getText: jest.fn().mockReturnValue("export class TestService {}"),
  }),
  fs: {
    stat: jest.fn().mockResolvedValue({
      type: 1, // File
      ctime: Date.now(),
      mtime: Date.now(),
      size: 1024,
    }),
  },
};

export const commands = {
  registerCommand: jest.fn(),
  executeCommand: jest.fn().mockResolvedValue([]),
};

export const languages = {
  registerHoverProvider: jest.fn(),
  createDiagnosticCollection: jest.fn(),
};

export const StatusBarAlignment = {
  Left: 1,
  Right: 2,
};

export const DiagnosticSeverity = {
  Error: 0,
  Warning: 1,
  Information: 2,
  Hint: 3,
};

export const ConfigurationTarget = {
  Global: 1,
  Workspace: 2,
  WorkspaceFolder: 3,
};

export const Uri = {
  file: jest.fn((path: string) => ({ scheme: "file", fsPath: path })),
  parse: jest.fn((uri: string) => ({ scheme: "file", fsPath: uri })),
  joinPath: jest.fn((baseUri: any, ...pathSegments: string[]) => {
    const basePath = baseUri.fsPath || baseUri.path || "";
    const joinedPath = pathSegments.join("/");
    const fullPath = basePath ? `${basePath}/${joinedPath}` : joinedPath;
    // Preserve the scheme from the base URI
    const scheme = baseUri.scheme || "file";
    return { scheme, fsPath: fullPath, path: fullPath };
  }),
};

export class ThemeColor {
  constructor(public id: string) {}
}

export class Position {
  constructor(public line: number, public character: number) {}
}

export class Range {
  constructor(public start: Position, public end: Position) {}
}

export class Hover {
  constructor(public contents: any, public range?: Range) {}
}

export class MarkdownString {
  constructor(public value?: string) {}

  appendText(value: string): MarkdownString {
    this.value = (this.value || "") + value;
    return this;
  }

  appendMarkdown(value: string): MarkdownString {
    this.value = (this.value || "") + value;
    return this;
  }
}

// Mock CancellationToken constructor function
export const CancellationToken = jest.fn().mockImplementation(() => ({
  isCancellationRequested: false,
  onCancellationRequested: jest.fn(),
}));

// Also export as a class for tests that use 'new'
export class CancellationTokenClass {
  isCancellationRequested = false;
  onCancellationRequested = jest.fn();
}

// Make CancellationToken work as both a function and a class
(CancellationToken as any).prototype = CancellationTokenClass.prototype;
Object.setPrototypeOf(CancellationToken, CancellationTokenClass);

export class TreeItem {
  public label: string;
  public collapsibleState: any;
  public iconPath: any;
  public command: any;
  public contextValue: string;
  public tooltip: string | undefined;

  constructor(label: string, collapsibleState?: any) {
    this.label = label;
    this.collapsibleState = collapsibleState;
    this.iconPath = undefined;
    this.command = undefined;
    this.contextValue = "";
    this.tooltip = undefined;
  }
}

export class ThemeIcon {
  constructor(public id: string) {}
}

export class EventEmitter<T> {
  private listeners: Array<(e: T) => any> = [];

  get event(): (listener: (e: T) => any) => any {
    return (listener: (e: T) => any) => {
      this.listeners.push(listener);
      return {
        dispose: () => {
          const index = this.listeners.indexOf(listener);
          if (index > -1) {
            this.listeners.splice(index, 1);
          }
        },
      };
    };
  }

  fire(data: T): void {
    this.listeners.forEach((listener) => listener(data));
  }

  dispose(): void {
    this.listeners = [];
  }
}

export const TreeItemCollapsibleState = {
  None: 0,
  Collapsed: 1,
  Expanded: 2,
};

export const ExtensionContext = {
  subscriptions: [],
  workspaceState: {
    get: jest.fn(),
    update: jest.fn(),
  },
  globalState: {
    get: jest.fn(),
    update: jest.fn(),
  },
  extensionPath: "/mock/extension/path",
};

// Export commonly used enums and classes
export {
  window as vscode_window,
  workspace as vscode_workspace,
  commands as vscode_commands,
  languages as vscode_languages,
};

// Default export for tests that import * as vscode
export default {
  window,
  workspace,
  commands,
  languages,
  StatusBarAlignment,
  DiagnosticSeverity,
  ConfigurationTarget,
  Uri,
  ThemeColor,
  Position,
  Range,
  Hover,
  MarkdownString,
  CancellationToken,
  CancellationTokenClass,
  TreeItem,
  ThemeIcon,
  EventEmitter,
  TreeItemCollapsibleState,
  ExtensionContext,
};
