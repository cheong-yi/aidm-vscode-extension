# Live Demo Guide: RooCode + Enterprise AI Context Extension

## Overview

This guide shows how to demonstrate the Enterprise AI Context extension with RooCode connecting to the live MCP server for your managers.

## Demo Setup (5 minutes)

### Step 1: Install and Activate Extension

1. **Install Extension**:

   ```bash
   # If developing locally
   npm run compile
   code --install-extension enterprise-ai-context-0.1.0.vsix

   # Or from marketplace
   # Install "Enterprise AI Context" from VS Code Extensions
   ```

2. **Verify Activation**:
   - Open VS Code
   - Open a TypeScript project (or create a new folder with a `.ts` file)
   - Command Palette (`Ctrl+Shift+P`) → "Enterprise AI Context: Test Extension Activation"
   - Should see: "✅ Enterprise AI Context Extension is active! MCP Server: Running"

### Step 2: Verify Local MCP Server

1. **Check Status Bar**: Look for connection indicator in bottom-right
2. **Test MCP Server**:
   ```bash
   curl -X POST http://localhost:3000/rpc \
     -H "Content-Type: application/json" \
     -d '{
       "jsonrpc": "2.0",
       "method": "tools/call",
       "params": {
         "name": "get_business_context",
         "arguments": {
           "filePath": "demo.ts",
           "line": 1
         }
       },
       "id": 1
     }'
   ```

### Step 3: Configure RooCode Connection

Configure RooCode to connect to the local MCP server:

**Option A: Direct HTTP Connection (if RooCode supports it)**

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

**Option B: Command-line MCP Connection**

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
      ]
    }
  }
}
```

## Live Demo Script (10 minutes)

### Demo 1: Extension Hover Functionality (2 minutes)

1. **Open Sample File**: `src/demo/sampleFiles/PaymentProcessor.ts`
2. **Show Hover Context**:

   - Hover over `processPayment` method
   - Show business requirements popup
   - Highlight: "REQ-002: Payment Processing Integration"
   - Point out PCI compliance requirements

3. **Show Different Context**:
   - Hover over `refundPayment` method
   - Show different business context
   - Highlight audit trail requirements

### Demo 2: MCP Server Status (1 minute)

1. **Show Connection Status**:

   - Command Palette → "Enterprise AI Context: Show Connection Status"
   - Point out: "Local MCP Server running on port 3000"
   - Show server health metrics

2. **Demo Panel**:
   - Command Palette → "Enterprise AI Context: Show Demo Panel"
   - Show architecture diagram
   - Explain local vs remote MCP concept

### Demo 3: RooCode Integration (5 minutes)

**Prerequisites**: RooCode configured to connect to `http://localhost:3000/rpc`

1. **Ask RooCode for Code Suggestion**:

   ```
   "Help me implement a secure payment processor that follows our team's coding standards and business requirements"
   ```

2. **Show RooCode Response**: RooCode should now have access to:

   - Current sprint context (Sprint 23 - Payment Integration)
   - Business requirements (REQ-002: PCI compliance)
   - Team coding patterns (TypeScript security standards)
   - Mock enterprise data

3. **Ask RooCode for Context Analysis**:

   ```
   "What business requirements does the PaymentProcessor.ts file fulfill?"
   ```

4. **Show Enhanced Response**: RooCode can now provide:
   - Specific requirement mappings
   - Compliance considerations
   - Implementation status
   - Related business context

### Demo 4: Concurrent AI Requests (2 minutes)

1. **Run Built-in Demo**:

   - Command Palette → "Enterprise AI Context: Run RooCode Integration Demo"
   - Show terminal output with concurrent request handling
   - Point out response times and success rates

2. **Show Multiple AI Assistants**:
   - If available, connect multiple AI tools to the same MCP server
   - Demonstrate concurrent access to business context

## Key Demo Points for Managers

### Business Value Demonstrated

1. **Developer Productivity**:

   - Developers see business context directly in code
   - No need to search through requirements documents
   - Immediate understanding of "why" behind code

2. **AI Enhancement**:

   - AI assistants get rich project context
   - Better code suggestions aligned with business needs
   - Reduced back-and-forth between developers and business analysts

3. **Enterprise Scalability**:
   - Local MCP for immediate team context
   - Future remote MCP for enterprise delivery patterns
   - Supports multiple AI assistants simultaneously

### Technical Architecture Highlights

1. **Hybrid MCP Design**:

   - Local server for sprint/team context (fast, <200ms)
   - Remote server for enterprise intelligence (future)
   - Graceful fallback when services unavailable

2. **Enterprise Ready**:

   - Audit logging for compliance
   - Configurable security settings
   - Mock data for safe demonstrations

3. **Developer Experience**:
   - Zero configuration for basic use
   - Seamless VS Code integration
   - Works with existing development workflows

## Troubleshooting During Demo

### Common Issues and Quick Fixes

**"Commands not found"**:

- Ensure TypeScript file is open
- Run: "Enterprise AI Context: Test Extension Activation"
- Check VS Code Output panel for errors

**"MCP Server not responding"**:

- Check status bar indicator (should be green)
- Command Palette → "Enterprise AI Context: Restart MCP Server"
- Verify port 3000 is available

**"RooCode not getting context"**:

- Test MCP server with curl command above
- Verify RooCode MCP configuration
- Check firewall/network settings

**"No business context in hover"**:

- Use sample files in `src/demo/sampleFiles/`
- Ensure mock data is enabled in settings
- Try different code elements (methods, classes)

## Post-Demo Discussion Points

### Immediate Benefits

- Developers understand business context without leaving IDE
- AI assistants provide better, context-aware suggestions
- Reduced time spent searching for requirements

### Future Enterprise Integration

- Connect to real project management systems (Jira, Azure DevOps)
- Integration with enterprise delivery methodologies
- Cross-project learning and pattern sharing

### ROI Considerations

- Reduced developer onboarding time
- Fewer defects from misunderstood requirements
- Improved AI assistant effectiveness
- Better alignment between business and technical teams

## Next Steps After Demo

1. **Pilot Program**: Install on development team machines
2. **Configuration**: Set up with real project data
3. **AI Integration**: Configure team's AI assistants
4. **Metrics Collection**: Track developer productivity improvements
5. **Enterprise Rollout**: Plan for organization-wide deployment

---

**Demo Duration**: ~15 minutes total
**Audience**: Technical managers, product owners, development leads
**Goal**: Show immediate value and future enterprise potential
