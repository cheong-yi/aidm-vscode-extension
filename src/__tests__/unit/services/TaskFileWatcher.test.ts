/**
 * TaskFileWatcher Unit Tests
 * REFRESH-001: Test file watching functionality with VSCode FileSystemWatcher
 * Requirements: 3.1.1 - File watching, event emission, and lifecycle management
 */

import { jest } from "@jest/globals";
import { TaskFileWatcher } from "../../../services/TaskFileWatcher";

// Mock vscode module
jest.mock("vscode", () => {
  // Mock EventEmitter
  class MockEventEmitter {
    private listeners: any[] = [];

    constructor() {
      this.listeners = [];
    }

    event(listener: any) {
      this.listeners.push(listener);
      return {
        dispose: () =>
          this.listeners.splice(this.listeners.indexOf(listener), 1),
      };
    }

    fire(value: any) {
      this.listeners.forEach((listener) => listener(value));
    }

    dispose() {
      this.listeners = [];
    }
  }

  return {
    workspace: {
      createFileSystemWatcher: jest.fn(),
      workspaceFolders: [{ uri: { fsPath: "/test/workspace" } }],
    },
    EventEmitter: MockEventEmitter,
    RelativePattern: jest.fn().mockImplementation((workspaceRoot, pattern) => ({
      workspaceRoot,
      pattern,
    })),
  };
});

describe("TaskFileWatcher", () => {
  let watcher: TaskFileWatcher;
  const testFilePath = "/test/path/tasks.md";

  // Get mocked functions
  const mockCreateFileSystemWatcher = jest.mocked(
    require("vscode").workspace.createFileSystemWatcher
  );
  const mockFileWatcher = {
    onDidChange: jest.fn(),
    onDidCreate: jest.fn(),
    onDidDelete: jest.fn(),
    dispose: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockCreateFileSystemWatcher.mockReturnValue(mockFileWatcher);
    watcher = new TaskFileWatcher(testFilePath);
  });

  afterEach(async () => {
    await watcher.stopWatching();
  });

  // Test 1: Basic instantiation
  describe("Basic Instantiation", () => {
    it("should create TaskFileWatcher instance successfully", () => {
      expect(watcher).toBeDefined();
      expect(watcher).toBeInstanceOf(TaskFileWatcher);
    });

    it("should not throw error when constructor is called", () => {
      expect(() => {
        new TaskFileWatcher(testFilePath);
      }).not.toThrow();
    });

    it("should be importable as a class", () => {
      expect(TaskFileWatcher).toBeDefined();
      expect(typeof TaskFileWatcher).toBe("function");
    });

    it("should be instanceof TaskFileWatcher", () => {
      expect(watcher).toBeInstanceOf(TaskFileWatcher);
    });
  });

  // Test 2: File watching lifecycle
  describe("File Watching Lifecycle", () => {
    it("should create VSCode FileSystemWatcher when startWatching is called", () => {
      const mockRefreshCallback = jest.fn();
      watcher.startWatching(mockRefreshCallback);

      expect(mockCreateFileSystemWatcher).toHaveBeenCalled();
      expect(mockFileWatcher.onDidChange).toHaveBeenCalled();
      expect(mockFileWatcher.onDidCreate).toHaveBeenCalled();
      expect(mockFileWatcher.onDidDelete).toHaveBeenCalled();
    });

    it("should not create duplicate watchers when startWatching is called twice", () => {
      const mockRefreshCallback = jest.fn();
      watcher.startWatching(mockRefreshCallback);
      watcher.startWatching(mockRefreshCallback);

      expect(mockCreateFileSystemWatcher).toHaveBeenCalledTimes(1);
    });

    it("should dispose FileSystemWatcher when stopWatching is called", async () => {
      const mockRefreshCallback = jest.fn();
      watcher.startWatching(mockRefreshCallback);
      await watcher.stopWatching();

      expect(mockFileWatcher.dispose).toHaveBeenCalled();
    });

    it("should handle stopWatching when no watcher exists", async () => {
      await expect(watcher.stopWatching()).resolves.not.toThrow();
    });
  });

  // Test 3: Event handling with refresh callback
  describe("Event Handling with Refresh Callback", () => {
    it("should execute refresh callback when file changes are detected", (done) => {
      const mockRefreshCallback = jest.fn(() => {
        expect(mockRefreshCallback).toHaveBeenCalled();
        done();
      });

      watcher.startWatching(mockRefreshCallback);

      // Simulate file change event
      const changeCallback = mockFileWatcher.onDidChange.mock
        .calls[0][0] as () => void;
      changeCallback();
    });

    it("should execute refresh callback when file is created", (done) => {
      const mockRefreshCallback = jest.fn(() => {
        expect(mockRefreshCallback).toHaveBeenCalled();
        done();
      });

      watcher.startWatching(mockRefreshCallback);

      // Simulate file creation event
      const createCallback = mockFileWatcher.onDidCreate.mock
        .calls[0][0] as () => void;
      createCallback();
    });

    it("should execute refresh callback when file is deleted", (done) => {
      const mockRefreshCallback = jest.fn(() => {
        expect(mockRefreshCallback).toHaveBeenCalled();
        done();
      });

      watcher.startWatching(mockRefreshCallback);

      // Simulate file deletion event
      const deleteCallback = mockFileWatcher.onDidDelete.mock
        .calls[0][0] as () => void;
      deleteCallback();
    });

    it("should debounce rapid file changes", (done) => {
      const mockRefreshCallback = jest.fn(() => {
        expect(mockRefreshCallback).toHaveBeenCalledTimes(1);
        done();
      });

      watcher.startWatching(mockRefreshCallback);

      // Simulate multiple rapid file changes
      const changeCallback = mockFileWatcher.onDidChange.mock
        .calls[0][0] as () => void;
      changeCallback();
      changeCallback();
      changeCallback();

      // Wait for debounce delay
      setTimeout(() => {
        // Should only be called once due to debouncing
      }, 600);
    });
  });

  // Test 4: Event emitter access
  describe("Event Emitter Access", () => {
    it("should provide access to onFileChanged event emitter", () => {
      expect(watcher.onFileChanged).toBeDefined();
      expect(typeof watcher.onFileChanged.event).toBe("function");
    });
  });

  // Test 5: Error handling
  describe("Error Handling", () => {
    it("should handle refresh callback errors gracefully", (done) => {
      const mockRefreshCallback = jest.fn(() => {
        throw new Error("Test error");
      });

      const consoleSpy = jest
        .spyOn(console, "error")
        .mockImplementation(() => {});

      watcher.startWatching(mockRefreshCallback);

      // Simulate file change event
      const changeCallback = mockFileWatcher.onDidChange.mock
        .calls[0][0] as () => void;
      changeCallback();

      // Wait for debounce delay and error handling
      setTimeout(() => {
        expect(consoleSpy).toHaveBeenCalledWith(
          "Error executing refresh callback:",
          expect.any(Error)
        );
        consoleSpy.mockRestore();
        done();
      }, 600);
    });
  });
});
