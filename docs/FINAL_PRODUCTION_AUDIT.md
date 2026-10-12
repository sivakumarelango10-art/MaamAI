# Ma’amAI — Final Production Codebase Audit (Phase 1)
**Audit Timestamp:** 2026-10-12T13:42:00+05:30  
**Repository:** `https://github.com/sivakumarelango10-art/MaamAI`  
**Workspace:** `F:\Agent`  
**Target URL:** `https://maamai.vercel.app`

---

## 1. Executive Baseline & Verification

An independent, rigorous audit of the entire codebase was conducted across frontend, backend, database migrations, security dependencies, and configuration.

### Actual Automated Test & Build Baseline
- **Backend Tests (pytest):** **28 passed, 0 failed** (22.47s runtime).
  - Test modules: `test_auth.py` (10 tests), `test_crypto.py` (8 tests), `test_health.py` (1 test), `test_isolation.py` (9 tests).
- **Frontend Tests (Vitest):** **6 passed, 0 failed** (107ms runtime).
  - Test module: `src/test/multi_user.test.tsx`.
- **Frontend Production Build (`vite build`):** **SUCCESS** (319.15 kB JS bundle, 37.87 kB CSS bundle).
- **Database Status:** Live Supabase PostgreSQL 17.11 (`aws-0-ap-southeast-1.pooler.supabase.com`), 11 tables verified, latency ~1.4s.

---

## 2. Identified Deficiencies & Critical Security Findings

### Defect 1: Authentication & Bypassed Login Screen
- **Issue:** `AuthContext.tsx` initializes `token` to `'demo_token_user_1'` and `currentUser` to hardcoded `DEFAULT_STAFF[0]` (`Dr. Aris Vance`).
- **Consequence:** The frontend never shows an unauthenticated login screen. Any visitor immediately lands inside a simulated account without authentication.
- **Requirement:** Remove demo tokens, fallback accounts, username/password forms, public registration, and staff switchers. Implement a dedicated, elegant **"Continue with Google"** authentication page that enforces the strict two-email allowlist:
  1. `sivakumarelango10@gmail.com`
  2. `avishka.s@kalvium.com`

### Defect 2: Simulated OAuth & Mock Data in Routers
- **Issue:**
  - `backend/app/routers/oauth.py` contains `/google/connect-preview` setting hardcoded mock tokens (`ya29.mock_...`).
  - `backend/app/routers/emails.py`, `calendar.py`, `drafts.py`, and `briefing.py` rely on local seeded demo data rather than live Google Workspace APIs.
  - `frontend/src/services/api.ts` contains fallback demo records for emails, calendar events, tasks, and briefings.
- **Requirement:** Implement real Google OAuth 2.0 authorization code flow with OIDC token verification, real Gmail message fetching, real Gmail draft creation (`POST /users/me/drafts`), and real Google Calendar event retrieval.

### Defect 3: Exposed Development Encryption Key
- **Issue:** `backend/app/config.py` contained a hardcoded default development Fernet key (`cKNExS5eKAKDtFx8KvadVCS_RMLC8N3r9_raEO27mdo=`), which was exposed in prior logs.
- **Requirement:** Invalidate and replace this exposed key immediately with a fresh, unlogged high-entropy key for local development, and require an external, secret environment variable in production.

### Defect 4: Database Schema Missing External Google Entity IDs
- **Issue:** Current Alembic schema (`89fff8f59397`) maps core fields but lacks columns for Google OIDC stable `sub` claim (`google_id`), Gmail message IDs (`google_message_id`), Gmail draft IDs (`google_draft_id`), and Calendar event IDs (`google_event_id`).
- **Requirement:** Generate a clean Alembic migration to add these indexing columns without destroying existing tables or data.

### Defect 5: UI Demo Badges & Reset Actions
- **Issue:** `DemoBanner.tsx` displays "Phase 2 Multi-User" / "Offline Demo Mode". `Header.tsx` displays "SQLite Demo" and a staff switcher dropdown. `SettingsView.tsx` exposes "Reset Demo Data".
- **Requirement:** Replace all demo indicators with truthful production status widgets (indicating live Google connection, database health, and AI readiness).

---

## 3. Production Architecture Plan

