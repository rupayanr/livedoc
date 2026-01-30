import asyncio
import logging
import uuid
from contextlib import asynccontextmanager
from datetime import datetime, timedelta, timezone
from typing import AsyncGenerator

from sqlalchemy import delete
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import async_session_maker
from app.core.yjs_manager import yjs_manager
from app.models.document import Session as SessionModel
from app.repositories.document_repo import DocumentRepository

logger = logging.getLogger(__name__)


class PersistenceManager:
    """
    Manages loading and saving Y.js document state to the database.

    - Loads Y.js state when a document is first accessed
    - Periodically saves Y.js state to database
    - Saves state when all clients disconnect from a document
    """

    def __init__(self) -> None:
        self._save_tasks: dict[uuid.UUID, asyncio.Task] = {}
        self._save_interval = 30.0  # Save every 30 seconds
        self._loaded_docs: set[uuid.UUID] = set()
        self._max_save_failures = 5  # Max consecutive failures before stopping auto-save
        self._save_failure_counts: dict[uuid.UUID, int] = {}

    @asynccontextmanager
    async def _get_session(self) -> AsyncGenerator[AsyncSession, None]:
        """Get a database session."""
        async with async_session_maker() as session:
            try:
                yield session
                await session.commit()
            except Exception:
                await session.rollback()
                raise

    async def load_document(self, document_id: uuid.UUID) -> bool:
        """
        Load Y.js state from database into memory.
        Returns True if document exists, False otherwise.
        """
        if document_id in self._loaded_docs:
            return True

        try:
            async with self._get_session() as session:
                repo = DocumentRepository(session)
                doc = await repo.get(document_id)

                if doc is None:
                    logger.warning(f"Document {document_id} not found in database")
                    return False

                if doc.y_state:
                    await yjs_manager.set_state(document_id, doc.y_state)
                    logger.info(f"Loaded Y.js state for document {document_id} ({len(doc.y_state)} bytes)")
                else:
                    logger.info(f"Document {document_id} has no Y.js state, starting fresh")

                self._loaded_docs.add(document_id)
                return True
        except Exception as e:
            logger.error(f"Failed to load document {document_id}: {e}")
            return False

    async def save_document(self, document_id: uuid.UUID) -> bool:
        """Save Y.js state to database. Returns True on success."""
        state = await yjs_manager.get_state(document_id)
        if state is None:
            return True  # Nothing to save is not an error

        content = await yjs_manager.get_content_as_text(document_id)

        try:
            async with self._get_session() as session:
                repo = DocumentRepository(session)
                await repo.update(document_id, content=content, y_state=state)
                logger.debug(f"Saved document {document_id} ({len(state)} bytes)")
                # Reset failure count on success
                self._save_failure_counts.pop(document_id, None)
                return True
        except Exception as e:
            logger.error(f"Failed to save document {document_id}: {e}")
            return False

    def start_auto_save(self, document_id: uuid.UUID) -> None:
        """Start periodic auto-save for a document."""
        if document_id in self._save_tasks:
            return

        async def save_loop() -> None:
            while True:
                await asyncio.sleep(self._save_interval)
                success = await self.save_document(document_id)

                if not success:
                    # Track failures
                    self._save_failure_counts[document_id] = \
                        self._save_failure_counts.get(document_id, 0) + 1

                    if self._save_failure_counts[document_id] >= self._max_save_failures:
                        logger.error(
                            f"Auto-save stopped for document {document_id} after "
                            f"{self._max_save_failures} consecutive failures"
                        )
                        break

        task = asyncio.create_task(save_loop())
        self._save_tasks[document_id] = task
        logger.info(f"Started auto-save for document {document_id}")

    def stop_auto_save(self, document_id: uuid.UUID) -> None:
        """Stop periodic auto-save for a document."""
        task = self._save_tasks.pop(document_id, None)
        if task:
            task.cancel()

    async def on_document_empty(self, document_id: uuid.UUID) -> None:
        """Called when all clients disconnect from a document."""
        self.stop_auto_save(document_id)

        # Final save
        await self.save_document(document_id)

        # Clear from memory
        yjs_manager.clear(document_id)
        self._loaded_docs.discard(document_id)


    async def cleanup_orphaned_sessions(self, max_age_hours: int = 1) -> int:
        """
        Clean up sessions that are older than max_age_hours.
        Called on server startup to remove sessions from previous runs.
        Returns the number of sessions deleted.
        """
        cutoff_time = datetime.now(timezone.utc) - timedelta(hours=max_age_hours)

        try:
            async with self._get_session() as session:
                # Delete sessions older than cutoff
                result = await session.execute(
                    delete(SessionModel).where(SessionModel.connected_at < cutoff_time)
                )
                deleted_count = result.rowcount
                if deleted_count > 0:
                    logger.info(f"Cleaned up {deleted_count} orphaned sessions")
                return deleted_count
        except Exception as e:
            logger.error(f"Failed to clean up orphaned sessions: {e}")
            return 0


persistence_manager = PersistenceManager()
