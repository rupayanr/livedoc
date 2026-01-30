import json
import uuid
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.api.routes.websocket import handle_json_message
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
