/**
 * TimestampGenerator - Utility for generating realistic ISO 8601 timestamps
 * Task: 2.6.3 - Add relative timestamp mock data
 * Requirements: 4.8, 7.9, 9.3
 *
 * Generates realistic timestamp distributions for mock data that create
 * meaningful relative time displays when processed by time formatting methods.
 * Supports comprehensive testing of various time ranges from "just now" to "weeks ago".
 */

export interface TimestampScenario {
  name: string;
  description: string;
  minutesAgo: number;
  expectedRelativeTime: string;
}

export interface TaskTimestamps {
  createdDate: string;
  lastModified: string;
  lastRunDate?: string;
}

export class TimestampGenerator {
  private static readonly BASE_TIME = new Date();

  /**
   * Generate realistic timestamps for a task that create meaningful relative time displays
   * @param taskAge - How old the task is (in days)
   * @param hasRecentActivity - Whether the task has recent modifications
   * @param hasTestRuns - Whether the task has test execution history
   * @returns TaskTimestamps object with realistic ISO 8601 strings
   */
  static generateTaskTimestamps(
    taskAge: number = 0,
    hasRecentActivity: boolean = true,
    hasTestRuns: boolean = false
  ): TaskTimestamps {
    const now = new Date();
    
    // Base created date (taskAge days ago)
    const createdDate = new Date(now.getTime() - taskAge * 24 * 60 * 60 * 1000);
    
    // Last modified date (more recent than created, but not necessarily today)
    let lastModified: Date;
    if (hasRecentActivity) {
      // Recent activity: within last 2 days
      const recentHours = Math.random() * 48; // 0-48 hours ago
      lastModified = new Date(now.getTime() - recentHours * 60 * 60 * 1000);
    } else {
      // No recent activity: same as created date or slightly later
      const hoursAfterCreation = Math.random() * 24; // 0-24 hours after creation
      lastModified = new Date(createdDate.getTime() + hoursAfterCreation * 60 * 60 * 1000);
    }
    
    // Ensure logical progression: created <= modified <= now
    if (lastModified < createdDate) {
      lastModified = new Date(createdDate.getTime() + Math.random() * 24 * 60 * 60 * 1000);
    }
    
    // Test run date (most recent of all, if applicable)
    let lastRunDate: string | undefined;
    if (hasTestRuns) {
      // Test run should be after last modified, but not necessarily today
      const hoursAfterModification = Math.random() * 72; // 0-72 hours after last modified
      const testRunDate = new Date(lastModified.getTime() + hoursAfterModification * 60 * 60 * 1000);
      
      // Ensure test run is not in the future
      if (testRunDate <= now) {
        lastRunDate = testRunDate.toISOString();
      } else {
        // Fallback: test run was 1-6 hours ago
        const fallbackHours = 1 + Math.random() * 5;
        lastRunDate = new Date(now.getTime() - fallbackHours * 60 * 60 * 1000).toISOString();
      }
    }

    // Ensure logical progression and return validated timestamps
    const timestamps: TaskTimestamps = {
      createdDate: createdDate.toISOString(),
      lastModified: lastModified.toISOString(),
      lastRunDate,
    };

    return this.ensureLogicalProgression(timestamps);
  }

  /**
   * Generate timestamps for specific relative time scenarios
   * @param scenario - The relative time scenario to generate
   * @returns ISO 8601 timestamp string
   */
  static generateScenarioTimestamp(scenario: TimestampScenario): string {
    const now = new Date();
    const timestamp = new Date(now.getTime() - scenario.minutesAgo * 60 * 1000);
    return timestamp.toISOString();
  }

  /**
   * Get predefined timestamp scenarios for comprehensive testing
   * @returns Array of TimestampScenario objects
   */
  static getTimestampScenarios(): TimestampScenario[] {
    return [
      {
        name: "just_now",
        description: "Less than 1 minute ago",
        minutesAgo: 0.5,
        expectedRelativeTime: "just now",
      },
      {
        name: "five_minutes",
        description: "5 minutes ago",
        minutesAgo: 5,
        expectedRelativeTime: "5 minutes ago",
      },
      {
        name: "fifteen_minutes",
        description: "15 minutes ago",
        minutesAgo: 15,
        expectedRelativeTime: "15 minutes ago",
      },
      {
        name: "one_hour",
        description: "1 hour ago",
        minutesAgo: 60,
        expectedRelativeTime: "1 hour ago",
      },
      {
        name: "two_hours",
        description: "2 hours ago",
        minutesAgo: 120,
        expectedRelativeTime: "2 hours ago",
      },
      {
        name: "five_hours",
        description: "5 hours ago",
        minutesAgo: 300,
        expectedRelativeTime: "5 hours ago",
      },
      {
        name: "yesterday",
        description: "1 day ago",
        minutesAgo: 1440,
        expectedRelativeTime: "1 day ago",
      },
      {
        name: "three_days",
        description: "3 days ago",
        minutesAgo: 4320,
        expectedRelativeTime: "3 days ago",
      },
      {
        name: "one_week",
        description: "1 week ago",
        minutesAgo: 10080,
        expectedRelativeTime: "1 week ago",
      },
      {
        name: "two_weeks",
        description: "2 weeks ago",
        minutesAgo: 20160,
        expectedRelativeTime: "2 weeks ago",
      },
      {
        name: "one_month",
        description: "1 month ago",
        minutesAgo: 43200,
        expectedRelativeTime: "1 month ago",
      },
    ];
  }

