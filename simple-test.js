const fs = require("fs");
const path = require("path");

console.log("Simple test script");
console.log("Current directory:", process.cwd());
console.log("Node version:", process.version);

// Check if package.json exists
if (fs.existsSync("package.json")) {
  console.log("✅ package.json found");
  const packageJson = JSON.parse(fs.readFileSync("package.json", "utf8"));
  console.log("Package name:", packageJson.name);
  console.log("Version:", packageJson.version);
  console.log("Main entry:", packageJson.main);
} else {
  console.log("❌ package.json not found");
}

// Check if out directory exists
if (fs.existsSync("out")) {
  console.log("✅ out directory exists");
  const files = fs.readdirSync("out");
  console.log("Files in out:", files.length);
  if (files.includes("extension.js")) {
    console.log("✅ extension.js found in out directory");
  } else {
    console.log("❌ extension.js not found in out directory");
  }
} else {
  console.log("❌ out directory does not exist");
}

// Check if dist directory exists
if (fs.existsSync("dist")) {
  console.log("✅ dist directory exists");
  const files = fs.readdirSync("dist");
  console.log("Files in dist:", files.length);
} else {
  console.log("❌ dist directory does not exist");
}

console.log("Test completed");
