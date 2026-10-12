from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.config import settings
from app.database import get_db
from app.models import User, SystemSetting
from app.auth import get_current_user
from app.schemas import FacultySettings, SettingsUpdate
from app.seed_data import seed_database

router = APIRouter(prefix="/settings", tags=["Settings"])

@router.get("", response_model=FacultySettings)
def get_settings(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Retrieve faculty preferences for the authenticated staff member.
    """
    db_settings = {
        s.key: s.value
        for s in db.query(SystemSetting).filter(SystemSetting.user_id == current_user.id).all()
    }

    return FacultySettings(
        faculty_name=db_settings.get("faculty_name", current_user.full_name),
        faculty_role=db_settings.get("faculty_role", current_user.role),
        faculty_email=db_settings.get("faculty_email", current_user.email),
        faculty_department=db_settings.get("faculty_department", current_user.department),
        office_hours_default=db_settings.get("office_hours_default", "Tuesday & Thursday 11:30 AM - 01:00 PM"),
        ai_tone_preference=db_settings.get("ai_tone_preference", "Warm, Academic, Professional"),
        dark_mode_default=db_settings.get("dark_mode_default", "true").lower() == "true",
        email_integration_status=db_settings.get("email_integration_status", "Isolated User Workspace (Phase 2 Gmail Ready)"),
        calendar_integration_status=db_settings.get("calendar_integration_status", "Isolated User Workspace (Phase 2 GCal Ready)"),
    )

@router.patch("", response_model=FacultySettings)
def update_settings(
    update_in: SettingsUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Update preferences for the current staff member.
    """
    update_data = update_in.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        val_str = str(value) if not isinstance(value, str) else value
        setting_obj = db.query(SystemSetting).filter(
            SystemSetting.user_id == current_user.id,
            SystemSetting.key == key
        ).first()

        if setting_obj:
            setting_obj.value = val_str
        else:
            db.add(SystemSetting(user_id=current_user.id, key=key, value=val_str))

    db.commit()
    return get_settings(current_user=current_user, db=db)

@router.post("/reset-demo")
def reset_demo_data(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Re-seed database with clean academic demonstration data for development/testing only.
    Strictly blocked in production environments to prevent data wiping.
    """
    if settings.ENVIRONMENT.lower() == "production":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Demo database reset is disabled in production environment.",
        )

    seed_database(db, force=True)
    return {"message": "Demo database successfully re-seeded with clean two-staff isolation data."}
