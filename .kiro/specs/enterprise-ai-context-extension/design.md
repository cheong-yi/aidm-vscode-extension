# Updated Design Document - Sidebar Taskmaster Dashboard

## Overview

The Sidebar Taskmaster Dashboard is a new UI module within the enterprise-ai-context-extension that provides developers with an intelligent task management interface. This module leverages the existing MCP server architecture and ContextManager to display tasks from the tasks.md file in an expandable list VSCode sidebar view. The design follows the established patterns of the extension while introducing new UI components for task management and AI assistant integration.

## Current Implementation Status

**Implementation Completeness: ~65%**

### Completed Components ✅
- **Core Infrastructure**: MCP server, error handling, basic services
- **UI Components**: TaskTreeViewProvider, TaskDetailCardProvider, TaskTreeItem
- **Data Services**: TasksDataService, TaskStatusManager, MarkdownTaskParser
- **Type Definitions**: Enhanced Task interface with all required fields
- **Time Formatting**: TimeFormattingUtility with relative time support
- **Enhanced Data Structures**: Full compliance with design specifications

### Critical Missing Components ❌
- **Extension Registration**: Taskmaster UI components not registered in extension.ts
- **Task Mock Data**: MockDataProvider missing task generation methods
- **Package.json Configuration**: Missing VSCode contribution points
- **Command Registration**: Task-related commands not registered

## Architecture

**File Structure Note**: Implementation uses existing repo structure (`src/tasks/`, `src/services/`) rather than creating new `src/taskmaster/` directories.

### High-Level Architecture

```mermaid
graph TB
    subgraph "VSCode Extension Host"
        EXT[VSCode Extension]
        TTV[Task Tree View]
        TDC[Task Detail Card]
        SB[Status Bar]
        TDS[TasksDataService]
        CIS[CursorIntegrationService]
        TFU[TimeFormattingUtility]
    end

    subgraph "Local MCP Server Process"
        MCP[MCP Server]
        CTX[Context Manager]
        TSM[Task Status Manager]
        MTP[MarkdownTaskParser]
        MOCK[Mock Data Layer]
        MCACHE[Mock Cache (.aidm/mock-cache.json)]
    end

    subgraph "Data Sources"
        TASKS[tasks.md file]
        REQS[requirements.md]
        DESIGN[design.md]
        MOCK_DATA[Mock Task Data]
        TEST_RESULTS[Test Results]
    end

    subgraph "External AI Tools"
        CURSOR[Cursor AI]
        AI1[RooCode]
        AI2[Gemini]
    end

    EXT --> TDS
    EXT --> CIS
    EXT --> TFU
    TDS --> MCP : JSON-RPC
    TTV --> EXT
    TDC --> EXT
    SB --> EXT
    CIS --> CURSOR : API/Command

    MCP --> CTX
    CTX --> TSM
    TSM --> MTP
    MTP --> TASKS
    TSM --> MOCK_DATA
    TSM --> TEST_RESULTS
    TSM --> MCACHE

    CIS --> TASKS : Context Extraction
    CIS --> REQS : Requirements Mapping
    CIS --> DESIGN : Architecture Context

    AI1 --> MCP : MCP Protocol
    AI2 --> MCP : MCP Protocol
```

### Component Separation

**VSCode Extension (UI Layer)**

- Manages VSCode-specific integrations (TreeView, commands, status bar)
- Handles user interactions and UI state
- Communicates with MCP server via TasksDataService
- Integrates with Cursor AI through CursorIntegrationService
- Lightweight and focused on presentation logic

**TasksDataService (Data Layer)**

- Manages JSON-RPC communication with MCP server
- Handles caching and data synchronization
- Provides clean API for UI components
- Manages error handling and retry logic

**CursorIntegrationService (AI Integration Layer)**

- Extracts task context for AI prompt generation
- Manages communication with Cursor AI assistant
- Handles prompt template generation and customization
- Provides fallback mechanisms when Cursor unavailable

**MCP Server (Business Logic Layer)**

- Implements task management functionality
- Manages task data retrieval and status updates
- Handles tasks.md file parsing and modification
- Provides JSON-RPC interface for VSCode extension

## Components and Interfaces

### VSCode Extension Components

#### Task Tree View Provider

