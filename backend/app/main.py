import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes import documents, websocket
from app.config import settings
from app.core.persistence import persistence_manager
from app.core.redis_pubsub import redis_pubsub

# Configure logging
logging.basicConfig(
    level=logging.INFO if not settings.debug else logging.DEBUG,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    logger.info("Starting LiveDoc server...")
    await redis_pubsub.connect()
    # Clean up orphaned sessions from previous server runs
    await persistence_manager.cleanup_orphaned_sessions()
    logger.info("LiveDoc server started successfully")
    yield
    # Shutdown
    logger.info("Shutting down LiveDoc server...")
    await redis_pubsub.disconnect()
    logger.info("LiveDoc server shut down")


app = FastAPI(
    title="LiveDoc API",
    description="Real-time collaborative markdown editor",
    version="0.1.0",
    lifespan=lifespan,
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# REST API routes
app.include_router(documents.router, prefix="/api/v1")

# WebSocket routes
app.include_router(websocket.router, prefix="/api/v1")


@app.get("/health")
async def health_check() -> dict[str, str]:
    return {"status": "healthy"}
