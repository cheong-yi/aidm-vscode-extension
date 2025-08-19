# Troubleshooting: Command Not Found Issues

## Root Cause Analysis

The error "command 'enterprise-ai-context.openConfiguration' not found" indicates the extension isn't activating properly. Here are the most likely causes and solutions:

## Diagnostic Steps

### Step 1: Check Extension Installation

1. **Open VS Code Extensions panel** (`Ctrl+Shift+X`)
2. **Search for "Enterprise AI Context"**
3. **Verify it's installed and enabled**

If not installed:

```bash
# Install from local package
npm run package
code --install-extension enterprise-ai-context-0.1.0.vsix
```

### Step 2: Check VS Code Output Panel

1. **Open Output panel** (`Ctrl+Shift+U` or View → Output)
2. **Select "Enterprise AI Context" from dropdown**
3. **Look for activation errors**

Expected output:

```
Enterprise AI Context extension is now active!
MCP server started successfully
Enterprise AI Context extension activated successfully
```

### Step 3: Force Extension Activation

1. **Open a TypeScript file** (creates a `.ts` file if needed)
2. **Check if extension activates** (look for status bar indicator)
3. **Try Command Palette again**

### Step 4: Check Developer Console

1. **Open Developer Tools** (`Help → Toggle Developer Tools`)
2. **Check Console tab for errors**
3. **Look for extension loading errors**

## Common Issues and Fixes

### Issue 1: Extension Not Loading

**Symptoms**: No commands available, no status bar indicator
**Cause**: Extension failed to activate
**Fix**:

```bash
# Reload VS Code window
Ctrl+Shift+P → "Developer: Reload Window"

# Or restart VS Code completely
```

### Issue 2: TypeScript Compilation Errors

**Symptoms**: Extension loads but commands fail
**Cause**: TypeScript compilation issues
**Fix**:

```bash
# Clean and rebuild
npm run clean
npm run compile

# Check for errors
npm run lint
```

### Issue 3: Missing Dependencies

**Symptoms**: Runtime errors in output panel
**Cause**: Missing node modules
**Fix**:

```bash
# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install
npm run compile
```

### Issue 4: VS Code Version Compatibility

**Symptoms**: Extension doesn't load at all
**Cause**: VS Code version too old
**Fix**: Update VS Code to version 1.80.0 or higher

## Quick Fix Script

Create a simple test to verify the extension works:

1. **Create test file**: `test.ts`

```typescript
// Simple TypeScript file to trigger extension activation
export class TestClass {
  testMethod() {
    return "test";
  }
}
```

2. **Open the file in VS Code**
3. **Wait 5 seconds for activation**
4. **Try Command Palette** → "Enterprise AI Context"

## Manual Extension Registration

If the extension still doesn't work, try this minimal test:

1. **Open VS Code Developer Console** (`Help → Toggle Developer Tools`)
2. **Run this command**:

```javascript
// Check if extension is loaded
vscode.extensions.getExtension("enterprise-ai-context.enterprise-ai-context");

// List all available commands
vscode.commands.getCommands().then((commands) => {
  console.log(commands.filter((cmd) => cmd.includes("enterprise-ai-context")));
});
```

## Alternative Installation Method

If the extension won't load normally:

1. **Development Mode**:

```bash
# Open in development mode
code --extensionDevelopmentPath=.
```

2. **Manual Installation**:

```bash
# Copy to extensions folder (Windows)
cp -r . %USERPROFILE%\.vscode\extensions\enterprise-ai-context-0.1.0\

# Copy to extensions folder (Mac/Linux)
cp -r . ~/.vscode/extensions/enterprise-ai-context-0.1.0/
```

## Debug Extension Activation

Add this to the beginning of `src/extension.ts` activate function:

```typescript
export async function activate(
  context: vscode.ExtensionContext
): Promise<void> {
  // Add debug logging
  console.log("🚀 ACTIVATION STARTED");
  vscode.window.showInformationMessage("🚀 Extension activation started!");

  try {
    // ... rest of activation code

    // Add success logging
    console.log("✅ ACTIVATION COMPLETED");
    vscode.window.showInformationMessage(
      "✅ Extension activated successfully!"
    );
  } catch (error) {
    console.error("❌ ACTIVATION FAILED:", error);
    vscode.window.showErrorMessage(`❌ Activation failed: ${error}`);
    throw error;
  }
}
```

## Minimal Working Extension

If all else fails, create a minimal test extension:

```typescript
// minimal-extension.ts
import * as vscode from "vscode";

export function activate(context: vscode.ExtensionContext) {
  console.log("Minimal extension activated");

  const testCommand = vscode.commands.registerCommand("test.hello", () => {
    vscode.window.showInformationMessage("Hello from test extension!");
  });

  context.subscriptions.push(testCommand);
}
```

```json
// minimal package.json
{
  "name": "test-extension",
  "version": "0.0.1",
  "engines": { "vscode": "^1.80.0" },
  "main": "./out/minimal-extension.js",
  "contributes": {
    "commands": [
      {
        "command": "test.hello",
        "title": "Test Hello"
      }
    ]
  }
}
```

## Next Steps

1. **Try the diagnostic steps above**
2. **Check VS Code Output panel for specific errors**
3. **Use development mode for debugging**
4. **Report specific error messages for further troubleshooting**

The most common cause is that the extension isn't properly activating due to missing dependencies or compilation errors that aren't immediately visible.
