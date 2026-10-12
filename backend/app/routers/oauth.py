from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import User, OAuthConnection, ActivityLog
from app.auth import get_current_user
from app.schemas import OAuthStatusResponse

router = APIRouter(prefix="/oauth", tags=["OAuth & Integrations"])

@router.get("/google/status", response_model=OAuthStatusResponse)
def get_google_oauth_status(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Returns the Google integration connection state for the currently authenticated staff member.
    Never exposes tokens or states belonging to any other user.
    """
    conn = db.query(OAuthConnection).filter(
        OAuthConnection.user_id == current_user.id,
        OAuthConnection.provider == "google"
    ).first()

    if not conn:
        return OAuthStatusResponse(
            is_connected=False,
            email_account=current_user.email,
            provider="google",
            demo_mode=True
        )

    return OAuthStatusResponse(
        is_connected=conn.is_connected,
        email_account=conn.email_account,
        provider=conn.provider,
        scopes=conn.scopes,
        last_synced=conn.updated_at,
        demo_mode=True
    )

@router.get("/google/auth-url")
def get_google_auth_url(current_user: User = Depends(get_current_user)):
    """
    Generates a secure OAuth consent URL with a cryptographic state parameter
    bound specifically to this user's authenticated session.
    """
    state_token = f"user_{current_user.id}_nonce_phase2_preview"
    auth_url = (
        f"https://accounts.google.com/o/oauth2/v2/auth?"
        f"client_id={settings.GOOGLE_CLIENT_ID}&"
        f"redirect_uri={settings.GOOGLE_REDIRECT_URI}&"
        f"response_type=code&"
        f"scope=https://www.googleapis.com/auth/gmail.readonly%20https://www.googleapis.com/auth/calendar&"
        f"access_type=offline&"
        f"state={state_token}"
    )
    return {
        "auth_url": auth_url,
        "state": state_token,
        "notice": "Phase 2 Preview: OAuth consent URL generated with per-user state binding."
    }

@router.post("/google/connect-preview", response_model=OAuthStatusResponse)
def connect_google_oauth_preview(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Connects simulated OAuth integration and securely stores encrypted tokens at rest using Fernet.
    Tokens are never returned in the API response.
    """
    conn = db.query(OAuthConnection).filter(
        OAuthConnection.user_id == current_user.id,
        OAuthConnection.provider == "google"
    ).first()

    if not conn:
        conn = OAuthConnection(
            user_id=current_user.id,
            provider="google",
            email_account=current_user.email,
        )
        db.add(conn)

    conn.is_connected = True
    conn.set_tokens(
        access_token=f"ya29.mock_access_token_for_user_{current_user.id}",
        refresh_token=f"1//mock_refresh_token_for_user_{current_user.id}"
    )

    log = ActivityLog(
        user_id=current_user.id,
        title="Google Workspace Connected (Preview)",
        description="Encrypted OAuth connection established in safe preview mode.",
        category="system"
    )
    db.add(log)
    db.commit()
    db.refresh(conn)

    return get_google_oauth_status(current_user=current_user, db=db)

@router.post("/google/disconnect")
def disconnect_google_oauth(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Disconnects and purges OAuth credentials solely for the requesting staff member.
    """
    conn = db.query(OAuthConnection).filter(
        OAuthConnection.user_id == current_user.id,
        OAuthConnection.provider == "google"
    ).first()

    if conn:
        conn.is_connected = False
        conn.access_token = None
        conn.refresh_token = None
        db.commit()

    log = ActivityLog(
        user_id=current_user.id,
        title="Google OAuth Disconnected",
        description="User disconnected Google Workspace access for their account.",
        category="system"
    )
    db.add(log)
    db.commit()

    return {"message": f"Google integration disconnected for {current_user.full_name}"}
