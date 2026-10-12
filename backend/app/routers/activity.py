from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from typing import List
from app.database import get_db
from app.models import User, ActivityLog
from app.auth import get_current_user
from app.schemas import ActivityLogResponse

router = APIRouter(prefix="/activity", tags=["Activity"])

@router.get("", response_model=List[ActivityLogResponse])
def get_activity_logs(
    limit: int = Query(25, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Retrieve audit and activity logs strictly belonging to the currently authenticated staff member.
    """
    return (
        db.query(ActivityLog)
        .filter(ActivityLog.user_id == current_user.id)
        .order_by(ActivityLog.timestamp.desc())
        .limit(limit)
        .all()
    )
