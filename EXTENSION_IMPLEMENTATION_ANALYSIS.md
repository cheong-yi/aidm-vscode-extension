# VSCode Extension Implementation Analysis: Real-time Task Streaming

## Overview

The VSCode extension needs to be enhanced to support real-time task updates through **Server-Sent Events (SSE)** while maintaining compatibility with existing file-based task loading. The implementation should provide seamless integration with the current architecture and graceful degradation when streaming is unavailable.

## Current Architecture Analysis

### Existing Components
- **TasksDataService** - Core service for task management with EventEmitter infrastructure
- **TaskWebviewProvider/Controller** - Webview management with orchestration pattern
- **TaskHTMLGenerator** - HTML generation with template system and inline CSS/JS
- **JSONTaskParser** - Task parsing from JSON files
- **MockDataProvider** - Fallback data for development

### Current Event System
- `TasksDataService.onTasksUpdated: EventEmitter<Task[]>`
- `TasksDataService.onError: EventEmitter<TaskErrorResponse>`
- Webview communication via `postMessage`

## New Components to Implement

### 1. TaskStreamService - SSE Client

```typescript
// src/services/TaskStreamService.ts
export interface TaskStreamEvent {
  type: 'task_assigned' | 'task_updated' | 'task_completed' | 'task_deleted';
  task: Task;
  timestamp: string;
  repository?: string;
}

export class TaskStreamService {
  private eventSource?: EventSource;
  private isConnected: boolean = false;
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 5;
  private reconnectTimer?: NodeJS.Timeout;

  // Event emitters to integrate with existing architecture
  public readonly onTaskEvent: EventEmitter<TaskStreamEvent> = new EventEmitter();
  public readonly onConnectionStatusChanged: EventEmitter<boolean> = new EventEmitter();
  public readonly onError: EventEmitter<TaskErrorResponse> = new EventEmitter();

  constructor(
    private baseUrl: string,
    private userId: string,
    private repositories: string[] = []
  ) {}

  async connect(): Promise<void>
  private buildStreamUrl(token: string): string
  private setupEventHandlers(): void
  private async handleReconnection(): Promise<void>
  private showTaskNotification(event: TaskStreamEvent): void
  private async getAuthToken(): Promise<string>
  disconnect(): void
  dispose(): void
}
```

**Key Features:**
- **Automatic reconnection** with exponential backoff
- **Event filtering** by user and repository
- **Integration** with existing EventEmitter pattern
- **Error handling** with meaningful user feedback
- **Resource cleanup** on disposal

### 2. Enhanced TasksDataService Integration

```typescript
// Enhanced src/services/TasksDataService.ts
export class TasksDataService implements ITasksDataService {
  // Existing EventEmitters (unchanged)
  public readonly onTasksUpdated: EventEmitter<Task[]>;
  public readonly onError: EventEmitter<TaskErrorResponse>;

  // New: Real-time streaming service
  private taskStreamService?: TaskStreamService;
  private cachedTasks: Task[] = [];

  // New methods
  private async initializeTaskStream(): Promise<void>
  private async handleTaskStreamEvent(event: TaskStreamEvent): Promise<void>
  private async updateTaskInCache(updatedTask: Task): Promise<void>
  private async removeTaskFromCache(taskId: string): Promise<void>

  // Enhanced existing method
  async getTasks(): Promise<Task[]> {
    // Priority: Streaming cache > File loading > Mock data
    if (this.taskStreamService?.isConnected && this.cachedTasks.length > 0) {
      return [...this.cachedTasks]; // Return copy to prevent mutations
    }

    // Fallback to existing file-based loading
    return this.loadTasksFromFile();
  }
}
```

**Integration Strategy:**
- **Preserve existing EventEmitter API** for backward compatibility
- **Cache management** with streaming updates
- **Graceful fallback** to file-based loading
- **Task sorting** and filtering logic preserved

### 3. Connection Management & Status Display

