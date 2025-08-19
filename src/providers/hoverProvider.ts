/**
 * Business Context Hover Provider for TypeScript files
 */

import * as vscode from "vscode";
import { MCPClient } from "../client/mcpClient";
import { BusinessContext, CodeLocation } from "../types/business";
import { BusinessContextHoverProvider, ErrorCode } from "../types/extension";

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
      const codeLocation: CodeLocation = {
        filePath: document.fileName,
        startLine: position.line + 1, // Convert to 1-based line numbers
        endLine: position.line + 1,
      };

      // Get business context from MCP server
      const contextData = await this.mcpClient.getBusinessContext(
        codeLocation.filePath,
        codeLocation.startLine
      );

      if (!contextData || !contextData.content) {
        return this.createNoContextHover();
      }

      // Parse the business context
      const businessContext = this.parseBusinessContext(contextData);

      if (!businessContext || businessContext.requirements.length === 0) {
        return this.createNoContextHover();
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
      if (
        contextData.content &&
        contextData.content[0] &&
        contextData.content[0].text
      ) {
        const contextText = contextData.content[0].text;
        return JSON.parse(contextText) as BusinessContext;
      }
      return null;
    } catch (error) {
      console.error("Failed to parse business context:", error);
      return null;
    }
  }

  /**
   * Format business context for hover display
   */
  private formatBusinessContext(
    context: BusinessContext
  ): vscode.MarkdownString {
    const markdown = new vscode.MarkdownString();
    markdown.isTrusted = true;

    // Header
    markdown.appendMarkdown("## 🏢 Business Context\n\n");

    // Requirements section
    if (context.requirements && context.requirements.length > 0) {
      markdown.appendMarkdown("### 📋 Requirements\n\n");

      context.requirements.forEach((req, index) => {
        markdown.appendMarkdown(`**${req.title}** (${req.type})\n\n`);
        markdown.appendMarkdown(`${req.description}\n\n`);

        if (req.priority) {
          const priorityIcon = this.getPriorityIcon(req.priority);
          markdown.appendMarkdown(
            `${priorityIcon} Priority: ${req.priority}\n\n`
          );
        }

        if (req.status) {
          const statusIcon = this.getStatusIcon(req.status);
          markdown.appendMarkdown(`${statusIcon} Status: ${req.status}\n\n`);
        }

        if (req.stakeholders && req.stakeholders.length > 0) {
          markdown.appendMarkdown(
            `👥 Stakeholders: ${req.stakeholders.join(", ")}\n\n`
          );
        }

        if (index < context.requirements.length - 1) {
          markdown.appendMarkdown("---\n\n");
        }
      });
    }

    // Implementation status
    if (context.implementationStatus) {
      markdown.appendMarkdown("### ⚙️ Implementation Status\n\n");

      const completion = context.implementationStatus.completionPercentage;
      const progressBar = this.createProgressBar(completion);

      markdown.appendMarkdown(`${progressBar} ${completion}% Complete\n\n`);

      if (context.implementationStatus.verifiedBy) {
        markdown.appendMarkdown(
          `✅ Verified by: ${context.implementationStatus.verifiedBy}\n\n`
        );
      }

      if (context.implementationStatus.notes) {
        markdown.appendMarkdown(
          `📝 Notes: ${context.implementationStatus.notes}\n\n`
        );
      }
    }

    // Related changes
    if (context.relatedChanges && context.relatedChanges.length > 0) {
      markdown.appendMarkdown("### 📈 Recent Changes\n\n");

      const recentChanges = context.relatedChanges
        .sort(
          (a, b) =>
            new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        )
        .slice(0, 3); // Show only 3 most recent changes

      recentChanges.forEach((change) => {
        const changeIcon = this.getChangeIcon(change.type);
        const timeAgo = this.getTimeAgo(new Date(change.timestamp));

        markdown.appendMarkdown(`${changeIcon} **${change.description}**\n\n`);
        markdown.appendMarkdown(`👤 ${change.author} • ${timeAgo}\n\n`);
      });
    }

    // Last updated
    if (context.lastUpdated) {
      const lastUpdated = this.getTimeAgo(new Date(context.lastUpdated));
      markdown.appendMarkdown(`---\n\n*Last updated: ${lastUpdated}*\n\n`);
    }

    return markdown;
  }

  /**
   * Create hover for when no context is available
   */
  private createNoContextHover(): vscode.Hover {
    const markdown = new vscode.MarkdownString();
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
  private createErrorHover(error: any): vscode.Hover {
    const markdown = new vscode.MarkdownString();
    markdown.appendMarkdown("## 🏢 Business Context\n\n");

    if (error.code === ErrorCode.CONNECTION_FAILED) {
      markdown.appendMarkdown("⚠️ **Connection Error**\n\n");
      markdown.appendMarkdown(
        "Unable to connect to the MCP server. Please ensure the server is running.\n\n"
      );
    } else if (error.code === ErrorCode.TIMEOUT) {
      markdown.appendMarkdown("⏱️ **Timeout Error**\n\n");
      markdown.appendMarkdown(
        "Request timed out. The server may be overloaded.\n\n"
      );
    } else {
      markdown.appendMarkdown("❌ **Error**\n\n");
      markdown.appendMarkdown(
        "Failed to retrieve business context. Please try again.\n\n"
      );
    }

    markdown.appendMarkdown("*Check the output panel for more details.*");

    return new vscode.Hover(markdown);
  }

  // Helper methods for formatting

  private getPriorityIcon(priority: string): string {
    switch (priority.toLowerCase()) {
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

  private getStatusIcon(status: string): string {
    switch (status.toLowerCase()) {
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

  private getChangeIcon(changeType: string): string {
    switch (changeType.toLowerCase()) {
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

  private createProgressBar(percentage: number): string {
    const filled = Math.floor(percentage / 10);
    const empty = 10 - filled;
    return "█".repeat(filled) + "░".repeat(empty);
  }

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
}
