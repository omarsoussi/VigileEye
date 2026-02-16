"""JWT utilities for validating Auth service access tokens."""

from __future__ import annotations

from typing import Any, Dict
from uuid import UUID

from jose import JWTError, jwt

from infrastructure.config.settings import get_settings
from domain.exceptions import UnauthorizedException

settings = get_settings()


class JWTHandler:
    def __init__(self, secret_key: str | None = None, algorithm: str | None = None):
        self.secret_key = secret_key or settings.jwt_secret_key
        self.algorithm = algorithm or settings.jwt_algorithm

    def verify_access_token(self, token: str) -> Dict[str, Any]:
        try:
            payload = jwt.decode(token, self.secret_key, algorithms=[self.algorithm])
        except JWTError as e:
            raise UnauthorizedException(f"Invalid token: {str(e)}")

        if payload.get("type") != "access":
            raise UnauthorizedException("Invalid token type")

        if "sub" not in payload:
            raise UnauthorizedException("Missing subject")

        return payload

    def get_user(self, token: str) -> tuple[UUID, str]:
        payload = self.verify_access_token(token)
        try:
            user_id = UUID(payload["sub"])
        except Exception:
            raise UnauthorizedException("Invalid user id")

        email = payload.get("email")
        if not email:
            raise UnauthorizedException("Missing email")

        return user_id, str(email)


jwt_handler = JWTHandler()
