import json
import time
import uuid
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.api.routes.websocket import (
    handle_json_message,
    handle_binary_message,
    handle_sync_message,
    validate_cursor_position,
    encode_sync_step_2,
    encode_update,
    check_rate_limit,
    LRURateLimiter,
    MessageType,
    SyncMessageType,
    MAX_MESSAGE_SIZE,
)
from app.core.room_manager import RoomManager


class TestWebSocketConnection:
    """Tests for WebSocket connection handling."""

    @pytest.mark.asyncio
    async def test_connect_receives_users_list(self, mock_websocket: MagicMock):
        """Connecting should receive a users_list message."""
        room_manager = RoomManager()
        document_id = uuid.uuid4()

        # Join the room
        with patch.object(room_manager, "_get_db_session", new_callable=MagicMock) as mock_db:
            mock_db.return_value.__aenter__ = AsyncMock()
            mock_db.return_value.__aexit__ = AsyncMock()
            session = await room_manager.join(document_id, mock_websocket, "TestUser")

        # Verify users_list was sent
        mock_websocket.send_json.assert_called()
        call_args = mock_websocket.send_json.call_args[0][0]
        assert call_args["type"] == "users_list"
        assert "users" in call_args["payload"]

    @pytest.mark.asyncio
    async def test_connect_assigns_color(self, mock_websocket: MagicMock):
        """Connecting should assign a consistent color based on name."""
        room_manager = RoomManager()
        document_id = uuid.uuid4()

        with patch.object(room_manager, "_get_db_session", new_callable=MagicMock) as mock_db:
            mock_db.return_value.__aenter__ = AsyncMock()
            mock_db.return_value.__aexit__ = AsyncMock()
            session = await room_manager.join(document_id, mock_websocket, "TestUser")

        assert "color" in session
        assert session["color"].startswith("#")
        assert len(session["color"]) == 7


class TestPingPong:
    """Tests for ping/pong message handling."""

    @pytest.mark.asyncio
    async def test_ping_receives_pong(self, mock_websocket: MagicMock):
        """Sending a ping should receive a pong response."""
        document_id = uuid.uuid4()
        session = {"id": uuid.uuid4(), "name": "TestUser", "color": "#abc123"}

        await handle_json_message(
            document_id,
            session,
            {"type": "ping"},
            mock_websocket,
        )

        mock_websocket.send_json.assert_called_once_with({"type": "pong"})


class TestUserNotifications:
    """Tests for user join/leave notifications."""

    @pytest.mark.asyncio
    async def test_user_joined_broadcast(self):
        """When a user joins, other users should be notified."""
        room_manager = RoomManager()
        document_id = uuid.uuid4()

        # First user joins
        ws1 = MagicMock()
        ws1.send_json = AsyncMock()
        ws1.send_bytes = AsyncMock()

        with patch.object(room_manager, "_get_db_session", new_callable=MagicMock) as mock_db:
            mock_db.return_value.__aenter__ = AsyncMock()
            mock_db.return_value.__aexit__ = AsyncMock()
            await room_manager.join(document_id, ws1, "User1")

        # Reset mock to check for user_joined
        ws1.send_json.reset_mock()

        # Second user joins
        ws2 = MagicMock()
        ws2.send_json = AsyncMock()
        ws2.send_bytes = AsyncMock()

        with patch.object(room_manager, "_get_db_session", new_callable=MagicMock) as mock_db:
            mock_db.return_value.__aenter__ = AsyncMock()
            mock_db.return_value.__aexit__ = AsyncMock()
            await room_manager.join(document_id, ws2, "User2")

        # First user should receive user_joined notification
        ws1.send_json.assert_called()
        join_call = ws1.send_json.call_args[0][0]
        assert join_call["type"] == "user_joined"
        assert join_call["payload"]["name"] == "User2"

    @pytest.mark.asyncio
    async def test_user_left_broadcast(self):
        """When a user leaves, other users should be notified."""
        room_manager = RoomManager()
        document_id = uuid.uuid4()

        # First user joins
        ws1 = MagicMock()
        ws1.send_json = AsyncMock()
        ws1.send_bytes = AsyncMock()

        with patch.object(room_manager, "_get_db_session", new_callable=MagicMock) as mock_db:
            mock_db.return_value.__aenter__ = AsyncMock()
            mock_db.return_value.__aexit__ = AsyncMock()
            session1 = await room_manager.join(document_id, ws1, "User1")

        # Second user joins
        ws2 = MagicMock()
        ws2.send_json = AsyncMock()
        ws2.send_bytes = AsyncMock()

        with patch.object(room_manager, "_get_db_session", new_callable=MagicMock) as mock_db:
            mock_db.return_value.__aenter__ = AsyncMock()
            mock_db.return_value.__aexit__ = AsyncMock()
            session2 = await room_manager.join(document_id, ws2, "User2")

        # Reset mock
        ws1.send_json.reset_mock()

        # Second user leaves
        with patch.object(room_manager, "_get_db_session", new_callable=MagicMock) as mock_db:
            mock_db.return_value.__aenter__ = AsyncMock()
            mock_db.return_value.__aexit__ = AsyncMock()
            await room_manager.leave(document_id, session2)

        # First user should receive user_left notification
        ws1.send_json.assert_called()
        leave_call = ws1.send_json.call_args[0][0]
        assert leave_call["type"] == "user_left"
        assert leave_call["payload"]["id"] == str(session2["id"])


