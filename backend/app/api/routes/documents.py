import uuid

from fastapi import APIRouter, HTTPException, Query, Request, status
from pydantic import ValidationError
from slowapi import Limiter
from slowapi.util import get_remote_address

from app.api.deps import CurrentUser, DbSession, OptionalUser
from app.schemas.document import (
    DocumentCreate,
    DocumentListItem,
    DocumentResponse,
    DocumentUpdate,
    UsernameParam,
    MAX_USERNAME_LENGTH,
)
from app.services.document_service import DocumentService

router = APIRouter(prefix="/documents", tags=["documents"])
limiter = Limiter(key_func=get_remote_address)


@router.post("", response_model=DocumentResponse, status_code=status.HTTP_201_CREATED)
@limiter.limit("10/minute")
async def create_document(
    request: Request,
    data: DocumentCreate,
    db: DbSession,
    user: CurrentUser,
) -> DocumentResponse:
    """Create a new document. Requires authentication."""
    service = DocumentService(db)
    document = await service.create_document(data, created_by=user.user_name)
    return DocumentResponse.model_validate(document)


@router.get("", response_model=list[DocumentListItem])
@limiter.limit("60/minute")
async def list_documents(
    request: Request,
    db: DbSession,
    user: OptionalUser,
) -> list[DocumentListItem]:
    """List accessible documents. Shows public docs + user's own docs if authenticated."""
    service = DocumentService(db)
    user_name = user.user_name if user else None
    documents = await service.list_documents(user_name)
    return [DocumentListItem.model_validate(doc) for doc in documents]


@router.get("/{doc_id}", response_model=DocumentResponse)
@limiter.limit("60/minute")
async def get_document(request: Request, doc_id: uuid.UUID, db: DbSession) -> DocumentResponse:
    service = DocumentService(db)
    document = await service.get_document(doc_id)
    if document is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Document not found"
        )
    return DocumentResponse.model_validate(document)


@router.patch("/{doc_id}", response_model=DocumentResponse)
@limiter.limit("10/minute")
async def update_document(
    request: Request,
    doc_id: uuid.UUID,
    data: DocumentUpdate,
    db: DbSession,
    user: CurrentUser,
) -> DocumentResponse:
    """Update a document. Requires authentication and ownership."""
    service = DocumentService(db)
    try:
        document = await service.update_document(doc_id, data, user_name=user.user_name)
    except PermissionError:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have permission to modify this document"
        )
    if document is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Document not found"
        )
    return DocumentResponse.model_validate(document)


@router.delete("/{doc_id}", status_code=status.HTTP_204_NO_CONTENT)
@limiter.limit("10/minute")
async def delete_document(
    request: Request,
    doc_id: uuid.UUID,
    db: DbSession,
    user: CurrentUser,
) -> None:
    """Delete a document. Requires authentication and ownership."""
    service = DocumentService(db)
    try:
        deleted = await service.delete_document(doc_id, user_name=user.user_name)
    except PermissionError:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have permission to delete this document"
        )
    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Document not found"
        )


@router.get("/{doc_id}/check-username")
@limiter.limit("60/minute")
async def check_username_availability(
    request: Request,
    doc_id: uuid.UUID,
    name: str = Query(..., max_length=MAX_USERNAME_LENGTH),
) -> dict:
    """Check if a username is available in a document room."""
    from app.core.room_manager import room_manager

    # Validate username format
    try:
        validated = UsernameParam(name=name)
        name = validated.name
    except ValidationError:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Invalid username format"
        )

    is_taken = room_manager.is_name_taken(doc_id, name)
    return {"available": not is_taken, "name": name}
