/**
 * Mock implementation of vscode module for testing
 */

export class Position {
  constructor(public line: number, public character: number) {}
}

export class Range {
  constructor(public start: Position, public end: Position) {}
}

export class MarkdownString {
  public isTrusted: boolean = false;
  private content: string = "";

  appendMarkdown(value: string): void {
    this.content += value;
  }

  get value(): string {
    return this.content;
  }
}

export class Hover {
  constructor(public contents: MarkdownString | string, public range?: Range) {}
}

export const ThemeColor = jest
  .fn()
  .mockImplementation((id: string) => ({ id }));

export const StatusBarAlignment = {
  Left: 1,
  Right: 2,
};

export const window = {
  createStatusBarItem: jest.fn().mockReturnValue({
    text: "",
    tooltip: "",
    backgroundColor: undefined,
    command: "",
    show: jest.fn(),
    hide: jest.fn(),
    dispose: jest.fn(),
  }),
  showInformationMessage: jest.fn(),
};

export const languages = {
  registerHoverProvider: jest.fn(),
};

export const commands = {
  registerCommand: jest.fn(),
  executeCommand: jest.fn(),
};

export const workspace = {
  getConfiguration: jest.fn().mockReturnValue({
    get: jest.fn(),
  }),
  onDidChangeConfiguration: jest.fn(),
};

export interface TextDocument {
  fileName: string;
  languageId: string;
}

export interface ExtensionContext {
  subscriptions: any[];
}
