"""Application layer module."""
from application.dtos import (
    RegisterRequest,
    VerifyOTPRequest,
    LoginRequest,
    LoginConfirmRequest,
    ForgotPasswordRequest,
    ResetPasswordRequest,
    RefreshTokenRequest,
    GoogleCallbackRequest,
    MessageResponse,
    TokenResponse,
    UserResponse,
    AuthResponse,
    GoogleAuthURLResponse,
    ErrorResponse,
)
from application.services import AuthService
from application.use_cases import (
    RegisterUserUseCase,
    VerifyEmailUseCase,
    LoginUserUseCase,
    ConfirmLoginUseCase,
    ForgotPasswordUseCase,
    ResetPasswordUseCase,
    GoogleOAuthUseCase,
    RefreshTokenUseCase,
)

__all__ = [
    # DTOs
    "RegisterRequest",
    "VerifyOTPRequest",
    "LoginRequest",
    "LoginConfirmRequest",
    "ForgotPasswordRequest",
    "ResetPasswordRequest",
    "RefreshTokenRequest",
    "GoogleCallbackRequest",
    "MessageResponse",
    "TokenResponse",
    "UserResponse",
    "AuthResponse",
    "GoogleAuthURLResponse",
    "ErrorResponse",
    # Services
    "AuthService",
    # Use Cases
    "RegisterUserUseCase",
    "VerifyEmailUseCase",
    "LoginUserUseCase",
    "ConfirmLoginUseCase",
    "ForgotPasswordUseCase",
    "ResetPasswordUseCase",
    "GoogleOAuthUseCase",
    "RefreshTokenUseCase",
]
