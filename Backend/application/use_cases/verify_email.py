"""
Verify Email Use Case.
Handles email verification using OTP code.
"""
import logging
from dataclasses import dataclass

from domain.entities.otp import OTPPurpose
from domain.repositories.user_repository import UserRepositoryInterface
from domain.repositories.otp_repository import OTPRepositoryInterface
from domain.exceptions import (
    UserNotFoundException,
    InvalidOTPException,
    OTPExpiredException,
)
from infrastructure.external.email_sender import EmailSenderInterface

logger = logging.getLogger(__name__)


@dataclass
class VerifyEmailInput:
    """Input data for email verification."""
    email: str
    otp_code: str


@dataclass
class VerifyEmailOutput:
    """Output data from email verification."""
    email: str
    is_verified: bool
    message: str


class VerifyEmailUseCase:
    """
    Use case for verifying user email with OTP.
    
    Steps:
    1. Find user by email
    2. Validate OTP code
    3. Mark email as verified
    4. Mark OTP as used
    5. Send welcome email
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
    
    def execute(self, input_data: VerifyEmailInput) -> VerifyEmailOutput:
        """
        Execute the email verification use case.
        
        Args:
            input_data: Verification input data
            
        Returns:
            Verification output
            
        Raises:
            UserNotFoundException: If user not found
            InvalidOTPException: If OTP is invalid
            OTPExpiredException: If OTP has expired
        """
        email = input_data.email.lower().strip()
        otp_code = input_data.otp_code.strip()
        
        # Find user
        user = self._user_repository.get_by_email(email)
        if not user:
            raise UserNotFoundException(f"User with email '{email}' not found")
        
        # Check if already verified
        if user.is_verified:
            return VerifyEmailOutput(
                email=email,
                is_verified=True,
                message="Email is already verified"
            )
        
        # Validate OTP
        otp = self._otp_repository.get_valid_otp(
            user_id=user.id,
            code=otp_code,
            purpose=OTPPurpose.EMAIL_VERIFICATION
        )
        
        if not otp:
            # Check if OTP exists but expired
            latest_otp = self._otp_repository.get_latest_otp(
                user_id=user.id,
                purpose=OTPPurpose.EMAIL_VERIFICATION
            )
            if latest_otp and latest_otp.is_expired():
                raise OTPExpiredException("Verification code has expired. Please request a new one.")
            raise InvalidOTPException("Invalid verification code")
        
        # Mark email as verified
        user.verify_email()
        self._user_repository.update(user)
        logger.info(f"Email verified for user: {user.id}")
        
        # Mark OTP as used
        self._otp_repository.mark_as_used(otp.id)
        
        # Send welcome email
        self._email_sender.send_welcome(email, user.username)
        
        return VerifyEmailOutput(
            email=email,
            is_verified=True,
            message="Email verified successfully"
        )
