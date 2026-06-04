"""Application configuration loaded from environment / .env."""

from __future__ import annotations

from functools import lru_cache
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    app_name: str = "Shares Manager"
    secret_key: str = "dev-secret-change-me"
    debug: bool = True

    database_url: str = "sqlite:///./shares.db"
    # Auto-create tables on startup (handy for dev/SQLite). In production set
    # this False and manage schema with Alembic migrations.
    auto_create_tables: bool = True

    admin_email: str = "admin@example.com"
    admin_password: str = "admin12345"

    artifacts_dir: str = "./artifacts"

    @property
    def artifacts_path(self) -> Path:
        path = Path(self.artifacts_dir)
        path.mkdir(parents=True, exist_ok=True)
        return path


@lru_cache
def get_settings() -> Settings:
    return Settings()
