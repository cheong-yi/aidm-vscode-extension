/**
 * RooCode Hybrid MCP Integration Tests
 * Tests the hybrid architecture with local and remote MCP servers
 */

import { HybridMCPClient } from "../../client/hybridMCPClient";
import { RooCodeIntegrationDemo } from "../../demo/rooCodeIntegrationDemo";
import { SimpleMCPServer } from "../../server/SimpleMCPServer";
import { ContextManager } from "../../server/ContextManager";
import { MockDataProvider } from "../../mock/MockDataProvider";
import { CacheManager } from "../../services/CacheManager";
import { getNextAvailablePort } from "../utils/testPorts";

describe("RooCode Hybrid MCP Integration", () => {
  let hybridClient: HybridMCPClient;
  let mcpServer: SimpleMCPServer;
  let demo: RooCodeIntegrationDemo;
  let isServerRunning = false;

  beforeAll(async () => {
    // Start local MCP server for testing
    const mockDataProvider = new MockDataProvider();
    const contextManager = new ContextManager(mockDataProvider);

    const testPort = getNextAvailablePort();
    mcpServer = new SimpleMCPServer(testPort, contextManager);
    await mcpServer.start();
    isServerRunning = true;

    // Initialize hybrid client
    hybridClient = new HybridMCPClient(3001, 5000);

    // Configure remote server (using deployed endpoint)
    hybridClient.configureRemoteServer(
      "https://aidm-vscode-extension-remote-mcp.vercel.app/mcp"
    );

    // Initialize demo
    demo = new RooCodeIntegrationDemo();
  }, 30000);

  afterAll(async () => {
    // Stop MCP server first
    if (isServerRunning && mcpServer) {
      await mcpServer.stop();
      isServerRunning = false;
    }

    // Clean up demo resources
    if (demo) {
      await demo.cleanup();
    }

    // Clean up any remaining timers and async operations
    await new Promise((resolve) => setTimeout(resolve, 100));
  }, 10000);

  describe("Hybrid Client Connectivity", () => {
    test("should connect to local MCP server", async () => {
      const connectivity = await hybridClient.testConnectivity();

      expect(connectivity.local).toBe(true);
      expect(connectivity.localLatency).toBeDefined();
      expect(connectivity.localLatency!).toBeLessThan(1000);
    });

    test("should attempt connection to remote MCP server", async () => {
      const connectivity = await hybridClient.testConnectivity();

      // Remote might not be available in test environment
      // Just verify the attempt is made
      expect(typeof connectivity.remote).toBe("boolean");

      if (connectivity.remote) {
        expect(connectivity.remoteLatency).toBeDefined();
        expect(connectivity.remoteLatency!).toBeLessThan(5000);
      }
    });
  });

  describe("Local Context Retrieval", () => {
    test("should get current sprint context", async () => {
      const sprintContext = await hybridClient.getCurrentSprintContext();

      expect(sprintContext).toBeDefined();
      expect(sprintContext.sprintDetails).toBeDefined();
      expect(sprintContext.storyContext).toBeDefined();
      expect(sprintContext.teamPatterns).toBeDefined();
      expect(sprintContext.businessRequirements).toBeDefined();

      expect(sprintContext.sprintDetails.id).toBeTruthy();
      expect(sprintContext.sprintDetails.name).toBeTruthy();
      expect(sprintContext.storyContext.title).toBeTruthy();
      expect(Array.isArray(sprintContext.teamPatterns)).toBe(true);
    });

    test("should get project context for specific file", async () => {
      const projectContext = await hybridClient.getProjectContext(
        "src/services/PaymentProcessor.ts",
        1,
        50
      );

      expect(projectContext).toBeDefined();
      expect(projectContext.sprintDetails).toBeDefined();
      expect(projectContext.storyContext).toBeDefined();
      expect(projectContext.teamPatterns.length).toBeGreaterThan(0);
    });
  });

  describe("Remote Intelligence Retrieval", () => {
    test("should get delivery patterns (with fallback)", async () => {
      const deliveryPatterns = await hybridClient.getAccentureDeliveryPatterns(
        "typescript"
      );

      expect(deliveryPatterns).toBeDefined();
      expect(deliveryPatterns.deliveryPatterns).toBeDefined();
      expect(deliveryPatterns.institutionalKnowledge).toBeDefined();
      expect(deliveryPatterns.crossProjectInsights).toBeDefined();
      expect(deliveryPatterns.stakeholderMapping).toBeDefined();

      expect(Array.isArray(deliveryPatterns.deliveryPatterns)).toBe(true);
      expect(deliveryPatterns.deliveryPatterns.length).toBeGreaterThan(0);
    });

    test("should query institutional knowledge (with fallback)", async () => {
      const knowledge = await hybridClient.queryInstitutionalKnowledge(
        "web-development"
      );

      expect(knowledge).toBeDefined();
      expect(knowledge.institutionalKnowledge).toBeDefined();
      expect(knowledge.institutionalKnowledge.domain).toBeTruthy();
      expect(
        Array.isArray(knowledge.institutionalKnowledge.bestPractices)
      ).toBe(true);
    });
  });

  describe("Hybrid Context Integration", () => {
    test("should combine local and remote context", async () => {
      const hybridContext = await hybridClient.getHybridContext(
        "src/models/User.ts",
        1,
        30,
        "typescript"
      );

      expect(hybridContext).toBeDefined();
      expect(hybridContext.local).toBeDefined();
      expect(hybridContext.remote).toBeDefined();
      expect(hybridContext.combinedInsights).toBeDefined();

      expect(Array.isArray(hybridContext.combinedInsights)).toBe(true);
      expect(hybridContext.combinedInsights.length).toBeGreaterThan(0);

      // Verify local context structure
      expect(hybridContext.local.sprintDetails).toBeDefined();
      expect(hybridContext.local.storyContext).toBeDefined();

      // Verify remote context structure
      expect(hybridContext.remote.deliveryPatterns).toBeDefined();
      expect(hybridContext.remote.institutionalKnowledge).toBeDefined();
    });

    test("should generate meaningful combined insights", async () => {
      const hybridContext = await hybridClient.getHybridContext(
        "src/components/Dashboard.tsx",
        1,
        100,
        "react"
      );

      expect(hybridContext.combinedInsights.length).toBeGreaterThan(0);

      // Check that insights reference both local and remote context
      const insightsText = hybridContext.combinedInsights.join(" ");
      expect(insightsText.toLowerCase()).toMatch(
        /(sprint|story|pattern|practice)/
      );
    });
  });

  describe("RooCode Query Simulation", () => {
    test("should handle code suggestion query", async () => {
      const query = {
        type: "code_suggestion" as const,
        filePath: "src/services/AuthService.ts",
        codeSnippet: `export class AuthService {
  async authenticate(credentials: LoginCredentials): Promise<AuthResult> {
    // Implementation needed
  }
}`,
        technology: "typescript",
        userIntent:
          "Implement secure authentication with proper error handling",
      };

      const response = await demo.simulateRooCodeQuery(query);

      expect(response).toBeDefined();
      expect(response.suggestion).toBeTruthy();
      expect(response.localContext).toBeDefined();
      expect(response.remoteIntelligence).toBeDefined();
      expect(response.hybridInsights).toBeDefined();
      expect(response.confidence).toBeGreaterThan(0);
      expect(response.confidence).toBeLessThanOrEqual(1);
      expect(Array.isArray(response.sources)).toBe(true);

      // Verify local context
      expect(response.localContext.sprintAlignment).toBeTruthy();
      expect(response.localContext.storyRelevance).toBeTruthy();
      expect(Array.isArray(response.localContext.teamPatterns)).toBe(true);

      // Verify remote intelligence
      expect(Array.isArray(response.remoteIntelligence.deliveryPatterns)).toBe(
        true
      );
      expect(
        Array.isArray(response.remoteIntelligence.institutionalGuidance)
      ).toBe(true);
      expect(
        Array.isArray(response.remoteIntelligence.crossProjectLearnings)
      ).toBe(true);
    });

    test("should handle context analysis query", async () => {
      const query = {
        type: "context_analysis" as const,
        filePath: "src/models/Order.ts",
        codeSnippet: `interface Order {
  id: string;
  customerId: string;
  items: OrderItem[];
  total: number;
  status: OrderStatus;
}`,
        technology: "typescript",
        userIntent:
          "Understand business requirements and relationships for Order model",
      };

      const response = await demo.simulateRooCodeQuery(query);

      expect(response).toBeDefined();
      expect(response.suggestion).toContain("Context Analysis");
      expect(response.suggestion).toContain("Sprint Context");
      expect(response.suggestion).toContain("Delivery Intelligence");
      expect(response.confidence).toBeGreaterThan(0.3);
    });

    test("should handle delivery guidance query", async () => {
      const query = {
        type: "delivery_guidance" as const,
        filePath: "src/api/PaymentAPI.ts",
        codeSnippet: `export class PaymentAPI {
  async processPayment(request: PaymentRequest): Promise<PaymentResponse> {
    // Implementation needed
  }
}`,
        technology: "typescript",
        userIntent:
          "Get delivery guidance for payment API following enterprise patterns",
      };

      const response = await demo.simulateRooCodeQuery(query);

      expect(response).toBeDefined();
      expect(response.suggestion).toContain("Delivery Guidance");
      expect(response.suggestion).toContain("Sprint Alignment");
      expect(response.suggestion).toContain("Delivery Pattern");
      expect(response.confidence).toBeGreaterThan(0.3);
    });
  });

  describe("Concurrent Request Handling", () => {
    test("should handle multiple concurrent queries", async () => {
      const queries = [
        {
          type: "code_suggestion" as const,
          filePath: "src/services/UserService.ts",
          codeSnippet: "class UserService {}",
          technology: "typescript",
          userIntent: "User service implementation",
        },
        {
          type: "context_analysis" as const,
          filePath: "src/models/Product.ts",
          codeSnippet: "interface Product {}",
          technology: "typescript",
          userIntent: "Product model analysis",
        },
        {
          type: "delivery_guidance" as const,
          filePath: "src/controllers/OrderController.ts",
          codeSnippet: "class OrderController {}",
          technology: "typescript",
          userIntent: "Order controller guidance",
        },
      ];

      const startTime = Date.now();
      const responses = await Promise.all(
        queries.map((query) => demo.simulateRooCodeQuery(query))
      );
      const totalTime = Date.now() - startTime;

      expect(responses).toHaveLength(3);
      expect(totalTime).toBeLessThan(10000); // Should complete within 10 seconds

      // All responses should be valid
      responses.forEach((response) => {
        expect(response).toBeDefined();
        expect(response.suggestion).toBeTruthy();
        expect(response.confidence).toBeGreaterThan(0);
        expect(response.sources.length).toBeGreaterThan(0);
      });

      // Calculate average confidence
      const avgConfidence =
        responses.reduce((sum, r) => sum + r.confidence, 0) / responses.length;
      expect(avgConfidence).toBeGreaterThan(0.3);
    });
  });

  describe("Error Handling and Fallbacks", () => {
    test("should provide fallback response when servers unavailable", async () => {
      // Create client with invalid endpoints
      const fallbackClient = new HybridMCPClient(9999, 1000); // Non-existent port
      fallbackClient.configureRemoteServer("http://invalid-endpoint.com");

      const sprintContext = await fallbackClient.getCurrentSprintContext();

      expect(sprintContext).toBeDefined();
      expect(sprintContext.sprintDetails.id).toContain("fallback");
      expect(sprintContext.storyContext.title).toContain("Local Development");
      expect(sprintContext.teamPatterns.length).toBeGreaterThan(0);
    });

    test("should handle invalid query gracefully", async () => {
      const invalidQuery = {
        type: "invalid_type" as any,
        filePath: "",
        codeSnippet: "",
        userIntent: "",
      };

      const response = await demo.simulateRooCodeQuery(invalidQuery);

      expect(response).toBeDefined();
      expect(response.confidence).toBeGreaterThan(0); // Should still provide some confidence
      expect(typeof response.suggestion).toBe("string"); // Should still provide some response
    });
  });

  describe("Performance Characteristics", () => {
    test("local context queries should be fast", async () => {
      const startTime = Date.now();
      await hybridClient.getCurrentSprintContext();
      const responseTime = Date.now() - startTime;

      expect(responseTime).toBeLessThan(1000); // Should be under 1 second
    });

    test("hybrid context queries should complete within reasonable time", async () => {
      const startTime = Date.now();
      await hybridClient.getHybridContext("src/test.ts", 1, 10, "typescript");
      const responseTime = Date.now() - startTime;

      expect(responseTime).toBeLessThan(5000); // Should be under 5 seconds
    });
  });

  describe("Response Format Validation", () => {
    test("should return properly structured RooCode response", async () => {
      const query = {
        type: "code_suggestion" as const,
        filePath: "src/utils/Helper.ts",
        codeSnippet: "export class Helper {}",
        technology: "typescript",
        userIntent: "Helper class implementation",
      };

      const response = await demo.simulateRooCodeQuery(query);

      // Validate response structure
      expect(response).toMatchObject({
        suggestion: expect.any(String),
        localContext: {
          sprintAlignment: expect.any(String),
          storyRelevance: expect.any(String),
          teamPatterns: expect.any(Array),
        },
        remoteIntelligence: {
          deliveryPatterns: expect.any(Array),
          institutionalGuidance: expect.any(Array),
          crossProjectLearnings: expect.any(Array),
        },
        hybridInsights: expect.any(Array),
        confidence: expect.any(Number),
        sources: expect.any(Array),
      });

      // Validate confidence range
      expect(response.confidence).toBeGreaterThanOrEqual(0);
      expect(response.confidence).toBeLessThanOrEqual(1);

      // Validate arrays are not empty
      expect(response.localContext.teamPatterns.length).toBeGreaterThan(0);
      expect(response.sources.length).toBeGreaterThan(0);
    });
  });
});
