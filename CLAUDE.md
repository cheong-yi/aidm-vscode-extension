# AI Agent Behavior Rules & Best Practices

## Core Development Principles

### Task Execution Protocol
When asked to execute any task with an ID (e.g., REF-XXX, TASK-001):
1. Look up the task in the corresponding `*_tasks.json` file
2. Retrieve the detailed prompt from `*_tasks_prompts.json["TASK-ID"].promptContent`
3. Use the promptContent as the implementation guide

### Single Responsibility Focus
- **ONE task at a time**: Never expand scope beyond the current atomic task
- **Maximum 3 files** modified per task (primary, secondary, test)
- **15-20 minute duration**: If taking longer, break it down further
- **Binary success criteria**: Task either passes or fails completely

### Test-Driven Development (TDD) Enforcement
- **Always follow Red-Green-Refactor cycle**
- **Write tests first** (Red phase) before implementation
- **Minimal implementation** (Green phase) to pass the test
- **Clean up code** (Refactor phase) without changing behavior
- **Run tests before and after** every task completion

#### TDD for Extraction Refactoring
When extracting code to new classes/methods during refactoring:
- **Overall task** = Refactor phase (moving responsibility)
- **New classes/methods** = Start at Red phase (write failing tests first)
- **Rule**: Any new public interface needs its own Red-Green cycle, regardless of refactoring context

### Quality Gates & Validation
- **Compile check**: TypeScript must compile without errors
- **Test validation**: All tests must pass before proceeding
- **No regression**: Existing functionality must remain intact
- **Preserve core features**: Never break git diff, dashboard rendering, or VSCode integration

## Atomic Task Template Compliance

### Mandatory Template Structure
ALWAYS use the exact atomic task template format:
- Single-Concern Focus section
- Context Files (maximum 2)
- Task Scope with clear ID and responsibility
- TDD Cycle Position (Red/Green/Refactor)
- Prerequisites Verified checklist
- Implementation Specification with exact method signatures
- Success Criteria (binary pass/fail)
- File Changes (maximum 3 files)

### Template Validation Rules
- **Never include** design.md, mockup.html, and implementation files simultaneously
- **Always specify** exact method signatures and test cases
- **Document prerequisites** before starting implementation
- **Include rollback strategy** if task fails
- **Log discovered issues** without fixing them (separate tasks)

## Git & Version Control Behavior

### Automatic Commit Protocol
After each successful task completion, commit with this exact format:
```bash
[type](scope): [what changed] - [why] - [Task ID]

Examples:
refactor(webview): extract data service from TaskWebviewProvider - improve maintainability - REF-001
fix(parser): consolidate to JSON-only parser - remove complexity - REF-004
cleanup(demo): remove DEMO_MODE flags from extension.ts - separate concerns - REF-006
```

**IMPORTANT**: Do NOT add co-author information or Claude references to commit messages.

### MANDATORY: Context Anchoring for Commits
**Before executing ANY git commit command, I MUST:**

1. **Quote the exact format from CLAUDE.md:**
   ```
   Format: [type](scope): [what changed] - [why] - [Task ID]
   Rule: Do NOT add co-author information or Claude references
   ```

2. **Show my specific commit message:**
   ```
   My commit: [show exact message I plan to use]
   ```

3. **Confirm compliance:**
   ```
   ✓ Matches format: [type](scope): [what] - [why] - [ID]
   ✓ No co-author information
   ✓ No Claude references
   ✓ No extra metadata
   ```

4. **Only then execute the git commit command**

**This prevents hallucination by forcing explicit reference to project rules before committing.**

### Task JSON Update Protocol
**After successful task completion and BEFORE committing, update the task JSON file:**

1. **Update task status**:
   ```json
   "status": "completed"
   ```

2. **Update implementation object** with actual values:
   ```json
   "implementation": {
     "commitHash": "[pending - will be updated after commit]",
     "summary": "[Brief description of what was changed]",
     "filesChanged": ["file1.ts", "file2.ts"],
     "completedDate": "[ISO timestamp]",
     "diffAvailable": true
   }
   ```

3. **Update testStatus** if tests were run:
   ```json
   "testStatus": {
     "lastRunDate": "[ISO timestamp]",
     "totalTests": [number],
     "passedTests": [number],
     "failedTests": [number],
     "executionTime": [milliseconds],
     "failingTestsList": []
   }
   ```

4. **Save the JSON file** before committing code changes

5. **After successful git commit**, update implementation.commitHash using full SHA:
   ```bash
   git rev-parse HEAD  # Get full 40-character commit hash
   ```
   ```json
   "implementation": {
     "commitHash": "[full 40-character git commit SHA from git rev-parse HEAD]",
     ...
   }
   ```

**Workflow order:**
1. Complete implementation and validate all tests pass
2. Update task JSON with status, implementation, and testStatus
3. Save JSON file
4. Commit code changes with proper format
5. Update task JSON with actual commit SHA
6. Save JSON file again

