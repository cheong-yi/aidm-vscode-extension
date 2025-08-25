/**
 * PATH-003: Configuration Validation Tests
 * Tests for tasks file path validation functions
 */

import * as vscode from "vscode";
import * as path from "path";

// Import the actual validation function from the extension
import { validateTasksFilePath } from "../../extension";

describe("PATH-003: Tasks File Path Validation", () => {
  describe("validateTasksFilePath", () => {
    it("should accept valid relative paths", () => {
      const validPaths = [
        "tasks.json",
        "config/tasks.json",
        ".taskmaster/tasks.json",
        "project-tasks.json",
        "src/tasks.json",
      ];

      validPaths.forEach((path) => {
        const result = validateTasksFilePath(path);
        expect(result.isValid).toBe(true);
        expect(result.error).toBeUndefined();
      });
    });

    it("should reject empty or null paths", () => {
      const invalidPaths = ["", null, undefined];

      invalidPaths.forEach((path) => {
        const result = validateTasksFilePath(path as any);
        expect(result.isValid).toBe(false);
        expect(result.error).toContain("cannot be empty");
      });
    });

    it("should reject paths with whitespace", () => {
      const invalidPaths = [
        " tasks.json",
        "tasks.json ",
        "  tasks.json  ",
        "\ttasks.json\t",
      ];

      invalidPaths.forEach((path) => {
        const result = validateTasksFilePath(path);
        expect(result.isValid).toBe(false);
        expect(result.error).toContain("whitespace");
      });
    });

    it("should reject paths with invalid characters", () => {
      const invalidPaths = [
        "tasks<.json",
        "tasks>.json",
        "tasks:.json",
        'tasks".json',
        "tasks|.json",
        "tasks?.json",
        "tasks*.json",
        "tasks\x00.json",
      ];

      invalidPaths.forEach((path) => {
        const result = validateTasksFilePath(path);
        expect(result.isValid).toBe(false);
        expect(result.error).toContain("invalid characters");
      });
    });

    it("should reject paths without .json extension", () => {
      const invalidPaths = ["tasks", "tasks.txt", "tasks.md", "tasks.js"];

      invalidPaths.forEach((path) => {
        const result = validateTasksFilePath(path);
        expect(result.isValid).toBe(false);
        expect(result.error).toContain(".json extension");
      });
    });

    it("should accept paths with .json extension regardless of case", () => {
      const validPaths = [
        "tasks.json",
        "tasks.JSON",
        "tasks.Json",
        "TASKS.json",
      ];

      validPaths.forEach((path) => {
        const result = validateTasksFilePath(path);
        expect(result.isValid).toBe(true);
        expect(result.error).toBeUndefined();
      });
    });

    it("should reject paths with directory traversal", () => {
      const invalidPaths = [
        "../tasks.json",
        "..\\tasks.json",
        "config/../tasks.json",
        "config/..\\tasks.json",
        "..\\..\\tasks.json",
      ];

      invalidPaths.forEach((path) => {
        const result = validateTasksFilePath(path);
        expect(result.isValid).toBe(false);
        expect(result.error).toContain("cannot navigate outside workspace");
      });
    });

    it("should accept valid absolute paths", () => {
      const validAbsolutePaths = [
        "/home/user/tasks.json",
        "C:\\Users\\user\\tasks.json",
        "/var/lib/tasks.json",
      ];

      validAbsolutePaths.forEach((path) => {
        const result = validateTasksFilePath(path);
        console.log(`Testing path: ${path}, result:`, result);
        expect(result.isValid).toBe(true);
        expect(result.error).toBeUndefined();
      });
    });

    it("should handle edge cases correctly", () => {
      // Very long but valid path
      const longPath = "a".repeat(100) + ".json";
      const result = validateTasksFilePath(longPath);
      expect(result.isValid).toBe(true);

      // Path with dots but not directory traversal
      const dotPath = "config.d/tasks.json";
      const dotResult = validateTasksFilePath(dotPath);
      expect(dotResult.isValid).toBe(true);

      // Path with underscores and hyphens
      const specialCharPath = "my-tasks_file.json";
      const specialResult = validateTasksFilePath(specialCharPath);
      expect(specialResult.isValid).toBe(true);
    });
  });
});
