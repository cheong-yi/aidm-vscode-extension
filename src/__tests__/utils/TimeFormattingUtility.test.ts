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

    describe("Caching behavior", () => {
      it("should cache formatted results for performance", () => {
        const isoDate = "2024-08-22T14:00:00Z";

        // First call should format
        const firstResult = utility.formatRelativeTime(isoDate);
        expect(firstResult).toBe("1 hour ago");

        // Second call should use cache
        const secondResult = utility.formatRelativeTime(isoDate);
        expect(secondResult).toBe("1 hour ago");

        // Verify cache stats
        const stats = utility.getCacheStats();
        expect(stats.size).toBeGreaterThan(0);
      });

      it("should clear cache when requested", () => {
        const isoDate = "2024-08-22T14:00:00Z";
        utility.formatRelativeTime(isoDate);

        const statsBefore = utility.getCacheStats();
        expect(statsBefore.size).toBeGreaterThan(0);

        utility.clearCache();

        const statsAfter = utility.getCacheStats();
        expect(statsAfter.size).toBe(0);
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

  describe("Performance considerations", () => {
    it("should handle repeated calls efficiently with caching", () => {
      const isoDate = "2024-08-22T14:00:00Z";
      const startTime = performance.now();

      // Make multiple calls
      for (let i = 0; i < 100; i++) {
        utility.formatRelativeTime(isoDate);
      }

      const endTime = performance.now();
      const totalTime = endTime - startTime;

      // Should complete quickly due to caching
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

  describe("Cache management", () => {
    it("should provide cache statistics", () => {
      const stats = utility.getCacheStats();
      expect(stats).toHaveProperty("size");
      expect(stats).toHaveProperty("hitRate");
      expect(typeof stats.size).toBe("number");
      expect(typeof stats.hitRate).toBe("number");
    });

    it("should clear cache completely", () => {
      // Add some items to cache
      utility.formatRelativeTime("2024-08-22T14:00:00Z");
      utility.formatRelativeTime("2024-08-22T13:00:00Z");

      const statsBefore = utility.getCacheStats();
      expect(statsBefore.size).toBeGreaterThan(0);

      utility.clearCache();

      const statsAfter = utility.getCacheStats();
      expect(statsAfter.size).toBe(0);
    });
  });
});
