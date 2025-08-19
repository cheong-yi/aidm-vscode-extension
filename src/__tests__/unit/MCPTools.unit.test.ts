/**
 * Unit tests for MCP Tools functionality
 * Tests individual tool methods and validation logic
 */

import { SimpleMCPServer } from "../../server/SimpleMCPServer";
import { ContextManager } from "../../server/ContextManager";
import { MockDataProvider } from "../../mock/MockDataProvider";
import {
  BusinessContext,
  CodeLocation,
  RequirementType,
  Priority,
  RequirementStatus,
  ChangeType,
} from "../../types/business";

describe("MCP Tools Unit Tests", () => {
  let mcpServer: SimpleMCPServer;
  let contextManager: ContextManager;
  let mockDataProvider: MockDataProvider;

  beforeEach(() => {
    mockDataProvider = new MockDataProvider();
    contextManager = new ContextManager(mockDataProvider);
    mcpServer = new SimpleMCPServer(3000, contextManager);
  });

  describe("Tool Argument Validation", () => {
    it("should validate get_business_context arguments correctly", () => {
      // Access private method for testing
      const validateArgs = (mcpServer as any).validateToolArguments.bind(
        mcpServer
      );

      // Valid arguments
      expect(
        validateArgs("get_business_context", {
          filePath: "src/test.ts",
          startLine: 1,
          endLine: 10,
        })
      ).toBeNull();

      // Missing filePath
      expect(
        validateArgs("get_business_context", {
          startLine: 1,
          endLine: 10,
        })
      ).toContain("filePath is required");

      // Invalid startLine
      expect(
        validateArgs("get_business_context", {
          filePath: "src/test.ts",
          startLine: 0,
          endLine: 10,
        })
      ).toContain("startLine is required and must be a positive number");

      // endLine < startLine
      expect(
        validateArgs("get_business_context", {
          filePath: "src/test.ts",
          startLine: 10,
          endLine: 5,
        })
      ).toContain("endLine must be greater than or equal to startLine");

      // Invalid symbolName type
      expect(
        validateArgs("get_business_context", {
          filePath: "src/test.ts",
          startLine: 1,
          endLine: 10,
          symbolName: 123,
        })
      ).toContain("symbolName must be a string");
    });

    it("should validate get_requirement_details arguments correctly", () => {
      const validateArgs = (mcpServer as any).validateToolArguments.bind(
        mcpServer
      );

      // Valid arguments
      expect(
        validateArgs("get_requirement_details", {
          requirementId: "REQ-001",
        })
      ).toBeNull();

      expect(
        validateArgs("get_requirement_details", {
          requirementId: "USER_AUTH_123",
        })
      ).toBeNull();

      // Missing requirementId
      expect(validateArgs("get_requirement_details", {})).toContain(
        "requirementId is required"
      );

      // Invalid characters
      expect(
        validateArgs("get_requirement_details", {
          requirementId: "REQ@001!",
        })
      ).toContain("must contain only alphanumeric characters");

      // Invalid type
      expect(
        validateArgs("get_requirement_details", {
          requirementId: 123,
        })
      ).toContain("requirementId is required and must be a string");
    });

    it("should reject unknown tools", () => {
      const validateArgs = (mcpServer as any).validateToolArguments.bind(
        mcpServer
      );

      expect(validateArgs("unknown_tool", {})).toContain("Unknown tool");
    });

    it("should reject non-object arguments", () => {
      const validateArgs = (mcpServer as any).validateToolArguments.bind(
        mcpServer
      );

      expect(validateArgs("get_business_context", null)).toContain(
        "Arguments must be a valid object"
      );
      expect(validateArgs("get_business_context", "string")).toContain(
        "Arguments must be a valid object"
      );
      expect(validateArgs("get_business_context", 123)).toContain(
        "Arguments must be a valid object"
      );
    });
  });

  describe("Business Context Formatting", () => {
    it("should include all required data elements", () => {
      const formatMethod = (mcpServer as any).formatBusinessContextForAI.bind(
        mcpServer
      );

      const mockContext: BusinessContext = {
        requirements: [
          {
            id: "REQ-001",
            title: "User Authentication",
            description: "Implement secure user authentication system",
            type: RequirementType.FUNCTIONAL,
            priority: Priority.HIGH,
            status: RequirementStatus.IN_PROGRESS,
            stakeholders: ["Product Manager", "Security Team"],
            tags: ["security", "authentication"],
            createdDate: new Date("2024-01-01"),
            lastModified: new Date("2024-01-15"),
          },
        ],
        implementationStatus: {
          completionPercentage: 75,
          lastVerified: new Date("2024-01-10"),
          verifiedBy: "John Doe",
          notes: "Core functionality implemented, testing in progress",
        },
        relatedChanges: [
          {
            id: "CHG-001",
            type: ChangeType.FEATURE,
            description: "Added password hashing",
            author: "Jane Smith",
            timestamp: new Date("2024-01-12"),
            relatedRequirements: ["REQ-001"],
            codeChanges: [],
          },
        ],
        lastUpdated: new Date("2024-01-15"),
      };

      const codeLocation: CodeLocation = {
        filePath: "src/auth/UserService.ts",
        startLine: 10,
        endLine: 25,
        symbolName: "authenticateUser",
      };

      const formatted = formatMethod(mockContext, codeLocation);

      // Test that all data elements are present (maintainable approach)
      const requirement = mockContext.requirements[0];
      const implementation = mockContext.implementationStatus;
      const change = mockContext.relatedChanges[0];

      // Code location info
      expect(formatted).toContain(codeLocation.filePath);
      expect(formatted).toContain(codeLocation.symbolName!);

      // Requirement data (uses actual enum values)
      expect(formatted).toContain(requirement.id);
      expect(formatted).toContain(requirement.title);
      expect(formatted).toContain(requirement.description);
      expect(formatted).toContain(requirement.type);
      expect(formatted).toContain(requirement.priority);
      expect(formatted).toContain(requirement.status);

      // Arrays should be included
      requirement.stakeholders.forEach((stakeholder) => {
        expect(formatted).toContain(stakeholder);
      });
      requirement.tags.forEach((tag) => {
        expect(formatted).toContain(tag);
      });

      // Implementation status
      expect(formatted).toContain(
        implementation.completionPercentage.toString()
      );
      expect(formatted).toContain(implementation.verifiedBy);
      if (implementation.notes) {
        expect(formatted).toContain(implementation.notes);
      }

      // Related changes
      expect(formatted).toContain(change.description);
      expect(formatted).toContain(change.author);
      expect(formatted).toContain(change.type);
    });

    it("should format complete business context correctly", () => {
      const formatMethod = (mcpServer as any).formatBusinessContextForAI.bind(
        mcpServer
      );

      const mockContext: BusinessContext = {
        requirements: [
          {
            id: "REQ-001",
            title: "User Authentication",
            description: "Implement secure user authentication system",
            type: RequirementType.FUNCTIONAL,
            priority: Priority.HIGH,
            status: RequirementStatus.IN_PROGRESS,
            stakeholders: ["Product Manager", "Security Team"],
            tags: ["security", "authentication"],
            createdDate: new Date("2024-01-01"),
            lastModified: new Date("2024-01-15"),
          },
        ],
        implementationStatus: {
          completionPercentage: 75,
          lastVerified: new Date("2024-01-10"),
          verifiedBy: "John Doe",
          notes: "Core functionality implemented, testing in progress",
        },
        relatedChanges: [
          {
            id: "CHG-001",
            type: ChangeType.FEATURE,
            description: "Added password hashing",
            author: "Jane Smith",
            timestamp: new Date("2024-01-12"),
            relatedRequirements: ["REQ-001"],
            codeChanges: [],
          },
        ],
        lastUpdated: new Date("2024-01-15"),
      };

      const codeLocation: CodeLocation = {
        filePath: "src/auth/UserService.ts",
        startLine: 10,
        endLine: 25,
        symbolName: "authenticateUser",
      };

      const formatted = formatMethod(mockContext, codeLocation);

      expect(formatted).toContain(
        "# Business Context for src/auth/UserService.ts:10-25"
      );
      expect(formatted).toContain("**Symbol:** authenticateUser");
      expect(formatted).toContain("## Requirements");
      expect(formatted).toContain("### 1. User Authentication");
      expect(formatted).toContain("- **ID:** REQ-001");
      expect(formatted).toContain(`- **Type:** ${RequirementType.FUNCTIONAL}`);
      expect(formatted).toContain(`- **Priority:** ${Priority.HIGH}`);
      expect(formatted).toContain(
        `- **Status:** ${RequirementStatus.IN_PROGRESS}`
      );
      expect(formatted).toContain(
        "- **Stakeholders:** Product Manager, Security Team"
      );
      expect(formatted).toContain("- **Tags:** security, authentication");
      expect(formatted).toContain("## Implementation Status");
      expect(formatted).toContain("- **Completion:** 75% complete");
      expect(formatted).toContain("- **Verified By:** John Doe");
      expect(formatted).toContain(
        "- **Notes:** Core functionality implemented"
      );
      expect(formatted).toContain("## Recent Changes");
      expect(formatted).toContain("### 1. Added password hashing");
      expect(formatted).toContain("- **Author:** Jane Smith");
    });

    it("should handle empty business context gracefully", () => {
      const formatMethod = (mcpServer as any).formatBusinessContextForAI.bind(
        mcpServer
      );

      const emptyContext: BusinessContext = {
        requirements: [],
        implementationStatus: {
          completionPercentage: 0,
          lastVerified: new Date(),
          verifiedBy: "System",
        },
        relatedChanges: [],
        lastUpdated: new Date(),
      };

      const codeLocation: CodeLocation = {
        filePath: "src/utils/helper.ts",
        startLine: 1,
        endLine: 5,
      };

      const formatted = formatMethod(emptyContext, codeLocation);

      expect(formatted).toContain("No business context available");
      expect(formatted).toContain("src/utils/helper.ts:1-5");
      expect(formatted).toContain("Infrastructure or utility code");
      expect(formatted).toContain("Recently added code");
    });
  });

  describe("Requirement Details Formatting", () => {
    it("should format requirement details correctly", () => {
      const formatMethod = (
        mcpServer as any
      ).formatRequirementDetailsForAI.bind(mcpServer);

      const mockRequirement = {
        id: "REQ-002",
        title: "Data Validation",
        description:
          "Implement comprehensive input validation for all user inputs",
        type: RequirementType.NON_FUNCTIONAL,
        priority: Priority.MEDIUM,
        status: RequirementStatus.APPROVED,
        stakeholders: ["Development Team", "QA Team"],
        tags: ["validation", "security", "data-integrity"],
        createdDate: new Date("2024-01-05"),
        lastModified: new Date("2024-01-20"),
        acceptanceCriteria: [
          "All user inputs must be validated before processing",
          "Invalid inputs must return appropriate error messages",
          "Validation rules must be configurable",
        ],
        dependencies: ["REQ-001"],
        risks: [
          "Performance impact from extensive validation",
          "Complexity in maintaining validation rules",
        ],
      };

      const formatted = formatMethod(mockRequirement);

      expect(formatted).toContain("# Requirement Details: Data Validation");
      expect(formatted).toContain("**ID:** REQ-002");
      expect(formatted).toContain(
        `**Type:** ${RequirementType.NON_FUNCTIONAL}`
      );
      expect(formatted).toContain(`**Priority:** ${Priority.MEDIUM}`);
      expect(formatted).toContain(`**Status:** ${RequirementStatus.APPROVED}`);
      expect(formatted).toContain("## Description");
      expect(formatted).toContain("Implement comprehensive input validation");
      expect(formatted).toContain("## Stakeholders");
      expect(formatted).toContain("Development Team, QA Team");
      expect(formatted).toContain("## Tags");
      expect(formatted).toContain("validation, security, data-integrity");
      expect(formatted).toContain("## Acceptance Criteria");
      expect(formatted).toContain("1. All user inputs must be validated");
      expect(formatted).toContain("2. Invalid inputs must return appropriate");
      expect(formatted).toContain("3. Validation rules must be configurable");
      expect(formatted).toContain("## Dependencies");
      expect(formatted).toContain("REQ-001");
      expect(formatted).toContain("## Risks");
      expect(formatted).toContain(
        "1. Performance impact from extensive validation"
      );
      expect(formatted).toContain(
        "2. Complexity in maintaining validation rules"
      );
    });

    it("should handle minimal requirement data", () => {
      const formatMethod = (
        mcpServer as any
      ).formatRequirementDetailsForAI.bind(mcpServer);

      const minimalRequirement = {
        id: "REQ-003",
        title: "Simple Feature",
        description: "A basic feature implementation",
        type: RequirementType.FUNCTIONAL,
        priority: Priority.LOW,
        status: RequirementStatus.DRAFT,
        stakeholders: [],
        tags: [],
        createdDate: new Date("2024-01-01"),
        lastModified: new Date("2024-01-01"),
      };

      const formatted = formatMethod(minimalRequirement);

      expect(formatted).toContain("# Requirement Details: Simple Feature");
      expect(formatted).toContain("**ID:** REQ-003");
      expect(formatted).toContain("A basic feature implementation");
      expect(formatted).not.toContain("## Stakeholders");
      expect(formatted).not.toContain("## Tags");
      expect(formatted).not.toContain("## Acceptance Criteria");
      expect(formatted).not.toContain("## Dependencies");
      expect(formatted).not.toContain("## Risks");
    });
  });

  describe("Server Statistics and Configuration", () => {
    it("should return correct server statistics", () => {
      const stats = mcpServer.getServerStats();

      expect(stats).toHaveProperty("isRunning");
      expect(stats).toHaveProperty("activeRequests");
      expect(stats).toHaveProperty("maxConcurrentRequests");
      expect(stats).toHaveProperty("totalRequestsProcessed");
      expect(typeof stats.isRunning).toBe("boolean");
      expect(typeof stats.activeRequests).toBe("number");
      expect(typeof stats.maxConcurrentRequests).toBe("number");
      expect(typeof stats.totalRequestsProcessed).toBe("number");
    });

    it("should update configuration correctly", () => {
      const initialStats = mcpServer.getServerStats();
      const initialMaxRequests = initialStats.maxConcurrentRequests;

      mcpServer.updateConfiguration({ maxConcurrentRequests: 20 });

      const updatedStats = mcpServer.getServerStats();
      expect(updatedStats.maxConcurrentRequests).toBe(20);
      expect(updatedStats.maxConcurrentRequests).not.toBe(initialMaxRequests);
    });

    it("should ignore invalid configuration values", () => {
      const initialStats = mcpServer.getServerStats();
      const initialMaxRequests = initialStats.maxConcurrentRequests;

      mcpServer.updateConfiguration({ maxConcurrentRequests: -5 });

      const updatedStats = mcpServer.getServerStats();
      expect(updatedStats.maxConcurrentRequests).toBe(initialMaxRequests);

      mcpServer.updateConfiguration({ maxConcurrentRequests: 0 });
      const finalStats = mcpServer.getServerStats();
      expect(finalStats.maxConcurrentRequests).toBe(initialMaxRequests);
    });
  });
});
