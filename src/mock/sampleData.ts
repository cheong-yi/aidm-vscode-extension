/**
 * Sample Enterprise Data
 * Realistic business requirements, code mappings, and change history for demonstration
 */

import {
  Requirement,
  RequirementType,
  Priority,
  RequirementStatus,
  CodeMapping,
  MappingType,
  SymbolType,
  Change,
  ChangeType,
} from "../types/business";

/**
 * Sample business requirements representing typical enterprise scenarios
 */
export const sampleRequirements: Requirement[] = [
  {
    id: "REQ-001",
    title: "Multi-Factor Authentication System",
    description:
      "Implement a comprehensive multi-factor authentication system supporting SMS, email, and authenticator app verification to enhance security for user accounts.",
    type: RequirementType.FUNCTIONAL,
    priority: Priority.CRITICAL,
    status: RequirementStatus.IN_PROGRESS,
    stakeholders: ["Security Team", "Product Manager", "Lead Developer"],
    createdDate: new Date("2024-01-15"),
    lastModified: new Date("2024-02-10"),
    tags: ["security", "authentication", "mfa", "user-management"],
  },
  {
    id: "REQ-002",
    title: "Payment Gateway Integration",
    description:
      "Integrate with Stripe payment gateway to process credit card transactions, handle webhooks, and manage subscription billing for enterprise customers.",
    type: RequirementType.FUNCTIONAL,
    priority: Priority.HIGH,
    status: RequirementStatus.APPROVED,
    stakeholders: ["Business Analyst", "Financial Team", "Lead Developer"],
    createdDate: new Date("2024-01-20"),
    lastModified: new Date("2024-02-05"),
    tags: ["payment", "integration", "stripe", "billing", "subscriptions"],
  },
  {
    id: "REQ-003",
    title: "API Response Time Performance",
    description:
      "All API endpoints must respond within 200ms for 95% of requests under normal load conditions to ensure optimal user experience.",
    type: RequirementType.NON_FUNCTIONAL,
    priority: Priority.HIGH,
    status: RequirementStatus.COMPLETED,
    stakeholders: ["Performance Team", "DevOps Engineer", "QA Engineer"],
    createdDate: new Date("2024-01-10"),
    lastModified: new Date("2024-02-15"),
    tags: ["performance", "api", "response-time", "sla"],
  },
  {
    id: "REQ-004",
    title: "Customer Dashboard Analytics",
    description:
      "Provide customers with a comprehensive dashboard showing usage analytics, billing history, and account management features with real-time data updates.",
    type: RequirementType.BUSINESS,
    priority: Priority.MEDIUM,
    status: RequirementStatus.DRAFT,
    stakeholders: ["Product Manager", "UX Designer", "Business Analyst"],
    createdDate: new Date("2024-02-01"),
    lastModified: new Date("2024-02-12"),
    tags: ["dashboard", "analytics", "customer", "real-time", "ui"],
  },
  {
    id: "REQ-005",
    title: "Data Encryption Compliance",
    description:
      "Implement AES-256 encryption for all sensitive data at rest and TLS 1.3 for data in transit to comply with SOC 2 Type II and GDPR requirements.",
    type: RequirementType.TECHNICAL,
    priority: Priority.CRITICAL,
    status: RequirementStatus.APPROVED,
    stakeholders: ["Security Team", "Compliance Officer", "Lead Developer"],
    createdDate: new Date("2024-01-05"),
    lastModified: new Date("2024-01-25"),
    tags: ["security", "encryption", "compliance", "gdpr", "soc2"],
  },
];

/**
 * Sample code mappings showing how requirements map to actual code implementations
 */
