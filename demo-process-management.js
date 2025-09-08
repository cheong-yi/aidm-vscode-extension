/**
 * Demo script to show process management functionality
 * This demonstrates the key features implemented in task 8
 */

const { ProcessManager } = require("./out/server/ProcessManager");
const { MCPClient } = require("./out/client/mcpClient");

async function demonstrateProcessManagement() {
  console.log("🚀 Enterprise AI Context Extension - Process Management Demo\n");

  // Configuration for the demo
  const config = {
    port: 3000,
    timeout: 5000,
    retryAttempts: 3,
    maxConcurrentRequests: 10,
    mock: {
      enabled: true,
      dataSize: "small",
      enterprisePatterns: true,
    },
  };

  console.log("📋 Configuration:", JSON.stringify(config, null, 2));

  // Create process manager
  const processManager = new ProcessManager(config);
  const mcpClient = new MCPClient(config.port, config.timeout);

  try {
    // 1. Demonstrate server startup
    console.log("\n1️⃣ Starting MCP server...");
    await processManager.start();
    console.log("✅ Server started successfully");

    // Show initial stats
    const initialStats = processManager.getStats();
    console.log("📊 Initial stats:", {
      isRunning: initialStats.isRunning,
      uptime: initialStats.uptime,
      restartCount: initialStats.restartCount,
    });

    // 2. Demonstrate client-server communication
    console.log("\n2️⃣ Testing client-server communication...");
    const pingResult = await mcpClient.ping();
    console.log("🏓 Ping result:", pingResult);

    const businessContext = await mcpClient.getBusinessContext("demo.ts", 10);
    console.log("📄 Business context retrieved:", !!businessContext);

    // 3. Demonstrate configuration update
    console.log("\n3️⃣ Updating configuration...");
    await processManager.updateConfig({
      maxConcurrentRequests: 15,
      mock: {
        enabled: true,
        dataSize: "medium",
        enterprisePatterns: true,
      },
    });
    console.log("⚙️ Configuration updated successfully");

    // 4. Demonstrate restart functionality
    console.log("\n4️⃣ Testing server restart...");
    await processManager.restart();
    console.log("🔄 Server restarted successfully");

    const restartStats = processManager.getStats();
    console.log("📊 Post-restart stats:", {
      isRunning: restartStats.isRunning,
      restartCount: restartStats.restartCount,
    });

    // 5. Demonstrate health monitoring
    console.log("\n5️⃣ Health monitoring...");
    console.log("💚 Server healthy:", processManager.isHealthy());

    // 6. Demonstrate graceful shutdown
    console.log("\n6️⃣ Performing graceful shutdown...");
    await processManager.shutdown();
    console.log("🛑 Graceful shutdown completed");

    const finalStats = processManager.getStats();
    console.log("📊 Final stats:", {
      isRunning: finalStats.isRunning,
      uptime: finalStats.uptime,
    });

    console.log("\n🎉 Process management demo completed successfully!");
    console.log("\n✨ Key features demonstrated:");
    console.log("   • MCP server spawning and lifecycle management");
    console.log("   • Process cleanup and error recovery");
    console.log("   • Configuration management with hot reload");
    console.log("   • Graceful shutdown and resource cleanup");
    console.log("   • Health monitoring and status reporting");
  } catch (error) {
    console.error("❌ Demo failed:", error.message);

    // Ensure cleanup even on error
    try {
      await processManager.shutdown();
    } catch (cleanupError) {
      console.error("❌ Cleanup failed:", cleanupError.message);
    }
  }
}

// Run the demo
demonstrateProcessManagement().catch(console.error);
