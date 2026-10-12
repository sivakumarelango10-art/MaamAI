"""
Emails Router for MaamAI.
Provides real Gmail inbox integration for the authenticated staff member,
deterministic & AI response generation, and explicit Gmail draft dispatch.
Never accesses or exposes another user's emails.
"""

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from typing import List, Optional

from app.database import get_db
from app.models import User, Email, AIDraft, ActivityLog
from app.auth import get_current_user
from app.schemas import EmailResponse, AIDraftResponse
from app.services.google_service import (
    get_valid_user_access_token,
    fetch_gmail_inbox,
    create_gmail_draft,
)
from app.services.ai_service import (
    deterministic_classify_email,
    generate_draft_response,
)

router = APIRouter(prefix="/emails", tags=["Emails"])

@router.get("", response_model=List[EmailResponse])
def get_emails(
    category: Optional[str] = Query(None, description="Filter by category"),
    priority: Optional[str] = Query(None, description="Filter by priority"),
    unread_only: bool = Query(False, description="Filter unread only"),
    sync_gmail: bool = Query(True, description="Attempt on-demand sync from connected Gmail account"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Retrieve real emails strictly belonging to the currently authenticated staff member.
    If Google Workspace is connected, syncs new inbox messages directly from Gmail API.
    """
    # 1. On-demand Gmail synchronization if connected
    if sync_gmail:
        access_token = get_valid_user_access_token(current_user.id, db)
        if access_token:
            try:
                live_messages = fetch_gmail_inbox(access_token, max_results=15)
                for msg in live_messages:
                    existing = (
                        db.query(Email)
                        .filter(
                            Email.user_id == current_user.id,
                            Email.google_message_id == msg["google_message_id"],
                        )
                        .first()
                    )
                    if not existing:
                        classification = deterministic_classify_email(
                            msg["subject"], msg["body"], msg["sender_name"]
                        )
                        new_email = Email(
                            user_id=current_user.id,
                            google_message_id=msg["google_message_id"],
                            thread_id=msg.get("thread_id"),
                            sender_name=msg["sender_name"],
                            sender_email=msg["sender_email"],
                            subject=msg["subject"],
                            snippet=msg["snippet"],
                            body=msg["body"],
                            category=classification["category"],
                            priority=classification["priority"],
                            is_read=msg["is_read"],
                            received_at=msg["received_at"],
                            demo_label="[Live Gmail - Verified Inbox]",
                        )
                        db.add(new_email)
                db.commit()
            except Exception:
                # If network or API quota error, gracefully fall back to local database records
                pass

    # 2. Query persistent database records belonging exclusively to current user
    query = db.query(Email).filter(Email.user_id == current_user.id)

    if category and category.lower() != "all":
        query = query.filter(Email.category.ilike(category))
    if priority and priority.lower() != "all":
        query = query.filter(Email.priority.ilike(priority))
    if unread_only:
        query = query.filter(Email.is_read == False)

    return query.order_by(Email.id.desc()).all()

@router.get("/{email_id}", response_model=EmailResponse)
def get_email_by_id(
    email_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Retrieve single email details. Enforces ownership check; returns 404 if not found or belongs to another user.
    """
    email = db.query(Email).filter(
        Email.id == email_id,
        Email.user_id == current_user.id,
    ).first()

    if not email:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Email not found")
    return email

@router.patch("/{email_id}/toggle-read", response_model=EmailResponse)
def toggle_email_read(
    email_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Toggle read/unread status for an email owned by current user.
    """
    email = db.query(Email).filter(
        Email.id == email_id,
        Email.user_id == current_user.id,
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
    db: Session = Depends(get_db),
):
    """
    Generate AI / deterministic draft for the specified email owned by current user.
    """
    email = db.query(Email).filter(
        Email.id == email_id,
        Email.user_id == current_user.id,
    ).first()

    if not email:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Email not found")

    existing_draft = db.query(AIDraft).filter(
        AIDraft.email_id == email_id,
        AIDraft.user_id == current_user.id,
    ).first()

    if existing_draft:
        return existing_draft

    # Generate proposal via zero-rupee AI service
    result = generate_draft_response(
        sender_name=email.sender_name,
        subject=email.subject,
        body=email.body,
        tone="Academic & Professional",
        user_name=current_user.full_name,
        user_dept=current_user.department,
    )

    new_draft = AIDraft(
        user_id=current_user.id,
        email_id=email.id,
        recipient=f"{email.sender_name} <{email.sender_email}>",
        subject=f"Re: {email.subject}",
        body=result["suggested_body"],
        tone=result["tone"],
        status="pending_review",
        confidence_score=result["confidence_score"],
        demo_label=f"[{'AI Generated' if result['is_ai_generated'] else 'Rule-Based Template'} Draft]",
    )
    email.has_draft = True
    db.add(new_draft)

    log = ActivityLog(
        user_id=current_user.id,
        title=f"Draft Prepared for {email.sender_name}",
        description=f"Generated reply proposal for '{email.subject}' using {result['generation_method']}.",
        category="ai_draft",
    )
    db.add(log)
    db.commit()
    db.refresh(new_draft)
    return new_draft

@router.post("/{email_id}/save-gmail-draft")
def save_draft_to_gmail(
    email_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Create a genuine draft in the user's connected Gmail account via POST /users/me/drafts.
    CRITICAL: Never automatically sends emails. Human confirmation and dispatch only.
    """
    email = db.query(Email).filter(
        Email.id == email_id,
        Email.user_id == current_user.id,
    ).first()

    if not email:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Email not found")

    draft = db.query(AIDraft).filter(
        AIDraft.email_id == email_id,
        AIDraft.user_id == current_user.id,
    ).first()

    if not draft:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No draft exists for this email.")

    access_token = get_valid_user_access_token(current_user.id, db)
    if not access_token:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Google Workspace is not connected. Please connect Google to save drafts directly to Gmail."
        )

    try:
        gmail_res = create_gmail_draft(
            access_token=access_token,
            recipient=email.sender_email,
            subject=draft.subject,
            body=draft.body,
            thread_id=email.thread_id,
        )
        draft.google_draft_id = gmail_res.get("id")
        draft.status = "saved_to_gmail"
        db.commit()

        log = ActivityLog(
            user_id=current_user.id,
            title="Draft Saved to Gmail",
            description=f"Successfully created Gmail draft (ID: {draft.google_draft_id}) for '{draft.subject}'.",
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
