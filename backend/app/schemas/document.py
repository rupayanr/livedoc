import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict


class DocumentCreate(BaseModel):
    title: str = "Untitled"
    content: str = ""


class DocumentUpdate(BaseModel):
    title: str | None = None
    content: str | None = None


class DocumentResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    title: str
    content: str
    created_at: datetime
    updated_at: datetime


class DocumentListItem(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    title: str
    updated_at: datetime


class DocumentWithUsers(DocumentResponse):
    users: list["UserInfo"] = []


class UserInfo(BaseModel):
    id: uuid.UUID
    name: str
    color: str


class SessionResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    user_name: str
    user_color: str
    cursor_position: dict | None = None


# Version History Schemas
class VersionCreate(BaseModel):
    """Request to create a manual version snapshot."""
    name: str | None = None  # Optional name/description for the version


class VersionResponse(BaseModel):
    """Response for a document version."""
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    version_number: int
    title: str
    content: str
    created_by: str | None
    snapshot_type: str  # 'auto' or 'manual'
    created_at: datetime


class VersionListItem(BaseModel):
    """List item for version history."""
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    version_number: int
    title: str
    created_by: str | None
    snapshot_type: str
    created_at: datetime
    content_preview: str = ""  # First 100 chars of content


class VersionRestoreRequest(BaseModel):
    """Request to restore a specific version."""
    pass  # No body needed, version ID comes from URL