class TestCursorBroadcast:
    """Tests for cursor position broadcasting."""

    @pytest.mark.asyncio
    async def test_cursor_forwarded_to_others(self):
        """Cursor messages should be forwarded to other users."""
        # Import the global room_manager that handle_json_message uses
        from app.api.routes import websocket as ws_module

        local_room_manager = RoomManager()
        document_id = uuid.uuid4()

        # First user joins
        ws1 = MagicMock()
        ws1.send_json = AsyncMock()
        ws1.send_bytes = AsyncMock()

        with patch.object(local_room_manager, "_get_db_session", new_callable=MagicMock) as mock_db:
            mock_db.return_value.__aenter__ = AsyncMock()
            mock_db.return_value.__aexit__ = AsyncMock()
            session1 = await local_room_manager.join(document_id, ws1, "User1")

        # Second user joins
        ws2 = MagicMock()
        ws2.send_json = AsyncMock()
        ws2.send_bytes = AsyncMock()

        with patch.object(local_room_manager, "_get_db_session", new_callable=MagicMock) as mock_db:
            mock_db.return_value.__aenter__ = AsyncMock()
            mock_db.return_value.__aexit__ = AsyncMock()
            session2 = await local_room_manager.join(document_id, ws2, "User2")

        # Reset mock
        ws1.send_json.reset_mock()

        # Patch the global room_manager used by handle_json_message
        with patch.object(ws_module, "room_manager", local_room_manager):
            # User2 sends cursor update via handle_json_message
            cursor_position = {"line": 5, "ch": 10}
            await handle_json_message(
                document_id,
                session2,
                {"type": "cursor", "payload": {"position": cursor_position}},
                ws2,
            )

        # User1 should receive the cursor update
        ws1.send_json.assert_called()
        cursor_call = ws1.send_json.call_args[0][0]
        assert cursor_call["type"] == "cursor"
        assert cursor_call["payload"]["userId"] == str(session2["id"])
        assert cursor_call["payload"]["name"] == "User2"
        assert cursor_call["payload"]["position"] == cursor_position

    @pytest.mark.asyncio
    async def test_cursor_not_sent_to_sender(self):
        """Cursor messages should not be sent back to the sender."""
        # Import the global room_manager that handle_json_message uses
        from app.api.routes import websocket as ws_module

        local_room_manager = RoomManager()
        document_id = uuid.uuid4()

        # Single user joins
        ws1 = MagicMock()
        ws1.send_json = AsyncMock()
        ws1.send_bytes = AsyncMock()

        with patch.object(local_room_manager, "_get_db_session", new_callable=MagicMock) as mock_db:
            mock_db.return_value.__aenter__ = AsyncMock()
            mock_db.return_value.__aexit__ = AsyncMock()
            session1 = await local_room_manager.join(document_id, ws1, "User1")

        # Reset mock after join messages
        ws1.send_json.reset_mock()

        # Patch the global room_manager used by handle_json_message
        with patch.object(ws_module, "room_manager", local_room_manager):
            # User sends cursor update
            await handle_json_message(
                document_id,
                session1,
                {"type": "cursor", "payload": {"position": {"line": 1, "ch": 0}}},
                ws1,
            )

        # User1 should NOT receive their own cursor (no other users in room)
        # Since there are no other users, send_json shouldn't be called for cursor
        cursor_calls = [
            call for call in ws1.send_json.call_args_list
            if call[0][0].get("type") == "cursor"
        ]
        assert len(cursor_calls) == 0


