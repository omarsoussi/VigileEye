"""
Authentication dependencies for protected routes.
Provides JWT token validation and user extraction.
"""
from typing import Optional
from uuid import UUID
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session

from infrastructure.persistence.database import get_db
from infrastructure.persistence.repositories import SQLAlchemyUserRepository
from infrastructure.security.jwt_handler import JWTHandler, TokenType
from domain.entities.user import User
from domain.exceptions import TokenExpiredException, InvalidTokenException

# HTTP Bearer security scheme
security = HTTPBearer()

# Global JWT handler
jwt_handler = JWTHandler()


def get_current_user_id(
    credentials: HTTPAuthorizationCredentials = Depends(security)
) -> UUID:
    """
    Dependency to extract and validate user ID from JWT token.
    
    Args:
        credentials: HTTP Bearer credentials
        
    Returns:
        User UUID from token
        
    Raises:
        HTTPException: If token is invalid or expired
    """
    try:
        token = credentials.credentials
        payload = jwt_handler.verify_token(token, TokenType.ACCESS)
        return UUID(payload["sub"])
    except TokenExpiredException:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"message": "Token has expired", "error_code": "TOKEN_EXPIRED"},
            headers={"WWW-Authenticate": "Bearer"},
        )
    except InvalidTokenException as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"message": str(e.message), "error_code": "INVALID_TOKEN"},
            headers={"WWW-Authenticate": "Bearer"},
        )
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"message": "Could not validate credentials", "error_code": "INVALID_TOKEN"},
            headers={"WWW-Authenticate": "Bearer"},
        )


def get_current_user(
    user_id: UUID = Depends(get_current_user_id),
    db: Session = Depends(get_db)
) -> User:
    """
    Dependency to get current authenticated user.
    
    Args:
        user_id: User ID from token
        db: Database session
        
    Returns:
        User entity
        
    Raises:
        HTTPException: If user not found
    """
    user_repo = SQLAlchemyUserRepository(db)
    user = user_repo.get_by_id(user_id)
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"message": "User not found", "error_code": "USER_NOT_FOUND"}
        )
    
    return user


def get_current_active_user(
    user: User = Depends(get_current_user)
) -> User:
    """
    Dependency to get current active (verified) user.
    
    Args:
        user: Current user
        
    Returns:
        Verified user entity
        
    Raises:
        HTTPException: If user is not verified or locked
    """
    if not user.is_verified:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={"message": "Email not verified", "error_code": "EMAIL_NOT_VERIFIED"}
        )
    
    if user.is_locked():
        raise HTTPException(
            status_code=status.HTTP_423_LOCKED,
            detail={"message": "Account is locked", "error_code": "ACCOUNT_LOCKED"}
        )
    
    return user


class OptionalAuth:
    """
    Optional authentication dependency.
    Returns None if no token provided, otherwise validates token.
    """
    
    def __call__(
        self,
        credentials: Optional[HTTPAuthorizationCredentials] = Depends(
            HTTPBearer(auto_error=False)
        ),
        db: Session = Depends(get_db)
    ) -> Optional[User]:
        """
        Get user if authenticated, None otherwise.
        
        Args:
            credentials: Optional HTTP Bearer credentials
            db: Database session
            
        Returns:
            User if authenticated, None otherwise
        """
        if not credentials:
            return None
        
        try:
            token = credentials.credentials
            payload = jwt_handler.verify_token(token, TokenType.ACCESS)
            user_id = UUID(payload["sub"])
            
            user_repo = SQLAlchemyUserRepository(db)
            return user_repo.get_by_id(user_id)
        except Exception:
            return None


# Instance for use as dependency
optional_auth = OptionalAuth()
