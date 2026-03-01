import logging
import uuid

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_db
from app.repositories.document_repo import DocumentRepository
from app.repositories.version_repo import VersionRepository
from app.schemas.document import VersionCreate, VersionListItem, VersionResponse

logger = logging.getLogger(__name__)
router = APIRouter()


@router.get("/documents/{document_id}/versions", response_model=list[VersionListItem])
async def list_versions(
    document_id: uuid.UUID,
    limit: int = Query(default=50, le=100),
    offset: int = Query(default=0, ge=0),
    session: AsyncSession = Depends(get_db),
) -> list[VersionListItem]:
    """List all versions of a document."""
    doc_repo = DocumentRepository(session)
    document = await doc_repo.get(document_id)
    if document is None:
        raise HTTPException(status_code=404, detail="Document not found")

    version_repo = VersionRepository(session)
    versions = await version_repo.list_versions(document_id, limit=limit, offset=offset)

    return [
        VersionListItem(
            id=v.id,
            version_number=v.version_number,
            title=v.title,
            created_by=v.created_by,
            snapshot_type=v.snapshot_type,
            created_at=v.created_at,
            content_preview=v.content[:100] + "..." if len(v.content) > 100 else v.content,
        )
        for v in versions
    ]


@router.get("/documents/{document_id}/versions/{version_id}", response_model=VersionResponse)
async def get_version(
    document_id: uuid.UUID,
    version_id: uuid.UUID,
    session: AsyncSession = Depends(get_db),
) -> VersionResponse:
    """Get a specific version of a document."""
    doc_repo = DocumentRepository(session)
    document = await doc_repo.get(document_id)
    if document is None:
        raise HTTPException(status_code=404, detail="Document not found")

    version_repo = VersionRepository(session)
    version = await version_repo.get(version_id)
    if version is None or version.document_id != document_id:
        raise HTTPException(status_code=404, detail="Version not found")

    return VersionResponse.model_validate(version)


@router.post("/documents/{document_id}/versions", response_model=VersionResponse, status_code=201)
async def create_version(
    document_id: uuid.UUID,
    data: VersionCreate | None = None,
    user_name: str = Query(default=None, description="Name of user creating the snapshot"),
    session: AsyncSession = Depends(get_db),
) -> VersionResponse:
    """Create a manual version snapshot of the current document state."""
    doc_repo = DocumentRepository(session)
    document = await doc_repo.get(document_id)
    if document is None:
        raise HTTPException(status_code=404, detail="Document not found")

    version_repo = VersionRepository(session)
    version = await version_repo.create(
        document_id=document_id,
        title=document.title,
        content=document.content,
        y_state=document.y_state,
        created_by=user_name,
        snapshot_type="manual",
    )
    await session.commit()

    logger.info(f"Created manual version {version.version_number} for document {document_id}")
    return VersionResponse.model_validate(version)


@router.post("/documents/{document_id}/versions/{version_id}/restore", response_model=VersionResponse)
async def restore_version(
    document_id: uuid.UUID,
    version_id: uuid.UUID,
    user_name: str = Query(default=None, description="Name of user restoring the version"),
    session: AsyncSession = Depends(get_db),
) -> VersionResponse:
    """
    Restore a document to a specific version.

    This creates a new version with the old content (preserving history)
    and updates the current document state.
    """
    doc_repo = DocumentRepository(session)
    document = await doc_repo.get(document_id)
    if document is None:
        raise HTTPException(status_code=404, detail="Document not found")

    version_repo = VersionRepository(session)
    version = await version_repo.get(version_id)
    if version is None or version.document_id != document_id:
        raise HTTPException(status_code=404, detail="Version not found")

    # Create a snapshot of current state before restoring
    await version_repo.create(
        document_id=document_id,
        title=document.title,
        content=document.content,
        y_state=document.y_state,
        created_by=user_name,
        snapshot_type="auto",  # Auto snapshot before restore
    )

    # Update document to restored version's content
    await doc_repo.update(
        document_id,
        title=version.title,
        content=version.content,
        y_state=version.y_state,
    )

    # Create a new version marking the restore
    restored_version = await version_repo.create(
        document_id=document_id,
        title=version.title,
        content=version.content,
        y_state=version.y_state,
        created_by=user_name,
        snapshot_type="manual",
    )
    await session.commit()

    logger.info(
        f"Restored document {document_id} to version {version.version_number}, "
        f"created new version {restored_version.version_number}"
    )
    return VersionResponse.model_validate(restored_version)


@router.get("/documents/{document_id}/versions/count")
async def get_version_count(
    document_id: uuid.UUID,
    session: AsyncSession = Depends(get_db),
) -> dict[str, int]:
    """Get the total number of versions for a document."""
    doc_repo = DocumentRepository(session)
    document = await doc_repo.get(document_id)
    if document is None:
        raise HTTPException(status_code=404, detail="Document not found")

    version_repo = VersionRepository(session)
    count = await version_repo.count_versions(document_id)
    return {"count": count}