```typescript
interface TaskTreeViewProvider extends vscode.TreeDataProvider<TaskTreeItem> {
  getTreeItem(element: TaskTreeItem): vscode.TreeItem;
  getChildren(element?: TaskTreeItem): Promise<TaskTreeItem[]>;
  refresh(): void;
  onDidChangeTreeData: vscode.EventEmitter<TaskTreeItem | undefined | null>;
  expandNode(taskId: string): void;
  collapseNode(taskId: string): void;
  onTaskClick: vscode.EventEmitter<{ taskId: string; task: Task }>;
  formatTaskForDisplay(task: Task): TaskTreeItem;
}

interface TaskTreeItem extends vscode.TreeItem {
  id: string;
  label: string;
  description?: string;
  iconPath?: vscode.ThemeIcon;
  contextValue: string;
  collapsibleState: vscode.TreeItemCollapsibleState;
  task: Task;
  hasChildren: boolean;
  dependencyLevel: number;
  isExecutable: boolean; // true for not_started tasks
  estimatedDuration?: string; // "15-30 min"
  testSummary?: string; // "15/18 passed"
  statusDisplayName: string; // "not started", "in progress"
}
```

#### Task Detail Card Provider

```typescript
interface TaskDetailCardProvider {
  updateTaskDetails(task: Task): void;
  clearDetails(): void;
  showNoTaskSelected(): void;
  renderTestFailures(failures: FailingTest[]): string;
  renderExecutableActions(task: Task): string;
  renderStatusSpecificActions(task: Task): string;
  formatRelativeTime(isoDate: string): string; // "2 hours ago"

  onTaskSelected: vscode.EventEmitter<Task>;
  onStatusChanged: vscode.EventEmitter<{
    taskId: string;
    newStatus: TaskStatus;
  }>;
  onTestResultsUpdated: vscode.EventEmitter<{
    taskId: string;
    testStatus: TestStatus;
  }>;
  onCursorExecuteRequested: vscode.EventEmitter<{ taskId: string }>;
}
```

#### Time Formatting Utility

```typescript
interface TimeFormattingUtility {
  formatRelativeTime(isoDate: string): string;
  formatDuration(minutes: number): string;
  parseEstimatedDuration(duration: string): number; // "15-30 min" -> 22.5
}
```

#### Cursor Integration Service

```typescript
interface CursorIntegrationService {
  generatePromptFromTask(taskId: string): Promise<CursorPrompt>;
  extractTaskContext(task: Task): Promise<TaskExecutionContext>;
  triggerCursorChat(prompt: CursorPrompt): Promise<boolean>;
  validateCursorAvailability(): boolean;
  copyPromptToClipboard(prompt: CursorPrompt): Promise<void>;

  // Event emitters
  onPromptGenerated: vscode.EventEmitter<{
    taskId: string;
    prompt: CursorPrompt;
  }>;
  onCursorTriggered: vscode.EventEmitter<{ taskId: string; success: boolean }>;
  onError: vscode.EventEmitter<{ taskId: string; error: string }>;
}

interface TaskExecutionContext {
  task: Task;
  dependencies: Task[];
  relatedRequirements: string[];
  architecturalContext: string;
  codeReferences: string[];
  testRequirements: string[];
  implementationHints: string[];
  fileStructureContext: string;
}

interface CursorPrompt {
  title: string;
  context: string;
  instructions: string;
  codeReferences: string[];
  acceptanceCriteria: string[];
  dependencies: string[];
  implementationNotes: string[];
  testingRequirements: string[];
}
```

#### TasksDataService

```typescript
interface TasksDataService {
  getTasks(): Promise<Task[]>;
  getTaskById(id: string): Promise<Task | null>;
  updateTaskStatus(id: string, status: TaskStatus): Promise<boolean>;
  refreshTasks(): Promise<void>;
  getTaskDependencies(id: string): Promise<string[]>;
  getTestResults(taskId: string): Promise<TestStatus | null>;

  // Event emitters for UI synchronization
  onTasksUpdated: vscode.EventEmitter<Task[]>;
  onTaskStatusChanged: vscode.EventEmitter<{
    taskId: string;
    newStatus: TaskStatus;
  }>;
  onError: vscode.EventEmitter<TaskErrorResponse>;
}
```

#### Task Management Commands

