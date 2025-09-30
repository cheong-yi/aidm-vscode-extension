const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

console.log("🔧 Installing dependencies...");
try {
  execSync("npm install", { stdio: "inherit" });
  console.log("✅ Dependencies installed successfully");
} catch (error) {
  console.error("❌ Failed to install dependencies:", error.message);
  process.exit(1);
}

console.log("🔨 Building with webpack...");
try {
  execSync("npx webpack", { stdio: "inherit" });
  console.log("✅ Build completed successfully");
} catch (error) {
  console.error("❌ Build failed:", error.message);
  process.exit(1);
}

console.log("📦 Running package script...");
try {
  execSync("node package-extension.js", { stdio: "inherit" });
  console.log("✅ Packaging completed successfully");
} catch (error) {
  console.error("❌ Packaging failed:", error.message);
  process.exit(1);
}