### Commit Types
- **refactor**: Code restructuring without behavior change
- **fix**: Bug fixes or corrections
- **cleanup**: Removing unused code or simplifying
- **extract**: Splitting large files/classes into smaller ones
- **consolidate**: Combining similar functionality

### Git Best Practices
- **Commit only on success**: Never commit partial or broken implementations
- **One task per commit**: Each atomic task gets exactly one commit
- **Include affected files**: List main files changed in commit description
- **Keep commits small**: Easier to review and rollback if needed
- **Use full commit hash**: Always use `git rev-parse HEAD` for the complete 40-character SHA, not the short version

## Error Handling & Recovery

### Validation Failure Protocol
If any validation step fails:
1. **Stop immediately** - do not proceed to next step
2. **Log the specific error** with file and line number
3. **Rollback changes** using `git checkout HEAD -- [files]`
4. **Report issue** in DISCOVERED ISSUES LOG format
5. **Skip to next task** or request help

### Common Failure Scenarios
- **TypeScript compilation errors**: Fix syntax before proceeding
- **Test failures**: Verify test logic and implementation match
- **Import/dependency errors**: Check file paths and exports
- **Regression issues**: Rollback and analyze impact

### Issue Discovery Protocol
When encountering issues outside current task scope:
```markdown
### DISCOVERED ISSUES LOG
- Issue: [Brief description]
- Location: [File:method/line]
- Impact: [BLOCKING/HIGH/MEDIUM/LOW]
- Root Cause: [Quick analysis]
- Suggested Fix: [One-line description]
- Action: LOG ONLY - Do not fix in current task
```

## Context Management & Efficiency

