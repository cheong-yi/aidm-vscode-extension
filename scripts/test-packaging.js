#!/usr/bin/env node

/**
 * End-to-End Packaging Test Script
 * Task 7.1.13: Create Minimal End-to-End Packaging Test
 *
 * This script validates that the extension can be packaged successfully
 * by running the complete build workflow and checking all required files.
 */

const { execSync } = require("child_process");
const { existsSync, readFileSync } = require("fs");
const path = require("path");

/**
 * Packaging test result interface
 */
class PackagingTestResult {
  constructor() {
    this.compiled = false;
    this.built = false;
    this.filesExist = false;
    this.ready = false;
    this.errors = [];
    this.buildOutput = "";
    this.startTime = Date.now();
  }

  addError(error) {
    this.errors.push(error);
  }

  setBuildOutput(output) {
    this.buildOutput = output;
  }

  getDuration() {
    return Date.now() - this.startTime;
  }

  toJSON() {
    return {
      compiled: this.compiled,
      built: this.built,
      filesExist: this.filesExist,
      ready: this.ready,
      errors: this.errors,
      buildOutput: this.buildOutput,
      duration: this.getDuration(),
    };
  }
}

/**
 * Run a command and return the result
 */
function runCommand(command, options = {}) {
  try {
    const result = execSync(command, {
      encoding: "utf8",
      stdio: "pipe",
      cwd: process.cwd(),
      ...options,
    });
    return { success: true, output: result, error: null };
  } catch (error) {
    return {
      success: false,
      output: error.stdout || "",
      error: error.stderr || error.message,
    };
  }
}

/**
 * Check if required files exist
 */
function checkRequiredFiles() {
  const requiredFiles = [
    "dist/extension.js",
    "package.json",
    "tsconfig.json",
    "webpack.config.js",
  ];

  const missingFiles = [];
  const existingFiles = [];

  for (const file of requiredFiles) {
    if (existsSync(file)) {
      existingFiles.push(file);
    } else {
      missingFiles.push(file);
    }
  }

  return {
    allExist: missingFiles.length === 0,
    existingFiles,
    missingFiles,
  };
}

/**
 * Validate package.json structure
 */
function validatePackageJson() {
  try {
    const packagePath = path.join(process.cwd(), "package.json");
    const packageContent = readFileSync(packagePath, "utf8");
    const packageJson = JSON.parse(packageContent);

    const requiredFields = [
      "name",
      "version",
      "main",
      "engines",
      "contributes",
    ];
    const missingFields = requiredFields.filter((field) => !packageJson[field]);

    return {
      valid: missingFields.length === 0,
      missingFields,
      version: packageJson.version,
    };
  } catch (error) {
    return {
      valid: false,
      missingFields: ["package.json"],
      error: error.message,
    };
  }
}

/**
 * Main packaging test function
 */
async function testExtensionPackaging() {
  console.log("🚀 Starting Extension Packaging Test...");
  console.log("=====================================");

  const result = new PackagingTestResult();

  try {
    // Step 1: Test compilation
    console.log("\n📦 Step 1: Testing TypeScript compilation...");
    const compileResult = await runCommand("npm run compile");

    if (compileResult.success) {
      result.compiled = true;
      console.log("✅ TypeScript compilation successful");
    } else {
      result.addError(`Compilation failed: ${compileResult.error}`);
      console.log("❌ TypeScript compilation failed");
      console.log(`Error: ${compileResult.error}`);
    }

    // Step 2: Test webpack build (if compilation succeeded)
    if (result.compiled) {
      console.log("\n🔧 Step 2: Testing webpack build...");
      const buildResult = await runCommand("npm run compile"); // Using compile as it runs webpack

      if (buildResult.success) {
        result.built = true;
        result.setBuildOutput(buildResult.output);
        console.log("✅ Webpack build successful");
      } else {
        result.addError(`Webpack build failed: ${buildResult.error}`);
        console.log("❌ Webpack build failed");
        console.log(`Error: ${buildResult.error}`);
      }
    }

    // Step 3: Check required files
    console.log("\n📁 Step 3: Checking required files...");
    const fileCheck = checkRequiredFiles();

    if (fileCheck.allExist) {
      result.filesExist = true;
      console.log("✅ All required files exist");
      console.log(`Found: ${fileCheck.existingFiles.join(", ")}`);
    } else {
      result.addError(
        `Missing required files: ${fileCheck.missingFiles.join(", ")}`
      );
      console.log("❌ Some required files are missing");
      console.log(`Missing: ${fileCheck.missingFiles.join(", ")}`);
    }

    // Step 4: Validate package.json
    console.log("\n📋 Step 4: Validating package.json...");
    const packageValidation = validatePackageJson();

    if (packageValidation.valid) {
      console.log(
        `✅ Package.json validation successful (v${packageValidation.version})`
      );
    } else {
      result.addError(
        `Package.json validation failed: Missing fields: ${packageValidation.missingFields.join(
          ", "
        )}`
      );
      console.log("❌ Package.json validation failed");
      console.log(
        `Missing fields: ${packageValidation.missingFields.join(", ")}`
      );
    }

    // Determine overall readiness
    result.ready =
      result.compiled &&
      result.built &&
      result.filesExist &&
      packageValidation.valid;

    // Final results
    console.log("\n📊 Test Results:");
    console.log("================");
    console.log(`✅ Compilation: ${result.compiled ? "PASS" : "FAIL"}`);
    console.log(`✅ Webpack Build: ${result.built ? "PASS" : "FAIL"}`);
    console.log(`✅ Files Exist: ${result.filesExist ? "PASS" : "FAIL"}`);
    console.log(
      `✅ Package Validation: ${packageValidation.valid ? "PASS" : "FAIL"}`
    );
    console.log(`🎯 Overall Ready: ${result.ready ? "YES" : "NO"}`);
    console.log(`⏱️  Duration: ${result.getDuration()}ms`);

    if (result.errors.length > 0) {
      console.log("\n❌ Errors encountered:");
      result.errors.forEach((error, index) => {
        console.log(`${index + 1}. ${error}`);
      });
    }

    if (result.ready) {
      console.log("\n🎉 Extension is ready for packaging!");
      process.exit(0);
    } else {
      console.log("\n⚠️  Extension is NOT ready for packaging");
      process.exit(1);
    }
  } catch (error) {
    result.addError(`Unexpected error: ${error.message}`);
    console.error("\n💥 Unexpected error during packaging test:", error);
    process.exit(1);
  }
}

// Run the test if this script is executed directly
if (require.main === module) {
  testExtensionPackaging().catch((error) => {
    console.error("💥 Packaging test failed:", error);
    process.exit(1);
  });
}

module.exports = {
  testExtensionPackaging,
  PackagingTestResult,
  runCommand,
  checkRequiredFiles,
  validatePackageJson,
};
