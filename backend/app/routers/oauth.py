"""
OAuth Router for MaamAI.
Manages Google integration connection state and user disconnect operations.
Never exposes encrypted tokens or secret keys in API responses.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import User, OAuthConnection, ActivityLog
from app.auth import get_current_user
from app.schemas import OAuthStatusResponse
from app.services.google_service import build_google_auth_url, generate_oauth_state

router = APIRouter(prefix="/oauth", tags=["OAuth & Integrations"])

@router.get("/google/status", response_model=OAuthStatusResponse)
def get_google_oauth_status(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Returns the real Google Workspace connection state for the currently authenticated staff member.
    Never exposes tokens or states belonging to any other user.
    """
    conn = db.query(OAuthConnection).filter(
        OAuthConnection.user_id == current_user.id,
        OAuthConnection.provider == "google"
    ).first()

    if not conn or not conn.is_connected:
        return OAuthStatusResponse(
            is_connected=False,
            email_account=current_user.email,
            provider="google",
            demo_mode=False
        )

    return OAuthStatusResponse(
        is_connected=conn.is_connected,
        email_account=conn.email_account,
        provider=conn.provider,
        scopes=conn.scopes,
        last_synced=conn.updated_at,
        demo_mode=False
    )

@router.get("/google/auth-url")
def get_google_auth_url(current_user: User = Depends(get_current_user)):
    """
    Generates a secure OAuth consent URL for connecting or reconnecting Google Workspace.
    """
    state_token = generate_oauth_state()
    auth_url = build_google_auth_url(state_token)
    return {
        "auth_url": auth_url,
        "state": state_token,
    }

@router.post("/google/disconnect")
def disconnect_google_oauth(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Disconnects Google Workspace and purges stored OAuth tokens for the authenticated staff member.
    """
    conn = db.query(OAuthConnection).filter(
        OAuthConnection.user_id == current_user.id,
        OAuthConnection.provider == "google"
    ).first()

    if conn:
        conn.is_connected = False
        conn.access_token = None
        conn.refresh_token = None
        conn.token_expiry = None
        db.commit()

    log = ActivityLog(
        user_id=current_user.id,
        title="Google Workspace Disconnected",
        description="Staff member disconnected Google Workspace integration.",
        category="system"
    )
    db.add(log)
    db.commit()

    return {"message": f"Google Workspace disconnected successfully for {current_user.full_name}."}
