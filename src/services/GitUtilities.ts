/**
 * GitUtilities - Essential git diff operations for task management
 */

import { exec } from "child_process";
import { promisify } from "util";
import * as path from "path";

const execAsync = promisify(exec);

export class GitUtilities {
  private static validateCommitHash(hash: string): boolean {
    return /^[a-fA-F0-9]{7,40}$/.test(hash.trim());
  }

  private static validateWorkspacePath(workspacePath: string): boolean {
    return !!(workspacePath && path.isAbsolute(workspacePath) && !workspacePath.includes(".."));
  }

  static async isGitRepository(workspacePath: string): Promise<boolean> {
    if (!this.validateWorkspacePath(workspacePath)) {
      return false;
    }

    try {
      await execAsync("git rev-parse --git-dir", {
        cwd: workspacePath,
        timeout: 5000,
        maxBuffer: 1024 * 100,
      });
      return true;
    } catch {
      return false;
    }
  }

  static async commitExists(commitHash: string, workspacePath: string): Promise<boolean> {
    if (!this.validateCommitHash(commitHash) || !this.validateWorkspacePath(workspacePath)) {
      return false;
    }

    try {
      await execAsync(`git rev-parse --verify "${commitHash}"`, {
        cwd: workspacePath,
        timeout: 5000,
        maxBuffer: 1024 * 100,
      });
      return true;
    } catch {
      return false;
    }
  }

  static async getChangedFilesFromCommit(
    commitHash: string,
    workspacePath: string
  ): Promise<string[]> {
    if (!this.validateCommitHash(commitHash) || !this.validateWorkspacePath(workspacePath)) {
      return [];
    }

    try {
      const { stdout } = await execAsync(
        `git diff-tree --no-commit-id --name-only -r "${commitHash}"`,
        {
          cwd: workspacePath,
          timeout: 10000,
          maxBuffer: 1024 * 1024,
          encoding: "utf8",
        }
      );

      return stdout
        .trim()
        .split("\n")
        .map((file) => file.trim())
        .filter((file) => file.length > 0 && !file.includes("..") && !path.isAbsolute(file));
    } catch (error) {
      console.error("GitUtilities: Failed to get changed files:", error);
      return [];
    }
  }
}
