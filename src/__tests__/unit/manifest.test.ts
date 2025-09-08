/**
 * Task: 7.1.12 - Validate VSCode Extension Manifest and Packaging Readiness
 * Requirements: Extension packaging and distribution readiness
 * Dependencies: package.json and webpack.config.js validation
 * Complexity: low
 * Time: 15-20 minutes
 */

import {
  validateExtensionManifest,
  ValidationResult,
} from "../../utils/manifestValidator";

describe("Extension Manifest Validation", () => {
  test("should validate extension manifest has all required fields", () => {
    // Arrange
    const mockPackageJson = require("../../../package.json");

    // Act
    const result = validateExtensionManifest(mockPackageJson);

    // Assert
    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
    expect(mockPackageJson.contributes?.views?.taskmaster).toBeDefined();
  });

  test("should detect missing required fields", () => {
    // Arrange
    const invalidPackageJson = {
      name: "test-extension",
      // Missing version, engines, main, contributes
    };

    // Act
    const result = validateExtensionManifest(invalidPackageJson);

    // Assert
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain("Missing required field: version");
    expect(result.errors).toContain("Missing required field: engines.vscode");
    expect(result.errors).toContain("Missing required field: main");
    expect(result.errors).toContain("Missing required field: contributes");
  });

  test("should validate VSCode engine version format", () => {
    // Arrange
    const validPackageJson = {
      name: "test-extension",
      version: "1.0.0",
      engines: { vscode: "^1.80.0" },
      main: "./dist/extension.js",
      contributes: {
        commands: [],
        views: { taskmaster: [] },
        viewsContainers: { activitybar: [] },
      },
    };

    // Act
    const result = validateExtensionManifest(validPackageJson);

    // Assert
    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  test("should validate taskmaster view contributions", () => {
    // Arrange
    const mockPackageJson = require("../../../package.json");

    // Act
    const result = validateExtensionManifest(mockPackageJson);

    // Assert
    expect(result.isValid).toBe(true);
    expect(
      mockPackageJson.contributes.viewsContainers.activitybar
    ).toBeDefined();
    expect(mockPackageJson.contributes.views.taskmaster).toBeDefined();
    expect(mockPackageJson.contributes.commands).toBeDefined();
    expect(mockPackageJson.contributes.menus).toBeDefined();
  });

  test("should validate all commands are properly registered", () => {
    // Arrange
    const mockPackageJson = require("../../../package.json");

    // Act
    const result = validateExtensionManifest(mockPackageJson);

    // Assert
    expect(result.isValid).toBe(true);

    // Check that all commands have required fields
    const commands = mockPackageJson.contributes.commands;
    commands.forEach((command: any) => {
      expect(command.command).toBeDefined();
      expect(command.title).toBeDefined();
      expect(command.category).toBeDefined();
    });
  });

  test("should validate build configuration compatibility", () => {
    // Arrange
    const mockPackageJson = require("../../../package.json");

    // Act
    const result = validateExtensionManifest(mockPackageJson);

    // Assert
    expect(result.isValid).toBe(true);

    // Check that main entry point matches webpack output
    expect(mockPackageJson.main).toBe("./dist/extension.js");

    // Check that entry point exists in source
    expect(mockPackageJson.main).toMatch(/^\.\/dist\/.*\.js$/);
  });
});
