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
import { Task, TaskStatus, TaskComplexity } from "../types/tasks";

export interface MockConfiguration {
  dataSize: "small" | "medium" | "large";
  responseDelay: number;
  errorRate: number;
  enterprisePatterns: boolean;
  scenarioComplexity: "basic" | "intermediate" | "advanced";
  includeComplianceData: boolean;
  industryVertical:
    | "financial-services"
    | "healthcare"
    | "retail"
    | "manufacturing"
    | "technology"
    | "generic";
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
      scenarioComplexity: "intermediate",
      includeComplianceData: true,
      industryVertical: "financial-services",
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
   * Get basic tasks for testing and demonstration
   */
  async getTasks(): Promise<Task[]> {
    // Calculate timestamps relative to current time for realistic relative display
    const now = new Date();
    const hoursAgo = (hours: number) =>
      new Date(now.getTime() - hours * 60 * 60 * 1000).toISOString();
    const daysAgo = (days: number) =>
      new Date(now.getTime() - days * 24 * 60 * 60 * 1000).toISOString();

    return [
      {
        id: "1.1.1",
        title: "Create directory structure for task management components",
        description:
          "Set up the basic folder structure for task-related components in the extension.",
        status: TaskStatus.NOT_STARTED,
        complexity: TaskComplexity.LOW,
        dependencies: [], // Foundation task, no dependencies
        requirements: ["1.1"],
        createdDate: hoursAgo(2), // "2 hours ago"
        lastModified: hoursAgo(2), // Same as created (not modified)
        estimatedDuration: "15-20 min",
        isExecutable: true, // true because status is NOT_STARTED
        testStatus: undefined, // No tests yet for foundation task
      },
      {
        id: "2.1.1",
        title: "Create basic TasksDataService class structure",
        description:
          "Implement the foundational TasksDataService class with basic structure and interface.",
        status: TaskStatus.IN_PROGRESS,
        complexity: TaskComplexity.MEDIUM,
        dependencies: ["1.1.1"], // Depends on directory structure
        requirements: ["2.1"],
        createdDate: daysAgo(1), // "1 day ago"
        lastModified: hoursAgo(4), // "4 hours ago"
        estimatedDuration: "25-30 min",
        isExecutable: false, // false because status is IN_PROGRESS
        testStatus: {
          lastRunDate: "2024-08-22T14:30:00Z",
          totalTests: 12,
          passedTests: 9,
          failedTests: 3,
          failingTestsList: [
            {
              name: "should initialize TasksDataService correctly",
              message:
                "TypeError: Cannot read property 'mockDataProvider' of undefined",
              category: "type",
            },
            {
              name: "should handle HTTP timeout gracefully",
              message: "Error: Request timeout after 5000ms",
              category: "timeout",
            },
            {
              name: "should validate task data structure",
              message:
                "AssertionError: Expected object to have property 'estimatedDuration'",
              category: "assertion",
            },
          ],
          coverage: 78,
        },
      },
      {
        id: "3.1.1",
        title: "Create TaskWebviewProvider class with basic properties",
        description:
          "Implement TaskWebviewProvider extending vscode.WebviewViewProvider with required properties.",
        status: TaskStatus.COMPLETED,
        complexity: TaskComplexity.LOW,
        dependencies: ["1.1.1", "2.1.1"], // Depends on directory and data service
        requirements: ["1.1", "3.1"],
        createdDate: daysAgo(5), // "5 days ago"
        lastModified: daysAgo(2), // "2 days ago"
        estimatedDuration: "15-20 min",
        isExecutable: false, // false because status is COMPLETED
        testStatus: {
          lastRunDate: "2024-08-22T16:00:00Z",
          totalTests: 8,
          passedTests: 8,
          failedTests: 0,
          failingTestsList: [],
          coverage: 92,
        },
      },
      {
        id: "4.1.1",
        title: "Register TaskWebviewProvider in extension activate function",
        description:
          "Add vscode.window.registerWebviewViewProvider call to extension.ts activate function.",
        status: TaskStatus.COMPLETED,
        complexity: TaskComplexity.LOW,
        dependencies: ["3.1.1"], // Depends on webview provider creation
        requirements: ["10.1"],
        createdDate: hoursAgo(1), // "1 hour ago"
        lastModified: hoursAgo(1), // Same as created
        estimatedDuration: "10-15 min",
        isExecutable: false, // false because status is COMPLETED
        testStatus: {
          lastRunDate: "2024-08-22T16:00:00Z",
          totalTests: 12,
          passedTests: 12,
          failedTests: 0,
          failingTestsList: [],
          coverage: 95,
        },
      },
      {
        id: "4.2.2",
        title: "Add getTaskById method to MockDataProvider",
        description:
          "Implement lookup logic for individual tasks by ID with error handling.",
        status: TaskStatus.BLOCKED,
        complexity: TaskComplexity.MEDIUM,
        dependencies: ["4.2.1"], // Depends on basic mock data (4.2.1 represents completed 4.2.1a-d)
        requirements: ["11.6"],
        createdDate: hoursAgo(8), // "8 hours ago"
        lastModified: hoursAgo(3), // "3 hours ago"
        estimatedDuration: "15-20 min",
        isExecutable: false,
        testStatus: undefined, // No tests yet for blocked task
      },
      {
        id: "7.1.1",
        title: "Test complete extension activation workflow end-to-end",
        description:
          "Verify extension loads without errors and registers all components.",
        status: TaskStatus.REVIEW,
        complexity: TaskComplexity.HIGH,
        dependencies: ["4.1.1", "4.1.2"], // Depends on registration tasks
        requirements: ["7.1"],
        createdDate: daysAgo(7), // "7 days ago" / "1 week ago"
        lastModified: hoursAgo(6), // "6 hours ago"
        estimatedDuration: "20-25 min",
        isExecutable: false,
        testStatus: {
          lastRunDate: "2024-08-22T13:45:00Z",
          totalTests: 25,
          passedTests: 20,
          failedTests: 5,
          failingTestsList: [
            {
              name: "should register all extension components",
              message:
                "Error: TreeDataProvider not found in context.subscriptions",
              category: "assertion",
            },
            {
              name: "should handle file system permissions",
              message: "EACCES: permission denied, open '/usr/local/tasks.md'",
              category: "filesystem",
            },
            {
              name: "should connect to MCP server",
              message: "NetworkError: Connection refused on localhost:3000",
              category: "network",
            },
            {
              name: "should validate task status transitions",
              message: "TypeError: status.toLowerCase is not a function",
              category: "type",
            },
            {
              name: "should complete integration test within time limit",
              message: "TimeoutError: Test exceeded 10000ms timeout",
              category: "timeout",
            },
          ],
          coverage: 65,
        },
      },
      {
        id: "5.1.1",
        title: "Implement generateTaskPrompt command structure",
        description:
          "Register command for prompt-only generation with enhanced data.",
        status: TaskStatus.NOT_STARTED,
        complexity: TaskComplexity.MEDIUM,
        dependencies: ["4.4.1"], // Depends on command registration infrastructure
        requirements: ["8.5"],
        createdDate: hoursAgo(5), // "5 hours ago"
        lastModified: hoursAgo(5), // Same as created
        estimatedDuration: "20-25 min",
        isExecutable: true,
        testStatus: undefined, // No tests yet for command task
      },
      {
        id: "6.1.2",
        title: "Create enhanced ContextExtractor service structure",
        description:
          "Design service for extracting context from project files.",
        status: TaskStatus.DEPRECATED,
        complexity: TaskComplexity.HIGH,
        dependencies: [], // Standalone deprecated task
        requirements: ["8.2"],
        createdDate: daysAgo(14), // "2 weeks ago"
        lastModified: daysAgo(10), // "10 days ago"
        estimatedDuration: "20-25 min",
        isExecutable: false,
        testStatus: {
          lastRunDate: "2024-08-22T17:00:00Z",
          totalTests: 18,
          passedTests: 12,
          failedTests: 6,
          failingTestsList: [
            {
              name: "should extract context from legacy file formats",
              message: "Error: Unsupported file format detected",
              category: "assertion",
            },
            {
              name: "should handle deprecated API endpoints",
              message: "TypeError: Cannot read property 'legacy' of undefined",
              category: "type",
            },
            {
              name: "should validate deprecated configuration schema",
              message:
                "ValidationError: Schema version 1.0 is no longer supported",
              category: "assertion",
            },
            {
              name: "should process deprecated data sources",
              message: "Error: Data source 'legacy-db' has been deprecated",
              category: "filesystem",
            },
            {
              name: "should handle deprecated authentication methods",
              message: "SecurityError: Basic auth is no longer supported",
              category: "assertion",
            },
            {
              name: "should migrate deprecated data structures",
              message: "Error: Migration timeout after 30000ms",
              category: "timeout",
            },
          ],
          coverage: 45,
        },
      },
      {
        id: "8.1.2",
        title: "Initialize enhanced TasksDataService in extension",
        description:
          "Create and configure enhanced TasksDataService instance with dependencies.",
        status: TaskStatus.IN_PROGRESS,
        complexity: TaskComplexity.MEDIUM,
        dependencies: ["2.1.1", "4.1.1"], // Depends on data service and registration
        requirements: ["8.1"],
        createdDate: daysAgo(1), // "1 day ago"
        lastModified: hoursAgo(1), // "1 hour ago"
        estimatedDuration: "20-25 min",
        isExecutable: false,
        testStatus: {
          lastRunDate: "2024-08-22T15:20:00Z",
          totalTests: 15,
          passedTests: 12,
          failedTests: 3,
          failingTestsList: [
            {
              name: "should inject dependencies correctly",
              message: "Error: MockDataProvider is not properly instantiated",
              category: "assertion",
            },
            {
              name: "should handle service initialization errors",
              message: "ReferenceError: TasksDataService is not defined",
              category: "type",
            },
            {
              name: "should clean up resources on deactivation",
              message: "Error: Cannot call dispose() on undefined subscription",
              category: "assertion",
            },
          ],
          coverage: 82,
        },
      },
      {
        id: "3.2.10",
        title: "Implement accordion expansion behavior",
        description: "Ensure only one task expands at a time in the tree view.",
        status: TaskStatus.COMPLETED,
        complexity: TaskComplexity.LOW,
        dependencies: ["3.2.1", "3.2.2"], // Depends on tree view provider basics
        requirements: ["1.1"],
        createdDate: daysAgo(4), // "4 days ago"
        lastModified: daysAgo(3), // "3 days ago"
        estimatedDuration: "15-20 min",
        isExecutable: false,
        testStatus: {
          lastRunDate: "2024-08-22T16:30:00Z",
          totalTests: 6,
          passedTests: 6,
          failedTests: 0,
          failingTestsList: [],
          coverage: 95,
        },
      },
    ];
  }

