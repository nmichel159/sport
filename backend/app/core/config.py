from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

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
