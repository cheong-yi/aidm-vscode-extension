#!/usr/bin/env node

const fs = require("fs");
const { execSync } = require("child_process");

console.log("🔍 Debug Packaging Script\n");

// Check current directory
console.log("Current directory:", process.cwd());

// Check if package.json exists
if (fs.existsSync("package.json")) {
  console.log("✅ package.json found");
  const packageJson = JSON.parse(fs.readFileSync("package.json", "utf8"));
  console.log("Version:", packageJson.version);
} else {
  console.log("❌ package.json not found");
  process.exit(1);
}

// Check if dist directory exists
if (fs.existsSync("dist")) {
  console.log("✅ dist directory exists");
  const distFiles = fs.readdirSync("dist");
  console.log("Files in dist:", distFiles);
} else {
  console.log("❌ dist directory does not exist");
}

// Check if out directory exists
if (fs.existsSync("out")) {
  console.log("✅ out directory exists");
  const outFiles = fs.readdirSync("out");
  console.log("Files in out:", outFiles.slice(0, 5)); // Show first 5 files
} else {
  console.log("❌ out directory does not exist");
}

// Test npm run compile-tsc
console.log("\n🔨 Testing npm run compile-tsc...");
try {
  execSync("npm run compile-tsc", { stdio: "inherit" });
  console.log("✅ Compilation successful");
} catch (error) {
  console.error("❌ Compilation failed:", error.message);
}

// Check if vsce is available
console.log("\n📦 Checking vsce...");
try {
  const vsceVersion = execSync("vsce --version", { stdio: "pipe" })
    .toString()
    .trim();
  console.log("✅ vsce available:", vsceVersion);
} catch (error) {
  console.log("❌ vsce not available, trying to install...");
  try {
    execSync("npm install -g @vscode/vsce", { stdio: "inherit" });
    console.log("✅ vsce installed successfully");
  } catch (installError) {
    console.error("❌ Failed to install vsce:", installError.message);
  }
}
