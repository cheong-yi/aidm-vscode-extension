/**
 * TimeFormattingUtility - Time formatting and parsing utilities
 * Task: 2.7.3 - Add time formatting caching mechanism
 * Requirements: 4.8, 9.1, 9.3
 *
 * Provides consistent time formatting for UI components including:
 * - Relative time formatting ("2 hours ago")
 * - Duration formatting ("45 min", "2 hours 30 min")
 * - Estimated duration parsing ("15-30 min" -> 22.5)
 * - Performance-optimized caching with 1-minute TTL
 */

import { Logger, LogLevel } from "./logger";

export interface TimeFormattingUtility {
  formatRelativeTime(isoDate: string): string;
  formatDuration(minutes: number): string;
  parseEstimatedDuration(duration: string): number; // "15-30 min" -> 22.5

  // Enhanced caching methods
  clearCache(): void;
  getCacheStats(): {
    hits: number;
    misses: number;
    size: number;
    hitRate: number;
  };
}

export class TimeFormattingUtility implements TimeFormattingUtility {
  private logger: Logger;

  // Enhanced cache for relative time formatting with TTL tracking
  private relativeTimeCache: Map<
    string,
    { formatted: string; timestamp: number; ttl: number }
  > = new Map();
  private readonly cacheTTL = 60000; // 1 minute cache TTL

  // Cache performance tracking
  private cacheHits = 0;
  private cacheMisses = 0;

  constructor() {
    this.logger = new Logger("TimeFormattingUtility", {
      level: LogLevel.INFO,
      enableConsole: true,
      sanitizeData: true,
    });
  }

  /**
   * Formats an ISO date string to relative time (e.g., "2 hours ago")
   * Handles invalid dates gracefully by returning the original string
   * Now includes performance-optimized caching with 1-minute TTL
   *
   * @param isoDate - ISO 8601 date string
   * @returns Human-readable relative time or original string on error
   */
  formatRelativeTime(isoDate: string): string {
    if (typeof isoDate !== "string") {
      this.logger.warn("Invalid ISO date input", {
        isoDate,
        type: typeof isoDate,
      });
      return isoDate || "invalid date";
    }

    // Handle empty string case
    if (isoDate.trim() === "") {
      return "";
    }

    if (!isoDate) {
      this.logger.warn("Invalid ISO date input", {
        isoDate,
        type: typeof isoDate,
      });
      return "invalid date";
    }

    // Check cache first for performance optimization
    const cacheKey = isoDate;
    const cached = this.relativeTimeCache.get(cacheKey);
    const now = Date.now();

    if (cached && now - cached.timestamp < cached.ttl) {
      // Cache hit - return cached value
      this.cacheHits++;
      this.logger.debug("Cache hit for relative time formatting", {
        isoDate,
        cachedValue: cached.formatted,
        age: now - cached.timestamp,
      });
      return cached.formatted;
    }

    // Cache miss or expired - calculate and cache
    this.cacheMisses++;
    this.logger.debug("Cache miss for relative time formatting", {
      isoDate,
      cacheSize: this.relativeTimeCache.size,
    });

    try {
      const date = new Date(isoDate);

      // Validate date
      if (isNaN(date.getTime())) {
        this.logger.warn("Invalid ISO date format", { isoDate });
        return isoDate; // Return original string as fallback
      }

      const diffMs = now - date.getTime();
      const diffSeconds = Math.floor(diffMs / 1000);
      const diffMinutes = Math.floor(diffSeconds / 60);
      const diffHours = Math.floor(diffMinutes / 60);
      const diffDays = Math.floor(diffHours / 24);
      const diffWeeks = Math.floor(diffDays / 7);

      let formatted: string;

      if (diffMs < 0) {
        // Future date - diffMs is negative, so diffMinutes, diffHours, diffDays are negative
        if (Math.abs(diffMs) <= 30000) {
          // 30 seconds or less (matching task requirement)
          formatted = "in a few seconds";
        } else if (Math.abs(diffMinutes) < 1) {
          // 30-59 seconds in future, round up to 1 minute
          formatted = "in 1 minute";
        } else if (Math.abs(diffMs) < 3600000) {
          // Less than 1 hour (60 minutes)
          const futureMinutes = Math.abs(diffMinutes);
          formatted =
            futureMinutes === 1 ? "in 1 minute" : `in ${futureMinutes} minutes`;
        } else if (Math.abs(diffMs) < 86400000) {
          // Less than 1 day (24 hours)
          const futureHours = Math.abs(diffHours);
          formatted =
            futureHours === 1 ? "in 1 hour" : `in ${futureHours} hours`;
        } else {
          const futureDays = Math.abs(diffDays);
          formatted = futureDays === 1 ? "in 1 day" : `in ${futureDays} days`;
        }
      } else {
        // Past date
        if (diffSeconds <= 30) {
          // 30 seconds or less (matching task requirement)
          formatted = "just now";
        } else if (diffMinutes < 1) {
          // 30-59 seconds ago, round up to 1 minute
          formatted = "1 minute ago";
        } else if (diffMinutes < 60) {
          formatted =
            diffMinutes === 1 ? "1 minute ago" : `${diffMinutes} minutes ago`;
        } else if (diffHours < 24) {
          // Handle hours with remaining minutes for more precise display
          if (diffMinutes % 60 === 0) {
            formatted =
              diffHours === 1 ? "1 hour ago" : `${diffHours} hours ago`;
          } else {
            const remainingMinutes = diffMinutes % 60;
            if (diffHours === 1) {
              formatted = `1 hour ${remainingMinutes} minutes ago`;
            } else {
              formatted = `${diffHours} hours ${remainingMinutes} minutes ago`;
            }
          }
        } else if (diffDays < 7) {
          formatted = diffDays === 1 ? "1 day ago" : `${diffDays} days ago`;
        } else if (diffWeeks < 4) {
          formatted = diffWeeks === 1 ? "1 week ago" : `${diffWeeks} weeks ago`;
        } else {
          // For dates older than 4 weeks, show absolute date
          formatted = date.toLocaleDateString();
        }
      }

      // Cache the result with TTL
      this.relativeTimeCache.set(cacheKey, {
        formatted,
        timestamp: now,
        ttl: this.cacheTTL,
      });

      // Clean up expired cache entries to prevent memory leaks
      this.cleanupExpiredCache();

      return formatted;
    } catch (error) {
      this.logger.error("Error formatting relative time", error as Error, {
        isoDate,
      });
      return isoDate; // Return original string as fallback
    }
  }

