"""
Pydantic DTOs for authentication requests and responses.
Used for API input validation and response serialization.
"""
from pydantic import BaseModel, EmailStr, Field, field_validator
from typing import Optional
from datetime import datetime
from uuid import UUID
import re


class RegisterRequest(BaseModel):
    """DTO for user registration request."""
    email: EmailStr = Field(..., description="User's email address")
    username: str = Field(
        ...,
        min_length=3,
        max_length=50,
        description="Unique username"
    )
    password: str = Field(
        ...,
        min_length=12,
        description="Password (min 12 chars, uppercase, lowercase, digit, special char)"
    )
    
    @field_validator('username')
    @classmethod
    def username_alphanumeric(cls, v: str) -> str:
        if not re.match(r'^[a-zA-Z0-9_]+$', v):
            raise ValueError('Username must be alphanumeric (underscores allowed)')
        return v
    
    @field_validator('password')
    @classmethod
    def password_strength(cls, v: str) -> str:
        errors = []
        if len(v) < 12:
            errors.append("Password must be at least 12 characters long")
        if not re.search(r'[A-Z]', v):
            errors.append("Password must contain at least one uppercase letter")
        if not re.search(r'[a-z]', v):
            errors.append("Password must contain at least one lowercase letter")
        if not re.search(r'\d', v):
            errors.append("Password must contain at least one digit")
        if not re.search(r'[!@#$%^&*(),.?":{}|<>_\-+=\[\]\\\/~`]', v):
            errors.append("Password must contain at least one special character")
        if errors:
            raise ValueError("; ".join(errors))
        return v


class VerifyOTPRequest(BaseModel):
    """DTO for OTP verification request."""
    email: EmailStr = Field(..., description="User's email address")
    otp_code: str = Field(
        ...,
        min_length=6,
        max_length=6,
        description="6-digit OTP code"
    )
    
    @field_validator('otp_code')
    @classmethod
    def otp_digits_only(cls, v: str) -> str:
        if not v.isdigit():
            raise ValueError('OTP code must contain only digits')
        return v


class LoginRequest(BaseModel):
    """DTO for login request."""
    email: EmailStr = Field(..., description="User's email address")
    password: str = Field(..., description="User's password")


class LoginConfirmRequest(BaseModel):
    """DTO for login confirmation with OTP."""
    email: EmailStr = Field(..., description="User's email address")
    otp_code: str = Field(
        ...,
        min_length=6,
        max_length=6,
        description="6-digit OTP code"
    )
    
    @field_validator('otp_code')
    @classmethod
    def otp_digits_only(cls, v: str) -> str:
        if not v.isdigit():
            raise ValueError('OTP code must contain only digits')
        return v


class ForgotPasswordRequest(BaseModel):
    """DTO for forgot password request."""
    email: EmailStr = Field(..., description="User's email address")


class ResetPasswordRequest(BaseModel):
    """DTO for password reset request."""
    email: EmailStr = Field(..., description="User's email address")
    otp_code: str = Field(
        ...,
        min_length=6,
        max_length=6,
        description="6-digit OTP code"
    )
    new_password: str = Field(
        ...,
        min_length=12,
        description="New password"
    )
    
    @field_validator('otp_code')
    @classmethod
    def otp_digits_only(cls, v: str) -> str:
        if not v.isdigit():
            raise ValueError('OTP code must contain only digits')
        return v
    
    @field_validator('new_password')
    @classmethod
    def password_strength(cls, v: str) -> str:
        errors = []
        if len(v) < 12:
            errors.append("Password must be at least 12 characters long")
        if not re.search(r'[A-Z]', v):
            errors.append("Password must contain at least one uppercase letter")
        if not re.search(r'[a-z]', v):
            errors.append("Password must contain at least one lowercase letter")
        if not re.search(r'\d', v):
            errors.append("Password must contain at least one digit")
        if not re.search(r'[!@#$%^&*(),.?":{}|<>_\-+=\[\]\\\/~`]', v):
            errors.append("Password must contain at least one special character")
        if errors:
            raise ValueError("; ".join(errors))
        return v


class RefreshTokenRequest(BaseModel):
    """DTO for token refresh request."""
    refresh_token: str = Field(..., description="Refresh token")


class GoogleCallbackRequest(BaseModel):
    """DTO for Google OAuth callback."""
    code: str = Field(..., description="Authorization code from Google")
    state: Optional[str] = Field(None, description="CSRF state parameter")
