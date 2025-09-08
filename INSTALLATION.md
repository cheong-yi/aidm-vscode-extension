# Installation and Setup Guide

## 📋 Prerequisites

Before installing the Enterprise AI Context extension, ensure you have:

- **VSCode**: Version 1.80.0 or higher
- **Node.js**: Version 16.x or higher (for development)
- **TypeScript**: Files in your workspace (for hover functionality)

## 🚀 Installation Methods

### Method 1: VSCode Marketplace (Recommended)

1. **Open VSCode**
2. **Open Extensions Panel**:
   - Press `Ctrl+Shift+X` (Windows/Linux)
   - Press `Cmd+Shift+X` (macOS)
   - Or click the Extensions icon in the Activity Bar
3. **Search**: Type "Enterprise AI Context"
4. **Install**: Click the "Install" button
5. **Reload**: VSCode will automatically reload to activate the extension

### Method 2: Manual Installation (.vsix file)

If you have a `.vsix` package file:

1. **Download** the `.vsix` file
2. **Open VSCode**
3. **Open Command Palette**: `Ctrl+Shift+P` (Windows/Linux) or `Cmd+Shift+P` (macOS)
4. **Run Command**: Type "Extensions: Install from VSIX..."
5. **Select File**: Browse and select the `.vsix` file
6. **Install**: Click "Install" and reload VSCode

### Method 3: Development Installation

For developers who want to modify or contribute:

```bash
# Clone the repository
git clone https://github.com/enterprise-ai-context/vscode-extension.git
cd vscode-extension

# Install dependencies
npm install

# Compile TypeScript
npm run compile

# Run tests (optional but recommended)
npm test

# Launch in development mode
code --extensionDevelopmentPath=.
```

## ⚙️ Initial Configuration

### 1. Basic Setup

After installation, configure the extension:

1. **Open Settings**: `Ctrl+,` (Windows/Linux) or `Cmd+,` (macOS)
2. **Search**: Type "Enterprise AI Context"
3. **Configure** the following essential settings:

```json
{
  "enterpriseAiContext.mock.enabled": true,
  "enterpriseAiContext.mock.dataSize": "medium",
  "enterpriseAiContext.mcpServer.port": 3000,
  "enterpriseAiContext.ui.hoverPopupTheme": "detailed"
}
```

### 2. Demo Configuration

For demonstration purposes, configure demo settings:

```json
{
  "enterpriseAiContext.demo.scenarioComplexity": "intermediate",
  "enterpriseAiContext.demo.industryVertical": "financial-services",
  "enterpriseAiContext.demo.includeComplianceData": true
}
```

### 3. Performance Tuning

For optimal performance:

```json
{
  "enterpriseAiContext.performance.maxConcurrentRequests": 10,
  "enterpriseAiContext.mcpServer.timeout": 5000,
  "enterpriseAiContext.mcpServer.retryAttempts": 3
}
```

## 🎯 Verification Steps

### 1. Check Extension Status

1. **Open Extensions Panel**: `Ctrl+Shift+X`
2. **Search**: "Enterprise AI Context"
3. **Verify**: Extension shows as "Enabled"

### 2. Check Connection Status

1. **Look at Status Bar**: Bottom of VSCode window
2. **Find Indicator**: Should show connection status (green = connected)
3. **Click Indicator**: Shows detailed connection information

### 3. Test Hover Functionality

1. **Open TypeScript File**: Any `.ts` file in your workspace
2. **Hover**: Over a function, class, or variable
3. **Verify**: Context popup appears with business information

### 4. Test MCP Server

1. **Open Command Palette**: `Ctrl+Shift+P`
2. **Run**: "Enterprise AI Context: Show Connection Status"
3. **Verify**: Server is running and responsive

## 🎭 Demo Setup

### Running Demo Scenarios

The extension includes comprehensive demo scenarios:

```bash
# Basic demo
npm run demo

# Verbose output
npm run demo:verbose

# Specific scenarios
npm run demo:scenarios
```

### Demo Data Configuration

Configure demo data for your industry:

```json
{
  "enterpriseAiContext.demo.industryVertical": "financial-services", // or healthcare, retail, etc.
  "enterpriseAiContext.mock.enterprisePatterns": true,
  "enterpriseAiContext.demo.scenarioComplexity": "advanced"
}
```

## 🤖 AI Assistant Integration

### RooCode Setup

To integrate with RooCode or other AI assistants:

1. **Configure MCP Connection**:

   ```json
   {
     "enterpriseAiContext.mcpServer.port": 3000,
     "enterpriseAiContext.mcpServer.timeout": 10000
   }
   ```

2. **Start MCP Server**: Extension automatically starts the server

3. **Connect AI Assistant**: Point your AI assistant to `http://localhost:3000`

4. **Test Integration**: Use AI assistant to query business context

### Available MCP Tools

The extension exposes these tools to AI assistants:

- `get_business_context`: Get context for specific code locations
- `get_requirement_details`: Get detailed requirement information
- `search_requirements`: Search for requirements (future enhancement)

## 🔧 Troubleshooting

### Common Installation Issues

**Issue**: Extension not appearing in marketplace

- **Solution**: Check VSCode version (requires 1.80.0+)
- **Alternative**: Use manual installation method

**Issue**: Extension fails to activate

- **Solution**:
  1. Check VSCode output panel for errors
  2. Ensure TypeScript files exist in workspace
  3. Restart VSCode
  4. Reinstall extension

**Issue**: MCP Server won't start

- **Solution**:
  1. Check port availability (default: 3000)
  2. Verify firewall settings
  3. Try different port in settings
  4. Check Node.js installation

### Configuration Issues

**Issue**: Hover not showing context

- **Check**: `enterpriseAiContext.mock.enabled` is true
- **Check**: Connection status in status bar
- **Try**: Restart MCP server via command palette

**Issue**: Poor performance

- **Solution**:
  1. Reduce `maxConcurrentRequests`
  2. Use smaller mock data size
  3. Increase timeout values
  4. Check system resources

### Network Issues

**Issue**: AI assistant can't connect to MCP server

- **Check**: Port configuration matches
- **Check**: Firewall allows connections
- **Check**: Server is running (status bar indicator)
- **Try**: Different port or localhost vs 127.0.0.1

## 📊 Validation Checklist

After installation, verify these items:

- [ ] Extension appears in Extensions panel as "Enabled"
- [ ] Status bar shows connection indicator
- [ ] Hover over TypeScript code shows context popup
- [ ] Command palette shows "Enterprise AI Context" commands
- [ ] MCP server responds to health checks
- [ ] Demo scenarios run successfully
- [ ] AI assistant can connect to MCP server (if applicable)
- [ ] Settings are properly configured
- [ ] No errors in VSCode output panel

## 🆘 Getting Help

If you encounter issues:

1. **Check Output Panel**: View → Output → "Enterprise AI Context"
2. **Enable Debug Logging**: Set debug settings to verbose
3. **Check GitHub Issues**: [Issues Page](https://github.com/enterprise-ai-context/vscode-extension/issues)
4. **Create New Issue**: Include VSCode version, OS, and error messages
5. **Join Discussions**: [GitHub Discussions](https://github.com/enterprise-ai-context/vscode-extension/discussions)

## 🔄 Updates

The extension automatically checks for updates. To manually update:

1. **Open Extensions Panel**: `Ctrl+Shift+X`
2. **Find Extension**: "Enterprise AI Context"
3. **Click Update**: If available
4. **Reload**: VSCode will prompt to reload

---

**Need more help?** Check our [comprehensive documentation](README.md) or [create an issue](https://github.com/enterprise-ai-context/vscode-extension/issues).
