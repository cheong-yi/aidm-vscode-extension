/**
 * Demo Scenarios for RooCode Hybrid MCP Integration
 * Showcases dual-context AI responses and concurrent request handling
 */

import {
  RooCodeIntegration,
  RooCodeQuery,
  RooCodeResponse,
} from "./rooCodeIntegration";

export class DemoScenarios {
  private rooCodeIntegration: RooCodeIntegration;
  private demoResults: Map<string, any> = new Map();

  constructor(localPort: number = 3000) {
    this.rooCodeIntegration = new RooCodeIntegration(localPort);
  }

  /**
   * Configure remote server for demo
   */
  configureRemoteServer(remoteUrl: string): void {
    this.rooCodeIntegration.configureRemoteServer(remoteUrl);
  }

  /**
   * Run all demo scenarios
   */
  async runAllDemos(): Promise<{
    scenarios: { [key: string]: any };
    summary: {
      totalScenarios: number;
      successfulScenarios: number;
      averageResponseTime: number;
      connectivityStatus: any;
    };
  }> {
    console.log("🚀 Starting RooCode Hybrid MCP Architecture Demo");
    console.log("=".repeat(60));

    const scenarios: { [key: string]: any } = {};

    // Test connectivity first
    const connectivity = await this.rooCodeIntegration.getConnectivityStatus();
    scenarios.connectivity = connectivity;
    console.log("📡 Connectivity Status:", connectivity);

    // Scenario 1: Local Sprint Context Query
    console.log("\n📋 Scenario 1: Local Sprint Context Query");
    scenarios.localSprintContext = await this.demoLocalSprintContext();

    // Scenario 2: Local Code Context Query
    console.log("\n💻 Scenario 2: Local Code Context Query");
    scenarios.localCodeContext = await this.demoLocalCodeContext();

    // Scenario 3: Remote Delivery Patterns Query
    console.log("\n🌐 Scenario 3: Remote Delivery Patterns Query");
    scenarios.remoteDeliveryPatterns = await this.demoRemoteDeliveryPatterns();

    // Scenario 4: Remote Institutional Knowledge Query
    console.log("\n🎓 Scenario 4: Remote Institutional Knowledge Query");
    scenarios.remoteInstitutionalKnowledge =
      await this.demoRemoteInstitutionalKnowledge();

    // Scenario 5: Hybrid Context Query
    console.log("\n🔄 Scenario 5: Hybrid Context Query");
    scenarios.hybridContext = await this.demoHybridContext();

    // Scenario 6: Concurrent Request Handling
    console.log("\n⚡ Scenario 6: Concurrent Request Handling");
    scenarios.concurrentRequests = await this.demoConcurrentRequests();

    // Scenario 7: Error Handling and Fallback
    console.log("\n🛡️ Scenario 7: Error Handling and Fallback");
    scenarios.errorHandling = await this.demoErrorHandling();

    // Generate summary
    const summary = this.generateSummary(scenarios);

    console.log("\n📊 Demo Summary");
    console.log("=".repeat(60));
    console.log(`Total Scenarios: ${summary.totalScenarios}`);
    console.log(`Successful Scenarios: ${summary.successfulScenarios}`);
    console.log(`Average Response Time: ${summary.averageResponseTime}ms`);
    console.log(
      `Local Server: ${connectivity.local ? "✅ Connected" : "❌ Disconnected"}`
    );
    console.log(
      `Remote Server: ${
        connectivity.remote ? "✅ Connected" : "❌ Disconnected"
      } (Configured: ${connectivity.remoteConfigured})`
    );

    return { scenarios, summary };
  }

  /**
   * Demo Scenario 1: Local Sprint Context Query
   */
  private async demoLocalSprintContext(): Promise<any> {
    const query: RooCodeQuery = {
      type: "local",
      context: {},
      query:
        "What's the current sprint context and team patterns I should follow?",
    };

    try {
      const response = await this.rooCodeIntegration.processQuery(query);
      console.log(`✅ Response Time: ${response.responseTime}ms`);
      console.log(`📈 Confidence: ${Math.round(response.confidence * 100)}%`);
      console.log(`🎯 Suggestions (${response.suggestions.length}):`);
      response.suggestions.forEach((suggestion, index) => {
        console.log(`   ${index + 1}. ${suggestion}`);
      });

      if (response.localContext) {
        console.log(`📅 Sprint: ${response.localContext.sprintDetails.name}`);
        console.log(
          `📝 Current Story: ${response.localContext.storyContext.title}`
        );
        console.log(
          `👥 Team Patterns: ${response.localContext.teamPatterns.length}`
        );
      }

      return { success: true, response };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      console.log(`❌ Error: ${errorMessage}`);
      return { success: false, error: errorMessage };
    }
  }

