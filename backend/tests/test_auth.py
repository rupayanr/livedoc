"""Tests for authentication module."""

import time
from unittest.mock import patch

import pytest

from app.core.auth import SessionStore, SessionData


class TestSessionStore:
    """Tests for the in-memory session store."""

    def test_create_session_returns_token(self):
        """Creating a session should return a token string."""
        store = SessionStore()
        token = store.create_session("testuser")

        assert isinstance(token, str)
        assert len(token) > 0

    def test_create_session_unique_tokens(self):
        """Each session should have a unique token."""
        store = SessionStore()
        tokens = [store.create_session("user") for _ in range(10)]

        assert len(set(tokens)) == 10

    def test_get_session_valid_token(self):
        """Getting a valid session should return SessionData."""
        store = SessionStore()
        token = store.create_session("testuser")

        session = store.get_session(token)

        assert session is not None
        assert session.user_name == "testuser"
        assert isinstance(session, SessionData)

    def test_get_session_invalid_token(self):
        """Getting an invalid token should return None."""
        store = SessionStore()

        session = store.get_session("invalid_token")

        assert session is None

    def test_get_session_updates_last_seen(self):
        """Getting a session should update last_seen_at."""
        store = SessionStore()
        token = store.create_session("testuser")

        session1 = store.get_session(token)
        initial_last_seen = session1.last_seen_at

        # Wait a tiny bit
        time.sleep(0.01)

        session2 = store.get_session(token)

        assert session2.last_seen_at >= initial_last_seen

    def test_get_session_expired(self):
        """Expired sessions should return None and be deleted."""
        store = SessionStore(ttl_seconds=1)
        token = store.create_session("testuser")

        # Verify session exists
        assert store.get_session(token) is not None

        # Manipulate time by modifying the session's created_at
        store._sessions[token].created_at = time.time() - 2

        # Should be expired now
        assert store.get_session(token) is None

        # Session should be deleted
        assert token not in store._sessions

    def test_delete_session_exists(self):
        """Deleting an existing session should return True."""
        store = SessionStore()
        token = store.create_session("testuser")

        result = store.delete_session(token)

        assert result is True
        assert store.get_session(token) is None

    def test_delete_session_not_exists(self):
        """Deleting a non-existent session should return False."""
        store = SessionStore()

        result = store.delete_session("nonexistent")

        assert result is False

    def test_evict_oldest_at_capacity(self):
        """Should evict oldest session when at max capacity."""
        store = SessionStore(ttl_seconds=86400)
        store._max_sessions = 3

        # Create sessions with slight time delays
        token1 = store.create_session("user1")
        store._sessions[token1].created_at = time.time() - 100  # Make oldest

        token2 = store.create_session("user2")
        token3 = store.create_session("user3")

        # Create a 4th session (should evict token1)
        token4 = store.create_session("user4")

        assert token1 not in store._sessions
        assert store.get_session(token2) is not None
        assert store.get_session(token3) is not None
        assert store.get_session(token4) is not None

    def test_periodic_cleanup(self):
        """Periodic cleanup should remove expired sessions."""
        store = SessionStore(ttl_seconds=1)
        store._cleanup_interval = 1  # Cleanup on every operation

        token1 = store.create_session("user1")
        # Make it expired
        store._sessions[token1].created_at = time.time() - 2

        # Trigger cleanup by creating another session
        store.create_session("user2")

        assert token1 not in store._sessions

    def test_session_data_fields(self):
        """SessionData should have correct fields."""
        store = SessionStore()
        token = store.create_session("testuser")
        session = store.get_session(token)

        assert hasattr(session, "user_name")
        assert hasattr(session, "created_at")
        assert hasattr(session, "last_seen_at")
        assert session.user_name == "testuser"
        assert session.created_at <= time.time()
        assert session.last_seen_at <= time.time()
