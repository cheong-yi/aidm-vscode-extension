# RooCode Integration Guide

## Overview

This VS Code extension provides a **local MCP server** that RooCode and other AI assistants can connect to for rich project context. The extension automatically spawns an MCP server on port 3000 when activated.

## Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────────┐
│   VS Code       │    │  Local MCP       │    │  RooCode            │
│   Extension     │───▶│  Server          │◀───│  (AI Assistant)     │
│                 │    │  (Port 3000)     │    │                     │
└─────────────────┘    └──────────────────┘    └─────────────────────┘
                              │
                              ▼
                       ┌──────────────────┐
                       │  Sprint Context  │
                       │  Business Reqs   │
                       │  Team Patterns   │
                       │  Mock Data       │
                       └──────────────────┘
```

## Connecting RooCode to the Local MCP Server

### Step 1: Install and Activate the Extension

1. Install the "Enterprise AI Context" extension in VS Code
2. Open a TypeScript project
3. The extension automatically starts the local MCP server on `http://localhost:3000/rpc`

### Step 2: Configure RooCode MCP Connection

Configure RooCode to connect to the local MCP server:

```json
{
  "mcpServers": {
    "enterprise-ai-context": {
      "command": "curl",
      "args": [
        "-X",
        "POST",
        "-H",
        "Content-Type: application/json",
        "-d",
        "@-",
        "http://localhost:3000/rpc"
      ],
      "env": {}
    }
  }
}
```

Or if RooCode supports direct HTTP MCP connections:

```json
{
  "mcpServers": {
    "enterprise-ai-context": {
      "url": "http://localhost:3000/rpc",
      "protocol": "http"
    }
  }
}
```

### Step 3: Verify Connection

1. Use VS Code Command Palette: "Enterprise AI Context: Show Connection Status"
2. Check that the local MCP server is running
3. Test RooCode connection to the MCP server

## Available MCP Tools for RooCode

### `get_business_context`

Get business requirements and context for specific code locations.

**Input:**

```json
{
  "filePath": "src/services/PaymentProcessor.ts",
  "line": 25
}
```

**Output:**

```json
{
  "requirements": [
    {
      "id": "REQ-002",
      "title": "Payment Processing Integration",
      "description": "Support multiple payment methods with PCI compliance",
      "priority": "high"
    }
  ],
  "implementationStatus": "in_progress",
  "relatedChanges": [...],
  "teamPatterns": [...]
}
```

### `get_sprint_context`

Access current sprint and story details.

**Input:**

```json
{
  "includeStories": true,
  "includeTeamPatterns": true
}
```

**Output:**

```json
{
  "sprintDetails": {
    "name": "Sprint 23 - Payment Integration",
    "startDate": "2024-01-15",
    "endDate": "2024-01-29"
  },
  "currentStories": [
    {
      "id": "STORY-456",
      "title": "Implement secure payment processing",
      "acceptanceCriteria": [...]
    }
  ],
  "teamPatterns": [...]
}
```

### `get_team_patterns`

Retrieve team coding standards and practices.

**Input:**

```json
{
  "technology": "typescript",
  "category": "security"
}
```

**Output:**

```json
{
  "patterns": [
    {
      "name": "PCI DSS Compliance Pattern",
      "description": "Secure payment data handling",
      "examples": [...],
      "enforcement": "required"
    }
  ]
}
```

## Demo Scenarios

### Scenario 1: Code Suggestion with Business Context

1. **RooCode Query**: "Help me implement payment processing"
2. **MCP Call**: `get_business_context` for PaymentProcessor.ts
3. **Context Received**: REQ-002 (PCI compliance), current sprint story
4. **RooCode Response**: Code suggestion incorporating business requirements and compliance needs

### Scenario 2: Sprint-Aware Development

1. **RooCode Query**: "What should I work on next?"
2. **MCP Call**: `get_sprint_context` with current stories
3. **Context Received**: Active sprint stories, acceptance criteria, team priorities
4. **RooCode Response**: Prioritized development suggestions based on sprint context

### Scenario 3: Team Pattern Compliance

1. **RooCode Query**: "Review this code for team standards"
2. **MCP Call**: `get_team_patterns` for TypeScript security patterns
3. **Context Received**: Team coding standards, security requirements
4. **RooCode Response**: Code review with team-specific recommendations

## Testing the Integration

### Manual Testing

1. **Start Extension**: Open VS Code with a TypeScript project
2. **Check Server**: Command Palette → "Enterprise AI Context: Show Connection Status"
3. **Test MCP Call**: Use curl to test the MCP server directly:

```bash
curl -X POST http://localhost:3000/rpc \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "method": "tools/call",
    "params": {
      "name": "get_business_context",
      "arguments": {
        "filePath": "src/demo/sampleFiles/PaymentProcessor.ts",
        "line": 50
      }
    },
    "id": 1
  }'
```

### Demo Mode

Run the built-in demo to see the integration in action:

```bash
npm run demo
```

Or use VS Code Command Palette: "Enterprise AI Context: Run RooCode Integration Demo"

## Troubleshooting

### Common Issues

**MCP Server Not Starting**

- Check VS Code Output panel: "Enterprise AI Context"
- Verify port 3000 is available
- Restart extension: Command Palette → "Enterprise AI Context: Restart MCP Server"

**RooCode Connection Failed**

- Verify MCP server is running (green status in status bar)
- Check firewall settings for localhost:3000
- Test with curl command above

**No Business Context Returned**

- Extension uses mock data by default
- Check sample files in `src/demo/sampleFiles/`
- Verify file paths in MCP calls match actual files

### Configuration

Configure the extension in VS Code Settings:

- `enterpriseAiContext.mcpServer.port`: MCP server port (default: 3000)
- `enterpriseAiContext.mock.enabled`: Enable mock data mode (default: true)
- `enterpriseAiContext.mock.dataSize`: Mock data complexity (small/medium/large)

## Future Enterprise Integration

This local MCP server is designed to work alongside a future remote MCP server for enterprise delivery intelligence:

- **Local MCP** (this extension): Sprint context, business requirements, team patterns
- **Remote MCP** (future): Enterprise delivery patterns, institutional knowledge, cross-project insights

RooCode will be able to query both servers for comprehensive context that combines immediate project needs with proven enterprise delivery methodologies.
