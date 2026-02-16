"""
Confirm Login Use Case.
Handles 2FA verification and JWT token generation.
"""
import logging
from dataclasses import dataclass
from typing import Optional

from domain.entities.otp import OTPPurpose
from domain.repositories.user_repository import UserRepositoryInterface
from domain.repositories.otp_repository import OTPRepositoryInterface
from domain.exceptions import (
    UserNotFoundException,
    InvalidOTPException,
    OTPExpiredException,
)
from infrastructure.security.jwt_handler import JWTHandler
from infrastructure.config.settings import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()


@dataclass
class ConfirmLoginInput:
    """Input data for login confirmation."""
    email: str
    otp_code: str


@dataclass
class ConfirmLoginOutput:
    """Output data from login confirmation."""
    user_id: str
    email: str
    username: str
    access_token: str
    refresh_token: str
    token_type: str
    message: str


class ConfirmLoginUseCase:
    """
    Use case for confirming login with 2FA OTP.
    
    Steps:
    1. Find user by email
    2. Validate 2FA OTP
    3. Reset failed attempts
    4. Update last login
    5. Generate JWT tokens
    """
    
    def __init__(
        self,
        user_repository: UserRepositoryInterface,
        otp_repository: OTPRepositoryInterface,
        jwt_handler: Optional[JWTHandler] = None
    ):
        """
        Initialize use case with dependencies.
        
        Args:
            user_repository: Repository for user persistence
            otp_repository: Repository for OTP persistence
            jwt_handler: JWT token handler
        """
        self._user_repository = user_repository
        self._otp_repository = otp_repository
        self._jwt_handler = jwt_handler or JWTHandler()
    
    def execute(self, input_data: ConfirmLoginInput) -> ConfirmLoginOutput:
        """
        Execute the login confirmation use case.
        
        Args:
            input_data: Login confirmation input data
            
        Returns:
            Login output with JWT tokens
            
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
            raise UserNotFoundException("User not found")
        
        # Validate 2FA OTP
        otp = self._otp_repository.get_valid_otp(
            user_id=user.id,
            code=otp_code,
            purpose=OTPPurpose.LOGIN_2FA
        )
        
        if not otp:
            # Check if OTP exists but expired
            latest_otp = self._otp_repository.get_latest_otp(
                user_id=user.id,
                purpose=OTPPurpose.LOGIN_2FA
            )
            if latest_otp and latest_otp.is_expired():
                raise OTPExpiredException("Verification code has expired. Please login again.")
            raise InvalidOTPException("Invalid verification code")
        
        # Mark OTP as used
        self._otp_repository.mark_as_used(otp.id)
        
        # Reset failed attempts and update last login
        user.reset_failed_attempts()
        user.update_last_login()
        self._user_repository.update(user)
        logger.info(f"User logged in: {user.id}")
        
        # Generate JWT tokens
        tokens = self._jwt_handler.create_token_pair(
            user_id=user.id,
            email=user.email
        )
        
        return ConfirmLoginOutput(
            user_id=str(user.id),
            email=user.email,
            username=user.username,
            access_token=tokens["access_token"],
            refresh_token=tokens["refresh_token"],
            token_type=tokens["token_type"],
            message="Login successful"
        )
