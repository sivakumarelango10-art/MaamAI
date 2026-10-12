import datetime
from sqlalchemy import Column, Integer, String, Boolean, Text, DateTime, ForeignKey, Float
from sqlalchemy.orm import relationship
from app.database import Base

def utc_now():
    return datetime.datetime.now(datetime.timezone.utc)

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    username = Column(String(100), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=True)
    google_id = Column(String(255), unique=True, index=True, nullable=True)
    picture_url = Column(String(500), nullable=True)
    full_name = Column(String(255), nullable=False)
    role = Column(String(255), nullable=False)
    department = Column(String(255), nullable=False)
    avatar_initials = Column(String(10), default="ST")
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=utc_now)

    briefings = relationship("Briefing", back_populates="user", cascade="all, delete-orphan")
    emails = relationship("Email", back_populates="user", cascade="all, delete-orphan")
    ai_drafts = relationship("AIDraft", back_populates="user", cascade="all, delete-orphan")
    calendar_events = relationship("CalendarEvent", back_populates="user", cascade="all, delete-orphan")
    tasks = relationship("Task", back_populates="user", cascade="all, delete-orphan")
    activity_logs = relationship("ActivityLog", back_populates="user", cascade="all, delete-orphan")
    oauth_connections = relationship("OAuthConnection", back_populates="user", cascade="all, delete-orphan")
    settings = relationship("SystemSetting", back_populates="user", cascade="all, delete-orphan")

class OAuthConnection(Base):
    __tablename__ = "oauth_connections"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    provider = Column(String(50), default="google")
    email_account = Column(String(255), nullable=False)
    access_token = Column(Text, nullable=True)
    refresh_token = Column(Text, nullable=True)
    token_expiry = Column(DateTime, nullable=True)
    scopes = Column(String(500), default="https://www.googleapis.com/auth/gmail.readonly https://www.googleapis.com/auth/calendar")
    is_connected = Column(Boolean, default=False)
    created_at = Column(DateTime, default=utc_now)
    updated_at = Column(DateTime, default=utc_now, onupdate=utc_now)

    user = relationship("User", back_populates="oauth_connections")

    def set_tokens(self, access_token: str | None, refresh_token: str | None = None, key: str | None = None) -> None:
        """Store OAuth tokens encrypted at rest using Fernet authenticated encryption."""
        from app.crypto import encrypt_token
        self.access_token = encrypt_token(access_token, key=key) if access_token else None
        self.refresh_token = encrypt_token(refresh_token, key=key) if refresh_token else None

    def get_decrypted_tokens(self, key: str | None = None) -> tuple[str | None, str | None]:
        """Retrieve decrypted plaintext tokens in-memory without persisting plaintext."""
        from app.crypto import decrypt_token
        dec_access = decrypt_token(self.access_token, key=key) if self.access_token else None
        dec_refresh = decrypt_token(self.refresh_token, key=key) if self.refresh_token else None
        return dec_access, dec_refresh

class Briefing(Base):
    __tablename__ = "briefings"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    date = Column(String(50), nullable=False)
    greeting = Column(String(255), nullable=False)
    quote = Column(String(500), nullable=True)
    summary = Column(Text, nullable=False)
    key_focus = Column(Text, nullable=False)
    urgent_count = Column(Integer, default=0)
    meetings_count = Column(Integer, default=0)
    tasks_count = Column(Integer, default=0)
    generated_at = Column(DateTime, default=utc_now)

    user = relationship("User", back_populates="briefings")

class Email(Base):
    __tablename__ = "emails"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    sender_name = Column(String(255), nullable=False)
    sender_email = Column(String(255), nullable=False)
    subject = Column(String(500), nullable=False)
    snippet = Column(Text, nullable=False)
    body = Column(Text, nullable=False)
    category = Column(String(50), default="Student Inquiries")
    priority = Column(String(20), default="medium")
    is_read = Column(Boolean, default=False)
    has_draft = Column(Boolean, default=False)
    received_at = Column(String(50), nullable=False)
    google_message_id = Column(String(255), index=True, nullable=True)
    thread_id = Column(String(255), index=True, nullable=True)
    demo_label = Column(String(100), default="[Demo Data - Sample Faculty Inbox]")

    user = relationship("User", back_populates="emails")
    drafts = relationship("AIDraft", back_populates="email", cascade="all, delete-orphan")

class AIDraft(Base):
    __tablename__ = "ai_drafts"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    email_id = Column(Integer, ForeignKey("emails.id", ondelete="CASCADE"), nullable=True)
    recipient = Column(String(255), nullable=False)
    subject = Column(String(500), nullable=False)
    body = Column(Text, nullable=False)
    tone = Column(String(50), default="Professional & Encouraging")
    status = Column(String(30), default="pending_review")
    confidence_score = Column(Float, default=0.94)
    google_draft_id = Column(String(255), index=True, nullable=True)
    created_at = Column(DateTime, default=utc_now)
    demo_label = Column(String(100), default="[Demo - AI Proposed Response]")

    user = relationship("User", back_populates="ai_drafts")
    email = relationship("Email", back_populates="drafts")

class CalendarEvent(Base):
    __tablename__ = "calendar_events"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    title = Column(String(255), nullable=False)
    start_time = Column(String(50), nullable=False)
    end_time = Column(String(50), nullable=False)
    date_str = Column(String(50), nullable=False)
    location = Column(String(255), default="Turing Hall 312")
    event_type = Column(String(50), default="lecture")
    attendee_count = Column(Integer, default=1)
    notes = Column(Text, nullable=True)
    google_event_id = Column(String(255), index=True, nullable=True)
    demo_label = Column(String(100), default="[Demo Data - Academic Schedule]")

    user = relationship("User", back_populates="calendar_events")

class Task(Base):
    __tablename__ = "tasks"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    category = Column(String(50), default="Academic")
    due_date = Column(String(50), nullable=False)
    priority = Column(String(20), default="medium")
    status = Column(String(30), default="pending")
    demo_label = Column(String(100), default="[Demo Data - Faculty Checklist]")

    user = relationship("User", back_populates="tasks")

class ActivityLog(Base):
    __tablename__ = "activity_logs"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=False)
    category = Column(String(50), default="system")
    timestamp = Column(DateTime, default=utc_now)

    user = relationship("User", back_populates="activity_logs")

class SystemSetting(Base):
    __tablename__ = "system_settings"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    key = Column(String(100), nullable=False)
    value = Column(Text, nullable=False)

    user = relationship("User", back_populates="settings")

class RevokedToken(Base):
    __tablename__ = "revoked_tokens"

    id = Column(Integer, primary_key=True, index=True)
    token_jti = Column(String(255), unique=True, index=True, nullable=False)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=True, index=True)
    revoked_at = Column(DateTime, default=utc_now)
    expires_at = Column(DateTime, nullable=False)
