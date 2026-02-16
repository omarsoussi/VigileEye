"""
Application configuration settings using Pydantic Settings.
Loads environment variables and provides type-safe configuration.
"""
from functools import lru_cache
from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import Field


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""
    
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )
    
    # Database - uses pg8000 driver for Python 3.13 compatibility
    database_url: str = Field(
        default="postgresql+pg8000://camera_user:admin%40pfe@localhost:5432/CameraMonitoringDB",
        alias="DATABASE_URL"
    )
    
    # JWT
    jwt_secret_key: str = Field(
        default="your-super-secret-jwt-key-change-in-production",
        alias="JWT_SECRET_KEY"
    )
    jwt_algorithm: str = Field(default="HS256", alias="JWT_ALGORITHM")
    access_token_expire_minutes: int = Field(default=30, alias="ACCESS_TOKEN_EXPIRE_MINUTES")
    refresh_token_expire_days: int = Field(default=7, alias="REFRESH_TOKEN_EXPIRE_DAYS")
    
    # OTP
    otp_expire_minutes: int = Field(default=5, alias="OTP_EXPIRE_MINUTES")
    
    # Account Lockout
    max_failed_login_attempts: int = Field(default=3, alias="MAX_FAILED_LOGIN_ATTEMPTS")
    lockout_duration_minutes: int = Field(default=60, alias="LOCKOUT_DURATION_MINUTES")
    
    # SMTP
    smtp_host: str = Field(default="smtp.gmail.com", alias="SMTP_HOST")
    smtp_port: int = Field(default=587, alias="SMTP_PORT")
    smtp_username: str = Field(default="", alias="SMTP_USERNAME")
    smtp_password: str = Field(default="", alias="SMTP_PASSWORD")
    smtp_from_email: str = Field(default="", alias="SMTP_FROM_EMAIL")
    smtp_from_name: str = Field(default="Camera Monitoring System", alias="SMTP_FROM_NAME")
    
    # Google OAuth
    google_client_id: str = Field(default="", alias="GOOGLE_CLIENT_ID")
    google_client_secret: str = Field(default="", alias="GOOGLE_CLIENT_SECRET")
    google_redirect_uri: str = Field(
        default="http://localhost:8000/auth/google/callback",
        alias="GOOGLE_REDIRECT_URI"
    )
    
    # Application
    app_name: str = Field(default="Camera Monitoring System", alias="APP_NAME")
    debug: bool = Field(default=True, alias="DEBUG")
    port: int = Field(default=8000, alias="PORT")
    frontend_url: str = Field(default="http://localhost:3000", alias="FRONTEND_URL")


@lru_cache()
def get_settings() -> Settings:
    """Get cached settings instance."""
    return Settings()
