import json
import logging
import re
import time
import uuid
from collections import defaultdict
from enum import IntEnum

from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from pydantic import ValidationError

from app.api.deps import async_session_maker
from app.core.auth import session_store
from app.core.persistence import persistence_manager
from app.core.room_manager import room_manager
from app.core.security_logger import security_logger
from app.core.yjs_manager import yjs_manager
from app.repositories.document_repo import DocumentRepository
from app.schemas.document import UsernameParam, MAX_USERNAME_LENGTH

router = APIRouter()
logger = logging.getLogger(__name__)

# Rate limiting configuration
RATE_LIMIT_WINDOW = 1.0  # seconds
RATE_LIMIT_MAX_MESSAGES = 100  # max messages per window
RATE_LIMIT_MAX_ENTRIES = 10_000  # Maximum clients to track

# Message size limits
MAX_MESSAGE_SIZE = 1 * 1024 * 1024  # 1MB max message size


class LRURateLimiter:
    """LRU-bounded rate limiter to prevent memory exhaustion."""

    def __init__(self, max_entries: int = RATE_LIMIT_MAX_ENTRIES):
        self._data: dict[str, dict] = {}
        self._max_entries = max_entries
        self._cleanup_counter = 0
        self._cleanup_interval = 100  # Cleanup every N checks

    def check(self, client_id: str) -> bool:
        """Check if client is within rate limit. Returns True if allowed."""
        now = time.time()

        # Periodic cleanup of stale entries
        self._cleanup_counter += 1
        if self._cleanup_counter >= self._cleanup_interval:
            self._cleanup_stale(now)
            self._cleanup_counter = 0

        # Evict oldest if at capacity
        if client_id not in self._data and len(self._data) >= self._max_entries:
            self._evict_oldest()

        if client_id not in self._data:
            self._data[client_id] = {"count": 1, "window_start": now}
            return True

        data = self._data[client_id]

        if now - data["window_start"] > RATE_LIMIT_WINDOW:
            # Reset window
            data["count"] = 1
            data["window_start"] = now
            return True

        data["count"] += 1
        return data["count"] <= RATE_LIMIT_MAX_MESSAGES

    def remove(self, client_id: str) -> None:
        """Remove a client from tracking."""
        self._data.pop(client_id, None)

    def _cleanup_stale(self, now: float) -> None:
        """Remove entries with expired windows."""
        stale_keys = [
            k for k, v in self._data.items()
            if now - v["window_start"] > RATE_LIMIT_WINDOW * 10
        ]
        for k in stale_keys:
            del self._data[k]

    def _evict_oldest(self) -> None:
        """Evict the oldest entry by window_start time."""
        if not self._data:
            return
        oldest_key = min(self._data.keys(), key=lambda k: self._data[k]["window_start"])
        del self._data[oldest_key]


_rate_limiter = LRURateLimiter()


class MessageType(IntEnum):
    """y-websocket protocol message types."""
    SYNC = 0
    AWARENESS = 1


class SyncMessageType(IntEnum):
    """Sync protocol message types."""
    SYNC_STEP_1 = 0  # Client sends state vector
    SYNC_STEP_2 = 1  # Server sends missing updates
    UPDATE = 2       # Incremental update


def encode_sync_step_2(update: bytes) -> bytes:
    """Encode an update as sync step 2 message."""
    return bytes([MessageType.SYNC, SyncMessageType.SYNC_STEP_2]) + update


def encode_update(update: bytes) -> bytes:
    """Encode an update message."""
    return bytes([MessageType.SYNC, SyncMessageType.UPDATE]) + update


async def on_room_created(document_id: uuid.UUID) -> None:
    """Called when a new room is created (first client joins)."""
    await persistence_manager.load_document(document_id)
    persistence_manager.start_auto_save(document_id)


async def on_room_empty(document_id: uuid.UUID) -> None:
    """Called when a room becomes empty (last client leaves)."""
    await persistence_manager.on_document_empty(document_id)


# Set up room lifecycle callbacks
room_manager.set_callbacks(
    on_room_created=on_room_created,
    on_room_empty=on_room_empty,
)


