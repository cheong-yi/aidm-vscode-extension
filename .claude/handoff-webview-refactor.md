# 🚀 Handoff Prompt: TaskDetailCardProvider Webview Refactor

## 📋 Mission Statement

Refactor the TaskDetailCardProvider god file (3,262 lines) by extracting HTML/CSS/JS into separate webview assets, bundled via webpack, and loaded via VSCode URI APIs. This must work correctly when packaged into .vsix format for distribution.

---

## 🎯 Context & Background

### Current State of Codebase

**Recent Accomplishments (Last Session):**
- ✅ Removed 3,126 lines of dead code (orphaned TaskApiManager chain, RemoteMCPAdapter stub)
- ✅ Implemented complete SSO → Task sync flow
- ✅ Created TaskPersistenceService (TDD) for .aidm/.tasks storage
- ✅ Added repository context detection for API filtering
- ✅ Updated TasksDataService loading priority: .aidm/.tasks → File → MCP → Mock

**Current Architecture:**
```
SSO Login → Fetch Tasks (with repo filter) → Save to .aidm/.tasks/{repo}.json → UI Refresh
```

**Tech Stack:**
- VSCode Extension API 1.80.0+
- TypeScript (strict mode)
- Webpack bundling (not webpack-cli)
- Jest testing
- Node.js 20+
- Git version control

### The Problem: TaskDetailCardProvider God File

**File:** `src/tasks/providers/TaskDetailCardProvider.ts`
**Size:** 3,262 lines
**Structure:**
```typescript
class TaskDetailCardProvider implements vscode.WebviewViewProvider {
  private generateTaskDetailsHTML(task: Task): string {
    return `<!DOCTYPE html>...` // 700+ lines of HTML in template literal
  }

  private generateCSS(): string {
    return `/* 522 lines of CSS */`
  }

  // Inline JavaScript in HTML template (~400 lines)
  // Helper methods (~1,640 lines)
}
```

**Anti-Patterns:**
- CSS/HTML/JS in TypeScript template literals
- No syntax highlighting or autocomplete for CSS/HTML
- Impossible to test UI independently
- Violates Single Responsibility Principle
- Hard to maintain (editing CSS requires editing TypeScript)

---

## ✅ Success Criteria

### Must Achieve:

1. **Separation of Concerns**
   - HTML in `.html` files
   - CSS in `.css` files
   - JavaScript in `.js` files
   - TypeScript provider only coordinates (~150 lines max)

2. **Webpack Bundling**
   - Webview assets bundled separately
   - Single output file per webview
   - Minified and optimized for production
   - **CRITICAL**: Must work when packaged in .vsix file

3. **VSCode URI Loading**
   - Use `webview.asWebviewUri()` for all resources
   - Proper Content Security Policy
   - No inline scripts (security requirement)

4. **Zero Breakage**
   - All existing functionality preserved
   - Tests pass (or updated to match new structure)
   - Webview renders identically to current implementation

5. **Engineering First**
   - No over-engineering
   - No placeholder implementations
   - No god files in refactored code
   - Follow 2024/2025 VSCode extension best practices

---

## 🚨 Critical Concerns & Constraints

### 1. VSIX Packaging Compatibility

**CRITICAL QUESTION:** Will webpack-bundled webview assets load correctly when the extension is packaged as .vsix?

**Requirements:**
- Verify webpack output paths work with VSCode's `extensionPath`
- Test with `vsce package` before considering task complete
- Ensure `asWebviewUri()` resolves correctly in packaged environment
- Document any special webpack configuration needed for .vsix

**Evidence Required:**
- Show successful .vsix packaging
- Demonstrate webview loading in packaged extension
- Prove no 404 errors or missing resources

### 2. Webpack Configuration

**Current Setup:**
- Uses webpack (not webpack-cli)
- Has existing `webpack.config.js` for extension code
- Need separate config for webview assets

**Requirements:**
- Create `webpack.webview.config.js` for webview bundling
- Configure `LimitChunkCountPlugin` for single-file output
- Set target to 'web' (not 'webworker' - webviews run in browser context)
- Ensure output paths align with extension structure

### 3. Content Security Policy

**Security Requirements:**
- No inline scripts (`script-src 'nonce-...'` only)
- No inline styles (`style-src 'nonce-...'` or external CSS only)
- All resources loaded via `webview.asWebviewUri()`

**Implementation:**
```html
<meta http-equiv="Content-Security-Policy"
  content="default-src 'none';
  style-src ${webview.cspSource};
  script-src 'nonce-${nonce}';">
```

