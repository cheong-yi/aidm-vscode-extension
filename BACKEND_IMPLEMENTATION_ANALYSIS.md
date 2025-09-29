# Backend Implementation Analysis: MCP Server + Real-time Task System

## Overview

The backend needs to serve as a unified **MCP (Model Context Protocol) Server** that provides:
1. **MCP Protocol Interface** for AI agents (Claude, Cursor, etc.) to read/write tasks
2. **REST API** for VSCode extensions to fetch/update tasks
3. **Server-Sent Events (SSE)** for real-time task updates
4. **PostgreSQL** for persistent task storage
5. **Redis Streams** for pub/sub messaging and queuing

## Architecture Diagram

```
AI Agents (Claude, Cursor) ←─── MCP Protocol ───┐
                                                 │
VSCode Extensions ←─── REST API + SSE ──────────┼─── MCP Server (FastAPI)
                                                 │
Web Dashboard ←─── REST API ─────────────────────┘
                                                 │
                                                 ├─── Redis (Streams + Queue)
                                                 │
                                                 └─── PostgreSQL (Tasks DB)
```

## Technology Stack

- **FastAPI** - Main server framework
- **MCP SDK** - Model Context Protocol implementation
- **PostgreSQL** - Primary database for task storage
- **Redis** - Pub/sub messaging and task queuing
- **asyncpg** - Async PostgreSQL driver
- **redis.asyncio** - Async Redis client

## Database Schema

### Core Tables

```sql
-- Users table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255),
    github_username VARCHAR(255),
    created_at TIMESTAMP DEFAULT NOW()
);

-- Repositories table
CREATE TABLE repositories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) UNIQUE NOT NULL,
    url VARCHAR(500),
    created_at TIMESTAMP DEFAULT NOW()
);

-- Tasks table (main entity)
CREATE TABLE tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(500) NOT NULL,
    description TEXT,
    status VARCHAR(50) DEFAULT 'not_started',
    priority VARCHAR(20) DEFAULT 'medium',
    complexity VARCHAR(20) DEFAULT 'medium',
    assignee_id UUID REFERENCES users(id),
    repository_id UUID REFERENCES repositories(id),
    created_by VARCHAR(255),
    updated_by VARCHAR(255),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),

    -- Indexes for performance
    INDEX idx_tasks_assignee (assignee_id),
    INDEX idx_tasks_repository (repository_id),
    INDEX idx_tasks_status (status),
    INDEX idx_tasks_updated (updated_at)
);

-- Task history for audit trail
CREATE TABLE task_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID REFERENCES tasks(id),
    field_changed VARCHAR(100),
    old_value TEXT,
    new_value TEXT,
    changed_by VARCHAR(255),
    comment TEXT,
    changed_at TIMESTAMP DEFAULT NOW()
);

-- Task comments
CREATE TABLE task_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID REFERENCES tasks(id),
    comment TEXT NOT NULL,
    author VARCHAR(255),
    created_at TIMESTAMP DEFAULT NOW()
);
```

### Database Triggers

```sql
-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_tasks_updated_at BEFORE UPDATE ON tasks
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

## MCP Tools for AI Agents

### 1. get_tasks Tool
```python
@mcp_server.tool()
async def get_tasks(
    user_id: str,
    repository: str = None,
    status: str = None,
    assignee: str = None
) -> List[TextContent]:
    """Get tasks assigned to user or in repository. AI agents use this to read tasks."""
```

**Purpose**: Allow AI agents to query tasks by user, repository, or status
**Input**: User ID, optional filters (repository, status, assignee)
**Output**: JSON array of task objects
**Use Cases**:
- "Show me all tasks assigned to john@company.com"
- "What tasks are pending in the auth-service repository?"

### 2. update_task_status Tool
```python
@mcp_server.tool()
async def update_task_status(
    task_id: str,
    new_status: str,
    updated_by: str,
    comment: str = None
) -> List[TextContent]:
    """Update task status. AI agents use this to mark tasks as completed, in-progress, etc."""
```

**Purpose**: Allow AI agents to change task status
**Input**: Task ID, new status, updater identity, optional comment
**Output**: Success confirmation
**Use Cases**:
- Mark task as completed after code review
- Set task to "blocked" when dependencies aren't met

### 3. create_task Tool
```python
@mcp_server.tool()
async def create_task(
    title: str,
    description: str,
    assignee_id: str,
    repository: str,
    priority: str = "medium",
    complexity: str = "medium",
    created_by: str = "ai-agent"
) -> List[TextContent]:
    """Create a new task. AI agents use this to assign new tasks to developers."""
