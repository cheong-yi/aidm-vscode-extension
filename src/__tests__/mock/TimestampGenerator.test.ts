/**
 * TimestampGenerator Unit Tests
 * Task: 2.6.3 - Add relative timestamp mock data
 * Requirements: 4.8, 7.9, 9.3
 *
 * Tests comprehensive timestamp generation for various relative time scenarios
 * and validates ISO 8601 format compliance for mock data generation.
 */

import { jest } from "@jest/globals";
import {
  TimestampGenerator,
  TimestampScenario,
  TaskTimestamps,
} from "../../mock/TimestampGenerator";

describe("TimestampGenerator", () => {
  describe("generateTaskTimestamps", () => {
    it("should generate timestamps for a fresh task created today", () => {
      // Act
      const timestamps = TimestampGenerator.generateTaskTimestamps(0, true, false);

      // Assert
      expect(timestamps.createdDate).toBeDefined();
      expect(timestamps.lastModified).toBeDefined();
      expect(timestamps.lastRunDate).toBeUndefined();

      // Validate ISO format
      expect(TimestampGenerator.isValidISOTimestamp(timestamps.createdDate)).toBe(true);
      expect(TimestampGenerator.isValidISOTimestamp(timestamps.lastModified)).toBe(true);

      // Validate logical progression
      const created = new Date(timestamps.createdDate);
      const modified = new Date(timestamps.lastModified);
      expect(modified.getTime()).toBeGreaterThanOrEqual(created.getTime());
    });

    it("should generate timestamps for a task with recent activity", () => {
      // Act
      const timestamps = TimestampGenerator.generateTaskTimestamps(1, true, false);

      // Assert
      expect(timestamps.createdDate).toBeDefined();
      expect(timestamps.lastModified).toBeDefined();

      // Created should be 1 day ago
      const created = new Date(timestamps.createdDate);
      const now = new Date();
      const diffDays = (now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24);
      expect(diffDays).toBeGreaterThanOrEqual(0.9); // Allow small tolerance
      expect(diffDays).toBeLessThanOrEqual(1.1);

      // Last modified should be recent (within 2 days)
      const modified = new Date(timestamps.lastModified);
      const modifiedDiffDays = (now.getTime() - modified.getTime()) / (1000 * 60 * 60 * 24);
      expect(modifiedDiffDays).toBeLessThanOrEqual(2);
    });

    it("should generate timestamps for a task with test runs", () => {
      // Act
      const timestamps = TimestampGenerator.generateTaskTimestamps(2, true, true);

      // Assert
      expect(timestamps.createdDate).toBeDefined();
      expect(timestamps.lastModified).toBeDefined();
      expect(timestamps.lastRunDate).toBeDefined();

      // Validate all timestamps are valid ISO format
      expect(TimestampGenerator.isValidISOTimestamp(timestamps.createdDate)).toBe(true);
      expect(TimestampGenerator.isValidISOTimestamp(timestamps.lastModified)).toBe(true);
      expect(TimestampGenerator.isValidISOTimestamp(timestamps.lastRunDate!)).toBe(true);

      // Validate logical progression: created <= modified <= test run
      const created = new Date(timestamps.createdDate);
      const modified = new Date(timestamps.lastModified);
      const testRun = new Date(timestamps.lastRunDate!);

      expect(modified.getTime()).toBeGreaterThanOrEqual(created.getTime());
      expect(testRun.getTime()).toBeGreaterThanOrEqual(modified.getTime());
    });

    it("should handle tasks with no recent activity", () => {
      // Act
      const timestamps = TimestampGenerator.generateTaskTimestamps(7, false, false);

      // Assert
      expect(timestamps.createdDate).toBeDefined();
      expect(timestamps.lastModified).toBeDefined();

      // Created should be 7 days ago
      const created = new Date(timestamps.createdDate);
      const now = new Date();
      const diffDays = (now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24);
      expect(diffDays).toBeGreaterThanOrEqual(6.9);
      expect(diffDays).toBeLessThanOrEqual(7.1);

      // Last modified should be close to created date (no recent activity)
      const modified = new Date(timestamps.lastModified);
      const modifiedDiffFromCreated = (modified.getTime() - created.getTime()) / (1000 * 60 * 60);
      expect(modifiedDiffFromCreated).toBeGreaterThanOrEqual(0);
      expect(modifiedDiffFromCreated).toBeLessThanOrEqual(24);
    });
  });

  describe("generateScenarioTimestamp", () => {
    it("should generate timestamp for 'just now' scenario", () => {
      // Arrange
      const scenario: TimestampScenario = {
        name: "just_now",
        description: "Less than 1 minute ago",
        minutesAgo: 0.5,
        expectedRelativeTime: "just now",
      };

      // Act
      const timestamp = TimestampGenerator.generateScenarioTimestamp(scenario);

      // Assert
      expect(TimestampGenerator.isValidISOTimestamp(timestamp)).toBe(true);
      
      const date = new Date(timestamp);
      const now = new Date();
      const diffMinutes = (now.getTime() - date.getTime()) / (1000 * 60);
      expect(diffMinutes).toBeGreaterThanOrEqual(0.4);
      expect(diffMinutes).toBeLessThanOrEqual(0.6);
    });

    it("should generate timestamp for 'five minutes ago' scenario", () => {
      // Arrange
      const scenario: TimestampScenario = {
        name: "five_minutes",
        description: "5 minutes ago",
        minutesAgo: 5,
        expectedRelativeTime: "5 minutes ago",
      };

      // Act
      const timestamp = TimestampGenerator.generateScenarioTimestamp(scenario);

      // Assert
      expect(TimestampGenerator.isValidISOTimestamp(timestamp)).toBe(true);
      
      const date = new Date(timestamp);
      const now = new Date();
      const diffMinutes = (now.getTime() - date.getTime()) / (1000 * 60);
      expect(diffMinutes).toBeGreaterThanOrEqual(4.9);
      expect(diffMinutes).toBeLessThanOrEqual(5.1);
    });

    it("should generate timestamp for 'yesterday' scenario", () => {
      // Arrange
      const scenario: TimestampScenario = {
        name: "yesterday",
        description: "1 day ago",
        minutesAgo: 1440,
        expectedRelativeTime: "1 day ago",
      };

      // Act
      const timestamp = TimestampGenerator.generateScenarioTimestamp(scenario);

      // Assert
      expect(TimestampGenerator.isValidISOTimestamp(timestamp)).toBe(true);
      
      const date = new Date(timestamp);
      const now = new Date();
      const diffDays = (now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24);
      expect(diffDays).toBeGreaterThanOrEqual(0.9);
      expect(diffDays).toBeLessThanOrEqual(1.1);
    });

    it("should generate timestamp for 'one week ago' scenario", () => {
      // Arrange
      const scenario: TimestampScenario = {
        name: "one_week",
        description: "1 week ago",
        minutesAgo: 10080,
        expectedRelativeTime: "1 week ago",
      };

      // Act
      const timestamp = TimestampGenerator.generateScenarioTimestamp(scenario);

      // Assert
      expect(TimestampGenerator.isValidISOTimestamp(timestamp)).toBe(true);
      
      const date = new Date(timestamp);
      const now = new Date();
      const diffDays = (now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24);
      expect(diffDays).toBeGreaterThanOrEqual(6.9);
      expect(diffDays).toBeLessThanOrEqual(7.1);
    });
  });

  describe("getTimestampScenarios", () => {
    it("should return comprehensive timestamp scenarios", () => {
      // Act
      const scenarios = TimestampGenerator.getTimestampScenarios();

      // Assert
      expect(scenarios).toHaveLength(11); // 11 predefined scenarios

      // Check for key scenarios
      const scenarioNames = scenarios.map(s => s.name);
      expect(scenarioNames).toContain("just_now");
      expect(scenarioNames).toContain("five_minutes");
      expect(scenarioNames).toContain("one_hour");
      expect(scenarioNames).toContain("yesterday");
      expect(scenarioNames).toContain("one_week");
      expect(scenarioNames).toContain("one_month");

      // Validate all scenarios have required properties
      scenarios.forEach(scenario => {
        expect(scenario.name).toBeDefined();
        expect(scenario.description).toBeDefined();
        expect(scenario.minutesAgo).toBeGreaterThan(0);
        expect(scenario.expectedRelativeTime).toBeDefined();
      });
    });

    it("should have realistic time intervals between scenarios", () => {
      // Act
      const scenarios = TimestampGenerator.getTimestampScenarios();

      // Assert
      // Check that scenarios progress logically
      for (let i = 1; i < scenarios.length; i++) {
        expect(scenarios[i].minutesAgo).toBeGreaterThan(scenarios[i - 1].minutesAgo);
      }

      // Check specific intervals
      const justNow = scenarios.find(s => s.name === "just_now");
      const fiveMinutes = scenarios.find(s => s.name === "five_minutes");
      const oneHour = scenarios.find(s => s.name === "one_hour");

      expect(justNow!.minutesAgo).toBe(0.5);
      expect(fiveMinutes!.minutesAgo).toBe(5);
      expect(oneHour!.minutesAgo).toBe(60);
    });
  });

  describe("generateWorkflowTimestamps", () => {
    it("should generate timestamps for various development workflow patterns", () => {
      // Act
      const workflowTimestamps = TimestampGenerator.generateWorkflowTimestamps();

      // Assert
      expect(workflowTimestamps).toHaveLength(8); // 8 workflow patterns

      // Validate each workflow pattern
      workflowTimestamps.forEach((timestamps, index) => {
        expect(TimestampGenerator.isValidISOTimestamp(timestamps.createdDate)).toBe(true);
        expect(TimestampGenerator.isValidISOTimestamp(timestamps.lastModified)).toBe(true);
        
        if (timestamps.lastRunDate) {
          expect(TimestampGenerator.isValidISOTimestamp(timestamps.lastRunDate)).toBe(true);
        }

        // Validate logical progression
        const created = new Date(timestamps.createdDate);
        const modified = new Date(timestamps.lastModified);
        expect(modified.getTime()).toBeGreaterThanOrEqual(created.getTime());

        if (timestamps.lastRunDate) {
          const testRun = new Date(timestamps.lastRunDate);
          expect(testRun.getTime()).toBeGreaterThanOrEqual(modified.getTime());
        }
      });
    });

    it("should provide variety in task ages and activity patterns", () => {
      // Act
      const workflowTimestamps = TimestampGenerator.generateWorkflowTimestamps();

      // Assert
      const now = new Date();
      const ages = workflowTimestamps.map(t => {
        const created = new Date(t.createdDate);
        return (now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24);
      });

      // Should have variety in task ages
      const uniqueAges = new Set(ages.map(age => Math.floor(age)));
      expect(uniqueAges.size).toBeGreaterThan(3); // At least 3 different age categories

      // Should have some recent and some older tasks
      const hasRecent = ages.some(age => age < 1); // Less than 1 day
      const hasOlder = ages.some(age => age > 7); // More than 1 week
      expect(hasRecent).toBe(true);
      expect(hasOlder).toBe(true);
    });
  });

  describe("generateTimestampsInRange", () => {
    it("should generate timestamps in minutes range", () => {
      // Act
      const timestamps = TimestampGenerator.generateTimestampsInRange("minutes", 5);

      // Assert
      expect(timestamps).toHaveLength(5);
      timestamps.forEach(timestamp => {
        expect(TimestampGenerator.isValidISOTimestamp(timestamp)).toBe(true);
      });

      // All should be within 0-60 minutes ago
      const now = new Date();
      timestamps.forEach(timestamp => {
        const date = new Date(timestamp);
        const diffMinutes = (now.getTime() - date.getTime()) / (1000 * 60);
        expect(diffMinutes).toBeGreaterThanOrEqual(0);
        expect(diffMinutes).toBeLessThanOrEqual(60);
      });
    });

    it("should generate timestamps in hours range", () => {
      // Act
      const timestamps = TimestampGenerator.generateTimestampsInRange("hours", 3);

      // Assert
      expect(timestamps).toHaveLength(3);
      timestamps.forEach(timestamp => {
        expect(TimestampGenerator.isValidISOTimestamp(timestamp)).toBe(true);
      });

      // All should be within 1-23 hours ago
      const now = new Date();
      timestamps.forEach(timestamp => {
        const date = new Date(timestamp);
        const diffHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);
        expect(diffHours).toBeGreaterThanOrEqual(1);
        expect(diffHours).toBeLessThanOrEqual(23);
      });
    });

    it("should generate timestamps in days range", () => {
      // Act
      const timestamps = TimestampGenerator.generateTimestampsInRange("days", 4);

      // Assert
      expect(timestamps).toHaveLength(4);
      timestamps.forEach(timestamp => {
        expect(TimestampGenerator.isValidISOTimestamp(timestamp)).toBe(true);
      });

      // All should be within 1-7 days ago (with small tolerance for rounding)
      const now = new Date();
      timestamps.forEach(timestamp => {
        const date = new Date(timestamp);
        const diffDays = (now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24);
        expect(diffDays).toBeGreaterThanOrEqual(1);
        expect(diffDays).toBeLessThanOrEqual(7.5); // Allow small tolerance for rounding
      });
    });

    it("should return timestamps sorted by recency (most recent first)", () => {
      // Act
      const timestamps = TimestampGenerator.generateTimestampsInRange("days", 5);

      // Assert
      expect(timestamps).toHaveLength(5);

      // Check sorting (most recent first)
      for (let i = 1; i < timestamps.length; i++) {
        const current = new Date(timestamps[i - 1]);
        const next = new Date(timestamps[i]);
        expect(current.getTime()).toBeGreaterThanOrEqual(next.getTime());
      }
    });
  });

  describe("isValidISOTimestamp", () => {
    it("should validate correct ISO 8601 timestamps", () => {
      // Arrange
      const validTimestamps = [
        "2024-08-22T10:30:00.000Z",
        "2024-08-22T10:30:00Z",
        "2024-01-01T00:00:00.000Z",
        "2024-12-31T23:59:59.999Z",
      ];

      // Act & Assert
      validTimestamps.forEach(timestamp => {
        expect(TimestampGenerator.isValidISOTimestamp(timestamp)).toBe(true);
      });
    });

    it("should reject invalid timestamp formats", () => {
      // Arrange
      const invalidTimestamps = [
        "2024-08-22 10:30:00", // Missing T and Z
        "2024-08-22T10:30:00", // Missing Z
        "2024/08/22T10:30:00Z", // Wrong date separator
        "invalid-date",
        "",
        "2024-13-01T00:00:00Z", // Invalid month
        "2024-08-32T00:00:00Z", // Invalid day
      ];

      // Act & Assert
      invalidTimestamps.forEach(timestamp => {
        expect(TimestampGenerator.isValidISOTimestamp(timestamp)).toBe(false);
      });
    });

    it("should handle edge cases gracefully", () => {
      // Act & Assert
      expect(TimestampGenerator.isValidISOTimestamp("")).toBe(false);
      expect(TimestampGenerator.isValidISOTimestamp("   ")).toBe(false);
      expect(TimestampGenerator.isValidISOTimestamp(null as any)).toBe(false);
      expect(TimestampGenerator.isValidISOTimestamp(undefined as any)).toBe(false);
    });
  });

  describe("ensureLogicalProgression", () => {
    it("should fix timestamps with invalid progression", () => {
      // Arrange
      const invalidTimestamps: TaskTimestamps = {
        createdDate: "2024-08-22T10:00:00Z",
        lastModified: "2024-08-22T09:00:00Z", // Before created date
        lastRunDate: "2024-08-22T08:00:00Z", // Before both
      };

      // Act
      const fixedTimestamps = TimestampGenerator.ensureLogicalProgression(invalidTimestamps);

      // Assert
      expect(fixedTimestamps.createdDate).toBe(invalidTimestamps.createdDate);
      
      const created = new Date(fixedTimestamps.createdDate);
      const modified = new Date(fixedTimestamps.lastModified);
      const testRun = new Date(fixedTimestamps.lastRunDate!);

      expect(modified.getTime()).toBeGreaterThan(created.getTime());
      expect(testRun.getTime()).toBeGreaterThan(modified.getTime());
    });

    it("should preserve valid timestamp progression", () => {
      // Arrange
      const validTimestamps: TaskTimestamps = {
        createdDate: "2024-08-22T09:00:00Z",
        lastModified: "2024-08-22T10:00:00Z",
        lastRunDate: "2024-08-22T11:00:00Z",
      };

      // Act
      const result = TimestampGenerator.ensureLogicalProgression(validTimestamps);

      // Assert
      expect(result.createdDate).toBe(validTimestamps.createdDate);
      // Use toISOString() to normalize timestamp format for comparison
      expect(new Date(result.lastModified).toISOString()).toBe(new Date(validTimestamps.lastModified).toISOString());
      expect(new Date(result.lastRunDate!).toISOString()).toBe(new Date(validTimestamps.lastRunDate!).toISOString());
    });

    it("should handle timestamps without test run date", () => {
      // Arrange
      const timestamps: TaskTimestamps = {
        createdDate: "2024-08-22T09:00:00Z",
        lastModified: "2024-08-22T08:00:00Z", // Invalid
      };

      // Act
      const result = TimestampGenerator.ensureLogicalProgression(timestamps);

      // Assert
      expect(result.createdDate).toBe(timestamps.createdDate);
      expect(result.lastRunDate).toBeUndefined();

      const created = new Date(result.createdDate);
      const modified = new Date(result.lastModified);
      expect(modified.getTime()).toBeGreaterThan(created.getTime());
    });
  });

  describe("getCurrentTimestamp", () => {
    it("should return current time in ISO format", () => {
      // Act
      const timestamp = TimestampGenerator.getCurrentTimestamp();
      const now = new Date();

      // Assert
      expect(TimestampGenerator.isValidISOTimestamp(timestamp)).toBe(true);
      
      const timestampDate = new Date(timestamp);
      const diffMs = Math.abs(now.getTime() - timestampDate.getTime());
      
      // Should be very recent (within 100ms for test execution)
      expect(diffMs).toBeLessThan(100);
    });
  });

  describe("getTimeDifferenceInMinutes", () => {
    it("should calculate time difference between two timestamps", () => {
      // Arrange
      const timestamp1 = "2024-08-22T10:00:00Z";
      const timestamp2 = "2024-08-22T11:30:00Z"; // 90 minutes later

      // Act
      const diffMinutes = TimestampGenerator.getTimeDifferenceInMinutes(timestamp1, timestamp2);

      // Assert
      expect(diffMinutes).toBe(90);
    });

    it("should handle timestamps in reverse order", () => {
      // Arrange
      const timestamp1 = "2024-08-22T11:30:00Z";
      const timestamp2 = "2024-08-22T10:00:00Z"; // 90 minutes earlier

      // Act
      const diffMinutes = TimestampGenerator.getTimeDifferenceInMinutes(timestamp1, timestamp2);

      // Assert
      expect(diffMinutes).toBe(90); // Should return absolute difference
    });

    it("should handle same timestamp", () => {
      // Arrange
      const timestamp = "2024-08-22T10:00:00Z";

      // Act
      const diffMinutes = TimestampGenerator.getTimeDifferenceInMinutes(timestamp, timestamp);

      // Assert
      expect(diffMinutes).toBe(0);
    });
  });

  describe("Integration with TimeFormattingUtility", () => {
    it("should generate timestamps that work with relative time formatting", () => {
      // Act
      const timestamps = TimestampGenerator.generateTaskTimestamps(1, true, true);
      
      // Assert - All timestamps should be valid ISO format
      expect(TimestampGenerator.isValidISOTimestamp(timestamps.createdDate)).toBe(true);
      expect(TimestampGenerator.isValidISOTimestamp(timestamps.lastModified)).toBe(true);
      if (timestamps.lastRunDate) {
        expect(TimestampGenerator.isValidISOTimestamp(timestamps.lastRunDate)).toBe(true);
      }

      // Validate that timestamps can be parsed by Date constructor
      expect(() => new Date(timestamps.createdDate)).not.toThrow();
      expect(() => new Date(timestamps.lastModified)).not.toThrow();
      if (timestamps.lastRunDate) {
        expect(() => new Date(timestamps.lastRunDate!)).not.toThrow();
      }
    });

    it("should provide sufficient variety for comprehensive testing", () => {
      // Act
      const scenarios = TimestampGenerator.getTimestampScenarios();
      const workflowTimestamps = TimestampGenerator.generateWorkflowTimestamps();

      // Assert
      // Should have variety in time ranges
      const timeRanges = scenarios.map(s => s.minutesAgo);
      expect(Math.min(...timeRanges)).toBeLessThan(1); // Less than 1 minute
      expect(Math.max(...timeRanges)).toBeGreaterThan(40000); // More than 1 month

      // Should have variety in workflow patterns
      expect(workflowTimestamps.length).toBeGreaterThan(5);
      
      // Should cover different development scenarios
      const hasRecent = workflowTimestamps.some(t => {
        const created = new Date(t.createdDate);
        const now = new Date();
        return (now.getTime() - created.getTime()) < 24 * 60 * 60 * 1000; // Less than 1 day
      });
      const hasOlder = workflowTimestamps.some(t => {
        const created = new Date(t.createdDate);
        const now = new Date();
        return (now.getTime() - created.getTime()) > 7 * 24 * 60 * 60 * 1000; // More than 1 week
      });
      
      expect(hasRecent).toBe(true);
      expect(hasOlder).toBe(true);
    });
  });
});
