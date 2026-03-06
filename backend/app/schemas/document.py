import re
import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field, field_validator


# Constants for validation
MAX_TITLE_LENGTH = 255
MAX_CONTENT_LENGTH = 1_048_576  # 1MB
MAX_USERNAME_LENGTH = 50
USERNAME_PATTERN = re.compile(r"^[a-zA-Z0-9][a-zA-Z0-9 _-]*$")


def sanitize_string(value: str) -> str:
    """Remove null bytes and control characters (except newlines/tabs in content)."""
    # Remove null bytes
    value = value.replace("\x00", "")
    # Remove other control characters (keep \n, \r, \t)
    return "".join(c for c in value if c in "\n\r\t" or (ord(c) >= 32 and ord(c) != 127))


def sanitize_title(value: str) -> str:
    """Sanitize title - no newlines, no control chars."""
    value = value.replace("\x00", "")
    return "".join(c for c in value if ord(c) >= 32 and ord(c) != 127)


class UsernameParam(BaseModel):
    """Validated username parameter for WebSocket connections."""
    name: str = Field(
        default="Anonymous",
        min_length=1,
        max_length=MAX_USERNAME_LENGTH,
        description="Username for collaboration"
    )

    @field_validator("name")
    @classmethod
    def validate_username(cls, v: str) -> str:
        v = v.strip()
        if not v:
            return "Anonymous"
        if not USERNAME_PATTERN.match(v):
            raise ValueError(
                "Username must start with alphanumeric and contain only "
                "letters, numbers, spaces, underscores, or hyphens"
            )
        return sanitize_title(v)


class DocumentCreate(BaseModel):
    title: str = Field(default="Untitled", max_length=MAX_TITLE_LENGTH)
    content: str = Field(default="", max_length=MAX_CONTENT_LENGTH)

    @field_validator("title")
    @classmethod
    def validate_title(cls, v: str) -> str:
        return sanitize_title(v.strip()) or "Untitled"

    @field_validator("content")
    @classmethod
    def validate_content(cls, v: str) -> str:
        return sanitize_string(v)


class DocumentUpdate(BaseModel):
    title: str | None = Field(default=None, max_length=MAX_TITLE_LENGTH)
    content: str | None = Field(default=None, max_length=MAX_CONTENT_LENGTH)

    @field_validator("title")
    @classmethod
    def validate_title(cls, v: str | None) -> str | None:
        if v is None:
            return None
        return sanitize_title(v.strip()) or None

    @field_validator("content")
    @classmethod
    def validate_content(cls, v: str | None) -> str | None:
        if v is None:
            return None
        return sanitize_string(v)


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
