from functools import lru_cache
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict


BACKEND_ROOT = Path(__file__).resolve().parents[2]
PROJECT_ROOT = BACKEND_ROOT.parent


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=(BACKEND_ROOT / ".env", PROJECT_ROOT / ".env"),
        extra="ignore",
    )

    project_name: str = "sport"
    environment: str = "development"
    secret_key: str
    database_url: str
    cors_origins: list[str] = ["http://localhost:3000", "http://localhost:8081"]
    google_web_client_id: str = ""
    google_android_client_id: str = ""
    google_ios_client_id: str = ""
    access_token_expire_minutes: int = 15
    refresh_token_expire_days: int = 30
    cookie_secure: bool = False
    cookie_samesite: str = "lax"


@lru_cache
def get_settings() -> Settings:
    return Settings()
