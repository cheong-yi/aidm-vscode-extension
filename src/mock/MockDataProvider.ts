/**
 * Mock Data Provider
 * Generates realistic enterprise data for demonstration and testing
 */

import {
  Requirement,
  RequirementType,
  Priority,
  RequirementStatus,
  CodeMapping,
  CodeLocation,
  MappingType,
  SymbolType,
  Change,
  ChangeType,
  BusinessContext,
  ImplementationStatus,
} from "../types/business";

export interface MockConfiguration {
  dataSize: "small" | "medium" | "large";
  responseDelay: number;
  errorRate: number;
  enterprisePatterns: boolean;
}

export class MockDataProvider {
  private requirements: Map<string, Requirement> = new Map();
  private codeMappings: Map<string, CodeMapping[]> = new Map();
  private changes: Map<string, Change[]> = new Map();
  private config: MockConfiguration;

  constructor(config: Partial<MockConfiguration> = {}) {
    this.config = {
      dataSize: "medium",
      responseDelay: 100,
      errorRate: 0,
      enterprisePatterns: true,
      ...config,
    };

    this.generateMockData();
  }

  /**
   * Get business context for a specific code location
   */
  async getContextForFile(filePath: string): Promise<BusinessContext[]> {
    await this.simulateDelay();

    if (this.shouldSimulateError()) {
      throw new Error("Mock data provider error");
    }

    const mappings = this.codeMappings.get(filePath) || [];
    const contexts: BusinessContext[] = [];

    for (const mapping of mappings) {
      const requirement = this.requirements.get(mapping.requirementId);
      if (requirement) {
        const relatedChanges = this.changes.get(mapping.requirementId) || [];

        contexts.push({
          requirements: [requirement],
          implementationStatus: this.generateImplementationStatus(),
          relatedChanges,
          lastUpdated: new Date(),
        });
      }
    }

    return contexts;
  }

  /**
   * Get requirement by ID
   */
  async getRequirementById(id: string): Promise<Requirement | null> {
    await this.simulateDelay();

    if (this.shouldSimulateError()) {
      throw new Error("Mock data provider error");
    }

    return this.requirements.get(id) || null;
  }

  /**
   * Get all requirements (for testing purposes)
   */
  getAllRequirements(): Requirement[] {
    return Array.from(this.requirements.values());
  }

  /**
   * Get all code mappings (for testing purposes)
   */
  getAllCodeMappings(): Map<string, CodeMapping[]> {
    return new Map(this.codeMappings);
  }

  /**
   * Generate mock data based on configuration
   */
  private generateMockData(): void {
    const dataSize = this.getDataSize();

    // Generate requirements
    for (let i = 1; i <= dataSize.requirements; i++) {
      const requirement = this.generateRequirement(i);
      this.requirements.set(requirement.id, requirement);
    }

    // Generate code mappings
    this.generateCodeMappings(dataSize.mappings);

    // Generate changes
    this.generateChanges(dataSize.changes);
  }

  private getDataSize() {
    switch (this.config.dataSize) {
      case "small":
        return { requirements: 10, mappings: 15, changes: 20 };
      case "medium":
        return { requirements: 25, mappings: 40, changes: 60 };
      case "large":
        return { requirements: 50, mappings: 100, changes: 150 };
    }
  }

  private generateRequirement(index: number): Requirement {
    const requirementTemplates = [
      {
        title: "User Authentication System",
        description:
          "Implement secure user authentication with multi-factor support",
        type: RequirementType.FUNCTIONAL,
        tags: ["security", "authentication", "user-management"],
      },
      {
        title: "Payment Processing Integration",
        description:
          "Integrate with external payment gateway for transaction processing",
        type: RequirementType.FUNCTIONAL,
        tags: ["payment", "integration", "financial"],
      },
      {
        title: "Performance Optimization",
        description: "System must respond to user requests within 200ms",
        type: RequirementType.NON_FUNCTIONAL,
        tags: ["performance", "optimization", "response-time"],
      },
      {
        title: "Data Encryption Compliance",
        description:
          "All sensitive data must be encrypted at rest and in transit",
        type: RequirementType.TECHNICAL,
        tags: ["security", "encryption", "compliance"],
      },
      {
        title: "Customer Dashboard",
        description:
          "Provide customers with a comprehensive dashboard for account management",
        type: RequirementType.BUSINESS,
        tags: ["dashboard", "customer", "ui"],
      },
    ];

    const template = requirementTemplates[index % requirementTemplates.length];
    const priorities = Object.values(Priority);
    const statuses = Object.values(RequirementStatus);

    return {
      id: `REQ-${String(index).padStart(3, "0")}`,
      title: `${template.title} ${index > 5 ? `(${index})` : ""}`,
      description: template.description,
      type: template.type,
      priority: priorities[Math.floor(Math.random() * priorities.length)],
      status: statuses[Math.floor(Math.random() * statuses.length)],
      stakeholders: this.generateStakeholders(),
      createdDate: this.generateRandomDate(-90, -30),
      lastModified: this.generateRandomDate(-30, 0),
      tags: template.tags,
    };
  }

