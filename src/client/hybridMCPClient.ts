/**
 * Hybrid MCP Client for RooCode Integration
 * Handles both local sprint context and remote delivery patterns
 */

import axios, { AxiosInstance } from "axios";
import {
  JSONRPCRequest,
  JSONRPCResponse,
  ToolCallRequest,
} from "../types/jsonrpc";
import { ErrorCode, ErrorResponse } from "../types/extension";

export interface LocalContext {
  sprintDetails: SprintInfo;
  storyContext: StoryContext;
  teamPatterns: CodingPattern[];
  businessRequirements: any[];
}

export interface RemoteIntelligence {
  deliveryPatterns: DeliveryPattern[];
  institutionalKnowledge: KnowledgeBase;
  crossProjectInsights: LearningInsight[];
  stakeholderMapping: StakeholderMap;
}

export interface SprintInfo {
  id: string;
  name: string;
  startDate: Date;
  endDate: Date;
  teamMembers: string[];
  currentStories: string[];
}

export interface StoryContext {
  id: string;
  title: string;
  description: string;
  acceptanceCriteria: string[];
  businessValue: string;
  priority: string;
  status: string;
}

export interface CodingPattern {
  id: string;
  name: string;
  description: string;
  category: string;
  examples: string[];
  teamAdoption: number;
}

export interface DeliveryPattern {
  id: string;
  name: string;
  description: string;
  technology: string;
  successRate: number;
  projectReferences: string[];
  methodOneAlignment: string;
}

export interface KnowledgeBase {
  domain: string;
  articles: KnowledgeArticle[];
  bestPractices: string[];
  commonPitfalls: string[];
}

export interface KnowledgeArticle {
  id: string;
  title: string;
  summary: string;
  tags: string[];
  relevanceScore: number;
}

export interface LearningInsight {
  id: string;
  insight: string;
  sourceProjects: string[];
  applicability: string;
  confidence: number;
}

export interface StakeholderMap {
  project: string;
  stakeholders: Stakeholder[];
  relationships: StakeholderRelationship[];
}

export interface Stakeholder {
  id: string;
  name: string;
  role: string;
  influence: string;
  interest: string;
}

export interface StakeholderRelationship {
  from: string;
  to: string;
  type: string;
  strength: string;
}

export class HybridMCPClient {
  private localClient: AxiosInstance;
  private remoteClient: AxiosInstance | null = null;
  private localEndpoint: string;
  private remoteEndpoint: string | null = null;
  private requestId: number = 1;
  private timeout: number = 5000;

  constructor(localPort: number = 3000, timeout: number = 5000) {
    this.localEndpoint = `http://localhost:${localPort}/rpc`;
    this.timeout = timeout;

    this.localClient = axios.create({
      baseURL: this.localEndpoint,
      timeout: this.timeout,
      headers: {
        "Content-Type": "application/json",
      },
    });
  }

  /**
   * Configure remote MCP server connection
   */
  configureRemoteServer(remoteUrl: string): void {
    this.remoteEndpoint = remoteUrl;
    this.remoteClient = axios.create({
      baseURL: remoteUrl,
      timeout: this.timeout * 2, // Allow more time for remote requests
      headers: {
        "Content-Type": "application/json",
      },
    });
  }

