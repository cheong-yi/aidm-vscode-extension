/**
 * Simple test to verify extension commands are working
 */

const vscode = require("vscode");

async function testExtensionCommands() {
  console.log("🧪 Testing Enterprise AI Context Extension Commands...");

  try {
    // Get all available commands
    const commands = await vscode.commands.getCommands();

    // Filter for our extension commands
    const ourCommands = commands.filter((cmd) =>
      cmd.startsWith("enterprise-ai-context.")
    );

    console.log("📋 Available Enterprise AI Context Commands:");
    ourCommands.forEach((cmd) => {
      console.log(`  ✅ ${cmd}`);
    });

    if (ourCommands.length === 0) {
      console.log("❌ No Enterprise AI Context commands found!");
      console.log(
        "💡 Make sure the extension is activated by opening a TypeScript file"
      );
      return;
    }

    // Test each command
    for (const cmd of ourCommands) {
      try {
        console.log(`🔍 Testing command: ${cmd}`);
        await vscode.commands.executeCommand(cmd);
        console.log(`  ✅ ${cmd} executed successfully`);
      } catch (error) {
        console.log(`  ❌ ${cmd} failed: ${error.message}`);
      }
    }
  } catch (error) {
    console.error("❌ Test failed:", error);
  }
}

// Export for VS Code extension testing
module.exports = { testExtensionCommands };
