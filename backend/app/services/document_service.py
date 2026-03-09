import uuid

from sqlalchemy.ext.asyncio import AsyncSession

from app.models.document import Document
from app.repositories.document_repo import DocumentRepository
from app.schemas.document import DocumentCreate, DocumentUpdate


class DocumentService:
    def __init__(self, session: AsyncSession) -> None:
        self.repo = DocumentRepository(session)

    async def create_document(
        self,
        data: DocumentCreate,
        created_by: str | None = None,
    ) -> Document:
        return await self.repo.create(
            title=data.title,
            content=data.content,
            created_by=created_by,
        )

    async def get_document(self, doc_id: uuid.UUID) -> Document | None:
        return await self.repo.get(doc_id)

    async def list_documents(self, user_name: str | None = None) -> list[Document]:
        return await self.repo.get_accessible(user_name)

    async def can_modify(self, doc_id: uuid.UUID, user_name: str | None) -> bool:
        """Check if the user can modify the document."""
        document = await self.repo.get(doc_id)
        if document is None:
            return False
        return self.repo.can_modify(document, user_name)

    async def update_document(
        self,
        doc_id: uuid.UUID,
        data: DocumentUpdate,
        user_name: str | None = None,
    ) -> Document | None:
        # Check ownership before updating
        document = await self.repo.get(doc_id)
        if document is None:
            return None
        if not self.repo.can_modify(document, user_name):
            raise PermissionError("You don't have permission to modify this document")
        return await self.repo.update(
            doc_id, title=data.title, content=data.content
        )

    async def delete_document(
        self,
        doc_id: uuid.UUID,
        user_name: str | None = None,
    ) -> bool:
        # Check ownership before deleting
        document = await self.repo.get(doc_id)
        if document is None:
            return False
        if not self.repo.can_modify(document, user_name):
            raise PermissionError("You don't have permission to delete this document")
        return await self.repo.delete(doc_id)

    async def save_y_state(self, doc_id: uuid.UUID, y_state: bytes) -> Document | None:
        return await self.repo.update(doc_id, y_state=y_state)
