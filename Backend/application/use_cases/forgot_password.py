"""
Forgot Password Use Case.
Handles password reset request and OTP generation.
"""
import logging
from dataclasses import dataclass

from domain.entities.otp import OTP, OTPPurpose
from domain.repositories.user_repository import UserRepositoryInterface
from domain.repositories.otp_repository import OTPRepositoryInterface
from domain.exceptions import UserNotFoundException
from infrastructure.security.otp_generator import OTPGenerator
from infrastructure.external.email_sender import EmailSenderInterface
from infrastructure.config.settings import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()


@dataclass
class ForgotPasswordInput:
    """Input data for forgot password."""
    email: str


@dataclass
class ForgotPasswordOutput:
    """Output data from forgot password."""
    email: str
    message: str


class ForgotPasswordUseCase:
    """
    Use case for initiating password reset.
    
    Steps:
    1. Find user by email
    2. Generate password reset OTP
    3. Send reset email
    """
    
    def __init__(
        self,
        user_repository: UserRepositoryInterface,
        otp_repository: OTPRepositoryInterface,
        email_sender: EmailSenderInterface
    ):
        """
        Initialize use case with dependencies.
        
        Args:
            user_repository: Repository for user persistence
            otp_repository: Repository for OTP persistence
            email_sender: Service for sending emails
        """
        self._user_repository = user_repository
        self._otp_repository = otp_repository
        self._email_sender = email_sender
    
    def execute(self, input_data: ForgotPasswordInput) -> ForgotPasswordOutput:
        """
        Execute the forgot password use case.
        
        Args:
            input_data: Forgot password input data
            
        Returns:
            Output with message
            
        Note:
            For security, we always return success message even if email doesn't exist
            to prevent email enumeration attacks.
        """
        email = input_data.email.lower().strip()
        
        # Find user (but don't expose if not found)
        user = self._user_repository.get_by_email(email)
        
        # Generic response for security
        success_message = "If an account exists with this email, a reset code has been sent"
        
        if not user:
            # Log but don't expose to user
            logger.info(f"Password reset requested for non-existent email: {email}")
            return ForgotPasswordOutput(
                email=email,
                message=success_message
            )
        
        # Invalidate any existing password reset OTPs
        self._otp_repository.invalidate_all_for_user(
            user.id,
            OTPPurpose.PASSWORD_RESET
        )
        
        # Generate OTP
        otp_code = OTPGenerator.generate()
        otp = OTP.create(
            user_id=user.id,
            code=otp_code,
            purpose=OTPPurpose.PASSWORD_RESET,
            expire_minutes=settings.otp_expire_minutes
        )
        
        # Persist OTP
        self._otp_repository.create(otp)
        logger.info(f"Password reset OTP generated for user: {user.id}")
        
        # Send reset email
        self._email_sender.send_otp(
            to_email=email,
            otp_code=otp_code,
            purpose=OTPPurpose.PASSWORD_RESET.value
        )
        
        return ForgotPasswordOutput(
            email=email,
            message=success_message
        )