export const sampleCodeMappings: CodeMapping[] = [
  {
    requirementId: "REQ-001",
    codeLocation: {
      filePath: "src/auth/MFAService.ts",
      startLine: 15,
      endLine: 45,
      symbolName: "MFAService",
      symbolType: SymbolType.CLASS,
    },
    mappingType: MappingType.IMPLEMENTS,
    confidence: 0.95,
    lastVerified: new Date("2024-02-10"),
  },
  {
    requirementId: "REQ-001",
    codeLocation: {
      filePath: "src/auth/SMSProvider.ts",
      startLine: 20,
      endLine: 35,
      symbolName: "sendSMSCode",
      symbolType: SymbolType.FUNCTION,
    },
    mappingType: MappingType.IMPLEMENTS,
    confidence: 0.88,
    lastVerified: new Date("2024-02-08"),
  },
  {
    requirementId: "REQ-002",
    codeLocation: {
      filePath: "src/payment/StripeService.ts",
      startLine: 1,
      endLine: 120,
      symbolName: "StripeService",
      symbolType: SymbolType.CLASS,
    },
    mappingType: MappingType.IMPLEMENTS,
    confidence: 0.92,
    lastVerified: new Date("2024-02-05"),
  },
  {
    requirementId: "REQ-002",
    codeLocation: {
      filePath: "src/payment/WebhookHandler.ts",
      startLine: 25,
      endLine: 60,
      symbolName: "handleStripeWebhook",
      symbolType: SymbolType.FUNCTION,
    },
    mappingType: MappingType.IMPLEMENTS,
    confidence: 0.85,
    lastVerified: new Date("2024-02-03"),
  },
  {
    requirementId: "REQ-003",
    codeLocation: {
      filePath: "src/middleware/PerformanceMiddleware.ts",
      startLine: 10,
      endLine: 30,
      symbolName: "responseTimeTracker",
      symbolType: SymbolType.FUNCTION,
    },
    mappingType: MappingType.IMPLEMENTS,
    confidence: 0.9,
    lastVerified: new Date("2024-02-15"),
  },
  {
    requirementId: "REQ-003",
    codeLocation: {
      filePath: "src/__tests__/performance/api.performance.test.ts",
      startLine: 1,
      endLine: 50,
      symbolName: "API Performance Tests",
      symbolType: SymbolType.FUNCTION,
    },
    mappingType: MappingType.TESTS,
    confidence: 0.87,
    lastVerified: new Date("2024-02-14"),
  },
  {
    requirementId: "REQ-001",
    codeLocation: {
      filePath: "src/auth/AuthenticatorProvider.ts",
      startLine: 10,
      endLine: 40,
      symbolName: "AuthenticatorProvider",
      symbolType: SymbolType.CLASS,
    },
    mappingType: MappingType.IMPLEMENTS,
    confidence: 0.9,
    lastVerified: new Date("2024-02-01"),
  },
  {
    requirementId: "REQ-002",
    codeLocation: {
      filePath: "src/models/Payment.ts",
      startLine: 1,
      endLine: 50,
      symbolName: "Payment",
      symbolType: SymbolType.CLASS,
    },
    mappingType: MappingType.IMPLEMENTS,
    confidence: 0.88,
    lastVerified: new Date("2024-01-30"),
  },
  {
    requirementId: "REQ-003",
    codeLocation: {
      filePath: "src/cache/CacheService.ts",
      startLine: 1,
      endLine: 100,
      symbolName: "CacheService",
      symbolType: SymbolType.CLASS,
    },
    mappingType: MappingType.IMPLEMENTS,
    confidence: 0.85,
    lastVerified: new Date("2024-02-12"),
  },
  {
    requirementId: "REQ-003",
    codeLocation: {
      filePath: "src/middleware/CacheMiddleware.ts",
      startLine: 1,
      endLine: 50,
      symbolName: "CacheMiddleware",
      symbolType: SymbolType.CLASS,
    },
    mappingType: MappingType.IMPLEMENTS,
    confidence: 0.82,
    lastVerified: new Date("2024-02-10"),
  },
  {
    requirementId: "REQ-005",
    codeLocation: {
      filePath: "src/security/EncryptionService.ts",
      startLine: 1,
      endLine: 80,
      symbolName: "EncryptionService",
      symbolType: SymbolType.CLASS,
    },
    mappingType: MappingType.IMPLEMENTS,
    confidence: 0.93,
    lastVerified: new Date("2024-01-25"),
  },
  {
    requirementId: "REQ-005",
    codeLocation: {
      filePath: "src/models/EncryptedModel.ts",
      startLine: 1,
      endLine: 40,
      symbolName: "EncryptedModel",
      symbolType: SymbolType.CLASS,
    },
    mappingType: MappingType.IMPLEMENTS,
    confidence: 0.89,
    lastVerified: new Date("2024-01-22"),
  },
  {
    requirementId: "REQ-005",
    codeLocation: {
      filePath: "src/auth/MFAService.ts",
      startLine: 80,
      endLine: 95,
      symbolName: "encryptMFAData",
      symbolType: SymbolType.METHOD,
    },
    mappingType: MappingType.IMPLEMENTS,
    confidence: 0.87,
    lastVerified: new Date("2024-02-08"),
  },
  {
    requirementId: "REQ-005",
    codeLocation: {
      filePath: "src/payment/StripeService.ts",
      startLine: 100,
      endLine: 120,
      symbolName: "encryptPaymentData",
      symbolType: SymbolType.METHOD,
    },
    mappingType: MappingType.IMPLEMENTS,
    confidence: 0.91,
    lastVerified: new Date("2024-02-03"),
  },
];

