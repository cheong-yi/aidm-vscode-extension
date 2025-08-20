# AiDM VSCode Extension - Version History

## Version 0.10.1 (Packaged)
**Date**: 2025-08-20
**Status**: Auto-packaged for testing

### 📦 Packaging Notes
- **Auto-versioned**: Incremented from 0.9.1
- **Build Date**: 2025-08-20T00:10:37.242Z
- **Purpose**: Testing and demo packaging

---

## Version 0.9.1 (Packaged)
**Date**: 2025-08-19
**Status**: Auto-packaged for testing

### 📦 Packaging Notes
- **Auto-versioned**: Incremented from 0.8.1
- **Build Date**: 2025-08-19T23:58:29.280Z
- **Purpose**: Testing and demo packaging

---

## Version 0.8.1 (Packaged)
**Date**: 2025-08-19
**Status**: Auto-packaged for testing

### 📦 Packaging Notes
- **Auto-versioned**: Incremented from 0.7.1
- **Build Date**: 2025-08-19T23:45:37.191Z
- **Purpose**: Testing and demo packaging

---

## Version 0.7.1 (Packaged)
**Date**: 2025-08-19
**Status**: Auto-packaged for testing

### 📦 Packaging Notes
- **Auto-versioned**: Incremented from 0.6.1
- **Build Date**: 2025-08-19T23:34:10.267Z
- **Purpose**: Testing and demo packaging

---

## Version 0.6.1 (Packaged)
**Date**: 2025-08-19
**Status**: Auto-packaged for testing

### 📦 Packaging Notes
- **Auto-versioned**: Incremented from 0.5.1
- **Build Date**: 2025-08-19T23:30:47.029Z
- **Purpose**: Testing and demo packaging

---

## Version 0.5.1 (Packaged)
**Date**: 2025-08-19
**Status**: Auto-packaged for testing

### 📦 Packaging Notes
- **Auto-versioned**: Incremented from 0.4.1
- **Build Date**: 2025-08-19T23:19:12.601Z
- **Purpose**: Testing and demo packaging

---

## Version 0.4.1 (Packaged)
**Date**: 2025-08-19
**Status**: Auto-packaged for testing

### 📦 Packaging Notes
- **Auto-versioned**: Incremented from 0.3.1
- **Build Date**: 2025-08-19T23:17:54.219Z
- **Purpose**: Testing and demo packaging

---

## Version 0.3.1 (Packaged)
**Date**: 2025-08-19
**Status**: Auto-packaged for testing

### 📦 Packaging Notes
- **Auto-versioned**: Incremented from 0.2.1
- **Build Date**: 2025-08-19T19:49:23.663Z
- **Purpose**: Testing and demo packaging

---

## Version 0.2.1 (Packaged)
**Date**: 2025-08-19
**Status**: Auto-packaged for testing

### 📦 Packaging Notes
- **Auto-versioned**: Incremented from 0.1.1
- **Build Date**: 2025-08-19T19:33:27.477Z
- **Purpose**: Testing and demo packaging

---

## Version 0.1.1 (Current - Demo Ready)
**Date**: January 2024
**Status**: MVP Demo Version

### ✨ New Features
- **Command Activation Fixes**: Added multiple test commands to resolve command palette issues
- **Provenance Labeling**: Hover now shows "AiDM Extension (Local Cache)" source indicator
- **Mock Cache System**: Persistent `.aidm/mock-cache.json` with business context data
- **Debug Commands**: Added debug and force test commands for troubleshooting
- **Seed Tool Stub**: MCP tool for future remote data seeding

### 🔧 Improvements
- **Sample Files Cleanup**: Removed development comments for professional demo appearance
- **Hover Performance**: Fast responses using cached mock data instead of generation
- **Error Handling**: Better error messages and fallback mechanisms
- **Activation Events**: Proper extension activation on TypeScript files and commands

### 🐛 Bug Fixes
- **Command Registration**: Fixed "command not found" errors in command palette
- **Extension Activation**: Ensured proper activation on startup and language detection
- **Hover Functionality**: Stable hover with deterministic business context data

### 📁 Files Added/Modified
- `.aidm/mock-cache.json` - Mock business context cache
- `src/server/MockCache.ts` - Cache management system
- `src/providers/hoverProvider.ts` - Added provenance labeling
- `src/extension.ts` - Added debug and test commands
- `package.json` - Updated version and activation events

---

## Version 0.1.0 (Initial)
**Date**: January 2024
**Status**: Initial Development Version

### ✨ Core Features
- **MCP Client/Server**: Local MCP server for business context
- **Hover Provider**: TypeScript hover with business requirements
- **Status Bar**: Connection status and server management
- **Demo Panel**: Interactive demonstration interface
- **Configuration Panel**: Extension settings management

### 🔧 Architecture
- **Local MCP Server**: Process management and health monitoring
- **Mock Data Provider**: Generated business context data
- **Error Handling**: Comprehensive error recovery and logging
- **TypeScript Integration**: Language-specific hover functionality

### 📁 Core Files
- `src/extension.ts` - Main extension entry point
- `src/client/mcpClient.ts` - MCP client implementation
- `src/server/ProcessManager.ts` - Server process management
- `src/providers/hoverProvider.ts` - Business context hover
- `src/ui/` - User interface components

---

## Versioning Strategy

### Semantic Versioning
- **Major** (X.0.0): Breaking changes, major architecture updates
- **Minor** (0.X.0): New features, enhancements, non-breaking changes
- **Patch** (0.0.X): Bug fixes, minor improvements, documentation updates

### Development Workflow
1. **Feature Development**: Work on new features in development branch
2. **Version Increment**: Increment minor version when packaging for demo/testing
3. **Release Notes**: Document changes in this file and package.json
4. **Demo Testing**: Test each version before major presentations

### Next Versions Planned
- **0.2.0**: Remote MCP integration and OAuth authentication
- **0.3.0**: Pluggable context sources and composite service
- **0.4.0**: Background seeding and sync from remote sources
- **1.0.0**: Production-ready with full feature set

---

## Installation Notes

### For Demo/Testing
```bash
# Install specific version
code --install-extension aidm-vscode-extension-0.1.1.vsix

# Or install from source
npm install
npm run compile
```

### Version Compatibility
- **VS Code**: ^1.80.0
- **Node.js**: >=20.0.0
- **TypeScript**: ^5.0.0

---

*Last Updated: January 2024*
*Maintained by: AiDM Team*
