/**
 * MockDataProvider Unit Tests
 * Tests for mock data generation and business entity validation
 */

import {
  MockDataProvider,
  MockConfiguration,
} from "../../mock/MockDataProvider";
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
  BusinessContext,
} from "../../types/business";
import { Task, TaskStatus, TaskComplexity } from "../../types/tasks";

describe("MockDataProvider", () => {
  let mockProvider: MockDataProvider;

  beforeEach(() => {
    mockProvider = new MockDataProvider({
      dataSize: "small",
      responseDelay: 0,
      errorRate: 0,
      enterprisePatterns: true,
    });
  });

  describe("Constructor and Configuration", () => {
    it("should initialize with default configuration", () => {
      const provider = new MockDataProvider();
      expect(provider).toBeInstanceOf(MockDataProvider);
    });

    it("should accept custom configuration", () => {
      const config: MockConfiguration = {
        dataSize: "large",
        responseDelay: 500,
        errorRate: 0.1,
        enterprisePatterns: false,
        scenarioComplexity: "advanced",
        includeComplianceData: true,
        industryVertical: "technology",
      };

      const provider = new MockDataProvider(config);
      expect(provider).toBeInstanceOf(MockDataProvider);
    });

    it("should generate data based on size configuration", () => {
      const smallProvider = new MockDataProvider({ dataSize: "small" });
      const largeProvider = new MockDataProvider({ dataSize: "large" });

      const smallRequirements = smallProvider.getAllRequirements();
      const largeRequirements = largeProvider.getAllRequirements();

      expect(smallRequirements.length).toBe(10);
      expect(largeRequirements.length).toBe(50);
    });
  });

  describe("Requirement Generation", () => {
    it("should generate valid requirements", () => {
      const requirements = mockProvider.getAllRequirements();

      expect(requirements.length).toBeGreaterThan(0);

      requirements.forEach((requirement) => {
        expect(requirement).toMatchObject({
          id: expect.stringMatching(/^REQ-\d{3}$/),
          title: expect.any(String),
          description: expect.any(String),
          type: expect.any(String),
          priority: expect.any(String),
          status: expect.any(String),
          stakeholders: expect.any(Array),
          createdDate: expect.any(Date),
          lastModified: expect.any(Date),
          tags: expect.any(Array),
        });
      });
    });

    it("should generate requirements with valid enum values", () => {
      const requirements = mockProvider.getAllRequirements();

      requirements.forEach((requirement) => {
        expect(Object.values(RequirementType)).toContain(requirement.type);
        expect(Object.values(Priority)).toContain(requirement.priority);
        expect(Object.values(RequirementStatus)).toContain(requirement.status);
      });
    });

    it("should generate requirements with realistic data patterns", () => {
      const requirements = mockProvider.getAllRequirements();

      requirements.forEach((requirement) => {
        expect(requirement.title.length).toBeGreaterThan(0);
        expect(requirement.description.length).toBeGreaterThan(0);
        expect(requirement.stakeholders.length).toBeGreaterThan(0);
        expect(requirement.tags.length).toBeGreaterThan(0);
        expect(requirement.createdDate).toBeInstanceOf(Date);
        expect(requirement.lastModified).toBeInstanceOf(Date);
        expect(requirement.lastModified.getTime()).toBeGreaterThanOrEqual(
          requirement.createdDate.getTime()
        );
      });
    });
  });

  describe("Code Mapping Generation", () => {
    it("should generate code mappings for files", () => {
      const mappings = mockProvider.getAllCodeMappings();

      expect(mappings.size).toBeGreaterThan(0);

      mappings.forEach((fileMappings, filePath) => {
        expect(filePath).toMatch(/\.ts$/);
        expect(fileMappings.length).toBeGreaterThan(0);

        fileMappings.forEach((mapping) => {
          expect(mapping).toMatchObject({
            requirementId: expect.stringMatching(/^REQ-\d{3}$/),
            codeLocation: expect.objectContaining({
              filePath: expect.any(String),
              startLine: expect.any(Number),
              endLine: expect.any(Number),
            }),
            mappingType: expect.any(String),
            confidence: expect.any(Number),
            lastVerified: expect.any(Date),
          });
        });
      });
    });

    it("should generate mappings with valid enum values", () => {
      const mappings = mockProvider.getAllCodeMappings();

      mappings.forEach((fileMappings) => {
        fileMappings.forEach((mapping) => {
          expect(Object.values(MappingType)).toContain(mapping.mappingType);
          if (mapping.codeLocation.symbolType) {
            expect(Object.values(SymbolType)).toContain(
              mapping.codeLocation.symbolType
            );
          }
        });
      });
    });

    it("should generate mappings with realistic confidence scores", () => {
      const mappings = mockProvider.getAllCodeMappings();

      mappings.forEach((fileMappings) => {
        fileMappings.forEach((mapping) => {
          expect(mapping.confidence).toBeGreaterThanOrEqual(0.6);
          expect(mapping.confidence).toBeLessThanOrEqual(1.0);
        });
      });
    });

    it("should generate valid code locations", () => {
      const mappings = mockProvider.getAllCodeMappings();

      mappings.forEach((fileMappings) => {
        fileMappings.forEach((mapping) => {
          const { codeLocation } = mapping;
          expect(codeLocation.startLine).toBeGreaterThan(0);
          expect(codeLocation.endLine).toBeGreaterThan(codeLocation.startLine);
          expect(codeLocation.filePath).toMatch(/^src\//);
        });
      });
    });
  });

  describe("Business Context Retrieval", () => {
    it("should return business context for existing files", async () => {
      const contexts = await mockProvider.getContextForFile(
        "src/auth/AuthService.ts"
      );

      expect(Array.isArray(contexts)).toBe(true);

      contexts.forEach((context) => {
        expect(context).toMatchObject({
          requirements: expect.any(Array),
          implementationStatus: expect.objectContaining({
            completionPercentage: expect.any(Number),
            lastVerified: expect.any(Date),
            verifiedBy: expect.any(String),
          }),
          relatedChanges: expect.any(Array),
          lastUpdated: expect.any(Date),
        });
      });
    });

    it("should return empty array for non-existent files", async () => {
      const contexts = await mockProvider.getContextForFile(
        "non-existent-file.ts"
      );
      expect(contexts).toEqual([]);
    });

    it("should validate implementation status data", async () => {
      const contexts = await mockProvider.getContextForFile(
        "src/auth/AuthService.ts"
      );

      contexts.forEach((context) => {
        const { implementationStatus } = context;
        expect(
          implementationStatus.completionPercentage
        ).toBeGreaterThanOrEqual(0);
        expect(implementationStatus.completionPercentage).toBeLessThanOrEqual(
          100
        );
        expect(implementationStatus.lastVerified).toBeInstanceOf(Date);
        expect(implementationStatus.verifiedBy.length).toBeGreaterThan(0);
      });
    });
  });

  describe("Requirement Retrieval", () => {
    it("should return requirement by valid ID", async () => {
      const requirements = mockProvider.getAllRequirements();
      const firstRequirement = requirements[0];

      const retrieved = await mockProvider.getRequirementById(
        firstRequirement.id
      );

      expect(retrieved).toEqual(firstRequirement);
    });

    it("should return null for invalid ID", async () => {
      const retrieved = await mockProvider.getRequirementById("INVALID-ID");
      expect(retrieved).toBeNull();
    });
  });

  describe("Change Generation and Validation", () => {
    it("should generate changes with valid structure", async () => {
      const contexts = await mockProvider.getContextForFile(
        "src/auth/AuthService.ts"
      );

      contexts.forEach((context) => {
        context.relatedChanges.forEach((change) => {
          expect(change).toMatchObject({
            id: expect.stringMatching(/^CHG-\d{3}$/),
            type: expect.any(String),
            description: expect.any(String),
            author: expect.any(String),
            timestamp: expect.any(Date),
            relatedRequirements: expect.any(Array),
            codeChanges: expect.any(Array),
          });
        });
      });
    });

    it("should generate changes with valid enum values", async () => {
      const contexts = await mockProvider.getContextForFile(
        "src/auth/AuthService.ts"
      );

      contexts.forEach((context) => {
        context.relatedChanges.forEach((change) => {
          expect(Object.values(ChangeType)).toContain(change.type);
        });
      });
    });

    it("should generate changes with realistic timestamps", async () => {
      const contexts = await mockProvider.getContextForFile(
        "src/auth/AuthService.ts"
      );
      const now = new Date();

      contexts.forEach((context) => {
        context.relatedChanges.forEach((change) => {
          expect(change.timestamp).toBeInstanceOf(Date);
          expect(change.timestamp.getTime()).toBeLessThanOrEqual(now.getTime());
        });
      });
    });
  });

  describe("Error Simulation", () => {
    it("should simulate errors when configured", async () => {
      const errorProvider = new MockDataProvider({
        errorRate: 1.0, // 100% error rate
        responseDelay: 0,
      });

      await expect(errorProvider.getContextForFile("test.ts")).rejects.toThrow(
        "Mock data provider error"
      );
    });

    it("should not throw errors when error rate is 0", async () => {
      const noErrorProvider = new MockDataProvider({
        errorRate: 0,
        responseDelay: 0,
      });

      await expect(
        noErrorProvider.getContextForFile("test.ts")
      ).resolves.not.toThrow();
    });
  });

  describe("Response Delay Simulation", () => {
    it("should respect response delay configuration", async () => {
      const delayProvider = new MockDataProvider({
        responseDelay: 100,
        errorRate: 0,
      });

      const startTime = Date.now();
      await delayProvider.getContextForFile("test.ts");
      const endTime = Date.now();

      expect(endTime - startTime).toBeGreaterThanOrEqual(90); // Allow some tolerance
    });
  });

  describe("Data Consistency", () => {
    it("should maintain referential integrity between requirements and mappings", async () => {
      const requirements = mockProvider.getAllRequirements();
      const requirementIds = new Set(requirements.map((r) => r.id));
      const mappings = mockProvider.getAllCodeMappings();

      mappings.forEach((fileMappings) => {
        fileMappings.forEach((mapping) => {
          expect(requirementIds.has(mapping.requirementId)).toBe(true);
        });
      });
    });

    it("should generate unique requirement IDs", () => {
      const requirements = mockProvider.getAllRequirements();
      const ids = requirements.map((r) => r.id);
      const uniqueIds = new Set(ids);

      expect(uniqueIds.size).toBe(ids.length);
    });

    it("should generate realistic enterprise patterns", () => {
      const requirements = mockProvider.getAllRequirements();

      // Check for enterprise-typical requirement types
      const types = requirements.map((r) => r.type);
      expect(types).toContain(RequirementType.FUNCTIONAL);
      expect(types).toContain(RequirementType.NON_FUNCTIONAL);

      // Check for enterprise-typical tags
      const allTags = requirements.flatMap((r) => r.tags);
      expect(allTags).toContain("security");
      expect(allTags).toContain("authentication");
      expect(allTags).toContain("performance");
    });
  });

  describe("Task Generation", () => {
    it("should return exactly 3 Task objects", async () => {
      // Arrange
      const mockProvider = new MockDataProvider();

      // Act
      const result = await mockProvider.getTasks();

      // Assert
      expect(result).toHaveLength(3);
      expect(result[0]).toHaveProperty("id");
      expect(result[0]).toHaveProperty("title");
      expect(result[0]).toHaveProperty("status");
    });

    it("should return tasks with valid Task interface structure", async () => {
      // Arrange
      const mockProvider = new MockDataProvider();

      // Act
      const result = await mockProvider.getTasks();

      // Assert
      result.forEach((task) => {
        expect(task).toMatchObject({
          id: expect.any(String),
          title: expect.any(String),
          description: expect.any(String),
          status: expect.any(String),
          complexity: expect.any(String),
          dependencies: expect.any(Array),
          requirements: expect.any(Array),
          createdDate: expect.any(String),
          lastModified: expect.any(String),
        });
      });
    });

    it("should return tasks with valid enum values", async () => {
      // Arrange
      const mockProvider = new MockDataProvider();

      // Act
      const result = await mockProvider.getTasks();

      // Assert
      result.forEach((task) => {
        expect(Object.values(TaskStatus)).toContain(task.status);
        expect(Object.values(TaskComplexity)).toContain(task.complexity);
      });
    });

    it("should have estimatedDuration field on all tasks", async () => {
      // Arrange
      const mockProvider = new MockDataProvider();

      // Act
      const result = await mockProvider.getTasks();

      // Assert
      expect(result[0].estimatedDuration).toBe("15-20 min");
      expect(result[1].estimatedDuration).toBe("25-30 min");
      expect(result[2].estimatedDuration).toBe("15-20 min");
    });
  });
});