```typescript
// src/services/TaskStreamConnectionManager.ts
export class TaskStreamConnectionManager {
  private statusBarItem: vscode.StatusBarItem;

  constructor() {
    this.statusBarItem = vscode.window.createStatusBarItem(
      vscode.StatusBarAlignment.Right,
      100
    );
  }

  updateConnectionStatus(connected: boolean, reconnecting: boolean = false): void {
    if (connected) {
      this.statusBarItem.text = "$(sync) Tasks Live";
      this.statusBarItem.tooltip = "Real-time task updates active";
      this.statusBarItem.backgroundColor = undefined;
    } else if (reconnecting) {
      this.statusBarItem.text = "$(sync~spin) Reconnecting...";
      this.statusBarItem.tooltip = "Reconnecting to task stream";
      this.statusBarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.warningBackground');
    } else {
      this.statusBarItem.text = "$(circle-slash) Tasks Offline";
      this.statusBarItem.tooltip = "Task streaming unavailable - using local data";
      this.statusBarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.errorBackground');
    }

    this.statusBarItem.show();
  }
}
```

**Visual Feedback:**
- **Status bar indicator** showing connection state
- **Tooltip information** for user guidance
- **Color coding** for different states (connected/reconnecting/offline)

### 4. Enhanced TaskWebviewController

```typescript
// Enhanced src/tasks/providers/TaskWebviewController.ts
export class TaskWebviewController implements WebviewController {
  private connectionManager: TaskStreamConnectionManager;
  private lastTaskCount: number = 0;

  constructor(
    tasksDataService: TasksDataService,
    context: vscode.ExtensionContext
  ) {
    // ... existing constructor logic ...

    this.connectionManager = new TaskStreamConnectionManager();

    // Subscribe to real-time task updates
    this.tasksDataService.onTasksUpdated.event((tasks) => {
      this.handleRealTimeTaskUpdate(tasks);
    });
  }

  private async handleRealTimeTaskUpdate(tasks: Task[]): Promise<void> {
    if (!this.view?.webview) return;

    console.log(`[TaskWebviewController] Real-time update: ${tasks.length} tasks`);

    // Update webview with new task data
    await this.updateWebviewWithTasks(tasks);

    // Show notifications for new assignments
    const newAssignments = this.detectNewAssignments(tasks);
    if (newAssignments.length > 0) {
      this.showUpdateNotification(newAssignments);
    }

    this.lastTaskCount = tasks.length;
  }

  private async updateWebviewWithTasks(tasks: Task[]): Promise<void> {
    // Use existing HTML generator
    const html = await this.htmlGenerator.generateFullHTML(tasks);
    this.view!.webview.html = html;

    // Send task data for safe rendering
    this.htmlGenerator.sendTaskDataToWebview(tasks, this.view!.webview);
  }

  private detectNewAssignments(tasks: Task[]): Task[] {
    // Compare with previous state to detect new assignments
    // Implementation depends on caching strategy
    return []; // Placeholder - needs implementation
  }

  private showUpdateNotification(newTasks: Task[]): void {
    if (newTasks.length === 1) {
      const task = newTasks[0];
      vscode.window.showInformationMessage(
        `New task assigned: ${task.title}`,
        'View Task'
      ).then(selection => {
        if (selection === 'View Task') {
          this.expandTask(task.id);
        }
      });
    } else {
      vscode.window.showInformationMessage(
        `${newTasks.length} new tasks assigned`,
        'View Tasks'
      );
    }
  }

  private expandTask(taskId: string): void {
    if (this.view?.webview) {
      this.view.webview.postMessage({
        type: 'expandTask',
        taskId: taskId
      });
    }
  }
}
```

**Real-time Features:**
- **Automatic webview updates** when tasks change
- **Smart notifications** for new assignments
- **Task expansion** for quick navigation
- **Minimal UI disruption** during updates

### 5. Configuration Strategy

