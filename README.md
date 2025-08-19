# Enterprise AI Context VSCode Extension

Bridge business requirements and code implementation in enterprise environments.

## Features

- **Hover Context**: View business requirements and context when hovering over TypeScript code
- **AI Integration**: Provides rich project context to AI assistants via Model Context Protocol (MCP)
- **Status Monitoring**: Real-time connection status with the MCP server
- **Mock Data**: Realistic enterprise scenarios for demonstration and development

## Requirements

- VSCode 1.80.0 or higher
- TypeScript files in your workspace

## Installation

1. Install dependencies: `npm install`
2. Compile the extension: `npm run compile`
3. Run tests: `npm test`
4. Launch extension: Press F5 in VSCode

## Configuration

Configure the extension through VSCode settings:

- `enterpriseAiContext.mcpServer.port`: MCP server port (default: 3000)
- `enterpriseAiContext.mcpServer.timeout`: Request timeout in ms (default: 5000)
- `enterpriseAiContext.mock.enabled`: Enable mock data mode (default: true)
- `enterpriseAiContext.mock.dataSize`: Mock data size (small/medium/large)

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
