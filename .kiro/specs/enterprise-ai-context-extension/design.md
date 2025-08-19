# Design Document

## Overview

The Enterprise AI Context VSCode Extension follows a hybrid-first architecture with a local MCP server spawned by the VSCode extension. This design enables both human developers and AI assistants to access rich business context while maintaining enterprise-grade security and performance. The system uses a mock-first development approach to enable rapid iteration and demonstration capabilities.

## MVP Implementation Priorities

### Phase 1 (3-4 hours) - Core Functionality

- TypeScript hover provider only
- Basic HTTP JSON-RPC communication (not full MCP SDK)
- Simple mock data service with realistic enterprise patterns
- Basic status bar indicator
- Essential error handling

### Phase 2 (Future) - Enterprise Features

- Multi-language support (JavaScript, Python, Java, C#, Go)
- Full MCP protocol implementation with SDK
- Advanced search functionality
- Comprehensive health metrics
- Advanced caching and performance optimization

## Architecture

### High-Level Architecture

```mermaid
graph TB
    subgraph "VSCode Extension Host"
        EXT[VSCode Extension]
        HP[Hover Provider]
        SP[Search Provider - Future]
        SB[Status Bar]
    end

    subgraph "Local MCP Server Process"
        MCP[MCP Server]
        CTX[Context Manager]
        MOCK[Mock Data Layer]
        CACHE[Cache Layer]
    end

    subgraph "External Systems (Future)"
        NEO[Neo4j Graph DB]
        JIRA[Project APIs]
        GIT[Git Integration]
    end

    EXT --> MCP : JSON-RPC
    HP --> EXT
    SP --> EXT
    SB --> EXT

    MCP --> CTX
    CTX --> MOCK
    CTX --> CACHE

    CTX -.-> NEO : Future Integration
    CTX -.-> JIRA : Future Integration
    CTX -.-> GIT : Future Integration

    subgraph "AI Assistants"
        AI1[RooCode]
        AI2[Gemini]
        AI3[Other AI Tools]
    end

    AI1 --> MCP : MCP Protocol
    AI2 --> MCP : MCP Protocol
    AI3 --> MCP : MCP Protocol
```

### Component Separation

**VSCode Extension (UI Layer)**

- Manages VSCode-specific integrations (hover, commands, status bar)
- Handles user interactions and UI state
- Communicates with MCP server via JSON-RPC
- Lightweight and focused on presentation logic

**MCP Server (Business Logic Layer)**

- Implements MCP protocol for AI assistant integration
- Manages business context retrieval and caching
- Handles data abstraction and mock/real data switching
- Provides JSON-RPC interface for VSCode extension

## Components and Interfaces

### VSCode Extension Components

#### Hover Provider

```typescript
interface BusinessContextHoverProvider {
  provideHover(
    document: TextDocument,
    position: Position
  ): Promise<Hover | null>;
  // Note: Symbol analysis and multi-language support deferred to Phase 2
  getSupportedLanguages(): string[]; // ['typescript'] - MVP focus, expand in Phase 2
}

interface BusinessContext {
  requirements: Requirement[];
  implementationStatus: ImplementationStatus;
  relatedChanges: Change[];
  lastUpdated: Date;
}
```

#### Search Provider (Future Enhancement - Deprioritized)

```typescript
// Note: Search functionality is deprioritized for MVP
// Focus on hover provider and MCP integration first
interface RequirementsSearchProvider {
  search(query: string): Promise<SearchResult[]>;
  getRequirementDetails(requirementId: string): Promise<RequirementDetail>;
  openSearchPanel(): void;
  navigateToCode(codeLocation: CodeLocation): void;
}

interface SearchResult {
  id: string;
  title: string;
  description: string;
  relevanceScore: number;
  codeLocations: CodeLocation[];
}
```

#### Status Bar Manager

```typescript
interface StatusBarManager {
  updateConnectionStatus(status: ConnectionStatus): void;
  showHealthMetrics(): void;
  handleStatusClick(): void;
}

enum ConnectionStatus {
  Connected = "connected",
  Disconnected = "disconnected",
  Connecting = "connecting",
  Error = "error",
}
```

### MCP Server Components

#### MCP Protocol Handler

```typescript
interface SimpleMCPServer {
  start(port: number): Promise<void>;
  stop(): Promise<void>;
  handleToolCall(toolName: string, args: any): Promise<any>;
  isHealthy(): boolean;

  // Added: Support for hybrid architecture
  enableRemoteSync(remoteEndpoint: string): Promise<void>;
  syncDeliveryPatterns(): Promise<void>;
  getLocalContext(query: ContextQuery): Promise<LocalContext>;
  queryRemoteIntelligence(query: RemoteQuery): Promise<RemoteIntelligence>;
}

interface LocalContext {
  sprintDetails: SprintInfo;
  storyContext: StoryContext;
  teamPatterns: CodingPattern[];
  businessRequirements: Requirement[];
}

interface RemoteIntelligence {
  deliveryPatterns: DeliveryPattern[];
  institutionalKnowledge: KnowledgeBase;
  crossProjectInsights: LearningInsight[];
  stakeholderMapping: StakeholderMap;
}

interface Tool {
  name: string;
  description: string;
  inputSchema: JSONSchema;
}
```

#### Context Manager

```typescript
interface ContextManager {
  getBusinessContext(codeLocation: CodeLocation): Promise<BusinessContext>;
  searchRequirements(query: string): Promise<SearchResult[]>; // Future enhancement
  getRequirementById(id: string): Promise<RequirementDetail>;
  invalidateCache(pattern?: string): void;
}
```

#### Data Layer Abstraction

```typescript
interface MockDataService {
  getContextForFile(filePath: string): Promise<BusinessContext[]>;
  getRequirementById(id: string): Promise<Requirement | null>;
  // Note: Advanced filtering and change history in Phase 2
}

// Phase 2 - Full Enterprise Interface (commented for future)
// interface DataProvider {
//   getRequirements(filter?: RequirementFilter): Promise<Requirement[]>;
//   getCodeMappings(codeLocation: CodeLocation): Promise<CodeMapping[]>;
//   getChangeHistory(entityId: string): Promise<Change[]>;
// }
```

## Data Models

### Core Business Entities

```typescript
interface Requirement {
  id: string;
  title: string;
  description: string;
  type: RequirementType;
  priority: Priority;
  status: RequirementStatus;
  stakeholders: string[];
  createdDate: Date;
  lastModified: Date;
  tags: string[];
}

interface CodeMapping {
  requirementId: string;
  codeLocation: CodeLocation;
  mappingType: MappingType;
  confidence: number;
  lastVerified: Date;
}

interface CodeLocation {
  filePath: string;
  startLine: number;
  endLine: number;
  symbolName?: string;
  symbolType?: SymbolType;
}

interface Change {
  id: string;
  type: ChangeType;
  description: string;
  author: string;
  timestamp: Date;
  relatedRequirements: string[];
  codeChanges: CodeLocation[];
}
```

### Communication Protocols

```typescript
interface JSONRPCRequest {
  jsonrpc: "2.0";
  method: string;
  params?: any;
  id: string | number;
}

interface JSONRPCResponse {
  jsonrpc: "2.0";
  result?: any;
  error?: JSONRPCError;
  id: string | number;
}

// HTTP JSON-RPC Communication Pattern
interface MCPCommunication {
  endpoint: string; // "http://localhost:3000/rpc"
  method: "POST";
  headers: {
    "Content-Type": "application/json";
  };
  requestFormat: JSONRPCRequest;
  responseFormat: JSONRPCResponse;
}

// Specific Tool Call Format
interface ToolCallRequest extends JSONRPCRequest {
  method: "tools/call";
  params: {
    name: string; // "get_code_context" | "search_requirements"
    arguments: Record<string, any>;
  };
}
```

## AI Assistant Integration Patterns

### RooCode Dual-Context Architecture

**Local Context Queries (Immediate Response)**

```typescript
interface RooCodeLocalQueries {
  getCurrentStoryContext(): Promise<{
    storyId: string;
    acceptanceCriteria: string[];
    businessRequirements: Requirement[];
    teamCodingStandards: CodingPattern[];
  }>;

  getProjectContext(filePath: string): Promise<{
    relatedRequirements: Requirement[];
    implementationStatus: ImplementationStatus;
    teamPatterns: CodingPattern[];
  }>;
}

interface RooCodeRemoteQueries {
  getAccentureDeliveryPatterns(technology: string): Promise<{
    provenPatterns: DeliveryPattern[];
    successfulProjects: ProjectReference[];
    methodOneGuidance: MethodOneArtifact[];
    stakeholderConsiderations: StakeholderInsight[];
  }>;

  queryInstitutionalKnowledge(domain: string): Promise<{
    crossProjectLearning: LearningInsight[];
    deliveryMethodology: AccentureMethod[];
    riskMitigation: RiskPattern[];
  }>;
}
```

## Error Handling

### Error Categories and Strategies

**Connection Errors**

- MCP server startup failures → Retry with exponential backoff
- JSON-RPC communication errors → Queue requests and retry
- Network timeouts → Fallback to cached data

**Data Errors**

- Missing business context → Return empty context with clear messaging
- Invalid search queries → Sanitize and provide suggestions
- Corrupted cache data → Clear cache and regenerate

**Performance Errors (MVP Scope)**

- Request timeouts → Basic 5-second timeout with fallback message
- Note: Advanced throttling, cancellation, and lazy loading in Phase 2

### Error Response Format

```typescript
interface ErrorResponse {
  code: ErrorCode;
  message: string;
  details?: any;
  timestamp: Date;
  requestId: string;
}

enum ErrorCode {
  CONNECTION_FAILED = "CONNECTION_FAILED",
  DATA_NOT_FOUND = "DATA_NOT_FOUND",
  INVALID_REQUEST = "INVALID_REQUEST",
  TIMEOUT = "TIMEOUT",
  INTERNAL_ERROR = "INTERNAL_ERROR",
}
```

### Graceful Degradation

1. **MCP Server Unavailable** → Show cached data with staleness indicator
2. **Mock Data Unavailable** → Use static fallback data
3. **Search Service Down** → Provide basic file-based search
4. **Performance Issues** → Disable real-time features, enable manual refresh

## Testing Strategy

### Test Pyramid Structure

**Unit Tests (70%)**

- Individual component logic
- Data transformation functions
- Error handling scenarios
- Mock data generation
- Protocol message parsing

**Integration Tests (20%)**

- VSCode extension ↔ MCP server communication
- JSON-RPC message flow
- Cache invalidation and updates
- End-to-end search functionality
- Hover provider integration

**End-to-End Tests (10%)**

- Complete user workflows
- AI assistant integration scenarios
- Performance benchmarks
- Error recovery testing

### Mock Strategy

**Development Mocks**

```typescript
interface MockConfiguration {
  dataSize: "small" | "medium" | "large";
  responseDelay: number;
  errorRate: number;
  enterprisePatterns: boolean;
}
```

**Test Data Patterns**

- Realistic enterprise requirement hierarchies
- Complex code-to-requirement mappings
- Historical change patterns
- Multi-stakeholder scenarios
- Cross-team dependencies

### Performance Testing

**Response Time Targets**

- Hover display: <200ms
- Search results: <500ms
- Status updates: <100ms
- MCP tool calls: <300ms

**Load Testing Scenarios**

- Multiple concurrent hover requests
- Large search result sets
- AI assistant burst requests
- Memory usage over extended sessions

## Security Considerations

### Data Protection

- No sensitive business data in logs
- Secure inter-process communication
- Input sanitization for all user queries
- Audit trail for all data access

### Enterprise Compliance

- Configurable data retention policies
- User access logging
- Secure credential management
- Network security for future remote connections

### Future Authentication Framework

```typescript
interface AuthenticationProvider {
  authenticate(credentials: Credentials): Promise<AuthToken>;
  validateToken(token: AuthToken): Promise<boolean>;
  refreshToken(token: AuthToken): Promise<AuthToken>;
}
```

## Performance Optimization

### Hybrid Caching Strategy (Local-First Architecture)

**Local-First Performance**

1. **Sprint Context Cache** → Immediate access to current story details (<50ms)
2. **Business Requirements Cache** → Code-to-requirement mappings (<100ms)
3. **Team Patterns Cache** → Project coding standards and practices (<200ms)
4. **Mock Data Cache** → Enterprise demonstration data for rapid iteration

**Remote Sync Patterns (Future Enterprise)**

1. **Daily Delivery Sync** → Accenture Method One artifacts and proven patterns
2. **Hourly Sprint Updates** → Real-time story progress and stakeholder changes
3. **Weekly Learning Sync** → Cross-project insights and institutional knowledge
4. **Monthly Pattern Updates** → Enterprise delivery methodology updates

**Cache Invalidation Strategy**

- **Local Cache**: Time-based expiration (5-minute TTL for active development)
- **Remote Cache**: Event-driven invalidation (sprint changes, delivery updates)
- **Hybrid Coordination**: Local cache checks remote timestamps for freshness
- **Offline Resilience**: Degraded mode with cached data when remote unavailable

### Response Time Architecture

**MVP Performance Targets (Local)**

- Hover display: <200ms (local cache + mock data)
- MCP tool calls: <300ms (local server communication)
- Status updates: <100ms (local health checks)
- AI context queries: <500ms (local business context)

**Enterprise Performance Targets (Hybrid)**

- Local context: <200ms (cached sprint and story details)
- Remote intelligence: <2s (delivery patterns and institutional knowledge)
- Hybrid responses: <800ms (local context + remote pattern hints)
- Sync operations: Background (no impact on developer experience)

### Scalability Patterns

**Local MCP Scaling**

- Memory-efficient caching with LRU eviction
- Concurrent request handling for multiple AI assistants
- Process isolation for VSCode extension stability

**Future Remote MCP Scaling**

- Connection pooling for enterprise delivery intelligence
- Request queuing and batching for institutional knowledge queries
- Circuit breaker patterns for remote service resilience

## Deployment and Configuration

### Extension Packaging

```json
{
  "name": "enterprise-ai-context",
  "displayName": "Enterprise AI Context",
  "description": "Bridge business requirements and code implementation",
  "version": "0.1.0",
  "engines": {
    "vscode": "^1.80.0"
  },
  "categories": ["Other"],
  "activationEvents": ["onLanguage:typescript"]
}
```

### Configuration Schema

```typescript
interface ExtensionConfiguration {
  mcpServer: {
    port: number;
    timeout: number;
    retryAttempts: number;
  };
  cache: {
    enabled: boolean;
    maxSize: number;
    ttl: number;
  };
  mock: {
    enabled: boolean;
    dataSize: "small" | "medium" | "large";
    enterprisePatterns: boolean;
  };
  performance: {
    hoverDelay: number;
    searchThrottle: number;
    maxConcurrentRequests: number;
  };
}
```

### Hybrid MCP Architecture (Local + Remote)

// Emphasize the dual MCP architecture pattern from overview
interface HybridMCPArchitecture {
local: {
sprintContext: LocalContextManager;
teamPatterns: MockDataProvider;
fastCache: MemoryCache; // <200ms responses for immediate needs
businessRequirements: RequirementMapper;
};
remote: {
deliveryPatterns: RemoteMCPServer; // Future - Accenture delivery intelligence
institutionalKnowledge: AccentureADM; // Future - cross-project learning
crossProjectLearning: EnterpriseDB; // Future - proven patterns database
stakeholderMapping: StakeholderService; // Future - enterprise relationships
};
}

interface LocalMCPCapabilities {
getCurrentSprintContext(): Promise<SprintContext>;
getTeamCodingPatterns(): Promise<CodingPattern[]>;
getBusinessRequirements(codeLocation: CodeLocation): Promise<Requirement[]>;
cacheDeliveryPatterns(patterns: DeliveryPattern[]): void;
}

interface RemoteMCPCapabilities {
getAccentureDeliveryPatterns(technology: string): Promise<DeliveryPattern[]>;
queryInstitutionalKnowledge(domain: string): Promise<KnowledgeBase>;
getCrossProjectLearning(query: string): Promise<LearningInsight[]>;
mapStakeholderRelationships(project: string): Promise<StakeholderMap>;
}

This design provides a solid foundation for the MVP while establishing patterns that will scale to full enterprise deployment. The architecture separates concerns effectively, enables comprehensive testing, and maintains the flexibility needed for future enhancements.
