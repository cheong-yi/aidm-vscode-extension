/**
 * GitUtilities - Secure static utility class for git repository operations
 * DIFF-001: Git repository validation and file change retrieval with security hardening
 */

import { exec } from "child_process";
import { promisify } from "util";
import * as path from "path";

const execAsync = promisify(exec);

export class GitUtilities {
  // Security: Validate git commit hash format (40 hex characters)
  private static validateCommitHash(commitHash: string): boolean {
    const gitHashPattern = /^[a-fA-F0-9]{40}$|^[a-fA-F0-9]{7,40}$/;
    return gitHashPattern.test(commitHash.trim());
  }

  // Security: Validate workspace path to prevent directory traversal
  private static validateWorkspacePath(workspacePath: string): boolean {
    try {
      // Check for empty or whitespace-only paths
      if (!workspacePath || workspacePath.trim() === "") {
        return false;
      }

      const normalized = path.normalize(workspacePath);

      // Basic path traversal check
      if (normalized.includes("..")) {
        return false;
      }

      // Check if the original path is absolute (not relative)
      if (!path.isAbsolute(workspacePath)) {
        return false;
      }

      return true;
    } catch {
      return false;
    }
  }

  /**
   * Check if a directory is a valid git repository
   * @param workspacePath - Path to the workspace directory
   * @returns Promise<boolean> - True if valid git repository, false otherwise
   */
  static async isGitRepository(workspacePath: string): Promise<boolean> {
    // Security: Validate workspace path
    if (!this.validateWorkspacePath(workspacePath)) {
      return false;
    }

    try {
      // Use async exec instead of blocking execSync
      await execAsync("git rev-parse --git-dir", {
        cwd: workspacePath,
        timeout: 5000, // Security: Timeout to prevent hanging
        maxBuffer: 1024 * 100, // Security: Limit output buffer
      });
      return true;
    } catch (error) {
      // Handle git command failures gracefully
      return false;
    }
  }

  /**
   * Check if a commit hash exists in the repository
   * @param commitHash - Git commit hash to validate (must be valid git hash format)
   * @param workspacePath - Path to the workspace directory
   * @returns Promise<boolean> - True if commit exists, false otherwise
   */
  static async commitExists(
    commitHash: string,
    workspacePath: string
  ): Promise<boolean> {
    // Security: Validate inputs
    if (
      !this.validateCommitHash(commitHash) ||
      !this.validateWorkspacePath(workspacePath)
    ) {
      return false;
    }

    try {
      // Security: Use parameterized approach instead of string concatenation
      // Note: git commands don't support traditional parameterization, but we validate the hash format above
      await execAsync(`git rev-parse --verify "${commitHash}"`, {
        cwd: workspacePath,
        timeout: 5000,
        maxBuffer: 1024 * 100,
      });
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get list of changed files from a specific commit
   * @param commitHash - Git commit hash to analyze (must be valid git hash format)
   * @param workspacePath - Path to the workspace directory
   * @returns Promise<string[]> - Array of changed file paths (relative to repo root)
   */
  static async getChangedFilesFromCommit(
    commitHash: string,
    workspacePath: string
  ): Promise<string[]> {
    // Security: Validate inputs
    if (
      !this.validateCommitHash(commitHash) ||
      !this.validateWorkspacePath(workspacePath)
    ) {
      return [];
    }

    try {
      // Security: Use verified commit hash in quoted parameter
      const { stdout } = await execAsync(
        `git diff-tree --no-commit-id --name-only -r "${commitHash}"`,
        {
          cwd: workspacePath,
          timeout: 10000, // Allow more time for file listing
          maxBuffer: 1024 * 1024, // 1MB buffer for large commits
          encoding: "utf8",
        }
      );

      // Parse and validate file paths
      const files = stdout
        .trim()
        .split("\n")
        .map((file) => file.trim())
        .filter((file) => file.length > 0)
        .filter((file) => {
          // Security: Basic validation of file paths (no path traversal)
          return !file.includes("..") && !path.isAbsolute(file);
        });

      return files;
    } catch (error) {
      // Log error for debugging but don't expose sensitive info
      console.error("GitUtilities: Failed to get changed files:", {
        error: error instanceof Error ? error.message : "Unknown error",
        commitHash: commitHash.substring(0, 7), // Only log first 7 chars
        workspacePath: path.basename(workspacePath), // Only log folder name
      });

      return [];
    }
  }

  /**
   * Get the previous commit hash for a given commit
   * @param commitHash - Git commit hash to find the previous commit for
   * @param workspacePath - Path to the workspace directory
   * @returns Promise<string> - Previous commit hash or empty string if not found
   */
  static async getPreviousCommit(
    commitHash: string,
    workspacePath: string
  ): Promise<string> {
    // Security: Validate inputs
    if (
      !this.validateCommitHash(commitHash) ||
      !this.validateWorkspacePath(workspacePath)
    ) {
      return "";
    }

    try {
      // Security: Use verified commit hash in quoted parameter
      const { stdout } = await execAsync(`git rev-parse "${commitHash}~1"`, {
        cwd: workspacePath,
        timeout: 5000,
        maxBuffer: 1024 * 100,
        encoding: "utf8",
      });

      const previousCommit = stdout.trim();

      // Validate the returned commit hash
      if (this.validateCommitHash(previousCommit)) {
        return previousCommit;
      }

      return "";
    } catch (error) {
      // Log error for debugging but don't expose sensitive info
      console.error("GitUtilities: Failed to get previous commit:", {
        error: error instanceof Error ? error.message : "Unknown error",
        commitHash: commitHash.substring(0, 7), // Only log first 7 chars
        workspacePath: path.basename(workspacePath), // Only log folder name
      });

      return "";
    }
  }
}
