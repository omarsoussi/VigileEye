"""Application use cases module."""
from application.use_cases.register_user import (
    RegisterUserUseCase,
    RegisterUserInput,
    RegisterUserOutput,
)
from application.use_cases.verify_email import (
    VerifyEmailUseCase,
    VerifyEmailInput,
    VerifyEmailOutput,
)
from application.use_cases.login_user import (
    LoginUserUseCase,
    LoginUserInput,
    LoginUserOutput,
)
from application.use_cases.confirm_login import (
    ConfirmLoginUseCase,
    ConfirmLoginInput,
    ConfirmLoginOutput,
)
from application.use_cases.forgot_password import (
    ForgotPasswordUseCase,
    ForgotPasswordInput,
    ForgotPasswordOutput,
)
from application.use_cases.reset_password import (
    ResetPasswordUseCase,
    ResetPasswordInput,
    ResetPasswordOutput,
)
from application.use_cases.google_oauth import (
    GoogleOAuthUseCase,
    GoogleAuthInput,
    GoogleAuthOutput,
)
from application.use_cases.refresh_token import (
    RefreshTokenUseCase,
    RefreshTokenInput,
    RefreshTokenOutput,
)

__all__ = [
    # Register
    "RegisterUserUseCase",
    "RegisterUserInput",
    "RegisterUserOutput",
    # Verify Email
    "VerifyEmailUseCase",
    "VerifyEmailInput",
    "VerifyEmailOutput",
    # Login
    "LoginUserUseCase",
    "LoginUserInput",
    "LoginUserOutput",
    # Confirm Login
    "ConfirmLoginUseCase",
    "ConfirmLoginInput",
    "ConfirmLoginOutput",
    # Forgot Password
    "ForgotPasswordUseCase",
    "ForgotPasswordInput",
    "ForgotPasswordOutput",
    # Reset Password
    "ResetPasswordUseCase",
    "ResetPasswordInput",
    "ResetPasswordOutput",
    # Google OAuth
    "GoogleOAuthUseCase",
    "GoogleAuthInput",
    "GoogleAuthOutput",
    # Refresh Token
    "RefreshTokenUseCase",
    "RefreshTokenInput",
    "RefreshTokenOutput",
]
