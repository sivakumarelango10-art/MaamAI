import datetime
from pydantic import BaseModel, ConfigDict, EmailStr, Field
from typing import Optional, List

# User and Authentication Schemas
class UserBase(BaseModel):
    email: str
    username: str
    full_name: str
    role: str
    department: str
    avatar_initials: str = "ST"

class UserRegister(UserBase):
    model_config = ConfigDict(extra="forbid")
    password: str = Field(..., min_length=8, description="Password must be at least 8 characters")

class UserLogin(BaseModel):
    model_config = ConfigDict(extra="forbid")
    username_or_email: str
    password: str

class UserResponse(UserBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    is_active: bool
    created_at: datetime.datetime

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse

class OAuthStatusResponse(BaseModel):
    is_connected: bool
    email_account: Optional[str] = None
    provider: str = "google"
    scopes: Optional[str] = None
    last_synced: Optional[datetime.datetime] = None
    demo_mode: bool = True

# Health Check Schema
class HealthCheckResponse(BaseModel):
    status: str
    app: str
    version: str
    database: str
    environment: str
    timestamp: datetime.datetime

# Briefing Schemas
class BriefingResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: int
    date: str
    greeting: str
    quote: Optional[str] = None
    summary: str
    key_focus: List[str]
    urgent_count: int
    meetings_count: int
    tasks_count: int
    generated_at: datetime.datetime

# Email Schemas
class EmailBase(BaseModel):
    sender_name: str
    sender_email: str
    subject: str
    snippet: str
    body: str
    category: str
    priority: str
    is_read: bool = False
    has_draft: bool = False
    received_at: str
    demo_label: str = "[Demo Data - Sample Faculty Inbox]"

class EmailCreate(EmailBase):
    model_config = ConfigDict(extra="forbid")

class EmailResponse(EmailBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: int

# AI Draft Schemas
class AIDraftBase(BaseModel):
    email_id: Optional[int] = None
    recipient: str
    subject: str
    body: str
    tone: str = "Professional & Encouraging"
    status: str = "pending_review"
    confidence_score: float = 0.94
    demo_label: str = "[Demo - AI Proposed Response]"

class AIDraftResponse(AIDraftBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: int
    created_at: datetime.datetime

class AIDraftUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")
    body: Optional[str] = None
    subject: Optional[str] = None
    status: Optional[str] = None
    tone: Optional[str] = None

# Calendar Schemas
class CalendarEventBase(BaseModel):
    title: str
    start_time: str
    end_time: str
    date_str: str
    location: str
    event_type: str
    attendee_count: int = 1
    notes: Optional[str] = None
    demo_label: str = "[Demo Data - Academic Schedule]"

class CalendarEventCreate(CalendarEventBase):
    model_config = ConfigDict(extra="forbid")

class CalendarEventResponse(CalendarEventBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: int

# Task Schemas
class TaskBase(BaseModel):
    title: str
    description: Optional[str] = None
    category: str = "Academic"
    due_date: str
    priority: str = "medium"
    status: str = "pending"
    demo_label: str = "[Demo Data - Faculty Checklist]"

class TaskCreate(TaskBase):
    model_config = ConfigDict(extra="forbid")

class TaskUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")
    title: Optional[str] = None
    description: Optional[str] = None
    category: Optional[str] = None
    due_date: Optional[str] = None
    priority: Optional[str] = None
    status: Optional[str] = None

class TaskResponse(TaskBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: int

# Activity Log Schema
class ActivityLogResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: int
    title: str
    description: str
    category: str
    timestamp: datetime.datetime

# Settings Schemas
class FacultySettings(BaseModel):
    faculty_name: str
    faculty_role: str
    faculty_email: str
    faculty_department: str
    office_hours_default: str
    ai_tone_preference: str
    dark_mode_default: bool
    email_integration_status: str
    calendar_integration_status: str

class SettingsUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")
    faculty_name: Optional[str] = None
    faculty_role: Optional[str] = None
    faculty_department: Optional[str] = None
    office_hours_default: Optional[str] = None
    ai_tone_preference: Optional[str] = None
    dark_mode_default: Optional[bool] = None