### Context Group Awareness
Work on tasks within the same context group before switching:
- **webview-related**: TaskWebviewProvider.ts and UI components
- **parser-cleanup**: MarkdownTaskParser, JSONTaskParser consolidation  
- **demo-removal**: extension.ts, models/*, ml/* demo code extraction
- **process-management**: ProcessManager.ts, SimpleMCPServer.ts simplification
- **utilities-consolidation**: ErrorHandler, DegradedModeManager, logger cleanup

### Mental Context Preservation
- **Complete context groups** before switching to different areas
- **Maintain file knowledge** when working on related components
- **Document cross-references** when extracting or splitting code
- **Preserve established patterns** within the same codebase area

## Code Quality Standards

### TypeScript Best Practices
- **Strict type checking**: No `any` types without explicit justification
- **Interface compliance**: Implement against defined interfaces
- **Proper error typing**: Use union types for error handling
- **Consistent naming**: Follow existing codebase conventions
- **JSDoc documentation**: For public methods and complex logic

### Testing Standards
- **Arrange-Act-Assert pattern**: Clear test structure
- **Descriptive test names**: `should [behavior] when [condition]`
- **Mock external dependencies**: Isolate units under test
- **Test edge cases**: Error conditions and boundary values
- **Cleanup after tests**: No side effects between tests

### Refactoring Guidelines
- **Extract method**: When functions exceed 20 lines
- **Single responsibility**: Each class/method has one clear purpose
- **DRY principle**: Eliminate code duplication
- **Clear naming**: Methods and variables express intent
- **Minimize dependencies**: Reduce coupling between components

## Performance & Monitoring

### Performance Constraints
- **Task duration**: Maximum 20 minutes per atomic task
- **File size limits**: Keep files under 500 lines when possible
- **Memory usage**: Avoid loading large objects unnecessarily
- **Compilation time**: Changes should not significantly slow builds

### Progress Monitoring
- **Track task completion**: Update task status after validation
- **Monitor test execution time**: Flag slow-running tests
- **Check TypeScript compilation**: Ensure fast feedback loops
- **Validate working features**: Smoke test core functionality

## Communication & Documentation

### Status Reporting
- **Clear task boundaries**: What was changed and why
- **Impact assessment**: How changes affect other components
- **Risk evaluation**: What could break and mitigation strategies
- **Next steps**: Dependencies for subsequent tasks

### Documentation Updates
- **README changes**: Remove references to deleted features
- **Comment updates**: Reflect new responsibilities after refactoring
- **Interface documentation**: Keep contracts up to date
- **Architecture notes**: Document significant structural changes

## Emergency Protocols

### When Tasks Fail Repeatedly
1. **Stop the workflow** after 3 consecutive failures
2. **Analyze the pattern** - is the task too large?
3. **Break down further** or seek human guidance
4. **Document blockers** for later analysis
5. **Switch context** to unblocked tasks

### When Core Features Break
1. **Immediate rollback** to last working state
2. **Preserve git diff functionality** at all costs
3. **Maintain dashboard rendering** as highest priority
4. **Document regression** for emergency fix
5. **Alert human operator** for critical path issues

### Recovery Strategies
- **Git bisect**: Find the breaking change
- **Incremental rollback**: Undo changes step by step
- **Feature flags**: Temporarily disable broken features
- **Fallback implementation**: Use simpler but working version
- **Emergency branch**: Create hotfix for critical issues

## Success Metrics

### Task-Level Success
- ✅ All tests pass
- ✅ TypeScript compiles without errors
- ✅ No existing functionality broken
- ✅ Single responsibility implemented
- ✅ Clean commit with proper message

### Sprint-Level Success
- ✅ Core functionality preserved (git diff, dashboard)
- ✅ Significant complexity reduction (file sizes, responsibilities)
- ✅ Improved maintainability (clear separation of concerns)
- ✅ No technical debt increase
- ✅ Foundation for future improvements

### Quality Indicators
- **Reduced file sizes**: Large files (1000+ lines) split appropriately
- **Clear responsibilities**: Each class/method has single purpose
- **Improved testability**: Code is easier to unit test
- **Better error handling**: Consistent error management patterns
- **Documentation alignment**: Code matches documented behavior

---

## Quick Reference Checklist

Before starting any task:
- [ ] Atomic task template loaded and understood
- [ ] Context group identified for efficient switching
- [ ] Prerequisites verified (compilation, tests, dependencies)
- [ ] TDD cycle position determined (Red/Green/Refactor)

During task execution:
- [ ] Following exact template structure
- [ ] Modifying maximum 3 files
- [ ] Implementing single responsibility only
- [ ] Running tests continuously

After task completion:
- [ ] All validation steps passed
- [ ] Commit created with proper format
- [ ] Task status updated
- [ ] Issues logged (not fixed) for future tasks
- [ ] Ready for next task in context group

---

## Project-Specific Information

### Project Overview

AiDM VSCode Extension - An enterprise-focused VSCode extension that bridges business requirements and code implementation through AI-powered context using Model Context Protocol (MCP).

### Development Commands

#### Build & Development
```bash
npm run compile      # Build with webpack
npm run watch        # Watch mode for development
npm run compile-tsc  # TypeScript compilation check
```

#### Testing & Validation
```bash
npm test                     # Run Jest tests
npm run lint                # ESLint check for TypeScript files
npm run validate-manifest    # Validate extension manifest
npm run test:packaging      # Test packaging process
```

#### Packaging & Deployment
```bash
npm run package     # Create VSIX package using package-extension.js
```

### Architecture Overview

#### Strict Layer Separation
The codebase follows strict architectural boundaries:
- `providers/` ↔ `services/` ↔ `server/` ↔ `mock/`
- **NO** VS Code API usage outside of `extension.ts`, `providers/`, and `ui/`
- **NO** server imports in providers
- Use dependency injection pattern throughout

#### Core Components

1. **MCP Server** (`src/server/`)
   - `SimpleMCPServer.ts`: HTTP JSON-RPC server on port 3000-3001
   - Provides business context to AI assistants like RooCode
   - Handles context retrieval and caching

2. **Extension Entry** (`src/extension.ts`)
   - Main activation point (~600 lines)
   - Manages server lifecycle and provider registration
   - Handles all VSCode API interactions

3. **Providers** (`src/providers/`)
   - `hoverProvider.ts`: Shows business requirements on hover
   - Strictly uses VSCode APIs only

4. **Services** (`src/services/`)
   - `TasksDataService.ts`: Task management from JSON files
   - `MarkdownTaskParser.ts`: Parses markdown task descriptions
   - `CacheManager.ts`: TTL-based response caching
   - Stateless business logic layer

5. **Task Management** (`src/tasks/`)
   - Webview-based task list UI
   - Supports task filtering, status updates, and AI prompt generation
   - Reads from configurable JSON file (default: `tasks.json`)

### Key Technical Details

- **TypeScript**: Target ES2020, strict mode, CommonJS modules
- **Bundling**: Webpack with ts-loader
- **Testing**: Jest with ts-jest
- **Extension Host**: Node.js context
- **VS Code API**: Minimum version 1.80.0
- **Node.js**: Requires >=20.0.0

### Important Patterns

1. **Error Handling**: Use centralized `ErrorHandler.ts` for all error scenarios
2. **Logging**: Structured logging via `utils/logger.ts`
3. **Mock Data**: Extensive mock enterprise data in `src/mock/` for demos
4. **Port Management**: Smart port selection (3000-3001) to avoid conflicts
5. **Degraded Mode**: Graceful fallback when MCP server is unavailable

### Testing Approach

- Unit tests in `src/__tests__/`
- Mock VSCode APIs for provider testing
- Service layer tests should be pure function tests
- Use Jest configuration in `jest.config.js`

### Common Development Tasks

#### Adding a New Command
1. Define in `package.json` under `contributes.commands`
2. Register in `extension.ts` activation
3. Add handler implementation

#### Modifying Task Structure
1. Update types in `src/types/tasks.ts`
2. Modify `TasksDataService.ts` for data handling
3. Update webview in `src/tasks/TasksWebviewProvider.ts`

#### Adding MCP Tools
1. Define tool in `SimpleMCPServer.ts`
2. Add business logic in appropriate service
3. Update mock data if needed

### Security & Compliance

- Audit logging in `src/security/AuditLogger.ts`
- No secrets in code - use VS Code secrets API
- All external requests through configured clients

---

*Remember: The goal is working, maintainable software delivered incrementally. Perfect code is less important than consistent progress and preserved functionality.*