#### Package.json Configuration
```json
{
  "contributes": {
    "configuration": {
      "title": "AiDM Task Streaming",
      "properties": {
        "aidmVscodeExtension.taskStream.enabled": {
          "type": "boolean",
          "default": false,
          "description": "Enable real-time task streaming"
        },
        "aidmVscodeExtension.taskStream.serverUrl": {
          "type": "string",
          "default": "",
          "description": "Task stream server URL (e.g., https://api.yourcompany.com)",
          "pattern": "^https?://.*"
        },
        "aidmVscodeExtension.taskStream.userId": {
          "type": "string",
          "default": "",
          "description": "Your user identifier for task assignments"
        },
        "aidmVscodeExtension.taskStream.authToken": {
          "type": "string",
          "default": "",
          "description": "Authentication token for task stream API"
        },
        "aidmVscodeExtension.taskStream.reconnectInterval": {
          "type": "number",
          "default": 30000,
          "minimum": 5000,
          "maximum": 300000,
          "description": "Reconnection interval in milliseconds (5s-5m)"
        },
        "aidmVscodeExtension.taskStream.notifications": {
          "type": "boolean",
          "default": true,
          "description": "Show notifications for new task assignments"
        }
      }
    },
    "commands": [
      {
        "command": "aidm.taskStream.connect",
        "title": "Connect to Task Stream",
        "category": "AiDM"
      },
      {
        "command": "aidm.taskStream.disconnect",
        "title": "Disconnect from Task Stream",
        "category": "AiDM"
      },
      {
        "command": "aidm.taskStream.configure",
        "title": "Configure Task Streaming",
        "category": "AiDM"
      },
      {
        "command": "aidm.taskStream.status",
        "title": "Show Task Stream Status",
        "category": "AiDM"
      }
    ]
  }
}
```

#### Configuration UI Helper
```typescript
// src/ui/TaskStreamConfigPanel.ts
export class TaskStreamConfigPanel {
  static async showConfigurationDialog(): Promise<void> {
    const serverUrl = await vscode.window.showInputBox({
      prompt: 'Enter task stream server URL',
      placeholder: 'https://api.yourcompany.com',
      validateInput: (value) => {
        if (!value || !value.match(/^https?:\/\/.+/)) {
          return 'Please enter a valid HTTP/HTTPS URL';
        }
        return null;
      }
    });

    if (!serverUrl) return;

    const userId = await vscode.window.showInputBox({
      prompt: 'Enter your user ID',
      placeholder: 'your.email@company.com',
      validateInput: (value) => {
        if (!value || !value.trim()) {
          return 'User ID is required';
        }
        return null;
      }
    });

    if (!userId) return;

    const authToken = await vscode.window.showInputBox({
      prompt: 'Enter authentication token',
      password: true,
      validateInput: (value) => {
        if (!value || value.length < 10) {
          return 'Token must be at least 10 characters';
        }
        return null;
      }
    });

    if (!authToken) return;

    // Save configuration
    const config = vscode.workspace.getConfiguration('aidmVscodeExtension.taskStream');
    await config.update('serverUrl', serverUrl, vscode.ConfigurationTarget.Global);
    await config.update('userId', userId, vscode.ConfigurationTarget.Global);
    await config.update('authToken', authToken, vscode.ConfigurationTarget.Global);
    await config.update('enabled', true, vscode.ConfigurationTarget.Global);

    vscode.window.showInformationMessage(
      'Task streaming configured successfully! Reload the window to activate.',
      'Reload Window'
    ).then(selection => {
      if (selection === 'Reload Window') {
        vscode.commands.executeCommand('workbench.action.reloadWindow');
      }
    });
  }
}
```

### 6. Extension Activation Integration

```typescript
// Enhanced src/extension.ts
export async function activate(context: vscode.ExtensionContext): Promise<void> {
  // ... existing activation code ...

  console.log("=== ACTIVATION STEP: Task Streaming Setup ===");

  // Register task streaming commands
  context.subscriptions.push(
    vscode.commands.registerCommand('aidm.taskStream.connect', async () => {
      try {
        await tasksDataService.connectToStream();
        vscode.window.showInformationMessage('Connected to task stream');
      } catch (error) {
        vscode.window.showErrorMessage(`Failed to connect: ${error}`);
      }
    }),

    vscode.commands.registerCommand('aidm.taskStream.disconnect', async () => {
      await tasksDataService.disconnectFromStream();
      vscode.window.showInformationMessage('Disconnected from task stream');
    }),

    vscode.commands.registerCommand('aidm.taskStream.configure', async () => {
      await TaskStreamConfigPanel.showConfigurationDialog();
    }),

    vscode.commands.registerCommand('aidm.taskStream.status', async () => {
      const status = await tasksDataService.getStreamStatus();
      vscode.window.showInformationMessage(
        `Task Stream: ${status.connected ? 'Connected' : 'Disconnected'}`,
        ...(status.connected ? [] : ['Configure'])
      ).then(selection => {
        if (selection === 'Configure') {
          vscode.commands.executeCommand('aidm.taskStream.configure');
        }
      });
    })
  );

  // Initialize task streaming if configured
  try {
    await tasksDataService.initialize(); // This will set up streaming if enabled
    console.log("✅ Task streaming initialization completed");
  } catch (error) {
    console.warn('Task streaming initialization failed:', error);
    // Extension continues to work with file-based tasks
  }

  // Handle configuration changes
  context.subscriptions.push(
    vscode.workspace.onDidChangeConfiguration(event => {
      if (event.affectsConfiguration('aidmVscodeExtension.taskStream')) {
        console.log('Task stream configuration changed');
        // Optionally restart streaming with new configuration
      }
    })
  );
}
```

