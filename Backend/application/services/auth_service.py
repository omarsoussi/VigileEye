"""
Auth Service - Application service that orchestrates authentication use cases.
Acts as a facade for the API layer.
"""
import logging
from typing import Optional
from sqlalchemy.orm import Session

from application.use_cases import (
    RegisterUserUseCase,
    RegisterUserInput,
    VerifyEmailUseCase,
    VerifyEmailInput,
    LoginUserUseCase,
    LoginUserInput,
    ConfirmLoginUseCase,
    ConfirmLoginInput,
    ForgotPasswordUseCase,
    ForgotPasswordInput,
    ResetPasswordUseCase,
    ResetPasswordInput,
    GoogleOAuthUseCase,
    GoogleAuthInput,
    RefreshTokenUseCase,
    RefreshTokenInput,
)
from infrastructure.persistence.repositories import (
    SQLAlchemyUserRepository,
    SQLAlchemyOTPRepository,
)
from infrastructure.external.email_sender import get_email_sender, EmailSenderInterface
from infrastructure.external.google_oauth import GoogleOAuthClient
from infrastructure.security.jwt_handler import JWTHandler

logger = logging.getLogger(__name__)


class AuthService:
    """
    Application service that provides authentication functionality.
    Orchestrates use cases and manages dependencies.
    """
    
    def __init__(
        self,
        session: Session,
        email_sender: Optional[EmailSenderInterface] = None,
        google_client: Optional[GoogleOAuthClient] = None,
        jwt_handler: Optional[JWTHandler] = None
    ):
        """
        Initialize auth service with dependencies.
        
        Args:
            session: Database session
            email_sender: Email sending service
            google_client: Google OAuth client
            jwt_handler: JWT handler
        """
        self._session = session
        self._user_repo = SQLAlchemyUserRepository(session)
        self._otp_repo = SQLAlchemyOTPRepository(session)
        self._email_sender = email_sender or get_email_sender()
        self._google_client = google_client or GoogleOAuthClient()
        self._jwt_handler = jwt_handler or JWTHandler()

    @property
    def session(self) -> Session:
        return self._session

    @property
    def user_repo(self) -> SQLAlchemyUserRepository:
        return self._user_repo
    
    def register(self, email: str, username: str, password: str) -> dict:
        """
        Register a new user.
        
        Args:
            email: User's email
            username: User's username
            password: User's password
            
        Returns:
            Registration result
        """
        use_case = RegisterUserUseCase(
            user_repository=self._user_repo,
            otp_repository=self._otp_repo,
            email_sender=self._email_sender
        )
        
        result = use_case.execute(RegisterUserInput(
            email=email,
            username=username,
            password=password
        ))
        
        return {
            "user_id": result.user_id,
            "email": result.email,
            "message": result.message
        }
    
    def verify_email(self, email: str, otp_code: str) -> dict:
        """
        Verify user's email with OTP.
        
        Args:
            email: User's email
            otp_code: OTP code
            
        Returns:
            Verification result
        """
        use_case = VerifyEmailUseCase(
            user_repository=self._user_repo,
            otp_repository=self._otp_repo,
            email_sender=self._email_sender
        )
        
        result = use_case.execute(VerifyEmailInput(
            email=email,
            otp_code=otp_code
        ))
        
        return {
            "email": result.email,
            "is_verified": result.is_verified,
            "message": result.message
        }
    
    def login(self, email: str, password: str) -> dict:
        """
        Initiate login (step 1 - validate credentials).
        
        Args:
            email: User's email
            password: User's password
            
        Returns:
            Login result (OTP sent)
        """
        use_case = LoginUserUseCase(
            user_repository=self._user_repo,
            otp_repository=self._otp_repo,
            email_sender=self._email_sender
        )
        
        result = use_case.execute(LoginUserInput(
            email=email,
            password=password
        ))
        
        return {
            "email": result.email,
            "message": result.message,
            "requires_2fa": result.requires_2fa
        }
    
    def confirm_login(self, email: str, otp_code: str) -> dict:
        """
        Confirm login with 2FA OTP (step 2).
        
        Args:
            email: User's email
            otp_code: 2FA OTP code
            
        Returns:
            Auth result with tokens
        """
        use_case = ConfirmLoginUseCase(
            user_repository=self._user_repo,
            otp_repository=self._otp_repo,
            jwt_handler=self._jwt_handler
        )
        
        result = use_case.execute(ConfirmLoginInput(
            email=email,
            otp_code=otp_code
        ))
        
        return {
            "user_id": result.user_id,
            "email": result.email,
            "username": result.username,
            "access_token": result.access_token,
            "refresh_token": result.refresh_token,
            "token_type": result.token_type,
            "message": result.message
        }
    
    def forgot_password(self, email: str) -> dict:
        """
        Initiate password reset.
        
        Args:
            email: User's email
            
        Returns:
            Result message
        """
        use_case = ForgotPasswordUseCase(
            user_repository=self._user_repo,
            otp_repository=self._otp_repo,
            email_sender=self._email_sender
        )
        
        result = use_case.execute(ForgotPasswordInput(email=email))
        
        return {
            "email": result.email,
            "message": result.message
        }
    
    def reset_password(self, email: str, otp_code: str, new_password: str) -> dict:
        """
        Reset password with OTP.
        
        Args:
            email: User's email
            otp_code: Reset OTP code
            new_password: New password
            
        Returns:
            Result message
        """
        use_case = ResetPasswordUseCase(
            user_repository=self._user_repo,
            otp_repository=self._otp_repo
        )
        
        result = use_case.execute(ResetPasswordInput(
            email=email,
            otp_code=otp_code,
            new_password=new_password
        ))
        
        return {
            "email": result.email,
            "message": result.message
        }
    
    def get_google_auth_url(self, state: Optional[str] = None) -> str:
        """
        Get Google OAuth authorization URL.
        
        Args:
            state: CSRF state parameter
            
        Returns:
            Authorization URL
        """
        use_case = GoogleOAuthUseCase(
            user_repository=self._user_repo,
            google_client=self._google_client,
            jwt_handler=self._jwt_handler
        )
        
        return use_case.get_authorization_url(state)
    
    def google_callback(self, code: str, state: Optional[str] = None) -> dict:
        """
        Handle Google OAuth callback.
        
        Args:
            code: Authorization code from Google
            state: CSRF state parameter
            
        Returns:
            Auth result with tokens
        """
        use_case = GoogleOAuthUseCase(
            user_repository=self._user_repo,
            google_client=self._google_client,
            jwt_handler=self._jwt_handler
        )
        
        result = use_case.execute(GoogleAuthInput(code=code, state=state))
        
        return {
            "user_id": result.user_id,
            "email": result.email,
            "username": result.username,
            "is_new_user": result.is_new_user,
            "access_token": result.access_token,
            "refresh_token": result.refresh_token,
            "token_type": result.token_type,
            "message": result.message
        }
    
    def refresh_tokens(self, refresh_token: str) -> dict:
        """
        Refresh JWT tokens.
        
        Args:
            refresh_token: Valid refresh token
            
        Returns:
            New token pair
        """
        use_case = RefreshTokenUseCase(
            user_repository=self._user_repo,
            jwt_handler=self._jwt_handler
        )
        
        result = use_case.execute(RefreshTokenInput(refresh_token=refresh_token))
        
        return {
            "access_token": result.access_token,
            "refresh_token": result.refresh_token,
            "token_type": result.token_type,
            "message": result.message
        }