  private generateCodeMappings(count: number): void {
    const sampleFiles = [
      "src/auth/AuthService.ts",
      "src/payment/PaymentProcessor.ts",
      "src/user/UserController.ts",
      "src/dashboard/DashboardComponent.ts",
      "src/security/EncryptionUtil.ts",
      "src/api/ApiController.ts",
      "src/models/User.ts",
      "src/services/NotificationService.ts",
    ];

    const requirements = Array.from(this.requirements.keys());

    for (let i = 0; i < count; i++) {
      const filePath =
        sampleFiles[Math.floor(Math.random() * sampleFiles.length)];
      const requirementId =
        requirements[Math.floor(Math.random() * requirements.length)];

      const mapping: CodeMapping = {
        requirementId,
        codeLocation: this.generateCodeLocation(filePath),
        mappingType: this.getRandomEnumValue(MappingType),
        confidence: Math.random() * 0.4 + 0.6, // 0.6 to 1.0
        lastVerified: this.generateRandomDate(-7, 0),
      };

      if (!this.codeMappings.has(filePath)) {
        this.codeMappings.set(filePath, []);
      }
      this.codeMappings.get(filePath)!.push(mapping);
    }
  }

  private generateCodeLocation(filePath: string): CodeLocation {
    const startLine = Math.floor(Math.random() * 100) + 1;
    const endLine = startLine + Math.floor(Math.random() * 20) + 1;

    const symbolNames = [
      "authenticate",
      "processPayment",
      "validateUser",
      "encryptData",
      "handleRequest",
      "UserService",
      "PaymentGateway",
      "SecurityManager",
    ];

    return {
      filePath,
      startLine,
      endLine,
      symbolName: symbolNames[Math.floor(Math.random() * symbolNames.length)],
      symbolType: this.getRandomEnumValue(SymbolType),
    };
  }

  private generateChanges(count: number): void {
    const requirements = Array.from(this.requirements.keys());

    for (let i = 0; i < count; i++) {
      const requirementId =
        requirements[Math.floor(Math.random() * requirements.length)];

      const change: Change = {
        id: `CHG-${String(i + 1).padStart(3, "0")}`,
        type: this.getRandomEnumValue(ChangeType),
        description: this.generateChangeDescription(),
        author: this.generateAuthor(),
        timestamp: this.generateRandomDate(-30, 0),
        relatedRequirements: [requirementId],
        codeChanges: [this.generateCodeLocation("src/example/file.ts")],
      };

      if (!this.changes.has(requirementId)) {
        this.changes.set(requirementId, []);
      }
      this.changes.get(requirementId)!.push(change);
    }
  }

  private generateChangeDescription(): string {
    const descriptions = [
      "Updated authentication logic to support OAuth 2.0",
      "Fixed payment processing timeout issue",
      "Refactored user validation methods",
      "Added encryption for sensitive data fields",
      "Improved dashboard loading performance",
      "Updated API endpoints for better error handling",
      "Added unit tests for core functionality",
      "Updated documentation for new features",
    ];

    return descriptions[Math.floor(Math.random() * descriptions.length)];
  }

  private generateStakeholders(): string[] {
    const stakeholders = [
      "Product Manager",
      "Lead Developer",
      "Security Team",
      "QA Engineer",
      "Business Analyst",
      "UX Designer",
      "DevOps Engineer",
    ];

    const count = Math.floor(Math.random() * 3) + 1;
    const selected: string[] = [];

    for (let i = 0; i < count; i++) {
      const stakeholder =
        stakeholders[Math.floor(Math.random() * stakeholders.length)];
      if (!selected.includes(stakeholder)) {
        selected.push(stakeholder);
      }
    }

    return selected;
  }

  private generateAuthor(): string {
    const authors = [
      "John Smith",
      "Sarah Johnson",
      "Mike Chen",
      "Emily Davis",
      "Alex Rodriguez",
      "Lisa Wang",
    ];

    return authors[Math.floor(Math.random() * authors.length)];
  }

  private generateImplementationStatus(): ImplementationStatus {
    return {
      completionPercentage: Math.floor(Math.random() * 100),
      lastVerified: this.generateRandomDate(-7, 0),
      verifiedBy: this.generateAuthor(),
      notes: Math.random() > 0.5 ? "Implementation on track" : undefined,
    };
  }

  private generateRandomDate(minDaysAgo: number, maxDaysAgo: number): Date {
    const now = new Date();
    const daysAgo =
      Math.floor(Math.random() * (maxDaysAgo - minDaysAgo + 1)) + minDaysAgo;
    return new Date(now.getTime() + daysAgo * 24 * 60 * 60 * 1000);
  }

  private getRandomEnumValue<T>(enumObject: T): T[keyof T] {
    const values = Object.values(enumObject as any);
    return values[Math.floor(Math.random() * values.length)] as T[keyof T];
  }

  private async simulateDelay(): Promise<void> {
    if (this.config.responseDelay > 0) {
      await new Promise((resolve) =>
        setTimeout(resolve, this.config.responseDelay)
      );
    }
  }

  private shouldSimulateError(): boolean {
    return Math.random() < this.config.errorRate;
  }
}