```typescript
interface TaskCommands {
  refreshTasks(): Promise<void>;
  updateTaskStatus(taskId: string, status: TaskStatus): Promise<void>;
  openTaskInEditor(taskId: string): void;
  showTaskHistory(taskId: string): void;
  viewTestResults(taskId: string): void;
  reportTaskIssue(taskId: string): void;
  executeTaskWithCursor(taskId: string): Promise<void>;
  generateTaskPrompt(taskId: string): Promise<void>;
}
```

### MCP Server Components

#### Task Status Manager

```typescript
interface TaskStatusManager {
  getTasks(): Promise<Task[]>;
  getTaskById(id: string): Promise<Task | null>;
  updateTaskStatus(id: string, status: TaskStatus): Promise<boolean>;
  refreshTasksFromFile(): Promise<void>;
  getTaskDependencies(id: string): Promise<string[]>;
  getTestResults(taskId: string): Promise<TestStatus | null>;
  validateStatusTransition(
    currentStatus: TaskStatus,
    newStatus: TaskStatus
  ): boolean;
  getTaskContext(taskId: string): Promise<TaskContext>;
}

interface Task {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  complexity: TaskComplexity;
  dependencies: string[];
  requirements: string[];
  createdDate: string; // ISO date string
  lastModified: string; // ISO date string
  assignee?: string;
  estimatedHours?: number;
  actualHours?: number;
  estimatedDuration?: string; // "15-30 min", "20-25 min"
  testStatus?: TestStatus;
  tags?: string[];
  priority?: TaskPriority;
  implementationNotes?: string[];
  acceptanceCriteria?: string[];
  isExecutable?: boolean; // For Cursor integration eligibility
}

interface TestStatus {
  lastRunDate?: string; // ISO date string
  totalTests: number;
  passedTests: number;
  failedTests: number;
  failingTestsList?: FailingTest[];
  testSuite?: string;
  coverage?: number;
}

interface FailingTest {
  name: string;
  message: string;
  stackTrace?: string;
  category: "assertion" | "type" | "filesystem" | "timeout" | "network";
}

enum TaskStatus {
  NOT_STARTED = "not_started",
  IN_PROGRESS = "in_progress",
  REVIEW = "review",
  COMPLETED = "completed",
  BLOCKED = "blocked",
  DEPRECATED = "deprecated",
}

// Status display mapping
const STATUS_DISPLAY_NAMES: Record<TaskStatus, string> = {
  [TaskStatus.NOT_STARTED]: "not started",
  [TaskStatus.IN_PROGRESS]: "in progress",
  [TaskStatus.REVIEW]: "review",
  [TaskStatus.COMPLETED]: "completed",
  [TaskStatus.BLOCKED]: "blocked",
  [TaskStatus.DEPRECATED]: "deprecated",
};

// Status-specific action configurations
const STATUS_ACTIONS: Record<TaskStatus, string[]> = {
  [TaskStatus.NOT_STARTED]: [
    "🤖 Execute with Cursor",
    "Generate Prompt",
    "View Requirements",
  ],
  [TaskStatus.IN_PROGRESS]: [
    "Continue Work",
    "Mark Complete",
    "View Dependencies",
  ],
  [TaskStatus.REVIEW]: [
    "Approve & Complete",
    "Request Changes",
    "View Implementation",
  ],
  [TaskStatus.COMPLETED]: ["View Code", "View Tests", "History"],
  [TaskStatus.BLOCKED]: [
    "View Blockers",
    "Update Dependencies",
    "Report Issue",
  ],
  [TaskStatus.DEPRECATED]: ["Archive", "View History"],
};
```

#### MarkdownTaskParser

```typescript
interface MarkdownTaskParser {
  parseTasksFromFile(filePath: string): Promise<Task[]>;
  parseTaskFromMarkdown(markdown: string): Task | null;
  validateTaskData(task: Task): ValidationResult;
  serializeTaskToMarkdown(task: Task): string;
  updateTaskInFile(
    filePath: string,
    taskId: string,
    updates: Partial<Task>
  ): Promise<boolean>;
  extractTaskContext(taskId: string): Promise<TaskExecutionContext>;
}

interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}
```

#### Enhanced Context Manager

