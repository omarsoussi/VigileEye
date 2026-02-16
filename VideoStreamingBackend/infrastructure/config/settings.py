"""Application configuration settings for the Video Streaming service."""
from functools import lru_cache
from typing import Optional

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    model_config = SettingsConfigDict(
        # Load local .env first, then Backend for JWT secret only
        # Later files have higher priority, so we need to use STREAMING_DATABASE_URL
        env_file=("../Backend/.env", ".env"),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # Database - Use STREAMING_DATABASE_URL to avoid conflict with Backend's DATABASE_URL
    database_url: str = Field(
        default="postgresql+pg8000://CMStreaming:Members%40admin@localhost:5432/CMStreaming",
        alias="STREAMING_DATABASE_URL",
    )

    # JWT (must match Auth service - uses JWT_SECRET_KEY from Backend/.env)
    jwt_secret: str = Field(default="your-jwt-secret-here", alias="JWT_SECRET_KEY")
    jwt_algorithm: str = Field(default="HS256", alias="JWT_ALGORITHM")

    # Streaming Configuration
    default_fps: int = Field(default=15, alias="DEFAULT_FPS")
    frame_quality: int = Field(default=85, alias="FRAME_QUALITY")
    max_reconnect_attempts: int = Field(default=5, alias="MAX_RECONNECT_ATTEMPTS")
    reconnect_delay_seconds: int = Field(default=2, alias="RECONNECT_DELAY_SECONDS")

    # Server
    host: str = Field(default="0.0.0.0", alias="HOST")
    port: int = Field(default=8003, alias="PORT")


@lru_cache
def get_settings() -> Settings:
    """Get cached settings instance."""
    return Settings()