### 4. No Breaking Changes

**Protected Functionality:**
- Task detail rendering (header, description, metadata, dependencies)
- Test results display with expandable failures
- Action buttons (status changes, Cursor integration)
- Real-time timestamp updates
- Event emitters (onStatusChanged, onTaskSelected, etc.)

**Test Requirements:**
- All existing tests must pass or be updated (not deleted)
- Add new tests for file loading logic
- Verify webview messaging still works

---

## 📐 Proposed Architecture

### Directory Structure

```
src/tasks/
├── providers/
│   ├── TaskDetailCardProvider.ts       (150 lines - coordinator only)
│   └── TaskWebviewProvider.ts          (existing, unmodified)
├── webview/
│   ├── task-detail/
│   │   ├── index.html                  (HTML template)
│   │   ├── styles.css                  (extracted CSS - 522 lines)
│   │   ├── main.js                     (webview logic)
│   │   └── taskRenderer.js             (rendering helpers)
│   └── webpack.config.js               (webview-specific config)
└── types/
    └── taskTypes.ts                    (existing, unmodified)
```

### Webpack Configuration

**File:** `src/tasks/webview/webpack.config.js`
```javascript
const path = require('path');
const webpack = require('webpack');

module.exports = {
  target: 'web', // Webviews run in browser context
  entry: './src/tasks/webview/task-detail/main.js',
  output: {
    path: path.resolve(__dirname, '../../../dist/webview'),
    filename: 'task-detail.bundle.js',
    publicPath: ''
  },
  mode: 'production',
  devtool: 'source-map',
  plugins: [
    new webpack.optimize.LimitChunkCountPlugin({
      maxChunks: 1 // Single file output for webview
    })
  ]
};
```

### Provider Pattern

**File:** `src/tasks/providers/TaskDetailCardProvider.ts`
```typescript
export class TaskDetailCardProvider implements vscode.WebviewViewProvider {
  private webviewDir: vscode.Uri;

  constructor(private context: vscode.ExtensionContext) {
    this.webviewDir = vscode.Uri.joinPath(
      context.extensionUri,
      'dist',
      'webview'
    );
  }

  resolveWebviewView(webviewView: vscode.WebviewView) {
    webviewView.webview.options = { enableScripts: true };

    // Load HTML template
    const htmlPath = vscode.Uri.joinPath(this.webviewDir, 'task-detail.html');
    const cssUri = webviewView.webview.asWebviewUri(
      vscode.Uri.joinPath(this.webviewDir, 'task-detail.css')
    );
    const scriptUri = webviewView.webview.asWebviewUri(
      vscode.Uri.joinPath(this.webviewDir, 'task-detail.bundle.js')
    );

    // Read and inject URIs
    let html = fs.readFileSync(htmlPath.fsPath, 'utf8');
    html = html.replace('${cssUri}', cssUri.toString());
    html = html.replace('${scriptUri}', scriptUri.toString());

    webviewView.webview.html = html;
  }
}
```

---

## 🔍 Critical Assessment Requirements

Before implementing, you MUST analyze and identify:

### 1. God File Risks
- Is the refactored code creating new god files?
- Are helper functions properly sized (<50 lines each)?
- Is each file <500 lines?

### 2. Over-Engineering Detection
- Are we adding unnecessary abstractions?
- Is the solution minimal and focused?
- Does it solve the problem without adding complexity?

### 3. Placeholder Implementations
- Are there any TODO comments or stub methods?
- Is all code fully implemented and tested?
- No "will implement later" patterns?

### 4. Non-Engineering Approaches
- Are we following proven VSCode patterns?
- Is the webpack config production-ready?
- Have we verified .vsix packaging works?

### 5. Integration Test Gaps
- Can we test the full webview rendering flow?
- Are message passing tests included?
- Do we verify resource loading?

---

## 📝 Implementation Requirements

### Phase 1: Analysis & Planning (30 minutes)

**Tasks:**
1. Read current TaskDetailCardProvider.ts in full
2. Identify all methods and their responsibilities
3. Map CSS classes to HTML structure
4. Document all event emitters and message handlers
5. Create atomic task breakdown
6. Identify potential risks and mitigation strategies

**Deliverables:**
- Detailed task list with dependencies
- Risk assessment document
- Test strategy

### Phase 2: Extraction (2 hours)

