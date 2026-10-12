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
DEFAULT_DEV_ENCRYPTION_KEY = "090idhAZDjxxh2p2zigRfZHMAMVOiKz7hJ___DP1LnI="

class Settings(BaseSettings):
    PROJECT_NAME: str = "MaamAI"
    VERSION: str = "1.2.0"
    API_V1_STR: str = "/api"
    ENVIRONMENT: str = "development"  # 'development' or 'production'
    DATABASE_URL: str = "sqlite:///./maamai.db"
    DIRECT_URL: str = ""
    CORS_ORIGINS: List[str] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "https://maamai.vercel.app",
    ]

    # JWT Authentication configuration
    JWT_SECRET_KEY: str = DEFAULT_DEV_JWT_SECRET
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 120  # 2 hours

    # Authenticated OAuth token encryption key at rest (Fernet AES-128-CBC + HMAC-SHA256)
    OAUTH_TOKEN_ENCRYPTION_KEY: str = DEFAULT_DEV_ENCRYPTION_KEY

    # Rate limiting for authentication (per IP or username)
    LOGIN_RATE_LIMIT_PER_MINUTE: int = 5

    # Strict server-side Google account allowlist
    ALLOWED_GOOGLE_EMAILS: List[str] = [
        "sivakumarelango10@gmail.com",
        "avishka.s@kalvium.com",
    ]

    # Google OAuth 2.0 / OpenID Connect credentials
    GOOGLE_CLIENT_ID: str = ""
    GOOGLE_CLIENT_SECRET: str = ""
    GOOGLE_REDIRECT_URI: str = "https://maamai.vercel.app/api/auth/google/callback"
    ENABLE_GMAIL_SYNC: bool = True
    ENABLE_GCAL_SYNC: bool = True

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
        url = (self.DATABASE_URL or "").strip().strip('"\'')
        if url.startswith("postgres://"):
            url = url.replace("postgres://", "postgresql+psycopg2://", 1)
        elif url.startswith("postgresql://"):
            url = url.replace("postgresql://", "postgresql+psycopg2://", 1)
        elif url.startswith("sqlite:///./"):
            # Resolve relative SQLite database path to the canonical workspace root
            rel_name = url.replace("sqlite:///./", "", 1)
            abs_db = (ROOT_DIR / rel_name).resolve()
            url = f"sqlite:///{abs_db.as_posix()}"
        return url

    def get_direct_url(self) -> str:
        """Return direct URL for migrations (Session pooler port 5432), falling back to database URL."""
        url = (self.DIRECT_URL or "").strip().strip('"\'')
        if not url:
            url = (self.DATABASE_URL or "").strip().strip('"\'')
        if url.startswith("postgres://"):
            url = url.replace("postgres://", "postgresql+psycopg2://", 1)
        elif url.startswith("postgresql://"):
            url = url.replace("postgresql://", "postgresql+psycopg2://", 1)
        elif url.startswith("sqlite:///./"):
            rel_name = url.replace("sqlite:///./", "", 1)
            abs_db = (ROOT_DIR / rel_name).resolve()
            url = f"sqlite:///{abs_db.as_posix()}"
        return url

    @model_validator(mode="after")
    def validate_production_security(self):
        env = self.ENVIRONMENT.lower()
        if env == "production":
            db_url = self.get_database_url()
            # 0. Reject SQLite or missing database URL in production
            if not db_url or db_url.startswith("sqlite"):
                raise ValueError(
                    "CRITICAL SECURITY CONFIGURATION: In production mode, SQLite is prohibited and DATABASE_URL is required. "
                    "DATABASE_URL must be configured with Supabase PostgreSQL."
                )

            # 1. Validate JWT Secret
            if not self.JWT_SECRET_KEY or self.JWT_SECRET_KEY == DEFAULT_DEV_JWT_SECRET or len(self.JWT_SECRET_KEY) < 32:
                raise ValueError(
                    "CRITICAL SECURITY CONFIGURATION: In production mode, JWT_SECRET_KEY must be "
                    "overridden with a high-entropy secret (at least 32 characters)."
                )

            # 2. Validate OAuth Token Encryption Key
            if not self.OAUTH_TOKEN_ENCRYPTION_KEY or self.OAUTH_TOKEN_ENCRYPTION_KEY == DEFAULT_DEV_ENCRYPTION_KEY:
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
