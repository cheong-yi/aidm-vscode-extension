/**
 * TaskPersistenceService Tests
 * TDD Red Phase: Write failing tests for .aidm/.tasks persistence
 * Task: PERSIST-001
 */

import * as vscode from 'vscode';
import { TaskPersistenceService } from '../../../services/TaskPersistenceService';
import { Task } from '../../../types/tasks';

describe('TaskPersistenceService', () => {
  let service: TaskPersistenceService;
  let mockWorkspaceFolder: vscode.WorkspaceFolder;

  beforeEach(() => {
    mockWorkspaceFolder = {
      uri: vscode.Uri.file('/workspace/test-repo'),
      name: 'test-repo',
      index: 0
    };

    service = new TaskPersistenceService();
  });

  describe('saveTasks', () => {
    it('should save tasks to .aidm/.tasks/{repo-name}.json', async () => {
      const tasks: Task[] = [
        {
          id: 'TASK-001',
          title: 'Test task',
          status: 'pending',
          priority: 'high',
          complexity: 'medium',
          description: 'Test description'
        }
      ];

      await service.saveTasks(tasks, mockWorkspaceFolder);

      // Verify file was created at correct path
      const expectedPath = vscode.Uri.joinPath(
        mockWorkspaceFolder.uri,
        '.aidm/.tasks/test-repo.json'
      );

      const fileExists = await vscode.workspace.fs.stat(expectedPath)
        .then(() => true)
        .catch(() => false);

      expect(fileExists).toBe(true);
    });

    it('should save tasks with correct JSON structure', async () => {
      const tasks: Task[] = [
        {
          id: 'TASK-001',
          title: 'Test task',
          status: 'pending',
          priority: 'high',
          complexity: 'medium',
          description: 'Test'
        }
      ];

      await service.saveTasks(tasks, mockWorkspaceFolder);

      const savedTasks = await service.loadTasks(mockWorkspaceFolder);
      expect(savedTasks).toEqual(tasks);
    });

    it('should create .aidm/.tasks directory if it does not exist', async () => {
      const tasks: Task[] = [];

      await service.saveTasks(tasks, mockWorkspaceFolder);

      const dirPath = vscode.Uri.joinPath(
        mockWorkspaceFolder.uri,
        '.aidm/.tasks'
      );

      const dirExists = await vscode.workspace.fs.stat(dirPath)
        .then(() => true)
        .catch(() => false);

      expect(dirExists).toBe(true);
    });

    it('should handle empty task array', async () => {
      const tasks: Task[] = [];

      await expect(service.saveTasks(tasks, mockWorkspaceFolder)).resolves.not.toThrow();
    });

    it('should overwrite existing tasks file', async () => {
      const tasks1: Task[] = [{ id: 'OLD', title: 'Old', status: 'pending', priority: 'low', complexity: 'low', description: '' }];
      const tasks2: Task[] = [{ id: 'NEW', title: 'New', status: 'pending', priority: 'low', complexity: 'low', description: '' }];

      await service.saveTasks(tasks1, mockWorkspaceFolder);
      await service.saveTasks(tasks2, mockWorkspaceFolder);

      const loaded = await service.loadTasks(mockWorkspaceFolder);
      expect(loaded).toEqual(tasks2);
      expect(loaded).not.toEqual(tasks1);
    });
  });

  describe('loadTasks', () => {
    it('should load tasks from .aidm/.tasks/{repo-name}.json', async () => {
      const tasks: Task[] = [
        {
          id: 'TASK-001',
          title: 'Test task',
          status: 'in_progress',
          priority: 'high',
          complexity: 'medium',
          description: 'Test'
        }
      ];

      await service.saveTasks(tasks, mockWorkspaceFolder);
      const loaded = await service.loadTasks(mockWorkspaceFolder);

      expect(loaded).toEqual(tasks);
    });

    it('should return empty array if file does not exist', async () => {
      const loaded = await service.loadTasks(mockWorkspaceFolder);
      expect(loaded).toEqual([]);
    });

    it('should return empty array if file contains invalid JSON', async () => {
      const filePath = vscode.Uri.joinPath(
        mockWorkspaceFolder.uri,
        '.aidm/.tasks/test-repo.json'
      );

      await vscode.workspace.fs.writeFile(
        filePath,
        Buffer.from('invalid json{')
      );

      const loaded = await service.loadTasks(mockWorkspaceFolder);
      expect(loaded).toEqual([]);
    });

    it('should handle missing workspace folder gracefully', async () => {
      const loaded = await service.loadTasks(undefined as any);
      expect(loaded).toEqual([]);
    });
  });

  describe('getTasksFilePath', () => {
    it('should generate correct file path based on repo name', () => {
      const path = service.getTasksFilePath(mockWorkspaceFolder);

      expect(path.fsPath).toContain('.aidm/.tasks');
      expect(path.fsPath).toContain('test-repo.json');
    });

    it('should sanitize repo name with special characters', () => {
      const folder: vscode.WorkspaceFolder = {
        uri: vscode.Uri.file('/workspace/my-repo@v2'),
        name: 'my-repo@v2',
        index: 0
      };

      const path = service.getTasksFilePath(folder);

      // Should sanitize @ symbol
      expect(path.fsPath).toContain('my-repo-v2.json');
    });
  });
});
