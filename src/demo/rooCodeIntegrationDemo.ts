/**
 * RooCode Integration Demo
 * Demonstrates hybrid MCP architecture with local sprint context and remote delivery patterns
 */

import { HybridMCPClient } from "../client/hybridMCPClient";
import { SimpleMCPServer } from "../server/SimpleMCPServer";
import { ContextManager } from "../server/ContextManager";
import { MockDataProvider } from "../mock/MockDataProvider";
import { CacheManager } from "../services/CacheManager";
import { TaskStatusManager } from "../services/TaskStatusManager";
import { MarkdownTaskParser } from "../services/MarkdownTaskParser";

export interface RooCodeQuery {
  type: "code_suggestion" | "context_analysis" | "delivery_guidance";
  filePath: string;
  codeSnippet: string;
  technology?: string;
  userIntent: string;
}

export interface RooCodeResponse {
  success: boolean;
  suggestion: string;
  localContext: {
    sprintAlignment: string;
    storyRelevance: string;
    teamPatterns: string[];
  };
  remoteIntelligence: {
    deliveryPatterns: string[];
    institutionalGuidance: string[];
    crossProjectLearnings: string[];
  };
  hybridInsights: string[];
  confidence: number;
  sources: string[];
}

export class RooCodeIntegrationDemo {
  private hybridClient: HybridMCPClient;
  private mcpServer: SimpleMCPServer | null = null;
  private isServerRunning: boolean = false;

  constructor() {
    this.hybridClient = new HybridMCPClient(3000, 10000); // 10s timeout for demo
  }

  /**
   * Initialize the demo environment
   */
  async initialize(): Promise<void> {
    console.log("🚀 Initializing RooCode Integration Demo...");

    // Start local MCP server
    await this.startLocalMCPServer();

    // Configure remote MCP server (using deployed Vercel endpoint)
    this.configureRemoteMCPServer();

    // Test connectivity
    await this.testConnectivity();

    console.log("✅ Demo environment initialized successfully!");
  }

  /**
   * Start local MCP server for sprint context
   */
  private async startLocalMCPServer(): Promise<void> {
    try {
      const mockDataProvider = new MockDataProvider();
      const contextManager = new ContextManager(mockDataProvider);
      const taskStatusManager = new TaskStatusManager(new MarkdownTaskParser());

      this.mcpServer = new SimpleMCPServer(
        3000,
        contextManager,
        taskStatusManager
      );
      await this.mcpServer.start();
      this.isServerRunning = true;

      console.log("📡 Local MCP server started on port 3000");
    } catch (error) {
      console.error("❌ Failed to start local MCP server:", error);
      throw error;
    }
  }

  /**
   * Configure remote MCP server connection
   */
  private configureRemoteMCPServer(): void {
    // Check VS Code configuration for remote server
    const vscode = require("vscode");
    const config = vscode.workspace.getConfiguration();

    const remoteUrl =
      (config.get("aidmVscodeExtension.remote.mcpServerUrl") as string) || "";
    const apiKey =
      (config.get("aidmVscodeExtension.remote.apiKey") as string) || "";
    const remoteEnabled =
      (config.get("aidmVscodeExtension.remote.enabled") as boolean) || false;

    if (remoteEnabled && remoteUrl) {
      this.hybridClient.configureRemoteServer(remoteUrl);
      console.log("🌐 Remote MCP server configured:", remoteUrl);
    } else {
      // Use default demo endpoint
      const defaultEndpoint =
        "https://aidm-vscode-extension-remote-mcp.vercel.app/mcp";
      this.hybridClient.configureRemoteServer(defaultEndpoint);
      console.log("🌐 Using default remote MCP server:", defaultEndpoint);
      console.log(
        "💡 Configure your own server in VS Code settings: enterpriseAiContext.remote.mcpServerUrl"
      );
    }
  }

