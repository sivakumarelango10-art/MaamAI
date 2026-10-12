from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from typing import List, Optional
from app.database import get_db
from app.models import User, CalendarEvent, ActivityLog
from app.auth import get_current_user
from app.schemas import CalendarEventResponse, CalendarEventCreate

router = APIRouter(prefix="/calendar", tags=["Calendar"])

@router.get("", response_model=List[CalendarEventResponse])
def get_calendar_events(
    date_str: Optional[str] = Query(None, description="Filter events by date_str (Today, Tomorrow, All)"),
    event_type: Optional[str] = Query(None, description="Filter by event_type"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Retrieve academic calendar timeline events strictly for the currently authenticated staff member.
    """
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
    db: Session = Depends(get_db)
):
    """
    Create a new calendar entry owned by the authenticated staff member.
    """
    new_event = CalendarEvent(
        user_id=current_user.id,
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
    db: Session = Depends(get_db)
):
    """
    Delete a calendar event owned by current user.
    """
    event = db.query(CalendarEvent).filter(
        CalendarEvent.id == event_id,
        CalendarEvent.user_id == current_user.id
    ).first()

    if not event:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Calendar event not found")

    db.delete(event)
    db.commit()
    return {"message": f"Event {event_id} deleted successfully"}