```
[Browser / User]
       │
       ▼ (HTTPS)
[Vercel Frontend / Vite SPA]
       │
       ├── /api/auth/google/login ──────────► [Google Accounts / OIDC Consent]
       │                                                 │
       │                                           (Auth Code)
       ▼                                                 ▼
[Vercel Serverless / FastAPI Backend] ◄───────────────────┘
       │  (1. Verify Google ID Token & Sub Claim)
       │  (2. Enforce Strict 2-Email Allowlist)
       │  (3. Issue HttpOnly/Bearer Session)
       │  (4. Encrypt Access/Refresh Tokens via Fernet)
       │
       ├──► [Supabase PostgreSQL (Port 6543 Transaction Pooler)]
       │      • users, oauth_connections, emails, drafts, calendar, tasks
       │
       ├──► [Google Gmail API v1] (Fetch Real Inbox, Create Real Drafts)
       │
       ├──► [Google Calendar API v3] (Fetch Real Events, Check Conflicts)
       │
       └──► [Optional AI / Deterministic Fallback] (Classification, Suggestions)
```

---

## 4. Phase-by-Phase Implementation Checklist

- [ ] **Phase 2 — Google-Only Login & Allowlist Enforcement**
  - [ ] Add `google_id` / `google_sub` column to `User` model.
  - [ ] Implement backend `/api/auth/google/login` and `/api/auth/google/callback`.
  - [ ] Verify ID token signature, issuer, audience, and email verification status.
  - [ ] Enforce strict allowlist (`sivakumarelango10@gmail.com`, `avishka.s@kalvium.com`).
  - [ ] Return 403 Forbidden with exact message for unauthorized accounts.
  - [ ] Remove username/password login, registration, and staff switch endpoints.
- [ ] **Phase 3 — Real Supabase PostgreSQL Data & Schema Migration**
  - [ ] Create Alembic migration `add_google_integration_fields`.
  - [ ] Enforce `validate_production_security` to reject SQLite in production.
  - [ ] Verify user ownership check on every query and mutation.
- [ ] **Phase 4 — Real Gmail Integration**
  - [ ] Build `GmailService` with narrow scopes (`gmail.readonly`, `gmail.compose`).
  - [ ] Fetch actual user inbox messages with pagination and error handling.
  - [ ] Implement real Gmail draft creation via `POST https://gmail.googleapis.com/upload/gmail/v1/users/me/drafts`.
  - [ ] Strictly ensure NO automatic email sending.
- [ ] **Phase 5 — Real Google Calendar Integration**
  - [ ] Build `CalendarService` with narrow scopes (`calendar.readonly`, `calendar.events`).
  - [ ] Fetch real user calendar events with timezone normalization.
  - [ ] Derive actual schedule conflicts and upcoming events.
  - [ ] Enforce preview and user confirmation before any calendar modification.
- [ ] **Phase 6 — Secure OAuth Token Storage**
  - [ ] Replace exposed dev Fernet key.
  - [ ] Encrypt tokens at rest in `oauth_connections`.
  - [ ] Implement token refresh and disconnect/revocation logic.
- [ ] **Phase 7 — Real Tasks & Truthful Daily Briefing**
  - [ ] Derive briefing metrics strictly from live connected data and persistent tasks.
  - [ ] Provide truthful empty states when disconnected or empty.
- [ ] **Phase 8 — Zero-Rupee AI Provider & Deterministic Fallback**
  - [ ] Implement deterministic rule-based classifiers and draft generators.
  - [ ] Support optional free Gemini API key when provided; never fabricate AI claims.
- [ ] **Phase 9 — Production Frontend UI/UX**
  - [ ] Build pristine "Continue with Google" login screen.
  - [ ] Remove `DemoBanner`, "SQLite Demo" badges, and staff switcher.
  - [ ] Display genuine connection status for Google, Database, and AI.
- [ ] **Phase 10 & 11 — Vercel Production Architecture & Environment Audit**
  - [ ] Verify routing, CORS, and single root `.env` / `.env.example`.
- [ ] **Phase 12 — Google Cloud Console Setup Documentation**
  - [ ] Create `docs/GOOGLE_OAUTH_SETUP.md`.
- [ ] **Phase 13 & 14 — End-to-End Testing & Verification**
  - [ ] Expand pytest and Vitest suites for allowlist, isolation, and integrations.
  - [ ] Create `docs/FINAL_PRODUCTION_VERIFICATION.md`.