```

**Purpose**: Allow AI agents to create and assign new tasks
**Input**: Task details, assignee, repository
**Output**: Created task ID and confirmation
**Use Cases**:
- Create follow-up tasks after code analysis
- Assign refactoring tasks based on code review

### 4. add_task_comment Tool
```python
@mcp_server.tool()
async def add_task_comment(
    task_id: str,
    comment: str,
    author: str = "ai-agent"
) -> List[TextContent]:
    """Add a comment to a task. AI agents use this to provide updates or context."""
```

**Purpose**: Allow AI agents to add contextual information
**Input**: Task ID, comment text, author
**Output**: Success confirmation
**Use Cases**:
- Add technical analysis to tasks
- Provide implementation suggestions

## REST API Endpoints for Extensions

### Task Management Endpoints

```python
# GET /api/tasks - Fetch tasks with filtering
@app.get("/api/tasks")
async def get_tasks_rest(
    user_id: str = None,
    repository: str = None,
    status: str = None,
    limit: int = 100
):

# PUT /api/tasks/{task_id}/status - Update task status
@app.put("/api/tasks/{task_id}/status")
async def update_task_status_rest(
    task_id: str,
    status_update: dict
):

# POST /api/tasks - Create new task
@app.post("/api/tasks")
async def create_task_rest(task_data: dict):

# GET /api/tasks/stream - Server-Sent Events for real-time updates
@app.get("/api/tasks/stream")
async def task_stream(user_id: str, repositories: str = None):
```

## Real-time Updates with Redis Streams

### Stream Structure

```python
# User-specific streams
"tasks:user:{user_id}" - Tasks assigned to specific user
"tasks:repo:{repository}" - Tasks in specific repository
"tasks:notifications" - Global notification stream
```

### Event Publishing

```python
async def publish_task_event(event_data: dict):
    """Publish task events to Redis streams for real-time updates"""

    task = event_data.get('task', {})
    assignee_id = event_data.get('assignee_id') or task.get('assignee_id')
    repository = event_data.get('repository') or task.get('repository')

    # Publish to user-specific stream
    if assignee_id:
        await redis_client.xadd(
            f"tasks:user:{assignee_id}",
            {
                'event_type': event_data['type'],
                'task_id': event_data['task_id'],
                'task_data': json.dumps(task),
                'timestamp': event_data['timestamp']
            }
        )

    # Publish to repository-specific stream
    if repository:
        await redis_client.xadd(
            f"tasks:repo:{repository}",
            {
                'event_type': event_data['type'],
                'task_id': event_data['task_id'],
                'task_data': json.dumps(task),
                'timestamp': event_data['timestamp']
            }
        )
```

### Event Types

- `task_assigned` - New task assigned to user
- `task_updated` - Task details changed
- `task_completed` - Task marked as completed
- `task_commented` - Comment added to task
- `task_deleted` - Task removed

## Server-Sent Events Implementation

### SSE Endpoint
```python
@app.get("/api/tasks/stream")
async def task_stream(user_id: str, repositories: str = None):
    """SSE endpoint for VSCode extension real-time updates"""

    async def event_generator():
        # Subscribe to Redis streams for this user
        streams = [f"tasks:user:{user_id}"]

        if repositories:
            for repo in repositories.split(','):
                streams.append(f"tasks:repo:{repo}")

        try:
            while True:
                # Read from Redis streams
                stream_data = await redis_client.xread(
                    {stream: '$' for stream in streams},
                    block=5000  # 5 second timeout
                )

                for stream, messages in stream_data:
                    for message_id, fields in messages:
                        event_data = {
                            'type': fields.get('event_type'),
                            'task_id': fields.get('task_id'),
                            'task': json.loads(fields.get('task_data', '{}')),
                            'timestamp': fields.get('timestamp')
                        }

                        yield f"data: {json.dumps(event_data)}\n\n"

                # Send heartbeat
                yield f"data: {json.dumps({'type': 'heartbeat', 'timestamp': datetime.utcnow().isoformat()})}\n\n"

        except asyncio.CancelledError:
            break
        except Exception as e:
            yield f"data: {json.dumps({'type': 'error', 'message': str(e)})}\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/plain",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "Access-Control-Allow-Origin": "*"
        }
    )
```

## Authentication & Authorization

### Token-based Authentication
```python
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

security = HTTPBearer()