  /**
   * Formats duration in minutes to human-readable format
   *
   * @param minutes - Duration in minutes (can be fractional)
   * @returns Formatted duration string
   */
  formatDuration(minutes: number): string {
    if (typeof minutes !== "number" || isNaN(minutes)) {
      this.logger.warn("Invalid duration input", {
        minutes,
        type: typeof minutes,
      });
      return "0 min";
    }

    if (minutes < 0) {
      this.logger.warn("Negative duration input", { minutes });
      return "0 min";
    }

    if (minutes === 0) {
      return "0 min";
    }

    if (minutes < 1) {
      // Less than 1 minute
      const seconds = Math.round(minutes * 60);
      return `${seconds} sec`;
    }

    if (minutes < 60) {
      // Less than 1 hour
      const roundedMinutes = Math.round(minutes);
      return `${roundedMinutes} min`;
    }

    // 1 hour or more
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = Math.round(minutes % 60);

    if (remainingMinutes === 0) {
      return hours === 1 ? "1 hour" : `${hours} hours`;
    } else {
      const hourText = hours === 1 ? "1 hour" : `${hours} hours`;
      const minuteText =
        remainingMinutes === 1 ? "1 min" : `${remainingMinutes} min`;
      return `${hourText} ${minuteText}`;
    }
  }