### 7. Error Handling & User Experience

#### Connection Error Handling
```typescript
// src/services/TaskStreamErrorHandler.ts
export class TaskStreamErrorHandler {
  static handleConnectionError(error: any, context: string): void {
    console.error(`[TaskStream] ${context}:`, error);

    const errorCode = error.code || error.name || 'UNKNOWN_ERROR';

    switch (errorCode) {
      case 'ENOTFOUND':
      case 'ECONNREFUSED':
        vscode.window.showErrorMessage(
          'Cannot connect to task stream server. Check your server URL and network connection.',
          'Configure', 'Retry'
        ).then(selection => {
          if (selection === 'Configure') {
            vscode.commands.executeCommand('aidm.taskStream.configure');
          } else if (selection === 'Retry') {
            vscode.commands.executeCommand('aidm.taskStream.connect');
          }
        });
        break;

      case 'UNAUTHORIZED':
        vscode.window.showErrorMessage(
          'Authentication failed. Please check your credentials.',
          'Configure'
        ).then(selection => {
          if (selection === 'Configure') {
            vscode.commands.executeCommand('aidm.taskStream.configure');
          }
        });
        break;

      case 'TIMEOUT':
        vscode.window.showWarningMessage(
          'Connection to task stream timed out. Will retry automatically.',
          'Manual Retry'
        ).then(selection => {
          if (selection === 'Manual Retry') {
            vscode.commands.executeCommand('aidm.taskStream.connect');
          }
        });
        break;

      default:
        vscode.window.showErrorMessage(
          `Task stream error: ${error.message || errorCode}`,
          'Show Logs'
        ).then(selection => {
          if (selection === 'Show Logs') {
            vscode.commands.executeCommand('workbench.action.toggleDevTools');
          }
        });
    }
  }
}
```

#### Graceful Degradation
```typescript
// Fallback behavior when streaming fails
export class TaskStreamFallbackManager {
  private static readonly FALLBACK_POLL_INTERVAL = 60000; // 1 minute
  private pollTimer?: NodeJS.Timeout;

  startPollingFallback(tasksDataService: TasksDataService): void {
    console.log('[TaskStream] Starting polling fallback');

    this.pollTimer = setInterval(async () => {
      try {
        // Try to fetch updated tasks via REST API
        const tasks = await this.fetchTasksViaRest();
        tasksDataService.updateCachedTasks(tasks);
      } catch (error) {
        console.warn('[TaskStream] Polling fallback failed:', error);
      }
    }, TaskStreamFallbackManager.FALLBACK_POLL_INTERVAL);
  }

  stopPollingFallback(): void {
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = undefined;
    }
  }

  private async fetchTasksViaRest(): Promise<Task[]> {
    // Implementation of REST API fallback
    // This provides basic updates when SSE is unavailable
    return [];
  }
}
```

## Performance Considerations

### Memory Management
- **EventSource cleanup** on disposal
- **Event listener removal** to prevent memory leaks
- **Task cache size limits** to prevent excessive memory usage
- **Timer cleanup** for reconnection and polling

### Connection Management
- **Maximum reconnection attempts** with exponential backoff
- **Heartbeat monitoring** to detect stale connections
- **Connection pooling** consideration for multiple workspaces
- **Bandwidth optimization** through event filtering

### UI Performance
- **Debounced webview updates** to prevent excessive re-rendering
- **Minimal DOM manipulation** using existing template system
- **Efficient task comparison** for detecting changes
- **Lazy loading** of task details

## Testing Strategy

