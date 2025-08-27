# AiDM VSCode Extension

Bridge business requirements and code implementation in enterprise environments with AI-powered contextual information.

## 🚀 Features

- **📋 Hover Context**: View business requirements and context when hovering over TypeScript code
- **🤖 AI Integration**: Provides rich project context to AI assistants (like RooCode) via Model Context Protocol (MCP)
- **📊 Status Monitoring**: Real-time connection status with the local MCP server
- **🎭 Mock Data**: Realistic enterprise scenarios for demonstration and development
- **🔄 Hybrid Architecture**: Local MCP server for sprint context + future remote MCP integration for enterprise delivery patterns
- **🛡️ Security**: Audit logging and error handling for enterprise compliance

## 🏗️ Architecture

This extension implements a **hybrid MCP architecture**:

- **Local MCP Server**: Spawned by the VS Code extension, provides immediate sprint context, story details, and team coding patterns
- **AI Assistant Integration**: RooCode and other AI assistants connect to the local MCP server for rich project context
- **Future Remote MCP**: Designed to integrate with enterprise delivery intelligence (separate deployment)

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────────┐
│   VS Code       │    │  Local MCP       │    │  AI Assistants      │
│   Extension     │───▶│  Server          │◀───│  (RooCode, etc.)    │
│                 │    │  (Port 3000)     │    │                     │
└─────────────────┘    └──────────────────┘    └─────────────────────┘
                              │
                              ▼
                       ┌──────────────────┐
                       │  Sprint Context  │
                       │  Business Reqs   │
                       │  Team Patterns   │
                       └──────────────────┘
```

## 📋 Requirements

- **VSCode**: 1.80.0 or higher
- **Node.js**: 16.x or higher
- **TypeScript**: Files in your workspace for hover functionality

## 📦 Installation

### From VSCode Marketplace (Recommended)

1. Open VSCode
2. Go to Extensions (Ctrl+Shift+X)
3. Search for "AiDM VSCode Extension"
4. Click Install

### Manual Installation for Development

1. Clone the repository:

   ```bash
   git clone https://github.com/enterprise-ai-context/vscode-extension.git
   cd vscode-extension
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

3. Compile the extension:

   ```bash
   npm run compile
   ```

4. Run tests (optional):

   ```bash
   npm test
   ```

5. **The extension automatically starts a local MCP server on port 3000** when activated

## 🤖 AI Assistant Integration (RooCode)

### Connecting RooCode to the Local MCP Server

Once the extension is installed and active:

1. **Local MCP Server**: Automatically starts on `http://localhost:3000/rpc`
2. **Configure RooCode**: Point RooCode to connect to the local MCP server
3. **Available Context**: RooCode can now access:
   - Current sprint details and story context
   - Business requirements mapped to code
   - Team coding patterns and standards
   - Mock enterprise data for demonstrations

### Quick Setup & Demo Commands

**Test Extension Activation:**

- Command Palette → "AiDM: Test Extension Activation"
- Should show: "✅ AiDM VSCode Extension is active! MCP Server: Running"

**Interactive Configuration:**

- Command Palette → "AiDM: Open Configuration Panel"
- Configure remote MCP servers with live testing
- Adjust mock data and local server settings

**Live Demo for Managers:**

- Command Palette → "AiDM: Show Demo Panel"
- Interactive demo showing RooCode integration
- See `DEMO_GUIDE.md` for complete demo script

### MCP Tools Available to AI Assistants

- `get_business_context`: Get business requirements for specific code locations
- `get_sprint_context`: Access current sprint and story details
- `get_team_patterns`: Retrieve team coding standards and practices
- `search_requirements`: Find requirements by keywords (future enhancement)

  ```bash
  npm test
  ```

5. Launch extension in development mode:
   - Press `F5` in VSCode
   - Or run: `code --extensionDevelopmentPath=.`

## ⚙️ Configuration

Configure the extension through VSCode settings (`Ctrl+,` → search "AiDM VSCode Extension"):

### MCP Server Settings

- `aidmVscodeExtension.mcpServer.port`: MCP server port (default: 3000)
- `aidmVscodeExtension.mcpServer.timeout`: Request timeout in ms (default: 5000)
- `aidmVscodeExtension.mcpServer.retryAttempts`: Number of restart attempts (default: 3)

### Performance Settings

