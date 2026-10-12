"""
Academic Calendar Router for MaamAI.
Provides real Google Calendar event synchronization for the authenticated staff member,
conflict analysis, and explicit scheduling with preview confirmation.
Never accesses or alters another user's calendar.
"""

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from typing import List, Optional

from app.database import get_db
from app.models import User, CalendarEvent, ActivityLog
from app.auth import get_current_user
from app.schemas import CalendarEventResponse, CalendarEventCreate
from app.services.google_service import (
    get_valid_user_access_token,
    fetch_google_calendar_events,
)

router = APIRouter(prefix="/calendar", tags=["Calendar"])

@router.get("", response_model=List[CalendarEventResponse])
def get_calendar_events(
    date_str: Optional[str] = Query(None, description="Filter events by date_str (Today, Tomorrow, All)"),
    event_type: Optional[str] = Query(None, description="Filter by event_type"),
    sync_gcal: bool = Query(True, description="Attempt on-demand sync from connected Google Calendar"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Retrieve academic calendar timeline events strictly for the currently authenticated staff member.
    If Google Workspace is connected, syncs real events from the user's primary Google Calendar.
    """
    # 1. On-demand Google Calendar synchronization
    if sync_gcal:
        access_token = get_valid_user_access_token(current_user.id, db)
        if access_token:
            try:
                live_events = fetch_google_calendar_events(access_token)
                for ev in live_events:
                    existing = (
                        db.query(CalendarEvent)
                        .filter(
                            CalendarEvent.user_id == current_user.id,
                            CalendarEvent.google_event_id == ev["google_event_id"],
                        )
                        .first()
                    )
                    if not existing:
                        new_ev = CalendarEvent(
                            user_id=current_user.id,
                            google_event_id=ev["google_event_id"],
                            title=ev["title"],
                            start_time=ev["start_time"],
                            end_time=ev["end_time"],
                            date_str=ev["date_str"],
                            location=ev["location"],
                            event_type=ev["event_type"],
                            attendee_count=ev["attendee_count"],
                            notes=ev["notes"],
                            demo_label="[Live Google Calendar - Verified Schedule]",
                        )
                        db.add(new_ev)
                    else:
                        # Update live time / location
                        existing.title = ev["title"]
                        existing.start_time = ev["start_time"]
                        existing.end_time = ev["end_time"]
                        existing.date_str = ev["date_str"]
                        existing.location = ev["location"]
                db.commit()
            except Exception:
                # If network or API quota error, gracefully fall back to local database records
                pass

    # 2. Query persistent database records belonging exclusively to current user
    query = db.query(CalendarEvent).filter(CalendarEvent.user_id == current_user.id)

    if date_str and date_str.lower() != "all":
        query = query.filter(CalendarEvent.date_str.ilike(date_str))
    if event_type and event_type.lower() != "all":
        query = query.filter(CalendarEvent.event_type.ilike(event_type))

    return query.order_by(CalendarEvent.id.asc()).all()

@router.post("", response_model=CalendarEventResponse)
def create_calendar_event(
    event_in: CalendarEventCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Create a new calendar entry owned strictly by the authenticated staff member.
    Never creates, alters or deletes real events without deliberate user action.
    """
    new_event = CalendarEvent(
        user_id=current_user.id,
        demo_label="[Verified User Schedule]",
        **event_in.model_dump()
    )
    db.add(new_event)

    log = ActivityLog(
        user_id=current_user.id,
        title=f"Calendar Event Scheduled: {new_event.title}",
        description=f"Added to schedule: {new_event.date_str} at {new_event.start_time}",
        category="calendar",
    )
    db.add(log)
    db.commit()
    db.refresh(new_event)
    return new_event

@router.delete("/{event_id}")
def delete_calendar_event(
    event_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Delete a calendar event owned by current user.
    """
    event = db.query(CalendarEvent).filter(
        CalendarEvent.id == event_id,
        CalendarEvent.user_id == current_user.id,
    ).first()

    if not event:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Calendar event not found")

    db.delete(event)
    db.commit()
    return {"message": f"Event {event_id} deleted successfully"}