  /**
   * Generate timestamps for a variety of development workflow patterns
   * @returns Array of TaskTimestamps representing different workflow scenarios
   */
  static generateWorkflowTimestamps(): TaskTimestamps[] {
    return [
      // Fresh task created today
      this.generateTaskTimestamps(0, true, false),
      
      // Task created yesterday with recent activity
      this.generateTaskTimestamps(1, true, false),
      
      // Task created 2 days ago with test runs
      this.generateTaskTimestamps(2, true, true),
      
      // Task created 3 days ago, no recent activity
      this.generateTaskTimestamps(3, false, false),
      
      // Task created 1 week ago with ongoing work
      this.generateTaskTimestamps(7, true, true),
      
      // Task created 2 weeks ago, recently completed
      this.generateTaskTimestamps(14, true, true),
      
      // Task created 1 month ago, dormant
      this.generateTaskTimestamps(30, false, false),
      
      // Task created 3 months ago, legacy
      this.generateTaskTimestamps(90, false, false),
    ];
  }

  /**
   * Generate timestamps for specific relative time ranges
   * @param range - The time range to generate timestamps for
   * @param count - Number of timestamps to generate
   * @returns Array of ISO 8601 timestamp strings
   */
  static generateTimestampsInRange(
    range: "minutes" | "hours" | "days" | "weeks",
    count: number
  ): string[] {
    const now = new Date();
    const timestamps: string[] = [];
    
    for (let i = 0; i < count; i++) {
      let minutesAgo: number;
      
      switch (range) {
        case "minutes":
          minutesAgo = Math.random() * 60; // 0-60 minutes ago
          break;
        case "hours":
          minutesAgo = 60 + Math.random() * 1320; // 1-23 hours ago
          break;
        case "days":
          minutesAgo = 1440 + Math.random() * 10080; // 1-7 days ago
          break;
        case "weeks":
          minutesAgo = 10080 + Math.random() * 30240; // 1-4 weeks ago
          break;
      }
      
      const timestamp = new Date(now.getTime() - minutesAgo * 60 * 1000);
      timestamps.push(timestamp.toISOString());
    }
    
    return timestamps.sort((a, b) => new Date(b).getTime() - new Date(a).getTime());
  }

  /**
   * Validate that a timestamp string is in valid ISO 8601 format
   * @param timestamp - The timestamp string to validate
   * @returns true if valid, false otherwise
   */
  static isValidISOTimestamp(timestamp: string): boolean {
    try {
      const date = new Date(timestamp);
      return !isNaN(date.getTime()) && timestamp.includes('T') && timestamp.includes('Z');
    } catch {
      return false;
    }
  }

  /**
   * Ensure logical timestamp progression (created <= modified <= test run)
   * @param timestamps - The timestamps to validate and fix
   * @returns Validated TaskTimestamps with logical progression
   */
  static ensureLogicalProgression(timestamps: TaskTimestamps): TaskTimestamps {
    const created = new Date(timestamps.createdDate);
    const modified = new Date(timestamps.lastModified);
    
    let adjustedModified = modified;
    if (modified < created) {
      // Last modified should be after created date
      const hoursAfterCreation = 1 + Math.random() * 23; // 1-24 hours after creation
      adjustedModified = new Date(created.getTime() + hoursAfterCreation * 60 * 60 * 1000);
    }
    
    let adjustedLastRun: string | undefined;
    if (timestamps.lastRunDate) {
      const testRun = new Date(timestamps.lastRunDate);
      if (testRun < adjustedModified) {
        // Test run should be after last modified
        const hoursAfterModification = 1 + Math.random() * 47; // 1-48 hours after modification
        adjustedLastRun = new Date(adjustedModified.getTime() + hoursAfterModification * 60 * 60 * 1000).toISOString();
      } else {
        adjustedLastRun = timestamps.lastRunDate;
      }
    }
    
    return {
      createdDate: timestamps.createdDate,
      lastModified: adjustedModified.toISOString(),
      lastRunDate: adjustedLastRun,
    };
  }

  /**
   * Get current time as ISO 8601 string
   * @returns Current timestamp in ISO format
   */
  static getCurrentTimestamp(): string {
    return new Date().toISOString();
  }

  /**
   * Calculate the difference between two timestamps in minutes
   * @param timestamp1 - First timestamp
   * @param timestamp2 - Second timestamp
   * @returns Difference in minutes
   */
  static getTimeDifferenceInMinutes(timestamp1: string, timestamp2: string): number {
    const date1 = new Date(timestamp1);
    const date2 = new Date(timestamp2);
    const diffMs = Math.abs(date2.getTime() - date1.getTime());
    return Math.floor(diffMs / (1000 * 60));
  }
}
