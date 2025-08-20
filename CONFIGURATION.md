# AiDM Extension Configuration Guide

This extension provides multiple ways to configure the MCP server port and other settings, with automatic port selection to avoid conflicts.

## 🚀 **Automatic Port Selection (Recommended)**

The extension now automatically finds an available port if the configured port is busy:

1. **Tries the configured port first** (default: 3000)
2. **Falls back to alternative ports**: 3001, 3002, 3003, 3004, 3005, 8080, 8081, 8082
3. **Uses any available port** if all preferred ports are busy

## ⚙️ **Configuration Methods (Priority Order)**

### **1. VS Code Settings (Highest Priority)**

Open Command Palette (`Ctrl+Shift+P`) → "Preferences: Open Settings (JSON)":

```json
{
  "aidmVscodeExtension.mcpServer.port": 3001,
  "aidmVscodeExtension.mcpServer.timeout": 5000,
  "aidmVscodeExtension.mock.enabled": true
}
```

### **2. Project Configuration File**

Create `.aidm/config.json` in your project root (committed to repository):

```json
{
  "mcpServer": {
    "port": 3000,
    "timeout": 5000,
    "retryAttempts": 3
  },
  "mock": {
    "enabled": true,
    "dataSize": "medium",
    "enterprisePatterns": true
  },
  "performance": {
    "maxConcurrentRequests": 10
  }
}
```

### **3. Environment Variables**

Set environment variables with `AIDM_` prefix:

```bash
# Windows
set AIDM_MCP_PORT=3001
set AIDM_MCP_TIMEOUT=5000

# Linux/Mac
export AIDM_MCP_PORT=3001
export AIDM_MCP_TIMEOUT=5000
```

### **4. Default Values (Lowest Priority)**

If no configuration is provided, the extension uses sensible defaults.

## 🔧 **Available Configuration Options**

### **MCP Server Settings**

| Setting                   | Default | Description                           |
| ------------------------- | ------- | ------------------------------------- |
| `mcpServer.port`          | 3000    | Preferred port for MCP server         |
| `mcpServer.timeout`       | 5000    | Request timeout in milliseconds       |
| `mcpServer.retryAttempts` | 3       | Number of restart attempts on failure |

### **Mock Data Settings**

| Setting                   | Default  | Description                                |
| ------------------------- | -------- | ------------------------------------------ |
| `mock.enabled`            | true     | Enable mock data mode                      |
| `mock.dataSize`           | "medium" | Size of mock data set (small/medium/large) |
| `mock.enterprisePatterns` | true     | Use realistic enterprise patterns          |

### **Performance Settings**

| Setting                             | Default | Description                               |
| ----------------------------------- | ------- | ----------------------------------------- |
| `performance.maxConcurrentRequests` | 10      | Maximum concurrent requests to MCP server |

## 🎯 **Commands for Port Management**

### **Show Current Port**

- **Command**: `AiDM: Show MCP Server Port`
- **Shortcut**: `Ctrl+Shift+P` → "AiDM: Show MCP Server Port"
- **Shows**: Current port being used by the MCP server

### **Restart Server**

- **Command**: `AiDM: Restart MCP Server`
- **Shortcut**: `Ctrl+Shift+P` → "AiDM: Restart MCP Server"
- **Action**: Restarts the MCP server (may use different port if original is busy)

## 🔍 **Troubleshooting Port Conflicts**

### **Check What's Using Port 3000**

```bash
# Windows
netstat -ano | findstr :3000

# Linux/Mac
lsof -i :3000
```

### **Common Port Conflicts**

- **Development servers** (React, Vue, Angular)
- **Database servers** (MongoDB, PostgreSQL)
- **Other VS Code extensions**
- **System services**

### **Automatic Resolution**

The extension automatically resolves port conflicts by:

1. Detecting when the preferred port is busy
2. Finding an available alternative port
3. Updating all components to use the new port
4. Notifying you of the port change

## 📁 **File Structure**

```
your-project/
├── .aidm/
│   ├── config.json          # Project configuration
│   └── mock-cache.json      # Mock data cache
├── .vscode/
│   └── settings.json        # VS Code workspace settings
└── src/
    └── ...
```

## 🚀 **Getting Started**

1. **Clone the repository**
2. **Create `.aidm/config.json`** with your preferred settings
3. **Install the extension**
4. **The extension automatically finds an available port**

## 🔄 **Port Change Notifications**

When the extension switches to a different port, you'll see:

- Console log: `🔄 Port 3000 is busy, switching to port 3001`
- Notification: `AiDM MCP Server started on port 3001`
- Status bar shows the current port

## 📝 **Best Practices**

1. **Use `.aidm/config.json`** for team-wide settings
2. **Use VS Code settings** for personal preferences
3. **Use environment variables** for CI/CD pipelines
4. **Let the extension handle port conflicts automatically**
5. **Check the extension output** for port change notifications

## 🆘 **Need Help?**

- Check the **Output Panel** → "AiDM Extension" for detailed logs
- Use **AiDM: Show MCP Server Port** to see current port
- Use **AiDM: Restart MCP Server** to resolve issues
- Check the extension's **Status Bar** for connection status

