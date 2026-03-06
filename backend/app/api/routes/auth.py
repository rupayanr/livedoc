"""Authentication routes."""

from fastapi import APIRouter, Header, Request, status
from pydantic import BaseModel, Field
from slowapi import Limiter
from slowapi.util import get_remote_address

from app.core.auth import session_store
from app.core.security_logger import security_logger
from app.schemas.document import UsernameParam

router = APIRouter(prefix="/auth", tags=["auth"])
limiter = Limiter(key_func=get_remote_address)


class LoginRequest(BaseModel):
    """Login request body."""
    name: str = Field(..., min_length=1, max_length=50)


class LoginResponse(BaseModel):
    """Login response with session token."""
    token: str
    user_name: str


class LogoutResponse(BaseModel):
    """Logout response."""
    success: bool


@router.post("/login", response_model=LoginResponse, status_code=status.HTTP_200_OK)
@limiter.limit("20/minute")
async def login(request: Request, data: LoginRequest) -> LoginResponse:
    """
    Create a session token for the given username.

    This is a simple authentication that creates a session without password.
    Suitable for collaborative editing where identity is based on display name.
    """
    client_ip = get_remote_address(request)

    # Validate username using the same rules as WebSocket
    validated = UsernameParam(name=data.name)
    user_name = validated.name

    token = session_store.create_session(user_name)
    security_logger.auth_success(user_name=user_name, client_ip=client_ip)
    return LoginResponse(token=token, user_name=user_name)


@router.post("/logout", response_model=LogoutResponse)
@limiter.limit("20/minute")
async def logout(
    request: Request,
    authorization: str | None = Header(default=None),
) -> LogoutResponse:
    """
    Invalidate the current session token.
    """
    client_ip = get_remote_address(request)

    if authorization is None:
        return LogoutResponse(success=False)

    parts = authorization.split()
    if len(parts) != 2 or parts[0].lower() != "bearer":
        return LogoutResponse(success=False)

    token = parts[1]

    # Get user name before deleting for logging
    session = session_store.get_session(token)
    user_name = session.user_name if session else None

    success = session_store.delete_session(token)
    if success and user_name:
        from app.core.security_logger import SecurityEvent
        security_logger.log(
            SecurityEvent.AUTH_LOGOUT,
            f"User '{user_name}' logged out",
            client_ip=client_ip,
            user_name=user_name,
        )
    return LogoutResponse(success=success)
