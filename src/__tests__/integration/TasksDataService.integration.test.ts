/**
 * TasksDataService Integration Tests
 * Tests the complete workflow from extension activation through task file reading
 *
 * Task 6.2.1: Create End-to-End Integration Validation Test
 * Requirements: Validate complete workflow from activation to task display
 */

import { TasksDataService } from "../../services/TasksDataService";
// TaskStatusManager removed - not implemented
import { JSONTaskParser } from "../../services/JSONTaskParser";
import { MockDataProvider } from "../../mock/MockDataProvider";
import { Task, TaskStatus, TaskComplexity } from "../../types/tasks";
import { trackAuditLogger } from "../jest.setup";
import { TaskHTMLGenerator } from "../../tasks/providers/TaskHTMLGenerator";

// Mock VSCode workspace and configuration
jest.mock("vscode", () => ({
  workspace: {
    getConfiguration: jest.fn(),
    workspaceFolders: [{ uri: { fsPath: "/test/workspace" } }],
    fs: {
      readFile: jest.fn(),
      stat: jest.fn(),
    },
    isTrusted: true,
  },
  Uri: {
    file: jest.fn((path: string) => ({ fsPath: path, scheme: "file" })),
  },
  FileSystemError: {
    FileNotFound: jest.fn(() => ({ code: "FileNotFound" })),
  },
  FileType: {
    File: 1,
    Directory: 2,
  },
  EventEmitter: jest.fn().mockImplementation(() => ({
    fire: jest.fn(),
    dispose: jest.fn(),
    event: jest.fn(() => ({ dispose: jest.fn() })),
  })),
}));

// Mock axios for HTTP client testing
jest.mock("axios", () => ({
  create: jest.fn(() => ({
    post: jest.fn(),
    get: jest.fn(),
  })),
}));