**Tasks:**
1. Extract CSS from `generateCSS()` to `styles.css`
2. Extract HTML from `generateTaskDetailsHTML()` to `index.html`
3. Extract inline JavaScript to `main.js`
4. Create helper module `taskRenderer.js` for rendering logic
5. Update provider to load from files

**Atomic Task Breakdown Example:**
```
EXTRACT-001: Extract CSS to styles.css (30 min)
  - Copy generateCSS() content to new file
  - Format and organize CSS
  - Add comments for sections
  - Verify no missing styles

EXTRACT-002: Extract HTML to index.html (30 min)
  - Copy HTML structure from template
  - Replace template variable placeholders with ${} syntax
  - Add proper DOCTYPE and meta tags
  - Verify structure matches original

[etc...]
```

### Phase 3: Webpack Integration (1 hour)

**Tasks:**
1. Create webpack.config.js for webview
2. Add build scripts to package.json
3. Test bundling output
4. Verify source maps work

### Phase 4: Provider Refactor (1 hour)

**Tasks:**
1. Refactor provider to load external files
2. Implement URI conversion via asWebviewUri()
3. Update message handlers
4. Add error handling for file loading

### Phase 5: Testing (1 hour)

**Tasks:**
1. Update existing tests for new structure
2. Add integration tests for webview loading
3. Test .vsix packaging
4. Verify all functionality works

### Phase 6: Verification (30 minutes)

**Tasks:**
1. Run full test suite
2. Manual testing of webview
3. Create .vsix and test in fresh VSCode
4. Document any configuration changes

---

## 🧪 Test Requirements

### Unit Tests Required:

1. **File Loading Tests**
   ```typescript
   it('should load HTML template from dist/webview', async () => {
     // Verify file exists and loads correctly
   });

   it('should convert URIs using asWebviewUri', () => {
     // Verify URI conversion works
   });
   ```

2. **Message Passing Tests**
   ```typescript
   it('should handle status change messages from webview', () => {
     // Verify webview → provider communication
   });

   it('should send task data to webview on load', () => {
     // Verify provider → webview communication
   });
   ```

3. **Rendering Tests**
   ```typescript
   it('should render task details with correct structure', () => {
     // Verify HTML structure matches expected
   });
   ```

### Integration Tests Required:

1. **Full Webview Flow**
   ```typescript
   it('should load webview, display task, and handle interactions', async () => {
     // End-to-end webview test
   });
   ```

2. **VSIX Packaging Test**
   ```bash
   # Manual test script
   npm run package
   code --install-extension aidm-vscode-extension-*.vsix
   # Verify webview loads in fresh VSCode
   ```

---

## 🚦 Execution Guidelines

### Task Executor Instructions:

1. **Work in Parallel Where Possible**
   - CSS extraction is independent of HTML extraction
   - Webpack config can be developed alongside extraction
   - Tests can be written in parallel with implementation

2. **Follow TDD Approach**
   - Write failing tests first (Red)
   - Implement minimal code to pass (Green)
   - Refactor for quality (Refactor)

3. **Atomic Tasks Only**
   - Each task should be 15-30 minutes max
   - Clear success criteria for each task
   - Single responsibility per task

4. **No Over-Engineering**
   - Use existing VSCode patterns
   - Don't create unnecessary abstractions
   - Keep it simple and maintainable

5. **Immediate Issue Reporting**
   - If stuck for >5 minutes, report immediately
   - Include error messages and context
   - Request root cause analysis

### Root Cause Analysis Protocol:

When issues occur:

1. **Capture Context**
   - What were you trying to do?
   - What command/code was executed?
   - What was the expected result?
   - What actually happened?

2. **Analyze Root Cause**
   - Is this a webpack configuration issue?
   - Is this a VSCode API limitation?
   - Is this a file path resolution issue?
   - Is this a .vsix packaging issue?

3. **Implement Surgical Fix**
   - Fix only the specific issue
   - Don't introduce new functionality
   - Verify fix with test
   - Document the solution

4. **Prevent Recurrence**
   - Add test to catch this in future
   - Update documentation if needed
   - Share learnings with team

---

## 📚 Reference Materials

### Official VSCode Documentation:
- Webview API: https://code.visualstudio.com/api/extension-guides/webview
- Webview UX Guidelines: https://code.visualstudio.com/api/ux-guidelines/webviews
- Extension Packaging: https://code.visualstudio.com/api/working-with-extensions/publishing-extension

