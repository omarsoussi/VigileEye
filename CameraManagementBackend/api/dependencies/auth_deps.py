"""Authentication dependencies for Camera Management service."""
from dataclasses import dataclass
from uuid import UUID
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from infrastructure.security.jwt_handler import jwt_handler

security = HTTPBearer()


@dataclass
class CurrentUser:
    """Current authenticated user."""
    id: UUID
    email: str


async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> CurrentUser:
    """Dependency to get current authenticated user from JWT token."""
    try:
        token = credentials.credentials
        payload = jwt_handler.validate_access_token(token)
        user_id = jwt_handler.extract_user_id(payload)
        email = jwt_handler.extract_email(payload)
        return CurrentUser(id=user_id, email=email)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=str(e),
            headers={"WWW-Authenticate": "Bearer"},
        )
