import datetime
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import text
from app.database import get_db
from app.config import settings
from app.schemas import HealthCheckResponse

router = APIRouter(tags=["Health"])

@router.get("/health", response_model=HealthCheckResponse)
def health_check(db: Session = Depends(get_db)):
    """Health check endpoint that verifies server and SQLite connectivity."""
    db_status = "connected"
    try:
        db.execute(text("SELECT 1"))
    except Exception:
        db_status = "disconnected"

    return HealthCheckResponse(
        status="ok" if db_status == "connected" else "degraded",
        app=settings.PROJECT_NAME,
        version=settings.VERSION,
        database=db_status,
        environment=settings.ENVIRONMENT,
        timestamp=datetime.datetime.now(datetime.timezone.utc),
    )
