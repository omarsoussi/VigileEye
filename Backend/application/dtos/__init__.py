"""Application DTOs module."""
from application.dtos.auth_requests import (
    RegisterRequest,
    VerifyOTPRequest,
    LoginRequest,
    LoginConfirmRequest,
    ForgotPasswordRequest,
    ResetPasswordRequest,
    RefreshTokenRequest,
    GoogleCallbackRequest,
)
from application.dtos.auth_responses import (
    MessageResponse,
    TokenResponse,
    UserResponse,
    AuthResponse,
    GoogleAuthURLResponse,
    ErrorResponse,
)
from application.dtos.login_history_responses import (
    LoginHistoryResponse,
    LoginHistoryListResponse,
)

__all__ = [
    # Requests
    "RegisterRequest",
    "VerifyOTPRequest",
    "LoginRequest",
    "LoginConfirmRequest",
    "ForgotPasswordRequest",
    "ResetPasswordRequest",
    "RefreshTokenRequest",
    "GoogleCallbackRequest",
    # Responses
    "MessageResponse",
    "TokenResponse",
    "UserResponse",
    "AuthResponse",
    "GoogleAuthURLResponse",
    "ErrorResponse",
    "LoginHistoryResponse",
    "LoginHistoryListResponse",
]