  /**
   * Demo Scenario 2: Local Code Context Query
   */
  private async demoLocalCodeContext(): Promise<any> {
    const query: RooCodeQuery = {
      type: "local",
      context: {
        filePath: "src/services/userService.ts",
        startLine: 15,
        endLine: 30,
      },
      query: "What business requirements does this code implement?",
    };

    try {
      const response = await this.rooCodeIntegration.processQuery(query);
      console.log(`✅ Response Time: ${response.responseTime}ms`);
      console.log(`📈 Confidence: ${Math.round(response.confidence * 100)}%`);
      console.log(`🎯 Suggestions (${response.suggestions.length}):`);
      response.suggestions.forEach((suggestion, index) => {
        console.log(`   ${index + 1}. ${suggestion}`);
      });

      if (response.localContext) {
        console.log(
          `📋 Business Requirements: ${response.localContext.businessRequirements.length}`
        );
        console.log(
          `🔧 Implementation Status: ${response.localContext.storyContext.status}`
        );
      }

      return { success: true, response };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      console.log(`❌ Error: ${errorMessage}`);
      return { success: false, error: errorMessage };
    }
  }

  /**
   * Demo Scenario 3: Remote Delivery Patterns Query
   */
  private async demoRemoteDeliveryPatterns(): Promise<any> {
    const query: RooCodeQuery = {
      type: "remote",
      context: {
        technology: "TypeScript",
      },
      query: "What are the proven delivery patterns for TypeScript projects?",
    };

    try {
      const response = await this.rooCodeIntegration.processQuery(query);
      console.log(`✅ Response Time: ${response.responseTime}ms`);
      console.log(`📈 Confidence: ${Math.round(response.confidence * 100)}%`);
      console.log(`🎯 Suggestions (${response.suggestions.length}):`);
      response.suggestions.forEach((suggestion, index) => {
        console.log(`   ${index + 1}. ${suggestion}`);
      });

      if (response.remoteIntelligence) {
        console.log(
          `🏗️ Delivery Patterns: ${response.remoteIntelligence.deliveryPatterns.length}`
        );
        console.log(
          `📚 Knowledge Articles: ${response.remoteIntelligence.institutionalKnowledge.articles.length}`
        );
        console.log(
          `💡 Cross-Project Insights: ${response.remoteIntelligence.crossProjectInsights.length}`
        );
      }

      return { success: true, response };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      console.log(`❌ Error: ${errorMessage}`);
      return { success: false, error: errorMessage };
    }
  }

  /**
   * Demo Scenario 4: Remote Institutional Knowledge Query
   */
  private async demoRemoteInstitutionalKnowledge(): Promise<any> {
    const query: RooCodeQuery = {
      type: "remote",
      context: {
        domain: "enterprise-architecture",
      },
      query:
        "What institutional knowledge is available for enterprise architecture?",
    };

    try {
      const response = await this.rooCodeIntegration.processQuery(query);
      console.log(`✅ Response Time: ${response.responseTime}ms`);
      console.log(`📈 Confidence: ${Math.round(response.confidence * 100)}%`);
      console.log(`🎯 Suggestions (${response.suggestions.length}):`);
      response.suggestions.forEach((suggestion, index) => {
        console.log(`   ${index + 1}. ${suggestion}`);
      });

      if (response.remoteIntelligence) {
        const knowledge = response.remoteIntelligence.institutionalKnowledge;
        console.log(`📖 Domain: ${knowledge.domain}`);
        console.log(`✅ Best Practices: ${knowledge.bestPractices.length}`);
        console.log(`⚠️ Common Pitfalls: ${knowledge.commonPitfalls.length}`);
      }

      return { success: true, response };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      console.log(`❌ Error: ${errorMessage}`);
      return { success: false, error: errorMessage };
    }
  }

  /**
   * Demo Scenario 5: Hybrid Context Query
   */
  private async demoHybridContext(): Promise<any> {
    const query: RooCodeQuery = {
      type: "hybrid",
      context: {
        filePath: "src/components/PaymentProcessor.ts",
        startLine: 45,
        endLine: 75,
        technology: "TypeScript",
      },
      query:
        "How should I implement this payment processing feature considering both current sprint requirements and proven delivery patterns?",
    };

    try {
      const response = await this.rooCodeIntegration.processQuery(query);
      console.log(`✅ Response Time: ${response.responseTime}ms`);
      console.log(`📈 Confidence: ${Math.round(response.confidence * 100)}%`);
      console.log(`🎯 Suggestions (${response.suggestions.length}):`);
      response.suggestions.forEach((suggestion, index) => {
        console.log(`   ${index + 1}. ${suggestion}`);
      });

      if (response.combinedInsights) {
        console.log(
          `🔄 Combined Insights (${response.combinedInsights.length}):`
        );
        response.combinedInsights.forEach((insight, index) => {
          console.log(`   ${index + 1}. ${insight}`);
        });
      }

      console.log(`📊 Sources: ${response.sources.join(", ")}`);

      return { success: true, response };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      console.log(`❌ Error: ${errorMessage}`);
      return { success: false, error: errorMessage };
    }
  }