- `aidmVscodeExtension.performance.maxConcurrentRequests`: Maximum concurrent requests (default: 10)

### Mock Data Settings

- `enterpriseAiContext.mock.enabled`: Enable mock data mode (default: true)
- `enterpriseAiContext.mock.dataSize`: Mock data size (small/medium/large, default: medium)
- `enterpriseAiContext.mock.enterprisePatterns`: Use realistic enterprise patterns (default: true)

### Demo Settings

- `enterpriseAiContext.demo.scenarioComplexity`: Demo complexity level (basic/intermediate/advanced, default: intermediate)
- `enterpriseAiContext.demo.includeComplianceData`: Include compliance data (default: true)
- `enterpriseAiContext.demo.industryVertical`: Industry vertical for specialized data (default: financial-services)

### UI Settings

- `enterpriseAiContext.ui.hoverPopupTheme`: Hover popup theme (default/compact/detailed, default: detailed)
- `enterpriseAiContext.ui.showProgressBars`: Show progress bars in popups (default: true)
- `enterpriseAiContext.ui.maxRequirementsShown`: Max requirements in hover popup (default: 3)

### Taskmaster Settings

- `aidmVscodeExtension.taskmaster.currentUserEmail`: Email address of the current user for task filtering (default: empty string)

**Usage Example:**

```typescript
// In your extension code
const currentUserEmail =
  vscode.workspace
    .getConfiguration("aidmVscodeExtension.taskmaster")
    .get<string>("currentUserEmail") || "";

// Use for task filtering
const myTasks = allTasks.filter((task) => task.assignee === currentUserEmail);
```

## Development

### Project Structure

```
src/
├── extension.ts          # Main extension entry point
├── types/               # TypeScript type definitions
│   ├── jsonrpc.ts      # JSON-RPC protocol types
│   ├── business.ts     # Business domain types
│   ├── extension.ts    # Extension-specific types
│   └── index.ts        # Type exports
└── __tests__/          # Test files
    ├── setup.ts        # Jest test setup
    ├── extension.test.ts
    └── types.test.ts
```

### Scripts

- `npm run compile`: Compile TypeScript
- `npm run watch`: Watch mode compilation
- `npm test`: Run Jest tests
- `npm run lint`: Run ESLint

## License

MIT

## 🎯 Quick Start

### 1. Enable the Extension

After installation, the extension automatically activates when you open TypeScript files.

### 2. Check Connection Status

Look for the connection status indicator in the VSCode status bar (bottom right).

### 3. Hover for Context

Hover over TypeScript code elements to see business requirements and context information.

### 4. AI Assistant Integration

Configure your AI assistant (like RooCode) to connect to the MCP server for enhanced context.

## 🎭 Demo Mode

The extension includes comprehensive demo scenarios for evaluation:

```bash
# Run basic demo scenarios
npm run demo

# Run verbose demo with detailed output
npm run demo:verbose

# Run specific demo scenarios
npm run demo:scenarios
```

### Demo Features

- **Financial Services**: Banking, payments, fraud detection scenarios
- **Healthcare**: Patient data, compliance, regulatory scenarios
- **Retail**: E-commerce, inventory, customer management scenarios
- **Manufacturing**: Supply chain, quality control, production scenarios
- **Technology**: Software development, DevOps, security scenarios

## 🤖 AI Assistant Integration

### RooCode Integration

The extension provides rich context to RooCode and other AI assistants via MCP:

1. **Local Context**: Sprint details, story context, team patterns
2. **Business Requirements**: Code-to-requirement mappings
3. **Implementation Status**: Progress tracking and completion metrics
4. **Change History**: Related changes and impact analysis

### MCP Protocol Support

- **Tools Available**: `get_business_context`, `get_requirement_details`
- **Protocol**: JSON-RPC over HTTP
- **Port**: Configurable (default: 3000)
- **Authentication**: Enterprise-ready (future enhancement)

## 🛠️ Development

### Project Structure

```
src/
├── extension.ts          # Main extension entry point
├── client/              # MCP client implementations
│   ├── mcpClient.ts     # Basic MCP client
│   └── hybridMCPClient.ts # Hybrid local/remote client
├── server/              # MCP server components
│   ├── SimpleMCPServer.ts # HTTP JSON-RPC server
│   ├── ContextManager.ts  # Business context management
│   └── ProcessManager.ts  # Server lifecycle management
├── providers/           # VSCode providers
│   └── hoverProvider.ts # Hover functionality
├── mock/               # Mock data layer
│   └── MockDataProvider.ts # Enterprise demo data
├── types/              # TypeScript definitions
├── ui/                 # User interface components
├── utils/              # Utility functions
└── __tests__/          # Test suites
```