class TestLRURateLimiter:
    """Tests for LRU-bounded rate limiter."""

    def test_first_request_allowed(self):
        """First request from a client should be allowed."""
        limiter = LRURateLimiter(max_entries=100)
        assert limiter.check("client1") is True

    def test_within_limit_allowed(self):
        """Requests within the limit should be allowed."""
        limiter = LRURateLimiter(max_entries=100)
        client_id = "client1"
        # Make 100 requests (the default limit)
        for _ in range(100):
            assert limiter.check(client_id) is True

    def test_exceeds_limit_blocked(self):
        """Requests exceeding the limit should be blocked."""
        limiter = LRURateLimiter(max_entries=100)
        client_id = "client1"
        # Make 100 requests (the limit)
        for _ in range(100):
            limiter.check(client_id)
        # 101st request should be blocked
        assert limiter.check(client_id) is False

    def test_window_reset(self):
        """Rate limit should reset after the window expires."""
        limiter = LRURateLimiter(max_entries=100)
        client_id = "client1"

        # Exceed the limit
        for _ in range(101):
            limiter.check(client_id)

        # Simulate time passing by manipulating internal state
        limiter._data[client_id]["window_start"] = time.time() - 2.0

        # Should be allowed after window reset
        assert limiter.check(client_id) is True

    def test_remove_client(self):
        """Removing a client should clear their rate limit data."""
        limiter = LRURateLimiter(max_entries=100)
        client_id = "client1"
        limiter.check(client_id)
        assert client_id in limiter._data

        limiter.remove(client_id)
        assert client_id not in limiter._data

    def test_remove_nonexistent_client(self):
        """Removing a nonexistent client should not raise."""
        limiter = LRURateLimiter(max_entries=100)
        limiter.remove("nonexistent")  # Should not raise

    def test_evict_oldest_at_capacity(self):
        """Should evict oldest entry when at capacity."""
        limiter = LRURateLimiter(max_entries=3)

        # Fill to capacity
        limiter.check("client1")
        limiter.check("client2")
        limiter.check("client3")

        # Make client1 the oldest
        limiter._data["client1"]["window_start"] = time.time() - 100

        # Add a new client (should evict client1)
        limiter.check("client4")

        assert "client1" not in limiter._data
        assert "client4" in limiter._data

    def test_cleanup_stale_entries(self):
        """Periodic cleanup should remove stale entries."""
        limiter = LRURateLimiter(max_entries=100)
        limiter._cleanup_interval = 1  # Trigger cleanup on every check

        limiter.check("client1")
        # Make client1 stale
        limiter._data["client1"]["window_start"] = time.time() - 100

        # Trigger cleanup
        limiter.check("client2")

        assert "client1" not in limiter._data


