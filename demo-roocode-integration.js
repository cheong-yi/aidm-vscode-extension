/**
 * RooCode Integration Demo Runner
 * Demonstrates hybrid MCP architecture with local and remote context
 */

const { spawn } = require("child_process");
const path = require("path");

console.log("🚀 Starting RooCode Integration Demo...");
console.log("This demo shows how RooCode can use hybrid MCP architecture");
console.log(
  "to access both local sprint context and remote delivery patterns.\n"
);

// Compile TypeScript and run the demo
const tscPath = path.join(__dirname, "node_modules", ".bin", "tsc");
const nodePath = process.execPath;

console.log("📦 Compiling TypeScript...");

const tscProcess = spawn(tscPath, ["--build"], {
  stdio: "inherit",
  shell: true,
  cwd: __dirname,
});

tscProcess.on("close", (code) => {
  if (code !== 0) {
    console.error("❌ TypeScript compilation failed");
    process.exit(1);
  }

  console.log("✅ TypeScript compilation successful");
  console.log("🎬 Running RooCode Integration Demo...\n");

  // Run the compiled demo
  const demoProcess = spawn(
    `"${nodePath}"`,
    [
      "-e",
      `const { runRooCodeIntegrationDemo } = require('./out/src/demo/rooCodeIntegrationDemo.js'); runRooCodeIntegrationDemo().catch(console.error);`,
    ],
    {
      stdio: "inherit",
      shell: true,
      cwd: __dirname,
    }
  );

  demoProcess.on("close", (demoCode) => {
    if (demoCode === 0) {
      console.log("\n🎉 RooCode Integration Demo completed successfully!");
      console.log("\nKey Demonstrations:");
      console.log("✅ Local MCP server for sprint context");
      console.log("✅ Remote MCP server for delivery patterns");
      console.log("✅ Hybrid context combining local + remote intelligence");
      console.log("✅ Concurrent AI assistant request handling");
      console.log("✅ Fallback behavior when services unavailable");
      console.log("✅ Performance optimization with concurrent queries");
    } else {
      console.error("❌ Demo execution failed");
      process.exit(1);
    }
  });

  demoProcess.on("error", (error) => {
    console.error("❌ Failed to run demo:", error);
    process.exit(1);
  });
});

tscProcess.on("error", (error) => {
  console.error("❌ Failed to compile TypeScript:", error);
  process.exit(1);
});