```typescript
interface EnhancedContextManager extends ContextManager {
  getTaskContext(taskId: string): Promise<TaskContext>;
  getTasksForFile(filePath: string): Promise<Task[]>;
  getTasksByStatus(status: TaskStatus): Promise<Task[]>;
  getTasksByRequirement(requirementId: string): Promise<Task[]>;
  getTasksByPriority(priority: TaskPriority): Promise<Task[]>;
  getTasksByAssignee(assignee: string): Promise<Task[]>;
  extractExecutionContext(taskId: string): Promise<TaskExecutionContext>;
}

interface TaskContext {
  task: Task;
  relatedRequirements: Requirement[];
  codeMappings: CodeMapping[];
  businessContext: BusinessContext;
  dependencies: Task[];
  blockers: Task[];
  testResults?: TestStatus;
  estimatedCompletion?: Date;
}
```

### Data Models

#### Enhanced Task Data Structure

```typescript
interface TaskData {
  tasks: Task[];
  metadata: {
    lastUpdated: string; // ISO date string
    totalTasks: number;
    completedTasks: number;
    inProgressTasks: number;
    blockedTasks: number;
    executableTasks: number; // not_started tasks
    testCoverage: number;
    averageComplexity: TaskComplexity;
  };
  relationships: {
    taskDependencies: Record<string, string[]>;
    requirementMappings: Record<string, string[]>;
    fileMappings: Record<string, string[]>;
    testMappings: Record<string, string[]>;
  };
  performance: {
    lastRefreshTime: string; // ISO date string
    refreshDuration: number;
    cacheHitRate: number;
  };
}
```

#### Mock Data Examples

```typescript
// Example executable task (not_started)
const executableTask: Task = {
  id: "3.1.2",
  title: "Add TaskTreeItem status indicator property",
  description:
    "Add iconPath property with status-based theme icons to TaskTreeItem. Implement logic to assign appropriate icons based on task status.",
  status: TaskStatus.NOT_STARTED,
  complexity: TaskComplexity.LOW,
  estimatedDuration: "15-20 min",
  dependencies: ["3.1.1", "2.2"],
  requirements: ["2.2"],
  createdDate: "2024-08-22T10:00:00Z",
  lastModified: "2024-08-22T10:00:00Z",
  isExecutable: true,
  testStatus: null,
};

// Example completed task with test failures
const completedWithFailures: Task = {
  id: "2.5.3",
  title: "Add tasks/update-status tool to SimpleMCPServer",
  description:
    "Implement the tasks/update-status MCP tool in SimpleMCPServer to handle task status update requests from the VSCode extension.",
  status: TaskStatus.COMPLETED,
  complexity: TaskComplexity.MEDIUM,
  estimatedDuration: "25-30 min",
  dependencies: ["2.5.1", "2.5.2"],
  requirements: [],
  createdDate: "2024-08-22T09:00:00Z",
  lastModified: "2024-08-22T14:45:00Z",
  isExecutable: false,
  testStatus: {
    lastRunDate: "2024-08-22T13:15:00Z",
    totalTests: 18,
    passedTests: 15,
    failedTests: 3,
    failingTestsList: [
      {
        name: "should validate task status transitions",
        message: "AssertionError: Expected 400 but got 200",
        category: "assertion",
      },
      {
        name: "should handle invalid task IDs",
        message: "TypeError: Cannot read property 'id' of undefined",
        category: "type",
      },
      {
        name: "should persist status changes",
        message: "FileSystemError: Permission denied",
        category: "filesystem",
      },
    ],
    coverage: 85,
  },
};
```

#### Enhanced JSON-RPC Communication

```typescript
interface TaskJSONRPCRequest extends JSONRPCRequest {
  method:
    | "tasks/list"
    | "tasks/get"
    | "tasks/update-status"
    | "tasks/refresh"
    | "tasks/dependencies"
    | "tasks/test-results"
    | "tasks/context";
  params?: any;
  client_id?: string;
  session_token?: string;
  timestamp: number;
}

interface TaskJSONRPCResponse extends JSONRPCResponse {
  result?:
    | Task
    | Task[]
    | boolean
    | string[]
    | TestStatus
    | TaskExecutionContext;
  error?: JSONRPCError;
  metadata?: {
    responseTime: number;
    cacheStatus: "hit" | "miss" | "stale";
    serverVersion: string;
  };
}
```

## UI/UX Design

### Expandable List Layout

**Visual Hierarchy**

