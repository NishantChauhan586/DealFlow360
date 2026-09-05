from functools import lru_cache
import json
from typing import List, Optional, Union
from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """
    Application Settings loaded from environment variables and .env file.
    Defines infrastructure, database, security, and runtime configs.
    """

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # Application Core
    PROJECT_NAME: str = "DealFlow360"
    VERSION: str = "1.0.0"
    DESCRIPTION: str = "Intelligent, self-governing sales operations platform backend."
    ENVIRONMENT: str = "development"
    DEBUG: bool = True
    API_V1_PREFIX: str = "/api/v1"

    # CORS Configuration
    CORS_ORIGINS: Union[List[str], str] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
    ]

    # Database Configuration (Local SQLite or PostgreSQL)
    USE_LOCAL_SQLITE: bool = True
    SQLITE_DB_PATH: str = "./dealflow360.db"
    POSTGRES_SERVER: str = "localhost"
    POSTGRES_PORT: int = 5432
    POSTGRES_USER: str = "postgres"
    POSTGRES_PASSWORD: str = "postgres"
    POSTGRES_DB: str = "dealflow360"
    POSTGRES_DSN: Optional[str] = None
    DATABASE_POOL_SIZE: int = 20
    DATABASE_MAX_OVERFLOW: int = 10
    DATABASE_POOL_TIMEOUT: int = 30

    # Redis Configuration
    REDIS_URL: str = "redis://localhost:6379/0"

    # Celery Background Worker Configuration
    CELERY_BROKER_URL: str = "redis://localhost:6379/1"
    CELERY_RESULT_BACKEND: str = "redis://localhost:6379/2"

    # Security & JWT Authentication
    JWT_SECRET: str = "dealflow360_super_secret_jwt_key_change_in_production_2026"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    @field_validator("CORS_ORIGINS", mode="before")
    @classmethod
    def assemble_cors_origins(cls, v: Union[str, List[str]]) -> List[str]:
        if isinstance(v, str):
            v_stripped = v.strip()
            if v_stripped.startswith("[") and v_stripped.endswith("]"):
                try:
                    return json.loads(v_stripped)
                except Exception:
                    pass
            return [origin.strip() for origin in v_stripped.split(",") if origin.strip()]
        elif isinstance(v, list):
            return v
        return ["http://localhost:5173", "http://127.0.0.1:5173"]

    @field_validator("POSTGRES_DSN", mode="before")
    @classmethod
    def assemble_postgres_dsn(cls, v: Optional[str], info) -> str:
        data = info.data
        if data.get("USE_LOCAL_SQLITE"):
            return f"sqlite+aiosqlite:///{data.get('SQLITE_DB_PATH', './dealflow360.db')}"
        if v and isinstance(v, str) and v.strip():
            dsn = v.strip()
            if dsn.startswith("postgres://"):
                return dsn.replace("postgres://", "postgresql+asyncpg://", 1)
            elif dsn.startswith("postgresql://") and not dsn.startswith("postgresql+"):
                return dsn.replace("postgresql://", "postgresql+asyncpg://", 1)
            return dsn
        user = data.get("POSTGRES_USER", "postgres")
        password = data.get("POSTGRES_PASSWORD", "postgres")
        server = data.get("POSTGRES_SERVER", "localhost")
        port = data.get("POSTGRES_PORT", 5432)
        db = data.get("POSTGRES_DB", "dealflow360")
        return f"postgresql+asyncpg://{user}:{password}@{server}:{port}/{db}"


@lru_cache()
def get_settings() -> Settings:
    """Cached singleton instance of application settings."""
    return Settings()


settings: Settings = get_settings()