  /**
   * Demo Scenario 6: Concurrent Request Handling
   */
  private async demoConcurrentRequests(): Promise<any> {
    const queries: RooCodeQuery[] = [
      {
        type: "local",
        context: {
          filePath: "src/auth/authService.ts",
          startLine: 1,
          endLine: 20,
        },
        query: "Authentication service context",
      },
      {
        type: "remote",
        context: { technology: "Node.js" },
        query: "Node.js delivery patterns",
      },
      {
        type: "hybrid",
        context: {
          filePath: "src/api/userApi.ts",
          startLine: 10,
          endLine: 30,
          technology: "REST",
        },
        query: "User API implementation guidance",
      },
      {
        type: "local",
        context: {},
        query: "Current sprint status",
      },
      {
        type: "remote",
        context: { domain: "security" },
        query: "Security best practices",
      },
    ];

    try {
      const result = await this.rooCodeIntegration.testConcurrentRequests(
        queries
      );

      console.log(`✅ Total Time: ${result.totalTime}ms`);
      console.log(
        `📊 Average Response Time: ${Math.round(result.averageResponseTime)}ms`
      );
      console.log(`📈 Success Rate: ${Math.round(result.successRate * 100)}%`);
      console.log(`🔄 Concurrent Requests: ${queries.length}`);

      console.log(`📋 Results Summary:`);
      result.results.forEach((response, index) => {
        console.log(
          `   ${index + 1}. ${response.queryType} query: ${
            response.responseTime
          }ms (${Math.round(response.confidence * 100)}% confidence)`
        );
      });

      return { success: true, result };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      console.log(`❌ Error: ${errorMessage}`);
      return { success: false, error: errorMessage };
    }
  }

  /**
   * Demo Scenario 7: Error Handling and Fallback
   */
  private async demoErrorHandling(): Promise<any> {
    // Test with invalid parameters to trigger error handling
    const query: RooCodeQuery = {
      type: "local",
      context: {
        filePath: "", // Invalid empty path
        startLine: -1, // Invalid line number
        endLine: -1,
      },
      query: "Test error handling",
    };

    try {
      const response = await this.rooCodeIntegration.processQuery(query);
      console.log(`✅ Graceful Error Handling: ${response.responseTime}ms`);
      console.log(`📈 Confidence: ${Math.round(response.confidence * 100)}%`);
      console.log(`🛡️ Fallback Suggestions (${response.suggestions.length}):`);
      response.suggestions.forEach((suggestion, index) => {
        console.log(`   ${index + 1}. ${suggestion}`);
      });

      return {
        success: true,
        response,
        note: "Error handled gracefully with fallback",
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      console.log(`❌ Unexpected Error: ${errorMessage}`);
      return { success: false, error: errorMessage };
    }
  }

  /**
   * Generate demo summary
   */
  private generateSummary(scenarios: { [key: string]: any }): {
    totalScenarios: number;
    successfulScenarios: number;
    averageResponseTime: number;
    connectivityStatus: any;
  } {
    const scenarioKeys = Object.keys(scenarios).filter(
      (key) => key !== "connectivity"
    );
    const totalScenarios = scenarioKeys.length;

    let successfulScenarios = 0;
    let totalResponseTime = 0;
    let responseCount = 0;

    scenarioKeys.forEach((key) => {
      const scenario = scenarios[key];
      if (scenario.success) {
        successfulScenarios++;

        if (scenario.response?.responseTime) {
          totalResponseTime += scenario.response.responseTime;
          responseCount++;
        } else if (scenario.result?.averageResponseTime) {
          totalResponseTime += scenario.result.averageResponseTime;
          responseCount++;
        }
      }
    });

    const averageResponseTime =
      responseCount > 0 ? Math.round(totalResponseTime / responseCount) : 0;

    return {
      totalScenarios,
      successfulScenarios,
      averageResponseTime,
      connectivityStatus: scenarios.connectivity,
    };
  }

  /**
   * Export demo results for documentation
   */
  exportResults(): string {
    const results = Array.from(this.demoResults.entries());
    return JSON.stringify(results, null, 2);
  }

  /**
   * Create sample TypeScript files for demo
   */
  async createDemoFiles(): Promise<void> {
    // This would create sample files that demonstrate the context mapping
    // For now, we'll just log what files would be created
    console.log("📁 Demo files that would be created:");
    console.log(
      "   - src/services/userService.ts (User management with business requirements)"
    );
    console.log(
      "   - src/components/PaymentProcessor.ts (Payment processing with delivery patterns)"
    );
    console.log(
      "   - src/auth/authService.ts (Authentication with security patterns)"
    );
    console.log("   - src/api/userApi.ts (REST API with enterprise patterns)");
  }
}