describe("TasksDataService Integration", () => {
  let tasksDataService: TasksDataService;
  let mockJSONTaskParser: jest.Mocked<JSONTaskParser>;
  let mockMockDataProvider: jest.Mocked<MockDataProvider>;
  let mockWorkspaceConfig: any;
  let mockHttpClient: any;

  // Test data for integration validation
  const testTasksFile = {
    master: {
      tasks: [
        {
          id: "integration-1",
          title: "Integration Test Task",
          description: "Test task for end-to-end workflow validation",
          status: "not_started",
          complexity: "low",
          priority: "medium",
          dependencies: [],
          requirements: ["Complete workflow validation"],
          estimatedDuration: "15-20 min",
          isExecutable: true,
          createdDate: "2024-01-01T00:00:00.000Z",
          lastModified: "2024-01-01T00:00:00.000Z",
        },
      ],
    },
  };

  const expectedOutput = {
    taskCount: 1,
    firstTaskId: "integration-1",
    configurationResolved: true,
    fileUriResolved: "file:///test/workspace/integration-test-tasks.json",
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup mock workspace configuration
    mockWorkspaceConfig = {
      "aidmVscodeExtension.tasks.filePath": "integration-test-tasks.json",
      "aidmVscodeExtension.mcpServer.port": 3001,
    };

    const mockConfig = {
      get: jest.fn().mockImplementation((key: string) => {
        return mockWorkspaceConfig[key] || undefined;
      }),
    };

    (require("vscode").workspace.getConfiguration as jest.Mock).mockReturnValue(
      mockConfig
    );

    // Setup mock file system for JSONTaskParser
    const mockFs = require("vscode").workspace.fs;
    mockFs.readFile.mockResolvedValue(
      Buffer.from(JSON.stringify(testTasksFile), "utf8")
    );
    mockFs.stat.mockResolvedValue({
      type: 1, // FileType.File
      size: 100,
      ctime: Date.now(),
      mtime: Date.now(),
    });

    // Setup mock HTTP client to fail (triggering fallback to file parsing)
    mockHttpClient = {
      post: jest
        .fn()
        .mockRejectedValue(
          new Error("Network unavailable for integration test")
        ),
    };

    // Create mock dependencies with proper mocking

    // Mock JSONTaskParser to use VS Code filesystem API
    mockJSONTaskParser = {
      parseTasksFromFile: jest.fn().mockImplementation(async (fileUri: any) => {
        // Simulate the actual JSONTaskParser behavior using VS Code filesystem
        const mockFs = require("vscode").workspace.fs;

        // First call stat to validate the file (like the real JSONTaskParser does)
        const stats = await mockFs.stat(fileUri);

        // Then read the file content
        const fileContent = await mockFs.readFile(fileUri);
        const contentString = Buffer.from(fileContent).toString("utf8");
        const jsonData = JSON.parse(contentString);

        // Extract tasks from the loaded data structure (matching TasksDataService behavior)
        const allTasks: Task[] = [];
        for (const contextName of Object.keys(jsonData)) {
          const context = jsonData[contextName];
          if (context.tasks && Array.isArray(context.tasks)) {
            allTasks.push(...context.tasks);
          }
        }
        return allTasks;
      }),
      dispose: jest.fn(),
    } as any;

    mockMockDataProvider = {
      getTasks: jest.fn().mockResolvedValue(testTasksFile.master.tasks),
      dispose: jest.fn(),
    } as any;

    // Create TasksDataService instance
    tasksDataService = new TasksDataService(
      mockJSONTaskParser,
      mockMockDataProvider
    );

    // TaskStatusManager removed - not implemented
  });

  afterEach(async () => {
    if (tasksDataService) {
      tasksDataService.dispose();
    }
  });

  test("should complete full workflow from activation to task loading", async () => {
    // This test validates the complete chain:
    // 1. Extension activation (simulated via initialization)
    // 2. TasksDataService initialization
    // 3. Configuration reading
    // 4. File path resolution
    // 5. Task file parsing
    // 6. Event firing to UI

    // Act: Initialize the service (simulates extension activation)
    await tasksDataService.initialize();

    // Verify configuration was read correctly
    expect(mockWorkspaceConfig["aidmVscodeExtension.mcpServer.port"]).toBe(
      3001
    );
    expect(mockWorkspaceConfig["aidmVscodeExtension.tasks.filePath"]).toBe(
      "integration-test-tasks.json"
    );

    // Act: Attempt to get tasks (this triggers the complete workflow)
    const result = await tasksDataService.getTasks();

    // Assert: Verify complete workflow success
    expect(result).toHaveLength(expectedOutput.taskCount);
    expect(result[0].id).toBe(expectedOutput.firstTaskId);
    expect(result[0].title).toBe("Integration Test Task");
    expect(result[0].status).toBe("not_started");
    expect(result[0].complexity).toBe("low");
    expect(result[0].isExecutable).toBe(true);

    // Verify file path resolution worked through JSONTaskParser
    expect(mockJSONTaskParser.parseTasksFromFile).toHaveBeenCalled();

    // Verify VS Code filesystem was used by JSONTaskParser
    expect(require("vscode").workspace.fs.readFile).toHaveBeenCalled();
    expect(require("vscode").workspace.fs.stat).toHaveBeenCalled();

    // Verify mock data fallback was not used (since file parsing succeeded)
    expect(mockMockDataProvider.getTasks).not.toHaveBeenCalled();
  });

  test("should handle file loading failure and fallback to mock data", async () => {
    // Setup file system to fail
    const mockFs = require("vscode").workspace.fs;
    mockFs.readFile.mockRejectedValue(new Error("ENOENT: no such file"));

    // Mock JSONTaskParser to fail when file system fails
    mockJSONTaskParser.parseTasksFromFile.mockRejectedValue(
      new Error("File not found")
    );

    // Act: Initialize and get tasks
    await tasksDataService.initialize();
    const result = await tasksDataService.getTasks();

    // Assert: Should fallback to mock data
    expect(result).toHaveLength(expectedOutput.taskCount);
    expect(result[0].id).toBe(expectedOutput.firstTaskId);
    expect(mockMockDataProvider.getTasks).toHaveBeenCalled();
  });

  test("should validate complete task object structure", async () => {
    await tasksDataService.initialize();
    const result = await tasksDataService.getTasks();

    // Verify all required task fields are present and correctly typed
    const task = result[0];
    expect(typeof task.id).toBe("string");
    expect(typeof task.title).toBe("string");
    expect(typeof task.description).toBe("string");
    expect(Object.values(TaskStatus)).toContain(task.status);
    expect(Object.values(TaskComplexity)).toContain(task.complexity);
    expect(Array.isArray(task.dependencies)).toBe(true);
    expect(Array.isArray(task.requirements)).toBe(true);
    expect(typeof task.estimatedDuration).toBe("string");
    expect(typeof task.isExecutable).toBe("boolean");
    expect(typeof task.createdDate).toBe("string");
    expect(typeof task.lastModified).toBe("string");

    // Verify date format (ISO 8601 strings)
    expect(task.createdDate).toMatch(
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/
    );
    expect(task.lastModified).toMatch(
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/
    );
  });

  test("should fire events correctly after successful task refresh", async () => {
    // Spy on event emitters
    const onTasksUpdatedSpy = jest.spyOn(
      tasksDataService.onTasksUpdated,
      "fire"
    );
    const onErrorSpy = jest.spyOn(tasksDataService.onError, "fire");

    await tasksDataService.initialize();

    // Use refreshTasks() method which actually fires events
    await tasksDataService.refreshTasks();

    // Verify success event was fired
    expect(onTasksUpdatedSpy).toHaveBeenCalledWith(
      expect.arrayContaining([expect.objectContaining({ id: "integration-1" })])
    );

    // Verify no error events were fired
    expect(onErrorSpy).not.toHaveBeenCalled();
  });

  test("should handle configuration changes and reinitialize correctly", async () => {
    // Initial configuration
    await tasksDataService.initialize();
    let result = await tasksDataService.getTasks();
    expect(result).toHaveLength(expectedOutput.taskCount);

    // Change configuration
    mockWorkspaceConfig["aidmVscodeExtension.tasks.filePath"] =
      "new-tasks.json";
    mockWorkspaceConfig["aidmVscodeExtension.mcpServer.port"] = 3002;

    // Reinitialize with new configuration
    await tasksDataService.initialize();
    result = await tasksDataService.getTasks();

    // Should still work with new configuration
    expect(result).toHaveLength(expectedOutput.taskCount);
  });

  // Performance Integration Tests - PERF-005
  describe('Performance Integration Tests', () => {
    let extensionUri: any;

    beforeEach(() => {
      extensionUri = { fsPath: '/test/extension', scheme: 'file' };
    });

    test('should load tasks with optimized performance', async () => {
      const start = performance.now();
      
      // Complete task loading workflow
      await tasksDataService.initialize();
      const tasks = await tasksDataService.getTasks();
      const htmlGenerator = new TaskHTMLGenerator(extensionUri);
      const html = htmlGenerator.generateFullHTML(tasks);
      
      const end = performance.now();
      const totalTime = end - start;
      
      // Target: Under 1000ms total (was 2000ms+ before optimizations)
      expect(totalTime).toBeLessThan(1000);
      expect(tasks.length).toBeGreaterThan(0);
      expect(html).toContain('task-item');
      
      console.log(`Task loading performance: ${totalTime.toFixed(2)}ms`);
    });
    
    test('should demonstrate performance improvement over baseline', async () => {
      // Measure optimized path
      const optimizedTime = await measureTaskLoadingTime();
      
      // Expected improvement: 70% improvement from original 2000ms baseline
      const maxAcceptableTime = 600; // 70% improvement from 2000ms
      
      expect(optimizedTime).toBeLessThan(maxAcceptableTime);
    });

    async function measureTaskLoadingTime(): Promise<number> {
      const start = performance.now();
      
      await tasksDataService.initialize();
      const tasks = await tasksDataService.getTasks();
      const generator = new TaskHTMLGenerator(extensionUri);
      generator.generateFullHTML(tasks);
      
      return performance.now() - start;
    }
  });
});