  /**
   * Get task by ID with error handling
   */
  async getTaskById(id: string): Promise<Task | null> {
    if (!id || typeof id !== "string") {
      return null;
    }

    try {
      const tasks = await this.getTasks();
      const foundTask = tasks.find((task) => task.id === id);
      return foundTask || null;
    } catch (error) {
      console.error("Error retrieving task by ID:", error);
      return null;
    }
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
    // Get industry-specific and complexity-specific templates
    const requirementTemplates = this.getRequirementTemplates();

    const template = requirementTemplates[index % requirementTemplates.length];
    const priorities = Object.values(Priority);
    const statuses = Object.values(RequirementStatus);

    // Add compliance tags if enabled
    const tags = [...template.tags];
    if (this.config.includeComplianceData) {
      tags.push(...this.getComplianceTags(template.type));
    }

    // Add industry-specific tags
    tags.push(...this.getIndustryTags());

    return {
      id: `REQ-${String(index).padStart(3, "0")}`,
      title: `${template.title} ${index > 5 ? `(${index})` : ""}`,
      description: this.enhanceDescription(template.description),
      type: template.type,
      priority: priorities[Math.floor(Math.random() * priorities.length)],
      status: statuses[Math.floor(Math.random() * statuses.length)],
      stakeholders: this.generateStakeholders(),
      createdDate: this.generateRandomDate(-90, -30),
      lastModified: this.generateRandomDate(-30, 0),
      tags: [...new Set(tags)], // Remove duplicates
    };
  }

