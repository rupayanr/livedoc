import asyncio
import uuid
from typing import Callable

import redis.asyncio as redis

from app.config import settings


class RedisPubSub:
    """
    Redis pub/sub wrapper for multi-instance synchronization.

    This allows multiple backend instances to broadcast updates
    to each other, ensuring all connected clients stay in sync.
    """

    def __init__(self) -> None:
        self.redis: redis.Redis | None = None
        self.pubsub: redis.client.PubSub | None = None
        self.subscriptions: dict[str, list[Callable]] = {}
        self._listener_task: asyncio.Task | None = None

    async def connect(self) -> None:
        """Connect to Redis."""
        self.redis = redis.from_url(settings.redis_url)
        self.pubsub = self.redis.pubsub()

    async def disconnect(self) -> None:
        """Disconnect from Redis."""
        if self._listener_task:
            self._listener_task.cancel()
            try:
                await self._listener_task
            except asyncio.CancelledError:
                pass

        if self.pubsub:
            await self.pubsub.close()

        if self.redis:
            await self.redis.close()

    def _channel_name(self, document_id: uuid.UUID) -> str:
        return f"doc:{document_id}"

    async def subscribe(
        self, document_id: uuid.UUID, callback: Callable[[bytes], None]
    ) -> None:
        """Subscribe to updates for a document."""
        if self.pubsub is None:
            return

        channel = self._channel_name(document_id)

        if channel not in self.subscriptions:
            self.subscriptions[channel] = []
            await self.pubsub.subscribe(channel)

        self.subscriptions[channel].append(callback)

        # Start listener if not running
        if self._listener_task is None or self._listener_task.done():
            self._listener_task = asyncio.create_task(self._listen())

    async def unsubscribe(
        self, document_id: uuid.UUID, callback: Callable[[bytes], None]
    ) -> None:
        """Unsubscribe from updates for a document."""
        if self.pubsub is None:
            return

        channel = self._channel_name(document_id)

        if channel in self.subscriptions:
            self.subscriptions[channel].remove(callback)

            if not self.subscriptions[channel]:
                del self.subscriptions[channel]
                await self.pubsub.unsubscribe(channel)

    async def publish(self, document_id: uuid.UUID, data: bytes) -> None:
        """Publish an update to all instances."""
        if self.redis is None:
            return

        channel = self._channel_name(document_id)
        await self.redis.publish(channel, data)

    async def _listen(self) -> None:
        """Listen for messages from Redis."""
        if self.pubsub is None:
            return

        try:
            async for message in self.pubsub.listen():
                if message["type"] == "message":
                    channel = message["channel"]
                    if isinstance(channel, bytes):
                        channel = channel.decode()

                    data = message["data"]
                    if isinstance(data, str):
                        data = data.encode()

                    callbacks = self.subscriptions.get(channel, [])
                    for callback in callbacks:
                        try:
                            callback(data)
                        except Exception:
                            pass
        except asyncio.CancelledError:
            pass


redis_pubsub = RedisPubSub()
