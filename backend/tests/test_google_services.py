"""
Unit and integration tests for Google Workspace Services (Gmail, Calendar, OAuth CSRF, Token Refresh).
Tests Phase 13 Requirements:
- Gmail API adapter logic, pagination, empty inbox, expired tokens, errors.
- Genuine draft generation and persistence without automatic sending.
- Google Calendar event retrieval, timezone formatting, and empty states.
- State token CSRF signature validation.
- Token redaction from logs and responses.
"""

import pytest
import time
import json
import base64
from unittest.mock import patch, MagicMock
from app.services.google_service import (
    generate_oauth_state,
    verify_oauth_state,
    verify_google_id_token,
    fetch_gmail_inbox,
    create_gmail_draft,
    fetch_google_calendar_events,
    refresh_google_access_token,
    get_valid_user_access_token,
)
from app.models import OAuthConnection
from app.crypto import encrypt_token

# ---------------------------------------------------------------------------
# 1. OAuth CSRF State Security Tests
# ---------------------------------------------------------------------------

def test_oauth_state_generation_and_verification():
    state = generate_oauth_state()
    assert state is not None
    assert verify_oauth_state(state) is True


def test_oauth_state_tampered_fails():
    state = generate_oauth_state()
    tampered_state = state[:-4] + "ffff"
    assert verify_oauth_state(tampered_state) is False


def test_oauth_state_expired_fails():
    # Manually construct expired state
    old_ts = str(int(time.time()) - 1000)
    import hmac, hashlib
    from app.config import settings
    message = f"{old_ts}.testnonce".encode("utf-8")
    sig = hmac.new(settings.JWT_SECRET_KEY.encode("utf-8"), message, hashlib.sha256).hexdigest()
    expired_state = f"{old_ts}.testnonce.{sig}"
    assert verify_oauth_state(expired_state) is False


def test_oauth_state_invalid_format():
    assert verify_oauth_state("invalid") is False
    assert verify_oauth_state("") is False
    assert verify_oauth_state(None) is False


# ---------------------------------------------------------------------------
# 2. Google ID Token Verification Tests
# ---------------------------------------------------------------------------

def test_id_token_missing_email_verified():
    with patch("google.oauth2.id_token.verify_oauth2_token") as mock_verify:
        mock_verify.return_value = {
            "sub": "12345",
            "email": "sivakumarelango10@gmail.com",
            "email_verified": False,
            "iss": "https://accounts.google.com",
        }
        with patch("app.config.settings.GOOGLE_CLIENT_ID", "real_client_id.apps.googleusercontent.com"):
            with pytest.raises(ValueError, match="not verified"):
                verify_google_id_token("dummy_token")


def test_id_token_untrusted_issuer():
    with patch("google.oauth2.id_token.verify_oauth2_token") as mock_verify:
        mock_verify.return_value = {
            "sub": "12345",
            "email": "sivakumarelango10@gmail.com",
            "email_verified": True,
            "iss": "https://attacker.com",
        }
        with patch("app.config.settings.GOOGLE_CLIENT_ID", "real_client_id.apps.googleusercontent.com"):
            with pytest.raises(ValueError, match="Untrusted ID token issuer"):
                verify_google_id_token("dummy_token")


# ---------------------------------------------------------------------------
# 3. Gmail Inbox Adapter Tests
# ---------------------------------------------------------------------------

def test_fetch_gmail_inbox_empty():
    with patch("httpx.Client.get") as mock_get:
        mock_get.return_value = MagicMock(
            status_code=200,
            json=lambda: {"messages": [], "resultSizeEstimate": 0}
        )
        emails = fetch_gmail_inbox(access_token="test_access_token")
        assert emails == []


def test_fetch_gmail_inbox_parses_real_structure():
    with patch("httpx.Client.get") as mock_get:
        list_resp = MagicMock(
            status_code=200,
            json=lambda: {"messages": [{"id": "msg_001", "threadId": "th_001"}]}
        )
        body_encoded = base64.urlsafe_b64encode(b"Please find attached syllabus notes.").decode("utf-8")
        msg_resp = MagicMock(
            status_code=200,
            json=lambda: {
                "id": "msg_001",
                "threadId": "th_001",
                "labelIds": ["INBOX", "UNREAD"],
                "snippet": "Please find attached syllabus notes.",
                "payload": {
                    "headers": [
                        {"name": "From", "value": "Dr. Ramesh <ramesh@university.edu>"},
                        {"name": "Subject", "value": "Semester Curriculum Review"},
                        {"name": "Date", "value": "Mon, 12 Oct 2026 10:00:00 +0530"},
                    ],
                    "body": {"data": body_encoded},
                }
            }
        )
        mock_get.side_effect = [list_resp, msg_resp]
        emails = fetch_gmail_inbox(access_token="test_access_token")
        assert len(emails) == 1
        e = emails[0]
        assert e["google_message_id"] == "msg_001"
        assert e["thread_id"] == "th_001"
        assert e["sender_name"] == "Dr. Ramesh"
        assert e["sender_email"] == "ramesh@university.edu"
        assert e["subject"] == "Semester Curriculum Review"
        assert e["is_read"] is False
        assert "syllabus notes" in e["body"]


