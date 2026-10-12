from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import User, Briefing, Email, CalendarEvent, Task
from app.auth import get_current_user
from app.schemas import BriefingResponse

router = APIRouter(prefix="/briefing", tags=["Briefing"])

@router.get("", response_model=BriefingResponse)
def get_daily_briefing(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Fetch the current daily briefing synthesized exclusively for the authenticated faculty member.
    Never exposes briefing or counts belonging to another user.
    """
    briefing = (
        db.query(Briefing)
        .filter(Briefing.user_id == current_user.id)
        .order_by(Briefing.id.desc())
        .first()
    )

    if not briefing:
        # Default briefing if none exists yet
        briefing = Briefing(
            user_id=current_user.id,
            date="Today",
            greeting=f"Good morning, {current_user.full_name}",
            quote="“Excellence is not an act, but a habit.” — Aristotle",
            summary=f"Welcome to your personal assistant dashboard, {current_user.full_name}.",
            key_focus="Review pending communications; Review academic schedule",
            urgent_count=0,
            meetings_count=0,
            tasks_count=0,
        )
        db.add(briefing)
        db.commit()
        db.refresh(briefing)

    # Calculate live user-specific counts
    urgent_email_count = (
        db.query(Email)
        .filter(Email.user_id == current_user.id, Email.priority == "high", Email.is_read == False)
        .count()
    )
    calendar_count = (
        db.query(CalendarEvent)
        .filter(CalendarEvent.user_id == current_user.id, CalendarEvent.date_str == "Today")
        .count()
    )
    pending_tasks_count = (
        db.query(Task)
        .filter(Task.user_id == current_user.id, Task.status != "completed")
        .count()
    )

    focus_list = [item.strip() for item in briefing.key_focus.split(";") if item.strip()]

    return BriefingResponse(
        id=briefing.id,
        user_id=briefing.user_id,
        date=briefing.date,
        greeting=briefing.greeting,
        quote=briefing.quote,
        summary=briefing.summary,
        key_focus=focus_list,
        urgent_count=urgent_email_count,
        meetings_count=calendar_count,
        tasks_count=pending_tasks_count,
        generated_at=briefing.generated_at,
    )
