from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from typing import List
from app.config import settings
from app.database import get_db
from app.models import User, Briefing, ActivityLog
from app.schemas import UserRegister, UserLogin, UserResponse, TokenResponse
from app.auth import (
    hash_password,
    verify_password,
    create_access_token,
    get_current_user,
    security,
    revoke_token,
    check_login_rate_limit,
    record_login_failure,
    clear_login_failures,
    validate_password_strength,
)

router = APIRouter(prefix="/auth", tags=["Authentication"])

@router.post("/register", response_model=TokenResponse)
def register(user_in: UserRegister, db: Session = Depends(get_db)):
    """Register a new staff member with password complexity validation and an isolated workspace."""
    # Enforce password strength
    validate_password_strength(user_in.password)

    # Check if email or username exists
    if db.query(User).filter(User.email == user_in.email).first():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A staff member with this university email is already registered."
        )
    if db.query(User).filter(User.username == user_in.username).first():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This username is already taken."
        )

    new_user = User(
        email=user_in.email,
        username=user_in.username,
        hashed_password=hash_password(user_in.password),
        full_name=user_in.full_name,
        role=user_in.role,
        department=user_in.department,
        avatar_initials=user_in.avatar_initials or user_in.full_name[:2].upper(),
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    # Initialize empty workspace defaults for new user
    briefing = Briefing(
        user_id=new_user.id,
        date="Today",
        greeting=f"Welcome, {new_user.full_name}",
        quote="“The journey of a thousand miles begins with a single step.”",
        summary="Your workspace has been successfully initialized. Welcome to MaamAI.",
        key_focus="Review system settings; Configure academic office hours; Review demonstration inbox",
        urgent_count=0,
        meetings_count=0,
        tasks_count=0,
    )
    db.add(briefing)

    # Add initial activity log
    log = ActivityLog(
        user_id=new_user.id,
        title="Workspace Created",
        description=f"Isolated staff workspace initialized for {new_user.full_name}.",
        category="auth",
    )
    db.add(log)
    db.commit()

    token = create_access_token(user_id=new_user.id, username=new_user.username)
    return TokenResponse(access_token=token, user=UserResponse.model_validate(new_user))

@router.post("/login", response_model=TokenResponse)
def login(login_data: UserLogin, db: Session = Depends(get_db)):
    """Authenticate staff member, enforce rate limits, and return signed JWT session token."""
    identifier = login_data.username_or_email.strip().lower()

    # Rate limiting check
    check_login_rate_limit(identifier)

    user = (
        db.query(User)
        .filter((User.email.ilike(identifier)) | (User.username.ilike(identifier)))
        .first()
    )

    if not user or not verify_password(login_data.password, user.hashed_password):
        record_login_failure(identifier)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid staff username/email or password.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not user.is_active:
        record_login_failure(identifier)
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Staff account is deactivated.",
        )

    # Successful login: clear failures
    clear_login_failures(identifier)

    token = create_access_token(user_id=user.id, username=user.username)
    return TokenResponse(access_token=token, user=UserResponse.model_validate(user))

@router.post("/logout")
def logout(
    current_user: User = Depends(get_current_user),
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db),
):
    """
    Log out staff member and immediately revoke the active JWT session on the server.
    Subsequent requests with this token will be rejected with 401 Unauthorized.
    """
    if credentials and credentials.credentials:
        revoke_token(credentials.credentials, db=db, user_id=current_user.id)

    log = ActivityLog(
        user_id=current_user.id,
        title="Staff Logged Out",
        description="Session token revoked from server.",
        category="auth",
    )
    db.add(log)
    db.commit()

    return {"message": "Logged out successfully. Session token revoked."}

@router.get("/me", response_model=UserResponse)
def get_current_user_profile(current_user: User = Depends(get_current_user)):
    """Retrieve current authenticated staff profile."""
    return UserResponse.model_validate(current_user)

@router.get("/staff-accounts", response_model=List[UserResponse])
def list_staff_accounts(db: Session = Depends(get_db)):
    """
    Returns available staff members for quick switching in development/demo mode only.
    Strictly blocked in production environments to prevent user enumeration.
    """
    if settings.ENVIRONMENT.lower() == "production":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Staff account directory is disabled in production environment.",
        )

    users = db.query(User).filter(User.is_active == True).all()
    return [UserResponse.model_validate(u) for u in users]