### Key Files to Review:
- `/mnt/c/repos/aidm-vscode-extension/src/tasks/providers/TaskDetailCardProvider.ts` (god file)
- `/mnt/c/repos/aidm-vscode-extension/webpack.config.js` (existing webpack setup)
- `/mnt/c/repos/aidm-vscode-extension/package.json` (build scripts)
- `/mnt/c/repos/aidm-vscode-extension/CLAUDE.md` (project guidelines)

### Recent Commits (for context):
```bash
git log --oneline -7
# 4435f68 feat(sso-integration): complete SSO to task sync flow
# 93e4d8a feat(api): add repository context detection
# 53bc064 feat(persistence): add TaskPersistenceService with TDD
# 1f7e92e cleanup(architecture): remove orphaned code
```

---

## ✅ Acceptance Criteria (Definition of Done)

### Code Quality:
- [ ] TaskDetailCardProvider.ts is <200 lines
- [ ] No template literals for HTML/CSS/JS
- [ ] All CSS in .css file with proper syntax highlighting
- [ ] All HTML in .html file with proper structure
- [ ] All JavaScript in .js files

### Functionality:
- [ ] Webview renders identically to original
- [ ] All task details display correctly
- [ ] Action buttons work (status changes, etc.)
- [ ] Event emitters fire correctly
- [ ] Timestamp updates work

### Testing:
- [ ] All existing tests pass or are updated
- [ ] New tests for file loading added
- [ ] Integration tests for webview flow added
- [ ] Manual testing completed

### Packaging:
- [ ] Extension builds without errors
- [ ] Webpack bundles webview assets
- [ ] .vsix package created successfully
- [ ] Webview loads correctly in packaged extension
- [ ] No 404 errors or missing resources

### Documentation:
- [ ] README updated if needed
- [ ] Comments explain webpack configuration
- [ ] Build process documented in CLAUDE.md
- [ ] Migration guide for team (if applicable)

---

## 🎯 Your Tasks (AI Assistant)

1. **Read and Analyze**
   - Review the complete TaskDetailCardProvider.ts file
   - Understand current structure and dependencies
   - Identify all methods that need refactoring

2. **Critical Assessment**
   - Identify potential god file risks in proposed architecture
   - Check for over-engineering in the plan above
   - Look for missing integration test scenarios
   - Verify webpack configuration will work with .vsix

3. **Create Implementation Plan**
   - Break down into atomic tasks (15-30 min each)
   - Identify dependencies between tasks
   - Determine which tasks can run in parallel
   - Estimate total time

4. **Review for Gaps**
   - Are there any missing steps?
   - Have we considered all edge cases?
   - Is the test coverage sufficient?
   - Will this actually work when packaged?

5. **Execute with Task Executors**
   - Launch task executor agents in parallel
   - Monitor progress and handle issues
   - Perform root cause analysis if problems occur
   - Implement surgical fixes as needed

6. **Verify Success**
   - Run full test suite
   - Build .vsix package
   - Test in fresh VSCode instance
   - Confirm all acceptance criteria met

---

## 🚨 CRITICAL: .vsix Packaging Verification

**BEFORE** marking any task complete, you MUST:

1. Run `vsce package` (or npm script equivalent)
2. Install the .vsix in a clean VSCode instance
3. Open the webview and verify it renders
4. Check browser console for errors
5. Confirm all assets load correctly

**If packaging fails or webview doesn't load:**
- STOP immediately
- Perform root cause analysis
- Fix the webpack/URI configuration issue
- Re-verify packaging

**Do not proceed** until .vsix packaging works correctly.

---

## 🤝 Success Definition

This refactor is successful when:

1. ✅ God file reduced from 3,262 lines to <200 lines
2. ✅ HTML/CSS/JS in separate, maintainable files
3. ✅ Webpack bundles assets correctly
4. ✅ .vsix package installs and works perfectly
5. ✅ All tests pass
6. ✅ No functionality lost
7. ✅ Code follows 2024/2025 VSCode best practices
8. ✅ No over-engineering or god files created
9. ✅ Full integration test coverage
10. ✅ Team can edit CSS/HTML without touching TypeScript

---

## 📞 Handoff Complete

This document contains everything needed to execute the TaskDetailCardProvider refactor successfully.

**Start by:**
1. Reading this entire document thoroughly
2. Reviewing TaskDetailCardProvider.ts
3. Performing critical assessment of the proposed approach
4. Creating detailed atomic task breakdown
5. Launching parallel task executors

**Remember:**
- Engineering first, no shortcuts
- TDD approach (Red-Green-Refactor)
- .vsix packaging MUST work
- No god files in the output
- Surgical fixes for issues

Good luck! 🚀