### Scripts

- `npm run compile`: Compile TypeScript
- `npm run watch`: Watch mode compilation
- `npm test`: Run Jest tests with coverage
- `npm run lint`: Run ESLint
- `npm run test:integration`: Run integration tests only
- `npm run test:roocode`: Run RooCode integration tests

### Testing

The extension includes comprehensive test coverage:

- **Unit Tests**: Individual component testing
- **Integration Tests**: Component interaction testing
- **End-to-End Tests**: Complete workflow testing
- **Coverage Target**: >80% (statements, branches, functions, lines)

```bash
# Run all tests with coverage
npm test

# Run specific test suites
npm run test:integration
npm run test:roocode

# Run tests in watch mode
npm test -- --watch
```

## 🏗️ Architecture

### Hybrid MCP Architecture

- **Local MCP Server**: Spawned by VSCode extension for immediate context
- **Remote MCP Server**: Future enterprise integration for institutional knowledge
- **Caching Layer**: Memory-based caching with TTL expiration
- **Fallback Mechanisms**: Degraded mode operation during failures

### Security & Compliance

- **Audit Logging**: All user interactions and data access logged
- **Data Sanitization**: Sensitive information filtered from logs
- **Error Boundaries**: Graceful degradation without data exposure
- **Enterprise Ready**: Configurable for compliance requirements

## 🚀 Deployment

### Extension Packaging

```bash
# Install vsce (VSCode Extension Manager)
npm install -g vsce

# Package the extension
vsce package

# This creates: enterprise-ai-context-0.1.0.vsix
```

### Installation from Package

```bash
# Install from .vsix file
code --install-extension enterprise-ai-context-0.1.0.vsix
```

## 🔧 Troubleshooting

### Common Issues

**Extension not activating:**

- Ensure you have TypeScript files in your workspace
- Check VSCode version (requires 1.80.0+)
- Restart VSCode after installation

**MCP Server connection issues:**

- Check port availability (default: 3000)
- Verify firewall settings
- Check VSCode output panel for error messages

**Hover not showing context:**

- Ensure mock data is enabled in settings
- Check connection status in status bar
- Try restarting the MCP server via command palette

**Performance issues:**

- Reduce `maxConcurrentRequests` setting
- Use smaller mock data size
- Check system resources

### Debug Mode

Enable debug logging in VSCode settings:

```json
{
  "enterpriseAiContext.debug.enabled": true,
  "enterpriseAiContext.debug.logLevel": "verbose"
}
```

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push to branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

## 🗺️ Roadmap

### Phase 1: MVP (Current)

- ✅ Hover provider with business context
- ✅ Local MCP server with mock data
- ✅ Multi-layer caching (memory + file)
- ✅ Error handling and audit logging

### Phase 2: Database Integration (Planned)

- 🔄 **Relational Database Provider**: Replace mock data with PostgreSQL/MySQL backend
- 🔄 **Relationship Caching**: Intelligent caching of requirement dependencies and code mappings
- 🔄 **Multi-level Cache Architecture**: Memory → Redis → Database with relationship awareness
- 🔄 **Schema Design**:
  - `requirements` table with full business context
  - `code_mappings` table for many-to-many file/requirement relationships
  - `requirement_relationships` table for requirement dependencies
- 🔄 **Smart Prefetching**: Load related requirements when hovering over connected code
- 🔄 **Configuration-Driven**: Toggle between mock, database, or hybrid data sources

### Phase 3: Enterprise Scale (Future)

- 📋 Remote MCP integration with enterprise systems
- 📋 Real-time collaboration features
- 📋 Advanced analytics and reporting

## 📞 Support

- **Issues**: [GitHub Issues](https://github.com/enterprise-ai-context/vscode-extension/issues)
- **Documentation**: [Wiki](https://github.com/enterprise-ai-context/vscode-extension/wiki)
- **Discussions**: [GitHub Discussions](https://github.com/enterprise-ai-context/vscode-extension/discussions)

---

**Made with ❤️ for Enterprise Development Teams**
