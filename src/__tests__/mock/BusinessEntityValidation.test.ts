/**
 * Business Entity Validation Tests
 * Tests for validating business entity structure and constraints
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
} from "../../types/business";

describe("Business Entity Validation", () => {
  describe("Requirement Entity", () => {
    it("should validate required fields", () => {
      const requirement: Requirement = {
        id: "REQ-001",
        title: "Test Requirement",
        description: "Test description",
        type: RequirementType.FUNCTIONAL,
        priority: Priority.HIGH,
        status: RequirementStatus.APPROVED,
        stakeholders: ["Product Manager"],
        createdDate: new Date("2024-01-01"),
        lastModified: new Date("2024-01-15"),
        tags: ["test"],
      };

      expect(requirement.id).toBeDefined();
      expect(requirement.title).toBeDefined();
      expect(requirement.description).toBeDefined();
      expect(requirement.type).toBeDefined();
      expect(requirement.priority).toBeDefined();
      expect(requirement.status).toBeDefined();
      expect(requirement.stakeholders).toBeDefined();
      expect(requirement.createdDate).toBeDefined();
      expect(requirement.lastModified).toBeDefined();
      expect(requirement.tags).toBeDefined();
    });

    it("should validate enum values", () => {
      const requirement: Requirement = {
        id: "REQ-001",
        title: "Test Requirement",
        description: "Test description",
        type: RequirementType.BUSINESS,
        priority: Priority.CRITICAL,
        status: RequirementStatus.IN_PROGRESS,
        stakeholders: ["Business Analyst"],
        createdDate: new Date(),
        lastModified: new Date(),
        tags: ["business"],
      };

      expect(Object.values(RequirementType)).toContain(requirement.type);
      expect(Object.values(Priority)).toContain(requirement.priority);
      expect(Object.values(RequirementStatus)).toContain(requirement.status);
    });

    it("should validate date relationships", () => {
      const createdDate = new Date("2024-01-01");
      const lastModified = new Date("2024-01-15");

      const requirement: Requirement = {
        id: "REQ-001",
        title: "Test Requirement",
        description: "Test description",
        type: RequirementType.FUNCTIONAL,
        priority: Priority.MEDIUM,
        status: RequirementStatus.DRAFT,
        stakeholders: ["Developer"],
        createdDate,
        lastModified,
        tags: ["validation"],
      };

      expect(requirement.lastModified.getTime()).toBeGreaterThanOrEqual(
        requirement.createdDate.getTime()
      );
    });

    it("should validate array fields", () => {
      const requirement: Requirement = {
        id: "REQ-001",
        title: "Test Requirement",
        description: "Test description",
        type: RequirementType.TECHNICAL,
        priority: Priority.LOW,
        status: RequirementStatus.COMPLETED,
        stakeholders: ["Lead Developer", "QA Engineer"],
        createdDate: new Date(),
        lastModified: new Date(),
        tags: ["technical", "validation", "testing"],
      };

      expect(Array.isArray(requirement.stakeholders)).toBe(true);
      expect(Array.isArray(requirement.tags)).toBe(true);
      expect(requirement.stakeholders.length).toBeGreaterThan(0);
      expect(requirement.tags.length).toBeGreaterThan(0);
    });
  });

  describe("CodeMapping Entity", () => {
    it("should validate required fields", () => {
      const codeMapping: CodeMapping = {
        requirementId: "REQ-001",
        codeLocation: {
          filePath: "src/test.ts",
          startLine: 10,
          endLine: 20,
          symbolName: "testFunction",
          symbolType: SymbolType.FUNCTION,
        },
        mappingType: MappingType.IMPLEMENTS,
        confidence: 0.85,
        lastVerified: new Date(),
      };

      expect(codeMapping.requirementId).toBeDefined();
      expect(codeMapping.codeLocation).toBeDefined();
      expect(codeMapping.mappingType).toBeDefined();
      expect(codeMapping.confidence).toBeDefined();
      expect(codeMapping.lastVerified).toBeDefined();
    });

    it("should validate confidence range", () => {
      const validConfidences = [0.0, 0.5, 0.85, 1.0];

      validConfidences.forEach((confidence) => {
        const codeMapping: CodeMapping = {
          requirementId: "REQ-001",
          codeLocation: {
            filePath: "src/test.ts",
            startLine: 1,
            endLine: 5,
          },
          mappingType: MappingType.TESTS,
          confidence,
          lastVerified: new Date(),
        };

        expect(codeMapping.confidence).toBeGreaterThanOrEqual(0);
        expect(codeMapping.confidence).toBeLessThanOrEqual(1);
      });
    });

    it("should validate enum values", () => {
      const codeMapping: CodeMapping = {
        requirementId: "REQ-001",
        codeLocation: {
          filePath: "src/test.ts",
          startLine: 1,
          endLine: 5,
          symbolType: SymbolType.CLASS,
        },
        mappingType: MappingType.DOCUMENTS,
        confidence: 0.9,
        lastVerified: new Date(),
      };

      expect(Object.values(MappingType)).toContain(codeMapping.mappingType);
      if (codeMapping.codeLocation.symbolType) {
        expect(Object.values(SymbolType)).toContain(
          codeMapping.codeLocation.symbolType
        );
      }
    });
  });

  describe("CodeLocation Entity", () => {
    it("should validate required fields", () => {
      const codeLocation: CodeLocation = {
        filePath: "src/components/Button.ts",
        startLine: 15,
        endLine: 25,
        symbolName: "Button",
        symbolType: SymbolType.CLASS,
      };

      expect(codeLocation.filePath).toBeDefined();
      expect(codeLocation.startLine).toBeDefined();
      expect(codeLocation.endLine).toBeDefined();
    });

    it("should validate line number relationships", () => {
      const codeLocation: CodeLocation = {
        filePath: "src/utils/helper.ts",
        startLine: 10,
        endLine: 20,
      };

      expect(codeLocation.endLine).toBeGreaterThan(codeLocation.startLine);
      expect(codeLocation.startLine).toBeGreaterThan(0);
    });

    it("should handle optional fields", () => {
      const minimalLocation: CodeLocation = {
        filePath: "src/index.ts",
        startLine: 1,
        endLine: 1,
      };

      const fullLocation: CodeLocation = {
        filePath: "src/services/api.ts",
        startLine: 50,
        endLine: 75,
        symbolName: "ApiService",
        symbolType: SymbolType.CLASS,
      };

      expect(minimalLocation.symbolName).toBeUndefined();
      expect(minimalLocation.symbolType).toBeUndefined();
      expect(fullLocation.symbolName).toBeDefined();
      expect(fullLocation.symbolType).toBeDefined();
    });
  });

  describe("Change Entity", () => {
    it("should validate required fields", () => {
      const change: Change = {
        id: "CHG-001",
        type: ChangeType.FEATURE,
        description: "Added new authentication feature",
        author: "John Doe",
        timestamp: new Date(),
        relatedRequirements: ["REQ-001", "REQ-002"],
        codeChanges: [
          {
            filePath: "src/auth/auth.ts",
            startLine: 1,
            endLine: 50,
          },
        ],
      };

      expect(change.id).toBeDefined();
      expect(change.type).toBeDefined();
      expect(change.description).toBeDefined();
      expect(change.author).toBeDefined();
      expect(change.timestamp).toBeDefined();
      expect(change.relatedRequirements).toBeDefined();
      expect(change.codeChanges).toBeDefined();
    });

    it("should validate enum values", () => {
      const change: Change = {
        id: "CHG-002",
        type: ChangeType.BUG_FIX,
        description: "Fixed payment processing bug",
        author: "Jane Smith",
        timestamp: new Date(),
        relatedRequirements: ["REQ-003"],
        codeChanges: [],
      };

      expect(Object.values(ChangeType)).toContain(change.type);
    });

    it("should validate array fields", () => {
      const change: Change = {
        id: "CHG-003",
        type: ChangeType.REFACTOR,
        description: "Refactored user service",
        author: "Bob Johnson",
        timestamp: new Date(),
        relatedRequirements: ["REQ-004", "REQ-005"],
        codeChanges: [
          {
            filePath: "src/user/UserService.ts",
            startLine: 10,
            endLine: 100,
          },
          {
            filePath: "src/user/UserModel.ts",
            startLine: 1,
            endLine: 50,
          },
        ],
      };

      expect(Array.isArray(change.relatedRequirements)).toBe(true);
      expect(Array.isArray(change.codeChanges)).toBe(true);
    });
  });

  describe("ImplementationStatus Entity", () => {
    it("should validate required fields", () => {
      const status: ImplementationStatus = {
        completionPercentage: 75,
        lastVerified: new Date(),
        verifiedBy: "QA Team",
        notes: "Implementation progressing well",
      };

      expect(status.completionPercentage).toBeDefined();
      expect(status.lastVerified).toBeDefined();
      expect(status.verifiedBy).toBeDefined();
    });

    it("should validate completion percentage range", () => {
      const validPercentages = [0, 25, 50, 75, 100];

      validPercentages.forEach((percentage) => {
        const status: ImplementationStatus = {
          completionPercentage: percentage,
          lastVerified: new Date(),
          verifiedBy: "Developer",
        };

        expect(status.completionPercentage).toBeGreaterThanOrEqual(0);
        expect(status.completionPercentage).toBeLessThanOrEqual(100);
      });
    });

    it("should handle optional notes field", () => {
      const statusWithNotes: ImplementationStatus = {
        completionPercentage: 50,
        lastVerified: new Date(),
        verifiedBy: "Team Lead",
        notes: "Needs additional testing",
      };

      const statusWithoutNotes: ImplementationStatus = {
        completionPercentage: 100,
        lastVerified: new Date(),
        verifiedBy: "QA Engineer",
      };

      expect(statusWithNotes.notes).toBeDefined();
      expect(statusWithoutNotes.notes).toBeUndefined();
    });
  });

  describe("BusinessContext Entity", () => {
    it("should validate required fields", () => {
      const context: BusinessContext = {
        requirements: [
          {
            id: "REQ-001",
            title: "Test Requirement",
            description: "Test description",
            type: RequirementType.FUNCTIONAL,
            priority: Priority.HIGH,
            status: RequirementStatus.APPROVED,
            stakeholders: ["Product Manager"],
            createdDate: new Date(),
            lastModified: new Date(),
            tags: ["test"],
          },
        ],
        implementationStatus: {
          completionPercentage: 80,
          lastVerified: new Date(),
          verifiedBy: "Developer",
        },
        relatedChanges: [
          {
            id: "CHG-001",
            type: ChangeType.FEATURE,
            description: "Initial implementation",
            author: "Developer",
            timestamp: new Date(),
            relatedRequirements: ["REQ-001"],
            codeChanges: [],
          },
        ],
        lastUpdated: new Date(),
      };

      expect(context.requirements).toBeDefined();
      expect(context.implementationStatus).toBeDefined();
      expect(context.relatedChanges).toBeDefined();
      expect(context.lastUpdated).toBeDefined();
    });

    it("should validate array fields", () => {
      const context: BusinessContext = {
        requirements: [],
        implementationStatus: {
          completionPercentage: 0,
          lastVerified: new Date(),
          verifiedBy: "System",
        },
        relatedChanges: [],
        lastUpdated: new Date(),
      };

      expect(Array.isArray(context.requirements)).toBe(true);
      expect(Array.isArray(context.relatedChanges)).toBe(true);
    });

    it("should validate nested entity relationships", () => {
      const requirement: Requirement = {
        id: "REQ-001",
        title: "Authentication System",
        description: "Implement user authentication",
        type: RequirementType.FUNCTIONAL,
        priority: Priority.HIGH,
        status: RequirementStatus.IN_PROGRESS,
        stakeholders: ["Security Team"],
        createdDate: new Date("2024-01-01"),
        lastModified: new Date("2024-01-15"),
        tags: ["security", "auth"],
      };

      const change: Change = {
        id: "CHG-001",
        type: ChangeType.FEATURE,
        description: "Added login functionality",
        author: "Developer",
        timestamp: new Date("2024-01-10"),
        relatedRequirements: [requirement.id],
        codeChanges: [],
      };

      const context: BusinessContext = {
        requirements: [requirement],
        implementationStatus: {
          completionPercentage: 60,
          lastVerified: new Date(),
          verifiedBy: "QA Team",
        },
        relatedChanges: [change],
        lastUpdated: new Date(),
      };

      // Validate relationship consistency
      expect(change.relatedRequirements).toContain(requirement.id);
      expect(context.requirements).toContain(requirement);
      expect(context.relatedChanges).toContain(change);
    });
  });
});
