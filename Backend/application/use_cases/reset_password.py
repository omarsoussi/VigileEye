"""
Reset Password Use Case.
Handles password reset with OTP validation.
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
    InvalidPasswordException,
)
from domain.value_objects.password import Password
from infrastructure.security.password_hasher import PasswordHasher

logger = logging.getLogger(__name__)


@dataclass
class ResetPasswordInput:
    """Input data for password reset."""
    email: str
    otp_code: str
    new_password: str


@dataclass
class ResetPasswordOutput:
    """Output data from password reset."""
    email: str
    message: str


class ResetPasswordUseCase:
    """
    Use case for resetting password with OTP.
    
    Steps:
    1. Find user by email
    2. Validate OTP
    3. Validate new password
    4. Update password hash
    5. Unlock account if locked
    """
    
    def __init__(
        self,
        user_repository: UserRepositoryInterface,
        otp_repository: OTPRepositoryInterface
    ):
        """
        Initialize use case with dependencies.
        
        Args:
            user_repository: Repository for user persistence
            otp_repository: Repository for OTP persistence
        """
        self._user_repository = user_repository
        self._otp_repository = otp_repository
    
    def execute(self, input_data: ResetPasswordInput) -> ResetPasswordOutput:
        """
        Execute the password reset use case.
        
        Args:
            input_data: Reset password input data
            
        Returns:
            Reset output with message
            
        Raises:
            UserNotFoundException: If user not found
            InvalidOTPException: If OTP is invalid
            OTPExpiredException: If OTP has expired
            InvalidPasswordException: If new password doesn't meet requirements
        """
        email = input_data.email.lower().strip()
        otp_code = input_data.otp_code.strip()
        new_password = input_data.new_password
        
        # Find user
        user = self._user_repository.get_by_email(email)
        if not user:
            raise UserNotFoundException("User not found")
        
        # Validate OTP
        otp = self._otp_repository.get_valid_otp(
            user_id=user.id,
            code=otp_code,
            purpose=OTPPurpose.PASSWORD_RESET
        )
        
        if not otp:
            # Check if OTP exists but expired
            latest_otp = self._otp_repository.get_latest_otp(
                user_id=user.id,
                purpose=OTPPurpose.PASSWORD_RESET
            )
            if latest_otp and latest_otp.is_expired():
                raise OTPExpiredException("Reset code has expired. Please request a new one.")
            raise InvalidOTPException("Invalid reset code")
        
        # Validate new password
        validation_errors = Password.get_validation_errors(new_password)
        if validation_errors:
            raise InvalidPasswordException("; ".join(validation_errors))
        
        # Hash new password
        password_hash = PasswordHasher.hash(new_password)
        
        # Update user password
        user.update_password(password_hash)
        
        # Reset failed attempts and unlock account
        user.reset_failed_attempts()
        
        # Save user
        self._user_repository.update(user)
        logger.info(f"Password reset for user: {user.id}")
        
        # Mark OTP as used
        self._otp_repository.mark_as_used(otp.id)
        
        # Invalidate all other password reset OTPs
        self._otp_repository.invalidate_all_for_user(
            user.id,
            OTPPurpose.PASSWORD_RESET
        )
        
        return ResetPasswordOutput(
            email=email,
            message="Password has been reset successfully"
        )
