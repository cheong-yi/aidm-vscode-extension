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
   * Format business context for hover display with enhanced styling
   */
  private formatBusinessContext(
    context: BusinessContext
  ): vscode.MarkdownString {
    const markdown = new vscode.MarkdownString();
    markdown.isTrusted = true;
    markdown.supportHtml = true;

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

        // Title with priority and status badges
        markdown.appendMarkdown(
          `<div style="display: flex; align-items: center; margin-bottom: 8px;">\n`
        );
        markdown.appendMarkdown(
          `<strong style="font-size: 1.1em; color: #24292e;">${req.title}</strong>\n`
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

  private createEnhancedProgressBar(percentage: number): string {
    const width = 200; // pixels
    const filledWidth = Math.floor((percentage / 100) * width);
    const color =
      percentage >= 90 ? "#28a745" : percentage >= 50 ? "#ffc107" : "#dc3545";

    return `<div style="background-color: #e9ecef; border-radius: 4px; height: 8px; width: ${width}px; overflow: hidden;">
      <div style="background-color: ${color}; height: 100%; width: ${filledWidth}px; transition: width 0.3s ease;"></div>
    </div>`;
  }

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
