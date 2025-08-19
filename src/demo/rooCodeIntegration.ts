/**
 * RooCode Integration Demo
 * Demonstrates hybrid MCP architecture with dual-context AI responses
 */

import {
  HybridMCPClient,
  LocalContext,
  RemoteIntelligence,
} from "../client/hybridMCPClient";

export interface RooCodeQuery {
  type: "local" | "remote" | "hybrid";
  context: {
    filePath?: string;
    startLine?: number;
    endLine?: number;
    technology?: string;
    domain?: string;
  };
  query: string;
}

export interface RooCodeResponse {
  queryType: string;
  localContext?: LocalContext;
  remoteIntelligence?: RemoteIntelligence;
  combinedInsights?: string[];
  suggestions: string[];
  confidence: number;
  responseTime: number;
  sources: string[];
}

export class RooCodeIntegration {
  private hybridClient: HybridMCPClient;
  private isRemoteConfigured: boolean = false;

  constructor(localPort: number = 3000) {
    this.hybridClient = new HybridMCPClient(localPort);
  }

  /**
   * Configure remote MCP server for delivery patterns
   */
  configureRemoteServer(remoteUrl: string): void {
    this.hybridClient.configureRemoteServer(remoteUrl);
    this.isRemoteConfigured = true;
    console.log(`RooCode configured with remote MCP server: ${remoteUrl}`);
  }

  /**
   * Process RooCode query with appropriate context
   */
  async processQuery(query: RooCodeQuery): Promise<RooCodeResponse> {
    const startTime = Date.now();

    try {
      switch (query.type) {
        case "local":
          return await this.processLocalQuery(query, startTime);
        case "remote":
          return await this.processRemoteQuery(query, startTime);
        case "hybrid":
          return await this.processHybridQuery(query, startTime);
        default:
          throw new Error(`Unknown query type: ${query.type}`);
      }
    } catch (error) {
      console.error("RooCode query processing error:", error);
      return this.createErrorResponse(query, startTime, error);
    }
  }

  /**
   * Process local context query (sprint details, story context, team patterns)
   */
  private async processLocalQuery(
    query: RooCodeQuery,
    startTime: number
  ): Promise<RooCodeResponse> {
    let localContext: LocalContext;

    if (
      query.context.filePath &&
      query.context.startLine &&
      query.context.endLine
    ) {
      // Get project context for specific code location
      localContext = await this.hybridClient.getProjectContext(
        query.context.filePath,
        query.context.startLine,
        query.context.endLine
      );
    } else {
      // Get current sprint context
      localContext = await this.hybridClient.getCurrentSprintContext();
    }

    const suggestions = this.generateLocalSuggestions(
      localContext,
      query.query
    );

    return {
      queryType: "local",
      localContext,
      suggestions,
      confidence: 0.85,
      responseTime: Date.now() - startTime,
      sources: ["Local MCP Server", "Sprint Context", "Team Patterns"],
    };
  }

  /**
   * Process remote intelligence query (delivery patterns, institutional knowledge)
   */
  private async processRemoteQuery(
    query: RooCodeQuery,
    startTime: number
  ): Promise<RooCodeResponse> {
    let remoteIntelligence: RemoteIntelligence;

    if (query.context.technology) {
      // Get delivery patterns for specific technology
      remoteIntelligence = await this.hybridClient.getAccentureDeliveryPatterns(
        query.context.technology
      );
    } else if (query.context.domain) {
      // Query institutional knowledge for domain
      remoteIntelligence = await this.hybridClient.queryInstitutionalKnowledge(
        query.context.domain
      );
    } else {
      // Default to general delivery patterns
      remoteIntelligence = await this.hybridClient.getAccentureDeliveryPatterns(
        "general"
      );
    }

    const suggestions = this.generateRemoteSuggestions(
      remoteIntelligence,
      query.query
    );

    return {
      queryType: "remote",
      remoteIntelligence,
      suggestions,
      confidence: this.isRemoteConfigured ? 0.75 : 0.6, // Lower confidence for mock data
      responseTime: Date.now() - startTime,
      sources: this.isRemoteConfigured
        ? [
            "Remote MCP Server",
            "Accenture Delivery Intelligence",
            "Institutional Knowledge",
          ]
        : ["Mock Delivery Patterns", "Simulated Intelligence"],
    };
  }

