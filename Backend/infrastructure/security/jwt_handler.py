"""
JWT Token utilities for authentication.
Handles token creation, validation, and extraction.
"""
from datetime import datetime, timedelta
from typing import Optional, Any
from uuid import UUID
from jose import jwt, JWTError

from infrastructure.config.settings import get_settings
from domain.exceptions import TokenExpiredException, InvalidTokenException

settings = get_settings()


class TokenType:
    """Token type constants."""
    ACCESS = "access"
    REFRESH = "refresh"


class JWTHandler:
    """
    JWT token handler for authentication.
    Creates and validates access and refresh tokens.
    """
    
    def __init__(
        self,
        secret_key: str = None,
        algorithm: str = None,
        access_expire_minutes: int = None,
        refresh_expire_days: int = None
    ):
        """
        Initialize JWT handler with configuration.
        
        Args:
            secret_key: Secret key for signing tokens
            algorithm: JWT algorithm (default HS256)
            access_expire_minutes: Access token expiry in minutes
            refresh_expire_days: Refresh token expiry in days
        """
        self.secret_key = secret_key or settings.jwt_secret_key
        self.algorithm = algorithm or settings.jwt_algorithm
        self.access_expire_minutes = access_expire_minutes or settings.access_token_expire_minutes
        self.refresh_expire_days = refresh_expire_days or settings.refresh_token_expire_days
    
    def create_access_token(
        self,
        user_id: UUID,
        email: str,
        additional_claims: dict = None
    ) -> str:
        """
        Create an access token for a user.
        
        Args:
            user_id: User's UUID
            email: User's email
            additional_claims: Extra claims to include
            
        Returns:
            Encoded JWT access token
        """
        expire = datetime.utcnow() + timedelta(minutes=self.access_expire_minutes)
        
        payload = {
            "sub": str(user_id),
            "email": email,
            "type": TokenType.ACCESS,
            "exp": expire,
            "iat": datetime.utcnow(),
        }
        
        if additional_claims:
            payload.update(additional_claims)
        
        return jwt.encode(payload, self.secret_key, algorithm=self.algorithm)
    
    def create_refresh_token(self, user_id: UUID) -> str:
        """
        Create a refresh token for a user.
        
        Args:
            user_id: User's UUID
            
        Returns:
            Encoded JWT refresh token
        """
        expire = datetime.utcnow() + timedelta(days=self.refresh_expire_days)
        
        payload = {
            "sub": str(user_id),
            "type": TokenType.REFRESH,
            "exp": expire,
            "iat": datetime.utcnow(),
        }
        
        return jwt.encode(payload, self.secret_key, algorithm=self.algorithm)
    
    def create_token_pair(
        self,
        user_id: UUID,
        email: str,
        additional_claims: dict = None
    ) -> dict[str, str]:
        """
        Create both access and refresh tokens.
        
        Args:
            user_id: User's UUID
            email: User's email
            additional_claims: Extra claims for access token
            
        Returns:
            Dictionary with access_token and refresh_token
        """
        return {
            "access_token": self.create_access_token(user_id, email, additional_claims),
            "refresh_token": self.create_refresh_token(user_id),
            "token_type": "bearer"
        }
    
    def verify_token(self, token: str, token_type: str = TokenType.ACCESS) -> dict[str, Any]:
        """
        Verify and decode a JWT token.
        
        Args:
            token: JWT token string
            token_type: Expected token type (access or refresh)
            
        Returns:
            Decoded token payload
            
        Raises:
            TokenExpiredException: If token has expired
            InvalidTokenException: If token is invalid
        """
        try:
            payload = jwt.decode(
                token,
                self.secret_key,
                algorithms=[self.algorithm]
            )
            
            # Verify token type
            if payload.get("type") != token_type:
                raise InvalidTokenException(f"Invalid token type. Expected {token_type}")
            
            return payload
            
        except jwt.ExpiredSignatureError:
            raise TokenExpiredException("Token has expired")
        except JWTError as e:
            raise InvalidTokenException(f"Invalid token: {str(e)}")
    
    def get_user_id_from_token(self, token: str, token_type: str = TokenType.ACCESS) -> UUID:
        """
        Extract user ID from a token.
        
        Args:
            token: JWT token string
            token_type: Expected token type
            
        Returns:
            User's UUID
        """
        payload = self.verify_token(token, token_type)
        return UUID(payload["sub"])
    
    def refresh_access_token(self, refresh_token: str, email: str) -> dict[str, str]:
        """
        Create new access token using refresh token.
        
        Args:
            refresh_token: Valid refresh token
            email: User's email for new access token
            
        Returns:
            New token pair
        """
        user_id = self.get_user_id_from_token(refresh_token, TokenType.REFRESH)
        return self.create_token_pair(user_id, email)


# Global instance
jwt_handler = JWTHandler()
