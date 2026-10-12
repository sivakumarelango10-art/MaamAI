"""
Authentication Router for MaamAI.
Implements Google-Only Authentication with exact server-side allowlist enforcement.
Authorized accounts:
1. sivakumarelango10@gmail.com
2. avishka.s@kalvium.com
All other accounts receive:
"Access is restricted to the two authorized Ma’amAI accounts. Please sign in using an approved Google account."
Password login, demo login, staff switcher, and public registration are strictly eliminated.
"""

import datetime
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query, Request, Response, status
from fastapi.responses import RedirectResponse
from fastapi.security import HTTPAuthorizationCredentials
from sqlalchemy.orm import Session

from app.config import settings
from app.database import get_db
from app.models import User, Briefing, ActivityLog, OAuthConnection
from app.schemas import UserResponse, TokenResponse, GoogleExchangeRequest
from app.auth import (
    create_access_token,
    get_current_user,
    security,
    revoke_token,
)
from app.services.google_service import (
    build_google_auth_url,
    generate_oauth_state,
    verify_oauth_state,
    exchange_code_for_tokens,
    verify_google_id_token,
    OAUTH_SCOPES,
)

router = APIRouter(prefix="/auth", tags=["Authentication"])

UNAUTHORIZED_MESSAGE = (
    "Access is restricted to the two authorized Ma’amAI accounts. "
    "Please sign in using an approved Google account."
)

def _process_google_auth(code: str, state: str, db: Session) -> tuple[User, str]:
    """
    Core verification and provisioning pipeline for Google OAuth:
    1. Cryptographic state verification
    2. Code exchange
    3. ID token verification
    4. Exact allowlist check
    5. User provisioning / reconciliation
    6. Encrypted OAuth token persistence
    7. Session token generation
    """
    # 1. Cryptographic CSRF state validation
    if not verify_oauth_state(state):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired OAuth state parameter. Please initiate login again.",
        )

    # 2. Exchange code for Google tokens
    try:
        token_payload = exchange_code_for_tokens(code)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to exchange Google authorization code: {e}",
        )

    # 3. Cryptographically verify ID token and extract claims
    id_token_str = token_payload.get("id_token")
    if not id_token_str:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Missing ID token in Google token response.",
        )

    try:
        claims = verify_google_id_token(id_token_str)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Google ID token verification failed: {e}",
        )

    verified_email = claims["email"].strip().lower()
    google_sub = claims["sub"]
    name = claims.get("name", "")
    picture = claims.get("picture", "")

    # 4. Strict Server-Side Allowlist Enforcement
    allowed_emails = [e.strip().lower() for e in settings.ALLOWED_GOOGLE_EMAILS]
    if verified_email not in allowed_emails:
        # Crucial security guarantee: Do NOT create user record or persist Google tokens
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=UNAUTHORIZED_MESSAGE,
        )

    # 5. User Reconcile / Provisioning (Preserves existing data)
    user = (
        db.query(User)
        .filter((User.google_id == google_sub) | (User.email == verified_email))
        .first()
    )

    now = datetime.datetime.now(datetime.timezone.utc)

    if not user:
        if verified_email == "sivakumarelango10@gmail.com":
            full_name = name or "Sivakumar Elango"
            role = "Faculty Member / Lead Researcher"
            dept = "Computer Science & Engineering"
            username = "sivakumar_elango"
            initials = "SE"
        else:  # avishka.s@kalvium.com
            full_name = name or "Avishka S"
            role = "Academic Faculty / Instructor"
            dept = "Software Engineering & Systems"
            username = "avishka_s"
            initials = "AS"

        user = User(
            email=verified_email,
            username=username,
            google_id=google_sub,
            picture_url=picture,
            full_name=full_name,
            role=role,
            department=dept,
            avatar_initials=initials,
            is_active=True,
        )
        db.add(user)
        db.commit()
        db.refresh(user)

        # Initialize clean isolated workspace defaults
        briefing = Briefing(
            user_id=user.id,
            date="Today",
            greeting=f"Welcome, {user.full_name}",
            quote="“Excellence is not an act, but a habit.” — Aristotle",
            summary=f"Welcome to your private MaamAI workspace, {user.full_name}.",
            key_focus="Review connected Google Workspace; Check daily agenda",
            urgent_count=0,
            meetings_count=0,
            tasks_count=0,
        )
        db.add(briefing)

        log = ActivityLog(
            user_id=user.id,
            title="Google Account Provisioned",
            description=f"Authorized staff workspace securely provisioned for {user.email}.",
            category="auth",
        )
        db.add(log)
        db.commit()
    else:
        # Reconcile existing user
        user.google_id = google_sub
        if picture:
            user.picture_url = picture
        db.commit()

    # 6. Secure OAuth Token Storage (Fernet authenticated encryption at rest)
    conn = (
        db.query(OAuthConnection)
        .filter(
            OAuthConnection.user_id == user.id,
            OAuthConnection.provider == "google",
        )
        .first()
    )

    if not conn:
        conn = OAuthConnection(
            user_id=user.id,
            provider="google",
            email_account=verified_email,
        )
        db.add(conn)

    conn.is_connected = True
    access_token = token_payload.get("access_token")
    refresh_token = token_payload.get("refresh_token")
    # If refresh_token was omitted (re-login without prompt), preserve existing refresh token
    if not refresh_token and conn.refresh_token:
        _, existing_refresh = conn.get_decrypted_tokens()
        refresh_token = existing_refresh

    conn.set_tokens(access_token=access_token, refresh_token=refresh_token)
    expires_in = token_payload.get("expires_in", 3600)
    conn.token_expiry = now + datetime.timedelta(seconds=expires_in)
    conn.scopes = token_payload.get("scope", " ".join(OAUTH_SCOPES))
    conn.updated_at = now
    db.commit()

    # 7. Generate application JWT session token
    session_token = create_access_token(user_id=user.id, username=user.username)
    return user, session_token

