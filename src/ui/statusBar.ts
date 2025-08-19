/**
 * Status Bar Manager for MCP Server Connection Status
 */

import * as vscode from "vscode";
import { ConnectionStatus, StatusBarManager } from "../types/extension";
import { MCPClient } from "../client/mcpClient";

export class StatusBarManagerImpl implements StatusBarManager {
  private statusBarItem: vscode.StatusBarItem;
  private mcpClient: MCPClient;
  private currentStatus: ConnectionStatus = ConnectionStatus.Disconnected;

  constructor(mcpClient: MCPClient) {
    this.mcpClient = mcpClient;

    // Create status bar item
    this.statusBarItem = vscode.window.createStatusBarItem(
      vscode.StatusBarAlignment.Right,
      100
    );

    this.statusBarItem.command = "enterprise-ai-context.showStatus";
    this.statusBarItem.show();

    // Initialize with disconnected status
    this.updateConnectionStatus(ConnectionStatus.Disconnected);

    // Start periodic health checks
    this.startHealthCheck();
  }

  /**
   * Update the connection status display
   */
  updateConnectionStatus(status: ConnectionStatus): void {
    this.currentStatus = status;

    switch (status) {
      case ConnectionStatus.Connected:
        this.statusBarItem.text = "$(check) AI Context";
        this.statusBarItem.backgroundColor = undefined;
        this.statusBarItem.tooltip =
          "Enterprise AI Context: Connected to MCP server";
        break;

      case ConnectionStatus.Connecting:
        this.statusBarItem.text = "$(sync~spin) AI Context";
        this.statusBarItem.backgroundColor = new vscode.ThemeColor(
          "statusBarItem.warningBackground"
        );
        this.statusBarItem.tooltip =
          "Enterprise AI Context: Connecting to MCP server...";
        break;

      case ConnectionStatus.Disconnected:
        this.statusBarItem.text = "$(x) AI Context";
        this.statusBarItem.backgroundColor = new vscode.ThemeColor(
          "statusBarItem.errorBackground"
        );
        this.statusBarItem.tooltip =
          "Enterprise AI Context: Disconnected from MCP server";
        break;

      case ConnectionStatus.Error:
        this.statusBarItem.text = "$(warning) AI Context";
        this.statusBarItem.backgroundColor = new vscode.ThemeColor(
          "statusBarItem.errorBackground"
        );
        this.statusBarItem.tooltip = "Enterprise AI Context: Connection error";
        break;
    }
  }

  /**
   * Show health metrics and connection details
   */
  showHealthMetrics(): void {
    const statusMessage = this.getStatusMessage();
    const actions = this.getStatusActions();

    vscode.window
      .showInformationMessage(statusMessage, ...actions)
      .then((selection) => {
        if (selection === "Reconnect") {
          this.reconnect();
        } else if (selection === "Open Settings") {
          vscode.commands.executeCommand(
            "workbench.action.openSettings",
            "enterpriseAiContext"
          );
        }
      });
  }

  /**
   * Handle status bar click
   */
  handleStatusClick(): void {
    this.showHealthMetrics();
  }

  /**
   * Start periodic health checks
   */
  private startHealthCheck(): void {
    // Check connection every 30 seconds
    setInterval(async () => {
      if (this.currentStatus !== ConnectionStatus.Connecting) {
        await this.checkConnection();
      }
    }, 30000);

    // Initial connection check
    setTimeout(() => this.checkConnection(), 1000);
  }

  /**
   * Check MCP server connection
   */
  private async checkConnection(): Promise<void> {
    try {
      this.updateConnectionStatus(ConnectionStatus.Connecting);

      const isConnected = await this.mcpClient.ping();

      if (isConnected) {
        this.updateConnectionStatus(ConnectionStatus.Connected);
      } else {
        this.updateConnectionStatus(ConnectionStatus.Disconnected);
      }
    } catch (error) {
      console.error("Health check failed:", error);
      this.updateConnectionStatus(ConnectionStatus.Error);
    }
  }

  /**
   * Attempt to reconnect to MCP server
   */
  private async reconnect(): Promise<void> {
    this.updateConnectionStatus(ConnectionStatus.Connecting);

    // Get current configuration
    const config = vscode.workspace.getConfiguration("enterpriseAiContext");
    const port = config.get<number>("mcpServer.port", 3000);
    const timeout = config.get<number>("mcpServer.timeout", 5000);

    // Update client configuration
    this.mcpClient.updateConfig(port, timeout);

    // Check connection
    await this.checkConnection();
  }

  /**
   * Get status message for display
   */
  private getStatusMessage(): string {
    switch (this.currentStatus) {
      case ConnectionStatus.Connected:
        return "Enterprise AI Context is connected and ready.";
      case ConnectionStatus.Connecting:
        return "Enterprise AI Context is connecting to the MCP server...";
      case ConnectionStatus.Disconnected:
        return "Enterprise AI Context is disconnected. The MCP server may not be running.";
      case ConnectionStatus.Error:
        return "Enterprise AI Context encountered a connection error.";
      default:
        return "Enterprise AI Context status unknown.";
    }
  }

  /**
   * Get available actions based on current status
   */
  private getStatusActions(): string[] {
    switch (this.currentStatus) {
      case ConnectionStatus.Connected:
        return ["Open Settings"];
      case ConnectionStatus.Disconnected:
      case ConnectionStatus.Error:
        return ["Reconnect", "Open Settings"];
      default:
        return ["Open Settings"];
    }
  }

  /**
   * Dispose of resources
   */
  dispose(): void {
    this.statusBarItem.dispose();
  }
}
