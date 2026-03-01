import uuid

from fastapi import APIRouter, HTTPException, status

from app.api.deps import DbSession
from app.schemas.document import (
    DocumentCreate,
    DocumentListItem,
    DocumentResponse,
    DocumentUpdate,
)
from app.services.document_service import DocumentService

router = APIRouter(prefix="/documents", tags=["documents"])


@router.post("", response_model=DocumentResponse, status_code=status.HTTP_201_CREATED)
async def create_document(data: DocumentCreate, db: DbSession) -> DocumentResponse:
    service = DocumentService(db)
    document = await service.create_document(data)
    return DocumentResponse.model_validate(document)


@router.get("", response_model=list[DocumentListItem])
async def list_documents(db: DbSession) -> list[DocumentListItem]:
    service = DocumentService(db)
    documents = await service.list_documents()
    return [DocumentListItem.model_validate(doc) for doc in documents]


@router.get("/{doc_id}", response_model=DocumentResponse)
async def get_document(doc_id: uuid.UUID, db: DbSession) -> DocumentResponse:
    service = DocumentService(db)
    document = await service.get_document(doc_id)
    if document is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Document not found"
        )
    return DocumentResponse.model_validate(document)


@router.patch("/{doc_id}", response_model=DocumentResponse)
async def update_document(
    doc_id: uuid.UUID, data: DocumentUpdate, db: DbSession
) -> DocumentResponse:
    service = DocumentService(db)
    document = await service.update_document(doc_id, data)
    if document is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Document not found"
        )
    return DocumentResponse.model_validate(document)


@router.delete("/{doc_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_document(doc_id: uuid.UUID, db: DbSession) -> None:
    service = DocumentService(db)
    deleted = await service.delete_document(doc_id)
    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Document not found"
        )


@router.get("/{doc_id}/check-username")
async def check_username_availability(doc_id: uuid.UUID, name: str) -> dict:
    """Check if a username is available in a document room."""
    from app.core.room_manager import room_manager

    is_taken = room_manager.is_name_taken(doc_id, name)
    return {"available": not is_taken, "name": name}
