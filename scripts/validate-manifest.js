#!/usr/bin/env node

/**
 * Task: 7.1.12 - Validate VSCode Extension Manifest and Packaging Readiness
 * Requirements: Extension packaging and distribution readiness
 * Dependencies: package.json and webpack.config.js validation
 * Complexity: low
 * Time: 15-20 minutes
 *
 * This script validates that the VSCode extension manifest is complete
 * and the extension is ready for packaging and distribution.
 */

const path = require("path");
const fs = require("fs");

// Load package.json
const packageJsonPath = path.join(__dirname, "..", "package.json");
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf8"));

// Load webpack config
const webpackConfigPath = path.join(__dirname, "..", "webpack.config.js");
const webpackConfig = require(webpackConfigPath);

// Validation functions (simplified for Node.js script)
function validateExtensionManifest(packageJson) {
  const errors = [];
  const warnings = [];

  // Validate required fields
  if (!packageJson.name) errors.push("Missing required field: name");
  if (!packageJson.version) errors.push("Missing required field: version");
  if (!packageJson.engines?.vscode)
    errors.push("Missing required field: engines.vscode");
  if (!packageJson.main) errors.push("Missing required field: main");
  if (!packageJson.contributes)
    errors.push("Missing required field: contributes");

  // Validate contributes structure
  if (packageJson.contributes) {
    if (!packageJson.contributes.commands)
      errors.push("Missing required field: contributes.commands");
    if (!packageJson.contributes.views)
      errors.push("Missing required field: contributes.views");
    if (!packageJson.contributes.viewsContainers)
      errors.push("Missing required field: contributes.viewsContainers");

    // Validate taskmaster view contributions specifically
    if (packageJson.contributes.views) {
      if (!packageJson.contributes.views.taskmaster) {
        errors.push("Missing required field: contributes.views.taskmaster");
      }
    }

    if (packageJson.contributes.viewsContainers) {
      if (!packageJson.contributes.viewsContainers.activitybar) {
        errors.push(
          "Missing required field: contributes.viewsContainers.activitybar"
        );
      }
    }
  }

  // Validate VSCode engine version format
  if (packageJson.engines?.vscode) {
    const vscodeVersion = packageJson.engines.vscode;
    if (
      typeof vscodeVersion !== "string" ||
      !vscodeVersion.match(/^\^?\d+\.\d+\.\d+/)
    ) {
      warnings.push("VSCode engine version format may be invalid");
    }
  }

  // Validate main entry point format
  if (packageJson.main) {
    if (!packageJson.main.match(/^\.\/dist\/.*\.js$/)) {
      warnings.push("Main entry point should point to dist/ directory");
    }
  }

  // Validate commands structure
  if (packageJson.contributes?.commands) {
    packageJson.contributes.commands.forEach((command, index) => {
      if (!command.command) {
        errors.push(
          `Command at index ${index} missing required field: command`
        );
      }
      if (!command.title) {
        errors.push(`Command at index ${index} missing required field: title`);
      }
      if (!command.category) {
        errors.push(
          `Command at index ${index} missing required field: category`
        );
      }
    });
  }

  // Validate activation events
  if (
    !packageJson.activationEvents ||
    !Array.isArray(packageJson.activationEvents)
  ) {
    warnings.push("activationEvents should be an array");
  }

  // Validate categories
  if (!packageJson.categories || !Array.isArray(packageJson.categories)) {
    warnings.push("categories should be an array");
  }

  return { isValid: errors.length === 0, errors, warnings };
}

function validateWebpackCompatibility(packageJson, webpackConfig) {
  const errors = [];
  const warnings = [];

  // Check that webpack output matches package.json main
  if (webpackConfig.output && packageJson.main) {
    const webpackOutputPath = webpackConfig.output.path;
    const webpackFilename = webpackConfig.output.filename;
    const expectedPath = `./dist/${webpackFilename}`;

    if (packageJson.main !== expectedPath) {
      errors.push(
        `Package.json main (${packageJson.main}) doesn't match webpack output (${expectedPath})`
      );
    }
  }

  // Check webpack target
  if (webpackConfig.target !== "node") {
    warnings.push('Webpack target should be "node" for VSCode extensions');
  }

  // Check entry point exists
  if (webpackConfig.entry && !webpackConfig.entry.includes("extension.ts")) {
    warnings.push("Webpack entry should point to extension.ts");
  }

  return { isValid: errors.length === 0, errors, warnings };
}

function validatePackagingReadiness(packageJson, webpackConfig) {
  const manifestResult = validateExtensionManifest(packageJson);
  const webpackResult = validateWebpackCompatibility(
    packageJson,
    webpackConfig
  );

  const combinedErrors = [...manifestResult.errors, ...webpackResult.errors];
  const combinedWarnings = [
    ...manifestResult.warnings,
    ...webpackResult.warnings,
  ];

  return {
    isValid: combinedErrors.length === 0,
    errors: combinedErrors,
    warnings: combinedWarnings,
  };
}

// Main validation execution
console.log(
  "🔍 Validating VSCode Extension Manifest and Packaging Readiness...\n"
);

const result = validatePackagingReadiness(packageJson, webpackConfig);

// Display results
if (result.isValid) {
  console.log("✅ Extension manifest validation PASSED");
  console.log("✅ Extension is ready for packaging");
} else {
  console.log("❌ Extension manifest validation FAILED");
  console.log("❌ Extension is NOT ready for packaging");
}

if (result.errors.length > 0) {
  console.log("\n🚨 ERRORS (must be fixed):");
  result.errors.forEach((error) => {
    console.log(`   • ${error}`);
  });
}

if (result.warnings.length > 0) {
  console.log("\n⚠️  WARNINGS (should be reviewed):");
  result.warnings.forEach((warning) => {
    console.log(`   • ${warning}`);
  });
}

// Summary
console.log("\n📊 Validation Summary:");
console.log(`   • Total Errors: ${result.errors.length}`);
console.log(`   • Total Warnings: ${result.warnings.length}`);
console.log(
  `   • Status: ${result.isValid ? "READY FOR PACKAGING" : "NOT READY"}`
);

// Exit with appropriate code
if (result.isValid) {
  console.log("\n🎉 Extension manifest validation completed successfully!");
  process.exit(0);
} else {
  console.log(
    "\n💥 Extension manifest validation failed. Please fix the errors above."
  );
  process.exit(1);
}