  /**
   * Process hybrid query combining local and remote context
   */
  private async processHybridQuery(
    query: RooCodeQuery,
    startTime: number
  ): Promise<RooCodeResponse> {
    const hybridContext = await this.hybridClient.getHybridContext(
      query.context.filePath || "unknown.ts",
      query.context.startLine || 1,
      query.context.endLine || 10,
      query.context.technology
    );

    const suggestions = this.generateHybridSuggestions(
      hybridContext.local,
      hybridContext.remote,
      hybridContext.combinedInsights,
      query.query
    );

    return {
      queryType: "hybrid",
      localContext: hybridContext.local,
      remoteIntelligence: hybridContext.remote,
      combinedInsights: hybridContext.combinedInsights,
      suggestions,
      confidence: 0.9, // Highest confidence with both contexts
      responseTime: Date.now() - startTime,
      sources: [
        "Local MCP Server",
        "Sprint Context",
        this.isRemoteConfigured
          ? "Remote MCP Server"
          : "Mock Remote Intelligence",
        "Hybrid Analysis",
      ],
    };
  }

  /**
   * Generate suggestions based on local context
   */
  private generateLocalSuggestions(
    localContext: LocalContext,
    query: string
  ): string[] {
    const suggestions: string[] = [];

    // Sprint-based suggestions
    if (localContext.sprintDetails) {
      suggestions.push(
        `Consider sprint "${localContext.sprintDetails.name}" timeline when implementing this feature`
      );
      if (localContext.sprintDetails.currentStories.length > 0) {
        suggestions.push(
          `This relates to ${localContext.sprintDetails.currentStories.length} current sprint stories`
        );
      }
    }

    // Story context suggestions
    if (localContext.storyContext) {
      suggestions.push(
        `Align implementation with story: "${localContext.storyContext.title}"`
      );
      if (localContext.storyContext.acceptanceCriteria.length > 0) {
        suggestions.push(
          `Ensure code meets ${localContext.storyContext.acceptanceCriteria.length} acceptance criteria`
        );
      }
    }

    // Team pattern suggestions
    if (localContext.teamPatterns.length > 0) {
      const highAdoptionPatterns = localContext.teamPatterns.filter(
        (p) => p.teamAdoption > 0.7
      );
      if (highAdoptionPatterns.length > 0) {
        suggestions.push(
          `Follow team patterns: ${highAdoptionPatterns
            .map((p) => p.name)
            .join(", ")}`
        );
      }
    }

    // Business requirement suggestions
    if (localContext.businessRequirements.length > 0) {
      suggestions.push(
        `Implementation should address ${localContext.businessRequirements.length} business requirements`
      );
    }

    return suggestions;
  }

  /**
   * Generate suggestions based on remote intelligence
   */
  private generateRemoteSuggestions(
    remoteIntelligence: RemoteIntelligence,
    query: string
  ): string[] {
    const suggestions: string[] = [];

    // Delivery pattern suggestions
    if (remoteIntelligence.deliveryPatterns.length > 0) {
      const highSuccessPatterns = remoteIntelligence.deliveryPatterns.filter(
        (p) => p.successRate > 0.8
      );
      if (highSuccessPatterns.length > 0) {
        suggestions.push(
          `Apply proven delivery patterns: ${highSuccessPatterns
            .map((p) => p.name)
            .join(", ")}`
        );
      }
    }

    // Institutional knowledge suggestions
    if (remoteIntelligence.institutionalKnowledge.bestPractices.length > 0) {
      suggestions.push(
        `Follow institutional best practices: ${remoteIntelligence.institutionalKnowledge.bestPractices
          .slice(0, 2)
          .join(", ")}`
      );
    }

    if (remoteIntelligence.institutionalKnowledge.commonPitfalls.length > 0) {
      suggestions.push(
        `Avoid common pitfalls: ${remoteIntelligence.institutionalKnowledge.commonPitfalls
          .slice(0, 2)
          .join(", ")}`
      );
    }

    // Cross-project insights
    if (remoteIntelligence.crossProjectInsights.length > 0) {
      const highConfidenceInsights =
        remoteIntelligence.crossProjectInsights.filter(
          (i) => i.confidence > 0.7
        );
      if (highConfidenceInsights.length > 0) {
        suggestions.push(
          `Leverage cross-project insights: ${highConfidenceInsights[0].insight}`
        );
      }
    }

    return suggestions;
  }