  /**
   * Test connectivity to both servers
   */
  private async testConnectivity(): Promise<void> {
    console.log("🔍 Testing connectivity...");

    const connectivity = await this.hybridClient.testConnectivity();

    console.log(
      `📡 Local MCP: ${
        connectivity.local ? "✅ Connected" : "❌ Disconnected"
      } ${connectivity.localLatency ? `(${connectivity.localLatency}ms)` : ""}`
    );

    console.log(
      `🌐 Remote MCP: ${
        connectivity.remote ? "✅ Connected" : "❌ Disconnected"
      } ${
        connectivity.remoteLatency ? `(${connectivity.remoteLatency}ms)` : ""
      }`
    );

    if (!connectivity.local) {
      console.warn("⚠️  Local MCP server not responding - using fallback data");
    }

    if (!connectivity.remote) {
      console.warn(
        "⚠️  Remote MCP server not responding - using mock delivery patterns"
      );
    }
  }

  /**
   * Simulate RooCode asking for code suggestions with hybrid context
   */
  async simulateRooCodeQuery(query: RooCodeQuery): Promise<RooCodeResponse> {
    console.log(`\n🤖 RooCode Query: ${query.type}`);
    console.log(`📁 File: ${query.filePath}`);
    console.log(`💭 Intent: ${query.userIntent}`);

    const startTime = Date.now();

    try {
      // Get hybrid context (local + remote)
      const hybridContext = await this.hybridClient.getHybridContext(
        query.filePath,
        1,
        50,
        query.technology
      );

      const responseTime = Date.now() - startTime;

      // Generate RooCode response based on hybrid context
      const response = this.generateRooCodeResponse(
        query,
        hybridContext,
        responseTime
      );

      console.log(`⚡ Response generated in ${responseTime}ms`);
      this.logRooCodeResponse(response);

      return response;
    } catch (error) {
      console.error("❌ Failed to process RooCode query:", error);
      return this.generateFallbackResponse(query);
    }
  }

  /**
   * Generate RooCode response based on hybrid context
   */
  private generateRooCodeResponse(
    query: RooCodeQuery,
    hybridContext: any,
    responseTime: number
  ): RooCodeResponse {
    const { local, remote, combinedInsights } = hybridContext;

    // Generate code suggestion based on context
    let suggestion = "";
    switch (query.type) {
      case "code_suggestion":
        suggestion = this.generateCodeSuggestion(query, local, remote);
        break;
      case "context_analysis":
        suggestion = this.generateContextAnalysis(query, local, remote);
        break;
      case "delivery_guidance":
        suggestion = this.generateDeliveryGuidance(query, local, remote);
        break;
    }

    return {
      success: true,
      suggestion,
      localContext: {
        sprintAlignment: `Aligns with sprint "${local.sprintDetails.name}" - ${local.storyContext.title}`,
        storyRelevance: `Supports story: ${local.storyContext.description}`,
        teamPatterns: local.teamPatterns.map((p: any) => p.name),
      },
      remoteIntelligence: {
        deliveryPatterns: remote.deliveryPatterns.map(
          (p: any) =>
            `${p.name} (${Math.round(p.successRate * 100)}% success rate)`
        ),
        institutionalGuidance: remote.institutionalKnowledge.bestPractices,
        crossProjectLearnings: remote.crossProjectInsights.map(
          (i: any) => i.insight
        ),
      },
      hybridInsights: combinedInsights,
      confidence: this.calculateConfidence(local, remote, responseTime),
      sources: [
        "Local Sprint Context",
        "Remote Delivery Intelligence",
        "Team Patterns",
      ],
    };
  }

  /**
   * Generate code suggestion based on hybrid context
   */
  private generateCodeSuggestion(
    query: RooCodeQuery,
    local: any,
    remote: any
  ): string {
    const storyContext = local.storyContext.title;
    const deliveryPattern =
      remote.deliveryPatterns[0]?.name || "Standard Pattern";

    return `Based on your current story "${storyContext}" and proven delivery pattern "${deliveryPattern}", here's my suggestion:

\`\`\`typescript
${query.codeSnippet}

// Enhanced with sprint context and delivery patterns
// Story: ${local.storyContext.title}
// Pattern: ${deliveryPattern}
// Team Standard: ${local.teamPatterns[0]?.name || "TypeScript Best Practices"}
\`\`\`

This implementation follows your team's coding patterns while incorporating proven delivery methodologies from similar projects.`;
  }