/**
 * Sample change history showing evolution of requirements and implementations
 */
export const sampleChanges: Change[] = [
  {
    id: "CHG-001",
    type: ChangeType.FEATURE,
    description: "Initial implementation of MFA service with SMS support",
    author: "Sarah Johnson",
    timestamp: new Date("2024-01-20"),
    relatedRequirements: ["REQ-001"],
    codeChanges: [
      {
        filePath: "src/auth/MFAService.ts",
        startLine: 1,
        endLine: 50,
      },
      {
        filePath: "src/auth/SMSProvider.ts",
        startLine: 1,
        endLine: 40,
      },
    ],
  },
  {
    id: "CHG-002",
    type: ChangeType.FEATURE,
    description: "Added authenticator app support to MFA system",
    author: "Mike Chen",
    timestamp: new Date("2024-02-01"),
    relatedRequirements: ["REQ-001"],
    codeChanges: [
      {
        filePath: "src/auth/AuthenticatorProvider.ts",
        startLine: 1,
        endLine: 60,
      },
      {
        filePath: "src/auth/MFAService.ts",
        startLine: 45,
        endLine: 80,
      },
    ],
  },
  {
    id: "CHG-003",
    type: ChangeType.FEATURE,
    description: "Integrated Stripe payment gateway with webhook handling",
    author: "Emily Davis",
    timestamp: new Date("2024-01-25"),
    relatedRequirements: ["REQ-002"],
    codeChanges: [
      {
        filePath: "src/payment/StripeService.ts",
        startLine: 1,
        endLine: 120,
      },
      {
        filePath: "src/payment/WebhookHandler.ts",
        startLine: 1,
        endLine: 80,
      },
    ],
  },
  {
    id: "CHG-004",
    type: ChangeType.BUG_FIX,
    description: "Fixed payment webhook signature validation issue",
    author: "Alex Rodriguez",
    timestamp: new Date("2024-02-03"),
    relatedRequirements: ["REQ-002"],
    codeChanges: [
      {
        filePath: "src/payment/WebhookHandler.ts",
        startLine: 25,
        endLine: 35,
      },
    ],
  },
  {
    id: "CHG-005",
    type: ChangeType.REFACTOR,
    description: "Optimized API response times by implementing caching layer",
    author: "Lisa Wang",
    timestamp: new Date("2024-02-10"),
    relatedRequirements: ["REQ-003"],
    codeChanges: [
      {
        filePath: "src/cache/CacheService.ts",
        startLine: 1,
        endLine: 100,
      },
      {
        filePath: "src/middleware/CacheMiddleware.ts",
        startLine: 1,
        endLine: 50,
      },
    ],
  },
  {
    id: "CHG-006",
    type: ChangeType.FEATURE,
    description: "Implemented AES-256 encryption for sensitive data storage",
    author: "John Smith",
    timestamp: new Date("2024-01-18"),
    relatedRequirements: ["REQ-005"],
    codeChanges: [
      {
        filePath: "src/security/EncryptionService.ts",
        startLine: 1,
        endLine: 80,
      },
      {
        filePath: "src/models/EncryptedModel.ts",
        startLine: 1,
        endLine: 40,
      },
    ],
  },
  {
    id: "CHG-007",
    type: ChangeType.TEST,
    description: "Added comprehensive unit tests for encryption service",
    author: "Jane Doe",
    timestamp: new Date("2024-01-22"),
    relatedRequirements: ["REQ-005"],
    codeChanges: [
      {
        filePath: "src/__tests__/security/EncryptionService.test.ts",
        startLine: 1,
        endLine: 150,
      },
    ],
  },
  {
    id: "CHG-008",
    type: ChangeType.DOCUMENTATION,
    description: "Updated API documentation for MFA endpoints",
    author: "Bob Wilson",
    timestamp: new Date("2024-02-05"),
    relatedRequirements: ["REQ-001"],
    codeChanges: [
      {
        filePath: "docs/api/authentication.md",
        startLine: 50,
        endLine: 100,
      },
    ],
  },
];

