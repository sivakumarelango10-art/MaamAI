from pathlib import Path
from pydantic_settings import BaseSettings
from pydantic import model_validator
from typing import List
from cryptography.fernet import Fernet

# Resolve workspace root directory reliably: F:\Agent
# backend/app/config.py -> app -> backend -> root (F:\Agent)
ROOT_DIR = Path(__file__).resolve().parent.parent.parent
ROOT_ENV_FILE = ROOT_DIR / ".env"

DEFAULT_DEV_JWT_SECRET = "maamai_production_grade_jwt_secret_key_change_in_production"
DEFAULT_DEV_ENCRYPTION_KEY = "cKNExS5eKAKDtFx8KvadVCS_RMLC8N3r9_raEO27mdo="

class Settings(BaseSettings):
    PROJECT_NAME: str = "MaamAI"
    VERSION: str = "1.2.0"
    API_V1_STR: str = "/api"
    ENVIRONMENT: str = "development"  # 'development' or 'production'
    DATABASE_URL: str = "sqlite:///./maamai.db"
    CORS_ORIGINS: List[str] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
    ]

    # JWT Authentication configuration
    JWT_SECRET_KEY: str = DEFAULT_DEV_JWT_SECRET
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 120  # 2 hours

    # Authenticated OAuth token encryption key at rest (Fernet AES-128-CBC + HMAC-SHA256)
    OAUTH_TOKEN_ENCRYPTION_KEY: str = DEFAULT_DEV_ENCRYPTION_KEY

    # Rate limiting for authentication (per IP or username)
    LOGIN_RATE_LIMIT_PER_MINUTE: int = 5

    # Google OAuth (Phase 2 preview configuration)
    GOOGLE_CLIENT_ID: str = "placeholder_client_id_phase2"
    GOOGLE_CLIENT_SECRET: str = "placeholder_client_secret_phase2"
    GOOGLE_REDIRECT_URI: str = "http://localhost:8000/api/oauth/google/callback"
    ENABLE_GMAIL_SYNC: bool = False
    ENABLE_GCAL_SYNC: bool = False

    # AI Provider configuration
    AI_PROVIDER: str = "gemini_free"
    GEMINI_API_KEY: str = ""
    OLLAMA_BASE_URL: str = "http://localhost:11434"

    model_config = {
        "env_file": str(ROOT_ENV_FILE) if ROOT_ENV_FILE.exists() else None,
        "env_file_encoding": "utf-8",
        "extra": "ignore",
    }

    def get_database_url(self) -> str:
        """Normalize database connection URL for SQLAlchemy compatibility."""
        url = self.DATABASE_URL
        if url.startswith("postgres://"):
            url = url.replace("postgres://", "postgresql://", 1)
        elif url.startswith("sqlite:///./"):
            # Resolve relative SQLite database path to the canonical workspace root
            rel_name = url.replace("sqlite:///./", "", 1)
            abs_db = (ROOT_DIR / rel_name).resolve()
            url = f"sqlite:///{abs_db.as_posix()}"
        return url

    @model_validator(mode="after")
    def validate_production_security(self):
        env = self.ENVIRONMENT.lower()
        if env == "production":
            # 1. Validate JWT Secret
            if self.JWT_SECRET_KEY == DEFAULT_DEV_JWT_SECRET or len(self.JWT_SECRET_KEY) < 32:
                raise ValueError(
                    "CRITICAL SECURITY CONFIGURATION: In production mode, JWT_SECRET_KEY must be "
                    "overridden with a high-entropy secret (at least 32 characters)."
                )

            # 2. Validate OAuth Token Encryption Key
            if self.OAUTH_TOKEN_ENCRYPTION_KEY == DEFAULT_DEV_ENCRYPTION_KEY:
                raise ValueError(
                    "CRITICAL SECURITY CONFIGURATION: In production mode, OAUTH_TOKEN_ENCRYPTION_KEY "
                    "cannot use the default development key. Provide a dedicated Fernet key."
                )
            try:
                Fernet(self.OAUTH_TOKEN_ENCRYPTION_KEY.encode("utf-8"))
            except Exception as e:
                raise ValueError(
                    f"CRITICAL SECURITY CONFIGURATION: OAUTH_TOKEN_ENCRYPTION_KEY is invalid: {e}"
                )
        return self

settings = Settings()
