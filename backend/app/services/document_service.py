import uuid

from sqlalchemy.ext.asyncio import AsyncSession

from app.models.document import Document
from app.repositories.document_repo import DocumentRepository
from app.schemas.document import DocumentCreate, DocumentUpdate


class DocumentService:
    def __init__(self, session: AsyncSession) -> None:
        self.repo = DocumentRepository(session)

    async def create_document(self, data: DocumentCreate) -> Document:
        return await self.repo.create(title=data.title, content=data.content)

    async def get_document(self, doc_id: uuid.UUID) -> Document | None:
        return await self.repo.get(doc_id)

    async def list_documents(self) -> list[Document]:
        return await self.repo.get_all()

    async def update_document(
        self, doc_id: uuid.UUID, data: DocumentUpdate
    ) -> Document | None:
        return await self.repo.update(
            doc_id, title=data.title, content=data.content
        )

    async def delete_document(self, doc_id: uuid.UUID) -> bool:
        return await self.repo.delete(doc_id)

    async def save_y_state(self, doc_id: uuid.UUID, y_state: bytes) -> Document | None:
        return await self.repo.update(doc_id, y_state=y_state)
