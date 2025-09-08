# Requirements Document - Sidebar Taskmaster Dashboard

## Introduction

The Sidebar Taskmaster Dashboard is a new UI module within the enterprise-ai-context-extension that provides developers with an intelligent task management interface. This module shifts developer focus from manual implementation to intelligent review and management of tasks, leveraging AI assistants (RooCode/Gemini) and institutional knowledge from MCP Servers. The dashboard will be displayed as an expandable list design in the VSCode sidebar, featuring collapsible task items with detailed information panels.

## Current Status and Critical Gaps

**Implementation Progress: ~65% Complete**

**Critical Implementation Gaps Identified:**
- Extension UI component registration missing from extension.ts
- Mock task data generation not implemented in MockDataProvider
- VSCode contribution points missing from package.json
- Task-related commands not registered in activation function

**Risk Assessment:** While core components are implemented, the extension would fail at runtime due to missing UI registration and task data provision.

## Requirements

### Requirement 1

**User Story:** As a developer, I want to see a high-level overview of all assigned tasks in an expandable list view, so that I can quickly understand my workload and task priorities while accessing detailed information when needed.

#### Acceptance Criteria

1. WHEN the extension is activated THEN the system SHALL display a task list view in the VSCode sidebar
2. WHEN the task list view is displayed THEN the system SHALL show task ID, task name/title, and status indicator for each task in collapsed state
3. WHEN a task header is clicked THEN the system SHALL expand/collapse the task to show/hide detailed information
4. IF a task has dependencies THEN the system SHALL display dependency relationships in the expanded details section
5. WHEN the task list is refreshed THEN the system SHALL update the list view with current task data from the MCP server
6. WHEN a task is expanded THEN only one task SHALL be expanded at a time (accordion behavior)
7. IF the list contains many tasks THEN the system SHALL support virtual scrolling to maintain performance
8. WHEN a task has status "not_started" THEN the system SHALL display a blue left border and 🤖 icon indicating it's executable with Cursor

#### Implementation Status
- **Core UI Components**: ✅ TaskTreeViewProvider implemented
- **Extension Registration**: ❌ Missing registration in extension.ts
- **Data Provider**: ❌ Missing task mock data generation

### Requirement 2

**User Story:** As a developer, I want to view detailed information about a task in an expanded view, so that I can understand the full context, requirements, and current status before implementation.

#### Acceptance Criteria

1. WHEN a task is expanded THEN the system SHALL display full task description, complexity rating, estimated duration, and dependencies list
2. WHEN task details are displayed THEN the system SHALL show metadata in a grid layout (complexity, estimated duration, dependencies)
3. IF a task has no dependencies THEN the system SHALL display "None" in the dependencies section
4. WHEN task details are loaded THEN the system SHALL maintain expansion state until another task is clicked
5. WHEN no task is expanded THEN all tasks SHALL be in collapsed state showing only header information
6. IF a task has associated test data THEN the system SHALL display test results summary with pass/fail counts
7. WHEN test results include failures THEN the system SHALL provide a collapsible section showing failing test details
8. IF test results have a last run date THEN the system SHALL display relative time format ("2 hours ago")

#### Implementation Status
- **Detail Card Component**: ✅ TaskDetailCardProvider implemented
- **Time Formatting**: ✅ TimeFormattingUtility implemented
- **WebView Registration**: ❌ Missing registration in extension.ts

### Requirement 3

**User Story:** As a developer, I want to update task status and see status-specific actions, so that I can track progress and take appropriate actions based on the current task state.

#### Acceptance Criteria

1. WHEN a task status is changed in the expanded view THEN the system SHALL send a JSON-RPC call to the local MCP server using method "tasks/update-status"
2. WHEN the status update API call is made THEN the system SHALL include parameters: taskId (string) and newStatus (TaskStatus enum)
3. IF the status update is successful THEN the system SHALL persist the change to the tasks.md file
4. WHEN the status is updated THEN the system SHALL reflect the change in the task header status badge
5. IF the status update fails THEN the system SHALL display an appropriate error message
6. IF an invalid status transition is attempted THEN the system SHALL validate and prevent the change before sending to server
7. WHEN a task is expanded THEN the system SHALL display status-specific action buttons based on current task status
8. WHEN task status is "not_started" THEN action buttons SHALL include "🤖 Execute with Cursor", "Generate Prompt", "View Requirements"
9. WHEN task status is "completed" THEN action buttons SHALL include "View Code", "View Tests", "History"

#### Implementation Status
- **Status Update Logic**: ✅ TasksDataService implemented
- **MCP Integration**: ✅ Server-side tools implemented
- **Command Registration**: ❌ Missing command registration in extension.ts

### Requirement 4

**User Story:** As a developer, I want the dashboard to automatically refresh task data and show relative timestamps, so that I always have current information with human-readable time formats.

#### Acceptance Criteria