  /**
   * Generate context analysis based on hybrid context
   */
  private generateContextAnalysis(
    query: RooCodeQuery,
    local: any,
    remote: any
  ): string {
    return `Context Analysis for ${query.filePath}:

**Sprint Context:**
- Current Story: ${local.storyContext.title}
- Business Value: ${local.storyContext.businessValue}
- Sprint Progress: ${local.sprintDetails.currentStories.length} active stories

**Delivery Intelligence:**
- Applicable Patterns: ${remote.deliveryPatterns.length} proven patterns found
- Success Rate: ${Math.round(
      (remote.deliveryPatterns[0]?.successRate || 0.8) * 100
    )}%
- Cross-Project Insights: ${
      remote.crossProjectInsights.length
    } relevant learnings

**Recommendations:**
${remote.institutionalKnowledge.bestPractices
  .map((practice: string) => `- ${practice}`)
  .join("\n")}

This analysis combines your immediate sprint needs with institutional knowledge from successful deliveries.`;
  }

  /**
   * Generate delivery guidance based on hybrid context
   */
  private generateDeliveryGuidance(
    query: RooCodeQuery,
    local: any,
    remote: any
  ): string {
    const pattern = remote.deliveryPatterns[0];
    const insight = remote.crossProjectInsights[0];

    return `Delivery Guidance for ${query.technology || "your technology"}:

**Current Sprint Alignment:**
Your story "${local.storyContext.title}" is ${
      local.storyContext.priority
    } priority and should be delivered using proven patterns.

**Recommended Delivery Pattern:**
${pattern?.name || "Standard Enterprise Pattern"}
- Success Rate: ${Math.round((pattern?.successRate || 0.8) * 100)}%
- Method One Alignment: ${pattern?.methodOneAlignment || "High"}

**Cross-Project Learning:**
${
  insight?.insight ||
  "Teams following established patterns see improved delivery velocity"
}

**Next Steps:**
1. Apply team coding standards: ${local.teamPatterns
      .map((p: any) => p.name)
      .join(", ")}
2. Follow delivery pattern: ${pattern?.name || "Standard Pattern"}
3. Consider institutional guidance: ${
      remote.institutionalKnowledge.bestPractices[0] || "Follow best practices"
    }

This guidance combines your immediate sprint context with proven delivery intelligence from across the organization.`;
  }

  /**
   * Calculate confidence score based on available context
   */
  private calculateConfidence(
    local: any,
    remote: any,
    responseTime: number
  ): number {
    let confidence = 0.5; // Base confidence

    // Local context quality
    if (local.businessRequirements.length > 0) confidence += 0.2;
    if (local.teamPatterns.length > 0) confidence += 0.1;
    if (local.storyContext.acceptanceCriteria.length > 0) confidence += 0.1;

    // Remote intelligence quality
    if (remote.deliveryPatterns.length > 0) confidence += 0.1;
    if (remote.crossProjectInsights.length > 0) confidence += 0.05;
    if (remote.institutionalKnowledge.bestPractices.length > 0)
      confidence += 0.05;

    // Response time penalty
    if (responseTime > 2000) confidence -= 0.1;
    if (responseTime > 5000) confidence -= 0.2;

    return Math.min(Math.max(confidence, 0.1), 1.0);
  }

