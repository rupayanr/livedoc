import uuid

import pytest
import y_py as Y

from app.core.yjs_manager import YjsManager


class TestYjsManager:
    """Tests for the YjsManager class."""

    @pytest.mark.asyncio
    async def test_get_state_empty(self):
        """get_state should return None for non-existent document."""
        manager = YjsManager()
        document_id = uuid.uuid4()

        state = await manager.get_state(document_id)
        assert state is None

    @pytest.mark.asyncio
    async def test_apply_update_creates_doc(self):
        """apply_update should create a document if it doesn't exist."""
        manager = YjsManager()
        document_id = uuid.uuid4()

        # Create a Y.js update with some content
        temp_doc = Y.YDoc()
        with temp_doc.begin_transaction() as txn:
            text = temp_doc.get_text("content")
            text.extend(txn, "Hello World")
        update = Y.encode_state_as_update(temp_doc)

        # Apply the update
        await manager.apply_update(document_id, update)

        # Document should now exist
        assert manager.has_doc(document_id)

    @pytest.mark.asyncio
    async def test_get_content_as_text(self):
        """get_content_as_text should return the text content."""
        manager = YjsManager()
        document_id = uuid.uuid4()

        # Create and apply an update with text
        temp_doc = Y.YDoc()
        with temp_doc.begin_transaction() as txn:
            text = temp_doc.get_text("content")
            text.extend(txn, "Hello World")
        update = Y.encode_state_as_update(temp_doc)

        await manager.apply_update(document_id, update)

        content = await manager.get_content_as_text(document_id)
        assert content == "Hello World"

    @pytest.mark.asyncio
    async def test_get_content_as_text_empty(self):
        """get_content_as_text should return empty string for non-existent doc."""
        manager = YjsManager()
        document_id = uuid.uuid4()

        content = await manager.get_content_as_text(document_id)
        assert content == ""

    @pytest.mark.asyncio
    async def test_encode_state_from_vector(self):
        """encode_state_as_update_from_vector should return missing updates."""
        manager = YjsManager()
        document_id = uuid.uuid4()

        # Create document with initial content
        temp_doc = Y.YDoc()
        with temp_doc.begin_transaction() as txn:
            text = temp_doc.get_text("content")
            text.extend(txn, "Initial")
        update1 = Y.encode_state_as_update(temp_doc)
        await manager.apply_update(document_id, update1)

        # Get state vector before adding more content
        state_vector = await manager.get_state_vector(document_id)

        # Add more content
        temp_doc2 = Y.YDoc()
        Y.apply_update(temp_doc2, update1)
        with temp_doc2.begin_transaction() as txn:
            text = temp_doc2.get_text("content")
            text.extend(txn, " More")
        update2 = Y.encode_state_as_update(temp_doc2)
        await manager.apply_update(document_id, update2)

        # Get the diff update
        diff = await manager.encode_state_as_update_from_vector(document_id, state_vector)

        # Apply the diff to a new document with original state
        check_doc = Y.YDoc()
        Y.apply_update(check_doc, update1)
        Y.apply_update(check_doc, diff)

        # Should have the full content
        text = check_doc.get_text("content")
        assert str(text) == "Initial More"

    @pytest.mark.asyncio
    async def test_clear_removes_doc(self):
        """clear should remove the document from memory."""
        manager = YjsManager()
        document_id = uuid.uuid4()

        # Create document
        temp_doc = Y.YDoc()
        with temp_doc.begin_transaction() as txn:
            text = temp_doc.get_text("content")
            text.extend(txn, "Hello")
        update = Y.encode_state_as_update(temp_doc)
        await manager.apply_update(document_id, update)

        assert manager.has_doc(document_id)

        # Clear it
        manager.clear(document_id)

        assert not manager.has_doc(document_id)

    @pytest.mark.asyncio
    async def test_clear_nonexistent_doc(self):
        """clear should not raise error for non-existent document."""
        manager = YjsManager()
        document_id = uuid.uuid4()

        # Should not raise
        manager.clear(document_id)

    @pytest.mark.asyncio
    async def test_set_state(self):
        """set_state should restore document state."""
        manager = YjsManager()
        document_id = uuid.uuid4()

        # Create state from a temp document
        temp_doc = Y.YDoc()
        with temp_doc.begin_transaction() as txn:
            text = temp_doc.get_text("content")
            text.extend(txn, "Restored content")
        state = Y.encode_state_as_update(temp_doc)

        # Set state in manager
        await manager.set_state(document_id, state)

        # Verify content
        content = await manager.get_content_as_text(document_id)
        assert content == "Restored content"

    @pytest.mark.asyncio
    async def test_get_state_returns_bytes(self):
        """get_state should return bytes that can recreate the document."""
        manager = YjsManager()
        document_id = uuid.uuid4()

        # Create document
        temp_doc = Y.YDoc()
        with temp_doc.begin_transaction() as txn:
            text = temp_doc.get_text("content")
            text.extend(txn, "Test content")
        update = Y.encode_state_as_update(temp_doc)
        await manager.apply_update(document_id, update)

        # Get state
        state = await manager.get_state(document_id)
        assert state is not None
        assert isinstance(state, bytes)

        # Apply state to new document
        new_doc = Y.YDoc()
        Y.apply_update(new_doc, state)
        text = new_doc.get_text("content")
        assert str(text) == "Test content"

    @pytest.mark.asyncio
    async def test_has_doc(self):
        """has_doc should correctly report document existence."""
        manager = YjsManager()
        document_id = uuid.uuid4()

        assert not manager.has_doc(document_id)

        temp_doc = Y.YDoc()
        with temp_doc.begin_transaction() as txn:
            text = temp_doc.get_text("content")
            text.extend(txn, "Test")
        update = Y.encode_state_as_update(temp_doc)
        await manager.apply_update(document_id, update)

        assert manager.has_doc(document_id)

    @pytest.mark.asyncio
    async def test_multiple_updates_merge(self):
        """Multiple updates should be merged correctly."""
        manager = YjsManager()
        document_id = uuid.uuid4()

        # First update
        temp_doc1 = Y.YDoc()
        with temp_doc1.begin_transaction() as txn:
            text = temp_doc1.get_text("content")
            text.extend(txn, "Hello")
        update1 = Y.encode_state_as_update(temp_doc1)
        await manager.apply_update(document_id, update1)

        # Second update (simulating another client)
        # We need to apply update1 first to get the same base state
        temp_doc2 = Y.YDoc()
        Y.apply_update(temp_doc2, update1)
        with temp_doc2.begin_transaction() as txn:
            text = temp_doc2.get_text("content")
            text.extend(txn, " World")
        update2 = Y.encode_state_as_update(temp_doc2)
        await manager.apply_update(document_id, update2)

        content = await manager.get_content_as_text(document_id)
        assert content == "Hello World"
