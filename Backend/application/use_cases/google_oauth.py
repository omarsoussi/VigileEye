"""
Google OAuth Use Case.
Handles Google OAuth authentication flow.
"""
import logging
from dataclasses import dataclass
from typing import Optional
from uuid import uuid4
import secrets

from domain.entities.user import User
from domain.repositories.user_repository import UserRepositoryInterface
from infrastructure.security.jwt_handler import JWTHandler
from infrastructure.external.google_oauth import GoogleOAuthClient, GoogleUser

logger = logging.getLogger(__name__)


@dataclass
class GoogleAuthInput:
    """Input data for Google OAuth callback."""
    code: str
    state: Optional[str] = None


@dataclass
class GoogleAuthOutput:
    """Output data from Google OAuth authentication."""
    user_id: str
    email: str
    username: str
    is_new_user: bool
    access_token: str
    refresh_token: str
    token_type: str
    message: str


class GoogleOAuthUseCase:
    """
    Use case for Google OAuth authentication.
    
    Steps:
    1. Exchange authorization code for access token
    2. Get user info from Google
    3. Find or create user
    4. Generate JWT tokens
    """
    
    def __init__(
        self,
        user_repository: UserRepositoryInterface,
        google_client: Optional[GoogleOAuthClient] = None,
        jwt_handler: Optional[JWTHandler] = None
    ):
        """
        Initialize use case with dependencies.
        
        Args:
            user_repository: Repository for user persistence
            google_client: Google OAuth client
            jwt_handler: JWT token handler
        """
        self._user_repository = user_repository
        self._google_client = google_client or GoogleOAuthClient()
        self._jwt_handler = jwt_handler or JWTHandler()
    
    def get_authorization_url(self, state: Optional[str] = None) -> str:
        """
        Get Google OAuth authorization URL.
        
        Args:
            state: Optional state for CSRF protection
            
        Returns:
            Authorization URL to redirect user to
        """
        return self._google_client.get_authorization_url(state)
    
    def execute(self, input_data: GoogleAuthInput) -> GoogleAuthOutput:
        """
        Execute the Google OAuth authentication.
        
        Args:
            input_data: Google auth input data
            
        Returns:
            Auth output with JWT tokens
        """
        # Get Google user info
        google_user = self._google_client.authenticate_sync(input_data.code)
        logger.info(f"Google OAuth for email: {google_user.email}")
        
        is_new_user = False
        
        # Try to find existing user by Google ID
        user = self._user_repository.get_by_google_id(google_user.id)
        
        if not user:
            # Try to find by email
            user = self._user_repository.get_by_email(google_user.email)
            
            if user:
                # Link Google account to existing user
                user.link_google_account(google_user.id)
                self._user_repository.update(user)
                logger.info(f"Linked Google account to existing user: {user.id}")
            else:
                # Create new user
                username = self._generate_username(google_user)
                
                user = User(
                    id=uuid4(),
                    email=google_user.email.lower(),
                    username=username,
                    password_hash="",  # No password for OAuth users
                    is_verified=True,  # Google verifies email
                    google_id=google_user.id
                )
                user = self._user_repository.create(user)
                is_new_user = True
                logger.info(f"Created new user from Google OAuth: {user.id}")
        
        # Update last login
        user.update_last_login()
        self._user_repository.update(user)
        
        # Generate JWT tokens
        tokens = self._jwt_handler.create_token_pair(
            user_id=user.id,
            email=user.email
        )
        
        return GoogleAuthOutput(
            user_id=str(user.id),
            email=user.email,
            username=user.username,
            is_new_user=is_new_user,
            access_token=tokens["access_token"],
            refresh_token=tokens["refresh_token"],
            token_type=tokens["token_type"],
            message="Google authentication successful"
        )
    
    def _generate_username(self, google_user: GoogleUser) -> str:
        """
        Generate a unique username from Google user info.
        
        Args:
            google_user: Google user profile
            
        Returns:
            Unique username
        """
        # Start with name or email prefix
        base_username = google_user.name.replace(" ", "_").lower()
        if not base_username:
            base_username = google_user.email.split("@")[0]
        
        # Clean username (alphanumeric and underscore only)
        base_username = "".join(c for c in base_username if c.isalnum() or c == "_")
        
        # Ensure minimum length
        if len(base_username) < 3:
            base_username = f"user_{base_username}"
        
        # Truncate if too long
        if len(base_username) > 45:
            base_username = base_username[:45]
        
        # Check uniqueness
        username = base_username
        counter = 1
        
        while self._user_repository.username_exists(username):
            suffix = f"_{secrets.token_hex(2)}"
            username = f"{base_username}{suffix}"
            counter += 1
            if counter > 10:
                # Fallback to random username
                username = f"user_{secrets.token_hex(4)}"
                break
        
        return username
