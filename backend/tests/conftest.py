import sqlite3
import uuid
from collections.abc import AsyncGenerator
from unittest.mock import AsyncMock, MagicMock

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy import LargeBinary, String, Text, event
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.api.deps import get_db
from app.models.document import Base, Document, Session as SessionModel

# Disable rate limiting for all tests by mocking the limiter
from unittest.mock import patch

# Patch the limiter to be a no-op before importing the app routes
def noop_limit(*args, **kwargs):
    """No-op rate limit decorator that just returns the function unchanged."""
    def decorator(func):
        return func
    return decorator

# Apply the patch to all limiter instances
import slowapi
slowapi.Limiter.limit = noop_limit


# Register UUID adapter for SQLite
sqlite3.register_adapter(uuid.UUID, lambda u: str(u))
sqlite3.register_converter("UUID", lambda b: uuid.UUID(b.decode()))


# Override PostgreSQL-specific types for SQLite testing
# We need to do this before creating tables
from sqlalchemy.dialects.postgresql import BYTEA, UUID, JSONB

# Apply type overrides to the models for SQLite
for table in Base.metadata.tables.values():
    for column in table.columns:
        if isinstance(column.type, BYTEA):
            column.type = LargeBinary()
        elif isinstance(column.type, UUID):
            column.type = String(36)
        elif isinstance(column.type, JSONB):
            column.type = Text()


# Use SQLite in-memory for tests
TEST_DATABASE_URL = "sqlite+aiosqlite:///:memory:"

test_engine = create_async_engine(
    TEST_DATABASE_URL,
    echo=False,
    connect_args={"check_same_thread": False},
)

TestSessionLocal = async_sessionmaker(
    test_engine,
    class_=AsyncSession,
    expire_on_commit=False,
)


@pytest.fixture
def anyio_backend():
    return "asyncio"


@pytest_asyncio.fixture
async def test_db() -> AsyncGenerator[AsyncSession, None]:
    """Create test database tables and provide a session."""
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with TestSessionLocal() as session:
        yield session

    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)


async def override_get_db() -> AsyncGenerator[AsyncSession, None]:
    """Override database dependency for tests."""
    async with TestSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise


@pytest_asyncio.fixture
async def client(test_db: AsyncSession) -> AsyncGenerator[AsyncClient, None]:
    """Create an async test client with database dependency overridden."""
    # Import here to avoid circular imports and ensure fresh app instance
    from app.main import app

    # Override database dependency
    app.dependency_overrides[get_db] = override_get_db

    # Create tables for this test
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac

    # Clean up
    app.dependency_overrides.clear()
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)


@pytest_asyncio.fixture
async def auth_client(test_db: AsyncSession) -> AsyncGenerator[AsyncClient, None]:
    """Create an authenticated async test client."""
    from app.main import app

    # Override database dependency
    app.dependency_overrides[get_db] = override_get_db

    # Create tables for this test
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        # Login to get auth token
        login_response = await ac.post(
            "/api/v1/auth/login",
            json={"name": "TestUser"},
        )
        token = login_response.json()["token"]

        # Set default auth header
        ac.headers["Authorization"] = f"Bearer {token}"
        yield ac

    # Clean up
    app.dependency_overrides.clear()
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)


@pytest.fixture
def mock_websocket() -> MagicMock:
    """Create a mock WebSocket for testing."""
    ws = MagicMock()
    ws.send_json = AsyncMock()
    ws.send_bytes = AsyncMock()
    ws.receive = AsyncMock()
    ws.accept = AsyncMock()
    ws.close = AsyncMock()
    return ws


@pytest.fixture
def document_id() -> uuid.UUID:
    """Generate a test document UUID."""
    return uuid.uuid4()


@pytest.fixture
def user_name() -> str:
    """Generate a test user name."""
    return "TestUser"
