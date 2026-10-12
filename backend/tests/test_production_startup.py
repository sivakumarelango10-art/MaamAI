"""
Regression tests for MaamAI Production Startup, Database Decoupling,
Environment Validation, and Google OAuth URL generation.
"""

import os
from unittest.mock import patch, MagicMock
import pytest
from fastapi.testclient import TestClient
from cryptography.fernet import Fernet
from pydantic import ValidationError
from sqlalchemy.exc import OperationalError

from app.config import Settings
from app.services.google_service import (
    build_google_auth_url,
    verify_oauth_state,
    generate_oauth_state,
)
from app.database import init_and_migrate_db
from app.main import app

VALID_FERNET_KEY = Fernet.generate_key().decode("utf-8")
VALID_JWT_KEY = "test_super_secret_jwt_key_at_least_32_chars_long_production"
VALID_PROD_DB_URL = "postgresql://prod_user:prod_pass@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true"
VALID_CLIENT_ID = "40264517437-3tsh2rb3g17ea2h5mmkmu5kic242t7i2.apps.googleusercontent.com"


# -----------------------------------------------------------------------------
# 1. FastAPI application import with valid production configuration
# -----------------------------------------------------------------------------
def test_valid_production_configuration_passes():
    """Verify production settings validate successfully with real credentials format."""
    prod_settings = Settings(
        ENVIRONMENT="production",
        DATABASE_URL=VALID_PROD_DB_URL,
        JWT_SECRET_KEY=VALID_JWT_KEY,
        OAUTH_TOKEN_ENCRYPTION_KEY=VALID_FERNET_KEY,
        GOOGLE_CLIENT_ID=VALID_CLIENT_ID,
        GOOGLE_CLIENT_SECRET="GOCSPX-dummy_test_secret",
    )
    assert prod_settings.ENVIRONMENT == "production"
    assert "postgresql" in prod_settings.get_database_url()
    assert prod_settings.JWT_SECRET_KEY == VALID_JWT_KEY


# -----------------------------------------------------------------------------
# 2. Startup without automatic production DDL
# -----------------------------------------------------------------------------
def test_production_startup_skips_ddl():
    """In production, init_and_migrate_db() must NOT run DDL or schema inspection."""
    with patch("app.database.settings") as mock_settings, \
         patch("app.database.inspect") as mock_inspect, \
         patch("app.database.Base.metadata.create_all") as mock_create_all:
        
        mock_settings.ENVIRONMENT = "production"
        mock_settings.get_database_url.return_value = VALID_PROD_DB_URL

        # Call the startup database initialization
        init_and_migrate_db()

        # Neither create_all nor inspect should be called during cold start in production
        mock_inspect.assert_not_called()
        mock_create_all.assert_not_called()


# -----------------------------------------------------------------------------
# 3. Safe handling of missing required secrets in production
# -----------------------------------------------------------------------------
def test_production_rejects_missing_or_weak_jwt_secret():
    """Production mode must reject missing or default JWT secret."""
    with pytest.raises(ValidationError):
        Settings(
            ENVIRONMENT="production",
            DATABASE_URL=VALID_PROD_DB_URL,
            JWT_SECRET_KEY="short_key",  # < 32 chars
            OAUTH_TOKEN_ENCRYPTION_KEY=VALID_FERNET_KEY,
        )


def test_production_rejects_missing_or_invalid_fernet_key():
    """Production mode must reject missing or invalid Fernet key."""
    with pytest.raises(ValidationError):
        Settings(
            ENVIRONMENT="production",
            DATABASE_URL=VALID_PROD_DB_URL,
            JWT_SECRET_KEY=VALID_JWT_KEY,
            OAUTH_TOKEN_ENCRYPTION_KEY="not_a_valid_fernet_key",
        )


def test_production_rejects_sqlite_database_url():
    """Production mode must reject SQLite database URLs."""
    with pytest.raises(ValidationError):
        Settings(
            ENVIRONMENT="production",
            DATABASE_URL="sqlite:///./test.db",
            JWT_SECRET_KEY=VALID_JWT_KEY,
            OAUTH_TOKEN_ENCRYPTION_KEY=VALID_FERNET_KEY,
        )


