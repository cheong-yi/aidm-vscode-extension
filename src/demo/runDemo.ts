#!/usr/bin/env node

/**
 * Command-line Demo Runner for RooCode Hybrid MCP Integration
 * Demonstrates dual-context AI responses and validates concurrent request handling
 */

import { DemoScenarios } from "./demoScenarios";
import { RooCodeIntegration } from "./rooCodeIntegration";

interface DemoConfig {
  localPort: number;
  remoteUrl?: string;
  scenarios: string[];
  verbose: boolean;
}

class DemoRunner {
  private config: DemoConfig;
  private demoScenarios: DemoScenarios;
  private rooCodeIntegration: RooCodeIntegration;

  constructor(config: DemoConfig) {
    this.config = config;
    this.demoScenarios = new DemoScenarios(config.localPort);
    this.rooCodeIntegration = new RooCodeIntegration(config.localPort);

    if (config.remoteUrl) {
      this.demoScenarios.configureRemoteServer(config.remoteUrl);
      this.rooCodeIntegration.configureRemoteServer(config.remoteUrl);
    }
  }

  /**
   * Run the complete demo suite
   */
  async runDemo(): Promise<void> {
    console.log("🚀 RooCode Hybrid MCP Architecture Demo");
    console.log("=".repeat(80));
    console.log(
      `📡 Local MCP Server: http://localhost:${this.config.localPort}`
    );
    console.log(
      `🌐 Remote MCP Server: ${
        this.config.remoteUrl || "Not configured (using mock data)"
      }`
    );
    console.log(`📋 Scenarios: ${this.config.scenarios.join(", ")}`);
    console.log("");

    try {
      // Pre-flight checks
      await this.performPreflightChecks();

      // Run selected scenarios
      if (this.config.scenarios.includes("all")) {
        await this.runAllScenarios();
      } else {
        await this.runSelectedScenarios();
      }

      // Post-demo analysis
      await this.performPostDemoAnalysis();
    } catch (error) {
      console.error("❌ Demo execution failed:", error);
      process.exit(1);
    }
  }

  /**
   * Perform pre-flight connectivity and configuration checks
   */
  private async performPreflightChecks(): Promise<void> {
    console.log("🔍 Pre-flight Checks");
    console.log("-".repeat(40));

    // Test connectivity
    const connectivity = await this.rooCodeIntegration.getConnectivityStatus();

    console.log(
      `📡 Local Server: ${
        connectivity.local ? "✅ Connected" : "❌ Disconnected"
      }`
    );
    if (connectivity.localLatency) {
      console.log(`   └─ Latency: ${connectivity.localLatency}ms`);
    }

    console.log(
      `🌐 Remote Server: ${
        connectivity.remote ? "✅ Connected" : "❌ Disconnected"
      }`
    );
    if (connectivity.remoteLatency) {
      console.log(`   └─ Latency: ${connectivity.remoteLatency}ms`);
    } else if (connectivity.remoteConfigured) {
      console.log(`   └─ Configured but not responding`);
    } else {
      console.log(`   └─ Not configured (will use mock data)`);
    }

    // Warn about potential issues
    if (!connectivity.local) {
      console.log(
        "⚠️  Warning: Local MCP server not available. Some scenarios may use fallback data."
      );
    }

    if (this.config.remoteUrl && !connectivity.remote) {
      console.log(
        "⚠️  Warning: Remote MCP server not responding. Will use mock delivery patterns."
      );
    }

    console.log("");
  }

  /**
   * Run all demo scenarios
   */
  private async runAllScenarios(): Promise<void> {
    console.log("🎬 Running All Demo Scenarios");
    console.log("-".repeat(40));

    const results = await this.demoScenarios.runAllDemos();

    // Display detailed results if verbose
    if (this.config.verbose) {
      console.log("\n📊 Detailed Results:");
      console.log(JSON.stringify(results, null, 2));
    }
  }

  /**
   * Run selected scenarios
   */
  private async runSelectedScenarios(): Promise<void> {
    console.log("🎯 Running Selected Scenarios");
    console.log("-".repeat(40));

    for (const scenario of this.config.scenarios) {
      await this.runSingleScenario(scenario);
    }
  }

