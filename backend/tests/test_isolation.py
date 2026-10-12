from app.config import settings

def test_cross_user_briefing_isolation(client, auth_headers_user1, auth_headers_user2):
    # User 1 (Dr. Vance) gets Dr. Vance's briefing
    resp1 = client.get("/api/briefing", headers=auth_headers_user1)
    assert resp1.status_code == 200
    assert "Dr. Vance" in resp1.json()["greeting"]

    # User 2 (Dr. Sharma) gets Dr. Sharma's briefing
    resp2 = client.get("/api/briefing", headers=auth_headers_user2)
    assert resp2.status_code == 200
    assert "Dr. Sharma" in resp2.json()["greeting"]

def test_cross_user_email_isolation_and_unauthorized_read(client, auth_headers_user1, auth_headers_user2):
    # User 1 gets User 1's emails
    resp1 = client.get("/api/emails", headers=auth_headers_user1)
    assert resp1.status_code == 200
    emails_user1 = resp1.json()
    assert len(emails_user1) >= 1
    user1_email_id = emails_user1[0]["id"]
    assert any("Sarah Chen" in e["sender_name"] for e in emails_user1)

    # User 2 gets User 2's emails
    resp2 = client.get("/api/emails", headers=auth_headers_user2)
    assert resp2.status_code == 200
    emails_user2 = resp2.json()
    assert len(emails_user2) >= 1
    # User 2 must NOT see Sarah Chen
    assert not any("Sarah Chen" in e["sender_name"] for e in emails_user2)
    assert any("Rohan Patel" in e["sender_name"] for e in emails_user2)

    # CRITICAL: User 2 attempts to read User 1's email directly by ID -> MUST return 404
    resp_cross_read = client.get(f"/api/emails/{user1_email_id}", headers=auth_headers_user2)
    assert resp_cross_read.status_code == 404

    # CRITICAL: User 2 attempts to toggle read on User 1's email -> MUST return 404
    resp_cross_toggle = client.patch(f"/api/emails/{user1_email_id}/toggle-read", headers=auth_headers_user2)
    assert resp_cross_toggle.status_code == 404

    # CRITICAL: User 2 attempts to generate draft for User 1's email -> MUST return 404
    resp_cross_draft = client.post(f"/api/emails/{user1_email_id}/generate-draft", headers=auth_headers_user2)
    assert resp_cross_draft.status_code == 404

def test_cross_user_ai_draft_tampering_prevention(client, auth_headers_user1, auth_headers_user2):
    # Fetch User 1's drafts
    drafts_user1 = client.get("/api/ai-drafts", headers=auth_headers_user1).json()
    assert len(drafts_user1) >= 1
    user1_draft_id = drafts_user1[0]["id"]

    # User 2 attempts to view User 1's draft -> 404
    assert client.get(f"/api/ai-drafts/{user1_draft_id}", headers=auth_headers_user2).status_code == 404

    # User 2 attempts to approve User 1's draft -> 404
    resp_approve = client.post(f"/api/ai-drafts/{user1_draft_id}/approve", headers=auth_headers_user2)
    assert resp_approve.status_code == 404

    # User 2 attempts to edit User 1's draft -> 404
    resp_edit = client.patch(
        f"/api/ai-drafts/{user1_draft_id}",
        json={"body": "Hacked content"},
        headers=auth_headers_user2
    )
    assert resp_edit.status_code == 404

def test_cross_user_task_tampering_prevention(client, auth_headers_user1, auth_headers_user2):
    # User 1 creates a new private task
    create_resp = client.post(
        "/api/tasks",
        json={
            "title": "Private Exam Grading for Dr. Vance",
            "due_date": "Tomorrow",
            "priority": "high",
            "category": "Academic"
        },
        headers=auth_headers_user1
    )
    assert create_resp.status_code == 200
    user1_task_id = create_resp.json()["id"]

    # User 2 listing tasks must NOT see Dr. Vance's new task
    user2_tasks = client.get("/api/tasks", headers=auth_headers_user2).json()
    assert not any(t["id"] == user1_task_id for t in user2_tasks)

    # User 2 attempts to update User 1's task status -> 404
    resp_update = client.patch(
        f"/api/tasks/{user1_task_id}",
        json={"status": "completed"},
        headers=auth_headers_user2
    )
    assert resp_update.status_code == 404

    # User 2 attempts to delete User 1's task -> 404
    resp_delete = client.delete(f"/api/tasks/{user1_task_id}", headers=auth_headers_user2)
    assert resp_delete.status_code == 404

    # User 1 can successfully update their own task
    resp_owner_update = client.patch(
        f"/api/tasks/{user1_task_id}",
        json={"status": "completed"},
        headers=auth_headers_user1
    )
    assert resp_owner_update.status_code == 200
    assert resp_owner_update.json()["status"] == "completed"

