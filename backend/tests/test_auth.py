"""
Phase 13A Automated Google Authentication Tests.
Tests all requirements:
1. sivakumarelango10@gmail.com can authenticate with verified Google account.
2. avishka.s@kalvium.com can authenticate with verified Google account.
3. Any other Google account is denied with exact restriction notice.
4. An unverified email is denied.
5. A forged email claim / invalid ID token signature is denied.
6. Invalid / expired OAuth credentials are rejected.
7. Invalid OAuth state and nonce are rejected.
8. Unauthorized users cannot create valid application sessions or persist tokens.
9. Logout invalidates the application session.
10. Protected routes reject missing and expired sessions.
"""

import datetime
from unittest.mock import patch
import jwt
import pytest
from app.config import settings
from app.auth import create_access_token
from app.services.google_service import generate_oauth_state
from app.models import User, OAuthConnection

UNAUTHORIZED_MESSAGE = (
    "Access is restricted to the two authorized Ma’amAI accounts. "
    "Please sign in using an approved Google account."
)

def create_mock_id_token(email: str, sub: str = "google_sub_123", email_verified: bool = True) -> str:
    """Helper to generate signed mock ID token for testing."""
    payload = {
        "iss": "https://accounts.google.com",
        "sub": sub,
        "aud": settings.GOOGLE_CLIENT_ID or "mock_client_id",
        "email": email,
        "email_verified": email_verified,
        "name": email.split("@")[0].capitalize(),
        "picture": "https://lh3.googleusercontent.com/photo.jpg",
        "exp": datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(hours=1),
    }
    return jwt.encode(payload, settings.JWT_SECRET_KEY, algorithm="HS256")

# 1. Test sivakumarelango10@gmail.com authentication
@patch("app.routers.auth.exchange_code_for_tokens")
@patch("app.routers.auth.verify_google_id_token")
def test_allowlisted_sivakumar_authenticates_successfully(
    mock_verify, mock_exchange, client, db_session
):
    mock_exchange.return_value = {
        "access_token": "mock_google_access_token_1",
        "refresh_token": "mock_google_refresh_token_1",
        "id_token": "mock_id_token_sivakumar",
        "expires_in": 3600,
    }
    mock_verify.return_value = {
        "sub": "google_sub_sivakumar",
        "email": "sivakumarelango10@gmail.com",
        "name": "Sivakumar Elango",
        "picture": "https://lh3.google.com/se.jpg",
        "email_verified": True,
    }

    state = generate_oauth_state()
    response = client.post("/api/auth/google/exchange", json={
        "code": "valid_auth_code_1",
        "state": state,
    })

    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["user"]["email"] == "sivakumarelango10@gmail.com"
    assert data["user"]["username"] == "sivakumar_elango"

    # Verify user record and encrypted OAuthConnection persisted in DB
    user = db_session.query(User).filter(User.email == "sivakumarelango10@gmail.com").first()
    assert user is not None
    assert user.google_id == "google_sub_sivakumar"

    conn = db_session.query(OAuthConnection).filter(OAuthConnection.user_id == user.id).first()
    assert conn is not None
    assert conn.is_connected is True
    dec_acc, dec_ref = conn.get_decrypted_tokens()
    assert dec_acc == "mock_google_access_token_1"
    assert dec_ref == "mock_google_refresh_token_1"

# 2. Test avishka.s@kalvium.com authentication
@patch("app.routers.auth.exchange_code_for_tokens")
@patch("app.routers.auth.verify_google_id_token")
def test_allowlisted_avishka_authenticates_successfully(
    mock_verify, mock_exchange, client, db_session
):
    mock_exchange.return_value = {
        "access_token": "mock_google_access_token_2",
        "refresh_token": "mock_google_refresh_token_2",
        "id_token": "mock_id_token_avishka",
        "expires_in": 3600,
    }
    mock_verify.return_value = {
        "sub": "google_sub_avishka",
        "email": "avishka.s@kalvium.com",
        "name": "Avishka S",
        "picture": "https://lh3.google.com/as.jpg",
        "email_verified": True,
    }

    state = generate_oauth_state()
    response = client.post("/api/auth/google/exchange", json={
        "code": "valid_auth_code_2",
        "state": state,
    })

    assert response.status_code == 200
    data = response.json()
    assert data["user"]["email"] == "avishka.s@kalvium.com"
    assert data["user"]["username"] == "avishka_s"