- **List Items**: Individual tasks with expandable details
- **Task Headers**: ID, title, status badge, and expand icon
- **Expanded Details**: Full description, metadata, test results, actions
- **Special Indicators**: Executable tasks show blue left border and 🤖 icon

**Enhanced Status Indicators**

- **not started**: Gray badge with 🤖 icon for executable tasks
- **in progress**: Blue badge with gear icon
- **review**: Yellow badge with document icon
- **completed**: Green badge with checkmark
- **blocked**: Red badge with warning icon
- **deprecated**: Dark badge with X icon

**Task Information Display**

- Task ID (monospace, colored background)
- Task Title (truncated with tooltip)
- Status badge (colored, with display name)
- Cursor executable indicator (🤖 icon + blue border)
- Estimated duration in metadata
- Test status summary badge

**Expandable Content Sections**

1. **Task Description**: Full description text
2. **Metadata Grid**: Complexity, estimated duration, dependencies
3. **Test Results**: Expandable section with pass/fail stats and collapsible failures
4. **Actions**: Status-specific button sets

**Test Results Display**

- Summary stats (Total/Passed/Failed)
- Last run timestamp ("Last run: 2 hours ago")
- Collapsible failing tests section
- Individual failure items with error categorization

### Split-Panel Layout

```mermaid
graph TB
    subgraph "VSCode Sidebar"
        subgraph "Top Panel - Task Tree View"
            TTV[Task Tree View]
            TTV --> T1[⚙️ Task 1.1 - Setup Project Structure]
            TTV --> T2[📄 Task 1.2 - Implement Data Models]
            TTV --> T3[📄 Task 2.1 - Create Storage Mechanism]
            T1 --> EXECUTE1[🤖 Execute with Cursor]
            T2 --> EXECUTE2[🤖 Execute with Cursor]
        end

        subgraph "Bottom Panel - Task Detail Card"
            TDC[Task Detail Card]
            TDC --> TD[Task Details]
            TD --> TITLE[Title: Implement Data Models]
            TD --> DESC[Description: Create core data model interfaces...]
            TD --> STATUS[Status: In Progress ▼]
            TD --> COMPLEXITY[Complexity: Medium]
            TD --> DEPS[Dependencies: Task 1.1]
            TD --> TESTS[Tests: 15/20 passed ✅]
            TD --> ACTIONS[Actions: Generate Code, Review with RooCode, Execute with Cursor]
        end
    end
```

### Task Tree View Design

**Visual Hierarchy**

- **Root Level**: Project/Module grouping with collapsible nodes
- **Second Level**: Individual tasks with status indicators and expandable details
- **Third Level**: Sub-tasks, dependencies, and test results

**Enhanced Status Indicators**

- 🟢 Not Started (default) - Simple circle with cursor execute icon on hover
- ⚙️ In Progress - Gear icon indicating work in progress
- 📄 Review - Document icon for review phase
- ✅ Completed - Checkmark for completed tasks
- 🔴 Blocked - Warning icon for blocked tasks
- ⚫ Deprecated - X icon for deprecated tasks

**Task Information Display**

- Task ID (e.g., "1.2") with hierarchical numbering
- Task Title (truncated if too long with tooltip for full text)
- Status badge with color coding and icon
- Dependency indicator (chain link icon if dependencies exist)
- Test status indicator (small badge showing pass/fail ratio)
- Priority indicator (colored dot for high/critical priority)
- Cursor executable indicator (🤖 icon for not_started tasks)

**Interactive Features**

- Click to expand/collapse task nodes
- Click on executable tasks (not_started) to trigger Cursor integration
- Right-click context menu for quick actions
- Drag and drop for reordering (future enhancement)
- Keyboard navigation support (arrow keys, enter, space)

### Task Detail Card Design

**Enhanced Information Layout**

```
┌─────────────────────────────────────┐
│ Task 1.2: Implement Data Models    │
├─────────────────────────────────────┤
│ Description:                        │
│ Create core data model interfaces   │
│ and types for the system...        │
│                                     │
│ Complexity: Medium                  │
│ Priority: High                      │
│ Status: Not Started [▼]            │
│ Dependencies: Task 1.1             │
│ Requirements: 1.2, 3.3, 1.2       │
│                                     │
│ Test Results: No tests yet         │
│ [View Details ▼]                    │
│                                     │
│ [🤖 Execute with Cursor] [Generate Code] [Review] [History] │
└─────────────────────────────────────┘
```