### Unit Tests
```typescript
// src/__tests__/unit/TaskStreamService.test.ts
describe('TaskStreamService', () => {
  let mockEventSource: jest.Mocked<EventSource>;
  let service: TaskStreamService;

  beforeEach(() => {
    mockEventSource = createMockEventSource();
    service = new TaskStreamService('http://localhost:8000', 'test-user');
  });

  it('should connect to stream and setup event handlers', async () => {
    await service.connect();
    expect(mockEventSource.addEventListener).toHaveBeenCalledWith('task_assigned', expect.any(Function));
  });

  it('should handle reconnection on connection loss', async () => {
    await service.connect();

    // Simulate connection loss
    mockEventSource.onerror();

    // Verify reconnection logic
    expect(service.reconnectAttempts).toBeGreaterThan(0);
  });
});
```

### Integration Tests
```typescript
// src/__tests__/integration/TaskStreamIntegration.test.ts
describe('Task Stream Integration', () => {
  it('should update webview when task stream event received', async () => {
    const mockWebview = createMockWebview();
    const controller = new TaskWebviewController(tasksDataService, context);

    // Simulate task stream event
    const taskEvent: TaskStreamEvent = {
      type: 'task_assigned',
      task: mockTask,
      timestamp: new Date().toISOString()
    };

    tasksDataService.onTasksUpdated.fire([mockTask]);

    // Verify webview was updated
    expect(mockWebview.html).toContain(mockTask.title);
  });
});
```

### End-to-End Tests
```typescript
// src/__tests__/e2e/TaskStreamE2E.test.ts
describe('Task Stream End-to-End', () => {
  it('should show notification when new task assigned via stream', async () => {
    // Start with empty task list
    await setupExtensionWithEmptyTasks();

    // Connect to stream
    await connectToTaskStream();

    // Simulate external task assignment
    await simulateTaskAssignment(mockTask);

    // Verify notification shown
    expect(vscode.window.showInformationMessage).toHaveBeenCalledWith(
      expect.stringContaining('New task assigned'),
      'View Task'
    );
  });
});
```

## Implementation Timeline

### Phase 1: Core SSE Client (1-2 weeks)
- `TaskStreamService.ts` implementation
- Basic connection and reconnection logic
- Event handling and error management
- Integration with existing EventEmitter architecture

### Phase 2: Service Integration (1 week)
- Enhanced `TasksDataService.ts` with streaming support
- Task cache management and event processing
- Fallback to file-based loading when streaming unavailable
- Configuration loading and validation

### Phase 3: UI Integration (1 week)
- Enhanced `TaskWebviewController.ts` for real-time updates
- Status bar connection indicator implementation
- Notification system for new assignments
- Webview update optimization

### Phase 4: Configuration & Polish (1 week)
- Configuration UI and validation
- Command palette integration
- Enhanced error handling and user guidance
- Documentation and help system

### Phase 5: Testing & Optimization (1 week)
- Unit test implementation
- Integration test coverage
- Performance optimization
- Memory leak prevention

**Total Estimated Effort: 5-6 weeks**

## Migration Strategy

### Backward Compatibility
- **Existing file-based loading** remains as fallback
- **No breaking changes** to public APIs
- **Configuration optional** - streaming disabled by default
- **Graceful degradation** when streaming unavailable

### Feature Flags
```typescript
// Feature flag approach for gradual rollout
const isStreamingEnabled = vscode.workspace
  .getConfiguration('aidmVscodeExtension.taskStream')
  .get<boolean>('enabled', false);

if (isStreamingEnabled) {
  await this.initializeTaskStream();
} else {
  console.log('Task streaming disabled - using file-based loading');
}
```

### Rollout Plan
1. **Developer testing** with local MCP server
2. **Internal testing** with staging environment
3. **Beta release** to select users
4. **Gradual rollout** with monitoring
5. **Full release** with streaming as stable feature

## Security Considerations

### Authentication
- **Token-based authentication** for API access
- **Secure token storage** using VSCode secrets API
- **Token refresh** mechanism for long-running sessions
- **Certificate validation** for HTTPS connections

### Data Validation
- **Input sanitization** for all received task data
- **Schema validation** for task stream events
- **XSS prevention** in webview content
- **Rate limiting** to prevent abuse

### Network Security
- **HTTPS-only connections** for production
- **Certificate pinning** consideration for enterprise
- **Network timeout** configuration
- **Connection encryption** verification

This comprehensive implementation will provide a robust, scalable real-time task system while maintaining the existing codebase's stability and user experience.