  /**
   * Generate fallback response when hybrid context fails
   */
  private generateFallbackResponse(query: RooCodeQuery): RooCodeResponse {
    return {
      success: false,
      suggestion: `I'm working in offline mode, but I can still help with ${query.type}. Here's a basic suggestion based on general best practices:

\`\`\`typescript
${query.codeSnippet}

// Following general TypeScript best practices
// Consider adding proper error handling and type safety
\`\`\`

For better suggestions, ensure both local and remote MCP servers are available.`,
      localContext: {
        sprintAlignment: "Offline mode - no sprint context available",
        storyRelevance: "Offline mode - no story context available",
        teamPatterns: ["General TypeScript patterns"],
      },
      remoteIntelligence: {
        deliveryPatterns: ["Standard offline patterns"],
        institutionalGuidance: ["Follow TypeScript best practices"],
        crossProjectLearnings: ["Offline mode - limited insights"],
      },
      hybridInsights: ["Working in offline mode with limited context"],
      confidence: 0.3,
      sources: ["Offline fallback data"],
    };
  }

  /**
   * Log RooCode response in a readable format
   */
  private logRooCodeResponse(response: RooCodeResponse): void {
    console.log("\n📋 RooCode Response:");
    console.log("=".repeat(50));

    console.log("\n💡 Suggestion:");
    console.log(response.suggestion);

    console.log("\n📊 Local Context:");
    console.log(`  Sprint: ${response.localContext.sprintAlignment}`);
    console.log(`  Story: ${response.localContext.storyRelevance}`);
    console.log(`  Patterns: ${response.localContext.teamPatterns.join(", ")}`);

    console.log("\n🌐 Remote Intelligence:");
    console.log(
      `  Delivery Patterns: ${response.remoteIntelligence.deliveryPatterns.join(
        ", "
      )}`
    );
    console.log(
      `  Guidance: ${response.remoteIntelligence.institutionalGuidance.join(
        ", "
      )}`
    );
    console.log(
      `  Learnings: ${response.remoteIntelligence.crossProjectLearnings.join(
        ", "
      )}`
    );

    console.log("\n🔗 Hybrid Insights:");
    response.hybridInsights.forEach((insight) => console.log(`  - ${insight}`));

    console.log(`\n📈 Confidence: ${Math.round(response.confidence * 100)}%`);
    console.log(`📚 Sources: ${response.sources.join(", ")}`);
  }