1. WHEN the extension is activated THEN the system SHALL automatically fetch task data from the local MCP server
2. WHEN a refresh is triggered THEN the system SHALL retrieve updated task information and maintain current expansion state
3. IF new tasks are added THEN the system SHALL display them in the list view
4. IF task statuses change externally THEN the system SHALL reflect those changes in the UI
5. WHEN auto-refresh is enabled THEN the system SHALL refresh task data every 5 minutes by default
6. WHEN a manual refresh is requested THEN the system SHALL perform a full data fetch from the MCP server
7. IF the refresh operation fails THEN the system SHALL display cached data with a staleness indicator
8. WHEN displaying timestamps THEN the system SHALL use relative time format ("2 hours ago", "45 minutes ago")
9. IF timestamp formatting fails THEN the system SHALL fall back to absolute time display

#### Implementation Status
- **Auto-refresh Logic**: ✅ TasksDataService with event system implemented
- **Time Formatting**: ✅ TimeFormattingUtility with caching implemented
- **Refresh Commands**: ❌ Missing command registration and initialization

### Requirement 5

**User Story:** As a developer, I want the dashboard to handle errors gracefully and provide meaningful test failure information, so that I can continue working and quickly identify issues.

#### Acceptance Criteria

1. WHEN the MCP server is unavailable THEN the system SHALL display an appropriate error message
2. IF API calls fail THEN the system SHALL provide retry options
3. WHEN errors occur THEN the system SHALL log them according to existing error handling patterns
4. IF the tasks.md file cannot be read THEN the system SHALL display a fallback message
5. WHEN errors occur THEN the system SHALL display a visual error indicator (red icon) in the status bar
6. IF the error state persists THEN the system SHALL provide a "Report Issue" button with error details
7. WHEN in error state THEN the system SHALL disable interactive features that require server communication
8. WHEN test failures are displayed THEN the system SHALL categorize errors by type (assertion, type, filesystem, timeout, network)
9. IF test failure details are available THEN the system SHALL show test name, error message, and error category in a collapsible section

#### Implementation Status
- **Error Handling**: ✅ Enhanced error response formats implemented
- **Test Failure Display**: ✅ FailingTest interface and display logic implemented
- **Mock Failure Data**: ❌ Missing realistic test failure mock scenarios

### Requirement 6

**User Story:** As a developer, I want the dashboard to integrate with existing extension infrastructure and provide enhanced task data, so that it follows established patterns and provides rich task information.

#### Acceptance Criteria

1. WHEN the dashboard is implemented THEN it SHALL use the existing ContextManager for data retrieval
2. IF the CompositeContextService is available THEN the system SHALL leverage it for context management
3. WHEN communicating with the MCP server THEN the system SHALL use the existing HTTP JSON-RPC protocol
4. IF the MockDataProvider is available THEN the system SHALL use it for testing and development
5. WHEN error handling is required THEN the system SHALL use the existing ErrorHandler and DegradedModeManager
6. IF audit logging is needed THEN the system SHALL use the existing AuditLogger for all task operations
7. WHEN configuration is required THEN the system SHALL use the existing extension configuration patterns
8. WHEN task data is retrieved THEN it SHALL include estimatedDuration field ("15-30 min" format)
9. IF tasks have test results THEN the data SHALL include detailed failure information with error categorization

#### Implementation Status
- **Integration Interfaces**: ✅ All interface definitions complete
- **Enhanced Data Models**: ✅ Task interface with all required fields implemented
- **MockDataProvider Integration**: ❌ Missing task generation methods in MockDataProvider

### Requirement 7

**User Story:** As a developer, I want to see comprehensive test results with failure details, so that I can quickly assess implementation quality and identify specific issues.

#### Acceptance Criteria

1. WHEN a task has associated test data THEN the system SHALL display test results in the expanded task view
2. IF tests are failing THEN the system SHALL highlight the failure count and provide access to detailed test results
3. WHEN test results are displayed THEN the system SHALL show total tests, passed tests, and failed tests in a summary format
4. IF a task has no test data THEN the system SHALL display a "No tests available yet" or similar indicator
5. WHEN test results change THEN the system SHALL update the display to reflect the current state
6. IF test failures exist THEN the system SHALL provide a collapsible section showing failing test names and error messages
7. WHEN failing tests are displayed THEN each failure SHALL show test name, error message, and error category
8. IF test coverage data is available THEN the system SHALL display coverage percentage in the test results section
9. WHEN test results have timestamps THEN the system SHALL display relative time since last test run

#### Implementation Status
- **Test Results Display**: ✅ TestStatus interface and rendering logic implemented
- **Failure Categorization**: ✅ FailingTest with category enum implemented
- **Mock Test Data**: ❌ Missing realistic test result mock scenarios

### Requirement 8

**User Story:** As a developer, I want to click on executable tasks to automatically generate contextual prompts for my AI coding assistant, so that I can begin implementation with proper context without manual research.

#### Acceptance Criteria

