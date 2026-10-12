import datetime
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from typing import List, Optional
from app.database import get_db
from app.models import User, Email, AIDraft, ActivityLog
from app.auth import get_current_user
from app.schemas import EmailResponse, AIDraftResponse

router = APIRouter(prefix="/emails", tags=["Emails"])

@router.get("", response_model=List[EmailResponse])
def get_emails(
    category: Optional[str] = Query(None, description="Filter by category"),
    priority: Optional[str] = Query(None, description="Filter by priority"),
    unread_only: bool = Query(False, description="Filter unread only"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Retrieve demo emails strictly belonging to the currently authenticated staff member.
    """
    query = db.query(Email).filter(Email.user_id == current_user.id)

    if category and category.lower() != "all":
        query = query.filter(Email.category.ilike(category))
    if priority and priority.lower() != "all":
        query = query.filter(Email.priority.ilike(priority))
    if unread_only:
        query = query.filter(Email.is_read == False)

    return query.order_by(Email.id.asc()).all()

@router.get("/{email_id}", response_model=EmailResponse)
def get_email_by_id(
    email_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Retrieve single email details. Enforces ownership check; returns 404 if not found or belongs to another user.
    """
    email = db.query(Email).filter(
        Email.id == email_id,
        Email.user_id == current_user.id
    ).first()

    if not email:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Email not found")
    return email

@router.patch("/{email_id}/toggle-read", response_model=EmailResponse)
def toggle_email_read(
    email_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Toggle read/unread status for an email owned by current user.
    """
    email = db.query(Email).filter(
        Email.id == email_id,
        Email.user_id == current_user.id
    ).first()

    if not email:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Email not found")

    email.is_read = not email.is_read
    db.commit()
    db.refresh(email)
    return email

@router.post("/{email_id}/generate-draft", response_model=AIDraftResponse)
def generate_draft_for_email(
    email_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Generate simulated AI draft for the specified email owned by current user.
    """
    email = db.query(Email).filter(
        Email.id == email_id,
        Email.user_id == current_user.id
    ).first()

    if not email:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Email not found")

    existing_draft = db.query(AIDraft).filter(
        AIDraft.email_id == email_id,
        AIDraft.user_id == current_user.id
    ).first()

    if existing_draft:
        return existing_draft

    suggested_body = (
        f"Dear {email.sender_name.split()[0]},\n\n"
        f"Thank you for contacting me regarding '{email.subject}'. I have noted your message and will review the details. "
        "Please feel free to follow up during my upcoming office hours if this requires synchronous discussion.\n\n"
        f"Best regards,\n{current_user.full_name}\n{current_user.department}"
    )

    new_draft = AIDraft(
        user_id=current_user.id,
        email_id=email.id,
        recipient=f"{email.sender_name} <{email.sender_email}>",
        subject=f"Re: {email.subject}",
        body=suggested_body,
        tone="Academic & Professional",
        status="pending_review",
        confidence_score=0.92,
        demo_label="[Demo - AI Proposed Response]",
    )
    email.has_draft = True
    db.add(new_draft)

    log = ActivityLog(
        user_id=current_user.id,
        title=f"AI Draft Generated for {email.sender_name}",
        description=f"Automated draft proposal prepared for '{email.subject}'.",
        category="ai_draft",
    )
    db.add(log)
    db.commit()
    db.refresh(new_draft)
    return new_draft
