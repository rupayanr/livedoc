import asyncio
import hashlib
import logging
import uuid
from contextlib import asynccontextmanager
from dataclasses import dataclass, field
from typing import Callable, Coroutine, Any, AsyncGenerator

from fastapi import WebSocket
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import async_session_maker
from app.repositories.session_repo import SessionRepository

logger = logging.getLogger(__name__)


def generate_color(name: str) -> str:
    """Generate a consistent color based on name hash using xxhash-style algorithm."""
    # Using a simple but fast hash (fnv-1a style)
    h = 2166136261  # FNV offset basis
    for char in name.encode():
        h ^= char
        h = (h * 16777619) & 0xFFFFFFFF  # FNV prime, keep 32-bit
    return f"#{h & 0xFFFFFF:06x}"


@dataclass
class UserSession:
    id: uuid.UUID
    name: str
    color: str
    websocket: WebSocket


@dataclass
class Room:
    document_id: uuid.UUID
    connections: dict[uuid.UUID, UserSession] = field(default_factory=dict)


# Type for room lifecycle callbacks
RoomCallback = Callable[[uuid.UUID], Coroutine[Any, Any, None]]


class RoomManager:
    def __init__(self) -> None:
        self.rooms: dict[uuid.UUID, Room] = {}
        self._on_room_created: RoomCallback | None = None
        self._on_room_empty: RoomCallback | None = None
        self._locks: dict[uuid.UUID, asyncio.Lock] = {}
        self._global_lock = asyncio.Lock()  # For creating new room locks

    def set_callbacks(
        self,
        on_room_created: RoomCallback | None = None,
        on_room_empty: RoomCallback | None = None,
    ) -> None:
        """Set callbacks for room lifecycle events."""
        self._on_room_created = on_room_created
        self._on_room_empty = on_room_empty

    @asynccontextmanager
    async def _get_db_session(self) -> AsyncGenerator[AsyncSession, None]:
        """Get a database session."""
        async with async_session_maker() as session:
            try:
                yield session
                await session.commit()
            except Exception:
                await session.rollback()
                raise

    async def _get_lock(self, document_id: uuid.UUID) -> asyncio.Lock:
        """Get or create a lock for a specific document."""
        async with self._global_lock:
            if document_id not in self._locks:
                self._locks[document_id] = asyncio.Lock()
            return self._locks[document_id]

    async def _get_or_create_room(self, document_id: uuid.UUID) -> Room:
        """Get or create a room with proper locking to prevent race conditions."""
        lock = await self._get_lock(document_id)
        async with lock:
            if document_id not in self.rooms:
                self.rooms[document_id] = Room(document_id=document_id)
                logger.info(f"Room created for document {document_id}")
                if self._on_room_created:
                    await self._on_room_created(document_id)
            return self.rooms[document_id]

    def is_room_empty(self, document_id: uuid.UUID) -> bool:
        """Check if a room has no connections."""
        room = self.rooms.get(document_id)
        return room is None or len(room.connections) == 0

    def is_name_taken(self, document_id: uuid.UUID, name: str) -> bool:
        """Check if a username is already taken in a room."""
        room = self.rooms.get(document_id)
        if room is None:
            return False
        return any(s.name.lower() == name.lower() for s in room.connections.values())

    async def join(
        self, document_id: uuid.UUID, websocket: WebSocket, name: str
    ) -> dict:
        room = await self._get_or_create_room(document_id)

        # Check for duplicate username
        if any(s.name.lower() == name.lower() for s in room.connections.values()):
            raise ValueError(f"Username '{name}' is already taken in this document")

        session = UserSession(
            id=uuid.uuid4(),
            name=name,
            color=generate_color(name),
            websocket=websocket,
        )
        room.connections[session.id] = session

        # Persist session to database
        try:
            async with self._get_db_session() as db:
                repo = SessionRepository(db)
                await repo.create(
                    session_id=session.id,
                    document_id=document_id,
                    user_name=session.name,
                    user_color=session.color,
                )
        except Exception:
            # Don't fail the connection if DB save fails
            pass

        # Notify others that user joined
        join_msg = {
            "type": "user_joined",
            "payload": {
                "id": str(session.id),
                "name": session.name,
                "color": session.color,
            },
        }
        await self.broadcast_json(document_id, join_msg, exclude=websocket)

        # Send current users list to the new user
        users = [
            {"id": str(s.id), "name": s.name, "color": s.color}
            for s in room.connections.values()
            if s.id != session.id
        ]
        await websocket.send_json({"type": "users_list", "payload": {"users": users}})

        return {"id": session.id, "name": session.name, "color": session.color}

    async def leave(self, document_id: uuid.UUID, session: dict) -> None:
        room = self.rooms.get(document_id)
        if room is None:
            return

        session_id = session["id"]
        if session_id in room.connections:
            del room.connections[session_id]

        # Remove session from database
        try:
            async with self._get_db_session() as db:
                repo = SessionRepository(db)
                await repo.delete(session_id)
        except Exception:
            # Don't fail if DB delete fails
            pass

        # Notify others that user left
        leave_msg = {
            "type": "user_left",
            "payload": {"id": str(session_id)},
        }
        await self.broadcast_json(document_id, leave_msg)

        # Clean up empty rooms
        if not room.connections:
            del self.rooms[document_id]
            # Clean up the lock for this document
            self._locks.pop(document_id, None)
            logger.info(f"Room cleaned up for document {document_id}")
            if self._on_room_empty:
                await self._on_room_empty(document_id)

    async def broadcast_bytes(
        self,
        document_id: uuid.UUID,
        data: bytes,
        exclude: WebSocket | None = None,
    ) -> None:
        room = self.rooms.get(document_id)
        if room is None:
            return

        dead_sessions: list[uuid.UUID] = []

        for session in list(room.connections.values()):
            if session.websocket != exclude:
                try:
                    await session.websocket.send_bytes(data)
                except Exception as e:
                    logger.warning(f"Failed to send bytes to {session.name}: {e}")
                    dead_sessions.append(session.id)

        # Clean up dead connections
        for session_id in dead_sessions:
            if session_id in room.connections:
                session = room.connections.pop(session_id)
                logger.info(f"Removed dead connection: {session.name}")
                await self.broadcast_json(document_id, {
                    "type": "user_left",
                    "payload": {"id": str(session_id)}
                })

    async def broadcast_json(
        self,
        document_id: uuid.UUID,
        data: dict,
        exclude: WebSocket | None = None,
    ) -> None:
        room = self.rooms.get(document_id)
        if room is None:
            return

        dead_sessions: list[uuid.UUID] = []

        for session in list(room.connections.values()):
            if session.websocket != exclude:
                try:
                    await session.websocket.send_json(data)
                except Exception as e:
                    logger.warning(f"Failed to send JSON to {session.name}: {e}")
                    dead_sessions.append(session.id)

        # Clean up dead connections (don't broadcast user_left to avoid recursion)
        for session_id in dead_sessions:
            if session_id in room.connections:
                session = room.connections.pop(session_id)
                logger.info(f"Removed dead connection: {session.name}")

    def get_users(self, document_id: uuid.UUID) -> list[dict]:
        room = self.rooms.get(document_id)
        if room is None:
            return []

        return [
            {"id": str(s.id), "name": s.name, "color": s.color}
            for s in room.connections.values()
        ]


room_manager = RoomManager()
