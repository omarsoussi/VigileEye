"""
Register User Use Case.
Handles new user registration with email verification.
"""
import logging
from dataclasses import dataclass
from uuid import uuid4

from domain.entities.user import User
from domain.entities.otp import OTP, OTPPurpose
from domain.repositories.user_repository import UserRepositoryInterface
from domain.repositories.otp_repository import OTPRepositoryInterface
from domain.exceptions import UserAlreadyExistsException, InvalidPasswordException
from domain.value_objects.password import Password
from infrastructure.security.password_hasher import PasswordHasher
from infrastructure.security.otp_generator import OTPGenerator
from infrastructure.external.email_sender import EmailSenderInterface
from infrastructure.config.settings import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()


@dataclass
class RegisterUserInput:
    """Input data for user registration."""
    email: str
    username: str
    password: str


@dataclass
class RegisterUserOutput:
    """Output data from user registration."""
    user_id: str
    email: str
    message: str


class RegisterUserUseCase:
    """
    Use case for registering new users.
    
    Steps:
    1. Validate password format
    2. Check email/username uniqueness
    3. Hash password
    4. Create user with is_verified=False
    5. Generate and send OTP via email
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
    
    def execute(self, input_data: RegisterUserInput) -> RegisterUserOutput:
        """
        Execute the registration use case.
        
        Args:
            input_data: Registration input data
            
        Returns:
            Registration output with user ID and message
            
        Raises:
            InvalidPasswordException: If password doesn't meet requirements
            UserAlreadyExistsException: If email or username already exists
        """
        email = input_data.email.lower().strip()
        username = input_data.username.strip()
        password = input_data.password
        
        # Validate password format
        validation_errors = Password.get_validation_errors(password)
        if validation_errors:
            raise InvalidPasswordException("; ".join(validation_errors))
        
        # Check email uniqueness
        if self._user_repository.email_exists(email):
            raise UserAlreadyExistsException(f"Email '{email}' is already registered")
        
        # Check username uniqueness
        if self._user_repository.username_exists(username):
            raise UserAlreadyExistsException(f"Username '{username}' is already taken")
        
        # Hash password
        password_hash = PasswordHasher.hash(password)
        
        # Create user entity
        user = User(
            id=uuid4(),
            email=email,
            username=username,
            password_hash=password_hash,
            is_verified=False
        )
        
        # Persist user
        created_user = self._user_repository.create(user)
        logger.info(f"Created new user: {created_user.id}")
        
        # Invalidate any existing OTPs
        self._otp_repository.invalidate_all_for_user(
            created_user.id,
            OTPPurpose.EMAIL_VERIFICATION
        )
        
        # Generate OTP
        otp_code = OTPGenerator.generate()
        otp = OTP.create(
            user_id=created_user.id,
            code=otp_code,
            purpose=OTPPurpose.EMAIL_VERIFICATION,
            expire_minutes=settings.otp_expire_minutes
        )
        
        # Persist OTP
        self._otp_repository.create(otp)
        logger.info(f"Created OTP for user: {created_user.id}")
        
        # Send verification email
        email_sent = self._email_sender.send_otp(
            to_email=email,
            otp_code=otp_code,
            purpose=OTPPurpose.EMAIL_VERIFICATION.value
        )
        
        if not email_sent:
            logger.warning(f"Failed to send verification email to {email}")
        
        return RegisterUserOutput(
            user_id=str(created_user.id),
            email=email,
            message="Verification code sent to your email"
        )
