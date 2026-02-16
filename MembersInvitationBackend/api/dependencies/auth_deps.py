"""Authentication dependencies for Members Invitation service."""

from dataclasses import dataclass
from uuid import UUID

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from domain.exceptions import UnauthorizedException
from infrastructure.security.jwt_handler import jwt_handler

security = HTTPBearer()


@dataclass(frozen=True)
class CurrentUser:
    id: UUID
    email: str


def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> CurrentUser:
    try:
        token = credentials.credentials
        user_id, email = jwt_handler.get_user(token)
        return CurrentUser(id=user_id, email=email)
    except UnauthorizedException as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"message": str(e), "error_code": "UNAUTHORIZED"},
            headers={"WWW-Authenticate": "Bearer"},
        )
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"message": "Could not validate credentials", "error_code": "UNAUTHORIZED"},
            headers={"WWW-Authenticate": "Bearer"},
        )
