"""JWT utilities for validating Auth service access tokens."""
from __future__ import annotations

from typing import Any, Dict
from uuid import UUID

from jose import JWTError, jwt

from infrastructure.config.settings import get_settings


class JWTHandler:
    """Validates access tokens issued by the Auth service."""

    def __init__(self, secret_key: str, algorithm: str = "HS256"):
        self.secret_key = secret_key
        self.algorithm = algorithm

    def verify_token(self, token: str) -> Dict[str, Any]:
        """
        Verify and decode a JWT token.
        
        Args:
            token: The JWT token string
            
        Returns:
            The decoded token payload
            
        Raises:
            JWTError: If the token is invalid
        """
        payload = jwt.decode(token, self.secret_key, algorithms=[self.algorithm])
        
        # Verify it's an access token
        if payload.get("type") != "access":
            raise JWTError("Invalid token type")
            
        return payload

    def get_user_id(self, token: str) -> UUID:
        """
        Extract user ID from token.
        
        Args:
            token: The JWT token string
            
        Returns:
            The user UUID
        """
        payload = self.verify_token(token)
        return UUID(payload["sub"])

    def get_user_email(self, token: str) -> str:
        """
        Extract user email from token.
        
        Args:
            token: The JWT token string
            
        Returns:
            The user email
        """
        payload = self.verify_token(token)
        return payload.get("email", "")


# Global instance
settings = get_settings()
jwt_handler = JWTHandler(
    secret_key=settings.jwt_secret,
    algorithm=settings.jwt_algorithm,
)