  private getRequirementTemplates() {
    const baseTemplates = [
      {
        title: "User Authentication System",
        description:
          "Implement secure user authentication with multi-factor support including OAuth 2.0, SAML, and biometric authentication. Must support enterprise SSO integration and comply with SOX requirements.",
        type: RequirementType.FUNCTIONAL,
        tags: [
          "security",
          "authentication",
          "user-management",
          "sso",
          "compliance",
        ],
      },
      {
        title: "Payment Processing Integration",
        description:
          "Integrate with external payment gateway for transaction processing. Support multiple payment methods including credit cards, ACH, wire transfers, and digital wallets. Must handle PCI DSS compliance and fraud detection.",
        type: RequirementType.FUNCTIONAL,
        tags: [
          "payment",
          "integration",
          "financial",
          "pci-dss",
          "fraud-detection",
        ],
      },
      {
        title: "Performance Optimization",
        description:
          "System must respond to user requests within 200ms for 95th percentile. Implement caching strategies, database optimization, and CDN integration. Support horizontal scaling for peak loads.",
        type: RequirementType.NON_FUNCTIONAL,
        tags: [
          "performance",
          "optimization",
          "response-time",
          "caching",
          "scaling",
        ],
      },
      {
        title: "Data Encryption Compliance",
        description:
          "All sensitive data must be encrypted at rest using AES-256 and in transit using TLS 1.3. Implement key rotation policies and maintain audit logs for compliance with GDPR and HIPAA.",
        type: RequirementType.TECHNICAL,
        tags: ["security", "encryption", "compliance", "gdpr", "hipaa"],
      },
      {
        title: "Customer Dashboard",
        description:
          "Provide customers with a comprehensive dashboard for account management including real-time analytics, transaction history, and predictive insights. Must be accessible (WCAG 2.1 AA) and mobile-responsive.",
        type: RequirementType.BUSINESS,
        tags: ["dashboard", "customer", "ui", "analytics", "accessibility"],
      },
    ];

    // Add complexity-specific templates
    if (this.config.scenarioComplexity === "advanced") {
      baseTemplates.push(...this.getAdvancedRequirementTemplates());
    } else if (this.config.scenarioComplexity === "intermediate") {
      baseTemplates.push(...this.getIntermediateRequirementTemplates());
    }

    // Add industry-specific templates
    baseTemplates.push(...this.getIndustrySpecificTemplates());

    return baseTemplates;
  }

