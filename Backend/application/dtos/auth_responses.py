"""
Pydantic DTOs for authentication responses.
Used for API response serialization.
"""
from pydantic import BaseModel, Field, ConfigDict
from typing import Optional
from datetime import datetime
from uuid import UUID


class MessageResponse(BaseModel):
    """Generic message response."""
    message: str = Field(..., description="Response message")
    success: bool = Field(default=True, description="Whether operation was successful")


class TokenResponse(BaseModel):
    """Response containing JWT tokens."""
    access_token: str = Field(..., description="JWT access token")
    refresh_token: str = Field(..., description="JWT refresh token")
    token_type: str = Field(default="bearer", description="Token type")
    expires_in: int = Field(default=1800, description="Token expiry in seconds")


class UserResponse(BaseModel):
    """Response containing user information."""
    id: UUID = Field(..., description="User ID")
    email: str = Field(..., description="User's email")
    username: str = Field(..., description="User's username")
    is_verified: bool = Field(..., description="Email verification status")
    last_login: Optional[datetime] = Field(None, description="Last login timestamp")
    created_at: Optional[datetime] = Field(None, description="Account creation timestamp")
    
    model_config = ConfigDict(from_attributes=True)


class AuthResponse(BaseModel):
    """Response for successful authentication."""
    user: UserResponse = Field(..., description="User information")
    tokens: TokenResponse = Field(..., description="JWT tokens")
    message: str = Field(default="Authentication successful", description="Response message")


class GoogleAuthURLResponse(BaseModel):
    """Response containing Google OAuth URL."""
    authorization_url: str = Field(..., description="Google OAuth authorization URL")
    message: str = Field(default="Redirect to this URL for Google login")


class ErrorResponse(BaseModel):
    """Error response format."""
    detail: str = Field(..., description="Error description")
    error_code: Optional[str] = Field(None, description="Error code")
    
    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "detail": "Invalid credentials",
                "error_code": "AUTH_INVALID_CREDENTIALS"
            }
        }
    )
