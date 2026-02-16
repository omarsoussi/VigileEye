"""Infrastructure layer module."""
from infrastructure.config import Settings, get_settings
from infrastructure.persistence import (
    Base,
    engine,
    SessionLocal,
    get_db,
    init_db,
    UserModel,
    OTPModel,
    SQLAlchemyUserRepository,
    SQLAlchemyOTPRepository,
)
from infrastructure.security import (
    PasswordHasher,
    JWTHandler,
    jwt_handler,
    TokenType,
    OTPGenerator,
)
from infrastructure.external import (
    EmailSenderInterface,
    SMTPEmailSender,
    MockEmailSender,
    get_email_sender,
    GoogleOAuthClient,
    GoogleUser,
    google_oauth_client,
)

__all__ = [
    # Config
    "Settings",
    "get_settings",
    # Persistence
    "Base",
    "engine",
    "SessionLocal",
    "get_db",
    "init_db",
    "UserModel",
    "OTPModel",
    "SQLAlchemyUserRepository",
    "SQLAlchemyOTPRepository",
    # Security
    "PasswordHasher",
    "JWTHandler",
    "jwt_handler",
    "TokenType",
    "OTPGenerator",
    # External
    "EmailSenderInterface",
    "SMTPEmailSender",
    "MockEmailSender",
    "get_email_sender",
    "GoogleOAuthClient",
    "GoogleUser",
    "google_oauth_client",
]
