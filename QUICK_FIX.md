# Quick Fix: Command Not Found Error

## The Problem

You're seeing: `command 'enterprise-ai-context.openConfiguration' not found`

## Root Cause

The extension isn't activating properly in VS Code.

## Quick Solution (Try These in Order)

### Option 1: Development Mode (Fastest)

```bash
# Open VS Code in development mode with the extension
code --extensionDevelopmentPath=.
```

This bypasses installation and loads the extension directly.

### Option 2: Force Reload

1. Open VS Code
2. Press `Ctrl+Shift+P` (Command Palette)
3. Type: "Developer: Reload Window"
4. Try the commands again

### Option 3: Check Extension Status

1. Open VS Code Extensions panel (`Ctrl+Shift+X`)
2. Search for "Enterprise AI Context"
3. If found, make sure it's **enabled**
4. If not found, the extension isn't installed

### Option 4: Manual Installation

```bash
# Run the installation script
npm run install-extension
```

### Option 5: Simple Test

1. Create a file called `test.ts` with this content:

```typescript
export class Test {
  hello() {
    return "world";
  }
}
```

2. Open it in VS Code
3. Wait 5 seconds
4. Try Command Palette → "Enterprise AI Context: Hello (Test Command)"

## Diagnostic Commands

Once you get ANY Enterprise AI Context command working, try these in order:

1. **"Enterprise AI Context: Hello (Test Command)"** - Simple test
2. **"Enterprise AI Context: Test Extension Activation"** - Check status
3. **"Enterprise AI Context: Show Demo Panel"** - Interactive demo
4. **"Enterprise AI Context: Open Configuration Panel"** - Full config

## Check VS Code Output

1. Open Output panel (`View → Output`)
2. Select "Enterprise AI Context" from dropdown
3. Look for these messages:
   - `🚀 Enterprise AI Context extension activation started!`
   - `✅ Enterprise AI Context extension activated successfully!`

## If Nothing Works

The extension might have dependency issues. Try this minimal approach:

1. **Create a new folder**
2. **Copy only these files**:
   - `package.json`
   - `src/extension.ts`
   - `tsconfig.json`
3. **Run**:
   ```bash
   npm install
   npm run compile
   code --extensionDevelopmentPath=.
   ```

## Expected Behavior

When working correctly, you should see:

- ✅ Status bar indicator (bottom right)
- ✅ Commands available in Command Palette
- ✅ Hover functionality on TypeScript files
- ✅ Success messages when running commands

## Still Not Working?

If none of these work, the issue might be:

1. **VS Code version too old** (need 1.80.0+)
2. **Node.js version incompatible** (need 20.x+)
3. **Missing system dependencies**
4. **Workspace-specific VS Code settings blocking extensions**

Try opening VS Code with a clean profile:

```bash
code --user-data-dir /tmp/clean-vscode --extensionDevelopmentPath=.
```
