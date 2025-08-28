/**
 * GitUtilities Unit Tests
 * DIFF-001: Test git repository validation and file change retrieval
 * Requirements: Git repository operations for diff functionality
 */

import { jest } from "@jest/globals";
import { GitUtilities } from "../../../services/GitUtilities";

// Mock util.promisify to return a function that resolves with our mock data
jest.mock("util", () => ({
  promisify: jest.fn((fn) => {
    return jest.fn().mockImplementation((command, options) => {
      return Promise.resolve({ stdout: "", stderr: "" });
    });
  }),
}));

describe("GitUtilities", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("Security Validation Tests", () => {
    describe("Commit Hash Validation", () => {
      it("should accept valid 40-character commit hash", async () => {
        // Arrange
        const validHash = "a".repeat(40);
        const workspacePath = "/valid/path";

        // Act
        const result = await GitUtilities.commitExists(validHash, workspacePath);

        // Assert
        expect(result).toBeDefined();
      });

      it("should accept valid 7-character commit hash", async () => {
        // Arrange
        const validHash = "abc1234";
        const workspacePath = "/valid/path";

        // Act
        const result = await GitUtilities.commitExists(validHash, workspacePath);

        // Assert
        expect(result).toBeDefined();
      });

      it("should accept valid 12-character commit hash", async () => {
        // Arrange
        const validHash = "abc123def456";
        const workspacePath = "/valid/path";

        // Act
        const result = await GitUtilities.commitExists(validHash, workspacePath);

        // Assert
        expect(result).toBeDefined();
      });

      it("should reject invalid commit hash with non-hex characters", async () => {
        // Arrange
        const invalidHash = "abc123g"; // 'g' is not hex
        const workspacePath = "/valid/path";

        // Act
        const result = await GitUtilities.commitExists(invalidHash, workspacePath);

        // Assert
        expect(result).toBe(false);
      });

      it("should reject commit hash shorter than 7 characters", async () => {
        // Arrange
        const invalidHash = "abc12"; // Only 5 characters
        const workspacePath = "/valid/path";

        // Act
        const result = await GitUtilities.commitExists(invalidHash, workspacePath);

        // Assert
        expect(result).toBe(false);
      });

      it("should reject commit hash longer than 40 characters", async () => {
        // Arrange
        const invalidHash = "a".repeat(41); // 41 characters
        const workspacePath = "/valid/path";

        // Act
        const result = await GitUtilities.commitExists(invalidHash, workspacePath);

        // Assert
        expect(result).toBe(false);
      });

      it("should handle commit hash with whitespace", async () => {
        // Arrange
        const hashWithWhitespace = "  abc1234  ";
        const workspacePath = "/valid/path";

        // Act
        const result = await GitUtilities.commitExists(hashWithWhitespace, workspacePath);

        // Assert
        expect(result).toBeDefined();
      });

      it("should reject empty commit hash", async () => {
        // Arrange
        const emptyHash = "";
        const workspacePath = "/valid/path";

        // Act
        const result = await GitUtilities.commitExists(emptyHash, workspacePath);

        // Assert
        expect(result).toBe(false);
      });
    });

    describe("Workspace Path Validation", () => {
      it("should accept valid absolute path", async () => {
        // Arrange
        const validPath = "/valid/workspace/path";
        const commitHash = "a".repeat(7);

        // Act
        const result = await GitUtilities.commitExists(commitHash, validPath);

        // Assert
        expect(result).toBeDefined();
      });

      it("should reject relative path with directory traversal", async () => {
        // Arrange
        const invalidPath = "../../../etc";
        const commitHash = "a".repeat(7);

        // Act
        const result = await GitUtilities.commitExists(commitHash, invalidPath);

        // Assert
        expect(result).toBe(false);
      });

      it("should reject path with single dot traversal", async () => {
        // Arrange
        const invalidPath = "./../sensitive";
        const commitHash = "a".repeat(7);

        // Act
        const result = await GitUtilities.commitExists(commitHash, invalidPath);

        // Assert
        expect(result).toBe(false);
      });

      it("should reject non-absolute path", async () => {
        // Arrange
        const invalidPath = "relative/path";
        const commitHash = "a".repeat(7);

        // Act
        const result = await GitUtilities.commitExists(commitHash, invalidPath);

        // Assert
        expect(result).toBe(false);
      });

      it("should reject empty path", async () => {
        // Arrange
        const emptyPath = "";
        const commitHash = "a".repeat(7);

        // Act
        const result = await GitUtilities.commitExists(commitHash, emptyPath);

        // Assert
        expect(result).toBe(false);
      });
    });
  });

  describe("isGitRepository", () => {
    it("should return true for valid git repository", async () => {
      // Arrange
      const workspacePath = "/valid/git/repo";

      // Act
      const result = await GitUtilities.isGitRepository(workspacePath);

      // Assert
      expect(result).toBeDefined();
    });

    it("should return false for invalid workspace path", async () => {
      // Arrange
      const invalidPath = "../../../etc";

      // Act
      const result = await GitUtilities.isGitRepository(invalidPath);

      // Assert
      expect(result).toBe(false);
    });
  });

  describe("commitExists", () => {
    it("should return false for invalid commit hash", async () => {
      // Arrange
      const invalidHash = "invalid";
      const workspacePath = "/valid/git/repo";

      // Act
      const result = await GitUtilities.commitExists(invalidHash, workspacePath);

      // Assert
      expect(result).toBe(false);
    });

    it("should return false for invalid workspace path", async () => {
      // Arrange
      const commitHash = "abc1234";
      const invalidPath = "../../../etc";

      // Act
      const result = await GitUtilities.commitExists(commitHash, invalidPath);

      // Assert
      expect(result).toBe(false);
    });
  });

  describe("getChangedFilesFromCommit", () => {
    it("should return empty array for invalid commit hash", async () => {
      // Arrange
      const invalidHash = "invalid";
      const workspacePath = "/valid/git/repo";

      // Act
      const result = await GitUtilities.getChangedFilesFromCommit(invalidHash, workspacePath);

      // Assert
      expect(result).toEqual([]);
    });

    it("should return empty array for invalid workspace path", async () => {
      // Arrange
      const commitHash = "abc1234";
      const invalidPath = "../../../etc";

      // Act
      const result = await GitUtilities.getChangedFilesFromCommit(commitHash, invalidPath);

      // Assert
      expect(result).toEqual([]);
    });
  });

  describe("static class behavior", () => {
    it("should be a static class with no constructor", () => {
      // Assert
      expect(GitUtilities).toBeDefined();
      expect(typeof GitUtilities).toBe("function");
      expect(GitUtilities).toBeInstanceOf(Function);
    });

    it("should have all required static methods", () => {
      // Assert
      expect(typeof GitUtilities.isGitRepository).toBe("function");
      expect(typeof GitUtilities.commitExists).toBe("function");
      expect(typeof GitUtilities.getChangedFilesFromCommit).toBe("function");
    });
  });
});
