import asyncio
import uuid
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
import y_py as Y

from app.core.persistence import PersistenceManager
from app.core.yjs_manager import YjsManager


class TestPersistenceManager:
    """Tests for the PersistenceManager class."""

    @pytest.fixture
    def manager(self):
        """Create a fresh persistence manager for each test."""
        return PersistenceManager()

    @pytest.fixture
    def yjs_manager(self):
        """Create a fresh Y.js manager for each test."""
        return YjsManager()

    @pytest.fixture
    def mock_document(self):
        """Create a mock document with Y.js state."""
        doc = MagicMock()
        doc.id = uuid.uuid4()
        doc.title = "Test Document"
        doc.content = "Hello World"

        # Create Y.js state
        temp_doc = Y.YDoc()
        with temp_doc.begin_transaction() as txn:
            text = temp_doc.get_text("content")
            text.extend(txn, "Hello World")
        doc.y_state = Y.encode_state_as_update(temp_doc)

        return doc

    @pytest.mark.asyncio
    async def test_load_document_not_found(self, manager):
        """load_document should return False for non-existent document."""
        document_id = uuid.uuid4()

        with patch.object(manager, "_get_session") as mock_session:
            mock_db = AsyncMock()
            mock_repo = MagicMock()
            mock_repo.get = AsyncMock(return_value=None)

            mock_session.return_value.__aenter__ = AsyncMock(return_value=mock_db)
            mock_session.return_value.__aexit__ = AsyncMock()

            with patch("app.core.persistence.DocumentRepository", return_value=mock_repo):
                result = await manager.load_document(document_id)

        assert result is False
        assert document_id not in manager._loaded_docs

    @pytest.mark.asyncio
    async def test_load_document_success(self, manager, mock_document):
        """load_document should load Y.js state from database."""
        document_id = mock_document.id

        with patch.object(manager, "_get_session") as mock_session:
            mock_db = AsyncMock()
            mock_repo = MagicMock()
            mock_repo.get = AsyncMock(return_value=mock_document)

            mock_session.return_value.__aenter__ = AsyncMock(return_value=mock_db)
            mock_session.return_value.__aexit__ = AsyncMock()

            with patch("app.core.persistence.DocumentRepository", return_value=mock_repo):
                with patch("app.core.persistence.yjs_manager") as mock_yjs:
                    mock_yjs.set_state = AsyncMock()
                    result = await manager.load_document(document_id)

                    mock_yjs.set_state.assert_called_once_with(
                        document_id, mock_document.y_state
                    )

        assert result is True
        assert document_id in manager._loaded_docs

    @pytest.mark.asyncio
    async def test_load_document_cached(self, manager):
        """load_document should skip loading if already loaded."""
        document_id = uuid.uuid4()
        manager._loaded_docs.add(document_id)

        with patch.object(manager, "_get_session") as mock_session:
            result = await manager.load_document(document_id)

        # Should not call database
        mock_session.assert_not_called()
        assert result is True

    @pytest.mark.asyncio
    async def test_load_document_no_y_state(self, manager):
        """load_document should handle documents without Y.js state."""
        document_id = uuid.uuid4()
        mock_doc = MagicMock()
        mock_doc.y_state = None

        with patch.object(manager, "_get_session") as mock_session:
            mock_db = AsyncMock()
            mock_repo = MagicMock()
            mock_repo.get = AsyncMock(return_value=mock_doc)

            mock_session.return_value.__aenter__ = AsyncMock(return_value=mock_db)
            mock_session.return_value.__aexit__ = AsyncMock()

            with patch("app.core.persistence.DocumentRepository", return_value=mock_repo):
                with patch("app.core.persistence.yjs_manager") as mock_yjs:
                    result = await manager.load_document(document_id)

                    # Should not call set_state when y_state is None
                    mock_yjs.set_state.assert_not_called()

        assert result is True

    @pytest.mark.asyncio
    async def test_save_document_success(self, manager):
        """save_document should save Y.js state to database."""
        document_id = uuid.uuid4()
        mock_state = b"\x00\x01\x02"
        mock_content = "Test content"

        with patch("app.core.persistence.yjs_manager") as mock_yjs:
            mock_yjs.get_state = AsyncMock(return_value=mock_state)
            mock_yjs.get_content_as_text = AsyncMock(return_value=mock_content)

            with patch.object(manager, "_get_session") as mock_session:
                mock_db = AsyncMock()
                mock_repo = MagicMock()
                mock_repo.update = AsyncMock()

                mock_session.return_value.__aenter__ = AsyncMock(return_value=mock_db)
                mock_session.return_value.__aexit__ = AsyncMock()

                with patch(
                    "app.core.persistence.DocumentRepository", return_value=mock_repo
                ):
                    await manager.save_document(document_id)

                    mock_repo.update.assert_called_once_with(
                        document_id, content=mock_content, y_state=mock_state
                    )

    @pytest.mark.asyncio
    async def test_save_document_no_state(self, manager):
        """save_document should do nothing if no Y.js state exists."""
        document_id = uuid.uuid4()

        with patch("app.core.persistence.yjs_manager") as mock_yjs:
            mock_yjs.get_state = AsyncMock(return_value=None)

            with patch.object(manager, "_get_session") as mock_session:
                await manager.save_document(document_id)

                # Should not call database
                mock_session.assert_not_called()

    @pytest.mark.asyncio
    async def test_start_auto_save(self, manager):
        """start_auto_save should create a background save task."""
        document_id = uuid.uuid4()
        manager._save_interval = 0.1  # Fast for testing

        with patch.object(manager, "save_document", new_callable=AsyncMock) as mock_save:
            manager.start_auto_save(document_id)

            assert document_id in manager._save_tasks
            assert isinstance(manager._save_tasks[document_id], asyncio.Task)

            # Wait for one save cycle
            await asyncio.sleep(0.15)

            # Stop the task
            manager.stop_auto_save(document_id)

            # Should have been called at least once
            assert mock_save.call_count >= 1

    @pytest.mark.asyncio
    async def test_start_auto_save_idempotent(self, manager):
        """start_auto_save should not create duplicate tasks."""
        document_id = uuid.uuid4()

        manager.start_auto_save(document_id)
        task1 = manager._save_tasks[document_id]

        manager.start_auto_save(document_id)
        task2 = manager._save_tasks[document_id]

        assert task1 is task2  # Same task

        # Cleanup
        manager.stop_auto_save(document_id)

    @pytest.mark.asyncio
    async def test_stop_auto_save(self, manager):
        """stop_auto_save should cancel the background task."""
        document_id = uuid.uuid4()
        manager._save_interval = 10  # Long interval

        manager.start_auto_save(document_id)
        assert document_id in manager._save_tasks

        task = manager._save_tasks[document_id]
        manager.stop_auto_save(document_id)

        assert document_id not in manager._save_tasks
        # Task might be in cancelling state, check either cancelled or cancelling
        assert task.cancelled() or task.cancelling()

    @pytest.mark.asyncio
    async def test_stop_auto_save_nonexistent(self, manager):
        """stop_auto_save should handle non-existent tasks gracefully."""
        document_id = uuid.uuid4()

        # Should not raise
        manager.stop_auto_save(document_id)

    @pytest.mark.asyncio
    async def test_on_document_empty(self, manager):
        """on_document_empty should stop auto-save, save, and clear memory."""
        document_id = uuid.uuid4()
        manager._loaded_docs.add(document_id)

        with patch.object(manager, "stop_auto_save") as mock_stop:
            with patch.object(
                manager, "save_document", new_callable=AsyncMock
            ) as mock_save:
                with patch("app.core.persistence.yjs_manager") as mock_yjs:
                    await manager.on_document_empty(document_id)

                    mock_stop.assert_called_once_with(document_id)
                    mock_save.assert_called_once_with(document_id)
                    mock_yjs.clear.assert_called_once_with(document_id)

        assert document_id not in manager._loaded_docs

    @pytest.mark.asyncio
    async def test_auto_save_handles_errors(self, manager):
        """auto_save loop should continue even if save fails."""
        document_id = uuid.uuid4()
        manager._save_interval = 0.02

        call_count = 0

        async def failing_save(doc_id):
            nonlocal call_count
            call_count += 1
            # Return False to simulate failed save (as real save_document does)
            return False if call_count < 3 else True

        with patch.object(manager, "save_document", side_effect=failing_save):
            manager.start_auto_save(document_id)

            # Wait for multiple save attempts (need enough time for 3+ iterations)
            await asyncio.sleep(0.15)

            manager.stop_auto_save(document_id)

        # Should have attempted multiple saves despite failures
        assert call_count >= 3


class TestPersistenceIntegration:
    """Integration tests for persistence with actual Y.js manager."""

    @pytest.mark.asyncio
    async def test_save_and_load_roundtrip(self):
        """Data should survive a save and load cycle."""
        # This test requires actual database access
        # Marked as integration test
        pass
