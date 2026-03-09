"""Security event logging for monitoring and incident response."""

import logging
from datetime import datetime, timezone
from enum import Enum
from typing import Any


class SecurityEvent(str, Enum):
    """Types of security events to log."""
    AUTH_SUCCESS = "auth_success"
    AUTH_FAILURE = "auth_failure"
    AUTH_LOGOUT = "auth_logout"
    RATE_LIMIT_EXCEEDED = "rate_limit_exceeded"
    INVALID_INPUT = "invalid_input"
    INVALID_USERNAME = "invalid_username"
    USERNAME_TAKEN = "username_taken"
    WEBSOCKET_REJECTED = "websocket_rejected"
    SUSPICIOUS_ACTIVITY = "suspicious_activity"


class SecurityLogger:
    """
    Structured security event logger.

    Logs security-relevant events in a consistent format for
    monitoring, alerting, and incident response.
    """

    def __init__(self, name: str = "security"):
        self._logger = logging.getLogger(name)
        # Ensure security logs are at least INFO level
        if self._logger.level == logging.NOTSET:
            self._logger.setLevel(logging.INFO)

    def log(
        self,
        event: SecurityEvent,
        message: str,
        *,
        client_ip: str | None = None,
        user_name: str | None = None,
        document_id: str | None = None,
        details: dict[str, Any] | None = None,
    ) -> None:
        """Log a security event with structured context."""
        context = {
            "event": event.value,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }

        if client_ip:
            context["client_ip"] = client_ip
        if user_name:
            context["user_name"] = user_name
        if document_id:
            context["document_id"] = document_id
        if details:
            context["details"] = details

        # Determine log level based on event type
        if event in (
            SecurityEvent.AUTH_FAILURE,
            SecurityEvent.RATE_LIMIT_EXCEEDED,
            SecurityEvent.SUSPICIOUS_ACTIVITY,
        ):
            self._logger.warning(f"[{event.value}] {message}", extra=context)
        elif event == SecurityEvent.INVALID_INPUT:
            self._logger.info(f"[{event.value}] {message}", extra=context)
        else:
            self._logger.info(f"[{event.value}] {message}", extra=context)

    def auth_success(
        self,
        user_name: str,
        client_ip: str | None = None,
    ) -> None:
        """Log successful authentication."""
        self.log(
            SecurityEvent.AUTH_SUCCESS,
            f"User '{user_name}' authenticated successfully",
            client_ip=client_ip,
            user_name=user_name,
        )

    def auth_failure(
        self,
        reason: str,
        client_ip: str | None = None,
        user_name: str | None = None,
    ) -> None:
        """Log failed authentication attempt."""
        self.log(
            SecurityEvent.AUTH_FAILURE,
            f"Authentication failed: {reason}",
            client_ip=client_ip,
            user_name=user_name,
        )

    def rate_limit_exceeded(
        self,
        endpoint: str,
        client_ip: str | None = None,
    ) -> None:
        """Log rate limit exceeded event."""
        self.log(
            SecurityEvent.RATE_LIMIT_EXCEEDED,
            f"Rate limit exceeded on {endpoint}",
            client_ip=client_ip,
            details={"endpoint": endpoint},
        )

    def invalid_input(
        self,
        field: str,
        reason: str,
        client_ip: str | None = None,
    ) -> None:
        """Log invalid input rejection."""
        self.log(
            SecurityEvent.INVALID_INPUT,
            f"Invalid input for {field}: {reason}",
            client_ip=client_ip,
            details={"field": field, "reason": reason},
        )

    def websocket_rejected(
        self,
        reason: str,
        document_id: str | None = None,
        user_name: str | None = None,
        client_ip: str | None = None,
    ) -> None:
        """Log rejected WebSocket connection."""
        self.log(
            SecurityEvent.WEBSOCKET_REJECTED,
            f"WebSocket connection rejected: {reason}",
            client_ip=client_ip,
            user_name=user_name,
            document_id=document_id,
            details={"reason": reason},
        )

    def log_security_event(
        self,
        event_name: str,
        client_ip: str | None = None,
        user_name: str | None = None,
        document_id: str | None = None,
        **kwargs: Any,
    ) -> None:
        """Log a generic security event with arbitrary details."""
        self.log(
            SecurityEvent.SUSPICIOUS_ACTIVITY,
            f"Security event: {event_name}",
            client_ip=client_ip,
            user_name=user_name,
            document_id=document_id,
            details={"event_name": event_name, **kwargs},
        )


# Global security logger instance
security_logger = SecurityLogger()
