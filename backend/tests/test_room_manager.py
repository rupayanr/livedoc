import uuid
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.core.room_manager import RoomManager, generate_color


class TestGenerateColor:
    """Tests for the generate_color function."""

    def test_consistent_color(self):
        """Same name should always produce the same color."""
        color1 = generate_color("TestUser")
        color2 = generate_color("TestUser")
        assert color1 == color2

    def test_different_names_different_colors(self):
        """Different names should (likely) produce different colors."""
        color1 = generate_color("Alice")
        color2 = generate_color("Bob")
        assert color1 != color2

    def test_hex_format(self):
        """Colors should be valid hex format."""
        color = generate_color("TestUser")
        assert color.startswith("#")
        assert len(color) == 7
        # Verify it's valid hex
        int(color[1:], 16)

    def test_empty_name(self):
        """Empty name should still produce a valid color."""
        color = generate_color("")
        assert color.startswith("#")
        assert len(color) == 7


class TestRoomManager:
    """Tests for the RoomManager class."""

    @pytest.mark.asyncio
    async def test_join_creates_room(self, mock_websocket: MagicMock):
        """Joining a room that doesn't exist should create it."""
        room_manager = RoomManager()
        document_id = uuid.uuid4()

        assert document_id not in room_manager.rooms

        with patch.object(room_manager, "_get_db_session", new_callable=MagicMock) as mock_db:
            mock_db.return_value.__aenter__ = AsyncMock()
            mock_db.return_value.__aexit__ = AsyncMock()
            await room_manager.join(document_id, mock_websocket, "TestUser")

        assert document_id in room_manager.rooms
        assert len(room_manager.rooms[document_id].connections) == 1

    @pytest.mark.asyncio
    async def test_leave_removes_user(self, mock_websocket: MagicMock):
        """Leaving a room should remove the user from it."""
        room_manager = RoomManager()
        document_id = uuid.uuid4()

        with patch.object(room_manager, "_get_db_session", new_callable=MagicMock) as mock_db:
            mock_db.return_value.__aenter__ = AsyncMock()
            mock_db.return_value.__aexit__ = AsyncMock()
            session = await room_manager.join(document_id, mock_websocket, "TestUser")

        assert len(room_manager.rooms[document_id].connections) == 1

        with patch.object(room_manager, "_get_db_session", new_callable=MagicMock) as mock_db:
            mock_db.return_value.__aenter__ = AsyncMock()
            mock_db.return_value.__aexit__ = AsyncMock()
            await room_manager.leave(document_id, session)

        # Room should be cleaned up since it's empty
        assert document_id not in room_manager.rooms

    @pytest.mark.asyncio
    async def test_leave_cleans_empty_room(self, mock_websocket: MagicMock):
        """When the last user leaves, the room should be removed."""
        room_manager = RoomManager()
        document_id = uuid.uuid4()

        with patch.object(room_manager, "_get_db_session", new_callable=MagicMock) as mock_db:
            mock_db.return_value.__aenter__ = AsyncMock()
            mock_db.return_value.__aexit__ = AsyncMock()
            session = await room_manager.join(document_id, mock_websocket, "TestUser")

        assert document_id in room_manager.rooms

        with patch.object(room_manager, "_get_db_session", new_callable=MagicMock) as mock_db:
            mock_db.return_value.__aenter__ = AsyncMock()
            mock_db.return_value.__aexit__ = AsyncMock()
            await room_manager.leave(document_id, session)

        assert document_id not in room_manager.rooms

    @pytest.mark.asyncio
    async def test_broadcast_excludes_sender(self):
        """Broadcast should not send to the excluded websocket."""
        room_manager = RoomManager()
        document_id = uuid.uuid4()

        ws1 = MagicMock()
        ws1.send_json = AsyncMock()
        ws1.send_bytes = AsyncMock()

        ws2 = MagicMock()
        ws2.send_json = AsyncMock()
        ws2.send_bytes = AsyncMock()

        with patch.object(room_manager, "_get_db_session", new_callable=MagicMock) as mock_db:
            mock_db.return_value.__aenter__ = AsyncMock()
            mock_db.return_value.__aexit__ = AsyncMock()
            await room_manager.join(document_id, ws1, "User1")

        ws1.send_json.reset_mock()

        with patch.object(room_manager, "_get_db_session", new_callable=MagicMock) as mock_db:
            mock_db.return_value.__aenter__ = AsyncMock()
            mock_db.return_value.__aexit__ = AsyncMock()
            await room_manager.join(document_id, ws2, "User2")

        ws1.send_json.reset_mock()
        ws2.send_json.reset_mock()

        # Broadcast from ws1
        await room_manager.broadcast_json(
            document_id,
            {"type": "test", "data": "hello"},
            exclude=ws1,
        )

        # ws1 should NOT receive the message
        ws1.send_json.assert_not_called()
        # ws2 SHOULD receive the message
        ws2.send_json.assert_called_once()

    @pytest.mark.asyncio
    async def test_broadcast_bytes_excludes_sender(self):
        """Broadcast bytes should not send to the excluded websocket."""
        room_manager = RoomManager()
        document_id = uuid.uuid4()

        ws1 = MagicMock()
        ws1.send_json = AsyncMock()
        ws1.send_bytes = AsyncMock()

        ws2 = MagicMock()
        ws2.send_json = AsyncMock()
        ws2.send_bytes = AsyncMock()

        with patch.object(room_manager, "_get_db_session", new_callable=MagicMock) as mock_db:
            mock_db.return_value.__aenter__ = AsyncMock()
            mock_db.return_value.__aexit__ = AsyncMock()
            await room_manager.join(document_id, ws1, "User1")
            await room_manager.join(document_id, ws2, "User2")

        ws1.send_bytes.reset_mock()
        ws2.send_bytes.reset_mock()

        # Broadcast bytes from ws1
        await room_manager.broadcast_bytes(
            document_id,
            b"\x00\x01\x02",
            exclude=ws1,
        )

        # ws1 should NOT receive the message
        ws1.send_bytes.assert_not_called()
        # ws2 SHOULD receive the message
        ws2.send_bytes.assert_called_once_with(b"\x00\x01\x02")

    @pytest.mark.asyncio
    async def test_lifecycle_callback_on_room_created(self, mock_websocket: MagicMock):
        """on_room_created callback should be called when first user joins."""
        room_manager = RoomManager()
        document_id = uuid.uuid4()

        callback_called = False
        callback_doc_id = None

        async def on_created(doc_id: uuid.UUID) -> None:
            nonlocal callback_called, callback_doc_id
            callback_called = True
            callback_doc_id = doc_id

        room_manager.set_callbacks(on_room_created=on_created)

        with patch.object(room_manager, "_get_db_session", new_callable=MagicMock) as mock_db:
            mock_db.return_value.__aenter__ = AsyncMock()
            mock_db.return_value.__aexit__ = AsyncMock()
            await room_manager.join(document_id, mock_websocket, "TestUser")

        assert callback_called
        assert callback_doc_id == document_id

    @pytest.mark.asyncio
    async def test_lifecycle_callback_on_room_empty(self, mock_websocket: MagicMock):
        """on_room_empty callback should be called when last user leaves."""
        room_manager = RoomManager()
        document_id = uuid.uuid4()

        callback_called = False
        callback_doc_id = None

        async def on_empty(doc_id: uuid.UUID) -> None:
            nonlocal callback_called, callback_doc_id
            callback_called = True
            callback_doc_id = doc_id

        room_manager.set_callbacks(on_room_empty=on_empty)

        with patch.object(room_manager, "_get_db_session", new_callable=MagicMock) as mock_db:
            mock_db.return_value.__aenter__ = AsyncMock()
            mock_db.return_value.__aexit__ = AsyncMock()
            session = await room_manager.join(document_id, mock_websocket, "TestUser")

        assert not callback_called

        with patch.object(room_manager, "_get_db_session", new_callable=MagicMock) as mock_db:
            mock_db.return_value.__aenter__ = AsyncMock()
            mock_db.return_value.__aexit__ = AsyncMock()
            await room_manager.leave(document_id, session)

        assert callback_called
        assert callback_doc_id == document_id

    @pytest.mark.asyncio
    async def test_get_users(self, mock_websocket: MagicMock):
        """get_users should return list of users in room."""
        room_manager = RoomManager()
        document_id = uuid.uuid4()

        ws1 = MagicMock()
        ws1.send_json = AsyncMock()
        ws1.send_bytes = AsyncMock()

        ws2 = MagicMock()
        ws2.send_json = AsyncMock()
        ws2.send_bytes = AsyncMock()

        with patch.object(room_manager, "_get_db_session", new_callable=MagicMock) as mock_db:
            mock_db.return_value.__aenter__ = AsyncMock()
            mock_db.return_value.__aexit__ = AsyncMock()
            await room_manager.join(document_id, ws1, "User1")
            await room_manager.join(document_id, ws2, "User2")

        users = room_manager.get_users(document_id)
        assert len(users) == 2
        names = [u["name"] for u in users]
        assert "User1" in names
        assert "User2" in names

    @pytest.mark.asyncio
    async def test_get_users_empty_room(self):
        """get_users should return empty list for nonexistent room."""
        room_manager = RoomManager()
        document_id = uuid.uuid4()

        users = room_manager.get_users(document_id)
        assert users == []

    @pytest.mark.asyncio
    async def test_is_room_empty(self, mock_websocket: MagicMock):
        """is_room_empty should correctly report room status."""
        room_manager = RoomManager()
        document_id = uuid.uuid4()

        # Room doesn't exist yet
        assert room_manager.is_room_empty(document_id)

        with patch.object(room_manager, "_get_db_session", new_callable=MagicMock) as mock_db:
            mock_db.return_value.__aenter__ = AsyncMock()
            mock_db.return_value.__aexit__ = AsyncMock()
            session = await room_manager.join(document_id, mock_websocket, "TestUser")

        # Room has a user
        assert not room_manager.is_room_empty(document_id)

        with patch.object(room_manager, "_get_db_session", new_callable=MagicMock) as mock_db:
            mock_db.return_value.__aenter__ = AsyncMock()
            mock_db.return_value.__aexit__ = AsyncMock()
            await room_manager.leave(document_id, session)

        # Room is empty again (and removed)
        assert room_manager.is_room_empty(document_id)
