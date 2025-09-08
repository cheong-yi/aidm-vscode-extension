/**
 * FailingTestScenarios Unit Tests
 * Task 2.6.2: Test comprehensive failing test scenario generation
 * Requirements: 5.8, 7.7
 */

import { jest } from "@jest/globals";
import {
  FailingTestScenarios,
  FailingTestScenario,
} from "../../mock/FailingTestScenarios";
import { FailingTest } from "../../types/tasks";

describe("FailingTestScenarios", () => {
  describe("generateComprehensiveScenarios", () => {
    it("should generate scenarios covering all 5 error categories", () => {
      // Act
      const scenarios = FailingTestScenarios.generateComprehensiveScenarios();

      // Assert
      expect(scenarios).toHaveLength(25); // 5 categories × 5 scenarios each

      const categories = scenarios.map((s) => s.category);
      expect(categories).toContain("assertion");
      expect(categories).toContain("type");
      expect(categories).toContain("filesystem");
      expect(categories).toContain("timeout");
      expect(categories).toContain("network");
    });

    it("should have realistic error messages for each category", () => {
      // Act
      const scenarios = FailingTestScenarios.generateComprehensiveScenarios();

      // Assert - Check assertion category
      const assertionScenarios = scenarios.filter(
        (s) => s.category === "assertion"
      );
      expect(assertionScenarios).toHaveLength(5);
      assertionScenarios.forEach((scenario) => {
        expect(scenario.message).toMatch(/AssertionError:/);
        expect(scenario.message).toContain("Expected");
        expect(scenario.message).toContain("but");
      });

      // Check type category
      const typeScenarios = scenarios.filter((s) => s.category === "type");
      expect(typeScenarios).toHaveLength(5);
      typeScenarios.forEach((scenario) => {
        expect(scenario.message).toMatch(/TypeError:/);
        const message = scenario.message;
        expect(
          message.includes("Cannot read property") ||
            message.includes("must be a") ||
            message.includes("not a valid") ||
            message.includes("Cannot assign")
        ).toBe(true);
      });

      // Check filesystem category
      const filesystemScenarios = scenarios.filter(
        (s) => s.category === "filesystem"
      );
      expect(filesystemScenarios).toHaveLength(5);
      filesystemScenarios.forEach((scenario) => {
        expect(scenario.message).toMatch(/EACCES:|ENOENT:|ENOSPC:|EBUSY:/);
      });

      // Check timeout category
      const timeoutScenarios = scenarios.filter(
        (s) => s.category === "timeout"
      );
      expect(timeoutScenarios).toHaveLength(5);
      timeoutScenarios.forEach((scenario) => {
        expect(scenario.message).toMatch(/Test timeout:/);
        expect(scenario.message).toContain("exceeded");
        expect(scenario.message).toContain("limit");
      });

      // Check network category
      const networkScenarios = scenarios.filter(
        (s) => s.category === "network"
      );
      expect(networkScenarios).toHaveLength(5);
      networkScenarios.forEach((scenario) => {
        expect(scenario.message).toMatch(/NetworkError:/);
      });
    });

    it("should include stack traces for assertion and type errors", () => {
      // Act
      const scenarios = FailingTestScenarios.generateComprehensiveScenarios();

      // Assert
      const assertionAndTypeScenarios = scenarios.filter(
        (s) => s.category === "assertion" || s.category === "type"
      );

      assertionAndTypeScenarios.forEach((scenario) => {
        expect(scenario.stackTrace).toBeDefined();
        expect(scenario.stackTrace).toContain("/src/");
        // Some scenarios have "at Object.<anonymous>" but not all
        const stackTrace = scenario.stackTrace!;
        expect(
          stackTrace.includes("at Object.<anonymous>") ||
            stackTrace.includes("at ")
        ).toBe(true);
      });
    });

    it("should have realistic test names reflecting actual functionality", () => {
      // Act
      const scenarios = FailingTestScenarios.generateComprehensiveScenarios();

      // Assert
      scenarios.forEach((scenario) => {
        expect(scenario.name).toMatch(/^should /);
        const name = scenario.name;
        // Check that the name contains at least one of the expected action words
        const actionWords = [
          "validate",
          "handle",
          "test",
          "process",
          "fetch",
          "update",
          "create",
          "read",
          "write",
          "sync",
          "authenticate",
          "recover",
          "persist",
          "check",
          "verify",
          "ensure",
          "maintain",
          "generate",
        ];
        expect(actionWords.some((word) => name.includes(word))).toBe(true);
      });
    });
  });

  describe("generateScenariosForCategory", () => {
    it("should return only scenarios for the specified category", () => {
      // Act
      const assertionScenarios =
        FailingTestScenarios.generateScenariosForCategory("assertion");
      const typeScenarios =
        FailingTestScenarios.generateScenariosForCategory("type");
      const filesystemScenarios =
        FailingTestScenarios.generateScenariosForCategory("filesystem");

      // Assert
      expect(assertionScenarios).toHaveLength(5);
      expect(typeScenarios).toHaveLength(5);
      expect(filesystemScenarios).toHaveLength(5);

      assertionScenarios.forEach((scenario) => {
        expect(scenario.category).toBe("assertion");
      });

      typeScenarios.forEach((scenario) => {
        expect(scenario.category).toBe("type");
      });

      filesystemScenarios.forEach((scenario) => {
        expect(scenario.category).toBe("filesystem");
      });
    });

    it("should handle all valid error categories", () => {
      // Act & Assert
      const categories = [
        "assertion",
        "type",
        "filesystem",
        "timeout",
        "network",
      ] as const;

      categories.forEach((category) => {
        const scenarios =
          FailingTestScenarios.generateScenariosForCategory(category);
        expect(scenarios).toHaveLength(5);
        scenarios.forEach((scenario) => {
          expect(scenario.category).toBe(category);
        });
      });
    });
  });

  describe("generateRandomScenarios", () => {
    it("should return the requested number of scenarios", () => {
      // Act
      const scenarios3 = FailingTestScenarios.generateRandomScenarios(3);
      const scenarios7 = FailingTestScenarios.generateRandomScenarios(7);
      const scenarios30 = FailingTestScenarios.generateRandomScenarios(30); // More than available

      // Assert
      expect(scenarios3).toHaveLength(3);
      expect(scenarios7).toHaveLength(7);
      expect(scenarios30).toHaveLength(25); // Should not exceed available scenarios
    });

    it("should return scenarios with valid categories", () => {
      // Act
      const scenarios = FailingTestScenarios.generateRandomScenarios(10);

      // Assert
      scenarios.forEach((scenario) => {
        expect([
          "assertion",
          "type",
          "filesystem",
          "timeout",
          "network",
        ]).toContain(scenario.category);
        expect(scenario.name).toBeDefined();
        expect(scenario.message).toBeDefined();
      });
    });

    it("should return different scenarios on multiple calls", () => {
      // Act
      const scenarios1 = FailingTestScenarios.generateRandomScenarios(5);
      const scenarios2 = FailingTestScenarios.generateRandomScenarios(5);

      // Assert - Due to randomization, we expect some differences
      // Note: This test may occasionally fail due to randomness, but it's unlikely
      const names1 = scenarios1.map((s) => s.name).sort();
      const names2 = scenarios2.map((s) => s.name).sort();

      // At least some scenarios should be different
      expect(names1.some((name, index) => name !== names2[index])).toBe(true);
    });
  });

  describe("generateBalancedScenarios", () => {
    it("should return balanced distribution across categories", () => {
      // Act
      const scenarios5 = FailingTestScenarios.generateBalancedScenarios(5);
      const scenarios10 = FailingTestScenarios.generateBalancedScenarios(10);

      // Assert
      expect(scenarios5).toHaveLength(5);
      expect(scenarios10).toHaveLength(10);

      // Check that we have scenarios from multiple categories
      const categories5 = [...new Set(scenarios5.map((s) => s.category))];
      const categories10 = [...new Set(scenarios10.map((s) => s.category))];

      expect(categories5.length).toBeGreaterThan(1);
      expect(categories10.length).toBeGreaterThan(1);
    });

    it("should handle edge cases gracefully", () => {
      // Act
      const scenarios0 = FailingTestScenarios.generateBalancedScenarios(0);
      const scenarios1 = FailingTestScenarios.generateBalancedScenarios(1);
      const scenarios100 = FailingTestScenarios.generateBalancedScenarios(100);

      // Assert
      expect(scenarios0).toHaveLength(0);
      expect(scenarios1).toHaveLength(1);
      expect(scenarios100).toHaveLength(25); // Should not exceed available scenarios
    });

    it("should maintain category diversity", () => {
      // Act
      const scenarios = FailingTestScenarios.generateBalancedScenarios(15);

      // Assert
      const categoryCounts = scenarios.reduce((acc, scenario) => {
        acc[scenario.category] = (acc[scenario.category] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      // Each category should have at least some representation
      const categories = [
        "assertion",
        "type",
        "filesystem",
        "timeout",
        "network",
      ];
      categories.forEach((category) => {
        expect(categoryCounts[category]).toBeGreaterThan(0);
      });
    });
  });

  describe("validateFailingTest", () => {
    it("should validate complete FailingTest objects", () => {
      // Arrange
      const validTest: Partial<FailingTest> = {
        name: "Test validation",
        message: "Test error message",
        stackTrace: "Test stack trace",
        category: "assertion",
      };

      // Act
      const result = FailingTestScenarios.validateFailingTest(validTest);

      // Assert
      expect(result).toEqual(validTest);
    });

    it("should provide fallback values for missing properties", () => {
      // Arrange
      const incompleteTest: Partial<FailingTest> = {
        name: undefined,
        message: undefined,
        category: "invalid_category" as any,
      };

      // Act
      const result = FailingTestScenarios.validateFailingTest(incompleteTest);

      // Assert
      expect(result.name).toBe("Unnamed test failure");
      expect(result.message).toBe("No error message provided");
      expect(result.category).toBe("assertion"); // Fallback category
    });

    it("should handle all valid categories correctly", () => {
      // Arrange
      const validCategories = [
        "assertion",
        "type",
        "filesystem",
        "timeout",
        "network",
      ] as const;

      // Act & Assert
      validCategories.forEach((category) => {
        const test: Partial<FailingTest> = {
          name: "Test",
          message: "Error",
          category,
        };

        const result = FailingTestScenarios.validateFailingTest(test);
        expect(result.category).toBe(category);
      });
    });

    it("should fallback to assertion for invalid categories", () => {
      // Arrange
      const invalidTest: Partial<FailingTest> = {
        name: "Test",
        message: "Error",
        category: "invalid_type" as any,
      };

      // Act
      const result = FailingTestScenarios.validateFailingTest(invalidTest);

      // Assert
      expect(result.category).toBe("assertion");
    });
  });

  describe("generateStackTrace", () => {
    it("should generate realistic stack traces for assertion errors", () => {
      // Act
      const stackTrace = FailingTestScenarios.generateStackTrace(
        "assertion",
        "validation.ts",
        45
      );

      // Assert
      expect(stackTrace).toContain(
        "at Object.<anonymous> (/test/validation.ts:45:12)"
      );
      expect(stackTrace).toContain("/src/validation.ts:");
      expect(stackTrace).toContain("validation");

      // Extract the method name from the stack trace - look for the pattern after "validation."
      const lines = stackTrace.split("\n");
      const srcLine = lines.find((line) =>
        line.includes("/src/validation.ts:")
      );
      expect(srcLine).toBeTruthy();

      // The method name should be one of the expected ones
      const methodName = srcLine!.split("validation.")[1]?.split(" ")[0];
      expect(methodName).toBeTruthy();
      expect(["validate", "assert", "expect", "check"]).toContain(methodName);
    });

    it("should generate realistic stack traces for type errors", () => {
      // Act
      const stackTrace = FailingTestScenarios.generateStackTrace(
        "type",
        "parser.ts",
        67
      );

      // Assert
      expect(stackTrace).toContain(
        "at Object.<anonymous> (/test/parser.ts:67:12)"
      );
      expect(stackTrace).toContain("/src/parser.ts:");
      expect(stackTrace).toContain("parser");

      // Extract the method name from the stack trace - look for the pattern after "parser."
      const lines = stackTrace.split("\n");
      const srcLine = lines.find((line) => line.includes("/src/parser.ts:"));
      expect(srcLine).toBeTruthy();

      // The method name should be one of the expected ones
      const methodName = srcLine!.split("parser.")[1]?.split(" ")[0];
      expect(methodName).toBeTruthy();
      expect(["parse", "validate", "transform", "convert"]).toContain(
        methodName
      );
    });

    it("should handle different file names correctly", () => {
      // Act
      const stackTrace1 = FailingTestScenarios.generateStackTrace(
        "assertion",
        "TaskValidator.ts",
        23
      );
      const stackTrace2 = FailingTestScenarios.generateStackTrace(
        "type",
        "StatusManager.ts",
        89
      );

      // Assert
      expect(stackTrace1).toContain("TaskValidator");
      expect(stackTrace2).toContain("StatusManager");
    });

    it("should generate consistent line number offsets", () => {
      // Act
      const stackTrace = FailingTestScenarios.generateStackTrace(
        "assertion",
        "test.ts",
        100
      );

      // Assert
      expect(stackTrace).toContain("(/test/test.ts:100:12)");
      expect(stackTrace).toContain("(/src/test.ts:105:8)");
    });
  });

  describe("Integration with existing mock data", () => {
    it("should generate scenarios compatible with Task interface", () => {
      // Act
      const scenarios = FailingTestScenarios.generateComprehensiveScenarios();

      // Assert
      scenarios.forEach((scenario) => {
        // Verify all required properties exist
        expect(scenario).toHaveProperty("name");
        expect(scenario).toHaveProperty("message");
        expect(scenario).toHaveProperty("category");

        // Verify property types
        expect(typeof scenario.name).toBe("string");
        expect(typeof scenario.message).toBe("string");
        expect(typeof scenario.category).toBe("string");

        // Verify category is valid
        expect([
          "assertion",
          "type",
          "filesystem",
          "timeout",
          "network",
        ]).toContain(scenario.category);
      });
    });

    it("should provide sufficient variety for UI testing", () => {
      // Act
      const scenarios = FailingTestScenarios.generateComprehensiveScenarios();

      // Assert
      // Check that we have enough variety in error messages
      const uniqueMessages = new Set(scenarios.map((s) => s.message));
      expect(uniqueMessages.size).toBeGreaterThan(20); // Most messages should be unique

      // Check that we have variety in test names
      const uniqueNames = new Set(scenarios.map((s) => s.name));
      expect(uniqueNames.size).toBeGreaterThan(20); // Most names should be unique

      // Check that we have variety in categories
      const categoryCounts = scenarios.reduce((acc, s) => {
        acc[s.category] = (acc[s.category] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      // Each category should have exactly 5 scenarios
      Object.values(categoryCounts).forEach((count) => {
        expect(count).toBe(5);
      });
    });
  });
});
