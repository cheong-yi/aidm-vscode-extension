/**
 * Demo Configuration Management
 * Handles configuration for realistic enterprise demo scenarios
 */

import * as vscode from "vscode";
import { MockConfiguration } from "../mock/MockDataProvider";

export interface DemoConfiguration extends MockConfiguration {
  // UI Configuration
  hoverPopupTheme: "default" | "compact" | "detailed";
  showProgressBars: boolean;
  maxRequirementsShown: number;

  // Performance Configuration  
  maxConcurrentRequests: number;
  cacheEnabled: boolean;
}

export class DemoConfigurationManager {
  private static instance: DemoConfigurationManager;
  private currentConfig: DemoConfiguration;

  private constructor() {
    this.currentConfig = this.loadConfiguration();
  }

  public static getInstance(): DemoConfigurationManager {
    if (!DemoConfigurationManager.instance) {
      DemoConfigurationManager.instance = new DemoConfigurationManager();
    }
    return DemoConfigurationManager.instance;
  }

  /**
   * Load configuration from VSCode settings
   */
  private loadConfiguration(): DemoConfiguration {
    const config = vscode.workspace.getConfiguration();

    return {
      // Mock Data Configuration
      responseDelay: config.get<number>("aidmVscodeExtension.mcpServer.timeout", 5000) / 10, // 10% of timeout
      errorRate: 0, // No errors in demo mode

      // UI Configuration
      hoverPopupTheme: config.get<"default" | "compact" | "detailed">(
        "aidmVscodeExtension.ui.hoverPopupTheme",
        "detailed"
      ),
      showProgressBars: config.get<boolean>("aidmVscodeExtension.ui.showProgressBars", true),
      maxRequirementsShown: config.get<number>("aidmVscodeExtension.ui.maxRequirementsShown", 3),

      // Performance Configuration
      maxConcurrentRequests: config.get<number>(
        "aidmVscodeExtension.performance.maxConcurrentRequests",
        10
      ),
      cacheEnabled: true, // Always enabled for demo
    };
  }

  /**
   * Get current configuration
   */
  public getConfiguration(): DemoConfiguration {
    return { ...this.currentConfig };
  }

  /**
   * Update configuration and notify listeners
   */
  public updateConfiguration(updates: Partial<DemoConfiguration>): void {
    this.currentConfig = { ...this.currentConfig, ...updates };
  }

  /**
   * Reload configuration from VSCode settings
   */
  public reloadConfiguration(): void {
    this.currentConfig = this.loadConfiguration();
  }

  /**
   * Get industry-specific demo scenarios
   */
  public getIndustryScenarios(): DemoScenario[] {
    const baseScenarios: DemoScenario[] = [
      {
        id: "user-authentication",
        title: "User Authentication System",
        description: "Secure multi-factor authentication with enterprise SSO",
        filePath: "src/demo/sampleFiles/UserService.ts",
        businessContext: {
          requirements: ["REQ-001: User Authentication System"],
          stakeholders: [
            "Security Team",
            "Compliance Officer",
            "Lead Developer",
          ],
          complianceFrameworks: ["SOX", "GDPR", "ISO-27001"],
        },
      },
      {
        id: "payment-processing",
        title: "Payment Processing Integration",
        description:
          "PCI DSS compliant payment processing with fraud detection",
        filePath: "src/demo/sampleFiles/PaymentProcessor.ts",
        businessContext: {
          requirements: ["REQ-002: Payment Processing Integration"],
          stakeholders: ["Finance Team", "Security Team", "Risk Management"],
          complianceFrameworks: ["PCI-DSS", "SOX", "GDPR"],
        },
      },
      {
        id: "dashboard-analytics",
        title: "Dashboard Analytics with ML",
        description: "Real-time analytics dashboard with predictive insights",
        filePath: "src/demo/sampleFiles/DashboardAnalytics.ts",
        businessContext: {
          requirements: [
            "REQ-005: Customer Dashboard",
            "REQ-010: Machine Learning Pipeline",
          ],
          stakeholders: ["Product Manager", "Data Science Team", "UX Designer"],
          complianceFrameworks: ["WCAG 2.1 AA", "GDPR"],
        },
      },
    ];

    // Note: Industry-specific scenarios removed

    return baseScenarios;
  }

  /**
   * Get demo data configuration
   */
  public getDemoDataConfiguration(): MockConfiguration {
    const baseConfig: MockConfiguration = {
      responseDelay: this.currentConfig.responseDelay,
      errorRate: this.currentConfig.errorRate,
    };

    return baseConfig;
  }

  /**
   * Get hover popup configuration
   */
  public getHoverConfiguration(): HoverConfiguration {
    return {
      theme: this.currentConfig.hoverPopupTheme,
      showProgressBars: this.currentConfig.showProgressBars,
      maxRequirementsShown: this.currentConfig.maxRequirementsShown,
    };
  }

  /**
   * Generate demo summary for documentation
   */
  public generateDemoSummary(): DemoSummary {
    const scenarios = this.getIndustryScenarios();

    return {
      configuration: this.currentConfig,
      scenarios: scenarios.map((s) => ({
        id: s.id,
        title: s.title,
        description: s.description,
        requirementCount: s.businessContext.requirements.length,
        stakeholderCount: s.businessContext.stakeholders.length,
        complianceFrameworks: s.businessContext.complianceFrameworks,
      })),
      metrics: {
        totalScenarios: scenarios.length,
        complianceFrameworks: [
          ...new Set(
            scenarios.flatMap((s) => s.businessContext.complianceFrameworks)
          ),
        ],
        estimatedDemoTime: scenarios.length * 3, // 3 minutes per scenario
      },
    };
  }
}

export interface DemoScenario {
  id: string;
  title: string;
  description: string;
  filePath: string;
  businessContext: {
    requirements: string[];
    stakeholders: string[];
    complianceFrameworks: string[];
  };
}

export interface HoverConfiguration {
  theme: "default" | "compact" | "detailed";
  showProgressBars: boolean;
  maxRequirementsShown: number;
}

export interface DemoSummary {
  configuration: DemoConfiguration;
  scenarios: {
    id: string;
    title: string;
    description: string;
    requirementCount: number;
    stakeholderCount: number;
    complianceFrameworks: string[];
  }[];
  metrics: {
    totalScenarios: number;
    complianceFrameworks: string[];
    estimatedDemoTime: number;
  };
}

// Export singleton instance
export const demoConfig = DemoConfigurationManager.getInstance();
