# Task Implementation Prompt Template

Use this template when generating prompts for Cursor AI to ensure consistency and completeness.

## Standard Prompt Format

````markdown
# Task Implementation: [Task Title]

## Context Files to Include

Add only the minimal files needed for this specific task:

### For UI Component Tasks (TreeView, DetailCard):

- `taskmaster_mockup.html` - UI reference
- `design.md` (interfaces section only) - Type definitions
- Related existing component file (if extending)

### For Data Service Tasks (TasksDataService, Parser):

- `design.md` (data models section) - Interface definitions
- Existing service file being modified
- Related test file for patterns

### For Integration Tasks (MCP, Commands):

- `design.md` (architecture section) - Integration patterns
- `package.json` (if adding commands/contributions)
- Existing integration file being modified

### For Test Tasks:

- File being tested
- Existing test file for patterns
- `design.md` (specific interface being tested)

**Context Selection Rule**: Include maximum 3-4 files to avoid context window overload

## Context

You are implementing a VSCode extension component for the Sidebar Taskmaster Dashboard. This task implements [specific functionality] matching the expandable list mockup design.

**Project State**: [Brief description of what's already implemented and working]

**Integration Requirements**: This task must integrate with [specific existing components/services]

## Mockup Reference

Reference taskmaster_mockup.html lines [X-Y]:

- Specific CSS classes: [.task-item, .task-header, etc.]
- HTML structure: [div containers, button elements, etc.]
- Visual behavior: [expansion, styling, interactions]
- Interactive elements: [buttons, dropdowns, collapsible sections]

## Task Description

- **ID**: [Task ID]
- **Title**: [Task Title]
- **Complexity**: [Low/Medium/High]
- **Dependencies**: [Completed task IDs]
- **Duration**: 15-30 minutes
- **Requirements Mapping**: [Specific requirement numbers this addresses]

## Enhanced Data Requirements

Must implement with enhanced Task interface:

```typescript
// Provide exact interface snippet relevant to this task
interface TaskEnhanced {
  // ... specific fields needed for this task
  estimatedDuration?: string; // "15-30 min"
  isExecutable?: boolean; // For Cursor integration
  testStatus?: TestStatus; // Enhanced with FailingTest[]
  statusDisplayName?: string; // From STATUS_DISPLAY_NAMES mapping
}
```
````

## Expected Input/Output Examples

```typescript
// Input example:
const inputTask = {
  id: "3.1.2",
  title: "Add TaskTreeItem status indicator property",
  status: "not_started",
  isExecutable: true,
  estimatedDuration: "15-20 min",
};

// Expected output:
const expectedResult = {
  // ... specific expected results with actual values
};

// Error scenarios:
const errorCase = {
  // ... specific error conditions and expected handling
};
```

## Implementation Details

### Primary Implementation Steps

1. [Specific implementation step with method/class names]
2. [Another specific step with exact code patterns]
3. [Integration step with existing services]

### Code Patterns to Follow

- [Existing patterns from similar components]
- [Error handling patterns from project]
- [Event emission patterns]

### Integration Points

- [How this connects to existing code with specific method calls]
- [Which services/components to use and how]
- [Event listeners to add/modify]

## Acceptance Criteria

- [ ] [Specific testable requirement with measurable outcome]
- [ ] [Another requirement with validation method]
- [ ] UI matches mockup exactly (reference specific mockup elements)
- [ ] Enhanced data structure compliance verified
- [ ] Error handling covers [specific error scenarios]
- [ ] Performance meets [specific benchmarks if applicable]

## Testing Requirements

Write focused unit tests for:

- [ ] [Specific test case 1 with expected assertions]
- [ ] [Specific test case 2 with mock data]
- [ ] Error scenarios: [specific error conditions and expected responses]
- [ ] Mockup compliance: [UI validation tests with specific checks]
- [ ] Integration: [Tests for service communication]

### Test Data Requirements

- Use mock data patterns from [existing test files]
- Include edge cases: [specific edge cases relevant to this task]
- Test with enhanced data fields populated

## Validation Checklist

Before completing, verify:

- [ ] Visual output matches mockup HTML/CSS exactly
- [ ] Enhanced data fields are properly implemented and tested
- [ ] TimeFormattingUtility used for all timestamps (if applicable)
- [ ] Executable task indicators work correctly (blue border + 🤖)
- [ ] Status actions map correctly to task state
- [ ] Error categorization follows project patterns
- [ ] Event emission works for UI synchronization
- [ ] Resource cleanup implemented (if applicable)

## Files to Modify

- `[exact file path]` - [what changes to make with specific method names]
- `[test file path]` - [what tests to add with test names]
- `[config file]` - [configuration changes needed]

## Integration Verification

After implementation, test these integration points:

- [ ] [Component A] → [Component B] communication
- [ ] Event flow: [specific event chain]
- [ ] Data consistency: [specific data synchronization]

## Performance Considerations

- [Specific performance targets if applicable]
- [Memory usage considerations]
- [Rendering optimization requirements]

## Implementation Notes

- [Specific technical considerations or gotchas]
- [Edge cases to handle carefully]
- [Dependencies on external services]
- [Backward compatibility requirements]

## Error Scenarios to Handle

1. [Specific error condition] → [Expected behavior]
2. [Another error condition] → [Expected fallback]
3. [Network/service failure] → [Graceful degradation]

**Commit Message**: `feat(taskmaster): implement [specific functionality] matching mockup design`

```

## Usage Instructions

### Before Starting Implementation
1. Copy this template for each atomic task
2. Add all Context Files listed above to your AI conversation
3. Fill in all bracketed placeholders with specific information from your project files
4. Reference exact mockup elements and line numbers from taskmaster_mockup.html
5. Cross-reference requirements.md for acceptance criteria
6. Check tasks.md for dependencies and related work

### During Implementation
1. Provide concrete data examples, not abstract interfaces
2. Include specific validation steps with measurable outcomes
3. Always reference the enhanced data structures from design.md
4. Follow existing code patterns from context files
5. Test integration points as you implement

### Quality Assurance
1. Verify all acceptance criteria are testable
2. Ensure error scenarios have specific handling instructions
3. Confirm UI mockup references are accurate
4. Validate that integration points are clearly defined
5. Check that testing requirements are comprehensive

This template ensures comprehensive context, specific implementation guidance, and thorough validation for successful AI-assisted development.
```
