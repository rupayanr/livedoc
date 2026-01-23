# CLAUDE.md — LiveDoc

## Project Overview

Real-time collaborative markdown editor. Multiple users can edit the same document simultaneously with live cursors and presence.

**Owner:** Rupayan Roy  
**Timeline:** Weeks 2–6 (Jan 27 – Mar 2)  
**Live URL:** livedoc.rupayan.dev (planned)  
**Design Doc:** `docs/livedoc-design.md`

---

## Tech Stack

### Frontend
- React 18 + TypeScript
- Vite
- CodeMirror 6 (editor)
- Y.js + y-codemirror.next (CRDT sync)
- react-markdown (preview)
- Tailwind CSS
- Zustand (state)

### Backend
- Python 3.11+
- FastAPI (async)
- WebSockets
- y-py (Y.js Python port)
- Redis (pub/sub for multi-instance)
- PostgreSQL (persistence)
- SQLAlchemy 2.0 (async ORM)

### Infrastructure
- Docker + docker-compose (local)
- Vercel (frontend)
- Railway (backend)
- Upstash (Redis)
- Neon (PostgreSQL)

---

## Project Structure

```
livedoc/
├── CLAUDE.md
├── README.md
├── docker-compose.yml
├── docs/
│   └── livedoc-design.md
├── frontend/
│   ├── package.json
│   ├── tsconfig.json
│   ├── vite.config.ts
│   ├── tailwind.config.js
│   ├── index.html
│   └── src/
│       ├── main.tsx
│       ├── App.tsx
│       ├── components/
│       │   ├── Editor/
│       │   │   ├── Editor.tsx
│       │   │   ├── CodeMirrorEditor.tsx
│       │   │   ├── Cursors.tsx
│       │   │   └── Toolbar.tsx
│       │   ├── Preview/
│       │   │   └── MarkdownPreview.tsx
│       │   └── Sidebar/
│       │       ├── UserList.tsx
│       │       └── DocumentList.tsx
│       ├── hooks/
│       │   ├── useYjs.ts
│       │   ├── useWebSocket.ts
│       │   └── useDocument.ts
│       ├── lib/
│       │   ├── yjs.ts
│       │   └── websocket.ts
│       ├── stores/
│       │   └── documentStore.ts
│       └── types/
│           └── index.ts
└── backend/
    ├── requirements.txt
    ├── Dockerfile
    ├── alembic.ini
    ├── alembic/
    └── app/
        ├── main.py
        ├── config.py
        ├── api/
        │   ├── routes/
        │   │   ├── documents.py
        │   │   └── websocket.py
        │   └── deps.py
        ├── core/
        │   ├── yjs_manager.py
        │   ├── room_manager.py
        │   └── redis_pubsub.py
        ├── models/
        │   └── document.py
        ├── schemas/
        │   └── document.py
        ├── repositories/
        │   └── document_repo.py
        └── services/
            └── document_service.py
```

---

## Coding Conventions

### Python (Backend)

```python
# Async everywhere
async def get_document(doc_id: str) -> Document:
    ...

# Type hints required
def process_message(content: str, user_id: int) -> dict[str, Any]:
    ...

# Pydantic for DTOs
class DocumentCreate(BaseModel):
    title: str
    content: str = ""

# Repository pattern
class DocumentRepository:
    async def get(self, id: str) -> Document | None:
        ...
```

### TypeScript (Frontend)

```typescript
// Functional components
export function Editor({ docId }: { docId: string }) {
  ...
}

// Custom hooks for logic
function useDocument(docId: string) {
  ...
}

// Explicit return types
function parseMarkdown(content: string): ParsedDocument {
  ...
}
```

---

## API Overview

### REST Endpoints

```
POST   /api/v1/documents           # Create doc
GET    /api/v1/documents           # List docs
GET    /api/v1/documents/{id}      # Get doc
DELETE /api/v1/documents/{id}      # Delete doc
```

### WebSocket

```
WS /api/v1/ws/{document_id}?name={userName}

# Client → Server
{ "type": "cursor", "payload": { "position": {...} } }

# Server → Client
{ "type": "user_joined", "payload": { "name": "...", "color": "..." } }
{ "type": "user_left", "payload": { "id": "..." } }
{ "type": "cursor", "payload": { "userId": "...", "position": {...} } }
```

Y.js sync messages are binary, handled automatically by y-websocket.

---

## Key Dependencies

### Frontend
```json
{
  "yjs": "^13.6",
  "y-websocket": "^1.5",
  "y-codemirror.next": "^0.3",
  "@codemirror/state": "^6.0",
  "@codemirror/view": "^6.0",
  "@codemirror/lang-markdown": "^6.0",
  "react-markdown": "^9.0",
  "zustand": "^4.5"
}
```

### Backend
```
fastapi>=0.109.0
uvicorn[standard]>=0.27.0
websockets>=12.0
ypy-websocket>=0.12.0
redis>=5.0.0
sqlalchemy[asyncio]>=2.0.0
asyncpg>=0.29.0
pydantic>=2.0.0
pydantic-settings>=2.0.0
```

---

## Commands

### Frontend
```bash
cd frontend
npm install
npm run dev        # http://localhost:5173
npm run build
```

### Backend
```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload  # http://localhost:8000
```

### Docker (Full Stack)
```bash
docker-compose up
```

---

## Environment Variables

### Backend (.env)
```
DATABASE_URL=postgresql+asyncpg://postgres:postgres@localhost:5432/livedoc
REDIS_URL=redis://localhost:6379
CORS_ORIGINS=["http://localhost:5173"]
```

### Frontend (.env)
```
VITE_API_URL=http://localhost:8000
VITE_WS_URL=ws://localhost:8000
```

---

## Database Schema

```sql
CREATE TABLE documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL DEFAULT 'Untitled',
    content TEXT NOT NULL DEFAULT '',
    y_state BYTEA,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
    user_name VARCHAR(100) NOT NULL,
    user_color VARCHAR(7) NOT NULL,
    cursor_position JSONB,
    connected_at TIMESTAMPTZ DEFAULT NOW(),
    last_seen_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## Milestones

- [ ] Week 2: Backend skeleton, WebSocket ping-pong
- [ ] Week 3: Y.js integration, two clients sync text
- [ ] Week 4: Live cursors, user presence
- [ ] Week 5: Markdown preview, UI polish
- [ ] Week 6: Error handling, deploy, docs

---

*Last updated: January 2025*
