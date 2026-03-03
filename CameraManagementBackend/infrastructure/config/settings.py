"""Infrastructure configuration settings."""
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
    
    # Database
    database_url: str = Field(
        default="postgresql+pg8000://cmCamerasMgmt:CameraMgmt%40admin@localhost:5432/CMcamerasMgmt",
        alias="DATABASE_URL"
    )
    
    # JWT (must match auth service)
    jwt_secret_key: str = Field(
        default="your-super-secret-jwt-key-change-in-production-min-32-chars",
        alias="JWT_SECRET_KEY"
    )
    jwt_algorithm: str = Field(default="HS256", alias="JWT_ALGORITHM")
    
    # Application
    app_name: str = Field(default="Camera Management Service", alias="APP_NAME")
    debug: bool = Field(default=True, alias="DEBUG")
    port: int = Field(default=8002, alias="PORT")
    frontend_url: str = Field(default="http://localhost:3000", alias="FRONTEND_URL")

    # External services
    # When empty, membership-based sharing is disabled and only owner/camera_access rules apply.
    members_service_url: str = Field(default="", alias="MEMBERS_SERVICE_URL")
    members_service_timeout_seconds: float = Field(default=2.0, alias="MEMBERS_SERVICE_TIMEOUT_SECONDS")


@lru_cache()
def get_settings() -> Settings:
    """Get cached settings instance."""
    return Settings()


# Convenience singleton for modules that prefer importing `settings`.
settings = get_settings()

