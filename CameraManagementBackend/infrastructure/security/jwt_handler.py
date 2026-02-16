"""JWT utilities for validating Auth service access tokens."""
from __future__ import annotations
from typing import Any, Dict
from uuid import UUID
from jose import JWTError, jwt
from infrastructure.config.settings import get_settings

settings = get_settings()


class JWTHandler:
    """Handles JWT token validation (read-only from Auth service tokens)."""

    @staticmethod
    def validate_access_token(token: str) -> Dict[str, Any]:
        """Validate and decode access token from Auth service."""
        try:
            payload = jwt.decode(
                token,
                settings.jwt_secret_key,
                algorithms=[settings.jwt_algorithm],
            )
            
            # Ensure it's an access token
            token_type = payload.get("type")
            if token_type != "access":
                raise ValueError("Invalid token type")
            
            return payload
        except JWTError as e:
            raise ValueError(f"Invalid token: {str(e)}")

    @staticmethod
    def extract_user_id(payload: Dict[str, Any]) -> UUID:
        """Extract user ID from token payload."""
        sub = payload.get("sub")
        if not sub:
            raise ValueError("No user ID in token")
        return UUID(sub)

    @staticmethod
    def extract_email(payload: Dict[str, Any]) -> str:
        """Extract email from token payload."""
        email = payload.get("email")
        if not email:
            raise ValueError("No email in token")
        return email


jwt_handler = JWTHandler()
