/**
 * TimeFormattingUtility Test Suite
 * Task: 2.7.1 - Create TimeFormattingUtility class structure
 * Requirements: 4.8, 9.1, 9.3
 *
 * Tests all public methods and error scenarios for the TimeFormattingUtility class
 */

import { TimeFormattingUtility } from "../../utils/TimeFormattingUtility";

describe("TimeFormattingUtility", () => {
  let utility: TimeFormattingUtility;
  let mockDate: Date;

  beforeEach(() => {
    utility = new TimeFormattingUtility();

    // Mock current date for consistent testing
    mockDate = new Date("2024-08-22T15:00:00Z");
    jest.useFakeTimers();
    jest.setSystemTime(mockDate);
  });

  afterEach(() => {
    jest.useRealTimers();
    utility.clearCache();
  });

  describe("formatRelativeTime", () => {
    describe("Past dates", () => {
      it("should format recent seconds as 'just now'", () => {
        const isoDate = "2024-08-22T14:59:30Z"; // 30 seconds ago
        const result = utility.formatRelativeTime(isoDate);
        expect(result).toBe("just now");
      });

      it("should format 25 seconds ago as 'just now'", () => {
        const isoDate = "2024-08-22T14:59:35Z"; // 25 seconds ago
        const result = utility.formatRelativeTime(isoDate);
        expect(result).toBe("just now");
      });

      it("should format 35 seconds ago as '1 minute ago'", () => {
        const isoDate = "2024-08-22T14:59:25Z"; // 35 seconds ago
        const result = utility.formatRelativeTime(isoDate);
        expect(result).toBe("1 minute ago");
      });

      it("should format 1 minute ago correctly", () => {
        const isoDate = "2024-08-22T14:59:00Z"; // 1 minute ago
        const result = utility.formatRelativeTime(isoDate);
        expect(result).toBe("1 minute ago");
      });

      it("should format multiple minutes ago correctly", () => {
        const isoDate = "2024-08-22T14:45:00Z"; // 15 minutes ago
        const result = utility.formatRelativeTime(isoDate);
        expect(result).toBe("15 minutes ago");
      });

      it("should format 1 hour ago correctly", () => {
        const isoDate = "2024-08-22T14:00:00Z"; // 1 hour ago
        const result = utility.formatRelativeTime(isoDate);
        expect(result).toBe("1 hour ago");
      });

      it("should format multiple hours ago correctly", () => {
        const isoDate = "2024-08-22T12:00:00Z"; // 3 hours ago
        const result = utility.formatRelativeTime(isoDate);
        expect(result).toBe("3 hours ago");
      });

      it("should format 1 day ago correctly", () => {
        const isoDate = "2024-08-21T15:00:00Z"; // 1 day ago
        const result = utility.formatRelativeTime(isoDate);
        expect(result).toBe("1 day ago");
      });

      it("should format multiple days ago correctly", () => {
        const isoDate = "2024-08-20T15:00:00Z"; // 2 days ago
        const result = utility.formatRelativeTime(isoDate);
        expect(result).toBe("2 days ago");
      });

      it("should format 1 week ago correctly", () => {
        const isoDate = "2024-08-15T15:00:00Z"; // 1 week ago
        const result = utility.formatRelativeTime(isoDate);
        expect(result).toBe("1 week ago");
      });

      it("should format multiple weeks ago correctly", () => {
        const isoDate = "2024-08-08T15:00:00Z"; // 2 weeks ago
        const result = utility.formatRelativeTime(isoDate);
        expect(result).toBe("2 weeks ago");
      });

      it("should format dates older than 4 weeks as absolute date", () => {
        const isoDate = "2024-07-15T15:00:00Z"; // 5 weeks ago
        const result = utility.formatRelativeTime(isoDate);
        expect(result).toMatch(/^\d{1,2}\/\d{1,2}\/\d{4}$/); // Local date format
      });
    });

    describe("Future dates", () => {
      it("should format future seconds correctly", () => {
        const isoDate = "2024-08-22T15:00:30Z"; // 30 seconds in future
        const result = utility.formatRelativeTime(isoDate);
        expect(result).toBe("in a few seconds");
      });

      it("should format 25 seconds in future as 'in a few seconds'", () => {
        const isoDate = "2024-08-22T15:00:25Z"; // 25 seconds in future
        const result = utility.formatRelativeTime(isoDate);
        expect(result).toBe("in a few seconds");
      });

      it("should format 35 seconds in future as 'in 1 minute'", () => {
        const isoDate = "2024-08-22T15:00:35Z"; // 35 seconds in future
        const result = utility.formatRelativeTime(isoDate);
        expect(result).toBe("in 1 minute");
      });

      it("should format future minutes correctly", () => {
        const isoDate = "2024-08-22T15:05:00Z"; // 5 minutes in future
        const result = utility.formatRelativeTime(isoDate);
        expect(result).toBe("in 5 minutes");
      });

      it("should format future hours correctly", () => {
        const isoDate = "2024-08-22T17:00:00Z"; // 2 hours in future
        const result = utility.formatRelativeTime(isoDate);
        expect(result).toBe("in 2 hours");
      });

      it("should format future days correctly", () => {
        const isoDate = "2024-08-23T15:00:00Z"; // 1 day in future
        const result = utility.formatRelativeTime(isoDate);
        expect(result).toBe("in 1 day");
      });
    });

    describe("Edge cases and error handling", () => {
      it("should handle invalid ISO date strings gracefully", () => {
        const invalidDate = "invalid-date-string";
        const result = utility.formatRelativeTime(invalidDate);
        expect(result).toBe(invalidDate); // Return original string as fallback
      });

      it("should handle null input gracefully", () => {
        const result = utility.formatRelativeTime(null as any);
        expect(result).toBe("invalid date");
      });

      it("should handle undefined input gracefully", () => {
        const result = utility.formatRelativeTime(undefined as any);
        expect(result).toBe("invalid date");
      });

      it("should handle empty string input gracefully", () => {
        const result = utility.formatRelativeTime("");
        expect(result).toBe("");
      });

      it("should handle non-string input gracefully", () => {
        const result = utility.formatRelativeTime(123 as any);
        expect(result).toBe(123);
      });

      it("should handle malformed date that results in NaN", () => {
        const malformedDate = "2024-13-45T25:70:99Z"; // Invalid date components
        const result = utility.formatRelativeTime(malformedDate);
        expect(result).toBe(malformedDate); // Return original string as fallback
      });
    });
  });

  describe("formatDuration", () => {
    describe("Valid duration inputs", () => {
      it("should format 0 minutes correctly", () => {
        const result = utility.formatDuration(0);
        expect(result).toBe("0 min");
      });

      it("should format fractional minutes as seconds", () => {
        const result = utility.formatDuration(0.5);
        expect(result).toBe("30 sec");
      });

      it("should format 1 minute correctly", () => {
        const result = utility.formatDuration(1);
        expect(result).toBe("1 min");
      });

      it("should format multiple minutes correctly", () => {
        const result = utility.formatDuration(45);
        expect(result).toBe("45 min");
      });

      it("should format 1 hour correctly", () => {
        const result = utility.formatDuration(60);
        expect(result).toBe("1 hour");
      });

      it("should format multiple hours correctly", () => {
        const result = utility.formatDuration(120);
        expect(result).toBe("2 hours");
      });

      it("should format hours with remaining minutes correctly", () => {
        const result = utility.formatDuration(90);
        expect(result).toBe("1 hour 30 min");
      });

      it("should format large durations correctly", () => {
        const result = utility.formatDuration(150);
        expect(result).toBe("2 hours 30 min");
      });

      it("should round fractional minutes appropriately", () => {
        const result = utility.formatDuration(45.7);
        expect(result).toBe("46 min");
      });
    });

    describe("Edge cases and error handling", () => {
      it("should handle negative durations gracefully", () => {
        const result = utility.formatDuration(-5);
        expect(result).toBe("0 min");
      });

      it("should handle NaN input gracefully", () => {
        const result = utility.formatDuration(NaN);
        expect(result).toBe("0 min");
      });

      it("should handle non-number input gracefully", () => {
        const result = utility.formatDuration("invalid" as any);
        expect(result).toBe("0 min");
      });

      it("should handle null input gracefully", () => {
        const result = utility.formatDuration(null as any);
        expect(result).toBe("0 min");
      });

      it("should handle undefined input gracefully", () => {
        const result = utility.formatDuration(undefined as any);
        expect(result).toBe("0 min");
      });
    });
  });

  describe("parseEstimatedDuration", () => {
    describe("Range format parsing", () => {
      it("should parse '15-30 min' format correctly", () => {
        const result = utility.parseEstimatedDuration("15-30 min");
        expect(result).toBe(22.5);
      });

      it("should parse '20-25 min' format correctly", () => {
        const result = utility.parseEstimatedDuration("20-25 min");
        expect(result).toBe(22.5);
      });

      it("should parse '1-2 hours' format correctly", () => {
        const result = utility.parseEstimatedDuration("1-2 hours");
        expect(result).toBe(90); // (60 + 120) / 2 = 90 minutes
      });

      it("should parse '30-45 min' format correctly", () => {
        const result = utility.parseEstimatedDuration("30-45 min");
        expect(result).toBe(37.5);
      });

      it("should parse '0.5-1 hour' format correctly", () => {
        const result = utility.parseEstimatedDuration("0.5-1 hour");
        expect(result).toBe(45); // (30 + 60) / 2 = 45 minutes
      });

      it("should handle various unit formats", () => {
        expect(utility.parseEstimatedDuration("15-30 minute")).toBe(22.5);
        expect(utility.parseEstimatedDuration("15-30 minutes")).toBe(22.5);
        expect(utility.parseEstimatedDuration("1-2 h")).toBe(90);
        expect(utility.parseEstimatedDuration("1-2 m")).toBe(1.5);
      });
    });

    describe("Single duration parsing", () => {
      it("should parse '45 min' format correctly", () => {
        const result = utility.parseEstimatedDuration("45 min");
        expect(result).toBe(45);
      });

      it("should parse '2 hours' format correctly", () => {
        const result = utility.parseEstimatedDuration("2 hours");
        expect(result).toBe(120);
      });

      it("should parse '1 hour' format correctly", () => {
        const result = utility.parseEstimatedDuration("1 hour");
        expect(result).toBe(60);
      });

      it("should parse '30 minute' format correctly", () => {
        const result = utility.parseEstimatedDuration("30 minute");
        expect(result).toBe(30);
      });

      it("should handle abbreviated units", () => {
        expect(utility.parseEstimatedDuration("45 m")).toBe(45);
        expect(utility.parseEstimatedDuration("2 h")).toBe(120);
      });

      it("should handle fractional values", () => {
        const result = utility.parseEstimatedDuration("0.5 hour");
        expect(result).toBe(30);
      });
    });

    describe("Edge cases and error handling", () => {
      it("should handle invalid range format gracefully", () => {
        const result = utility.parseEstimatedDuration("invalid format");
        expect(result).toBe(0);
      });

      it("should handle malformed range gracefully", () => {
        const result = utility.parseEstimatedDuration("15-");
        expect(result).toBe(0);
      });

      it("should handle invalid range values gracefully", () => {
        const result = utility.parseEstimatedDuration("30-15 min"); // max < min
        expect(result).toBe(0);
      });

      it("should handle non-numeric values gracefully", () => {
        const result = utility.parseEstimatedDuration("abc-def min");
        expect(result).toBe(0);
      });

      it("should handle null input gracefully", () => {
        const result = utility.parseEstimatedDuration(null as any);
        expect(result).toBe(0);
      });

      it("should handle undefined input gracefully", () => {
        const result = utility.parseEstimatedDuration(undefined as any);
        expect(result).toBe(0);
      });

      it("should handle empty string input gracefully", () => {
        const result = utility.parseEstimatedDuration("");
        expect(result).toBe(0);
      });

      it("should handle whitespace-only input gracefully", () => {
        const result = utility.parseEstimatedDuration("   ");
        expect(result).toBe(0);
      });

      it("should handle case-insensitive parsing", () => {
        expect(utility.parseEstimatedDuration("15-30 MIN")).toBe(22.5);
        expect(utility.parseEstimatedDuration("1-2 HOURS")).toBe(90);
      });
    });
  });

  describe("Integration with enhanced mock data", () => {
    it("should work with task lastModified timestamps", () => {
      const taskTimestamp = "2024-08-22T13:15:00Z"; // 1 hour 45 minutes ago
      const result = utility.formatRelativeTime(taskTimestamp);
      expect(result).toBe("1 hour 45 minutes ago");
    });

    it("should work with test status lastRunDate timestamps", () => {
      const testRunTimestamp = "2024-08-22T14:30:00Z"; // 30 minutes ago
      const result = utility.formatRelativeTime(testRunTimestamp);
      expect(result).toBe("30 minutes ago");
    });

    it("should parse enhanced task estimatedDuration fields", () => {
      const estimatedDuration = "15-30 min";
      const result = utility.parseEstimatedDuration(estimatedDuration);
      expect(result).toBe(22.5);
    });

    it("should handle various estimated duration formats from enhanced data", () => {
      const formats = [
        "15-30 min",
        "20-25 min",
        "1-2 hours",
        "45 min",
        "2 hours",
      ];

      const results = formats.map((format) =>
        utility.parseEstimatedDuration(format)
      );
      expect(results).toEqual([22.5, 22.5, 90, 45, 120]);
    });
  });

  describe("Task-specific input/output examples", () => {
    it("should handle exact task requirement test cases", () => {
      // Test cases from task requirements - adjusted for mocked time 2024-08-22T15:00:00Z
      const testCases = [
        { input: "2024-08-22T14:59:30Z", expected: "just now" }, // 30 seconds ago
        { input: "2024-08-22T14:55:00Z", expected: "5 minutes ago" },
        { input: "2024-08-22T14:00:00Z", expected: "1 hour ago" },
        { input: "2024-08-22T13:00:00Z", expected: "2 hours ago" },
        { input: "2024-08-21T15:00:00Z", expected: "1 day ago" },
        { input: "2024-08-15T15:00:00Z", expected: "1 week ago" },
      ];

      testCases.forEach(({ input, expected }) => {
        const result = utility.formatRelativeTime(input);
        expect(result).toBe(expected);
      });
    });

    it("should handle edge cases from task requirements", () => {
      // Edge cases from task requirements
      const edgeCases = [
        { input: "2024-08-22T15:00:30Z", description: "future date" },
        { input: "invalid-date-string", description: "invalid input" },
        {
          input: "2024-08-22T14:59:00Z",
          description: "exactly 1 minute boundary",
        },
      ];

      edgeCases.forEach(({ input, description }) => {
        const result = utility.formatRelativeTime(input);
        expect(typeof result).toBe("string");
        expect(result.length).toBeGreaterThan(0);
      });
    });

    it("should handle grammar requirements correctly", () => {
      // Grammar cases from task requirements
      const grammarCases = [
        { diff: 1, unit: "minute", expected: "1 minute ago" },
        { diff: 2, unit: "minutes", expected: "2 minutes ago" },
        { diff: 1, unit: "hour", expected: "1 hour ago" },
        { diff: 1, unit: "day", expected: "1 day ago" },
      ];

      // Test with actual timestamps
      const now = new Date("2024-08-22T15:00:00Z");

      // Test 1 minute ago
      const oneMinuteAgo = new Date(now.getTime() - 60000);
      const result1 = utility.formatRelativeTime(oneMinuteAgo.toISOString());
      expect(result1).toBe("1 minute ago");

      // Test 2 minutes ago
      const twoMinutesAgo = new Date(now.getTime() - 120000);
      const result2 = utility.formatRelativeTime(twoMinutesAgo.toISOString());
      expect(result2).toBe("2 minutes ago");
    });
  });

  describe("Performance considerations", () => {
    it("should complete single calculation in under 20ms", () => {
      const isoDate = "2024-08-22T14:00:00Z";
      const startTime = performance.now();

      // Single calculation
      utility.formatRelativeTime(isoDate);

      const endTime = performance.now();
      const calculationTime = endTime - startTime;

      // Should complete in under 20ms as per task requirement
      expect(calculationTime).toBeLessThan(20);
    });

    it("should handle repeated calls efficiently", () => {
      const isoDate = "2024-08-22T14:00:00Z";
      const startTime = performance.now();

      // Make multiple calls
      for (let i = 0; i < 100; i++) {
        utility.formatRelativeTime(isoDate);
      }

      const endTime = performance.now();
      const totalTime = endTime - startTime;

      // Should complete quickly even without caching
      expect(totalTime).toBeLessThan(100); // Less than 100ms for 100 calls
    });

    it("should handle repeated calls efficiently with caching (when enabled)", () => {
      const isoDate = "2024-08-22T14:00:00Z";
      const startTime = performance.now();

      // Make multiple calls
      for (let i = 0; i < 100; i++) {
        utility.formatRelativeTime(isoDate);
      }

      const endTime = performance.now();
      const totalTime = endTime - startTime;

      // Should complete quickly even without caching
      expect(totalTime).toBeLessThan(100); // Less than 100ms for 100 calls
    });

    it("should maintain consistent performance for duration parsing", () => {
      const duration = "15-30 min";
      const startTime = performance.now();

      // Make multiple calls
      for (let i = 0; i < 100; i++) {
        utility.parseEstimatedDuration(duration);
      }

      const endTime = performance.now();
      const totalTime = endTime - startTime;

      // Should complete quickly
      expect(totalTime).toBeLessThan(50); // Less than 50ms for 100 calls
    });
  });

  describe("Caching behavior (commented out for task 2.7.2)", () => {
    it("should provide cache statistics", () => {
      const stats = utility.getCacheStats();
      expect(stats).toHaveProperty("size");
      expect(stats).toHaveProperty("hitRate");
      expect(typeof stats.size).toBe("number");
      expect(typeof stats.hitRate).toBe("number");
    });

    it("should clear cache completely", () => {
      // Since caching is commented out for task 2.7.2, the cache will be empty
      // This test documents the expected behavior when caching is disabled
      const statsBefore = utility.getCacheStats();
      expect(statsBefore.size).toBe(0); // Cache is empty when disabled

      utility.clearCache();

      const statsAfter = utility.getCacheStats();
      expect(statsAfter.size).toBe(0); // Still empty after clearing
    });

    it("should demonstrate caching behavior when enabled", () => {
      // This test documents the expected caching behavior for task 2.7.3
      const isoDate = "2024-08-22T14:00:00Z";

      // First call should format
      const firstResult = utility.formatRelativeTime(isoDate);
      expect(firstResult).toBe("1 hour ago");

      // Second call should also format (since caching is disabled for 2.7.2)
      const secondResult = utility.formatRelativeTime(isoDate);
      expect(secondResult).toBe("1 hour ago");

      // Verify cache stats (should be 0 since caching is disabled)
      const stats = utility.getCacheStats();
      expect(stats.size).toBe(0);
    });
  });
});