  private getAdvancedRequirementTemplates() {
    return [
      {
        title: "Machine Learning Pipeline",
        description:
          "Build ML pipeline for predictive analytics and recommendation engine. Support model training, A/B testing, and automated deployment. Must handle real-time inference with sub-100ms latency.",
        type: RequirementType.BUSINESS,
        tags: [
          "machine-learning",
          "analytics",
          "recommendations",
          "pipeline",
          "inference",
        ],
      },
      {
        title: "Microservices Architecture",
        description:
          "Transition monolithic application to microservices architecture. Implement service mesh, API gateway, and distributed tracing. Support independent deployment and scaling of services.",
        type: RequirementType.TECHNICAL,
        tags: [
          "microservices",
          "architecture",
          "service-mesh",
          "api-gateway",
          "distributed",
        ],
      },
    ];
  }

  private getIntermediateRequirementTemplates() {
    return [
      {
        title: "API Rate Limiting",
        description:
          "Implement intelligent rate limiting for public APIs with tiered access levels. Support burst capacity and graceful degradation. Include monitoring and alerting for abuse detection.",
        type: RequirementType.TECHNICAL,
        tags: ["api", "rate-limiting", "monitoring", "security", "performance"],
      },
      {
        title: "Audit Trail System",
        description:
          "Comprehensive audit logging for all user actions and system events. Must support tamper-proof logs, real-time monitoring, and compliance reporting for SOX, GDPR, and industry regulations.",
        type: RequirementType.FUNCTIONAL,
        tags: ["audit", "logging", "compliance", "monitoring", "security"],
      },
    ];
  }

  private getIndustrySpecificTemplates() {
    switch (this.config.industryVertical) {
      case "healthcare":
        return [
          {
            title: "HIPAA Compliance Framework",
            description:
              "Implement comprehensive HIPAA compliance including PHI protection, access controls, and audit logging.",
            type: RequirementType.TECHNICAL,
            tags: ["hipaa", "phi", "healthcare", "compliance", "privacy"],
          },
          {
            title: "Patient Data Management",
            description:
              "Secure patient data management system with role-based access and consent management.",
            type: RequirementType.FUNCTIONAL,
            tags: [
              "patient-data",
              "healthcare",
              "consent",
              "privacy",
              "security",
            ],
          },
        ];
      case "retail":
        return [
          {
            title: "Inventory Management System",
            description:
              "Real-time inventory tracking with automated reordering and demand forecasting.",
            type: RequirementType.BUSINESS,
            tags: [
              "inventory",
              "retail",
              "forecasting",
              "automation",
              "supply-chain",
            ],
          },
          {
            title: "Customer Loyalty Program",
            description:
              "Comprehensive loyalty program with points, rewards, and personalized offers.",
            type: RequirementType.BUSINESS,
            tags: [
              "loyalty",
              "retail",
              "rewards",
              "personalization",
              "customer-engagement",
            ],
          },
        ];
      case "manufacturing":
        return [
          {
            title: "IoT Sensor Integration",
            description:
              "Integration with IoT sensors for real-time equipment monitoring and predictive maintenance.",
            type: RequirementType.TECHNICAL,
            tags: [
              "iot",
              "manufacturing",
              "sensors",
              "monitoring",
              "predictive-maintenance",
            ],
          },
          {
            title: "Supply Chain Optimization",
            description:
              "Optimize supply chain operations with real-time tracking and automated procurement.",
            type: RequirementType.BUSINESS,
            tags: [
              "supply-chain",
              "manufacturing",
              "optimization",
              "procurement",
              "tracking",
            ],
          },
        ];
      default:
        return [];
    }
  }

