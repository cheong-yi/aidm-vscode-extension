# Test Tasks for Workflow Verification

## Development Tasks

- [ ] 1.1 Test Task One

  - **Status**: not_started
  - **Complexity**: low
  - **Estimated Duration**: 15-20 min
  - **Description**: This is a test task to verify file parsing works correctly.
  - **Dependencies**: []
  - **Requirements**: [1.1]
  - **Tags**: [test, workflow, parsing]

- [ ] 1.2 Test Task Two

  - **Status**: in_progress
  - **Complexity**: medium
  - **Estimated Duration**: 25-30 min
  - **Description**: This is another test task with different status to verify status parsing.
  - **Dependencies**: [1.1]
  - **Requirements**: [1.2]
  - **Tags**: [test, workflow, status]

- [x] 1.3 Test Task Three

  - **Status**: completed
  - **Complexity**: high
  - **Estimated Duration**: 45-60 min
  - **Description**: This is a completed test task to verify completion status parsing.
  - **Dependencies**: [1.1, 1.2]
  - **Requirements**: [1.3]
  - **Tags**: [test, workflow, completed]

- [ ] 1.4 Test Task Four
  - **Status**: not_started
  - **Complexity**: medium
  - **Estimated Duration**: 30-40 min
  - **Description**: This task tests the executable state detection for not_started tasks.
  - **Dependencies**: [1.3]
  - **Requirements**: [1.4]
  - **Tags**: [test, workflow, executable]

## Testing Tasks

- [ ] 2.1 Test Parsing Logic

  - **Status**: not_started
  - **Complexity**: low
  - **Estimated Duration**: 10-15 min
  - **Description**: Verify that all task properties are parsed correctly from markdown.
  - **Dependencies**: []
  - **Requirements**: [2.1]
  - **Tags**: [test, parsing, validation]

- [ ] 2.2 Test UI Integration
  - **Status**: not_started
  - **Complexity**: medium
  - **Estimated Duration**: 20-25 min
  - **Description**: Verify that parsed tasks display correctly in the tree view and detail panel.
  - **Dependencies**: [2.1]
  - **Requirements**: [2.2]
  - **Tags**: [test, ui, integration]

## Workflow Verification

- [ ] 3.1 End-to-End Test
  - **Status**: not_started
  - **Complexity**: high
  - **Estimated Duration**: 35-45 min
  - **Description**: Complete workflow test from file reading to UI display to task expansion.
  - **Dependencies**: [2.1, 2.2]
  - **Requirements**: [3.1]
  - **Tags**: [test, workflow, e2e]

## How to Use This File

This tasks.md file is designed to test the complete workflow:

1. **File Parsing**: Tests the MarkdownTaskParser's ability to read and parse task definitions
2. **Status Detection**: Includes tasks with different statuses (not_started, in_progress, completed)
3. **Dependency Chains**: Tests dependency resolution and display
4. **UI Integration**: Provides realistic data for testing tree view and detail panel
5. **Workflow Verification**: Enables end-to-end testing of the complete system

## Expected Behavior

When this file is loaded:

- Console should show "tasks.md being read successfully"
- Tree view should display 7 parsed tasks (not mock data)
- Task expansion should work with real parsed data
- Detail panel should show correct task information from file
- No fallback to mock data should occur when this file exists