/**
 * Enterprise scenario mappings showing typical business-to-code relationships
 */
export const enterpriseScenarios = {
  "User Authentication Flow": {
    requirements: ["REQ-001", "REQ-005"],
    files: [
      "src/auth/MFAService.ts",
      "src/auth/SMSProvider.ts",
      "src/auth/AuthenticatorProvider.ts",
      "src/security/EncryptionService.ts",
    ],
    description:
      "Complete user authentication system with multi-factor authentication and encryption",
  },
  "Payment Processing System": {
    requirements: ["REQ-002"],
    files: [
      "src/payment/StripeService.ts",
      "src/payment/WebhookHandler.ts",
      "src/models/Payment.ts",
    ],
    description: "End-to-end payment processing with third-party integration",
  },
  "Performance Optimization": {
    requirements: ["REQ-003"],
    files: [
      "src/middleware/PerformanceMiddleware.ts",
      "src/cache/CacheService.ts",
      "src/middleware/CacheMiddleware.ts",
    ],
    description: "System performance monitoring and optimization features",
  },
  "Security and Compliance": {
    requirements: ["REQ-001", "REQ-005"],
    files: [
      "src/security/EncryptionService.ts",
      "src/auth/MFAService.ts",
      "src/models/EncryptedModel.ts",
    ],
    description:
      "Comprehensive security implementation for enterprise compliance",
  },
};

/**
 * Sample file-to-context mappings for demonstration
 */
export const fileContextMappings = new Map<string, string[]>([
  ["src/auth/MFAService.ts", ["REQ-001", "REQ-005"]], // MFA uses encryption
  ["src/auth/SMSProvider.ts", ["REQ-001"]],
  ["src/auth/AuthenticatorProvider.ts", ["REQ-001"]],
  ["src/payment/StripeService.ts", ["REQ-002", "REQ-005"]], // Payment uses encryption
  ["src/payment/WebhookHandler.ts", ["REQ-002"]],
  ["src/models/Payment.ts", ["REQ-002"]],
  ["src/middleware/PerformanceMiddleware.ts", ["REQ-003"]],
  ["src/cache/CacheService.ts", ["REQ-003"]],
  ["src/middleware/CacheMiddleware.ts", ["REQ-003"]],
  ["src/__tests__/performance/api.performance.test.ts", ["REQ-003"]],
  ["src/security/EncryptionService.ts", ["REQ-005"]],
  ["src/models/EncryptedModel.ts", ["REQ-005"]],
]);
