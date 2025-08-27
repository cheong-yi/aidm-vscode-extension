/**
 * KeyboardAutomationService Unit Tests
 *
 * Task: GUI-TRIAL-003c - Implement keyboard shortcut automation
 * Requirements: Test keyboard shortcut sending functionality
 * Dependencies: @nut-tree-fork/nut-js for keyboard automation
 */

import { KeyboardAutomationService } from "../../../services/KeyboardAutomationService";
import { keyboard, Key } from "@nut-tree-fork/nut-js";

// Mock @nut-tree-fork/nut-js
jest.mock("@nut-tree-fork/nut-js", () => ({
  keyboard: {
    pressKey: jest.fn(),
    releaseKey: jest.fn(),
  },
  Key: {
    LeftControl: "LeftControl",
    LeftCmd: "LeftCmd",
    L: "L",
  },
  getActiveWindow: jest.fn(),
}));

// Mock process.platform
const originalPlatform = process.platform;

// Mock keyboard class for return values
const mockKeyboardClass = {
  pressKey: jest.fn(),
  releaseKey: jest.fn(),
  providerRegistry: {},
  config: {},
  type: "keyboard",
} as any;

describe("KeyboardAutomationService", () => {
  let service: KeyboardAutomationService;
  let mockKeyboard: jest.Mocked<typeof keyboard>;

  beforeEach(() => {
    service = new KeyboardAutomationService();
    mockKeyboard = keyboard as jest.Mocked<typeof keyboard>;

    // Reset all mocks
    jest.clearAllMocks();
  });

  describe("sendKeyboardShortcut", () => {
    it("should send Ctrl+L shortcut successfully on Windows/Linux", async () => {
      // Arrange
      const shortcut = "ctrl+l";
      mockKeyboard.pressKey.mockResolvedValue(mockKeyboardClass);
      mockKeyboard.releaseKey.mockResolvedValue(mockKeyboardClass);

      // Act
      const result = await service.sendKeyboardShortcut(shortcut);

      // Assert
      expect(result).toBe(true);
      expect(mockKeyboard.pressKey).toHaveBeenCalledWith("LeftControl", "L");
      expect(mockKeyboard.releaseKey).toHaveBeenCalledWith("LeftControl", "L");
    });

    it("should send Cmd+L shortcut successfully on macOS", async () => {
      // Arrange
      const shortcut = "cmd+l";
      mockKeyboard.pressKey.mockResolvedValue(mockKeyboardClass);
      mockKeyboard.releaseKey.mockResolvedValue(mockKeyboardClass);

      // Act
      const result = await service.sendKeyboardShortcut(shortcut);

      // Assert
      expect(result).toBe(true);
      expect(mockKeyboard.pressKey).toHaveBeenCalledWith("LeftCmd", "L");
      expect(mockKeyboard.releaseKey).toHaveBeenCalledWith("LeftCmd", "L");
    });

    it("should handle control alias for ctrl", async () => {
      // Arrange
      const shortcut = "control+l";
      mockKeyboard.pressKey.mockResolvedValue(mockKeyboardClass);
      mockKeyboard.releaseKey.mockResolvedValue(mockKeyboardClass);

      // Act
      const result = await service.sendKeyboardShortcut(shortcut);

      // Assert
      expect(result).toBe(true);
      expect(mockKeyboard.pressKey).toHaveBeenCalledWith("LeftControl", "L");
      expect(mockKeyboard.releaseKey).toHaveBeenCalledWith("LeftControl", "L");
    });

    it("should handle meta alias for cmd", async () => {
      // Arrange
      const shortcut = "meta+l";
      mockKeyboard.pressKey.mockResolvedValue(mockKeyboardClass);
      mockKeyboard.releaseKey.mockResolvedValue(mockKeyboardClass);

      // Act
      const result = await service.sendKeyboardShortcut(shortcut);

      // Assert
      expect(result).toBe(true);
      expect(mockKeyboard.pressKey).toHaveBeenCalledWith("LeftCmd", "L");
      expect(mockKeyboard.releaseKey).toHaveBeenCalledWith("LeftCmd", "L");
    });

    it("should return false for invalid shortcut format", async () => {
      // Arrange
      const shortcut = "invalid+shortcut";
      const consoleSpy = jest.spyOn(console, "error").mockImplementation();

      // Act
      const result = await service.sendKeyboardShortcut(shortcut);

      // Assert
      expect(result).toBe(false);
      expect(consoleSpy).toHaveBeenCalledWith(
        "Invalid shortcut format: invalid+shortcut"
      );
      expect(mockKeyboard.pressKey).not.toHaveBeenCalled();
      expect(mockKeyboard.releaseKey).not.toHaveBeenCalled();

      consoleSpy.mockRestore();
    });

    it("should return false and log error when keyboard operation fails", async () => {
      // Arrange
      const shortcut = "ctrl+l";
      const error = new Error("Keyboard operation failed");
      mockKeyboard.pressKey.mockRejectedValue(error);
      const consoleSpy = jest.spyOn(console, "error").mockImplementation();

      // Act
      const result = await service.sendKeyboardShortcut(shortcut);

      // Assert
      expect(result).toBe(false);
      expect(consoleSpy).toHaveBeenCalledWith(
        "Failed to send keyboard shortcut ctrl+l:",
        error
      );
      expect(mockKeyboard.pressKey).toHaveBeenCalledWith("LeftControl", "L");
      expect(mockKeyboard.releaseKey).not.toHaveBeenCalled();

      consoleSpy.mockRestore();
    });

    it("should handle empty shortcut string", async () => {
      // Arrange
      const shortcut = "";
      const consoleSpy = jest.spyOn(console, "error").mockImplementation();

      // Act
      const result = await service.sendKeyboardShortcut(shortcut);

      // Assert
      expect(result).toBe(false);
      expect(consoleSpy).toHaveBeenCalledWith("Invalid shortcut format: ");
      expect(mockKeyboard.pressKey).not.toHaveBeenCalled();
      expect(mockKeyboard.releaseKey).not.toHaveBeenCalled();

      consoleSpy.mockRestore();
    });

    it("should handle shortcut with only whitespace", async () => {
      // Arrange
      const shortcut = "   ";
      const consoleSpy = jest.spyOn(console, "error").mockImplementation();

      // Act
      const result = await service.sendKeyboardShortcut(shortcut);

      // Assert
      expect(result).toBe(false);
      expect(mockKeyboard.pressKey).not.toHaveBeenCalled();
      expect(mockKeyboard.releaseKey).not.toHaveBeenCalled();

      consoleSpy.mockRestore();
    });

    it("should log warning for unknown key parts", async () => {
      // Arrange
      const shortcut = "ctrl+unknown+l";
      mockKeyboard.pressKey.mockResolvedValue(mockKeyboardClass);
      mockKeyboard.releaseKey.mockResolvedValue(mockKeyboardClass);
      const consoleSpy = jest.spyOn(console, "warn").mockImplementation();

      // Act
      const result = await service.sendKeyboardShortcut(shortcut);

      // Assert
      expect(result).toBe(true);
      expect(consoleSpy).toHaveBeenCalledWith("Unknown key part: unknown");
      expect(mockKeyboard.pressKey).toHaveBeenCalledWith("LeftControl", "L");
      expect(mockKeyboard.releaseKey).toHaveBeenCalledWith("LeftControl", "L");

      consoleSpy.mockRestore();
    });
  });

  describe("getChatShortcut", () => {
    it("should return cmd+l on macOS", () => {
      // Arrange
      Object.defineProperty(process, "platform", {
        value: "darwin",
        configurable: true,
      });
      const macService = new KeyboardAutomationService();

      // Act
      const result = macService.getChatShortcut();

      // Assert
      expect(result).toBe("cmd+l");

      // Restore
      Object.defineProperty(process, "platform", {
        value: originalPlatform,
        configurable: true,
      });
    });

    it("should return ctrl+l on Windows", () => {
      // Arrange
      Object.defineProperty(process, "platform", {
        value: "win32",
        configurable: true,
      });
      const windowsService = new KeyboardAutomationService();

      // Act
      const result = windowsService.getChatShortcut();

      // Assert
      expect(result).toBe("ctrl+l");

      // Restore
      Object.defineProperty(process, "platform", {
        value: originalPlatform,
        configurable: true,
      });
    });

    it("should return ctrl+l on Linux", () => {
      // Arrange
      Object.defineProperty(process, "platform", {
        value: "linux",
        configurable: true,
      });
      const linuxService = new KeyboardAutomationService();

      // Act
      const result = linuxService.getChatShortcut();

      // Assert
      expect(result).toBe("ctrl+l");

      // Restore
      Object.defineProperty(process, "platform", {
        value: originalPlatform,
        configurable: true,
      });
    });
  });

  describe("focusWindow", () => {
    it("should focus window successfully", async () => {
      // Arrange
      const mockWindowInfo = {
        title: "Test Window",
        windowHandle: {
          focus: jest.fn().mockResolvedValue(undefined),
        },
      };

      // Mock getActiveWindow to return a window with matching title
      const { getActiveWindow } = require("@nut-tree-fork/nut-js");
      getActiveWindow.mockResolvedValue({
        title: Promise.resolve("Test Window"),
      });

      // Act
      const result = await service.focusWindow(mockWindowInfo as any);

      // Assert
      expect(result).toBe(true);
      expect(mockWindowInfo.windowHandle.focus).toHaveBeenCalled();
    });

    it("should return false when no window handle provided", async () => {
      // Arrange
      const mockWindowInfo = {
        title: "Test Window",
        windowHandle: null,
      };
      const consoleSpy = jest.spyOn(console, "error").mockImplementation();

      // Act
      const result = await service.focusWindow(mockWindowInfo as any);

      // Assert
      expect(result).toBe(false);
      expect(consoleSpy).toHaveBeenCalledWith(
        "No window handle provided for focus operation"
      );

      consoleSpy.mockRestore();
    });
  });
});
