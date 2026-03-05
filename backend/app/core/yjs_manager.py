import logging
import uuid
from typing import Any

import y_py as Y

logger = logging.getLogger(__name__)


class YjsManager:
    """
    Manages Y.js document states using y-py for CRDT operations.

    Each document has an in-memory YDoc that can be synced with clients
    and persisted to the database.
    """

    def __init__(self) -> None:
        self._docs: dict[uuid.UUID, Y.YDoc] = {}

    def _get_or_create_doc(self, document_id: uuid.UUID) -> Y.YDoc:
        """Get or create a YDoc for a document."""
        if document_id not in self._docs:
            self._docs[document_id] = Y.YDoc()
        return self._docs[document_id]

    async def get_state(self, document_id: uuid.UUID) -> bytes | None:
        """Get the full Y.js state vector for a document."""
        if document_id not in self._docs:
            return None
        doc = self._docs[document_id]
        return Y.encode_state_as_update(doc)

    async def get_state_vector(self, document_id: uuid.UUID) -> bytes:
        """Get the state vector for computing diffs."""
        doc = self._get_or_create_doc(document_id)
        return Y.encode_state_vector(doc)

    async def apply_update(self, document_id: uuid.UUID, update: bytes) -> None:
        """Apply a Y.js update to the document, merging with existing state."""
        if not update:
            return
        try:
            doc = self._get_or_create_doc(document_id)
            Y.apply_update(doc, update)
        except Exception as e:
            logger.error(f"Failed to apply Y.js update for {document_id}: {e}")
            raise

    async def set_state(self, document_id: uuid.UUID, state: bytes) -> None:
        """Set the Y.js state for a document (used when loading from DB)."""
        if not state:
            return
        try:
            doc = self._get_or_create_doc(document_id)
            Y.apply_update(doc, state)
        except Exception as e:
            logger.error(f"Failed to set Y.js state for {document_id}: {e}")
            raise

    async def get_content_as_text(self, document_id: uuid.UUID) -> str:
        """Extract plain text content from the Y.js document."""
        if document_id not in self._docs:
            return ""
        doc = self._docs[document_id]
        try:
            ytext = doc.get_text("content")
            return str(ytext)
        except Exception:
            return ""

    async def encode_state_as_update_from_vector(
        self, document_id: uuid.UUID, state_vector: bytes
    ) -> bytes:
        """
        Encode the diff between the document state and a given state vector.
        Used to send only the missing updates to a client.
        """
        doc = self._get_or_create_doc(document_id)
        return Y.encode_state_as_update(doc, state_vector)

    def clear(self, document_id: uuid.UUID) -> None:
        """Clear the in-memory state for a document."""
        if document_id in self._docs:
            del self._docs[document_id]

    def has_doc(self, document_id: uuid.UUID) -> bool:
        """Check if a document exists in memory."""
        return document_id in self._docs


yjs_manager = YjsManager()
