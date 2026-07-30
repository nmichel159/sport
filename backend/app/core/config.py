from functools import lru_cache
from pathlib import Path
from typing import Literal

from pydantic import Field, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


BACKEND_ROOT = Path(__file__).resolve().parents[2]
PROJECT_ROOT = BACKEND_ROOT.parent


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=(BACKEND_ROOT / ".env", PROJECT_ROOT / ".env"),
        extra="ignore",
    )

    project_name: str = "sport"
    environment: Literal["development", "test", "production"] = "development"
    secret_key: str
    database_url: str
    cors_origins: list[str] = ["http://localhost:3000", "http://localhost:8081"]
    allowed_hosts: list[str] = ["*"]
    google_web_client_id: str = ""
    google_android_client_id: str = ""
    google_ios_client_id: str = ""
    access_token_expire_minutes: int = Field(default=15, ge=5, le=60)
    refresh_token_expire_days: int = Field(default=30, ge=1, le=90)
    cookie_secure: bool = False
    cookie_samesite: Literal["lax", "strict", "none"] = "lax"
    development_login_enabled: bool = False
    jwt_issuer: str = "sport-api"
    jwt_audience: str = "sport-clients"
    max_request_size_bytes: int = Field(
        default=1_048_576,
        ge=16_384,
        le=10_485_760,
    )
    rate_limit_storage_uri: str = "memory://"

    @model_validator(mode="after")
    def validate_security_boundaries(self) -> "Settings":
        if self.cookie_samesite == "none" and not self.cookie_secure:
            raise ValueError("SameSite=None cookies require COOKIE_SECURE=true")
        if self.environment != "production":
            return self

        weak_markers = ("change", "replace", "development", "example", "test")
        normalized_secret = self.secret_key.casefold()
        if len(self.secret_key) < 32 or any(
            marker in normalized_secret for marker in weak_markers
        ):
            raise ValueError(
                "Production SECRET_KEY must be a strong random value of at least 32 characters"
            )
        if any(marker in self.database_url.casefold() for marker in ("change_me", "password")):
            raise ValueError("Production DATABASE_URL contains a placeholder password")
        if not self.cookie_secure:
            raise ValueError("Production requires COOKIE_SECURE=true")
        if self.development_login_enabled:
            raise ValueError("Development login cannot be enabled in production")
        if "*" in self.cors_origins:
            raise ValueError("Production CORS_ORIGINS cannot contain a wildcard")
        if "*" in self.allowed_hosts or not self.allowed_hosts:
            raise ValueError("Production ALLOWED_HOSTS must be explicit")
        if any(not origin.startswith("https://") for origin in self.cors_origins):
            raise ValueError("Production CORS_ORIGINS must use HTTPS")
        if self.rate_limit_storage_uri == "memory://":
            raise ValueError(
                "Production RATE_LIMIT_STORAGE_URI must use shared storage"
            )
        return self


@lru_cache
def get_settings() -> Settings:
    return Settings()
