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

  // Demo Scenario Configuration
  scenarioComplexity: "basic" | "intermediate" | "advanced";
  includeComplianceData: boolean;
  industryVertical:
    | "financial-services"
    | "healthcare"
    | "retail"
    | "manufacturing"
    | "technology"
    | "generic";

  // Performance Configuration
  responseDelay: number;
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
      dataSize: config.get<"small" | "medium" | "large">(
        "aidmVscodeExtension.mock.dataSize",
        "medium"
      ),
      responseDelay: config.get<number>("aidmVscodeExtension.mcpServer.timeout", 5000) / 10, // 10% of timeout
      errorRate: 0, // No errors in demo mode
      enterprisePatterns: config.get<boolean>("aidmVscodeExtension.mock.enterprisePatterns", true),

      // Demo-specific Configuration
      scenarioComplexity: config.get<"basic" | "intermediate" | "advanced">(
        "aidmVscodeExtension.demo.scenarioComplexity",
        "intermediate"
      ),
      includeComplianceData: config.get<boolean>(
        "aidmVscodeExtension.demo.includeComplianceData",
        true
      ),
      industryVertical: config.get<
        | "financial-services"
        | "healthcare"
        | "retail"
        | "manufacturing"
        | "technology"
        | "generic"
      >("aidmVscodeExtension.demo.industryVertical", "financial-services"),

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

    // Add industry-specific scenarios
    switch (this.currentConfig.industryVertical) {
      case "healthcare":
        baseScenarios.push({
          id: "patient-data-management",
          title: "Patient Data Management",
          description:
            "HIPAA compliant patient data handling with consent management",
          filePath: "src/demo/sampleFiles/PatientService.ts",
          businessContext: {
            requirements: ["REQ-011: HIPAA Compliance Framework"],
            stakeholders: [
              "Chief Medical Officer",
              "Privacy Officer",
              "Compliance Team",
            ],
            complianceFrameworks: ["HIPAA", "HITECH", "FDA"],
          },
        });
        break;

      case "retail":
        baseScenarios.push({
          id: "inventory-management",
          title: "Inventory Management System",
          description: "Real-time inventory tracking with demand forecasting",
          filePath: "src/demo/sampleFiles/InventoryService.ts",
          businessContext: {
            requirements: ["REQ-012: Inventory Management System"],
            stakeholders: [
              "Operations Manager",
              "Supply Chain Team",
              "Data Analytics",
            ],
            complianceFrameworks: ["SOX", "GDPR"],
          },
        });
        break;

      case "manufacturing":
        baseScenarios.push({
          id: "iot-sensor-integration",
          title: "IoT Sensor Integration",
          description:
            "Real-time equipment monitoring with predictive maintenance",
          filePath: "src/demo/sampleFiles/IoTService.ts",
          businessContext: {
            requirements: ["REQ-013: IoT Sensor Integration"],
            stakeholders: [
              "Operations Manager",
              "Maintenance Team",
              "IoT Architect",
            ],
            complianceFrameworks: ["ISO-27001", "IEC-62443"],
          },
        });
        break;
    }

    return baseScenarios;
  }

  /**
   * Get complexity-appropriate demo data
   */
  public getDemoDataConfiguration(): MockConfiguration {
    const baseConfig: MockConfiguration = {
      dataSize: this.currentConfig.dataSize,
      responseDelay: this.currentConfig.responseDelay,
      errorRate: this.currentConfig.errorRate,
      enterprisePatterns: this.currentConfig.enterprisePatterns,
      scenarioComplexity: this.currentConfig.scenarioComplexity,
      includeComplianceData: this.currentConfig.includeComplianceData,
      industryVertical: this.currentConfig.industryVertical,
    };

    // Adjust data size based on complexity
    if (this.currentConfig.scenarioComplexity === "advanced") {
      baseConfig.dataSize = "large";
    } else if (this.currentConfig.scenarioComplexity === "basic") {
      baseConfig.dataSize = "small";
    }

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
      includeComplianceInfo: this.currentConfig.includeComplianceData,
      industryContext: this.currentConfig.industryVertical,
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
        industrySpecific: scenarios.filter((s) =>
          s.id.includes(this.currentConfig.industryVertical)
        ).length,
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
  includeComplianceInfo: boolean;
  industryContext: string;
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
    industrySpecific: number;
    complianceFrameworks: string[];
    estimatedDemoTime: number;
  };
}

// Export singleton instance
export const demoConfig = DemoConfigurationManager.getInstance();