**Cursor Integration Section**

```
┌─ AI Assistant Actions ──────────────┐
│ Status: Ready for implementation   │
│ 🤖 [Execute with Cursor]            │
│ 📋 [Generate Prompt Only]           │
│ ⚙️ [View Context Details]           │
│                                     │
│ Last AI interaction: Never         │
│ Context extracted: ✅              │
└─────────────────────────────────────┘
```

**Test Results Section (Collapsible)**

```
┌─ Test Results ──────────────────────┐
│ Total Tests: 20                    │
│ Passed: 15 ✅                      │
│ Failed: 5 ❌                       │
│ Coverage: 75%                      │
│                                     │
│ Failing Tests:                     │
│ • testUserValidation - "Invalid..." │
│ • testDataPersistence - "Timeout"   │
│ [View Full Report]                 │
└─────────────────────────────────────┘
```

**No Task Selected State**

```
┌─────────────────────────────────────┐
│ 📋 No Task Selected                │
├─────────────────────────────────────┤
│                                     │
│ Select a task from the tree view   │
│ above to see detailed information. │
│                                     │
│ Click on executable tasks (🤖) to  │
│ start implementation with AI.      │
│                                     │
│ [Refresh Tasks] [View All Tasks]   │
└─────────────────────────────────────┘
```

**Interactive Elements**

- Status dropdown with validation (prevents invalid transitions)
- Action buttons for common operations (Generate Code, Review, History)
- Cursor execution button for eligible tasks
- Expandable sections for detailed information
- Links to related requirements, code, and test reports
- Quick action toolbar for frequently used operations

## Cursor AI Integration

### Context Extraction Strategy

**Primary Data Sources**

- **tasks.md**: Task definition, dependencies, requirements, acceptance criteria
- **requirements.md**: Related user stories and acceptance criteria
- **design.md**: Architectural context, patterns, and component specifications
- **Project structure**: File organization and existing code patterns

**Context Extraction Pipeline**

1. **Task Analysis**

   - Parse task description and implementation notes
   - Identify dependencies and prerequisite tasks
   - Extract acceptance criteria and testing requirements

2. **Requirements Mapping**

   - Map task IDs to requirement sections
   - Extract related user stories and acceptance criteria
   - Include business context and user interaction patterns

3. **Architectural Context**

   - Identify relevant design patterns from design.md
   - Include interface definitions and type specifications
   - Add component integration patterns

4. **Code Context**
   - Analyze existing file structure
   - Identify implementation patterns and conventions
   - Include relevant imports and dependencies

### Prompt Generation Pipeline

**Template-Based Construction**

```typescript
interface PromptTemplate {
  title: string;
  sections: {
    context: string;
    task: string;
    requirements: string;
    architecture: string;
    implementation: string;
    testing: string;
    acceptance: string;
  };
  complexity_modifiers: Record<TaskComplexity, string[]>;
  priority_modifiers: Record<TaskPriority, string[]>;
}
```

**Dynamic Context Injection**

- Task complexity determines prompt detail level
- Priority affects urgency and quality indicators
- Dependencies include prerequisite context
- Requirements section includes mapped user stories

**Integration Strategy**

1. **VSCode Command Integration**

   - Register `cursor.executeTask` command
   - Use VSCode's command palette API
   - Trigger Cursor's chat interface programmatically

2. **Fallback Mechanisms**

   - Clipboard copy if Cursor API unavailable
   - Rich prompt formatting for manual paste
   - User notification with instructions

3. **Progress Tracking**
   - Visual feedback during prompt generation
   - Status updates in task detail panel
   - Error handling with retry options

**Example Generated Prompt Structure**