async def verify_token(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Verify JWT token for API access"""
    try:
        # Decode and verify JWT token
        payload = jwt.decode(credentials.credentials, SECRET_KEY, algorithms=["HS256"])
        user_id = payload.get("user_id")
        if not user_id:
            raise HTTPException(status_code=401, detail="Invalid token")
        return user_id
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

# Apply to protected endpoints
@app.get("/api/tasks")
async def get_tasks_rest(user_id: str = Depends(verify_token)):
```

### MCP Authentication
```python
# MCP server authentication via API keys
@mcp_server.middleware
async def authenticate_mcp_request(request, call_next):
    """Authenticate MCP requests"""
    api_key = request.headers.get("X-API-Key")
    if not api_key or not verify_api_key(api_key):
        raise HTTPException(status_code=401, detail="Invalid API key")
    return await call_next(request)
```

## Error Handling & Logging

### Structured Error Responses
```python
class TaskError(Exception):
    def __init__(self, code: str, message: str, details: dict = None):
        self.code = code
        self.message = message
        self.details = details or {}

@app.exception_handler(TaskError)
async def task_error_handler(request, exc: TaskError):
    return JSONResponse(
        status_code=400,
        content={
            "error": {
                "code": exc.code,
                "message": exc.message,
                "details": exc.details
            }
        }
    )
```

### Logging Configuration
```python
import logging

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('/app/logs/mcp-server.log'),
        logging.StreamHandler()
    ]
)

logger = logging.getLogger("mcp-task-server")
```

## Deployment Configuration

### Docker Compose
```yaml
version: '3.8'
services:
  postgres:
    image: postgres:15
    environment:
      POSTGRES_DB: tasks_db
      POSTGRES_USER: tasks_user
      POSTGRES_PASSWORD: secure_password
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    command: redis-server --appendonly yes
    volumes:
      - redis_data:/data

  mcp-server:
    build: .
    ports:
      - "8000:8000"
    environment:
      DATABASE_URL: postgresql://tasks_user:secure_password@postgres:5432/tasks_db
      REDIS_URL: redis://redis:6379
      JWT_SECRET: your-secret-key
    depends_on:
      - postgres
      - redis
    volumes:
      - ./logs:/app/logs

volumes:
  postgres_data:
  redis_data:
```

### Environment Variables
```bash
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/tasks_db
REDIS_URL=redis://localhost:6379

# Authentication
JWT_SECRET=your-super-secret-key
API_KEY_SALT=your-api-key-salt

# Server
HOST=0.0.0.0
PORT=8000
DEBUG=false

# MCP
MCP_SERVER_NAME=task-manager
MCP_SERVER_VERSION=1.0.0
```

## Performance Considerations

### Connection Pooling
```python
# PostgreSQL connection pool
db_pool = await asyncpg.create_pool(
    DATABASE_URL,
    min_size=10,
    max_size=20,
    command_timeout=60
)

# Redis connection pool
redis_client = redis.Redis(
    host='localhost',
    port=6379,
    decode_responses=True,
    retry_on_timeout=True,
    max_connections=20
)
```

### Query Optimization
- Use database indexes on frequently queried fields
- Implement pagination for large result sets
- Use connection pooling for database and Redis
- Cache frequently accessed data in Redis

### Scaling Considerations
- **Horizontal scaling**: Multiple FastAPI instances behind load balancer
- **Database scaling**: Read replicas for query optimization
- **Redis clustering**: For high-throughput messaging
- **Connection limits**: Monitor and limit concurrent SSE connections

## Implementation Timeline

### Phase 1: Core MCP Server (2-3 weeks)
- Basic FastAPI setup with PostgreSQL
- Core MCP tools implementation
- Database schema creation
- Basic authentication

### Phase 2: REST API & Redis Integration (1-2 weeks)
- REST endpoints for extension
- Redis streams setup
- Event publishing system
- Basic SSE implementation

### Phase 3: Real-time Features (1-2 weeks)
- Complete SSE implementation
- Connection management
- Error handling and recovery
- Performance optimization

### Phase 4: Production Readiness (1 week)
- Docker containerization
- Monitoring and logging
- Security hardening
- Load testing

**Total Estimated Timeline: 5-8 weeks**

## Testing Strategy

### Unit Tests
- Test MCP tools individually
- Test REST API endpoints
- Test database operations
- Test Redis stream operations

### Integration Tests
- Test MCP + database integration
- Test SSE with Redis streams
- Test authentication flows
- Test error handling

### Load Tests
- SSE connection limits
- Database query performance
- Redis stream throughput
- Concurrent user handling

### End-to-End Tests
- AI agent task creation → VSCode notification
- VSCode task update → AI agent visibility
- Multi-user real-time updates
- Error recovery scenarios