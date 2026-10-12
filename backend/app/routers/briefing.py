"""
Daily Briefing Router for MaamAI.
Synthesizes executive daily briefings strictly from verified, persisted data
belonging to the currently authenticated staff member.
Truthful empty states when sources are disconnected or empty.
Never invents fictional counts or fabricated appointments.
"""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import User, Briefing, Email, CalendarEvent, Task, OAuthConnection
from app.auth import get_current_user
from app.schemas import BriefingResponse

router = APIRouter(prefix="/briefing", tags=["Briefing"])

@router.get("", response_model=BriefingResponse)
def get_daily_briefing(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Fetch the truthful daily briefing synthesized exclusively for the authenticated faculty member.
    Never exposes briefing or counts belonging to another user.
    """
    # Check Google Workspace connection status
    oauth_conn = (
        db.query(OAuthConnection)
        .filter(
            OAuthConnection.user_id == current_user.id,
            OAuthConnection.provider == "google",
            OAuthConnection.is_connected == True,
        )
        .first()
    )
    is_google_connected = oauth_conn is not None

    # Calculate live user-specific counts
    urgent_email_count = (
        db.query(Email)
        .filter(Email.user_id == current_user.id, Email.priority == "high", Email.is_read == False)
        .count()
    )
    today_calendar_count = (
        db.query(CalendarEvent)
        .filter(CalendarEvent.user_id == current_user.id, CalendarEvent.date_str == "Today")
        .count()
    )
    pending_tasks_count = (
        db.query(Task)
        .filter(Task.user_id == current_user.id, Task.status != "completed")
        .count()
    )

    briefing = (
        db.query(Briefing)
        .filter(Briefing.user_id == current_user.id)
        .order_by(Briefing.id.desc())
        .first()
    )

    if not briefing:
        briefing = Briefing(
            user_id=current_user.id,
            date="Today",
            greeting=f"Good morning, {current_user.full_name}",
            quote="“Excellence is not an act, but a habit.” — Aristotle",
            summary="",
            key_focus="",
            urgent_count=urgent_email_count,
            meetings_count=today_calendar_count,
            tasks_count=pending_tasks_count,
        )
        db.add(briefing)

    # Build truthful summary and focus list based on real connected data
    focus_items = []
    if urgent_email_count > 0:
        focus_items.append(f"Review {urgent_email_count} high-priority email inquiry{'s' if urgent_email_count > 1 else ''}")
    if today_calendar_count > 0:
        focus_items.append(f"Attend {today_calendar_count} scheduled academic session{'s' if today_calendar_count > 1 else ''} today")
    if pending_tasks_count > 0:
        focus_items.append(f"Work on {pending_tasks_count} pending faculty task{'s' if pending_tasks_count > 1 else ''}")

    if not is_google_connected:
        focus_items.append("Connect Google Workspace to synchronize live Gmail inbox and Google Calendar")

    if not focus_items:
        focus_items = ["All pending items cleared; Workspace is fully synchronized"]

    if is_google_connected:
        summary_text = (
            f"Your Google Workspace is connected. You have {urgent_email_count} urgent message{'s' if urgent_email_count != 1 else ''}, "
            f"{today_calendar_count} meeting{'s' if today_calendar_count != 1 else ''} today, and {pending_tasks_count} pending task{'s' if pending_tasks_count != 1 else ''}."
        )
    else:
        summary_text = (
            f"Google Workspace is currently disconnected. Showing {pending_tasks_count} local pending task{'s' if pending_tasks_count != 1 else ''}. "
            "Connect your Google account to stream real Gmail messages and Calendar events."
        )

    briefing.summary = summary_text
    briefing.key_focus = "; ".join(focus_items)
    briefing.urgent_count = urgent_email_count
    briefing.meetings_count = today_calendar_count
    briefing.tasks_count = pending_tasks_count
    db.commit()
    db.refresh(briefing)

    return BriefingResponse(
        id=briefing.id,
        user_id=briefing.user_id,
        date=briefing.date,
        greeting=briefing.greeting,
        quote=briefing.quote,
        summary=briefing.summary,
        key_focus=focus_items,
        urgent_count=urgent_email_count,
        meetings_count=today_calendar_count,
        tasks_count=pending_tasks_count,
        generated_at=briefing.generated_at,
    )
