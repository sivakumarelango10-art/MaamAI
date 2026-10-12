# MaamAI — Multi-User Academic AI Assistant

MaamAI is an executive faculty AI assistant built for university educators and researchers. Phase 2 upgrades MaamAI to a **secure cloud-ready architecture** with support for **Vercel Serverless Functions**, **Supabase PostgreSQL**, **Alembic database migrations**, and **authenticated Fernet encryption for OAuth tokens at rest**, all under a **strict ₹0 budget**.

---

## 👥 The Two Independent Staff Workspaces

Each staff member has their own independent workspace, email inbox, calendar schedule, AI review queue, and settings:

| Staff Member | Username | Email Account | Role & Department | Demo Password |
|---|---|---|---|---|
| **Dr. Aris Vance** | `aris_vance` | `aris.vance@university.edu` | Associate Professor, Computer Science | `Password123!` |
| **Dr. Priya Sharma** | `priya_sharma` | `priya.sharma@university.edu` | Assistant Professor, Machine Learning | `Password123!` |

> **Development Mode Note:** In development mode (`ENVIRONMENT=development`), the top-right header includes an interactive staff switcher to quickly verify multi-user isolation. In production (`ENVIRONMENT=production`), the switcher is disabled and staff members must authenticate with their individual credentials.

---

## 🛡️ Architecture & Security Model

### 1. Zero Trust Client Identity & Server-Side Enforcement
- The backend **never trusts a `user_id` supplied in request bodies or query parameters**.
- Every protected route enforces `current_user = Depends(get_current_user)` resolving identity exclusively from verified JWT headers.
- All request payload schemas enforce `extra = "forbid"`, rejecting any attempts to tamper with foreign keys or inject unknown parameters with `422 Unprocessable Entity`.

### 2. Comprehensive Database Ownership (PostgreSQL & SQLite)
Every user-specific database table includes a non-nullable foreign key column `user_id` referencing `users.id`:
- `briefings`, `emails`, `ai_drafts`, `calendar_events`, `tasks`, `activity_logs`, `system_settings`, `oauth_connections`, and `revoked_tokens`.
- Production schema is version-controlled via **Alembic** (`backend/alembic/versions/89fff8f59397_initial_schema_for_multi_user_.py`).

### 3. Authenticated OAuth Token Encryption at Rest
- Sensitive Google OAuth access tokens and refresh tokens are encrypted at rest using **Fernet (AES-128-CBC + HMAC-SHA256)**.
- Encryption key loaded via `OAUTH_TOKEN_ENCRYPTION_KEY` environment variable.
- In production, missing or weak keys immediately halt backend startup safely.
- Raw tokens and ciphertexts are completely redacted from API responses.

### 4. Cross-User Data Isolation & Anti-Enumeration
- Every read, create, update, and delete operation is explicitly scoped to `filter_by(user_id=current_user.id)`.
- If User A attempts to view, modify, or delete a record belonging to User B, the backend returns **`404 Not Found`** rather than `403 Forbidden`, preventing resource ID enumeration.

### 5. Server-Side Token Revocation & Logout
- Calling `POST /api/auth/logout` revokes the token's unique `jti` in the database (`revoked_tokens` table).
- Any subsequent request attempting to reuse a logged-out token is rejected with `401 Unauthorized`.

### 6. Rate Limiting & Defense-in-Depth
- Authentication endpoints enforce an in-memory sliding window rate limiter (max 5 failed attempts per minute), responding with `429 Too Many Requests`.
- Standard HTTP security headers (`nosniff`, `DENY`, `XSS`, `Referrer-Policy`, `Permissions-Policy`, `HSTS`) are injected into all responses.

---

## ☁️ Cloud Architecture & Vercel Deployment

