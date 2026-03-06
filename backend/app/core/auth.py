"""Simple in-memory session token authentication."""

import secrets
import time
from dataclasses import dataclass
from typing import Optional


@dataclass
class SessionData:
    """Data associated with a session."""
    user_name: str
    created_at: float
    last_seen_at: float


class SessionStore:
    """In-memory session store with TTL-based expiration."""

    def __init__(self, ttl_seconds: int = 86400):  # 24 hours default
        self._sessions: dict[str, SessionData] = {}
        self._ttl = ttl_seconds
        self._cleanup_counter = 0
        self._cleanup_interval = 100  # Cleanup every N operations
        self._max_sessions = 10_000  # Prevent memory exhaustion

    def create_session(self, user_name: str) -> str:
        """Create a new session and return the token."""
        self._maybe_cleanup()

        # Evict oldest if at capacity
        if len(self._sessions) >= self._max_sessions:
            self._evict_oldest()

        token = secrets.token_urlsafe(32)
        now = time.time()
        self._sessions[token] = SessionData(
            user_name=user_name,
            created_at=now,
            last_seen_at=now,
        )
        return token

    def get_session(self, token: str) -> Optional[SessionData]:
        """Get session data if token is valid and not expired."""
        session = self._sessions.get(token)
        if session is None:
            return None

        now = time.time()
        if now - session.created_at > self._ttl:
            # Expired
            del self._sessions[token]
            return None

        # Update last seen
        session.last_seen_at = now
        return session

    def delete_session(self, token: str) -> bool:
        """Delete a session. Returns True if it existed."""
        return self._sessions.pop(token, None) is not None

    def _maybe_cleanup(self) -> None:
        """Periodically clean up expired sessions."""
        self._cleanup_counter += 1
        if self._cleanup_counter < self._cleanup_interval:
            return

        self._cleanup_counter = 0
        now = time.time()
        expired = [
            token for token, session in self._sessions.items()
            if now - session.created_at > self._ttl
        ]
        for token in expired:
            del self._sessions[token]

    def _evict_oldest(self) -> None:
        """Evict the oldest session by creation time."""
        if not self._sessions:
            return
        oldest_token = min(
            self._sessions.keys(),
            key=lambda t: self._sessions[t].created_at
        )
        del self._sessions[oldest_token]


# Global session store instance
session_store = SessionStore()