@router.get("/google/url")
def get_google_auth_url():
    """
    Generate the official Google OAuth 2.0 authorization URL with a tamper-evident state parameter.
    """
    state = generate_oauth_state()
    auth_url = build_google_auth_url(state)
    return {
        "auth_url": auth_url,
        "state": state,
    }

@router.get("/google/callback")
def google_oauth_callback(
    code: Optional[str] = Query(None),
    state: Optional[str] = Query(None),
    error: Optional[str] = Query(None),
    db: Session = Depends(get_db),
):
    """
    Handle Google OAuth 2.0 server-side redirect callback.
    """
    if error:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Google authentication error: {error}",
        )

    if not code or not state:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Missing required authorization code or state parameter.",
        )

    user, session_token = _process_google_auth(code=code, state=state, db=db)

    frontend_redirect_url = f"/?token={session_token}"
    response = RedirectResponse(url=frontend_redirect_url, status_code=status.HTTP_302_FOUND)
    response.set_cookie(
        key="maamai_session",
        value=session_token,
        httponly=True,
        secure=settings.ENVIRONMENT.lower() == "production",
        samesite="lax",
        max_age=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
    )
    return response

@router.post("/google/exchange", response_model=TokenResponse)
def google_oauth_exchange(
    payload: GoogleExchangeRequest,
    response: Response,
    db: Session = Depends(get_db),
):
    """
    JSON endpoint for SPA direct exchange of Google code and state.
    """
    user, session_token = _process_google_auth(code=payload.code, state=payload.state, db=db)

    response.set_cookie(
        key="maamai_session",
        value=session_token,
        httponly=True,
        secure=settings.ENVIRONMENT.lower() == "production",
        samesite="lax",
        max_age=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
    )
    return TokenResponse(
        access_token=session_token,
        user=UserResponse.model_validate(user),
    )

@router.get("/me", response_model=UserResponse)
def get_current_user_profile(current_user: User = Depends(get_current_user)):
    """Retrieve current authenticated staff profile."""
    return UserResponse.model_validate(current_user)

@router.post("/logout")
def logout(
    request: Request,
    response: Response,
    current_user: User = Depends(get_current_user),
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db),
):
    """
    Log out staff member and immediately revoke the active JWT session on the server.
    Subsequent requests with this token will be rejected with 401 Unauthorized.
    """
    token = None
    if credentials and credentials.credentials:
        token = credentials.credentials
    elif "maamai_session" in request.cookies:
        token = request.cookies.get("maamai_session")

    if token:
        revoke_token(token, db=db, user_id=current_user.id)

    # Clear HttpOnly session cookie
    response.delete_cookie("maamai_session")

    log = ActivityLog(
        user_id=current_user.id,
        title="Staff Logged Out",
        description="Session revoked and logged out from server.",
        category="auth",
    )
    db.add(log)
    db.commit()

    return {"message": "Logged out successfully. Session token revoked."}