  /**
   * Send request to local MCP server
   */
  private async sendLocalRequest(
    request: JSONRPCRequest
  ): Promise<JSONRPCResponse> {
    try {
      const response = await this.localClient.post("", request);

      if (response.data.error) {
        throw new Error(`Local MCP Error: ${response.data.error.message}`);
      }

      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        if (error.code === "ECONNREFUSED") {
          throw this.createError(
            ErrorCode.CONNECTION_FAILED,
            "Local MCP server unavailable"
          );
        }
        if (error.code === "ECONNABORTED") {
          throw this.createError(ErrorCode.TIMEOUT, "Local request timeout");
        }
      }
      throw this.createError(
        ErrorCode.INTERNAL_ERROR,
        "Local MCP communication failed"
      );
    }
  }

  /**
   * Send request to remote MCP server
   */
  private async sendRemoteRequest(
    request: JSONRPCRequest
  ): Promise<JSONRPCResponse> {
    if (!this.remoteClient || !this.remoteEndpoint) {
      throw this.createError(
        ErrorCode.CONNECTION_FAILED,
        "Remote MCP server not configured"
      );
    }

    try {
      const response = await this.remoteClient.post("", request);

      if (response.data.error) {
        throw new Error(`Remote MCP Error: ${response.data.error.message}`);
      }

      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        if (error.code === "ECONNREFUSED") {
          throw this.createError(
            ErrorCode.CONNECTION_FAILED,
            "Remote MCP server unavailable"
          );
        }
        if (error.code === "ECONNABORTED") {
          throw this.createError(ErrorCode.TIMEOUT, "Remote request timeout");
        }
      }
      throw this.createError(
        ErrorCode.INTERNAL_ERROR,
        "Remote MCP communication failed"
      );
    }
  }

  /**
   * Get current sprint context from local MCP server
   */
  async getCurrentSprintContext(): Promise<LocalContext> {
    const request: ToolCallRequest = {
      jsonrpc: "2.0",
      method: "tools/call",
      params: {
        name: "get_sprint_context",
        arguments: {},
      },
      id: this.requestId++,
    };

    try {
      const response = await this.sendLocalRequest(request);
      return this.parseLocalContext(response.result);
    } catch (error) {
      console.warn("Failed to get sprint context, using fallback:", error);
      return this.getFallbackLocalContext();
    }
  }

  /**
   * Get project context for specific file from local MCP server
   */
  async getProjectContext(
    filePath: string,
    startLine: number,
    endLine: number
  ): Promise<LocalContext> {
    const request: ToolCallRequest = {
      jsonrpc: "2.0",
      method: "tools/call",
      params: {
        name: "get_business_context",
        arguments: {
          filePath,
          startLine,
          endLine,
        },
      },
      id: this.requestId++,
    };

    try {
      const response = await this.sendLocalRequest(request);
      return this.parseProjectContext(response.result, filePath);
    } catch (error) {
      console.warn("Failed to get project context, using fallback:", error);
      return this.getFallbackLocalContext();
    }
  }

  /**
   * Get Accenture delivery patterns from remote MCP server
   */
  async getAccentureDeliveryPatterns(
    technology: string
  ): Promise<RemoteIntelligence> {
    if (!this.remoteClient) {
      console.warn("Remote MCP not configured, using mock delivery patterns");
      return this.getMockDeliveryPatterns(technology);
    }

    const request: ToolCallRequest = {
      jsonrpc: "2.0",
      method: "tools/call",
      params: {
        name: "get_delivery_patterns",
        arguments: {
          technology,
          source: "accenture",
        },
      },
      id: this.requestId++,
    };

    try {
      const response = await this.sendRemoteRequest(request);
      return this.parseRemoteIntelligence(response.result);
    } catch (error) {
      console.warn(
        "Failed to get remote delivery patterns, using mock:",
        error
      );
      return this.getMockDeliveryPatterns(technology);
    }
  }

  /**
   * Query institutional knowledge from remote MCP server
   */
  async queryInstitutionalKnowledge(
    domain: string
  ): Promise<RemoteIntelligence> {
    if (!this.remoteClient) {
      console.warn("Remote MCP not configured, using mock knowledge");
      return this.getMockInstitutionalKnowledge(domain);
    }

    const request: ToolCallRequest = {
      jsonrpc: "2.0",
      method: "tools/call",
      params: {
        name: "query_knowledge_base",
        arguments: {
          domain,
          includeInsights: true,
        },
      },
      id: this.requestId++,
    };

    try {
      const response = await this.sendRemoteRequest(request);
      return this.parseRemoteIntelligence(response.result);
    } catch (error) {
      console.warn(
        "Failed to query institutional knowledge, using mock:",
        error
      );
      return this.getMockInstitutionalKnowledge(domain);
    }
  }

  /**
   * Get hybrid context combining local and remote intelligence
   */
  async getHybridContext(
    filePath: string,
    startLine: number,
    endLine: number,
    technology?: string
  ): Promise<{
    local: LocalContext;
    remote: RemoteIntelligence;
    combinedInsights: string[];
  }> {
    // Execute both requests concurrently for better performance
    const [localContext, remoteIntelligence] = await Promise.allSettled([
      this.getProjectContext(filePath, startLine, endLine),
      technology
        ? this.getAccentureDeliveryPatterns(technology)
        : this.getMockDeliveryPatterns("general"),
    ]);

    const local =
      localContext.status === "fulfilled"
        ? localContext.value
        : this.getFallbackLocalContext();

    const remote =
      remoteIntelligence.status === "fulfilled"
        ? remoteIntelligence.value
        : this.getMockDeliveryPatterns("general");

    // Generate combined insights
    const combinedInsights = this.generateCombinedInsights(local, remote);

    return {
      local,
      remote,
      combinedInsights,
    };
  }

  /**
   * Test connectivity to both local and remote servers
   */
  async testConnectivity(): Promise<{
    local: boolean;
    remote: boolean;
    localLatency?: number;
    remoteLatency?: number;
  }> {
    const results = {
      local: false,
      remote: false,
      localLatency: undefined as number | undefined,
      remoteLatency: undefined as number | undefined,
    };

    // Test local connectivity
    try {
      const localStart = Date.now();
      await this.sendLocalRequest({
        jsonrpc: "2.0",
        method: "ping",
        id: this.requestId++,
      });
      results.local = true;
      results.localLatency = Date.now() - localStart;
    } catch (error) {
      console.warn("Local MCP server connectivity test failed:", error);
    }

    // Test remote connectivity
    if (this.remoteClient) {
      try {
        const remoteStart = Date.now();
        await this.sendRemoteRequest({
          jsonrpc: "2.0",
          method: "ping",
          id: this.requestId++,
        });
        results.remote = true;
        results.remoteLatency = Date.now() - remoteStart;
      } catch (error) {
        console.warn("Remote MCP server connectivity test failed:", error);
      }
    }

    return results;
  }

  // Helper methods for parsing and fallback data

  private parseLocalContext(result: any): LocalContext {
    // Parse the business context result into LocalContext format
    return {
      sprintDetails: {
        id: "current-sprint",
        name: "Current Development Sprint",
        startDate: new Date(),
        endDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
        teamMembers: ["Developer", "Product Owner", "Scrum Master"],
        currentStories: result?.requirements?.map((r: any) => r.id) || [],
      },
      storyContext: {
        id: "current-story",
        title: result?.requirements?.[0]?.title || "Current Story",
        description:
          result?.requirements?.[0]?.description || "Story description",
        acceptanceCriteria: result?.requirements?.[0]?.acceptanceCriteria || [],
        businessValue: "High",
        priority: result?.requirements?.[0]?.priority || "medium",
        status: result?.requirements?.[0]?.status || "in_progress",
      },
      teamPatterns: [
        {
          id: "typescript-patterns",
          name: "TypeScript Best Practices",
          description: "Team coding standards for TypeScript",
          category: "language",
          examples: ["Use strict types", "Prefer interfaces over types"],
          teamAdoption: 0.9,
        },
      ],
      businessRequirements: result?.requirements || [],
    };
  }

  private parseProjectContext(result: any, filePath: string): LocalContext {
    return this.parseLocalContext(result);
  }

  private parseRemoteIntelligence(result: any): RemoteIntelligence {
    return {
      deliveryPatterns: result?.patterns || [],
      institutionalKnowledge: result?.knowledge || {
        domain: "general",
        articles: [],
        bestPractices: [],
        commonPitfalls: [],
      },
      crossProjectInsights: result?.insights || [],
      stakeholderMapping: result?.stakeholders || {
        project: "unknown",
        stakeholders: [],
        relationships: [],
      },
    };
  }

  private getFallbackLocalContext(): LocalContext {
    return {
      sprintDetails: {
        id: "fallback-sprint",
        name: "Development Sprint (Offline)",
        startDate: new Date(),
        endDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
        teamMembers: ["Team Member"],
        currentStories: ["fallback-story"],
      },
      storyContext: {
        id: "fallback-story",
        title: "Local Development Context",
        description: "Working in offline mode with cached context",
        acceptanceCriteria: ["Maintain functionality when offline"],
        businessValue: "Medium",
        priority: "medium",
        status: "in_progress",
      },
      teamPatterns: [
        {
          id: "offline-pattern",
          name: "Offline Development",
          description: "Graceful degradation when services unavailable",
          category: "resilience",
          examples: ["Cache important data", "Provide fallback responses"],
          teamAdoption: 1.0,
        },
      ],
      businessRequirements: [],
    };
  }

  private getMockDeliveryPatterns(technology: string): RemoteIntelligence {
    return {
      deliveryPatterns: [
        {
          id: `${technology}-pattern-1`,
          name: `${technology} Enterprise Pattern`,
          description: `Proven delivery approach for ${technology} projects`,
          technology,
          successRate: 0.85,
          projectReferences: ["Project Alpha", "Project Beta"],
          methodOneAlignment: "High",
        },
      ],
      institutionalKnowledge: {
        domain: technology,
        articles: [
          {
            id: "article-1",
            title: `${technology} Best Practices`,
            summary: `Key practices for successful ${technology} delivery`,
            tags: [technology, "best-practices"],
            relevanceScore: 0.9,
          },
        ],
        bestPractices: [
          `Use ${technology} recommended patterns`,
          "Follow enterprise standards",
        ],
        commonPitfalls: [
          `Avoid ${technology} anti-patterns`,
          "Don't skip testing",
        ],
      },
      crossProjectInsights: [
        {
          id: "insight-1",
          insight: `Teams using ${technology} see 30% faster delivery with proper patterns`,
          sourceProjects: ["Project Alpha", "Project Beta"],
          applicability: "High",
          confidence: 0.8,
        },
      ],
      stakeholderMapping: {
        project: "current",
        stakeholders: [
          {
            id: "stakeholder-1",
            name: "Technical Lead",
            role: "Decision Maker",
            influence: "High",
            interest: "High",
          },
        ],
        relationships: [],
      },
    };
  }

  private getMockInstitutionalKnowledge(domain: string): RemoteIntelligence {
    return this.getMockDeliveryPatterns(domain);
  }

  private generateCombinedInsights(
    local: LocalContext,
    remote: RemoteIntelligence
  ): string[] {
    const insights: string[] = [];

    // Combine sprint context with delivery patterns
    if (local.sprintDetails && remote.deliveryPatterns.length > 0) {
      insights.push(
        `Current sprint "${local.sprintDetails.name}" can benefit from ${remote.deliveryPatterns.length} proven delivery patterns`
      );
    }

    // Combine story context with institutional knowledge
    if (
      local.storyContext &&
      remote.institutionalKnowledge.bestPractices.length > 0
    ) {
      insights.push(
        `Story "${local.storyContext.title}" aligns with ${remote.institutionalKnowledge.bestPractices.length} institutional best practices`
      );
    }

    // Combine team patterns with cross-project insights
    if (
      local.teamPatterns.length > 0 &&
      remote.crossProjectInsights.length > 0
    ) {
      insights.push(
        `Team patterns show ${Math.round(
          local.teamPatterns[0].teamAdoption * 100
        )}% adoption, supported by ${
          remote.crossProjectInsights.length
        } cross-project insights`
      );
    }

    return insights;
  }

  private createError(code: ErrorCode, message: string): ErrorResponse {
    return {
      code,
      message,
      timestamp: new Date(),
      requestId: this.requestId.toString(),
    };
  }
}