def check_rate_limit(client_id: str) -> bool:
    """Check if client has exceeded rate limit. Returns True if allowed."""
    return _rate_limiter.check(client_id)


def validate_cursor_position(position: dict | None) -> bool:
    """Validate cursor position data."""
    if position is None:
        return True  # Allow None for cursor cleared

    if not isinstance(position, dict):
        return False

    line = position.get("line")
    ch = position.get("ch")

    # Validate line and character are non-negative integers
    if not isinstance(line, int) or not isinstance(ch, int):
        return False

    if line < 0 or ch < 0:
        return False

    # Reasonable upper bounds
    if line > 1000000 or ch > 10000:
        return False

    return True


@router.websocket("/ws/{document_id}")
async def websocket_endpoint(
    websocket: WebSocket,
    document_id: uuid.UUID,
    name: str = "Anonymous",
    token: str | None = None,
) -> None:
    # Get client IP for logging
    client_ip = None
    if websocket.client:
        client_ip = websocket.client.host

    # SECURITY: Require authentication token
    if not token:
        security_logger.websocket_rejected(
            reason="missing_token",
            document_id=str(document_id),
            user_name=name[:50],
            client_ip=client_ip,
        )
        await websocket.close(code=4001, reason="Authentication required")
        return

    # Validate token and get session
    session = session_store.get_session(token)
    if not session:
        security_logger.websocket_rejected(
            reason="invalid_token",
            document_id=str(document_id),
            user_name=name[:50],
            client_ip=client_ip,
        )
        await websocket.close(code=4001, reason="Invalid or expired token")
        return

    # Use authenticated username from session
    name = session.user_name
    logger.debug(f"WebSocket using authenticated session for {name}")

    # Validate username
    try:
        validated = UsernameParam(name=name)
        name = validated.name
    except ValidationError:
        security_logger.websocket_rejected(
            reason="invalid_username",
            document_id=str(document_id),
            user_name=name[:50],
            client_ip=client_ip,
        )
        await websocket.close(code=4003, reason="Invalid username")
        return

    # Verify document exists before accepting connection
    async with async_session_maker() as session:
        repo = DocumentRepository(session)
        doc = await repo.get(document_id)
        if doc is None:
            security_logger.websocket_rejected(
                reason="document_not_found",
                document_id=str(document_id),
                user_name=name,
                client_ip=client_ip,
            )
            await websocket.close(code=4004, reason="Document not found")
            return

    await websocket.accept()

    # Atomic username check and join
    try:
        user_session = await room_manager.join(document_id, websocket, name)
    except ValueError:
        # Username was taken (atomic check inside join())
        security_logger.websocket_rejected(
            reason="username_taken",
            document_id=str(document_id),
            user_name=name,
            client_ip=client_ip,
        )
        await websocket.close(code=4009, reason="Username already taken")
        return

    logger.info(f"WebSocket connected: user={name}, document={document_id}")
    client_id = str(user_session["id"])

    try:
        while True:
            try:
                data = await websocket.receive()

                # Rate limiting
                if not check_rate_limit(client_id):
                    security_logger.rate_limit_exceeded(
                        endpoint="websocket",
                        client_ip=client_ip,
                    )
                    await websocket.send_json({
                        "type": "error",
                        "payload": {"message": "Rate limit exceeded"}
                    })
                    continue

                if "bytes" in data:
                    message_bytes = data["bytes"]

                    # Check message size limit
                    if len(message_bytes) > MAX_MESSAGE_SIZE:
                        security_logger.log_security_event(
                            "websocket_message_too_large",
                            size=len(message_bytes),
                            limit=MAX_MESSAGE_SIZE,
                            client_ip=client_ip,
                            user_name=name,
                        )
                        await websocket.send_json({
                            "type": "error",
                            "payload": {"message": "Message too large"}
                        })
                        continue

                    await handle_binary_message(document_id, message_bytes, websocket)

                elif "text" in data:
                    text_data = data["text"]

                    # Check message size limit for text
                    if len(text_data) > MAX_MESSAGE_SIZE:
                        security_logger.log_security_event(
                            "websocket_message_too_large",
                            size=len(text_data),
                            limit=MAX_MESSAGE_SIZE,
                            client_ip=client_ip,
                            user_name=name,
                        )
                        await websocket.send_json({
                            "type": "error",
                            "payload": {"message": "Message too large"}
                        })
                        continue

                    # JSON message (cursor updates, etc.)
                    try:
                        message = json.loads(text_data)
                        await handle_json_message(document_id, user_session, message, websocket)
                    except json.JSONDecodeError:
                        logger.debug(f"Invalid JSON received from client {client_id}")
                        pass

            except Exception as e:
                # Log error but continue - don't break the connection
                if "disconnect" in str(e).lower():
                    raise WebSocketDisconnect()
                logger.error(f"Error processing message from {client_id}: {e}")
                continue

    except WebSocketDisconnect:
        logger.info(f"WebSocket disconnected: user={name}, document={document_id}")
        await room_manager.leave(document_id, user_session)
    except Exception as e:
        logger.error(f"Unexpected error for {client_id}: {e}")
        await room_manager.leave(document_id, user_session)
    finally:
        # Clean up rate limit data
        _rate_limiter.remove(client_id)