  /**
   * Run comprehensive demo scenarios
   */
  async runDemoScenarios(): Promise<void> {
    console.log("\n🎬 Running RooCode Integration Demo Scenarios...");

    const scenarios: RooCodeQuery[] = [
      {
        type: "code_suggestion",
        filePath: "src/services/PaymentProcessor.ts",
        codeSnippet: `export class PaymentProcessor {
  async processPayment(amount: number, method: string): Promise<PaymentResult> {
    // Need implementation
  }
}`,
        technology: "typescript",
        userIntent:
          "Implement payment processing with error handling and validation",
      },
      {
        type: "context_analysis",
        filePath: "src/models/User.ts",
        codeSnippet: `interface User {
  id: string;
  email: string;
  profile: UserProfile;
}`,
        technology: "typescript",
        userIntent:
          "Understand the business context and requirements for this User model",
      },
      {
        type: "delivery_guidance",
        filePath: "src/components/Dashboard.tsx",
        codeSnippet: `const Dashboard = () => {
  return <div>Dashboard Component</div>;
};`,
        technology: "react",
        userIntent:
          "Get guidance on delivering this dashboard component following enterprise patterns",
      },
    ];

    for (let i = 0; i < scenarios.length; i++) {
      console.log(`\n--- Scenario ${i + 1}/${scenarios.length} ---`);
      await this.simulateRooCodeQuery(scenarios[i]);

      // Add delay between scenarios for readability
      if (i < scenarios.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, 2000));
      }
    }
  }

  /**
   * Test concurrent AI assistant requests
   */
  async testConcurrentRequests(): Promise<void> {
    console.log("\n🔄 Testing Concurrent AI Assistant Requests...");

    const concurrentQueries: RooCodeQuery[] = [
      {
        type: "code_suggestion",
        filePath: "src/services/AuthService.ts",
        codeSnippet: "class AuthService {}",
        technology: "typescript",
        userIntent: "Authentication implementation",
      },
      {
        type: "context_analysis",
        filePath: "src/models/Order.ts",
        codeSnippet: "interface Order {}",
        technology: "typescript",
        userIntent: "Order model analysis",
      },
      {
        type: "delivery_guidance",
        filePath: "src/api/UserAPI.ts",
        codeSnippet: "class UserAPI {}",
        technology: "typescript",
        userIntent: "API delivery guidance",
      },
    ];

    const startTime = Date.now();

    try {
      // Execute all queries concurrently
      const responses = await Promise.all(
        concurrentQueries.map((query) => this.simulateRooCodeQuery(query))
      );

      const totalTime = Date.now() - startTime;
      const avgConfidence =
        responses.reduce((sum, r) => sum + r.confidence, 0) / responses.length;

      console.log(`\n📊 Concurrent Request Results:`);
      console.log(`  Total Time: ${totalTime}ms`);
      console.log(`  Requests: ${responses.length}`);
      console.log(`  Average Confidence: ${Math.round(avgConfidence * 100)}%`);
      console.log(
        `  All Successful: ${
          responses.every((r) => r.confidence > 0.5) ? "✅" : "❌"
        }`
      );
    } catch (error) {
      console.error("❌ Concurrent request test failed:", error);
    }
  }

  /**
   * Document hybrid query patterns and response formats
   */
  documentHybridPatterns(): void {
    console.log("\n📚 Hybrid Query Patterns Documentation:");
    console.log("=".repeat(60));

    console.log(`
**Local MCP Server Queries:**
- get_sprint_context: Current sprint and story details
- get_business_context: File-specific business requirements
- get_team_patterns: Coding standards and practices

**Remote MCP Server Queries:**
- get_delivery_patterns: Proven delivery methodologies
- query_knowledge_base: Institutional knowledge and best practices
- get_stakeholder_mapping: Enterprise stakeholder relationships

**Hybrid Response Format:**
{
  suggestion: "AI-generated code or guidance",
  localContext: {
    sprintAlignment: "How this relates to current sprint",
    storyRelevance: "Connection to active user stories",
    teamPatterns: ["Applicable team coding patterns"]
  },
  remoteIntelligence: {
    deliveryPatterns: ["Proven patterns from successful projects"],
    institutionalGuidance: ["Best practices from knowledge base"],
    crossProjectLearnings: ["Insights from similar implementations"]
  },
  hybridInsights: ["Combined insights from local + remote context"],
  confidence: 0.85, // Confidence score based on available context
  sources: ["Data sources used for the response"]
}

**Performance Characteristics:**
- Local queries: <200ms (cached sprint context)
- Remote queries: <2s (delivery intelligence)
- Hybrid queries: <800ms (concurrent execution)
- Concurrent handling: 3+ simultaneous AI assistants

**Fallback Behavior:**
- Local unavailable: Use cached/mock sprint data
- Remote unavailable: Use general best practices
- Both unavailable: Offline mode with basic guidance
`);
  }

  /**
   * Cleanup demo resources
   */
  async cleanup(): Promise<void> {
    console.log("\n🧹 Cleaning up demo resources...");

    if (this.mcpServer && this.isServerRunning) {
      await this.mcpServer.stop();
      this.isServerRunning = false;
      console.log("📡 Local MCP server stopped");
    }

    console.log("✅ Demo cleanup completed");
  }
}

/**
 * Main demo execution function
 */
export async function runRooCodeIntegrationDemo(): Promise<void> {
  const demo = new RooCodeIntegrationDemo();

  try {
    // Initialize demo environment
    await demo.initialize();

    // Run demo scenarios
    await demo.runDemoScenarios();

    // Test concurrent requests
    await demo.testConcurrentRequests();

    // Document patterns
    demo.documentHybridPatterns();

    console.log("\n🎉 RooCode Integration Demo completed successfully!");
  } catch (error) {
    console.error("❌ Demo failed:", error);
  } finally {
    // Cleanup
    await demo.cleanup();
  }
}

// Export for use in other demo scripts