def test_payload_tampering_rejection(client, auth_headers_user1):
    # Attempting to supply unallowed fields (like user_id or id) in task creation MUST fail with 422
    tampered_task_resp = client.post(
        "/api/tasks",
        json={
            "title": "Malicious task",
            "due_date": "Tomorrow",
            "priority": "low",
            "category": "Academic",
            "user_id": 999  # Attempted payload injection
        },
        headers=auth_headers_user1
    )
    assert tampered_task_resp.status_code == 422
    assert "extra_forbidden" in str(tampered_task_resp.json())

    # Attempting payload tampering on calendar creation
    tampered_cal_resp = client.post(
        "/api/calendar",
        json={
            "title": "Malicious event",
            "start_time": "10:00 AM",
            "end_time": "11:00 AM",
            "date_str": "Today",
            "location": "Room 101",
            "event_type": "meeting",
            "user_id": 999  # Attempted payload injection
        },
        headers=auth_headers_user1
    )
    assert tampered_cal_resp.status_code == 422
    assert "extra_forbidden" in str(tampered_cal_resp.json())

def test_cross_user_calendar_isolation(client, auth_headers_user1, auth_headers_user2):
    # User 1 calendar events
    events_user1 = client.get("/api/calendar", headers=auth_headers_user1).json()
    assert any("CS 4400" in e["title"] for e in events_user1)
    user1_event_id = events_user1[0]["id"]

    # User 2 calendar events
    events_user2 = client.get("/api/calendar", headers=auth_headers_user2).json()
    assert not any("CS 4400" in e["title"] for e in events_user2)
    assert any("DS 3100" in e["title"] for e in events_user2)

    # User 2 attempts to delete User 1's calendar event -> 404
    resp_del_cal = client.delete(f"/api/calendar/{user1_event_id}", headers=auth_headers_user2)
    assert resp_del_cal.status_code == 404

def test_cross_user_settings_and_oauth_isolation(client, auth_headers_user1, auth_headers_user2):
    # User 1 settings
    sett1 = client.get("/api/settings", headers=auth_headers_user1).json()
    assert sett1["faculty_name"] == "Dr. Aris Vance"

    # User 2 settings
    sett2 = client.get("/api/settings", headers=auth_headers_user2).json()
    assert sett2["faculty_name"] == "Dr. Priya Sharma"

    # OAuth status isolation
    oauth1 = client.get("/api/oauth/google/status", headers=auth_headers_user1).json()
    oauth2 = client.get("/api/oauth/google/status", headers=auth_headers_user2).json()
    assert oauth1["email_account"] == "aris.vance@university.edu"
    assert oauth2["email_account"] == "priya.sharma@university.edu"

    # User 1 disconnects OAuth -> User 2's OAuth state remains independent
    client.post("/api/oauth/google/disconnect", headers=auth_headers_user1)
    oauth1_after = client.get("/api/oauth/google/status", headers=auth_headers_user1).json()
    assert oauth1_after["is_connected"] is False

    oauth2_after = client.get("/api/oauth/google/status", headers=auth_headers_user2).json()
    assert oauth2_after["email_account"] == "priya.sharma@university.edu"

def test_demo_reset_disabled_in_production(client, auth_headers_user1):
    orig_env = settings.ENVIRONMENT
    try:
        settings.ENVIRONMENT = "production"
        resp = client.post("/api/settings/reset-demo", headers=auth_headers_user1)
        assert resp.status_code == 403
        assert "disabled in production" in resp.json()["detail"]
    finally:
        settings.ENVIRONMENT = orig_env

def test_security_headers_present_on_responses(client):
    resp = client.get("/api/health")
    assert resp.status_code == 200
    assert resp.headers.get("X-Content-Type-Options") == "nosniff"
    assert resp.headers.get("X-Frame-Options") == "DENY"
    assert resp.headers.get("Referrer-Policy") == "strict-origin-when-cross-origin"
    assert "geolocation=()" in resp.headers.get("Permissions-Policy")

def test_unauthenticated_endpoints_reject_access(client):
    get_endpoints = [
        "/api/briefing",
        "/api/emails",
        "/api/ai-drafts",
        "/api/calendar",
        "/api/tasks",
        "/api/activity",
        "/api/settings",
        "/api/oauth/google/status",
    ]
    for ep in get_endpoints:
        resp = client.get(ep)
        assert resp.status_code == 401, f"Expected 401 for unauthenticated request to {ep}, got {resp.status_code}"

    # POST endpoint unauthenticated access rejection
    resp_post = client.post("/api/settings/reset-demo")
    assert resp_post.status_code == 401, f"Expected 401 for unauthenticated reset-demo, got {resp_post.status_code}"
