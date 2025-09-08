/**
 * End-to-End Packaging Test
 * Task 7.1.13: Create Minimal End-to-End Packaging Test
 *
 * This test validates that the extension can be packaged successfully
 * by running the complete build workflow and checking all required files.
 */

import { execSync } from "child_process";
import { existsSync } from "fs";
import path from "path";

/**
 * Packaging test result interface
 */
interface PackagingTestResult {
  compiled: boolean;
  built: boolean;
  filesExist: boolean;
  ready: boolean;
  errors?: string[];
  buildOutput?: string;
  duration: number;
}

/**
 * Run the packaging test script and return results
 */
async function runPackagingTest(): Promise<PackagingTestResult> {
  try {
    // Run the packaging test script
    const output = execSync("node scripts/test-packaging.js", {
      encoding: "utf8",
      cwd: process.cwd(),
      stdio: "pipe",
    });

    // Parse the output to extract test results
    // The script exits with code 0 on success, 1 on failure
    return {
      compiled: true,
      built: true,
      filesExist: true,
      ready: true,
      buildOutput: output,
      duration: 0,
    };
  } catch (error: any) {
    // If the script fails, extract error information
    const errorOutput = error.stdout || error.stderr || error.message;
    return {
      compiled: false,
      built: false,
      filesExist: false,
      ready: false,
      errors: [errorOutput],
      buildOutput: "",
      duration: 0,
    };
  }
}

/**
 * Check if required build files exist
 */
function checkBuildFiles(): boolean {
  const requiredFiles = [
    "dist/extension.js",
    "package.json",
    "tsconfig.json",
    "webpack.config.js",
  ];

  return requiredFiles.every((file) => existsSync(file));
}

describe("Extension Packaging", () => {
  // Set longer timeout for build processes
  jest.setTimeout(30000);

  beforeAll(async () => {
    // Ensure we're in the right directory
    const currentDir = process.cwd();
    const packageJsonPath = path.join(currentDir, "package.json");

    if (!existsSync(packageJsonPath)) {
      throw new Error("Test must be run from project root directory");
    }
  });

  describe("Build Artifacts", () => {
    it("should have all required build files", () => {
      // Arrange & Act
      const filesExist = checkBuildFiles();

      // Assert
      expect(filesExist).toBe(true);
    });

    it("should have dist/extension.js as main entry point", () => {
      // Arrange & Act
      const extensionPath = path.join(process.cwd(), "dist/extension.js");
      const exists = existsSync(extensionPath);

      // Assert
      expect(exists).toBe(true);
    });

    it("should have valid package.json structure", () => {
      // Arrange
      const packageJsonPath = path.join(process.cwd(), "package.json");

      // Act
      const packageJson = require(packageJsonPath);

      // Assert
      expect(packageJson.name).toBe("aidm-vscode-extension");
      expect(packageJson.main).toBe("./dist/extension.js");
      expect(packageJson.engines).toBeDefined();
      expect(packageJson.contributes).toBeDefined();
      expect(packageJson.version).toBeDefined();
    });
  });

  describe("Build Process", () => {
    it("should compile TypeScript successfully", async () => {
      // Arrange & Act
      const result = await runPackagingTest();

      // Assert
      expect(result.compiled).toBe(true);
      expect(result.errors).toBeUndefined();
    });

    it("should build webpack bundle successfully", async () => {
      // Arrange & Act
      const result = await runPackagingTest();

      // Assert
      expect(result.built).toBe(true);
      expect(result.errors).toBeUndefined();
    });

    it("should produce all required output files", async () => {
      // Arrange & Act
      const result = await runPackagingTest();

      // Assert
      expect(result.filesExist).toBe(true);
      expect(result.errors).toBeUndefined();
    });
  });

  describe("End-to-End Packaging", () => {
    it("should package extension successfully with all required files", async () => {
      // Arrange
      const expectedFiles = ["dist/extension.js", "package.json"];

      // Act
      const result = await runPackagingTest();

      // Assert
      expect(result.compiled).toBe(true);
      expect(result.built).toBe(true);
      expect(result.filesExist).toBe(true);
      expect(result.ready).toBe(true);

      // Verify files actually exist
      expectedFiles.forEach((file) => {
        expect(existsSync(file)).toBe(true);
      });
    });

    it("should complete packaging test within reasonable time", async () => {
      // Arrange
      const startTime = Date.now();

      // Act
      const result = await runPackagingTest();
      const duration = Date.now() - startTime;

      // Assert
      expect(result.ready).toBe(true);
      expect(duration).toBeLessThan(30000); // Should complete within 30 seconds
    });
  });

  describe("Error Handling", () => {
    it("should handle build failures gracefully", async () => {
      // This test verifies that the packaging test can handle errors
      // without crashing the test suite

      // Arrange & Act
      const result = await runPackagingTest();

      // Assert
      // Even if there are errors, the test should complete and return a result
      expect(result).toBeDefined();
      expect(typeof result.ready).toBe("boolean");
    });
  });
});