```
# Task Implementation: Create TaskTreeItem class with basic properties

## Context
You are implementing a VSCode extension component for the Sidebar Taskmaster Dashboard. This task is part of the UI foundation layer.

## Task Description
- **ID**: 3.1.1
- **Title**: Create TaskTreeItem class with basic properties
- **Complexity**: Low
- **Dependencies**: Tasks 1.1, 1.2 (completed)

## Requirements
From requirement 1.1: "WHEN the extension is activated THEN the system SHALL display a task tree view in the VSCode sidebar"

## Architecture
This component extends vscode.TreeItem and should follow the established patterns in the existing extension architecture.

## Implementation Details
[Extracted from design.md interfaces and existing patterns]

## Acceptance Criteria
- Implement TaskTreeItem extending vscode.TreeItem
- Add basic properties (label, description, contextValue)
- Write unit tests for TaskTreeItem creation

## Testing Requirements
Write focused unit tests for this specific functionality, not comprehensive suites.
```

## Error Handling

### Task-Specific Error Categories

**Data Retrieval Errors**

- Tasks.md file not found → Use mock data with warning banner
- File parsing errors → Display error message with retry option and file path
- Invalid task data → Skip invalid tasks, log warnings, show data quality indicator

**Status Update Errors**

- File write permissions → Show error message, suggest manual update, provide file path
- Invalid status transitions → Validate before sending to server, show transition rules
- Network communication failures → Queue updates for retry, show offline indicator

**Cursor Integration Errors**

- Cursor unavailable → Fall back to clipboard copy with notification
- Context extraction failures → Show partial context with warning
- Prompt generation errors → Provide manual prompt option
- API communication failures → Retry with exponential backoff

**UI Synchronization Errors**

- Tree view refresh failures → Show cached data with staleness indicator and refresh button
- Detail panel update failures → Clear panel, show error message, provide fallback view
- State inconsistency → Force refresh from server, show sync status indicator

**Test Results Errors**

- Test data unavailable → Show "No Test Data" indicator with setup instructions
- Test execution failures → Display error message with retry option
- Coverage data missing → Show partial results with data availability warning

### Enhanced Error Response Format

```typescript
interface TaskErrorResponse extends ErrorResponse {
  taskId?: string;
  operation:
    | "task_retrieval"
    | "status_update"
    | "dependency_resolution"
    | "test_results"
    | "cursor_integration"
    | "context_extraction"
    | "time_formatting";
  suggestedAction?:
    | "retry"
    | "manual_update"
    | "refresh"
    | "clear_cache"
    | "check_permissions"
    | "use_fallback";
  retryAfter?: number; // seconds
  userInstructions?: string;
  technicalDetails?: string;
  supportContact?: string;
  fallbackOptions?: string[];
}
```

### Graceful Degradation

1. **MCP Server Unavailable** → Show cached task data with connection warning and offline mode indicator
2. **Tasks.md File Unreadable** → Use mock task data for demonstration with prominent warning banner
3. **Status Updates Failing** → Disable status editing, show manual update instructions with file path
4. **Cursor Integration Failing** → Fall back to clipboard copy, disable AI features gracefully
5. **UI Component Failures** → Fall back to basic list view with minimal functionality and error reporting
6. **Test Results Unavailable** → Show placeholder with setup instructions and manual refresh option

## Testing Strategy

### Enhanced Test Pyramid Structure

**Unit Tests (70%)**

- Task data parsing and validation (MarkdownTaskParser)
- Status transition logic and validation
- Tree view data provider and item rendering
- Detail card rendering and state management
- Cursor integration service methods
- Context extraction and prompt generation
- Error handling scenarios and recovery
- Test status parsing and display logic
- Cache management and invalidation

**Integration Tests (20%)**

- VSCode extension ↔ MCP server communication
- Task status update flow and file persistence
- UI synchronization between panels
- Cursor integration workflow testing
- Cache invalidation and updates
- Error handling integration with existing systems
- Test results integration and display

**End-to-End Tests (10%)**

- Complete task management workflows
- Cursor execution workflow (with mocked Cursor API)
- Error recovery scenarios and user experience
- Performance benchmarks under load
- User interaction testing and accessibility
- **Critical E2E Test**: Full round-trip workflow
  - UI action (status dropdown change) → API call to Local MCP → tasks.md file modification → file system watcher → UI refresh → change reflection

### Enhanced Mock Strategy

**Development Mocks**

```typescript
interface MockTaskConfiguration {
  taskCount: number;
  complexityDistribution: Record<TaskComplexity, number>;
  statusDistribution: Record<TaskStatus, number>;
  dependencyDepth: number;
  includeSubTasks: boolean;
  testDataCoverage: number; // percentage of tasks with test data
  errorScenarios: MockErrorScenario[];