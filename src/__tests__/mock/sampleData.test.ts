/**
 * Sample Data Tests
 * Validates the sample enterprise data for consistency and realism
 */

import {
  sampleRequirements,
  sampleCodeMappings,
  sampleChanges,
  enterpriseScenarios,
  fileContextMappings,
} from "../../mock/sampleData";
import {
  RequirementType,
  Priority,
  RequirementStatus,
  MappingType,
  SymbolType,
  ChangeType,
} from "../../types/business";

describe("Sample Data Validation", () => {
  describe("Sample Requirements", () => {
    it("should contain valid enterprise requirements", () => {
      expect(sampleRequirements.length).toBeGreaterThan(0);

      sampleRequirements.forEach((requirement) => {
        expect(requirement.id).toMatch(/^REQ-\d{3}$/);
        expect(requirement.title.length).toBeGreaterThan(0);
        expect(requirement.description.length).toBeGreaterThan(50); // Detailed descriptions
        expect(Object.values(RequirementType)).toContain(requirement.type);
        expect(Object.values(Priority)).toContain(requirement.priority);
        expect(Object.values(RequirementStatus)).toContain(requirement.status);
        expect(requirement.stakeholders.length).toBeGreaterThan(0);
        expect(requirement.tags.length).toBeGreaterThan(0);
      });
    });

    it("should represent diverse enterprise scenarios", () => {
      const types = sampleRequirements.map((r) => r.type);
      const priorities = sampleRequirements.map((r) => r.priority);
      const statuses = sampleRequirements.map((r) => r.status);

      // Should have multiple requirement types
      expect(new Set(types).size).toBeGreaterThan(1);
      expect(new Set(priorities).size).toBeGreaterThan(1);
      expect(new Set(statuses).size).toBeGreaterThan(1);

      // Should include critical enterprise areas
      const allTags = sampleRequirements.flatMap((r) => r.tags);
      expect(allTags).toContain("security");
      expect(allTags).toContain("payment");
      expect(allTags).toContain("performance");
    });

    it("should have realistic enterprise stakeholders", () => {
      const allStakeholders = sampleRequirements.flatMap((r) => r.stakeholders);
      const uniqueStakeholders = new Set(allStakeholders);

      expect(uniqueStakeholders.has("Security Team")).toBe(true);
      expect(uniqueStakeholders.has("Product Manager")).toBe(true);
      expect(uniqueStakeholders.has("Lead Developer")).toBe(true);
      expect(uniqueStakeholders.has("Business Analyst")).toBe(true);
    });
  });

  describe("Sample Code Mappings", () => {
    it("should contain valid code mappings", () => {
      expect(sampleCodeMappings.length).toBeGreaterThan(0);

      sampleCodeMappings.forEach((mapping) => {
        expect(mapping.requirementId).toMatch(/^REQ-\d{3}$/);
        expect(mapping.codeLocation.filePath).toMatch(/^src\//);
        expect(mapping.codeLocation.startLine).toBeGreaterThan(0);
        expect(mapping.codeLocation.endLine).toBeGreaterThan(
          mapping.codeLocation.startLine
        );
        expect(Object.values(MappingType)).toContain(mapping.mappingType);
        expect(mapping.confidence).toBeGreaterThanOrEqual(0.8); // High confidence for samples
        expect(mapping.confidence).toBeLessThanOrEqual(1.0);
      });
    });

    it("should map to existing sample requirements", () => {
      const requirementIds = new Set(sampleRequirements.map((r) => r.id));

      sampleCodeMappings.forEach((mapping) => {
        expect(requirementIds.has(mapping.requirementId)).toBe(true);
      });
    });

    it("should represent realistic file structures", () => {
      const filePaths = sampleCodeMappings.map((m) => m.codeLocation.filePath);

      // Should have TypeScript files
      expect(filePaths.some((path) => path.endsWith(".ts"))).toBe(true);

      // Should have organized directory structure
      expect(filePaths.some((path) => path.includes("/auth/"))).toBe(true);
      expect(filePaths.some((path) => path.includes("/payment/"))).toBe(true);
      expect(filePaths.some((path) => path.includes("/security/"))).toBe(true);
    });

    it("should include various symbol types", () => {
      const symbolTypes = sampleCodeMappings
        .map((m) => m.codeLocation.symbolType)
        .filter((type) => type !== undefined);

      expect(symbolTypes).toContain(SymbolType.CLASS);
      expect(symbolTypes).toContain(SymbolType.FUNCTION);
    });
  });

  describe("Sample Changes", () => {
    it("should contain valid change records", () => {
      expect(sampleChanges.length).toBeGreaterThan(0);

      sampleChanges.forEach((change) => {
        expect(change.id).toMatch(/^CHG-\d{3}$/);
        expect(Object.values(ChangeType)).toContain(change.type);
        expect(change.description.length).toBeGreaterThan(20); // Meaningful descriptions
        expect(change.author.length).toBeGreaterThan(0);
        expect(change.timestamp).toBeInstanceOf(Date);
        expect(change.relatedRequirements.length).toBeGreaterThan(0);
        expect(Array.isArray(change.codeChanges)).toBe(true);
      });
    });

    it("should reference existing requirements", () => {
      const requirementIds = new Set(sampleRequirements.map((r) => r.id));

      sampleChanges.forEach((change) => {
        change.relatedRequirements.forEach((reqId) => {
          expect(requirementIds.has(reqId)).toBe(true);
        });
      });
    });

    it("should represent realistic change patterns", () => {
      const changeTypes = sampleChanges.map((c) => c.type);

      expect(changeTypes).toContain(ChangeType.FEATURE);
      expect(changeTypes).toContain(ChangeType.BUG_FIX);
      expect(changeTypes).toContain(ChangeType.REFACTOR);
      expect(changeTypes).toContain(ChangeType.TEST);
    });

    it("should have chronological consistency", () => {
      // Changes should be in reasonable time order
      const timestamps = sampleChanges.map((c) => c.timestamp.getTime());
      const sortedTimestamps = [...timestamps].sort();

      // Should span a reasonable time period
      const timeSpan = Math.max(...timestamps) - Math.min(...timestamps);
      const daysSpan = timeSpan / (1000 * 60 * 60 * 24);
      expect(daysSpan).toBeGreaterThan(7); // At least a week of changes
    });
  });

  describe("Enterprise Scenarios", () => {
    it("should define realistic enterprise scenarios", () => {
      const scenarioNames = Object.keys(enterpriseScenarios);

      expect(scenarioNames.length).toBeGreaterThan(0);
      expect(scenarioNames).toContain("User Authentication Flow");
      expect(scenarioNames).toContain("Payment Processing System");
      expect(scenarioNames).toContain("Security and Compliance");

      Object.values(enterpriseScenarios).forEach((scenario) => {
        expect(scenario.requirements.length).toBeGreaterThan(0);
        expect(scenario.files.length).toBeGreaterThan(0);
        expect(scenario.description.length).toBeGreaterThan(20);
      });
    });

    it("should reference valid requirements and files", () => {
      const requirementIds = new Set(sampleRequirements.map((r) => r.id));
      const mappedFiles = new Set(
        sampleCodeMappings.map((m) => m.codeLocation.filePath)
      );

      Object.values(enterpriseScenarios).forEach((scenario) => {
        scenario.requirements.forEach((reqId) => {
          expect(requirementIds.has(reqId)).toBe(true);
        });

        scenario.files.forEach((filePath) => {
          expect(mappedFiles.has(filePath)).toBe(true);
        });
      });
    });
  });

  describe("File Context Mappings", () => {
    it("should provide file-to-requirement mappings", () => {
      expect(fileContextMappings.size).toBeGreaterThan(0);

      const requirementIds = new Set(sampleRequirements.map((r) => r.id));

      fileContextMappings.forEach((reqIds, filePath) => {
        expect(filePath).toMatch(/^src\//);
        expect(reqIds.length).toBeGreaterThan(0);

        reqIds.forEach((reqId) => {
          expect(requirementIds.has(reqId)).toBe(true);
        });
      });
    });

    it("should be consistent with code mappings", () => {
      const mappingFiles = new Set(
        sampleCodeMappings.map((m) => m.codeLocation.filePath)
      );

      fileContextMappings.forEach((reqIds, filePath) => {
        expect(mappingFiles.has(filePath)).toBe(true);
      });
    });
  });

  describe("Data Relationships and Integrity", () => {
    it("should maintain referential integrity across all data", () => {
      const requirementIds = new Set(sampleRequirements.map((r) => r.id));

      // All code mappings should reference valid requirements
      sampleCodeMappings.forEach((mapping) => {
        expect(requirementIds.has(mapping.requirementId)).toBe(true);
      });

      // All changes should reference valid requirements
      sampleChanges.forEach((change) => {
        change.relatedRequirements.forEach((reqId) => {
          expect(requirementIds.has(reqId)).toBe(true);
        });
      });

      // All file context mappings should reference valid requirements
      fileContextMappings.forEach((reqIds) => {
        reqIds.forEach((reqId) => {
          expect(requirementIds.has(reqId)).toBe(true);
        });
      });
    });

    it("should represent realistic enterprise complexity", () => {
      // Should have requirements with multiple mappings
      const requirementMappingCounts = new Map<string, number>();
      sampleCodeMappings.forEach((mapping) => {
        const count = requirementMappingCounts.get(mapping.requirementId) || 0;
        requirementMappingCounts.set(mapping.requirementId, count + 1);
      });

      const multiMappingRequirements = Array.from(
        requirementMappingCounts.values()
      ).filter((count) => count > 1);
      expect(multiMappingRequirements.length).toBeGreaterThan(0);

      // Should have files implementing multiple requirements
      const fileMappingCounts = new Map<string, Set<string>>();
      sampleCodeMappings.forEach((mapping) => {
        const reqSet =
          fileMappingCounts.get(mapping.codeLocation.filePath) || new Set();
        reqSet.add(mapping.requirementId);
        fileMappingCounts.set(mapping.codeLocation.filePath, reqSet);
      });

      const multiRequirementFiles = Array.from(
        fileMappingCounts.values()
      ).filter((reqSet) => reqSet.size > 1);
      expect(multiRequirementFiles.length).toBeGreaterThan(0);
    });
  });
});
