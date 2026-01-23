# LiveDoc — System Design Document

## Overview

**LiveDoc** is a real-time collaborative markdown editor. Multiple users can edit the same document simultaneously, seeing each other's cursors and changes in real-time.

**Why this project?**  
Demonstrates WebSocket expertise, conflict resolution, and full-stack production skills — all buried in Rupayan's enterprise work but not publicly visible.

---

## Features

### MVP (Must Have)

- [ ] Create and open documents
- [ ] Real-time collaborative editing (multiple users, same doc)
- [ ] Live cursors with user names/colors
- [ ] User presence indicator (who's in the doc)
- [ ] Markdown preview pane (side-by-side)
- [ ] Basic persistence (don't lose work on refresh)

### Nice to Have (Post-MVP)

- [ ] Document list / dashboard
- [ ] Share links (anyone with link can edit)
- [ ] Read-only sharing mode
- [ ] Version history / undo
- [ ] Export to .md file
- [ ] Syntax highlighting in preview

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        FRONTEND                              │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │  CodeMirror │  │   Y.js      │  │  Markdown Preview   │  │
│  │   Editor    │◄─┤   Binding   │  │    (react-markdown) │  │
│  └─────────────┘  └──────┬──────┘  └─────────────────────┘  │
│                          │                                   │
│                   ┌──────▼──────┐                            │
│                   │  WebSocket  │                            │
│                   │   Client    │                            │
│                   └──────┬──────┘                            │
└──────────────────────────┼──────────────────────────────────┘
                           │
                    WebSocket Connection
                           │
┌──────────────────────────▼──────────────────────────────────┐
│                        BACKEND                               │
│  ┌─────────────────────────────────────────────────────┐    │
│  │                   FastAPI Server                     │    │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  │    │
│  │  │  WebSocket  │  │    Y.js     │  │    REST     │  │    │
│  │  │   Handler   │  │   Server    │  │    API      │  │    │
│  │  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘  │    │
│  └─────────┼────────────────┼────────────────┼─────────┘    │
│            │                │                │               │
│  ┌─────────▼────────────────▼────────────────▼─────────┐    │
│  │                    Redis Pub/Sub                     │    │
│  │              (multi-instance sync)                   │    │
│  └─────────────────────────┬───────────────────────────┘    │
│                            │                                 │
│  ┌─────────────────────────▼───────────────────────────┐    │
│  │                    PostgreSQL                        │    │
│  │         (document storage, user sessions)            │    │
│  └─────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
```

---

## Tech Stack

| Layer | Technology | Reasoning |
|-------|------------|-----------|
| Editor | CodeMirror 6 | Best collab support, Y.js binding exists |
| CRDT | Y.js | Industry standard, handles conflicts |
| WebSocket | y-websocket (client) | Native Y.js integration |
| Backend WS | FastAPI + y-py | Python Y.js port |
| Pub/Sub | Redis | Multi-instance coordination |
| Database | PostgreSQL | Document persistence |
| Preview | react-markdown | Simple, extensible |
| Hosting | Railway (backend), Vercel (frontend) | Free tiers sufficient |

---

## Data Flow

### 1. User Opens Document

```
Client                          Server                         DB
  │                               │                             │
  │──── GET /api/docs/{id} ──────►│                             │
  │                               │────── SELECT doc ──────────►│
  │                               │◄───── doc data ─────────────│
  │◄─── { doc, users } ──────────│                             │
  │                               │                             │
  │──── WS: connect ─────────────►│                             │
  │──── WS: { type: "join" } ────►│                             │
  │                               │── Subscribe Redis channel ──│
  │◄─── WS: { type: "sync" } ────│  (doc:{id})                 │
  │                               │                             │
```

### 2. User Makes Edit

```
Client A                        Server                      Client B
  │                               │                             │
  │── WS: Y.js update ───────────►│                             │
  │                               │── Publish to Redis ────────►│
  │                               │                             │
  │                               │◄── Receive from Redis ─────│
  │                               │── WS: Y.js update ─────────►│
  │                               │                             │
  │                               │── Debounced save to DB ────►│
  │                               │                             │
```

### 3. Cursor/Presence Updates

```
Client A                        Server                      Client B
  │                               │                             │
  │── WS: { type: "cursor",  ────►│                             │
  │        position: {...} }      │                             │
  │                               │── Broadcast to room ───────►│
  │                               │                             │
  │◄── WS: { type: "cursor", ────│                             │
  │        user: "B", pos: {} }   │                             │
```

---

## Database Schema

```sql
-- Documents table
CREATE TABLE documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL DEFAULT 'Untitled',
    content TEXT NOT NULL DEFAULT '',
    y_state BYTEA,  -- Serialized Y.js state for recovery
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Active sessions (for presence)
CREATE TABLE sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
    user_name VARCHAR(100) NOT NULL,
    user_color VARCHAR(7) NOT NULL,  -- Hex color
    cursor_position JSONB,
    connected_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_seen_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for fast lookups
CREATE INDEX idx_sessions_document ON sessions(document_id);
```

---

## API Specification

### REST Endpoints

#### Create Document
```
POST /api/v1/documents
Request: { "title": "My Doc" }
Response: { "id": "uuid", "title": "My Doc", "created_at": "..." }
```

#### Get Document
```
GET /api/v1/documents/{id}
Response: {
  "id": "uuid",
  "title": "My Doc",
  "content": "# Hello",
  "users": [
    { "name": "Alice", "color": "#FF5733" }
  ]
}
```

#### List Documents
```
GET /api/v1/documents
Response: {
  "documents": [
    { "id": "uuid", "title": "My Doc", "updated_at": "..." }
  ]
}
```

#### Delete Document
```
DELETE /api/v1/documents/{id}
Response: { "success": true }
```

### WebSocket Protocol

#### Connection
```
WS /api/v1/ws/{document_id}?name={userName}
```

#### Client → Server Messages

```typescript
// Join room (sent automatically on connect)
{ "type": "join", "payload": { "name": "Alice" } }

// Y.js sync/update (binary, handled by y-websocket)
// These are binary messages, not JSON

// Cursor update
{ 
  "type": "cursor", 
  "payload": { 
    "position": { "line": 5, "ch": 12 },
    "selection": { "from": {...}, "to": {...} }  // optional
  } 
}

// Leave room (or just disconnect)
{ "type": "leave" }
```

#### Server → Client Messages

```typescript
// Initial sync (Y.js state)
// Binary Y.js message

// User joined
{
  "type": "user_joined",
  "payload": {
    "id": "session-uuid",
    "name": "Bob",
    "color": "#33FF57"
  }
}

// User left
{
  "type": "user_left",
  "payload": { "id": "session-uuid" }
}

// Cursor update from another user
{
  "type": "cursor",
  "payload": {
    "userId": "session-uuid",
    "name": "Bob",
    "color": "#33FF57",
    "position": { "line": 10, "ch": 5 }
  }
}

// Error
{
  "type": "error",
  "payload": { "message": "Document not found" }
}
```

---

## Frontend Structure

```
livedoc/frontend/
├── src/
│   ├── main.tsx                    # Entry point
│   ├── App.tsx                     # Router setup
│   ├── components/
│   │   ├── Editor/
│   │   │   ├── Editor.tsx          # Main editor wrapper
│   │   │   ├── CodeMirrorEditor.tsx # CodeMirror + Y.js binding
│   │   │   ├── Cursors.tsx         # Remote cursor overlays
│   │   │   └── Toolbar.tsx         # Editor toolbar
│   │   ├── Preview/
│   │   │   └── MarkdownPreview.tsx # Rendered markdown
│   │   ├── Sidebar/
│   │   │   ├── UserList.tsx        # Who's online
│   │   │   └── DocumentList.tsx    # Doc browser
│   │   └── Layout/
│   │       └── SplitPane.tsx       # Editor | Preview layout
│   ├── hooks/
│   │   ├── useYjs.ts               # Y.js document hook
│   │   ├── useWebSocket.ts         # WebSocket connection
│   │   ├── useCursors.ts           # Cursor tracking
│   │   └── useDocument.ts          # Document CRUD
│   ├── lib/
│   │   ├── yjs.ts                  # Y.js setup
│   │   └── websocket.ts            # WS client wrapper
│   ├── stores/
│   │   └── documentStore.ts        # Zustand store
│   ├── types/
│   │   └── index.ts                # TypeScript types
│   └── styles/
│       └── globals.css             # Tailwind + custom styles
├── public/
├── index.html
├── package.json
├── tsconfig.json
├── vite.config.ts
└── tailwind.config.js
```

---

## Backend Structure

```
livedoc/backend/
├── app/
│   ├── main.py                     # FastAPI app, startup/shutdown
│   ├── config.py                   # Settings via pydantic-settings
│   ├── api/
│   │   ├── __init__.py
│   │   ├── routes/
│   │   │   ├── documents.py        # REST endpoints
│   │   │   └── websocket.py        # WebSocket handler
│   │   └── deps.py                 # Dependency injection
│   ├── core/
│   │   ├── __init__.py
│   │   ├── yjs_manager.py          # Y.js document management
│   │   ├── room_manager.py         # Room/connection tracking
│   │   └── redis_pubsub.py         # Redis pub/sub wrapper
│   ├── models/
│   │   ├── __init__.py
│   │   └── document.py             # SQLAlchemy models
│   ├── schemas/
│   │   ├── __init__.py
│   │   └── document.py             # Pydantic schemas
│   ├── repositories/
│   │   ├── __init__.py
│   │   └── document_repo.py        # Data access layer
│   └── services/
│       ├── __init__.py
│       └── document_service.py     # Business logic
├── tests/
│   ├── conftest.py
│   ├── test_api/
│   └── test_core/
├── alembic/                        # DB migrations
│   ├── versions/
│   └── env.py
├── requirements.txt
├── Dockerfile
└── docker-compose.yml
```

---

## Key Implementation Details

### Y.js Setup (Frontend)

```typescript
// lib/yjs.ts
import * as Y from 'yjs'
import { WebsocketProvider } from 'y-websocket'

export function createYjsDocument(docId: string, userName: string) {
  const ydoc = new Y.Doc()
  
  const provider = new WebsocketProvider(
    import.meta.env.VITE_WS_URL,
    docId,
    ydoc,
    { params: { name: userName } }
  )
  
  const ytext = ydoc.getText('content')
  
  provider.awareness.setLocalStateField('user', {
    name: userName,
    color: generateColor(userName),
  })
  
  return { ydoc, provider, ytext }
}
```

### CodeMirror + Y.js Binding

```typescript
// components/Editor/CodeMirrorEditor.tsx
import { useEffect, useRef } from 'react'
import { EditorView, basicSetup } from 'codemirror'
import { markdown } from '@codemirror/lang-markdown'
import { yCollab } from 'y-codemirror.next'

export function CodeMirrorEditor({ ytext, provider }) {
  const containerRef = useRef<HTMLDivElement>(null)
  
  useEffect(() => {
    if (!containerRef.current) return
    
    const view = new EditorView({
      extensions: [
        basicSetup,
        markdown(),
        yCollab(ytext, provider.awareness),
      ],
      parent: containerRef.current,
    })
    
    return () => view.destroy()
  }, [ytext, provider])
  
  return <div ref={containerRef} className="h-full" />
}
```

### WebSocket Handler (Backend)

```python
# api/routes/websocket.py
from fastapi import WebSocket, WebSocketDisconnect
from app.core.room_manager import room_manager
from app.core.yjs_manager import yjs_manager

async def websocket_endpoint(
    websocket: WebSocket,
    document_id: str,
    name: str = "Anonymous"
):
    await websocket.accept()
    
    # Join room
    session = await room_manager.join(document_id, websocket, name)
    
    # Send initial Y.js state
    state = await yjs_manager.get_state(document_id)
    await websocket.send_bytes(state)
    
    try:
        while True:
            data = await websocket.receive()
            
            if "bytes" in data:
                # Y.js update
                await yjs_manager.apply_update(document_id, data["bytes"])
                await room_manager.broadcast(document_id, data["bytes"], exclude=websocket)
            
            elif "text" in data:
                # JSON message (cursor, etc.)
                message = json.loads(data["text"])
                await handle_message(document_id, session, message)
    
    except WebSocketDisconnect:
        await room_manager.leave(document_id, session)
```

### Cursor Rendering

```typescript
// components/Editor/Cursors.tsx
export function RemoteCursor({ user, position }) {
  return (
    <div
      className="absolute w-0.5 h-5 pointer-events-none"
      style={{
        backgroundColor: user.color,
        left: position.left,
        top: position.top,
      }}
    >
      <div
        className="absolute -top-5 left-0 px-1 text-xs text-white rounded whitespace-nowrap"
        style={{ backgroundColor: user.color }}
      >
        {user.name}
      </div>
    </div>
  )
}
```

---

## Error Handling

| Scenario | Handling |
|----------|----------|
| WebSocket disconnects | Auto-reconnect with exponential backoff (y-websocket handles this) |
| Document not found | Show error page, redirect to document list |
| Conflicting edits | Y.js CRDT resolves automatically |
| Server restart | Y.js state persisted to DB, recovered on reconnect |
| Redis unavailable | Fall back to single-instance mode (no multi-server sync) |

---

## Testing Strategy

### Unit Tests
- Y.js document operations
- Message parsing/serialization
- Cursor position calculations

### Integration Tests
- WebSocket connection lifecycle
- Multi-user sync scenarios
- Database persistence

### E2E Tests (Playwright)
- Open document → edit → see changes
- Two browsers → collaborative editing
- Disconnect → reconnect → state preserved

---

## Deployment

### Environment Variables

```bash
# Backend
DATABASE_URL=postgresql+asyncpg://user:pass@host:5432/livedoc
REDIS_URL=redis://default:pass@host:6379
CORS_ORIGINS=["https://livedoc.yourdomain.com"]

# Frontend
VITE_API_URL=https://api.livedoc.yourdomain.com
VITE_WS_URL=wss://api.livedoc.yourdomain.com
```

### Docker Compose (Local Dev)

```yaml
version: '3.8'
services:
  backend:
    build: ./backend
    ports:
      - "8000:8000"
    environment:
      - DATABASE_URL=postgresql+asyncpg://postgres:postgres@db:5432/livedoc
      - REDIS_URL=redis://redis:6379
    depends_on:
      - db
      - redis

  frontend:
    build: ./frontend
    ports:
      - "5173:5173"
    environment:
      - VITE_API_URL=http://localhost:8000
      - VITE_WS_URL=ws://localhost:8000

  db:
    image: postgres:15
    environment:
      POSTGRES_DB: livedoc
      POSTGRES_PASSWORD: postgres
    volumes:
      - pgdata:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine

volumes:
  pgdata:
```

---

## Milestones

| Week | Goal | Deliverable |
|------|------|-------------|
| 2 | Backend skeleton | WebSocket ping-pong working |
| 3 | Basic sync | Two clients sync text via Y.js |
| 4 | Cursors + presence | See other users and their cursors |
| 5 | UI polish | Markdown preview, clean layout |
| 6 | Ship it | Deployed, documented, bug-free |

---

## Open Questions

- [ ] Anonymous users vs. required names?
- [ ] Max users per document?
- [ ] Document size limits?
- [ ] Rate limiting strategy?

---

## Resources

- [Y.js Docs](https://docs.yjs.dev/)
- [y-websocket](https://github.com/yjs/y-websocket)
- [y-codemirror.next](https://github.com/yjs/y-codemirror.next)
- [CodeMirror 6](https://codemirror.net/)
- [FastAPI WebSockets](https://fastapi.tiangolo.com/advanced/websockets/)

---

*Last updated: January 21, 2025*