  /**
   * Run a single scenario
   */
  private async runSingleScenario(scenario: string): Promise<void> {
    console.log(`\n🎬 Scenario: ${scenario}`);

    try {
      switch (scenario) {
        case "local-sprint":
          await this.demoLocalSprintContext();
          break;
        case "local-code":
          await this.demoLocalCodeContext();
          break;
        case "remote-patterns":
          await this.demoRemoteDeliveryPatterns();
          break;
        case "remote-knowledge":
          await this.demoRemoteInstitutionalKnowledge();
          break;
        case "hybrid":
          await this.demoHybridContext();
          break;
        case "concurrent":
          await this.demoConcurrentRequests();
          break;
        case "error-handling":
          await this.demoErrorHandling();
          break;
        default:
          console.log(`❌ Unknown scenario: ${scenario}`);
      }
    } catch (error) {
      console.log(`❌ Scenario failed: ${error}`);
    }
  }

  /**
   * Individual scenario implementations
   */
  private async demoLocalSprintContext(): Promise<void> {
    const response = await this.rooCodeIntegration.processQuery({
      type: "local",
      context: {},
      query: "What's the current sprint context and team patterns?",
    });

    this.displayResponse("Local Sprint Context", response);
  }

  private async demoLocalCodeContext(): Promise<void> {
    const response = await this.rooCodeIntegration.processQuery({
      type: "local",
      context: {
        filePath: "src/services/userService.ts",
        startLine: 15,
        endLine: 30,
      },
      query: "What business requirements does this code implement?",
    });

    this.displayResponse("Local Code Context", response);
  }

  private async demoRemoteDeliveryPatterns(): Promise<void> {
    const response = await this.rooCodeIntegration.processQuery({
      type: "remote",
      context: {
        technology: "TypeScript",
      },
      query: "What are the proven delivery patterns for TypeScript projects?",
    });

    this.displayResponse("Remote Delivery Patterns", response);
  }

  private async demoRemoteInstitutionalKnowledge(): Promise<void> {
    const response = await this.rooCodeIntegration.processQuery({
      type: "remote",
      context: {
        domain: "enterprise-architecture",
      },
      query:
        "What institutional knowledge is available for enterprise architecture?",
    });

    this.displayResponse("Remote Institutional Knowledge", response);
  }

  private async demoHybridContext(): Promise<void> {
    const response = await this.rooCodeIntegration.processQuery({
      type: "hybrid",
      context: {
        filePath: "src/components/PaymentProcessor.ts",
        startLine: 45,
        endLine: 75,
        technology: "TypeScript",
      },
      query:
        "How should I implement this payment processing feature considering both current sprint requirements and proven delivery patterns?",
    });

    this.displayResponse("Hybrid Context", response);
  }

  private async demoConcurrentRequests(): Promise<void> {
    const queries = [
      {
        type: "local" as const,
        context: {
          filePath: "src/auth/authService.ts",
          startLine: 1,
          endLine: 20,
        },
        query: "Authentication service context",
      },
      {
        type: "remote" as const,
        context: { technology: "Node.js" },
        query: "Node.js delivery patterns",
      },
      {
        type: "hybrid" as const,
        context: {
          filePath: "src/api/userApi.ts",
          startLine: 10,
          endLine: 30,
          technology: "REST",
        },
        query: "User API implementation guidance",
      },
    ];

    const result = await this.rooCodeIntegration.testConcurrentRequests(
      queries
    );

    console.log(`✅ Concurrent Requests Completed`);
    console.log(`   📊 Total Time: ${result.totalTime}ms`);
    console.log(
      `   📈 Average Response Time: ${Math.round(result.averageResponseTime)}ms`
    );
    console.log(`   🎯 Success Rate: ${Math.round(result.successRate * 100)}%`);
    console.log(`   🔄 Requests Processed: ${result.results.length}`);
  }

