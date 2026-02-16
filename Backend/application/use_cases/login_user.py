"""
Login User Use Case.
Handles initial login validation and OTP generation for 2FA.
"""
import logging
from dataclasses import dataclass
from datetime import datetime, timedelta

from domain.entities.otp import OTP, OTPPurpose
from domain.repositories.user_repository import UserRepositoryInterface
from domain.repositories.otp_repository import OTPRepositoryInterface
from domain.exceptions import (
    UserNotFoundException,
    InvalidCredentialsException,
    AccountLockedException,
    AccountNotVerifiedException,
)
from infrastructure.security.password_hasher import PasswordHasher
from infrastructure.security.otp_generator import OTPGenerator
from infrastructure.external.email_sender import EmailSenderInterface
from infrastructure.config.settings import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()


@dataclass
class LoginUserInput:
    """Input data for login."""
    email: str
    password: str


@dataclass
class LoginUserOutput:
    """Output data from login (OTP sent)."""
    email: str
    message: str
    requires_2fa: bool = True


class LoginUserUseCase:
    """
    Use case for user login (step 1 - credential validation).
    
    Steps:
    1. Find user by email
    2. Check if account is locked
    3. Validate password
    4. Check if email is verified
    5. Generate and send 2FA OTP
    6. Track failed attempts
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
    
    def execute(self, input_data: LoginUserInput) -> LoginUserOutput:
        """
        Execute the login use case (credential validation).
        
        Args:
            input_data: Login input data
            
        Returns:
            Login output indicating OTP was sent
            
        Raises:
            UserNotFoundException: If user not found
            AccountLockedException: If account is locked
            InvalidCredentialsException: If password is wrong
            AccountNotVerifiedException: If email not verified
        """
        email = input_data.email.lower().strip()
        password = input_data.password
        
        # Find user
        user = self._user_repository.get_by_email(email)
        if not user:
            raise UserNotFoundException("Invalid email or password")
        
        # Check if account is locked
        if user.is_locked():
            remaining_minutes = int((user.lockout_until - datetime.utcnow()).total_seconds() / 60)
            raise AccountLockedException(
                f"Account is locked. Please try again in {remaining_minutes} minutes."
            )
        
        # Clear lockout if expired
        if user.lockout_until and datetime.utcnow() >= user.lockout_until:
            user.unlock_account()
            self._user_repository.update(user)
        
        # Validate password
        if not PasswordHasher.verify(password, user.password_hash):
            # Increment failed attempts
            user.increment_failed_attempts()
            
            # Check if should lock account
            if user.failed_login_attempts >= settings.max_failed_login_attempts:
                lockout_until = datetime.utcnow() + timedelta(
                    minutes=settings.lockout_duration_minutes
                )
                user.lock_account(lockout_until)
                self._user_repository.update(user)
                logger.warning(f"Account locked for user: {user.id}")
                raise AccountLockedException(
                    f"Too many failed attempts. Account locked for {settings.lockout_duration_minutes} minutes."
                )
            
            self._user_repository.update(user)
            remaining_attempts = settings.max_failed_login_attempts - user.failed_login_attempts
            raise InvalidCredentialsException(
                f"Invalid email or password. {remaining_attempts} attempts remaining."
            )
        
        # Check if email is verified
        if not user.is_verified:
            # Generate new verification OTP
            self._otp_repository.invalidate_all_for_user(
                user.id,
                OTPPurpose.EMAIL_VERIFICATION
            )
            
            otp_code = OTPGenerator.generate()
            otp = OTP.create(
                user_id=user.id,
                code=otp_code,
                purpose=OTPPurpose.EMAIL_VERIFICATION,
                expire_minutes=settings.otp_expire_minutes
            )
            self._otp_repository.create(otp)
            
            self._email_sender.send_otp(
                to_email=email,
                otp_code=otp_code,
                purpose=OTPPurpose.EMAIL_VERIFICATION.value
            )
            
            raise AccountNotVerifiedException(
                "Please verify your email first. A new verification code has been sent."
            )
        
        # Generate 2FA OTP
        self._otp_repository.invalidate_all_for_user(
            user.id,
            OTPPurpose.LOGIN_2FA
        )
        
        otp_code = OTPGenerator.generate()
        otp = OTP.create(
            user_id=user.id,
            code=otp_code,
            purpose=OTPPurpose.LOGIN_2FA,
            expire_minutes=settings.otp_expire_minutes
        )
        self._otp_repository.create(otp)
        logger.info(f"2FA OTP generated for user: {user.id}")
        
        # Send 2FA email
        self._email_sender.send_otp(
            to_email=email,
            otp_code=otp_code,
            purpose=OTPPurpose.LOGIN_2FA.value
        )
        
        return LoginUserOutput(
            email=email,
            message="Verification code sent to your email",
            requires_2fa=True
        )
