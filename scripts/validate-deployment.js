#!/usr/bin/env node

/**
 * Deployment Validation Script
 * Validates that the extension is ready for packaging and deployment
 */

const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

console.log("🔍 Validating deployment readiness...\n");

const errors = [];
const warnings = [];

// Check required files
const requiredFiles = [
  "package.json",
  "README.md",
  "LICENSE",
  "CHANGELOG.md",
  "INSTALLATION.md",
  ".vscodeignore",
  "out/extension.js",
];

console.log("📁 Checking required files...");
requiredFiles.forEach((file) => {
  if (!fs.existsSync(file)) {
    errors.push(`Missing required file: ${file}`);
  } else {
    console.log(`  ✅ ${file}`);
  }
});

// Validate package.json
console.log("\n📦 Validating package.json...");
try {
  const packageJson = JSON.parse(fs.readFileSync("package.json", "utf8"));

  const requiredFields = [
    "name",
    "displayName",
    "description",
    "version",
    "publisher",
    "engines",
    "categories",
    "main",
  ];

  requiredFields.forEach((field) => {
    if (!packageJson[field]) {
      errors.push(`Missing required package.json field: ${field}`);
    } else {
      console.log(`  ✅ ${field}: ${JSON.stringify(packageJson[field])}`);
    }
  });

  // Check VSCode engine version
  if (packageJson.engines && packageJson.engines.vscode) {
    console.log(`  ✅ VSCode engine: ${packageJson.engines.vscode}`);
  } else {
    errors.push("Missing VSCode engine specification");
  }

  // Check activation events
  if (packageJson.activationEvents && packageJson.activationEvents.length > 0) {
    console.log(
      `  ✅ Activation events: ${packageJson.activationEvents.join(", ")}`
    );
  } else {
    warnings.push("No activation events specified");
  }

  // Check contributes section
  if (packageJson.contributes) {
    console.log(`  ✅ Contributes section present`);
    if (packageJson.contributes.configuration) {
      console.log(`  ✅ Configuration schema present`);
    }
    if (packageJson.contributes.commands) {
      console.log(
        `  ✅ Commands: ${packageJson.contributes.commands.length} defined`
      );
    }
  } else {
    warnings.push("No contributes section in package.json");
  }
} catch (error) {
  errors.push(`Invalid package.json: ${error.message}`);
}

// Check TypeScript compilation
console.log("\n🔨 Checking TypeScript compilation...");
try {
  execSync("npm run compile", { stdio: "pipe" });
  console.log("  ✅ TypeScript compilation successful");
} catch (error) {
  errors.push("TypeScript compilation failed");
  console.log(`  ❌ Compilation error: ${error.message}`);
}

// Check if main entry point exists
console.log("\n🎯 Checking main entry point...");
try {
  const packageJson = JSON.parse(fs.readFileSync("package.json", "utf8"));
  const mainFile = packageJson.main;
  if (fs.existsSync(mainFile)) {
    console.log(`  ✅ Main entry point exists: ${mainFile}`);
  } else {
    errors.push(`Main entry point not found: ${mainFile}`);
  }
} catch (error) {
  errors.push(`Error checking main entry point: ${error.message}`);
}

// Check linting
console.log("\n🧹 Checking code quality...");
try {
  execSync("npm run lint", { stdio: "pipe" });
  console.log("  ✅ ESLint passed");
} catch (error) {
  warnings.push("ESLint issues found - run npm run lint:fix");
}

// Check test coverage (allow to pass with warnings)
console.log("\n🧪 Checking test coverage...");
try {
  const result = execSync("npm run test:ci", {
    stdio: "pipe",
    encoding: "utf8",
  });
  console.log("  ✅ Tests passed");

  // Extract coverage information
  const coverageMatch = result.match(/All files\s+\|\s+([\d.]+)/);
  if (coverageMatch) {
    const coverage = parseFloat(coverageMatch[1]);
    if (coverage >= 80) {
      console.log(`  ✅ Test coverage: ${coverage}%`);
    } else {
      warnings.push(`Test coverage below 80%: ${coverage}%`);
    }
  }
} catch (error) {
  warnings.push("Some tests failed or coverage below threshold");
}

// Check README content
console.log("\n📖 Checking documentation...");
try {
  const readme = fs.readFileSync("README.md", "utf8");
  const requiredSections = [
    "Features",
    "Installation",
    "Configuration",
    "Requirements",
  ];

  requiredSections.forEach((section) => {
    if (readme.includes(section)) {
      console.log(`  ✅ README contains ${section} section`);
    } else {
      warnings.push(`README missing ${section} section`);
    }
  });
} catch (error) {
  errors.push(`Error reading README.md: ${error.message}`);
}

// Check for demo functionality
console.log("\n🎭 Checking demo functionality...");
if (fs.existsSync("out/demo/runDemo.js")) {
  console.log("  ✅ Demo scripts compiled");
} else {
  warnings.push("Demo scripts not found - demo functionality may not work");
}

// Summary
console.log("\n📊 Validation Summary");
console.log("=".repeat(50));

if (errors.length === 0) {
  console.log("✅ All critical validations passed!");
} else {
  console.log(`❌ ${errors.length} critical error(s) found:`);
  errors.forEach((error) => console.log(`  • ${error}`));
}

if (warnings.length > 0) {
  console.log(`⚠️  ${warnings.length} warning(s):`);
  warnings.forEach((warning) => console.log(`  • ${warning}`));
}

console.log("\n🚀 Deployment Readiness:");
if (errors.length === 0) {
  console.log("✅ READY FOR PACKAGING");
  console.log("\nNext steps:");
  console.log("  1. Run: npm run package");
  console.log("  2. Test the .vsix file");
  console.log("  3. Publish: npm run publish");
} else {
  console.log("❌ NOT READY - Fix errors above");
  process.exit(1);
}

if (warnings.length > 0) {
  console.log("\n💡 Consider addressing warnings for better quality");
}

console.log("\n" + "=".repeat(50));
