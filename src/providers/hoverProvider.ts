/**
 * Business Context Hover Provider for TypeScript files
 */

import * as vscode from "vscode";
import { MCPClient } from "../client/mcpClient";
import { BusinessContext, CodeLocation } from "../types/business";
import { BusinessContextHoverProvider, ErrorCode } from "../types/extension";
import { demoConfig, HoverConfiguration } from "../demo/demoConfiguration";

export class BusinessContextHover
  implements vscode.HoverProvider, BusinessContextHoverProvider
{
  private mcpClient: MCPClient;

  constructor(mcpClient: MCPClient) {
    this.mcpClient = mcpClient;
  }

  /**
   * Provide hover information for TypeScript files
   */
  async provideHover(
    document: vscode.TextDocument,
    position: vscode.Position,
    token: vscode.CancellationToken
  ): Promise<vscode.Hover | null> {
    // Only support TypeScript files for MVP
    if (!this.getSupportedLanguages().includes(document.languageId)) {
      return null;
    }

    try {
      // Log the file path for debugging
      console.log("Hover Provider - File Path:", document.fileName);
      console.log("Hover Provider - Line (0-based):", position.line);
      console.log("Hover Provider - Line (1-based):", position.line + 1);

      // Normalize the file path to match cache format
      const relativePath = vscode.workspace.asRelativePath(document.fileName);
      console.log("Hover Provider - Relative Path:", relativePath);

      const codeLocation: CodeLocation = {
        filePath: relativePath,
        startLine: position.line + 1, // Convert to 1-based line numbers
        endLine: position.line + 1,
      };

      console.log("Hover Provider - CodeLocation:", codeLocation);

      // Get business context from MCP server
      const contextData = await this.mcpClient.getBusinessContext(
        codeLocation.filePath,
        codeLocation.startLine
      );

      // Log raw response for debugging
      console.log(
        "Hover Provider - Raw context data:",
        JSON.stringify(contextData, null, 2)
      );

      // Load mock cache for diagnostics
      let mockCacheRanges: string[] = [];
      if (!process.env.DEMO_MODE) {
        try {
          // Get the workspace folder and construct proper path
          const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
          if (!workspaceFolder) {
            throw new Error("No workspace folder found");
          }

          const mockCacheUri = vscode.Uri.joinPath(
            workspaceFolder.uri,
            ".aidm",
            "mock-cache.json"
          );
          const mockCache = JSON.parse(
            await vscode.workspace.fs
              .readFile(mockCacheUri)
              .then((buffer) => buffer.toString())
          );

          const relativePath = vscode.workspace.asRelativePath(
            document.fileName
          );
          if (mockCache[relativePath]) {
            mockCacheRanges = Object.keys(mockCache[relativePath]);
          }
        } catch (e) {
          console.error("Failed to read mock cache for diagnostics:", e);
        }
      } else {
        // Demo mode: Mock cache diagnostics disabled (no console output)
      }

      // Prepare diagnostic info
      const diagnosticInfo = {
        filePath: vscode.workspace.asRelativePath(document.fileName),
        line: position.line + 1,
        mockCacheRanges,
      };

      // Check for error response
      if (contextData.isError === true) {
        console.error("Hover Provider - Server returned error state");
        let errorMessage = "Unknown error";

        // Try to extract error message from content
        if (
          contextData.content &&
          Array.isArray(contextData.content) &&
          contextData.content[0]
        ) {
          errorMessage =
            contextData.content[0].message ||
            contextData.content[0].text ||
            String(contextData.content[0]);
        }

        return this.createErrorHover(
          {
            code: ErrorCode.INTERNAL_ERROR,
            message: errorMessage,
          },
          diagnosticInfo
        );
      }

      if (!contextData || !contextData.content) {
        console.log("Hover Provider - No context data or content");
        return this.createNoContextHover();
      }

      // Parse the business context
      let businessContext: BusinessContext | null = null;
      try {
        // Log the content structure for debugging
        console.log(
          "Hover Provider - Content structure:",
          typeof contextData.content,
          Array.isArray(contextData.content)
            ? contextData.content.length
            : "not array"
        );

        businessContext = this.parseBusinessContext(contextData);

        if (businessContext) {
          console.log(
            "Hover Provider - Parsed context:",
            JSON.stringify(businessContext, null, 2)
          );
        } else {
          console.log("Hover Provider - No business context parsed");
        }

        if (!businessContext || businessContext.requirements.length === 0) {
          return this.createNoContextHover();
        }
      } catch (error) {
        console.error("Hover Provider - Parse error:", error);
        console.log(
          "Hover Provider - Failed to parse content:",
          contextData.content
        );
        return this.createErrorHover(error, diagnosticInfo);
      }

      // Create formatted hover content
      const hoverContent = this.formatBusinessContext(businessContext);

      return new vscode.Hover(
        hoverContent,
        new vscode.Range(position, position)
      );
    } catch (error) {
      console.error("Error retrieving business context:", error);
      return this.createErrorHover(error);
    }
  }

  /**
   * Get supported languages (TypeScript only for MVP)
   */
  getSupportedLanguages(): string[] {
    return ["typescript"];
  }

  /**
   * Parse business context from MCP response
   */
  private parseBusinessContext(contextData: any): BusinessContext | null {
    try {
      console.log(
        "parseBusinessContext - Input:",
        JSON.stringify(contextData, null, 2)
      );

      // If contextData is already in the right format, return it directly
      if (contextData.requirements) {
        return contextData as BusinessContext;
      }

      // Handle array format
      if (Array.isArray(contextData.content)) {
        console.log(
          "parseBusinessContext - Processing content array:",
          contextData.content
        );

        for (const item of contextData.content) {
          // Skip if item indicates an error
          if (item.isError || item.error) {
            console.log("parseBusinessContext - Skipping error item:", item);
            continue;
          }

          // Try parsing the text content if available
          if (item && item.text) {
            try {
              const parsed = JSON.parse(item.text);
              if (parsed.requirements) {
                return parsed as BusinessContext;
              }
            } catch (e) {
              console.log("Failed to parse content item text:", item.text, e);
            }
          }

          // Try using the item directly if it has requirements
          if (item && item.requirements) {
            return item as BusinessContext;
          }

          // If item is a string, try parsing it
          if (typeof item === "string") {
            try {
              const parsed = JSON.parse(item);
              if (parsed.requirements) {
                return parsed as BusinessContext;
              }
            } catch (e) {
              console.log("Failed to parse content item string:", item, e);
            }
          }
        }
      }

      // Handle direct string content
      if (typeof contextData.content === "string") {
        try {
          const parsed = JSON.parse(contextData.content);
          if (parsed.requirements) {
            return parsed as BusinessContext;
          }
        } catch (e) {
          console.log(
            "Failed to parse content string:",
            contextData.content,
            e
          );
        }
      }

      // If we get here, we couldn't parse the content
      console.error("No valid business context found in:", contextData);
      return null;
    } catch (error) {
      console.error("Failed to parse business context:", error);
      console.error("Raw context data:", contextData);
      return null;
    }
  }

  /**
   * Format business context for hover display with enhanced styling
   */
  private formatBusinessContext(
    context: BusinessContext
  ): vscode.MarkdownString {
    const markdown = new vscode.MarkdownString();
    markdown.isTrusted = true;
    markdown.supportHtml = true;

    // Extension source header with provenance
    const source = this.getContextSource(context);
    markdown.appendMarkdown(
      `<small><strong>AiDM Extension</strong> ${
        source ? `(${source})` : ""
      }</small>\n\n`
    );

    // Get current hover configuration
    const hoverConfig = demoConfig.getHoverConfiguration();

    // Enhanced header with styling
    markdown.appendMarkdown("## 🏢 Enterprise Business Context\n\n");

    // Add context summary box
    if (context.requirements && context.requirements.length > 0) {
      const primaryReq = context.requirements[0];
      const completionPercentage =
        context.implementationStatus?.completionPercentage || 0;

      markdown.appendMarkdown(
        `<div style="background-color: #f8f9fa; border-left: 4px solid #007acc; padding: 12px; margin: 8px 0; border-radius: 4px;">\n`
      );
      markdown.appendMarkdown(`<strong>📊 Quick Summary</strong><br/>\n`);
      markdown.appendMarkdown(
        `Primary Requirement: ${primaryReq.title}<br/>\n`
      );
      markdown.appendMarkdown(
        `Implementation: ${this.createProgressBar(
          completionPercentage
        )} ${completionPercentage}%<br/>\n`
      );
      markdown.appendMarkdown(
        `Requirements: ${context.requirements.length} • Changes: ${
          context.relatedChanges?.length || 0
        }\n`
      );
      markdown.appendMarkdown(`</div>\n\n`);
    }

    // Enhanced requirements section
    if (context.requirements && context.requirements.length > 0) {
      markdown.appendMarkdown("### 📋 Business Requirements\n\n");

      // Limit requirements shown based on configuration
      const maxRequirements = hoverConfig.maxRequirementsShown;
      const requirementsToShow = context.requirements.slice(0, maxRequirements);

      requirementsToShow.forEach((req, index) => {
        // Requirement card styling
        const priorityColor = this.getPriorityColor(req.priority);
        const statusColor = this.getStatusColor(req.status);

        markdown.appendMarkdown(
          `<div style="border: 1px solid #e1e4e8; border-radius: 6px; padding: 16px; margin: 8px 0; background-color: #fafbfc;">\n`
        );

        // Title with REQ ID and priority/status badges
        markdown.appendMarkdown(
          `<div style="display: flex; align-items: center; margin-bottom: 8px;">\n`
        );
        markdown.appendMarkdown(
          `<strong style="font-size: 1.1em; color: #24292e;">[${req.id}] ${req.title}</strong>\n`
        );

        if (req.priority) {
          markdown.appendMarkdown(
            `<span style="background-color: ${priorityColor}; color: white; padding: 2px 8px; border-radius: 12px; font-size: 0.8em; margin-left: 8px;">${this.getPriorityIcon(
              req.priority
            )} ${req.priority}</span>\n`
          );
        }

        if (req.status) {
          markdown.appendMarkdown(
            `<span style="background-color: ${statusColor}; color: white; padding: 2px 8px; border-radius: 12px; font-size: 0.8em; margin-left: 4px;">${this.getStatusIcon(
              req.status
            )} ${req.status}</span>\n`
          );
        }
        markdown.appendMarkdown(`</div>\n`);

        // Requirement type badge
        markdown.appendMarkdown(`<div style="margin-bottom: 8px;">\n`);
        markdown.appendMarkdown(
          `<span style="background-color: #f1f8ff; color: #0366d6; padding: 2px 6px; border-radius: 3px; font-size: 0.8em; font-weight: 500;">${req.type}</span>\n`
        );
        markdown.appendMarkdown(`</div>\n`);

        // Description
        markdown.appendMarkdown(
          `<p style="color: #586069; line-height: 1.5; margin: 8px 0;">${req.description}</p>\n`
        );

        // Tags
        if (req.tags && req.tags.length > 0) {
          markdown.appendMarkdown(`<div style="margin-top: 8px;">\n`);
          req.tags.forEach((tag) => {
            markdown.appendMarkdown(
              `<span style="background-color: #f6f8fa; color: #586069; padding: 2px 6px; border-radius: 3px; font-size: 0.75em; margin-right: 4px; border: 1px solid #e1e4e8;">#${tag}</span>\n`
            );
          });
          markdown.appendMarkdown(`</div>\n`);
        }

        // Linked Requirements
        if (req.linkedRequirements && req.linkedRequirements.length > 0) {
          markdown.appendMarkdown(
            `<div style="margin-top: 8px; padding-top: 8px; border-top: 1px solid #e1e4e8;">\n`
          );
          markdown.appendMarkdown(
            `<small style="color: #586069;"><strong>🔗 Linked Requirements:</strong> ${req.linkedRequirements.join(
              ", "
            )}</small>\n`
          );
          markdown.appendMarkdown(`</div>\n`);
        }

        // Functions
        if (req.functions && req.functions.length > 0) {
          markdown.appendMarkdown(`<div style="margin-top: 8px;">\n`);
          markdown.appendMarkdown(
            `<small style="color: #586069;"><strong>⚙️ Functions:</strong> ${req.functions.join(
              ", "
            )}</small>\n`
          );
          markdown.appendMarkdown(`</div>\n`);
        }

        // Stakeholders
        if (req.stakeholders && req.stakeholders.length > 0) {
          markdown.appendMarkdown(
            `<div style="margin-top: 8px; padding-top: 8px; border-top: 1px solid #e1e4e8;">\n`
          );
          markdown.appendMarkdown(
            `<small style="color: #586069;"><strong>👥 Stakeholders:</strong> ${req.stakeholders.join(
              ", "
            )}</small>\n`
          );
          markdown.appendMarkdown(`</div>\n`);
        }

        markdown.appendMarkdown(`</div>\n\n`);
      });

      // Show indicator if there are more requirements
      if (context.requirements.length > maxRequirements) {
        markdown.appendMarkdown(
          `<small style="color: #586069; font-style: italic;">... and ${
            context.requirements.length - maxRequirements
          } more requirements</small>\n\n`
        );
      }
    }

    // Enhanced implementation status
    if (context.implementationStatus) {
      markdown.appendMarkdown("### ⚙️ Implementation Status\n\n");

      const completion = context.implementationStatus.completionPercentage;
      const statusColor =
        completion >= 90 ? "#28a745" : completion >= 50 ? "#ffc107" : "#dc3545";

      // Use enhanced progress bar if enabled in configuration
      const progressBar = hoverConfig.showProgressBars
        ? this.createEnhancedProgressBar(completion)
        : this.createProgressBar(completion);

      markdown.appendMarkdown(
        `<div style="background-color: #f8f9fa; border-radius: 6px; padding: 16px; margin: 8px 0;">\n`
      );
      markdown.appendMarkdown(
        `<div style="display: flex; align-items: center; margin-bottom: 8px;">\n`
      );
      markdown.appendMarkdown(
        `<strong style="color: ${statusColor};">Progress: ${completion}%</strong>\n`
      );
      markdown.appendMarkdown(`</div>\n`);
      markdown.appendMarkdown(
        `<div style="margin-bottom: 12px;">${progressBar}</div>\n`
      );

      if (context.implementationStatus.verifiedBy) {
        markdown.appendMarkdown(`<div style="margin-bottom: 8px;">\n`);
        markdown.appendMarkdown(
          `<small style="color: #28a745;"><strong>✅ Verified by:</strong> ${context.implementationStatus.verifiedBy}</small>\n`
        );
        markdown.appendMarkdown(`</div>\n`);
      }

      if (context.implementationStatus.notes) {
        markdown.appendMarkdown(
          `<div style="background-color: #fff3cd; border-left: 4px solid #ffc107; padding: 8px; margin-top: 8px; border-radius: 4px;">\n`
        );
        markdown.appendMarkdown(
          `<small><strong>📝 Notes:</strong> ${context.implementationStatus.notes}</small>\n`
        );
        markdown.appendMarkdown(`</div>\n`);
      }

      markdown.appendMarkdown(`</div>\n\n`);
    }

    // Function Mappings section
    if (
      context.functionMappings &&
      Object.keys(context.functionMappings).length > 0
    ) {
      markdown.appendMarkdown("### 🎯 Function Mappings\n\n");

      Object.entries(context.functionMappings).forEach(
        ([functionName, mapping]) => {
          markdown.appendMarkdown(
            `<div style="background-color: #f6f8fa; border-left: 4px solid #28a745; padding: 12px; margin: 8px 0; border-radius: 4px;">\n`
          );
          markdown.appendMarkdown(
            `<strong style="color: #28a745;">⚙️ ${functionName}</strong><br/>\n`
          );
          markdown.appendMarkdown(
            `<small style="color: #586069;">Lines ${mapping.startLine}-${
              mapping.endLine
            } • Requirements: ${mapping.requirements.join(", ")}</small><br/>\n`
          );
          markdown.appendMarkdown(
            `<em style="color: #586069;">${mapping.description}</em>\n`
          );
          markdown.appendMarkdown(`</div>\n\n`);
        }
      );
    }

    // Enhanced recent changes section
    if (context.relatedChanges && context.relatedChanges.length > 0) {
      markdown.appendMarkdown("### 📈 Recent Changes\n\n");

      const recentChanges = context.relatedChanges
        .sort(
          (a, b) =>
            new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        )
        .slice(0, 3); // Show only 3 most recent changes

      recentChanges.forEach((change, index) => {
        const changeIcon = this.getChangeIcon(change.type);
        const timeAgo = this.getTimeAgo(new Date(change.timestamp));
        const changeColor = this.getChangeTypeColor(change.type);

        markdown.appendMarkdown(
          `<div style="border-left: 3px solid ${changeColor}; padding-left: 12px; margin: 8px 0;">\n`
        );
        markdown.appendMarkdown(
          `<div style="display: flex; align-items: center; margin-bottom: 4px;">\n`
        );
        markdown.appendMarkdown(
          `<span style="margin-right: 8px;">${changeIcon}</span>\n`
        );
        markdown.appendMarkdown(
          `<strong style="color: #24292e;">${change.description}</strong>\n`
        );
        markdown.appendMarkdown(`</div>\n`);
        markdown.appendMarkdown(
          `<small style="color: #586069;">👤 ${change.author} • ${timeAgo}</small>\n`
        );
        markdown.appendMarkdown(`</div>\n\n`);
      });

      // Show more changes indicator
      if (context.relatedChanges.length > 3) {
        markdown.appendMarkdown(
          `<small style="color: #586069; font-style: italic;">... and ${
            context.relatedChanges.length - 3
          } more changes</small>\n\n`
        );
      }
    }

    // Enhanced footer with metadata
    markdown.appendMarkdown(
      `<div style="border-top: 1px solid #e1e4e8; padding-top: 12px; margin-top: 16px;">\n`
    );

    if (context.lastUpdated) {
      const lastUpdated = this.getTimeAgo(new Date(context.lastUpdated));
      markdown.appendMarkdown(
        `<small style="color: #586069;"><strong>🕒 Last updated:</strong> ${lastUpdated}</small><br/>\n`
      );
    }

    // Add helpful actions
    markdown.appendMarkdown(
      `<small style="color: #586069;"><strong>💡 Tip:</strong> Use Ctrl+Click to navigate to related requirements</small>\n`
    );
    markdown.appendMarkdown(`</div>\n`);

    return markdown;
  }

  /**
   * Create hover for when no context is available
   */
  private createNoContextHover(): vscode.Hover {
    const markdown = new vscode.MarkdownString();
    markdown.isTrusted = true;
    markdown.supportHtml = true;
    markdown.appendMarkdown(
      "<small><strong>AiDM Extension</strong> (Generated)</small>\n\n"
    );
    markdown.appendMarkdown("## 🏢 Business Context\n\n");
    markdown.appendMarkdown(
      "ℹ️ No business context available for this code location.\n\n"
    );
    markdown.appendMarkdown(
      "*This may be expected for utility functions or framework code.*"
    );

    return new vscode.Hover(markdown);
  }

  /**
   * Create hover for error scenarios
   */
  private createErrorHover(
    error: any,
    diagnosticInfo?: {
      filePath?: string;
      line?: number;
      mockCacheRanges?: string[];
    }
  ): vscode.Hover {
    const markdown = new vscode.MarkdownString();
    markdown.isTrusted = true;
    markdown.supportHtml = true;

    // Header with error indication
    markdown.appendMarkdown(
      "<small><strong>AiDM Extension</strong> (Error)</small>\n\n"
    );
    markdown.appendMarkdown("## 🏢 Business Context\n\n");

    // Error message with diagnostic info
    if (error.code === ErrorCode.CONNECTION_FAILED) {
      markdown.appendMarkdown("⚠️ **Connection Error**\n\n");
      markdown.appendMarkdown(
        "Unable to connect to the MCP server. Please ensure the server is running.\n\n"
      );
      markdown.appendMarkdown(
        `Port: ${this.mcpClient?.getPort() || "unknown"}\n\n`
      );
    } else if (error.code === ErrorCode.TIMEOUT) {
      markdown.appendMarkdown("⏱️ **Timeout Error**\n\n");
      markdown.appendMarkdown(
        "Request timed out. The server may be overloaded.\n\n"
      );
    } else {
      markdown.appendMarkdown("❌ **Error**\n\n");
      markdown.appendMarkdown(
        `Failed to retrieve business context: ${
          error.message || "Unknown error"
        }\n\n`
      );
    }

    // Add diagnostic information
    if (diagnosticInfo) {
      markdown.appendMarkdown("### 🔍 Diagnostic Information\n\n");

      // File path info
      if (diagnosticInfo.filePath) {
        markdown.appendMarkdown(
          `**Requested File:** \`${diagnosticInfo.filePath}\`\n\n`
        );
      }

      // Line number info
      if (diagnosticInfo.line !== undefined) {
        markdown.appendMarkdown(
          `**Requested Line:** ${diagnosticInfo.line}\n\n`
        );
      }

      // Mock cache ranges
      if (
        diagnosticInfo.mockCacheRanges &&
        diagnosticInfo.mockCacheRanges.length > 0
      ) {
        markdown.appendMarkdown("**Available Cache Ranges:**\n");
        diagnosticInfo.mockCacheRanges.forEach((range) => {
          markdown.appendMarkdown(`- \`${range}\`\n`);
        });
        markdown.appendMarkdown("\n");
      }

      // Troubleshooting tips
      markdown.appendMarkdown("### 💡 Troubleshooting Tips\n\n");
      markdown.appendMarkdown("1. Verify the file path matches exactly\n");
      markdown.appendMarkdown(
        "2. Check if the line number falls within a cached range\n"
      );
      markdown.appendMarkdown(
        "3. Ensure the MCP server is running on the correct port\n"
      );
      markdown.appendMarkdown("4. Check the mock cache file format\n\n");
    }

    markdown.appendMarkdown(
      "*For more details, check the Debug Console (Ctrl+Shift+Y).*"
    );

    return new vscode.Hover(markdown);
  }

  // Helper methods for formatting

  /**
   * Get icon for priority level
   */
  private getPriorityIcon(priority: string): string {
    switch (priority?.toLowerCase()) {
      case "critical":
        return "🔴";
      case "high":
        return "🟠";
      case "medium":
        return "🟡";
      case "low":
        return "🟢";
      default:
        return "⚪";
    }
  }

  /**
   * Get icon for status
   */
  private getStatusIcon(status: string): string {
    switch (status?.toLowerCase()) {
      case "completed":
        return "✅";
      case "in_progress":
        return "🔄";
      case "approved":
        return "👍";
      case "draft":
        return "📝";
      case "deprecated":
        return "⚠️";
      default:
        return "📋";
    }
  }

  /**
   * Get icon for change type
   */
  private getChangeIcon(changeType: string): string {
    switch (changeType?.toLowerCase()) {
      case "feature":
        return "✨";
      case "bug_fix":
        return "🐛";
      case "refactor":
        return "♻️";
      case "documentation":
        return "📚";
      case "test":
        return "🧪";
      default:
        return "📝";
    }
  }

  /**
   * Create simple progress bar
   */
  private createProgressBar(percentage: number): string {
    const filled = Math.floor(percentage / 10);
    const empty = 10 - filled;
    return "█".repeat(filled) + "░".repeat(empty);
  }

  /**
   * Create enhanced progress bar with styling
   */
  private createEnhancedProgressBar(percentage: number): string {
    const width = 200; // pixels
    const filledWidth = Math.floor((percentage / 100) * width);
    const color =
      percentage >= 90 ? "#28a745" : percentage >= 50 ? "#ffc107" : "#dc3545";

    return `<div style="background-color: #e9ecef; border-radius: 4px; height: 8px; width: ${width}px; overflow: hidden;">
      <div style="background-color: ${color}; height: 100%; width: ${filledWidth}px; transition: width 0.3s ease;"></div>
    </div>`;
  }

  /**
   * Get color for priority level
   */
  private getPriorityColor(priority: string): string {
    switch (priority?.toLowerCase()) {
      case "critical":
        return "#dc3545";
      case "high":
        return "#fd7e14";
      case "medium":
        return "#ffc107";
      case "low":
        return "#28a745";
      default:
        return "#6c757d";
    }
  }

  /**
   * Get color for status
   */
  private getStatusColor(status: string): string {
    switch (status?.toLowerCase()) {
      case "completed":
        return "#28a745";
      case "in_progress":
        return "#007bff";
      case "approved":
        return "#20c997";
      case "draft":
        return "#6c757d";
      case "deprecated":
        return "#dc3545";
      default:
        return "#6c757d";
    }
  }

  /**
   * Get color for change type
   */
  private getChangeTypeColor(changeType: string): string {
    switch (changeType?.toLowerCase()) {
      case "feature":
        return "#28a745";
      case "bug_fix":
        return "#dc3545";
      case "refactor":
        return "#6f42c1";
      case "documentation":
        return "#17a2b8";
      case "test":
        return "#ffc107";
      default:
        return "#6c757d";
    }
  }

  /**
   * Get relative time string
   */
  private getTimeAgo(date: Date): string {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMinutes = Math.floor(diffMs / (1000 * 60));

    if (diffDays > 0) {
      return `${diffDays} day${diffDays > 1 ? "s" : ""} ago`;
    } else if (diffHours > 0) {
      return `${diffHours} hour${diffHours > 1 ? "s" : ""} ago`;
    } else if (diffMinutes > 0) {
      return `${diffMinutes} minute${diffMinutes > 1 ? "s" : ""} ago`;
    } else {
      return "Just now";
    }
  }

  /**
   * Determine the source of the business context for provenance labeling
   */
  private getContextSource(context: BusinessContext): string | null {
    // For now, we'll use a simple heuristic based on context properties
    // In the future, this will come from the composite service
    if (context.requirements && context.requirements.length > 0) {
      const req = context.requirements[0];
      // Check if this looks like mock cache data (has specific patterns)
      if (req.id && req.id.startsWith("REQ-") && req.createdDate) {
        return "Local Cache";
      }
      // Check if this looks like generated mock data
      if (req.description && req.description.includes("Mock data provider")) {
        return "Generated";
      }
      // Default to Local Cache for now
      return "Local Cache";
    }
    return null;
  }
}