# 3. Test unauthorized Google account is strictly denied
@patch("app.routers.auth.exchange_code_for_tokens")
@patch("app.routers.auth.verify_google_id_token")
def test_unauthorized_google_account_is_denied(
    mock_verify, mock_exchange, client, db_session
):
    mock_exchange.return_value = {
        "access_token": "mock_google_access_token_intruder",
        "id_token": "mock_id_token_intruder",
    }
    mock_verify.return_value = {
        "sub": "google_sub_intruder",
        "email": "random.visitor@gmail.com",
        "name": "Random Visitor",
        "picture": "",
        "email_verified": True,
    }

    state = generate_oauth_state()
    response = client.post("/api/auth/google/exchange", json={
        "code": "intruder_code",
        "state": state,
    })

    assert response.status_code == 403
    assert response.json()["detail"] == UNAUTHORIZED_MESSAGE

    # 8. Verify unauthorized user is NOT created and NO tokens persisted
    intruder_user = db_session.query(User).filter(User.email == "random.visitor@gmail.com").first()
    assert intruder_user is None

# 4. Test unverified email is denied
@patch("app.routers.auth.exchange_code_for_tokens")
@patch("app.routers.auth.verify_google_id_token")
def test_unverified_email_claim_is_rejected(
    mock_verify, mock_exchange, client
):
    mock_exchange.return_value = {"id_token": "mock_token"}
    mock_verify.side_effect = ValueError("Google account email is not verified.")

    state = generate_oauth_state()
    response = client.post("/api/auth/google/exchange", json={
        "code": "unverified_code",
        "state": state,
    })

    assert response.status_code == 401
    assert "verification failed" in response.json()["detail"].lower()

# 5. Test forged / invalid token signature is denied
@patch("app.routers.auth.exchange_code_for_tokens")
@patch("app.routers.auth.verify_google_id_token")
def test_forged_id_token_signature_rejected(
    mock_verify, mock_exchange, client
):
    mock_exchange.return_value = {"id_token": "tampered_token"}
    mock_verify.side_effect = ValueError("Invalid Google ID token signature or expired token")

    state = generate_oauth_state()
    response = client.post("/api/auth/google/exchange", json={
        "code": "tampered_code",
        "state": state,
    })

    assert response.status_code == 401

# 6. Test invalid / expired OAuth code exchange failure
@patch("app.routers.auth.exchange_code_for_tokens")
def test_expired_authorization_code_rejected(mock_exchange, client):
    mock_exchange.side_effect = ValueError("Google token exchange failed (400): invalid_grant")

    state = generate_oauth_state()
    response = client.post("/api/auth/google/exchange", json={
        "code": "expired_code",
        "state": state,
    })

    assert response.status_code == 400
    assert "Failed to exchange" in response.json()["detail"]

# 7. Test invalid OAuth state and nonce rejected
def test_invalid_oauth_state_rejected(client):
    response = client.post("/api/auth/google/exchange", json={
        "code": "any_code",
        "state": "tampered.or.invalid.signature",
    })

    assert response.status_code == 400
    assert "Invalid or expired OAuth state parameter" in response.json()["detail"]

# 9. Test logout invalidates the application session
def test_logout_invalidates_session_token(client, user1):
    session_token = create_access_token(user_id=user1.id, username=user1.username)
    headers = {"Authorization": f"Bearer {session_token}"}

    # Verify session works
    res1 = client.get("/api/auth/me", headers=headers)
    assert res1.status_code == 200

    # Logout
    logout_res = client.post("/api/auth/logout", headers=headers)
    assert logout_res.status_code == 200

    # Subsequent access with revoked token must be rejected
    res2 = client.get("/api/auth/me", headers=headers)
    assert res2.status_code == 401
    assert "revoked" in res2.json()["detail"].lower()

# 10. Test protected routes reject missing and expired sessions
def test_protected_routes_reject_missing_and_expired_tokens(client, user1):
    # Missing token
    assert client.get("/api/auth/me").status_code == 401
    assert client.get("/api/emails").status_code == 401
    assert client.get("/api/calendar").status_code == 401

    # Expired token
    expired_token = create_access_token(
        user_id=user1.id,
        username=user1.username,
        expires_delta=datetime.timedelta(minutes=-10),
    )
    headers = {"Authorization": f"Bearer {expired_token}"}
    assert client.get("/api/auth/me", headers=headers).status_code == 401