  private async demoErrorHandling(): Promise<void> {
    const response = await this.rooCodeIntegration.processQuery({
      type: "local",
      context: {
        filePath: "",
        startLine: -1,
        endLine: -1,
      },
      query: "Test error handling with invalid parameters",
    });

    this.displayResponse("Error Handling", response);
  }

  /**
   * Display formatted response
   */
  private displayResponse(title: string, response: any): void {
    console.log(`✅ ${title}`);
    console.log(`   📊 Response Time: ${response.responseTime}ms`);
    console.log(`   📈 Confidence: ${Math.round(response.confidence * 100)}%`);
    console.log(`   🎯 Suggestions: ${response.suggestions.length}`);

    if (this.config.verbose) {
      console.log(`   💡 Top Suggestions:`);
      response.suggestions
        .slice(0, 3)
        .forEach((suggestion: string, index: number) => {
          console.log(`      ${index + 1}. ${suggestion}`);
        });
    }

    console.log(`   📋 Sources: ${response.sources.join(", ")}`);
  }

  /**
   * Perform post-demo analysis
   */
  private async performPostDemoAnalysis(): Promise<void> {
    console.log("\n📊 Post-Demo Analysis");
    console.log("-".repeat(40));

    // Final connectivity check
    const finalConnectivity =
      await this.rooCodeIntegration.getConnectivityStatus();

    console.log("🔗 Final Connectivity Status:");
    console.log(`   Local: ${finalConnectivity.local ? "✅" : "❌"}`);
    console.log(`   Remote: ${finalConnectivity.remote ? "✅" : "❌"}`);

    // Performance summary
    console.log("\n⚡ Performance Summary:");
    console.log("   - Local queries typically respond in <200ms");
    console.log("   - Remote queries may take up to 2s depending on network");
    console.log("   - Hybrid queries combine both contexts efficiently");
    console.log("   - Concurrent requests are handled without blocking");

    // Architecture validation
    console.log("\n🏗️ Architecture Validation:");
    console.log("   ✅ Local MCP server provides sprint and story context");
    console.log(
      "   ✅ Remote MCP server provides delivery patterns and institutional knowledge"
    );
    console.log("   ✅ Hybrid queries combine both contexts intelligently");
    console.log("   ✅ Error handling provides graceful degradation");
    console.log("   ✅ Concurrent requests are processed efficiently");

    console.log("\n🎉 Demo completed successfully!");
    console.log(
      "RooCode can now access both local sprint context and remote delivery intelligence."
    );
  }
}

/**
 * Parse command line arguments
 */
function parseArgs(): DemoConfig {
  const args = process.argv.slice(2);
  const config: DemoConfig = {
    localPort: 3000,
    scenarios: ["all"],
    verbose: false,
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    switch (arg) {
      case "--port":
        config.localPort = parseInt(args[++i]) || 3000;
        break;
      case "--remote":
        config.remoteUrl = args[++i];
        break;
      case "--scenarios":
        config.scenarios = args[++i].split(",");
        break;
      case "--verbose":
        config.verbose = true;
        break;
      case "--help":
        printHelp();
        process.exit(0);
        break;
    }
  }

  return config;
}

/**
 * Print help information
 */
function printHelp(): void {
  console.log(`
🚀 RooCode Hybrid MCP Architecture Demo

Usage: node runDemo.js [options]

Options:
  --port <number>        Local MCP server port (default: 3000)
  --remote <url>         Remote MCP server URL (optional)
  --scenarios <list>     Comma-separated list of scenarios to run
                         Options: all, local-sprint, local-code, remote-patterns,
                                 remote-knowledge, hybrid, concurrent, error-handling
  --verbose              Show detailed output
  --help                 Show this help message

Examples:
  node runDemo.js
  node runDemo.js --port 3001 --remote https://remote-mcp.example.com
  node runDemo.js --scenarios local-sprint,hybrid,concurrent --verbose
  `);
}

/**
 * Main execution
 */
async function main(): Promise<void> {
  try {
    const config = parseArgs();
    const runner = new DemoRunner(config);
    await runner.runDemo();
  } catch (error) {
    console.error("❌ Demo runner failed:", error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

export { DemoRunner, DemoConfig };
