# Requirements Document - Sidebar Taskmaster Dashboard

## Introduction

The Sidebar Taskmaster Dashboard is a new UI module within the enterprise-ai-context-extension that provides developers with an intelligent task management interface. This module shifts developer focus from manual implementation to intelligent review and management of tasks, leveraging AI assistants (RooCode/Gemini) and institutional knowledge from MCP Servers. The dashboard will be displayed as a split-panel design in the VSCode sidebar, featuring a task tree view and detailed task information panel.

## Requirements

### Requirement 1

**User Story:** As a developer, I want to see a high-level overview of all assigned tasks in a tree view, so that I can quickly understand my workload and task priorities.

#### Acceptance Criteria

1. WHEN the extension is activated THEN the system SHALL display a task tree view in the VSCode sidebar
2. WHEN the task tree view is displayed THEN the system SHALL show task ID, task name/title, and status indicator for each task
3. IF a task has dependencies THEN the system SHALL display dependency relationships in the tree structure
4. WHEN the task list is refreshed THEN the system SHALL update the tree view with current task data from the MCP server
5. WHEN a task node is clicked THEN the system SHALL expand/collapse the node to show/hide sub-tasks and dependencies
6. IF the tree view contains many tasks THEN the system SHALL support virtual scrolling to maintain performance

### Requirement 2

**User Story:** As a developer, I want to view detailed information about a selected task, so that I can understand the full context and requirements before implementation.

#### Acceptance Criteria

1. WHEN a task is selected from the tree view THEN the system SHALL display detailed task information in the bottom panel
2. WHEN task details are displayed THEN the system SHALL show full task description, complexity rating, dependencies list, and current status
3. IF a task has no dependencies THEN the system SHALL display an empty dependencies list
4. WHEN task details are loaded THEN the system SHALL maintain synchronization between the tree view and detail panel
5. WHEN no task is selected THEN the system SHALL clear the detail panel and display a placeholder message
6. IF a task has associated test data THEN the system SHALL display test results summary in the detail panel

### Requirement 3

**User Story:** As a developer, I want to update task status interactively, so that I can track progress and maintain accurate project status.

#### Acceptance Criteria

1. WHEN a task status is changed in the detail panel THEN the system SHALL send a JSON-RPC call to the local MCP server using method "tasks/update-status"
2. WHEN the status update API call is made THEN the system SHALL include parameters: taskId (string) and newStatus (TaskStatus enum)
3. IF the status update is successful THEN the system SHALL persist the change to the tasks.md file
4. WHEN the status is updated THEN the system SHALL reflect the change in both the tree view and detail panel
5. IF the status update fails THEN the system SHALL display an appropriate error message
6. IF an invalid status transition is attempted THEN the system SHALL validate and prevent the change before sending to server

### Requirement 4

**User Story:** As a developer, I want the dashboard to automatically refresh task data, so that I always have the most current information without manual intervention.

#### Acceptance Criteria

1. WHEN the extension is activated THEN the system SHALL automatically fetch task data from the local MCP server
2. WHEN a refresh is triggered THEN the system SHALL retrieve updated task information
3. IF new tasks are added THEN the system SHALL display them in the tree view
4. IF task statuses change externally THEN the system SHALL reflect those changes in the UI
5. WHEN auto-refresh is enabled THEN the system SHALL refresh task data every 5 minutes by default
6. WHEN a manual refresh is requested THEN the system SHALL perform a full data fetch from the MCP server
7. IF the refresh operation fails THEN the system SHALL display cached data with a staleness indicator

### Requirement 5

**User Story:** As a developer, I want the dashboard to handle errors gracefully, so that I can continue working even when there are communication issues with the MCP server.

#### Acceptance Criteria

1. WHEN the MCP server is unavailable THEN the system SHALL display an appropriate error message
2. IF API calls fail THEN the system SHALL provide retry options
3. WHEN errors occur THEN the system SHALL log them according to existing error handling patterns
4. IF the tasks.md file cannot be read THEN the system SHALL display a fallback message
5. WHEN errors occur THEN the system SHALL display a visual error indicator (red icon) in the status bar
6. IF the error state persists THEN the system SHALL provide a "Report Issue" button with error details
7. WHEN in error state THEN the system SHALL disable interactive features that require server communication

### Requirement 6

**User Story:** As a developer, I want the dashboard to integrate with existing extension infrastructure, so that it follows established patterns and leverages existing services.

#### Acceptance Criteria

1. WHEN the dashboard is implemented THEN it SHALL use the existing ContextManager for data retrieval
2. IF the CompositeContextService is available THEN the system SHALL leverage it for context management
3. WHEN communicating with the MCP server THEN the system SHALL use the existing HTTP JSON-RPC protocol
4. IF the MockDataProvider is available THEN the system SHALL use it for testing and development
5. WHEN error handling is required THEN the system SHALL use the existing ErrorHandler and DegradedModeManager
6. IF audit logging is needed THEN the system SHALL use the existing AuditLogger for all task operations
7. WHEN configuration is required THEN the system SHALL use the existing extension configuration patterns

### Requirement 7

**User Story:** As a developer, I want to see test results associated with tasks, so that I can quickly assess implementation quality and identify issues.

#### Acceptance Criteria

1. WHEN a task has associated test data THEN the system SHALL display test results in the task detail panel
2. IF tests are failing THEN the system SHALL highlight the failure count and provide a link to view detailed test results
3. WHEN test results are displayed THEN the system SHALL show total tests, passed tests, and failed tests
4. IF a task has no test data THEN the system SHALL display a "No Tests" indicator
5. WHEN test results change THEN the system SHALL update the display to reflect the current state
6. IF test failures exist THEN the system SHALL provide a collapsible section showing failing test names and error messages

### Requirement 8

**User Story:** As a developer, I want to click on unexecuted tasks to automatically generate contextual prompts for my AI coding assistant, so that I can begin implementation with proper context without manual research.

#### Acceptance Criteria

1. WHEN I click on a task with status "not_started" THEN the system SHALL extract task context and generate a Cursor-compatible prompt
2. WHEN a prompt is generated THEN it SHALL include task description, dependencies, requirements mapping, and relevant architectural context
3. WHEN the prompt is ready THEN the system SHALL trigger Cursor's chat interface with the generated prompt
4. IF a task is already "in_progress" or "completed" THEN the click SHALL show task details instead of generating a prompt
5. WHEN context extraction fails THEN the system SHALL show an error message with fallback manual prompt option
6. IF Cursor is not available THEN the system SHALL copy the prompt to clipboard with a notification
