"""API dependencies."""
from __future__ import annotations

from typing import Optional

from fastapi import Depends, HTTPException, Query, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from infrastructure.security.jwt_handler import jwt_handler
from jose import JWTError

security = HTTPBearer(auto_error=False)


async def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
    token: Optional[str] = Query(None, alias="token"),
) -> dict:
    """
    Validate JWT and return current user info.
    
    Accepts token from:
    - Authorization header (Bearer token)
    - Query parameter (for WebSocket connections)
    """
    # Get token from header or query
    jwt_token = None
    if credentials:
        jwt_token = credentials.credentials
    elif token:
        jwt_token = token

    if not jwt_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
            headers={"WWW-Authenticate": "Bearer"},
        )

    try:
        payload = jwt_handler.verify_token(jwt_token)
        return {
            "user_id": payload.get("sub"),
            "email": payload.get("email"),
        }
    except JWTError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid token: {str(e)}",
            headers={"WWW-Authenticate": "Bearer"},
        )


async def get_optional_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
    token: Optional[str] = Query(None, alias="token"),
) -> Optional[dict]:
    """
    Optionally validate JWT. Returns None if no token provided.
    """
    jwt_token = None
    if credentials:
        jwt_token = credentials.credentials
    elif token:
        jwt_token = token

    if not jwt_token:
        return None

    try:
        payload = jwt_handler.verify_token(jwt_token)
        return {
            "user_id": payload.get("sub"),
            "email": payload.get("email"),
        }
    except JWTError:
        return None