async def handle_binary_message(
    document_id: uuid.UUID,
    message: bytes,
    websocket: WebSocket,
) -> None:
    """Handle y-websocket binary protocol messages."""
    if len(message) < 1:
        return

    msg_type = message[0]

    if msg_type == MessageType.SYNC:
        await handle_sync_message(document_id, message[1:], websocket)

    elif msg_type == MessageType.AWARENESS:
        # Awareness messages are broadcast as-is to all other clients
        await room_manager.broadcast_bytes(document_id, message, exclude=websocket)


async def handle_sync_message(
    document_id: uuid.UUID,
    message: bytes,
    websocket: WebSocket,
) -> None:
    """Handle Y.js sync protocol messages."""
    if len(message) < 1:
        return

    sync_type = message[0]
    payload = message[1:]

    if sync_type == SyncMessageType.SYNC_STEP_1:
        # Client is requesting sync - payload is their state vector
        # Send back the updates they're missing (sync step 2)
        if len(payload) > 0:
            update = await yjs_manager.encode_state_as_update_from_vector(
                document_id, payload
            )
        else:
            # No state vector provided, send full state
            state = await yjs_manager.get_state(document_id)
            update = state if state else b""

        # CRITICAL: Always send SYNC_STEP_2 response, even for empty documents
        # Empty bytes b"" is falsy, but mobile clients hang if we don't respond
        response = encode_sync_step_2(update if update else b"")
        await websocket.send_bytes(response)

    elif sync_type == SyncMessageType.SYNC_STEP_2:
        # Client sent us their state (response to our sync step 1)
        # Apply it to our document
        if payload:
            await yjs_manager.apply_update(document_id, payload)

    elif sync_type == SyncMessageType.UPDATE:
        # Incremental update from client
        if payload:
            await yjs_manager.apply_update(document_id, payload)
            # Broadcast to other clients
            full_message = bytes([MessageType.SYNC, SyncMessageType.UPDATE]) + payload
            await room_manager.broadcast_bytes(
                document_id, full_message, exclude=websocket
            )


async def handle_json_message(
    document_id: uuid.UUID,
    session: dict,
    message: dict,
    websocket: WebSocket,
) -> None:
    """Handle JSON protocol messages (custom messages)."""
    msg_type = message.get("type")

    if msg_type == "cursor":
        # Validate cursor position
        position = message.get("payload", {}).get("position")
        if not validate_cursor_position(position):
            logger.warning(f"Invalid cursor position from {session['id']}: {position}")
            return

        # Broadcast cursor position to other users
        cursor_msg = {
            "type": "cursor",
            "payload": {
                "userId": str(session["id"]),
                "name": session["name"],
                "color": session["color"],
                "position": position,
            },
        }
        await room_manager.broadcast_json(document_id, cursor_msg, exclude=websocket)

    elif msg_type == "ping":
        await websocket.send_json({"type": "pong"})
