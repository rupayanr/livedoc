import uuid
from datetime import datetime

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.document import Document, DocumentVersion


class VersionRepository:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def get_next_version_number(self, document_id: uuid.UUID) -> int:
        """Get the next version number for a document."""
        result = await self.session.execute(
            select(func.max(DocumentVersion.version_number))
            .where(DocumentVersion.document_id == document_id)
        )
        max_version = result.scalar()
        return (max_version or 0) + 1

    async def create(
        self,
        document_id: uuid.UUID,
        title: str,
        content: str,
        y_state: bytes | None = None,
        created_by: str | None = None,
        snapshot_type: str = "auto",
    ) -> DocumentVersion:
        """Create a new version snapshot."""
        version_number = await self.get_next_version_number(document_id)

        version = DocumentVersion(
            document_id=document_id,
            version_number=version_number,
            title=title,
            content=content,
            y_state=y_state,
            created_by=created_by,
            snapshot_type=snapshot_type,
        )
        self.session.add(version)
        await self.session.flush()
        return version

    async def get(self, version_id: uuid.UUID) -> DocumentVersion | None:
        """Get a specific version by ID."""
        result = await self.session.execute(
            select(DocumentVersion).where(DocumentVersion.id == version_id)
        )
        return result.scalar_one_or_none()

    async def get_by_version_number(
        self, document_id: uuid.UUID, version_number: int
    ) -> DocumentVersion | None:
        """Get a specific version by document ID and version number."""
        result = await self.session.execute(
            select(DocumentVersion)
            .where(DocumentVersion.document_id == document_id)
            .where(DocumentVersion.version_number == version_number)
        )
        return result.scalar_one_or_none()

    async def list_versions(
        self, document_id: uuid.UUID, limit: int = 50, offset: int = 0
    ) -> list[DocumentVersion]:
        """List versions for a document, newest first."""
        result = await self.session.execute(
            select(DocumentVersion)
            .where(DocumentVersion.document_id == document_id)
            .order_by(DocumentVersion.version_number.desc())
            .limit(limit)
            .offset(offset)
        )
        return list(result.scalars().all())

    async def count_versions(self, document_id: uuid.UUID) -> int:
        """Count total versions for a document."""
        result = await self.session.execute(
            select(func.count(DocumentVersion.id))
            .where(DocumentVersion.document_id == document_id)
        )
        return result.scalar() or 0

    async def get_latest_version(self, document_id: uuid.UUID) -> DocumentVersion | None:
        """Get the most recent version for a document."""
        result = await self.session.execute(
            select(DocumentVersion)
            .where(DocumentVersion.document_id == document_id)
            .order_by(DocumentVersion.version_number.desc())
            .limit(1)
        )
        return result.scalar_one_or_none()

    async def delete_old_versions(
        self, document_id: uuid.UUID, keep_count: int = 100
    ) -> int:
        """Delete old auto-versions, keeping the most recent ones and all manual versions."""
        # Get version numbers to keep (most recent auto + all manual)
        result = await self.session.execute(
            select(DocumentVersion.id)
            .where(DocumentVersion.document_id == document_id)
            .where(DocumentVersion.snapshot_type == "auto")
            .order_by(DocumentVersion.version_number.desc())
            .offset(keep_count)
        )
        old_version_ids = [row[0] for row in result.fetchall()]

        if not old_version_ids:
            return 0

        # Delete old auto versions
        from sqlalchemy import delete
        result = await self.session.execute(
            delete(DocumentVersion).where(DocumentVersion.id.in_(old_version_ids))
        )
        return result.rowcount

    async def should_create_auto_snapshot(
        self, document_id: uuid.UUID, min_interval_minutes: int = 5
    ) -> bool:
        """Check if enough time has passed since the last auto-snapshot."""
        latest = await self.get_latest_version(document_id)
        if latest is None:
            return True

        if latest.snapshot_type == "manual":
            # Check the latest auto snapshot instead
            result = await self.session.execute(
                select(DocumentVersion)
                .where(DocumentVersion.document_id == document_id)
                .where(DocumentVersion.snapshot_type == "auto")
                .order_by(DocumentVersion.version_number.desc())
                .limit(1)
            )
            latest_auto = result.scalar_one_or_none()
            if latest_auto is None:
                return True
            latest = latest_auto

        time_diff = datetime.now(latest.created_at.tzinfo) - latest.created_at
        return time_diff.total_seconds() >= min_interval_minutes * 60