  /**
   * Parses estimated duration string to numeric average
   * Handles formats like "15-30 min", "20-25 min", "45 min"
   *
   * @param duration - Duration string in various formats
   * @returns Numeric average in minutes, or 0 on error
   */
  parseEstimatedDuration(duration: string): number {
    if (!duration || typeof duration !== "string") {
      this.logger.warn("Invalid duration string input", {
        duration,
        type: typeof duration,
      });
      return 0;
    }

    try {
      const trimmed = duration.trim().toLowerCase();

      // Handle single duration (e.g., "45 min", "2 hours")
      if (!trimmed.includes("-")) {
        return this.parseSingleDuration(trimmed);
      }

      // Handle range format (e.g., "15-30 min", "1-2 hours")
      const rangeMatch = trimmed.match(
        /^(\d+(?:\.\d+)?)\s*-\s*(\d+(?:\.\d+)?)\s*(min|minute|minutes|hour|hours|h|m)$/
      );

      if (rangeMatch) {
        const [, minStr, maxStr, unit] = rangeMatch;
        const min = parseFloat(minStr);
        const max = parseFloat(maxStr);

        if (isNaN(min) || isNaN(max) || min > max) {
          this.logger.warn("Invalid range values", { min, max, duration });
          return 0;
        }

        // Convert to minutes if needed
        const minMinutes = this.convertToMinutes(min, unit);
        const maxMinutes = this.convertToMinutes(max, unit);

        // Return average
        return Math.round(((minMinutes + maxMinutes) / 2) * 10) / 10; // Round to 1 decimal
      }

      // Handle other formats or fallback
      this.logger.warn("Unrecognized duration format", { duration });
      return 0;
    } catch (error) {
      this.logger.error("Error parsing estimated duration", error as Error, {
        duration,
      });
      return 0;
    }
  }

  /**
   * Parses single duration value (e.g., "45 min", "2 hours")
   *
   * @param duration - Single duration string
   * @returns Duration in minutes
   */
  private parseSingleDuration(duration: string): number {
    const singleMatch = duration.match(
      /^(\d+(?:\.\d+)?)\s*(min|minute|minutes|hour|hours|h|m)$/
    );

    if (singleMatch) {
      const [, valueStr, unit] = singleMatch;
      const value = parseFloat(valueStr);

      if (isNaN(value)) {
        return 0;
      }

      return this.convertToMinutes(value, unit);
    }

    return 0;
  }

  /**
   * Converts duration value to minutes based on unit
   *
   * @param value - Numeric value
   * @param unit - Time unit (min, hour, etc.)
   * @returns Duration in minutes
   */
  private convertToMinutes(value: number, unit: string): number {
    switch (unit) {
      case "min":
      case "minute":
      case "minutes":
      case "m":
        return value;
      case "hour":
      case "hours":
      case "h":
        return value * 60;
      default:
        this.logger.warn("Unknown time unit", { unit, value });
        return value; // Assume minutes as fallback
    }
  }

  /**
   * Clears the relative time cache and resets cache statistics
   * Useful for testing or when cache needs to be refreshed
   */
  clearCache(): void {
    this.relativeTimeCache.clear();
    this.cacheHits = 0;
    this.cacheMisses = 0;
    this.logger.debug("Relative time cache cleared and statistics reset");
  }

  /**
   * Gets cache statistics for monitoring
   *
   * @returns Cache statistics object with hits, misses, size, and calculated hit rate
   */
  getCacheStats(): {
    hits: number;
    misses: number;
    size: number;
    hitRate: number;
  } {
    const size = this.relativeTimeCache.size;
    const totalRequests = this.cacheHits + this.cacheMisses;
    const hitRate = totalRequests > 0 ? this.cacheHits / totalRequests : 0;

    return {
      hits: this.cacheHits,
      misses: this.cacheMisses,
      size,
      hitRate: Math.round(hitRate * 100) / 100, // Round to 2 decimal places
    };
  }

  /**
   * Cleans up expired cache entries to prevent memory leaks
   * Called automatically after each cache miss to maintain cache efficiency
   */
  private cleanupExpiredCache(): void {
    const now = Date.now();
    const expiredKeys: string[] = [];

    // Collect expired keys first to avoid modifying map during iteration
    this.relativeTimeCache.forEach((entry, key) => {
      if (now - entry.timestamp >= entry.ttl) {
        expiredKeys.push(key);
      }
    });

    // Remove expired entries
    expiredKeys.forEach((key) => {
      this.relativeTimeCache.delete(key);
      this.logger.debug("Expired cache entry cleared", { key });
    });

    // Log cleanup summary if entries were removed
    if (expiredKeys.length > 0) {
      this.logger.debug("Cache cleanup completed", {
        expiredEntries: expiredKeys.length,
        remainingEntries: this.relativeTimeCache.size,
      });
    }
  }
}
