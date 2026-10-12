# MaamAI Phase 2 — System Baseline & Cloud Architecture Strategy

**Document Status:** Baseline Complete  
**Date:** Current Evaluation  
**Project Root:** `F:\Agent`  

---

## 1. Executive Summary & Current State

MaamAI is an executive academic AI assistant designed for university faculty members. The system was originally implemented as a Phase 1 local prototype with a React + Vite frontend and a Python FastAPI backend running against a local SQLite database (`maamai.db`).

Prior security hardening established multi-user row-level segregation, server-side JWT verification, password complexity enforcement, token revocation, and anti-enumeration behavior. This document records the empirical baseline of the application before commencing the Supabase PostgreSQL migration and Vercel cloud deployment.

---

## 2. Empirical Test & Build Verification Baseline

Before performing any architectural modifications, the test suites and build pipelines were executed against the active repository state:

### Backend Test Results (pytest)
- **Command:** `& "F:\Agent\backend\.venv\Scripts\pytest.exe" -v`
- **Total Tests Collected:** 21
- **Passed:** 21 (100% pass rate)
- **Execution Time:** 2.13s
- **Coverage Areas:**
  - `test_auth.py`: Login success, wrong password rejection, sliding-window rate limiting, current user retrieval, unauthenticated 401 rejections, expired token rejection, tampered signature rejection, server-side logout revocation, password complexity enforcement, and production-mode staff account directory lock.
  - `test_health.py`: System health check endpoint.
  - `test_isolation.py`: Cross-user briefing isolation, cross-user email reading/toggling/draft generation prevention, cross-user AI draft tampering/approval prevention, cross-user task modification/deletion prevention, strict payload tampering rejection (`extra = "forbid"`), calendar event isolation, settings & OAuth connection isolation, production-mode demo reset lock, defense-in-depth security headers, and unauthenticated endpoint rejection.

### Frontend Test Results (vitest)
- **Command:** `cd F:\Agent\frontend && npx vitest run`
- **Total Tests Collected:** 6
- **Passed:** 6 (100% pass rate)
- **Execution Time:** 1.89s
- **Coverage Areas:** Initial staff workspace initialization, staff account switching, session and token cleanup on logout, Authorization header injection, Header rendering, and UI Card/Badge variants.

### Frontend Production Build Baseline (Vite)
- **Command:** `cd F:\Agent\frontend && npm run build`
- **Build Status:** Succeeded (0 errors), but identified a critical styling issue:
  - **Identified Defect:** Build log emitted `[lightningcss minify] Unknown at rule: @tailwind`. The built CSS bundle was only 870 bytes because `postcss.config.js` and `tailwind.config.js` were missing from the frontend root. Consequently, Tailwind CSS classes were not being expanded into utility rules. This will be remediated in Stage F.

---

## 3. Existing Architecture & Identified Limitations

### A. Database Layer
1. **SQLite Coupling:** Database initialization in `backend/app/database.py` relies on `sqlite:///./maamai.db` and SQLite-specific pragmas (`PRAGMA table_info`).
2. **Ephemeral Storage Incompatibility:** Serverless platforms like Vercel provide ephemeral, read-only file systems. Storing data in SQLite on Vercel causes data loss across lambda invocations.
3. **Migration Strategy:** The current backend relies on `Base.metadata.create_all()` and manual schema checks rather than version-controlled database migrations (Alembic).

### B. OAuth Credential Storage
1. **Plaintext Tokens at Rest:** `oauth_connections` table stores Google OAuth `access_token` and `refresh_token` in plaintext. If the database is compromised, external API credentials would be directly exposed. Authenticated encryption (Fernet / AES-256-GCM) is required before connecting live accounts.

### C. Backend Deployment Execution Model
1. **Serverless Lifecycle Differences:** Vercel Python Functions execute in an ephemeral container (AWS Lambda under the hood) with strict execution timeouts (10s on Hobby tier) and no background persistence. Long-running tasks, in-memory rate limiters, or background threads do not persist between cold starts.
2. **Connection Starvation Risk:** Creating new database connections per serverless invocation without connection pooling will rapidly exhaust Supabase's connection limit. Supavisor / PgBouncer connection pooling is required.

---

## 4. Proposed Phase 2 Deployment Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Staff Users (Laptop & Mobile)            │
└──────────────────────────────┬──────────────────────────────┘
                               │ HTTPS
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                  Vercel Edge Network                        │
│  - React 19 + TypeScript + Vite SPA                         │
│  - Custom domain / vercel.app with automatic TLS            │
│  - Environment: VITE_API_BASE_URL                           │
└──────────────────────────────┬──────────────────────────────┘
                               │ REST API (Bearer JWT)
                               ▼
┌─────────────────────────────────────────────────────────────┐
│             FastAPI Backend (Vercel Serverless / Cloud)     │
│  - Python 3.12 Serverless Function entry point (/api)       │
│  - Authenticated session verification                       │
│  - Fernet AES-256 token encryption at rest                  │
│  - Strict user-ownership queries (user_id filtering)        │
└──────────────────────────────┬──────────────────────────────┘
                               │ Transaction Pooler (Port 6543)
                               ▼
┌─────────────────────────────────────────────────────────────┐
│               Supabase PostgreSQL (Free Tier)               │
│  - Managed PostgreSQL with persistent storage               │
│  - Supavisor connection pooling for serverless clients      │
│  - Alembic version-controlled schema migrations             │
│  - Strict row ownership & foreign key constraints           │
└─────────────────────────────────────────────────────────────┘
```

---

## 5. Security & Isolation Strategy

1. **Backend as Trusted Authority:** The FastAPI backend serves as the authoritative gateway. Every query is filtered by `user_id = current_user.id` resolved from verified JWT claims.
2. **Encryption at Rest:** Sensitive tokens in `oauth_connections` are encrypted with Fernet symmetric keys loaded from `OAUTH_TOKEN_ENCRYPTION_KEY`.
3. **Environment Separation:** In `production`, demo account switching (`/api/auth/staff-accounts`), demo resets (`/api/settings/reset-demo`), and auto-seeding are permanently disabled.
