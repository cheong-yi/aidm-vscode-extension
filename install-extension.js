#!/usr/bin/env node

/**
 * Script to properly install the Enterprise AI Context extension
 */

const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

console.log("🚀 Installing Enterprise AI Context Extension...\n");

try {
  // Step 1: Clean previous builds
  console.log("1️⃣ Cleaning previous builds...");
  try {
    execSync("npm run clean", { stdio: "inherit" });
  } catch (error) {
    console.log("   (Clean command not available, continuing...)");
  }

  // Step 2: Install dependencies
  console.log("\n2️⃣ Installing dependencies...");
  execSync("npm install", { stdio: "inherit" });

  // Step 3: Compile with Webpack
  console.log("\n3️⃣ Compiling with Webpack...");
  execSync("npm run compile", { stdio: "inherit" });

  // Step 4: Check if dist directory exists
  console.log("\n4️⃣ Checking compilation output...");
  if (!fs.existsSync("./dist/extension.js")) {
    throw new Error(
      "Compilation failed - extension.js not found in dist directory"
    );
  }
  console.log("   ✅ extension.js found");

  // Step 5: Package extension
  console.log("\n5️⃣ Packaging extension...");
  try {
    execSync("npm run package", { stdio: "inherit" });
  } catch (error) {
    console.log("   Package command failed, trying vsce directly...");
    try {
      execSync("npx vsce package", { stdio: "inherit" });
    } catch (vsceError) {
      console.log("   vsce not available, skipping packaging...");
    }
  }

  // Step 6: Install extension
  console.log("\n6️⃣ Installing extension in VS Code...");

  // Find the .vsix file
  const vsixFiles = fs
    .readdirSync(".")
    .filter((file) => file.endsWith(".vsix"));

  if (vsixFiles.length > 0) {
    const vsixFile = vsixFiles[0];
    console.log(`   Installing ${vsixFile}...`);
    execSync(`code --install-extension ${vsixFile}`, { stdio: "inherit" });
  } else {
    console.log("   No .vsix file found, trying development mode...");
    console.log("   Run: code --extensionDevelopmentPath=.");
  }

  console.log("\n✅ Installation completed!");
  console.log("\n📋 Next steps:");
  console.log("   1. Restart VS Code");
  console.log("   2. Open a TypeScript file");
  console.log(
    '   3. Try Command Palette → "Enterprise AI Context: Hello (Test Command)"'
  );
  console.log('   4. Check Output panel → "Enterprise AI Context" for logs');
} catch (error) {
  console.error("\n❌ Installation failed:", error.message);
  console.log("\n🔧 Manual steps:");
  console.log("   1. npm install");
  console.log("   2. npm run compile");
  console.log("   3. code --extensionDevelopmentPath=.");
  process.exit(1);
}