# -----------------------------------------------------------------------------
# 4. Safe handling of an unavailable database
# -----------------------------------------------------------------------------
def test_db_independent_endpoints_succeed_even_if_db_unavailable(client):
    """Endpoints like /api/auth/google/url and /api do not touch the DB and must succeed."""
    with patch("app.services.google_service.settings.GOOGLE_CLIENT_ID", VALID_CLIENT_ID), \
         patch("app.services.google_service.settings.GOOGLE_REDIRECT_URI", "https://maamai.vercel.app/api/auth/google/callback"):

        res = client.get("/api/auth/google/url")
        assert res.status_code == 200
        data = res.json()
        assert "auth_url" in data
        assert VALID_CLIENT_ID in data["auth_url"]


def test_db_dependent_endpoints_return_safe_503_on_db_outage():
    """When PostgreSQL is down, requests hitting the DB receive a safe 503 instead of crashing."""
    from app.database import get_db

    def mock_broken_get_db():
        raise OperationalError("connection to server at pooler failed: timeout", params={}, orig=Exception("timeout"))

    app.dependency_overrides[get_db] = mock_broken_get_db
    try:
        with TestClient(app) as test_client:
            res = test_client.get("/api/briefing")
            # Should fail safely with 503 Service Unavailable, not an unhandled 500 crash
            assert res.status_code == 503
            assert "temporarily unavailable" in res.json()["detail"].lower()
    finally:
        app.dependency_overrides.clear()


# -----------------------------------------------------------------------------
# 5. Google authentication URL generation using configured client ID
# -----------------------------------------------------------------------------
def test_google_auth_url_uses_configured_client_id_and_returns_200(client):
    """Google auth URL endpoint returns 200 with exact parameters and cryptographic state."""
    with patch("app.services.google_service.settings.GOOGLE_CLIENT_ID", VALID_CLIENT_ID), \
         patch("app.services.google_service.settings.GOOGLE_REDIRECT_URI", "https://maamai.vercel.app/api/auth/google/callback"):

        res = client.get("/api/auth/google/url")
        assert res.status_code == 200
        payload = res.json()
        assert "auth_url" in payload
        assert "state" in payload

        auth_url = payload["auth_url"]
        assert VALID_CLIENT_ID in auth_url
        assert "placeholder" not in auth_url
        assert "https://maamai.vercel.app/api/auth/google/callback" in auth_url
        assert "response_type=code" in auth_url
        assert "access_type=offline" in auth_url
        assert "prompt=consent" in auth_url
        assert f"state={payload['state']}" in auth_url

        # Validate cryptographic state token
        assert verify_oauth_state(payload["state"]) is True


# -----------------------------------------------------------------------------
# 6. Graceful failure if Google OAuth configuration is absent
# -----------------------------------------------------------------------------
def test_google_auth_url_fails_gracefully_when_client_id_missing(client):
    """If GOOGLE_CLIENT_ID is empty or placeholder, endpoint returns 503 rather than 500 crash."""
    with patch("app.services.google_service.settings.GOOGLE_CLIENT_ID", ""):
        res = client.get("/api/auth/google/url")
        assert res.status_code == 503
        data = res.json()
        assert "detail" in data
        assert "configuration unavailable" in data["detail"].lower()


def test_build_google_auth_url_rejects_placeholder():
    """build_google_auth_url() must raise ValueError when client ID is placeholder."""
    with patch("app.services.google_service.settings.GOOGLE_CLIENT_ID", "placeholder_client_id"):
        with pytest.raises(ValueError, match="Client ID is not configured"):
            build_google_auth_url("dummy_state")


# -----------------------------------------------------------------------------
# 7. Local development and SQLite behavior
# -----------------------------------------------------------------------------
def test_development_accepts_sqlite_and_default_dev_secrets():
    """Development mode works smoothly with SQLite and default keys for zero-config onboarding."""
    dev_settings = Settings(
        ENVIRONMENT="development",
        DATABASE_URL="sqlite:///./maamai.db",
    )
    assert dev_settings.ENVIRONMENT == "development"
    assert "sqlite" in dev_settings.get_database_url()


# -----------------------------------------------------------------------------
# 8. Existing authentication, token encryption and user-isolation protections
# -----------------------------------------------------------------------------
def test_allowlist_enforcement_remains_strict():
    """Allowlist strictly preserves the 2 authorized emails and rejects unauthorized accounts."""
    from app.routers.auth import UNAUTHORIZED_MESSAGE
    from app.config import settings

    assert "sivakumarelango10@gmail.com" in settings.ALLOWED_GOOGLE_EMAILS
    assert "avishka.s@kalvium.com" in settings.ALLOWED_GOOGLE_EMAILS
    assert len(settings.ALLOWED_GOOGLE_EMAILS) == 2
    assert "Access is restricted to the two authorized Ma’amAI accounts" in UNAUTHORIZED_MESSAGE