1. WHEN I click on a task with status "not_started" AND isExecutable=true THEN the system SHALL extract task context and generate a Cursor-compatible prompt
2. WHEN a prompt is generated THEN it SHALL include task description, dependencies, requirements mapping, and relevant architectural context
3. WHEN the prompt is ready THEN the system SHALL trigger Cursor's chat interface with the generated prompt
4. IF a task is already "in_progress" or "completed" THEN the click SHALL expand task details instead of generating a prompt
5. WHEN context extraction fails THEN the system SHALL show an error message with fallback manual prompt option
6. IF Cursor is not available THEN the system SHALL copy the prompt to clipboard with a notification
7. WHEN a task is executable THEN it SHALL display visual indicators (blue left border, 🤖 icon)
8. IF task executable state changes THEN the system SHALL update visual indicators accordingly

#### Implementation Status
- **Executable Task Logic**: ✅ isExecutable property and visual indicators implemented
- **Context Extraction**: ⚠️ Interface defined, implementation planned
- **Cursor Integration**: ❌ Service interface defined, implementation missing

### Requirement 9

**User Story:** As a developer, I want to see estimated task durations and relative time formatting throughout the interface, so that I can better understand effort requirements and timeline context.

#### Acceptance Criteria

1. WHEN task metadata is displayed THEN the system SHALL show estimatedDuration field in human-readable format ("15-30 min")
2. IF estimated duration is not available THEN the system SHALL display "Duration not specified" or hide the field
3. WHEN timestamps are displayed THEN the system SHALL format them as relative time ("2 hours ago", "45 minutes ago")
4. IF relative time calculation fails THEN the system SHALL fall back to absolute timestamp display
5. WHEN time formatting is updated THEN the system SHALL refresh relative times periodically (every minute)
6. IF task creation or modification dates are available THEN the system SHALL display them in tooltip or metadata section
7. WHEN displaying test run times THEN the system SHALL use consistent relative time formatting
8. IF time data is missing THEN the system SHALL handle gracefully without breaking the interface

#### Implementation Status
- **Duration Fields**: ✅ estimatedDuration property added to Task interface
- **Time Formatting**: ✅ TimeFormattingUtility with caching implemented
- **Periodic Updates**: ⚠️ Logic implemented, needs initialization in extension.ts

## New Critical Requirements

### Requirement 10 (NEW)

**User Story:** As a developer, I want the Taskmaster dashboard to appear in my VSCode sidebar when the extension is activated, so that I can access the task management interface.

#### Acceptance Criteria

1. WHEN the extension is activated THEN the system SHALL register TaskTreeViewProvider with VSCode's registerTreeDataProvider API
2. WHEN the extension is activated THEN the system SHALL register TaskDetailCardProvider with VSCode's registerWebviewViewProvider API
3. WHEN the sidebar is opened THEN the "Taskmaster" activity bar icon SHALL be visible
4. WHEN the Taskmaster icon is clicked THEN the task list view SHALL be displayed
5. IF registration fails THEN the system SHALL log appropriate error messages and gracefully degrade
6. WHEN the extension is deactivated THEN all registered providers SHALL be properly disposed

#### Blocking Impact
- **Severity**: CRITICAL
- **Impact**: Without this requirement, the entire Taskmaster UI will be invisible to users
- **Dependencies**: All other UI requirements depend on this foundation

### Requirement 11 (NEW)

**User Story:** As a developer, I want to see realistic task data in the dashboard during development and testing, so that I can evaluate the interface functionality with meaningful content.

#### Acceptance Criteria

1. WHEN MockDataProvider.getTasks() is called THEN it SHALL return an array of realistic Task objects
2. WHEN task data is generated THEN it SHALL include all required enhanced fields (estimatedDuration, isExecutable, testStatus)
3. WHEN mock test results are generated THEN they SHALL include realistic FailingTest objects with proper error categorization
4. IF a task has status "not_started" THEN it SHALL have isExecutable=true and appropriate visual indicators
5. WHEN task timestamps are generated THEN they SHALL use ISO date strings that produce realistic relative times
6. IF MockDataProvider.getTaskById() is called THEN it SHALL return the specific task or null appropriately
7. WHEN mock data includes dependencies THEN they SHALL reference valid task IDs within the dataset
8. IF test failure data is included THEN it SHALL represent realistic development scenarios

#### Blocking Impact
- **Severity**: CRITICAL
- **Impact**: Without realistic mock data, TasksDataService cannot provide content, resulting in empty UI
- **Dependencies**: All display and interaction requirements depend on this data foundation

### Requirement 12 (NEW)

**User Story:** As a developer, I want task-related commands to be available in the VSCode command palette and context menus, so that I can interact with tasks efficiently.

#### Acceptance Criteria

1. WHEN the extension is activated THEN task commands SHALL be registered via vscode.commands.registerCommand
2. WHEN I open the command palette THEN "Taskmaster: Refresh Tasks" SHALL be available
3. WHEN I right-click on an executable task THEN "Execute Task with Cursor" SHALL appear in the context menu
4. WHEN commands are executed THEN they SHALL interact with the