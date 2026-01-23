# LiveDoc

Real-time collaborative markdown editor.

![LiveDoc Preview](preview.png)

## ✨ Features

- **Real-time Collaboration** — Multiple users edit simultaneously
- **Live Cursors** — See where others are typing
- **User Presence** — Know who's in the document
- **Markdown Preview** — Side-by-side rendered view
- **Auto-Save** — Never lose your work

## 🛠 Tech Stack

**Frontend:** React, TypeScript, CodeMirror 6, Y.js, Tailwind  
**Backend:** FastAPI, WebSockets, Redis, PostgreSQL  
**Sync:** Y.js (CRDT-based conflict resolution)

## 🚀 Quick Start

### With Docker (Recommended)

```bash
docker-compose up
```

Frontend: http://localhost:5173  
Backend: http://localhost:8000

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

## 🏗 Architecture

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

## 📁 Project Structure

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

## 🔧 Environment Variables

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

## 📖 API

### REST
- `POST /api/v1/documents` — Create document
- `GET /api/v1/documents` — List documents
- `GET /api/v1/documents/{id}` — Get document
- `DELETE /api/v1/documents/{id}` — Delete document

### WebSocket
- `WS /api/v1/ws/{document_id}?name={userName}`

## 🧪 Testing

```bash
# Backend
cd backend
pytest

# Frontend
cd frontend
npm test
```

## 🚢 Deployment

- **Frontend:** Vercel
- **Backend:** Railway
- **Database:** Neon (PostgreSQL)
- **Cache:** Upstash (Redis)

## 📝 License

MIT

---

Made with ☕ by [Rupayan Roy](https://linkedin.com/in/rupayan-roy)