class TestCursorValidation:
    """Tests for cursor position validation."""

    def test_valid_cursor(self):
        """Valid cursor position should pass."""
        assert validate_cursor_position({"line": 0, "ch": 0}) is True
        assert validate_cursor_position({"line": 100, "ch": 50}) is True

    def test_none_cursor_valid(self):
        """None cursor (cleared) should be valid."""
        assert validate_cursor_position(None) is True

    def test_invalid_type(self):
        """Non-dict cursor should be invalid."""
        assert validate_cursor_position("invalid") is False
        assert validate_cursor_position([1, 2]) is False
        assert validate_cursor_position(123) is False

    def test_missing_fields(self):
        """Cursor missing line or ch should be invalid."""
        assert validate_cursor_position({"line": 0}) is False
        assert validate_cursor_position({"ch": 0}) is False
        assert validate_cursor_position({}) is False

    def test_non_integer_values(self):
        """Non-integer line/ch values should be invalid."""
        assert validate_cursor_position({"line": "0", "ch": 0}) is False
        assert validate_cursor_position({"line": 0, "ch": "0"}) is False
        assert validate_cursor_position({"line": 1.5, "ch": 0}) is False

    def test_negative_values(self):
        """Negative line/ch values should be invalid."""
        assert validate_cursor_position({"line": -1, "ch": 0}) is False
        assert validate_cursor_position({"line": 0, "ch": -1}) is False

    def test_exceeds_bounds(self):
        """Line/ch values exceeding bounds should be invalid."""
        assert validate_cursor_position({"line": 1000001, "ch": 0}) is False
        assert validate_cursor_position({"line": 0, "ch": 10001}) is False


class TestMessageEncoding:
    """Tests for Y.js message encoding functions."""

    def test_encode_sync_step_2(self):
        """encode_sync_step_2 should prepend correct message type bytes."""
        update = b"test_update"
        result = encode_sync_step_2(update)

        assert result[0] == MessageType.SYNC
        assert result[1] == SyncMessageType.SYNC_STEP_2
        assert result[2:] == update

    def test_encode_update(self):
        """encode_update should prepend correct message type bytes."""
        update = b"test_update"
        result = encode_update(update)

        assert result[0] == MessageType.SYNC
        assert result[1] == SyncMessageType.UPDATE
        assert result[2:] == update

    def test_encode_empty_update(self):
        """Should handle empty update data."""
        result = encode_sync_step_2(b"")
        assert result == bytes([MessageType.SYNC, SyncMessageType.SYNC_STEP_2])


class TestHandleBinaryMessage:
    """Tests for binary message handling."""

    @pytest.mark.asyncio
    async def test_empty_message_ignored(self):
        """Empty binary message should be ignored."""
        ws = MagicMock()
        ws.send_bytes = AsyncMock()
        document_id = uuid.uuid4()

        await handle_binary_message(document_id, b"", ws)
        ws.send_bytes.assert_not_called()

    @pytest.mark.asyncio
    async def test_sync_message_handled(self):
        """Sync messages should be passed to handle_sync_message."""
        ws = MagicMock()
        ws.send_bytes = AsyncMock()
        document_id = uuid.uuid4()

        # Create a sync step 1 message (client requesting sync)
        message = bytes([MessageType.SYNC, SyncMessageType.SYNC_STEP_1])

        with patch("app.api.routes.websocket.handle_sync_message", new_callable=AsyncMock) as mock_sync:
            await handle_binary_message(document_id, message, ws)
            mock_sync.assert_called_once()

    @pytest.mark.asyncio
    async def test_awareness_message_broadcast(self):
        """Awareness messages should be broadcast to other clients."""
        ws = MagicMock()
        ws.send_bytes = AsyncMock()
        document_id = uuid.uuid4()

        # Create an awareness message
        message = bytes([MessageType.AWARENESS]) + b"awareness_data"

        with patch("app.api.routes.websocket.room_manager") as mock_rm:
            mock_rm.broadcast_bytes = AsyncMock()
            await handle_binary_message(document_id, message, ws)
            mock_rm.broadcast_bytes.assert_called_once_with(document_id, message, exclude=ws)


