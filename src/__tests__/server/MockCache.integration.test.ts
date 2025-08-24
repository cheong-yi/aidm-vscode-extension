import * as fs from "fs";
import * as path from "path";
import { MockCache } from "../../server/MockCache";

describe("MockCache Integration", () => {
  let mockCache: MockCache;
  const workspaceRoot = process.cwd();

  beforeEach(() => {
    mockCache = new MockCache(workspaceRoot);
  });

  it("should load actual content from real .aidm/mock-cache.json file", () => {
    // Arrange - Use real workspace root
    const expectedCachePath = path.join(
      workspaceRoot,
      ".aidm",
      "mock-cache.json"
    );

    // Verify the cache file actually exists
    expect(fs.existsSync(expectedCachePath)).toBe(true);

    // Act
    mockCache.load();

    // Assert - Verify the cache file path is correct
    expect(mockCache.cacheFilePath).toBe(expectedCachePath);

    // Verify data was loaded (should have at least one file)
    const loadedData = (mockCache as any).data;
    expect(loadedData.size).toBeGreaterThan(0);

    // Verify specific data from the actual file
    const dashboardAnalyticsData = loadedData.get(
      "src/demo/sampleFiles/DashboardAnalytics.ts"
    );
    expect(dashboardAnalyticsData).toBeDefined();
    expect(Array.isArray(dashboardAnalyticsData)).toBe(true);
    expect(dashboardAnalyticsData.length).toBeGreaterThan(0);

    // Verify the first entry has the expected structure
    const firstEntry = dashboardAnalyticsData[0];
    expect(firstEntry).toHaveProperty("startLine");
    expect(firstEntry).toHaveProperty("endLine");
    expect(firstEntry).toHaveProperty("context");
    expect(firstEntry.context).toHaveProperty("requirements");
    expect(firstEntry.context).toHaveProperty("implementationStatus");
  });

  it("should handle file path construction correctly", () => {
    // Arrange
    const expectedPath = path.join(workspaceRoot, ".aidm", "mock-cache.json");

    // Act & Assert
    expect(mockCache.cacheFilePath).toBe(expectedPath);

    // Verify the directory exists
    const cacheDir = path.dirname(expectedPath);
    expect(fs.existsSync(cacheDir)).toBe(true);
  });
});