```
[Staff Desktop & Mobile Browsers]
             │
             ▼ HTTPS
┌───────────────────────────────────────────┐
│ Vercel Edge Network                       │
│ ├── React 19 + Vite SPA (Static Frontend) │
│ └── Python Serverless Function (/api/*)   │ (api/index.py ASGI Adapter)
└────────────────────┬──────────────────────┘
                     │ Connection Pooler (Port 6543)
                     ▼
┌───────────────────────────────────────────┐
│ Supabase Managed PostgreSQL               │ (₹0 Free Tier: 500 MB Storage,
│ (Alembic Managed Schema, 10 Tables)       │  Transaction Pooler, SSL Required)
└───────────────────────────────────────────┘
```

Detailed guides:
- [Supabase Setup & Migration Guide](file:///F:/Agent/docs/SUPABASE_SETUP.md)
- [Deployment Architecture & Vercel Guide](file:///F:/Agent/docs/DEPLOYMENT_ARCHITECTURE.md)
- [Google OAuth Setup Guide](file:///F:/Agent/docs/GOOGLE_OAUTH_SETUP.md)
- [₹0 Zero-Cost Plan & AI Architecture](file:///F:/Agent/docs/ZERO_COST_PLAN.md)
- [Phase 2 Security Audit Report](file:///F:/Agent/docs/PHASE2_SECURITY_REPORT.md)

---

## 🧪 Automated Test Suite & Actual Verification

### Backend Security, Crypto & Isolation Tests (pytest)
All 28 backend tests pass:
```powershell
& "F:\Agent\backend\.venv\Scripts\pytest.exe" -v
```
**Results:** `28 passed in 3.58s` (100% Pass Rate).
- Auth & Session tests: `test_login_success`, `test_login_failure_wrong_password`, `test_login_rate_limiting`, `test_get_current_user_me`, `test_unauthenticated_request_rejected`, `test_expired_token_rejected`, `test_invalid_token_signature_rejected`, `test_logout_revokes_token_and_blocks_subsequent_access`, `test_password_complexity_policy_on_registration`, `test_staff_accounts_disabled_in_production`.
- Cryptographic tests: `test_fernet_key_generation_and_roundtrip`, `test_decrypt_invalid_ciphertext`, `test_decrypt_with_wrong_key`, `test_empty_or_none_token`, `test_oauth_model_encrypted_storage`, `test_production_fails_without_encryption_key`, `test_oauth_api_does_not_leak_tokens`.
- Isolation & Defense-in-depth tests: `test_health_check`, `test_cross_user_briefing_isolation`, `test_cross_user_email_isolation_and_unauthorized_read`, `test_cross_user_ai_draft_tampering_prevention`, `test_cross_user_task_tampering_prevention`, `test_payload_tampering_rejection`, `test_cross_user_calendar_isolation`, `test_cross_user_settings_and_oauth_isolation`, `test_demo_reset_disabled_in_production`, `test_security_headers_present_on_responses`, `test_unauthenticated_endpoints_reject_access`.

### Frontend Multi-User & Unit Tests (vitest)
All 6 frontend tests pass:
```powershell
cd F:\Agent\frontend
npm run test
```
**Results:** `6 passed in 19.10s` (100% Pass Rate).

### Production Frontend Build (Vite)
```powershell
cd F:\Agent\frontend
npm run build
```
**Results:**
- `dist/index.html` (1.01 kB)
- `dist/assets/index-C3W9s-sV.css` (37.87 kB)
- `dist/assets/index-DzQu-PGd.js` (319.15 kB)
Build time: 1.69s with zero errors and zero warnings.

---

## 🚀 Local Startup Instructions

### 1. Prerequisites
- Python 3.10+ (Installed at `F:\Agent\backend\.venv`)
- Node.js 18+ & npm

### 2. Start the FastAPI Backend
Open a PowerShell terminal:
```powershell
cd F:\Agent\backend
& ".\.venv\Scripts\Activate.ps1"
uvicorn app.main:app --reload --port 8000
```
- API Endpoint: `http://localhost:8000`
- Interactive Swagger docs: `http://localhost:8000/docs`

### 3. Start the React Frontend
Open a second PowerShell terminal:
```powershell
cd F:\Agent\frontend
npm run dev
```
The application will launch on: `http://localhost:5173`
