import datetime
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from typing import List, Optional
from app.database import get_db
from app.models import User, AIDraft, ActivityLog
from app.auth import get_current_user
from app.schemas import AIDraftResponse, AIDraftUpdate

router = APIRouter(prefix="/ai-drafts", tags=["AI Drafts"])

@router.get("", response_model=List[AIDraftResponse])
def get_drafts(
    status_filter: Optional[str] = Query(None, alias="status", description="Filter by status"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Retrieve AI-generated drafts awaiting review or completed for the current staff member.
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
    db: Session = Depends(get_db)
):
    """
    Retrieve single AI draft with ownership check.
    """
    draft = db.query(AIDraft).filter(
        AIDraft.id == draft_id,
        AIDraft.user_id == current_user.id
    ).first()

    if not draft:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="AI draft not found")
    return draft

@router.post("/{draft_id}/approve", response_model=AIDraftResponse)
def approve_draft(
    draft_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Approve draft for dispatch. Human-in-the-loop verification required.
    """
    draft = db.query(AIDraft).filter(
        AIDraft.id == draft_id,
        AIDraft.user_id == current_user.id
    ).first()

    if not draft:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="AI draft not found")

    draft.status = "approved"
    log = ActivityLog(
        user_id=current_user.id,
        title=f"Staff Approved AI Draft #{draft.id}",
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
    db: Session = Depends(get_db)
):
    """
    Discard/reject draft.
    """
    draft = db.query(AIDraft).filter(
        AIDraft.id == draft_id,
        AIDraft.user_id == current_user.id
    ).first()

    if not draft:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="AI draft not found")

    draft.status = "rejected"
    log = ActivityLog(
        user_id=current_user.id,
        title=f"Staff Rejected AI Draft #{draft.id}",
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
    db: Session = Depends(get_db)
):
    """
    Edit draft content, subject, or tone before approval.
    """
    draft = db.query(AIDraft).filter(
        AIDraft.id == draft_id,
        AIDraft.user_id == current_user.id
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
