"""
Refresh Token Use Case.
Handles JWT token refresh.
"""
import logging
from dataclasses import dataclass
from typing import Optional
from uuid import UUID

from domain.repositories.user_repository import UserRepositoryInterface
from domain.exceptions import UserNotFoundException, InvalidTokenException
from infrastructure.security.jwt_handler import JWTHandler, TokenType

logger = logging.getLogger(__name__)


@dataclass
class RefreshTokenInput:
    """Input data for token refresh."""
    refresh_token: str


@dataclass
class RefreshTokenOutput:
    """Output data from token refresh."""
    access_token: str
    refresh_token: str
    token_type: str
    message: str


class RefreshTokenUseCase:
    """
    Use case for refreshing JWT tokens.
    
    Steps:
    1. Validate refresh token
    2. Find user by ID from token
    3. Generate new token pair
    """
    
    def __init__(
        self,
        user_repository: UserRepositoryInterface,
        jwt_handler: Optional[JWTHandler] = None
    ):
        """
        Initialize use case with dependencies.
        
        Args:
            user_repository: Repository for user persistence
            jwt_handler: JWT token handler
        """
        self._user_repository = user_repository
        self._jwt_handler = jwt_handler or JWTHandler()
    
    def execute(self, input_data: RefreshTokenInput) -> RefreshTokenOutput:
        """
        Execute the token refresh use case.
        
        Args:
            input_data: Refresh token input data
            
        Returns:
            New token pair
            
        Raises:
            InvalidTokenException: If refresh token is invalid
            UserNotFoundException: If user not found
        """
        refresh_token = input_data.refresh_token
        
        # Verify and decode refresh token
        try:
            payload = self._jwt_handler.verify_token(refresh_token, TokenType.REFRESH)
            user_id = UUID(payload["sub"])
        except Exception as e:
            logger.warning(f"Invalid refresh token: {str(e)}")
            raise InvalidTokenException("Invalid or expired refresh token")
        
        # Find user
        user = self._user_repository.get_by_id(user_id)
        if not user:
            raise UserNotFoundException("User not found")
        
        # Generate new token pair
        tokens = self._jwt_handler.create_token_pair(
            user_id=user.id,
            email=user.email
        )
        
        logger.info(f"Tokens refreshed for user: {user.id}")
        
        return RefreshTokenOutput(
            access_token=tokens["access_token"],
            refresh_token=tokens["refresh_token"],
            token_type=tokens["token_type"],
            message="Tokens refreshed successfully"
        )
