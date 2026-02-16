"""Application configuration settings for the Members Invitation service."""

from functools import lru_cache

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=(".env", "../Backend/.env"),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # Database
    database_url: str = Field(
        default="postgresql+pg8000://cmmembers:Members%40admin@localhost:5432/CMmembers",
        alias="DATABASE_URL",
    )

    # JWT (must match auth service secret/algorithm)
    jwt_secret_key: str = Field(
        default="your-super-secret-jwt-key-change-in-production-min-32-chars",
        alias="JWT_SECRET_KEY",
    )
    jwt_algorithm: str = Field(default="HS256", alias="JWT_ALGORITHM")

    # SMTP
    smtp_host: str = Field(default="smtp.gmail.com", alias="SMTP_HOST")
    smtp_port: int = Field(default=587, alias="SMTP_PORT")
    smtp_username: str = Field(default="", alias="SMTP_USERNAME")
    smtp_password: str = Field(default="", alias="SMTP_PASSWORD")
    smtp_from_email: str = Field(default="", alias="SMTP_FROM_EMAIL")
    smtp_from_name: str = Field(default="VigileEye", alias="SMTP_FROM_NAME")

    # Invitation Codes
    invitation_code_expire_minutes: int = Field(default=15, alias="INVITATION_CODE_EXPIRE_MINUTES")

    # Application
    app_name: str = Field(default="Members Invitation Service", alias="APP_NAME")
    debug: bool = Field(default=True, alias="DEBUG")
    port: int = Field(default=8001, alias="PORT")
    frontend_url: str = Field(default="http://localhost:3000", alias="FRONTEND_URL")


@lru_cache()
def get_settings() -> Settings:
    return Settings()