  /**
   * Generate suggestions combining local and remote context
   */
  private generateHybridSuggestions(
    localContext: LocalContext,
    remoteIntelligence: RemoteIntelligence,
    combinedInsights: string[],
    query: string
  ): string[] {
    const suggestions: string[] = [];

    // Start with combined insights
    if (combinedInsights.length > 0) {
      suggestions.push(`Hybrid Analysis: ${combinedInsights[0]}`);
    }

    // Merge local and remote suggestions
    const localSuggestions = this.generateLocalSuggestions(localContext, query);
    const remoteSuggestions = this.generateRemoteSuggestions(
      remoteIntelligence,
      query
    );

    // Prioritize local context for immediate development needs
    suggestions.push(...localSuggestions.slice(0, 2));

    // Add strategic remote guidance
    suggestions.push(...remoteSuggestions.slice(0, 2));

    // Add hybrid-specific suggestions
    if (
      localContext.teamPatterns.length > 0 &&
      remoteIntelligence.deliveryPatterns.length > 0
    ) {
      suggestions.push(
        "Align team patterns with proven delivery methodologies for optimal results"
      );
    }

    if (
      localContext.storyContext &&
      remoteIntelligence.institutionalKnowledge.bestPractices.length > 0
    ) {
      suggestions.push(
        "Balance story requirements with institutional best practices"
      );
    }

    return suggestions;
  }

  /**
   * Create error response for failed queries
   */
  private createErrorResponse(
    query: RooCodeQuery,
    startTime: number,
    error: any
  ): RooCodeResponse {
    return {
      queryType: query.type,
      suggestions: [
        "Unable to process query due to connectivity issues",
        "Try again when MCP servers are available",
        "Check local and remote server configurations",
      ],
      confidence: 0.1,
      responseTime: Date.now() - startTime,
      sources: ["Error Handler"],
    };
  }

  /**
   * Test concurrent AI assistant request handling
   */
  async testConcurrentRequests(queries: RooCodeQuery[]): Promise<{
    results: RooCodeResponse[];
    totalTime: number;
    averageResponseTime: number;
    successRate: number;
  }> {
    const startTime = Date.now();

    // Process all queries concurrently
    const results = await Promise.allSettled(
      queries.map((query) => this.processQuery(query))
    );

    const successfulResults = results
      .filter((result) => result.status === "fulfilled")
      .map(
        (result) => (result as PromiseFulfilledResult<RooCodeResponse>).value
      );

    const failedResults = results
      .filter((result) => result.status === "rejected")
      .map((result, index) =>
        this.createErrorResponse(
          queries[index],
          startTime,
          (result as PromiseRejectedResult).reason
        )
      );

    const allResults = [...successfulResults, ...failedResults];
    const totalTime = Date.now() - startTime;
    const averageResponseTime =
      allResults.reduce((sum, result) => sum + result.responseTime, 0) /
      allResults.length;
    const successRate = successfulResults.length / queries.length;

    return {
      results: allResults,
      totalTime,
      averageResponseTime,
      successRate,
    };
  }

  /**
   * Get connectivity status for both local and remote servers
   */
  async getConnectivityStatus(): Promise<{
    local: boolean;
    remote: boolean;
    localLatency?: number;
    remoteLatency?: number;
    remoteConfigured: boolean;
  }> {
    const connectivity = await this.hybridClient.testConnectivity();

    return {
      ...connectivity,
      remoteConfigured: this.isRemoteConfigured,
    };
  }
}
