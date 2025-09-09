/**
 * Integration Tests for RooCode Hybrid MCP Architecture
 * Tests dual-context AI responses and concurrent request handling
 */

// Demo imports removed - tests disabled
// import {
//   RooCodeIntegration,
//   RooCodeQuery,
// } from "../../demo/rooCodeIntegration";
// import { DemoScenarios } from "../../demo/demoScenarios";

describe("RooCode Hybrid MCP Integration", () => {
  let rooCodeIntegration: RooCodeIntegration;
  let demoScenarios: DemoScenarios;

  beforeEach(() => {
    rooCodeIntegration = new RooCodeIntegration(3000);
    demoScenarios = new DemoScenarios(3000);
  });

  describe("Local Context Queries", () => {
    it("should process local sprint context query", async () => {
      const query: RooCodeQuery = {
        type: "local",
        context: {},
        query: "What's the current sprint context?",
      };

      const response = await rooCodeIntegration.processQuery(query);

      expect(response.queryType).toBe("local");
      expect(response.localContext).toBeDefined();
      expect(response.suggestions).toBeInstanceOf(Array);
      expect(response.suggestions.length).toBeGreaterThan(0);
      expect(response.confidence).toBeGreaterThan(0);
      expect(response.responseTime).toBeGreaterThan(0);
      expect(response.sources).toContain("Local MCP Server");
    });

    it("should process local code context query", async () => {
      const query: RooCodeQuery = {
        type: "local",
        context: {
          filePath: "src/services/userService.ts",
          startLine: 15,
          endLine: 30,
        },
        query: "What business requirements does this code implement?",
      };

      const response = await rooCodeIntegration.processQuery(query);

      expect(response.queryType).toBe("local");
      expect(response.localContext).toBeDefined();
      expect(response.localContext?.sprintDetails).toBeDefined();
      expect(response.localContext?.storyContext).toBeDefined();
      expect(response.localContext?.teamPatterns).toBeDefined();
      expect(response.suggestions.length).toBeGreaterThan(0);
    });

    it("should handle local context with fallback data", async () => {
      const query: RooCodeQuery = {
        type: "local",
        context: {
          filePath: "nonexistent/file.ts",
          startLine: 1,
          endLine: 10,
        },
        query: "Test fallback behavior",
      };

      const response = await rooCodeIntegration.processQuery(query);

      expect(response.queryType).toBe("local");
      expect(response.localContext).toBeDefined();
      expect(response.suggestions.length).toBeGreaterThan(0);
      // Should still provide meaningful suggestions even with fallback data
    });
  });

  describe("Remote Intelligence Queries", () => {
    it("should process remote delivery patterns query", async () => {
      const query: RooCodeQuery = {
        type: "remote",
        context: {
          technology: "TypeScript",
        },
        query: "What are the proven delivery patterns for TypeScript?",
      };

      const response = await rooCodeIntegration.processQuery(query);

      expect(response.queryType).toBe("remote");
      expect(response.remoteIntelligence).toBeDefined();
      expect(response.remoteIntelligence?.deliveryPatterns).toBeDefined();
      expect(response.remoteIntelligence?.institutionalKnowledge).toBeDefined();
      expect(response.suggestions.length).toBeGreaterThan(0);
    });

    it("should process remote institutional knowledge query", async () => {
      const query: RooCodeQuery = {
        type: "remote",
        context: {
          domain: "enterprise-architecture",
        },
        query: "What institutional knowledge is available?",
      };

      const response = await rooCodeIntegration.processQuery(query);

      expect(response.queryType).toBe("remote");
      expect(response.remoteIntelligence).toBeDefined();
      expect(response.remoteIntelligence?.institutionalKnowledge.domain).toBe(
        "enterprise-architecture"
      );
      expect(response.suggestions.length).toBeGreaterThan(0);
    });

    it("should handle remote queries without remote server configured", async () => {
      const query: RooCodeQuery = {
        type: "remote",
        context: {
          technology: "Python",
        },
        query: "Python delivery patterns",
      };

      const response = await rooCodeIntegration.processQuery(query);

      expect(response.queryType).toBe("remote");
      expect(response.remoteIntelligence).toBeDefined();
      expect(response.confidence).toBeLessThan(0.8); // Lower confidence for mock data
      expect(response.sources).toContain("Mock Delivery Patterns");
    });
  });

  describe("Hybrid Context Queries", () => {
    it("should process hybrid context query combining local and remote", async () => {
      const query: RooCodeQuery = {
        type: "hybrid",
        context: {
          filePath: "src/components/PaymentProcessor.ts",
          startLine: 45,
          endLine: 75,
          technology: "TypeScript",
        },
        query: "How should I implement this payment processing feature?",
      };

      const response = await rooCodeIntegration.processQuery(query);

      expect(response.queryType).toBe("hybrid");
      expect(response.localContext).toBeDefined();
      expect(response.remoteIntelligence).toBeDefined();
      expect(response.combinedInsights).toBeDefined();
      expect(response.combinedInsights?.length).toBeGreaterThan(0);
      expect(response.suggestions.length).toBeGreaterThan(0);
      expect(response.confidence).toBeGreaterThan(0.8); // High confidence for hybrid
      expect(response.sources).toContain("Hybrid Analysis");
    });

    it("should generate meaningful combined insights", async () => {
      const query: RooCodeQuery = {
        type: "hybrid",
        context: {
          filePath: "src/api/userApi.ts",
          startLine: 10,
          endLine: 30,
          technology: "REST",
        },
        query: "User API implementation guidance",
      };

      const response = await rooCodeIntegration.processQuery(query);

      expect(response.combinedInsights).toBeDefined();
      expect(response.combinedInsights?.length).toBeGreaterThan(0);

      // Check that insights combine both local and remote context
      const insightsText = response.combinedInsights?.join(" ") || "";
      expect(insightsText.length).toBeGreaterThan(0);
    });
  });

  describe("Concurrent Request Handling", () => {
    it("should handle multiple concurrent queries", async () => {
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
      ];

      const result = await rooCodeIntegration.testConcurrentRequests(queries);

      expect(result.results).toHaveLength(3);
      expect(result.totalTime).toBeGreaterThan(0);
      expect(result.averageResponseTime).toBeGreaterThan(0);
      expect(result.successRate).toBeGreaterThan(0);

      // All queries should be processed
      expect(result.results.every((r) => r.suggestions.length > 0)).toBe(true);
    });

    it("should maintain performance under concurrent load", async () => {
      const queries: RooCodeQuery[] = Array.from({ length: 5 }, (_, i) => ({
        type: "local" as const,
        context: { filePath: `src/service${i}.ts`, startLine: 1, endLine: 10 },
        query: `Service ${i} context`,
      }));

      const result = await rooCodeIntegration.testConcurrentRequests(queries);

      expect(result.successRate).toBeGreaterThan(0.8); // At least 80% success rate
      expect(result.averageResponseTime).toBeLessThan(2000); // Under 2 seconds average
    });
  });

  describe("Error Handling and Resilience", () => {
    it("should handle invalid query parameters gracefully", async () => {
      const query: RooCodeQuery = {
        type: "local",
        context: {
          filePath: "", // Invalid empty path
          startLine: -1, // Invalid line number
          endLine: -1,
        },
        query: "Test error handling",
      };

      const response = await rooCodeIntegration.processQuery(query);

      expect(response.queryType).toBe("local");
      expect(response.suggestions.length).toBeGreaterThan(0);
      expect(response.confidence).toBeGreaterThan(0);
      // Should provide fallback suggestions
    });

    it("should handle unknown query types", async () => {
      const query = {
        type: "unknown" as any,
        context: {},
        query: "Test unknown type",
      };

      const response = await rooCodeIntegration.processQuery(query);

      expect(response.suggestions).toContain(
        "Unable to process query due to connectivity issues"
      );
      expect(response.confidence).toBeLessThan(0.5);
    });
  });

  describe("Connectivity and Configuration", () => {
    it("should test connectivity to local and remote servers", async () => {
      const connectivity = await rooCodeIntegration.getConnectivityStatus();

      expect(connectivity).toHaveProperty("local");
      expect(connectivity).toHaveProperty("remote");
      expect(connectivity).toHaveProperty("remoteConfigured");
      expect(typeof connectivity.local).toBe("boolean");
      expect(typeof connectivity.remote).toBe("boolean");
      expect(typeof connectivity.remoteConfigured).toBe("boolean");
    });

    it("should configure remote server correctly", () => {
      const remoteUrl = "https://example.com/mcp";

      expect(() => {
        rooCodeIntegration.configureRemoteServer(remoteUrl);
      }).not.toThrow();

      // After configuration, remote should be marked as configured
      // (actual connectivity test would require a real server)
    });
  });

  describe("Demo Scenarios Integration", () => {
    it("should run all demo scenarios successfully", async () => {
      const results = await demoScenarios.runAllDemos();

      expect(results.scenarios).toBeDefined();
      expect(results.summary).toBeDefined();
      expect(results.summary.totalScenarios).toBeGreaterThan(0);
      expect(results.summary.successfulScenarios).toBeGreaterThan(0);
      expect(results.summary.averageResponseTime).toBeGreaterThan(0);
    });

    it("should handle demo scenarios with proper error recovery", async () => {
      // Configure with invalid remote URL to test error handling
      demoScenarios.configureRemoteServer("http://invalid-url:9999");

      const results = await demoScenarios.runAllDemos();

      // Should still complete scenarios even with remote server issues
      expect(results.summary.totalScenarios).toBeGreaterThan(0);
      expect(results.summary.successfulScenarios).toBeGreaterThan(0);
    });
  });

  describe("Response Quality and Format", () => {
    it("should provide well-formatted suggestions", async () => {
      const query: RooCodeQuery = {
        type: "hybrid",
        context: {
          filePath: "src/services/dataService.ts",
          startLine: 20,
          endLine: 40,
          technology: "TypeScript",
        },
        query: "Data service implementation best practices",
      };

      const response = await rooCodeIntegration.processQuery(query);

      expect(response.suggestions).toBeInstanceOf(Array);
      expect(response.suggestions.length).toBeGreaterThan(0);

      // Check suggestion quality
      response.suggestions.forEach((suggestion) => {
        expect(typeof suggestion).toBe("string");
        expect(suggestion.length).toBeGreaterThan(10); // Meaningful suggestions
        expect(suggestion).not.toMatch(/^undefined|null|error/i); // No error strings
      });
    });

    it("should include relevant sources in responses", async () => {
      const query: RooCodeQuery = {
        type: "hybrid",
        context: {
          filePath: "src/utils/helper.ts",
          startLine: 1,
          endLine: 15,
          technology: "TypeScript",
        },
        query: "Helper utility implementation",
      };

      const response = await rooCodeIntegration.processQuery(query);

      expect(response.sources).toBeInstanceOf(Array);
      expect(response.sources.length).toBeGreaterThan(0);
      expect(response.sources).toContain("Local MCP Server");
      expect(response.sources).toContain("Hybrid Analysis");
    });

    it("should provide appropriate confidence levels", async () => {
      const localQuery: RooCodeQuery = {
        type: "local",
        context: {},
        query: "Local context test",
      };

      const hybridQuery: RooCodeQuery = {
        type: "hybrid",
        context: {
          filePath: "test.ts",
          startLine: 1,
          endLine: 10,
          technology: "TypeScript",
        },
        query: "Hybrid context test",
      };

      const [localResponse, hybridResponse] = await Promise.all([
        rooCodeIntegration.processQuery(localQuery),
        rooCodeIntegration.processQuery(hybridQuery),
      ]);

      // Hybrid should have higher confidence than local-only
      expect(hybridResponse.confidence).toBeGreaterThan(
        localResponse.confidence
      );

      // Both should have reasonable confidence levels
      expect(localResponse.confidence).toBeGreaterThan(0.5);
      expect(hybridResponse.confidence).toBeGreaterThan(0.8);
    });
  });
});