class TestHandleSyncMessage:
    """Tests for Y.js sync protocol message handling."""

    @pytest.mark.asyncio
    async def test_empty_sync_message_ignored(self):
        """Empty sync message should be ignored."""
        ws = MagicMock()
        ws.send_bytes = AsyncMock()
        document_id = uuid.uuid4()

        await handle_sync_message(document_id, b"", ws)
        ws.send_bytes.assert_not_called()

    @pytest.mark.asyncio
    async def test_sync_step_1_with_state_vector(self):
        """Sync step 1 with state vector should return updates."""
        ws = MagicMock()
        ws.send_bytes = AsyncMock()
        document_id = uuid.uuid4()

        # Sync step 1 message with a state vector
        message = bytes([SyncMessageType.SYNC_STEP_1]) + b"state_vector"

        with patch("app.api.routes.websocket.yjs_manager") as mock_yjs:
            mock_yjs.encode_state_as_update_from_vector = AsyncMock(return_value=b"updates")
            await handle_sync_message(document_id, message, ws)

            ws.send_bytes.assert_called_once()
            sent_data = ws.send_bytes.call_args[0][0]
            assert sent_data[0] == MessageType.SYNC
            assert sent_data[1] == SyncMessageType.SYNC_STEP_2

    @pytest.mark.asyncio
    async def test_sync_step_1_empty_state_vector(self):
        """Sync step 1 without state vector should send full state."""
        ws = MagicMock()
        ws.send_bytes = AsyncMock()
        document_id = uuid.uuid4()

        # Sync step 1 message without state vector
        message = bytes([SyncMessageType.SYNC_STEP_1])

        with patch("app.api.routes.websocket.yjs_manager") as mock_yjs:
            mock_yjs.get_state = AsyncMock(return_value=b"full_state")
            await handle_sync_message(document_id, message, ws)

            ws.send_bytes.assert_called_once()

    @pytest.mark.asyncio
    async def test_sync_step_2_applies_update(self):
        """Sync step 2 should apply the received update."""
        ws = MagicMock()
        ws.send_bytes = AsyncMock()
        document_id = uuid.uuid4()

        # Sync step 2 message with payload
        message = bytes([SyncMessageType.SYNC_STEP_2]) + b"client_state"

        with patch("app.api.routes.websocket.yjs_manager") as mock_yjs:
            mock_yjs.apply_update = AsyncMock()
            await handle_sync_message(document_id, message, ws)

            mock_yjs.apply_update.assert_called_once_with(document_id, b"client_state")

    @pytest.mark.asyncio
    async def test_update_applies_and_broadcasts(self):
        """Update messages should be applied and broadcast."""
        ws = MagicMock()
        ws.send_bytes = AsyncMock()
        document_id = uuid.uuid4()

        # Update message with payload
        message = bytes([SyncMessageType.UPDATE]) + b"update_data"

        with patch("app.api.routes.websocket.yjs_manager") as mock_yjs, \
             patch("app.api.routes.websocket.room_manager") as mock_rm:
            mock_yjs.apply_update = AsyncMock()
            mock_rm.broadcast_bytes = AsyncMock()

            await handle_sync_message(document_id, message, ws)

            mock_yjs.apply_update.assert_called_once_with(document_id, b"update_data")
            mock_rm.broadcast_bytes.assert_called_once()


class TestInvalidCursorHandling:
    """Tests for handling invalid cursor positions."""

    @pytest.mark.asyncio
    async def test_invalid_cursor_logged_and_ignored(self):
        """Invalid cursor positions should be logged and ignored."""
        from app.api.routes import websocket as ws_module

        ws = MagicMock()
        ws.send_json = AsyncMock()
        document_id = uuid.uuid4()
        session = {"id": uuid.uuid4(), "name": "TestUser", "color": "#abc123"}

        # Send cursor with invalid position (negative values)
        invalid_cursor = {"type": "cursor", "payload": {"position": {"line": -1, "ch": 0}}}

        with patch.object(ws_module, "room_manager") as mock_rm:
            mock_rm.broadcast_json = AsyncMock()
            await handle_json_message(document_id, session, invalid_cursor, ws)

            # Should not broadcast invalid cursor
            mock_rm.broadcast_json.assert_not_called()
