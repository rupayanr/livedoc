import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.document import Document


class DocumentRepository:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def create(self, title: str, content: str = "") -> Document:
        document = Document(title=title, content=content)
        self.session.add(document)
        await self.session.flush()
        return document

    async def get(self, doc_id: uuid.UUID) -> Document | None:
        return await self.session.get(Document, doc_id)

    async def get_all(self) -> list[Document]:
        result = await self.session.execute(
            select(Document).order_by(Document.updated_at.desc())
        )
        return list(result.scalars().all())

    async def update(
        self,
        doc_id: uuid.UUID,
        title: str | None = None,
        content: str | None = None,
        y_state: bytes | None = None,
    ) -> Document | None:
        document = await self.get(doc_id)
        if document is None:
            return None

        if title is not None:
            document.title = title
        if content is not None:
            document.content = content
        if y_state is not None:
            document.y_state = y_state

        await self.session.flush()
        await self.session.refresh(document)
        return document

    async def delete(self, doc_id: uuid.UUID) -> bool:
        document = await self.get(doc_id)
        if document is None:
            return False

        await self.session.delete(document)
        await self.session.flush()
        return True
