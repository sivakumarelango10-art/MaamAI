import datetime
import pytest
from app.config import settings
from app.auth import create_access_token, clear_login_failures

def test_login_success(client):
    clear_login_failures("aris_vance")
    response = client.post("/api/auth/login", json={
        "username_or_email": "aris_vance",
        "password": "Password123!"
    })
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"
    assert data["user"]["username"] == "aris_vance"
    assert data["user"]["full_name"] == "Dr. Aris Vance"

def test_login_failure_wrong_password(client):
    clear_login_failures("aris_vance")
    response = client.post("/api/auth/login", json={
        "username_or_email": "aris_vance",
        "password": "WrongPassword!"
    })
    assert response.status_code == 401
    assert "Invalid" in response.json()["detail"]

def test_login_rate_limiting(client):
    test_user = "rate_limit_target_user"
    clear_login_failures(test_user)

    # Trigger consecutive failed attempts up to limit
    for _ in range(settings.LOGIN_RATE_LIMIT_PER_MINUTE):
        resp = client.post("/api/auth/login", json={
            "username_or_email": test_user,
            "password": "WrongPassword!"
        })
        assert resp.status_code == 401

    # Next attempt must trigger 429 Too Many Requests
    throttled_resp = client.post("/api/auth/login", json={
        "username_or_email": test_user,
        "password": "WrongPassword!"
    })
    assert throttled_resp.status_code == 429
    assert "Too many failed login attempts" in throttled_resp.json()["detail"]
    assert "Retry-After" in throttled_resp.headers

    clear_login_failures(test_user)

def test_get_current_user_me(client, auth_headers_user1, user1):
    response = client.get("/api/auth/me", headers=auth_headers_user1)
    assert response.status_code == 200
    data = response.json()
    assert data["id"] == user1.id
    assert data["email"] == user1.email

def test_unauthenticated_request_rejected(client):
    response = client.get("/api/auth/me")
    assert response.status_code == 401

def test_expired_token_rejected(client, user1):
    expired_token = create_access_token(
        user_id=user1.id,
        username=user1.username,
        expires_delta=datetime.timedelta(minutes=-5)
    )
    headers = {"Authorization": f"Bearer {expired_token}"}
    response = client.get("/api/auth/me", headers=headers)
    assert response.status_code == 401
    assert "Session expired" in response.json()["detail"]

def test_invalid_token_signature_rejected(client):
    headers = {"Authorization": "Bearer invalid.jwt.token.signature"}
    response = client.get("/api/auth/me", headers=headers)
    assert response.status_code == 401
    assert "Invalid authentication token" in response.json()["detail"]

def test_logout_revokes_token_and_blocks_subsequent_access(client, user1):
    # Log in and get active token
    login_resp = client.post("/api/auth/login", json={
        "username_or_email": "aris_vance",
        "password": "Password123!"
    })
    token = login_resp.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Verify token works
    assert client.get("/api/auth/me", headers=headers).status_code == 200

    # Call logout endpoint to revoke token on server
    logout_resp = client.post("/api/auth/logout", headers=headers)
    assert logout_resp.status_code == 200
    assert "revoked" in logout_resp.json()["message"].lower()

    # Subsequent access attempt with revoked token MUST return 401 Unauthorized
    subsequent_resp = client.get("/api/auth/me", headers=headers)
    assert subsequent_resp.status_code == 401
    assert "revoked" in subsequent_resp.json()["detail"].lower()

def test_password_complexity_policy_on_registration(client):
    # 1. Too short (< 8 chars)
    resp1 = client.post("/api/auth/register", json={
        "email": "short@univ.edu",
        "username": "short_user",
        "full_name": "Short User",
        "role": "Lecturer",
        "department": "CS",
        "password": "abc"
    })
    assert resp1.status_code == 422  # Pydantic min_length validation

    # 2. No digits
    resp2 = client.post("/api/auth/register", json={
        "email": "nodigit@univ.edu",
        "username": "nodigit_user",
        "full_name": "No Digit",
        "role": "Lecturer",
        "department": "CS",
        "password": "passwordonly"
    })
    assert resp2.status_code == 400
    assert "both letters and numeric digits" in resp2.json()["detail"]

    # 3. Valid password
    resp3 = client.post("/api/auth/register", json={
        "email": "valid.staff@univ.edu",
        "username": "valid_staff",
        "full_name": "Valid Staff",
        "role": "Researcher",
        "department": "AI",
        "password": "SecurePassword123!"
    })
    assert resp3.status_code == 200
    assert "access_token" in resp3.json()

def test_staff_accounts_disabled_in_production(client):
    # In development mode, it succeeds
    orig_env = settings.ENVIRONMENT
    try:
        settings.ENVIRONMENT = "development"
        resp_dev = client.get("/api/auth/staff-accounts")
        assert resp_dev.status_code == 200
        assert len(resp_dev.json()) >= 2

        # In production mode, it MUST be forbidden (403)
        settings.ENVIRONMENT = "production"
        resp_prod = client.get("/api/auth/staff-accounts")
        assert resp_prod.status_code == 403
        assert "disabled in production" in resp_prod.json()["detail"]
    finally:
        settings.ENVIRONMENT = orig_env
