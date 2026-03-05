# LiveDoc

Real-time collaborative markdown editor with live cursors and user presence.

![LiveDoc Preview](preview.png)

## Features

- **Real-time Collaboration** — Multiple users edit simultaneously with CRDT-based conflict resolution
- **Live Cursors** — See where others are typing in real-time
- **User Presence** — View active collaborators in the document
- **Markdown Preview** — Side-by-side rendered view
- **Version History** — Browse and restore previous versions
- **Auto-Save** — Automatic persistence every 30 seconds

## Tech Stack

| Layer | Technologies |
|-------|-------------|
| Frontend | React 18, TypeScript, CodeMirror 6, Y.js, Tailwind CSS |
| Backend | FastAPI, WebSockets, y-py, Redis, PostgreSQL |
| Sync | Y.js CRDT for conflict-free real-time collaboration |

## Quick Start

### Docker (Recommended)

```bash
docker-compose up
```

- Frontend: http://localhost:5173
- Backend: http://localhost:8000

### Manual Setup

**Backend:**
```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

**Frontend:**
```bash
cd frontend
npm install
npm run dev
```

## Architecture

```
┌─────────────┐     WebSocket      ┌─────────────┐
│   Client A  │◄──────────────────►│   FastAPI   │
│  (Y.js +    │                    │  + y-py +   │
│  CodeMirror)│     WebSocket      │   Redis     │
└─────────────┘◄──────────────────►│             │
                                   └──────┬──────┘
┌─────────────┐                           │
│   Client B  │◄──────────────────────────┘
└─────────────┘                    ┌──────▼──────┐
                                   │  PostgreSQL │
                                   └─────────────┘
```

## Project Structure

```
livedoc/
├── frontend/          # React + TypeScript
│   └── src/
│       ├── components/
│       ├── hooks/
│       └── lib/
└── backend/           # FastAPI + Python
    └── app/
        ├── api/
        ├── core/
        ├── models/
        └── services/
```

## Environment Variables

**Backend (.env):**
```
DATABASE_URL=postgresql+asyncpg://user:pass@localhost:5432/livedoc
REDIS_URL=redis://localhost:6379
```

**Frontend (.env):**
```
VITE_API_URL=http://localhost:8000
VITE_WS_URL=ws://localhost:8000
```

## API

### REST Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/documents` | Create document |
| GET | `/api/v1/documents` | List documents |
| GET | `/api/v1/documents/{id}` | Get document |
| PATCH | `/api/v1/documents/{id}` | Update document |
| DELETE | `/api/v1/documents/{id}` | Delete document |

### WebSocket

```
WS /api/v1/ws/{document_id}?name={userName}
```

## Testing

```bash
# Backend
cd backend && pytest

# Frontend
cd frontend && npm test
```

## Deployment

| Service | Platform |
|---------|----------|
| Frontend | Vercel |
| Backend | Railway |
| Database | Neon (PostgreSQL) |
| Cache | Upstash (Redis) |

## License

MIT

---

Built by [Rupayan Roy](https://linkedin.com/in/rupayan-roy)
