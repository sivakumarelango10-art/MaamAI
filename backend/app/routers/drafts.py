"""
AI Drafts Review Queue Router for MaamAI.
Provides human-in-the-loop review, editing, approval, rejection,
and direct creation in the user's Gmail account.
Never automatically dispatches or sends emails.
"""

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from typing import List, Optional

from app.database import get_db
from app.models import User, AIDraft, Email, ActivityLog
from app.auth import get_current_user
from app.schemas import AIDraftResponse, AIDraftUpdate
from app.services.google_service import get_valid_user_access_token, create_gmail_draft

router = APIRouter(prefix="/ai-drafts", tags=["AI Drafts"])

@router.get("", response_model=List[AIDraftResponse])
def get_drafts(
    status_filter: Optional[str] = Query(None, alias="status", description="Filter by status"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Retrieve AI-generated drafts awaiting review or completed strictly for the current staff member.
    Never exposes drafts belonging to another user.
    """
    query = db.query(AIDraft).filter(AIDraft.user_id == current_user.id)
    if status_filter and status_filter.lower() != "all":
        query = query.filter(AIDraft.status == status_filter.lower())
    return query.order_by(AIDraft.created_at.desc()).all()

@router.get("/{draft_id}", response_model=AIDraftResponse)
def get_draft(
    draft_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Retrieve single AI draft with ownership check.
    """
    draft = db.query(AIDraft).filter(
        AIDraft.id == draft_id,
        AIDraft.user_id == current_user.id,
    ).first()

    if not draft:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="AI draft not found")
    return draft

@router.post("/{draft_id}/approve", response_model=AIDraftResponse)
def approve_draft(
    draft_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Approve draft. Human-in-the-loop verification required.
    Does NOT send emails automatically.
    """
    draft = db.query(AIDraft).filter(
        AIDraft.id == draft_id,
        AIDraft.user_id == current_user.id,
    ).first()

    if not draft:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="AI draft not found")

    draft.status = "approved"
    log = ActivityLog(
        user_id=current_user.id,
        title=f"Staff Approved Draft #{draft.id}",
        description=f"Approved reply to {draft.recipient}: '{draft.subject}'",
        category="ai_draft",
    )
    db.add(log)
    db.commit()
    db.refresh(draft)
    return draft

@router.post("/{draft_id}/reject", response_model=AIDraftResponse)
def reject_draft(
    draft_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Discard/reject draft.
    """
    draft = db.query(AIDraft).filter(
        AIDraft.id == draft_id,
        AIDraft.user_id == current_user.id,
    ).first()

    if not draft:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="AI draft not found")

    draft.status = "rejected"
    log = ActivityLog(
        user_id=current_user.id,
        title=f"Staff Rejected Draft #{draft.id}",
        description=f"Discarded proposal for '{draft.subject}'",
        category="ai_draft",
    )
    db.add(log)
    db.commit()
    db.refresh(draft)
    return draft

@router.patch("/{draft_id}", response_model=AIDraftResponse)
def update_draft(
    draft_id: int,
    draft_update: AIDraftUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Edit draft content, subject, or tone before approval.
    """
    draft = db.query(AIDraft).filter(
        AIDraft.id == draft_id,
        AIDraft.user_id == current_user.id,
    ).first()

    if not draft:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="AI draft not found")

    if draft_update.body is not None:
        draft.body = draft_update.body
    if draft_update.subject is not None:
        draft.subject = draft_update.subject
    if draft_update.status is not None:
        draft.status = draft_update.status
    if draft_update.tone is not None:
        draft.tone = draft_update.tone

    db.commit()
    db.refresh(draft)
    return draft

@router.post("/{draft_id}/save-to-gmail")
def save_draft_to_gmail_account(
    draft_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Create a real draft in the authenticated user's connected Gmail account.
    """
    draft = db.query(AIDraft).filter(
        AIDraft.id == draft_id,
        AIDraft.user_id == current_user.id,
    ).first()

    if not draft:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="AI draft not found")

    access_token = get_valid_user_access_token(current_user.id, db)
    if not access_token:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Google Workspace is not connected. Please connect Google to save drafts to Gmail."
        )

    # Resolve thread ID if available
    thread_id = None
    if draft.email_id:
        parent_email = db.query(Email).filter(Email.id == draft.email_id).first()
        if parent_email:
            thread_id = parent_email.thread_id

    # Parse clean recipient email
    recipient_email = draft.recipient
    if "<" in recipient_email and ">" in recipient_email:
        recipient_email = recipient_email.split("<")[1].split(">")[0].strip()

    try:
        gmail_res = create_gmail_draft(
            access_token=access_token,
            recipient=recipient_email,
            subject=draft.subject,
            body=draft.body,
            thread_id=thread_id,
        )
        draft.google_draft_id = gmail_res.get("id")
        draft.status = "saved_to_gmail"
        db.commit()

        log = ActivityLog(
            user_id=current_user.id,
            title="Draft Saved to Gmail",
            description=f"Created real Gmail draft (ID: {draft.google_draft_id}) for '{draft.subject}'.",
            category="ai_draft",
        )
        db.add(log)
        db.commit()

        return {
            "success": True,
            "draft_id": draft.google_draft_id,
            "message": "Draft created in your Gmail account. You can review and send it from Gmail anytime.",
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create draft in Gmail: {e}",
        )