  private getComplianceTags(requirementType: RequirementType): string[] {
    const complianceTags = [];

    if (this.config.industryVertical === "financial-services") {
      complianceTags.push("sox", "pci-dss", "basel-iii");
    } else if (this.config.industryVertical === "healthcare") {
      complianceTags.push("hipaa", "hitech", "fda");
    }

    // Add general compliance tags
    complianceTags.push("gdpr", "ccpa", "iso-27001");

    return complianceTags;
  }

  private getIndustryTags(): string[] {
    return [this.config.industryVertical];
  }

  private enhanceDescription(baseDescription: string): string {
    if (this.config.scenarioComplexity === "basic") {
      return baseDescription;
    }

    // Add complexity-specific enhancements
    const enhancements = [];

    if (this.config.includeComplianceData) {
      enhancements.push(
        "Must comply with industry regulations and maintain comprehensive audit trails."
      );
    }

    if (this.config.scenarioComplexity === "advanced") {
      enhancements.push(
        "Implementation should follow enterprise architecture patterns and support high availability."
      );
    }

    return enhancements.length > 0
      ? `${baseDescription} ${enhancements.join(" ")}`
      : baseDescription;
  }

  private generateCodeMappings(count: number): void {
    const sampleFiles = [
      "src/auth/AuthService.ts",
      "src/auth/SSOProvider.ts",
      "src/auth/BiometricAuth.ts",
      "src/payment/PaymentProcessor.ts",
      "src/payment/FraudDetection.ts",
      "src/payment/PCICompliance.ts",
      "src/user/UserController.ts",
      "src/user/UserProfileService.ts",
      "src/dashboard/DashboardComponent.ts",
      "src/dashboard/AnalyticsWidget.ts",
      "src/dashboard/RealtimeUpdates.ts",
      "src/security/EncryptionUtil.ts",
      "src/security/KeyRotationService.ts",
      "src/security/AuditLogger.ts",
      "src/api/ApiController.ts",
      "src/api/RateLimiter.ts",
      "src/api/ApiGateway.ts",
      "src/models/User.ts",
      "src/models/Transaction.ts",
      "src/models/AuditEvent.ts",
      "src/services/NotificationService.ts",
      "src/services/EmailService.ts",
      "src/services/SMSService.ts",
      "src/migration/DataMigrator.ts",
      "src/migration/ValidationService.ts",
      "src/ml/RecommendationEngine.ts",
      "src/ml/ModelTrainer.ts",
      "src/ml/InferenceService.ts",
      "src/microservices/ServiceMesh.ts",
      "src/microservices/ServiceDiscovery.ts",
      "src/support/TicketManager.ts",
      "src/support/KnowledgeBase.ts",
      "src/support/LiveChat.ts",
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
      "Updated authentication logic to support OAuth 2.0 and SAML integration",
      "Fixed payment processing timeout issue affecting high-volume transactions",
      "Refactored user validation methods to improve performance by 40%",
      "Added AES-256 encryption for sensitive data fields with key rotation",
      "Improved dashboard loading performance through intelligent caching",
      "Updated API endpoints for better error handling and rate limiting",
      "Added comprehensive unit tests achieving 95% code coverage",
      "Updated documentation for new microservices architecture",
      "Implemented fraud detection algorithms reducing false positives by 60%",
      "Added real-time notification system with delivery guarantees",
      "Optimized database queries reducing response time from 500ms to 150ms",
      "Integrated machine learning pipeline for predictive analytics",
      "Added GDPR compliance features including data anonymization",
      "Implemented distributed tracing for microservices debugging",
      "Added automated security scanning to CI/CD pipeline",
      "Refactored legacy code to support horizontal scaling",
      "Added comprehensive audit logging for SOX compliance",
      "Implemented A/B testing framework for feature rollouts",
      "Added support for multi-tenant architecture",
      "Optimized memory usage reducing server costs by 30%",
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
      "Chief Technology Officer",
      "Compliance Officer",
      "Data Protection Officer",
      "Enterprise Architect",
      "Site Reliability Engineer",
      "Customer Success Manager",
      "Legal Counsel",
      "Risk Management Team",
      "Infrastructure Team",
      "Data Science Team",
      "Customer Support Lead",
      "Finance Team",
      "Audit Team",
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
