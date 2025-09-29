from __future__ import annotations
from typing import List
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    DATABASE_URL: str = "sqlite:///./grispi.db"
    CORS_ORIGINS: str = ""
    MAX_UPLOAD_MB: int = 10
    APP_NAME: str = "Grispi Contacts Importer"
    APP_VERSION: str = "1.1.0"
    ENV: str = "development"
    DEBUG: bool = True
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")

    @property
    def cors_origins(self) -> List[str]:
        if not self.CORS_ORIGINS:
            return []
        return [o.strip() for o in self.CORS_ORIGINS.split(",") if o.strip()]

settings = Settings()
