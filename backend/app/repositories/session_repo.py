import uuid
from datetime import datetime, timezone

from sqlalchemy import delete
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.document import Session


class SessionRepository:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def create(
        self,
        session_id: uuid.UUID,
        document_id: uuid.UUID,
        user_name: str,
        user_color: str,
    ) -> Session:
        db_session = Session(
            id=session_id,
            document_id=document_id,
            user_name=user_name,
            user_color=user_color,
        )
        self.session.add(db_session)
        await self.session.flush()
        return db_session

    async def delete(self, session_id: uuid.UUID) -> bool:
        result = await self.session.execute(
            delete(Session).where(Session.id == session_id)
        )
        return result.rowcount > 0

    async def update_last_seen(self, session_id: uuid.UUID) -> None:
        db_session = await self.session.get(Session, session_id)
        if db_session:
            db_session.last_seen_at = datetime.now(timezone.utc)
            await self.session.flush()

    async def update_cursor(
        self, session_id: uuid.UUID, cursor_position: dict | None
    ) -> None:
        db_session = await self.session.get(Session, session_id)
        if db_session:
            db_session.cursor_position = cursor_position
            db_session.last_seen_at = datetime.now(timezone.utc)
            await self.session.flush()
