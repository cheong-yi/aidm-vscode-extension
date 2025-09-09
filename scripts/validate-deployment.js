#!/usr/bin/env node

/**
 * Basic deployment validation script
 * Checks essential requirements for packaging
 */

const fs = require("fs");
const { execSync } = require("child_process");

console.log("🔍 Basic deployment validation...\n");

const errors = [];

// Check essential files
const essentialFiles = ["package.json", "README.md", ".vscodeignore"];
essentialFiles.forEach((file) => {
  if (!fs.existsSync(file)) {
    errors.push(`Missing file: ${file}`);
  } else {
    console.log(`✅ ${file}`);
  }
});

// Validate package.json basics
try {
  const pkg = JSON.parse(fs.readFileSync("package.json", "utf8"));
  const required = ["name", "version", "publisher", "main"];
  
  required.forEach((field) => {
    if (!pkg[field]) {
      errors.push(`Missing package.json field: ${field}`);
    }
  });
  
  console.log(`✅ Package: ${pkg.name} v${pkg.version}`);
} catch (error) {
  errors.push(`Invalid package.json: ${error.message}`);
}

// Check compilation
console.log("\n🔨 Checking compilation...");
try {
  execSync("npm run compile", { stdio: "pipe" });
  console.log("✅ Compilation successful");
} catch (error) {
  errors.push("Compilation failed");
}

// Summary
console.log("\n📊 Validation Result:");
if (errors.length === 0) {
  console.log("✅ READY FOR PACKAGING");
} else {
  console.log("❌ ERRORS FOUND:");
  errors.forEach((error) => console.log(`  • ${error}`));
  process.exit(1);
}