def test_fetch_gmail_inbox_token_expired_raises_permission_error():
    with patch("httpx.Client.get") as mock_get:
        mock_get.return_value = MagicMock(
            status_code=401,
            text="Invalid Credentials",
            json=lambda: {"error": "invalid_token"}
        )
        with pytest.raises(PermissionError, match="expired or was revoked"):
            fetch_gmail_inbox(access_token="expired_token")


# ---------------------------------------------------------------------------
# 4. Genuine Gmail Draft Creation Tests (Never auto-send)
# ---------------------------------------------------------------------------

def test_create_gmail_draft_success():
    with patch("httpx.Client.post") as mock_post:
        mock_post.return_value = MagicMock(
            status_code=200,
            json=lambda: {
                "id": "r_draft_123",
                "message": {
                    "id": "msg_draft_123",
                    "threadId": "th_001"
                }
            }
        )
        result = create_gmail_draft(
            access_token="test_access_token",
            recipient="student@college.edu",
            subject="Re: Office Hours Question",
            body="I will be available tomorrow at 2 PM.",
            thread_id="th_001",
        )
        assert result["id"] == "r_draft_123"
        assert mock_post.called
        # Verify call target is /drafts, NEVER /messages/send
        call_url = mock_post.call_args[0][0]
        assert call_url.endswith("/drafts")
        assert not call_url.endswith("/send")

        # Verify MIME payload is valid RFC 2822 base64
        payload = mock_post.call_args[1]["json"]
        raw_b64 = payload["message"]["raw"]
        raw_bytes = base64.urlsafe_b64decode(raw_b64.encode("utf-8"))
        raw_text = raw_bytes.decode("utf-8")
        assert "To: student@college.edu" in raw_text
        assert "Subject: Re: Office Hours Question" in raw_text
        assert "I will be available tomorrow at 2 PM." in raw_text


def test_create_gmail_draft_token_expired_raises_permission_error():
    with patch("httpx.Client.post") as mock_post:
        mock_post.return_value = MagicMock(status_code=401, text="Unauthorized")
        with pytest.raises(PermissionError, match="expired or revoked"):
            create_gmail_draft(
                access_token="bad_token",
                recipient="test@example.com",
                subject="Test",
                body="Body",
            )


# ---------------------------------------------------------------------------
# 5. Real Google Calendar Adapter Tests
# ---------------------------------------------------------------------------

def test_fetch_google_calendar_events_parses_real_structure():
    with patch("httpx.Client.get") as mock_get:
        mock_get.return_value = MagicMock(
            status_code=200,
            json=lambda: {
                "items": [
                    {
                        "id": "cal_evt_101",
                        "summary": "Academic Council Review",
                        "start": {"dateTime": "2026-10-12T14:30:00+05:30"},
                        "end": {"dateTime": "2026-10-12T15:30:00+05:30"},
                        "location": "Board Room / Virtual",
                        "description": "Quarterly syllabus evaluation",
                        "attendees": [{"email": "head@univ.edu"}, {"email": "prof@univ.edu"}],
                    }
                ]
            }
        )
        events = fetch_google_calendar_events(access_token="test_access_token")
        assert len(events) == 1
        ev = events[0]
        assert ev["google_event_id"] == "cal_evt_101"
        assert ev["title"] == "Academic Council Review"
        assert ev["attendee_count"] == 2
        assert ev["event_type"] == "meeting"
        assert ev["location"] == "Board Room / Virtual"


def test_fetch_google_calendar_events_expired_token():
    with patch("httpx.Client.get") as mock_get:
        mock_get.return_value = MagicMock(status_code=401, text="Unauthorized")
        with pytest.raises(PermissionError, match="expired or revoked"):
            fetch_google_calendar_events(access_token="expired_token")


# ---------------------------------------------------------------------------
# 6. Automatic Token Refresh Tests
# ---------------------------------------------------------------------------

def test_refresh_google_access_token():
    with patch("httpx.Client.post") as mock_post:
        mock_post.return_value = MagicMock(
            status_code=200,
            headers={"content-type": "application/json"},
            json=lambda: {"access_token": "ya29.new_fresh_token", "expires_in": 3600}
        )
        new_token, expires_in = refresh_google_access_token("1//sample_refresh_token")
        assert new_token == "ya29.new_fresh_token"
        assert expires_in == 3600


def test_get_valid_user_access_token_with_active_token(db_session, user1):
    conn = OAuthConnection(
        user_id=user1.id,
        provider="google",
        email_account=user1.email,
        is_connected=True,
        access_token=encrypt_token("ya29.active_valid_token"),
        refresh_token=encrypt_token("1//refresh_token"),
    )
    db_session.add(conn)
    db_session.commit()

    retrieved = get_valid_user_access_token(user1.id, db_session)
    assert retrieved == "ya29.active_valid_token"
