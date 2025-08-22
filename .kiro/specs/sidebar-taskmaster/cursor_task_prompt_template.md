# Task Implementation Prompt Template

Use this template when generating prompts for Cursor AI to ensure consistency and completeness.

## Standard Prompt Format

```markdown
# Task Implementation: [Task Title]

## Context
You are implementing a VSCode extension component for the Sidebar Taskmaster Dashboard. This task implements [specific functionality] matching the expandable list mockup design.

## Mockup Reference
Reference taskmaster_mockup.html lines [X-Y]:
- Specific CSS classes: [.task-item, .task-header, etc.]
- HTML structure: [div containers, button elements, etc.]  
- Visual behavior: [expansion, styling, interactions]

## Task Description
- **ID**: [Task ID]
- **Title**: [Task Title]
- **Complexity**: [Low/Medium/High]  
- **Dependencies**: [Completed task IDs]
- **Duration**: 15-20 minutes

## Enhanced Data Requirements
Must implement with enhanced Task interface:
```typescript
// Provide exact interface snippet relevant to this task
interface TaskEnhanced {
  // ... specific fields needed for this task
  estimatedDuration?: string; // "15-30 min"
  isExecutable?: boolean; // For Cursor integration
  testStatus?: TestStatus; // Enhanced with FailingTest[]
}
```

## Expected Input/Output Examples
```typescript
// Input example:
const inputTask = {
  id: "3.1.2",
  title: "Add TaskTreeItem status indicator property",
  status: "not_started",
  isExecutable: true,
  estimatedDuration: "15-20 min"
};

// Expected output:
const expectedResult = {
  // ... specific expected results
};
```

## Implementation Details
### Required Changes
1. [Specific implementation step]
2. [Another specific step]
3. [etc.]

### Integration Points
- [How this connects to existing code]
- [Which services/components to use]

## Acceptance Criteria
- [ ] [Specific testable requirement]
- [ ] [Another requirement]
- [ ] UI matches mockup exactly (reference specific elements)
- [ ] Enhanced data structure compliance
- [ ] Error handling for [specific scenarios]

## Testing Requirements
Write focused unit tests for:
- [Specific test case 1]
- [Specific test case 2]
- Error scenarios: [specific error conditions]
- Mockup compliance: [UI validation tests]

## Validation Checklist
Before completing, verify:
- [ ] Visual output matches mockup HTML/CSS exactly
- [ ] Enhanced data fields are properly implemented
- [ ] TimeFormattingUtility used for all timestamps
- [ ] Executable task indicators work correctly (blue border + 🤖)
- [ ] Status actions map correctly to task state
- [ ] Error categorization follows FailingTest.category enum

## Files to Modify
- `[exact file path]` - [what changes to make]
- `[test file path]` - [what tests to add]

## Implementation Notes
- [Specific technical considerations]
- [Gotchas or edge cases to watch for]
- [Performance considerations]

**Commit Message**: `feat: implement [specific functionality] matching mockup design`
```

## Usage Instructions

1. Copy this template for each atomic task
2. Fill in all bracketed placeholders with specific information
3. Reference exact mockup elements and line numbers  
4. Provide concrete data examples, not abstract interfaces
5. Include specific validation steps
6. Always reference the enhanced data structures from design.md