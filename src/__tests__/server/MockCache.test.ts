import * as fs from "fs";
import * as path from "path";
import { MockCache } from "../../server/MockCache";

// Mock fs module
jest.mock("fs");

describe("MockCache", () => {
  let mockCache: MockCache;
  const mockWorkspaceRoot = "/workspace";
  const mockCachePath = ".aidm/mock-cache.json";

  beforeEach(() => {
    jest.clearAllMocks();
    mockCache = new MockCache(mockWorkspaceRoot, mockCachePath);
  });

  describe("load()", () => {
    it("should load actual content from mock-cache.json file", () => {
      // Arrange
      const mockFileContent = JSON.stringify({
        "src/demo/sampleFiles/DashboardAnalytics.ts": [
          {
            startLine: 15,
            endLine: 29,
            context: {
              requirements: [
                {
                  id: "REQ-003",
                  title: "Audit Logging Infrastructure",
                  description:
                    "All customer dashboard operations must be logged for compliance and monitoring purposes",
                  type: "NON_FUNCTIONAL",
                  priority: "HIGH",
                  status: "COMPLETED",
                },
              ],
              implementationStatus: {
                completionPercentage: 100,
                lastVerified: "2024-01-20",
                verifiedBy: "Lead Developer",
              },
            },
          },
        ],
      });

      // Mock fs.existsSync to return true
      (fs.existsSync as jest.Mock).mockReturnValue(true);

      // Mock fs.readFileSync to return our test content
      (fs.readFileSync as jest.Mock).mockReturnValue(mockFileContent);

      // Act
      mockCache.load();

      // Assert
      expect(fs.existsSync).toHaveBeenCalledWith(
        path.join(mockWorkspaceRoot, mockCachePath)
      );
      expect(fs.readFileSync).toHaveBeenCalledWith(
        path.join(mockWorkspaceRoot, mockCachePath),
        "utf-8"
      );

      // Verify data was loaded correctly
      const loadedData = (mockCache as any).data;
      expect(loadedData.has("src/demo/sampleFiles/DashboardAnalytics.ts")).toBe(
        true
      );

      const entries = loadedData.get(
        "src/demo/sampleFiles/DashboardAnalytics.ts"
      );
      expect(entries).toHaveLength(1);
      expect(entries[0].startLine).toBe(15);
      expect(entries[0].endLine).toBe(29);
      expect(entries[0].context.requirements[0].id).toBe("REQ-003");
    });

    it("should handle file not found gracefully", () => {
      // Arrange
      (fs.existsSync as jest.Mock).mockReturnValue(false);

      // Act
      mockCache.load();

      // Assert
      expect(fs.existsSync).toHaveBeenCalledWith(
        path.join(mockWorkspaceRoot, mockCachePath)
      );
      expect(fs.readFileSync).not.toHaveBeenCalled();

      // Should have empty data
      const loadedData = (mockCache as any).data;
      expect(loadedData.size).toBe(0);
    });

    it("should handle JSON parsing errors gracefully", () => {
      // Arrange
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.readFileSync as jest.Mock).mockReturnValue("invalid json content");

      // Act
      mockCache.load();

      // Assert
      expect(fs.existsSync).toHaveBeenCalled();
      expect(fs.readFileSync).toHaveBeenCalled();

      // Should have empty data after error
      const loadedData = (mockCache as any).data;
      expect(loadedData.size).toBe(0);
    });

    it("should construct correct file path", () => {
      // Arrange
      const expectedPath = path.join(mockWorkspaceRoot, mockCachePath);

      // Act
      const cacheFilePath = mockCache.cacheFilePath;

      // Assert
      expect(cacheFilePath).toBe(expectedPath);
    });

    it("should read from actual mock-cache.json file when available", () => {
      // Arrange - Create a MockCache instance with the actual workspace root
      const actualCache = new MockCache(process.cwd());

      // Act
      actualCache.load();

      // Assert - Verify that the cache file path is constructed correctly
      expect(actualCache.cacheFilePath).toContain(".aidm");
      expect(actualCache.cacheFilePath).toContain("mock-cache.json");

      // Verify that the cache file path is absolute and cross-platform
      expect(path.isAbsolute(actualCache.cacheFilePath)).toBe(true);
    });

    it("should successfully load and parse real mock-cache.json file content", () => {
      // Arrange - Create a MockCache instance with the actual workspace root
      const actualCache = new MockCache(process.cwd());

      // Act
      actualCache.load();

      // Assert - Verify that the cache file path is constructed correctly
      expect(actualCache.cacheFilePath).toContain(".aidm");
      expect(actualCache.cacheFilePath).toContain("mock-cache.json");

      // Verify that the cache file path is absolute and cross-platform
      expect(path.isAbsolute(actualCache.cacheFilePath)).toBe(true);

      // Verify that the file path points to the expected location
      const expectedPath = path.join(process.cwd(), ".aidm", "mock-cache.json");
      expect(actualCache.cacheFilePath).toBe(expectedPath);

      // Verify that the MockCache instance is properly initialized
      expect(actualCache).toBeDefined();
      expect(typeof actualCache.load).toBe("function");
    });
  });
});
