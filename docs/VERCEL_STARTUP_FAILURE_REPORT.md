# Ma’amAI Production Startup Failure Diagnosis & Resolution Report

**Project:** Ma’amAI (`F:\Agent`)  
**Production URL:** `https://maamai.vercel.app`  
**Deployment ID:** `dpl_7K7VST1Uqk7xkKzV3riEQ8ZN5UKa`  
**Request ID:** `zc4lf-1791795839321-99e5d395b3ae`  
**Status:** Code remediation complete, test suite verified (55 backend + 6 frontend tests passing), build verified. Awaiting push and Vercel Dashboard environment synchronization.

---

## 1. Confirmed Root Causes & Supporting Evidence

### Evidence Analysis
- **Observed Vercel Error:** `500 FUNCTION_INVOCATION_FAILED`
- **Vercel Runtime Log Message:** `Application startup failed. Exiting.`
- **Function Route:** `/fastapi`
- **Failing Endpoint:** `GET /api/auth/google/url`

### Root Cause 1: Unhandled Lifespan Startup Crash from Cold Start Database DDL
- **Mechanism:** In Uvicorn / Starlette / FastAPI, the exact console error `"Application startup failed. Exiting."` is raised when an unhandled exception occurs inside the `@asynccontextmanager async def lifespan(app: FastAPI)` hook before the server begins listening for requests.
- **Flaw in Code:** `backend/app/main.py` invoked `init_and_migrate_db()` on every single serverless cold start. Inside `backend/app/database.py`, `init_and_migrate_db()` attempted synchronous inspection (`inspector = inspect(engine); inspector.get_table_names()`).
- **Impact on Vercel Serverless:** Vercel serverless functions spin up ephemeral instances. Any database pooler latency, SSL negotiation delay, or network delay caused a synchronous `OperationalError` or timeout during lifespan initialization. Because this occurred inside the lifespan handler, Uvicorn aborted startup immediately, crashing every incoming HTTP request before routing began.

### Root Cause 2: Blocked Engine Initialization on PostgreSQL (`NameError`)
- **Flaw in Code:** In `backend/app/database.py`, the engine initialization logic for PostgreSQL had an indentation/branching defect where the non-SQLite branch lacked an `else:` statement. When `DATABASE_URL` was a PostgreSQL connection string, `engine` was never bound, causing a fatal `NameError: name 'engine' is not defined` when `SessionLocal = sessionmaker(..., bind=engine)` executed at module import time.
- **Verification:** Reproduced directly in Python: importing `app.database` with a PostgreSQL URL threw `NameError: name 'engine' is not defined`.

### Root Cause 3: Premature Dependency on Database for Authorization URL
- **Flaw in Code:** The endpoint `GET /api/auth/google/url` only constructs an authorization URL and an HMAC state token; it does not read from or write to PostgreSQL. However, because startup was blocked on database connectivity, the authorization URL could never be served if the database was slow or unreachable.
- Additionally, if `GOOGLE_CLIENT_ID` was unset or placeholder, `google_service.py` defaulted to `"placeholder_client_id"`, which produces an invalid authorization URL.

---

## 2. Files Changed & Technical Rationale

| File | Changes Made | Technical Rationale |
| :--- | :--- | :--- |
| `backend/app/database.py` | Added explicit `else:` for PostgreSQL engine initialization with 5s connection timeout; made `init_and_migrate_db()` an immediate no-op in `ENVIRONMENT=production`. | Prevents `NameError` during PostgreSQL initialization; eliminates cold start database DDL/inspection during serverless invocations. Schema is managed via Alembic. |
| `backend/app/main.py` | Added `_log_startup_diagnostics()` (non-sensitive); guarded `init_and_migrate_db()` to run only in non-production; added `@app.exception_handler(SQLAlchemyError)` returning HTTP 503. | Diagnoses runtime configuration state without leaking credentials; decouples server startup from database availability; ensures DB-dependent endpoints fail safely rather than crashing the worker. |
| `backend/app/config.py` | Stripped enclosing quotes and whitespace in `get_database_url()` and `get_direct_url()`; improved production security validation to cleanly reject empty, missing, or SQLite URLs. | Prevents syntax errors caused by copy-pasted quoted environment variables in Vercel UI; enforces production secret hygiene. |
| `backend/app/services/google_service.py` | Replaced `"placeholder_client_id"` fallback with a strict check raising `ValueError("Google OAuth Client ID is not configured...")` if client ID is missing or placeholder. Enforced credential validation in `exchange_code_for_tokens` and `refresh_google_access_token`. | Eliminates invalid placeholder client IDs; provides clear, actionable configuration feedback. |
| `backend/app/routers/auth.py` | Wrapped `build_google_auth_url(state)` in `try...except ValueError` returning `503 Service Unavailable` with a safe configuration message. | Allows the auth router to return a structured HTTP 503 error if OAuth credentials are missing, without crashing the server. |
| `backend/tests/test_production_startup.py` | Added 12 regression tests verifying production startup, DDL bypass, secret validation, database failure resilience, OAuth URL generation, and allowlist enforcement. | Guards against regressions across cold start, security validation, and Google OAuth behaviors. |

---

## 3. Test Execution & Evidence

### A. Backend Pytest Suite
Ran complete backend test suite:
```bash
pytest -v backend/tests
```
**Result:** **55 passed, 0 failed** in 3.96s.
- `test_valid_production_configuration_passes`: PASSED
- `test_production_startup_skips_ddl`: PASSED
- `test_production_rejects_missing_or_weak_jwt_secret`: PASSED
- `test_production_rejects_missing_or_invalid_fernet_key`: PASSED
- `test_production_rejects_sqlite_database_url`: PASSED
- `test_db_independent_endpoints_succeed_even_if_db_unavailable`: PASSED
- `test_db_dependent_endpoints_return_safe_503_on_db_outage`: PASSED
- `test_google_auth_url_uses_configured_client_id_and_returns_200`: PASSED
- `test_google_auth_url_fails_gracefully_when_client_id_missing`: PASSED
- `test_build_google_auth_url_rejects_placeholder`: PASSED
- `test_development_accepts_sqlite_and_default_dev_secrets`: PASSED
- `test_allowlist_enforcement_remains_strict`: PASSED
- Plus all 43 existing tests for authentication, encryption, Google services, health, and user isolation.

### B. Frontend Vitest Suite
Ran frontend component and auth tests:
```bash
npm run test -- --run
```
**Result:** **6 passed, 0 failed** in 1.94s.

### C. Frontend Production Build
Ran frontend build:
```bash
npm run build
```
**Result:** Built successfully (`tsc -b && vite build`) into `frontend/dist`.

### D. Production Cold Start Simulation
Simulated production execution with PostgreSQL configured and verified HTTP 200 response from `GET /api/auth/google/url`:
```
Status: 200
Payload: {
  "auth_url": "https://accounts.google.com/o/oauth2/v2/auth?client_id=40264517437-...&redirect_uri=https://maamai.vercel.app/api/auth/google/callback&response_type=code&scope=...&state=...",
  "state": "..."
}
```

---

## 4. Required Vercel Environment Configuration

To ensure successful startup on Vercel, the following environment variables must be configured in the **Vercel Project Settings -> Environment Variables** for the `Production` (and optionally `Preview`) environments.

> [!IMPORTANT]
> Do not wrap variable values in extra quotes (`"` or `'`) in the Vercel dashboard.

| Variable Name | Required Value Description |
| :--- | :--- |
| `ENVIRONMENT` | Must be set to `production`. |
| `DATABASE_URL` | Supabase transaction pooler URL (Port 6543) with `pgbouncer=true`. Example format: `postgresql://postgres.PROJECT_REF:PASSWORD@aws-0-REGION.pooler.supabase.com:6543/postgres?pgbouncer=true` |
| `DIRECT_URL` | Supabase session pooler URL (Port 5432). Example format: `postgresql://postgres.PROJECT_REF:PASSWORD@aws-0-REGION.pooler.supabase.com:5432/postgres` |
| `JWT_SECRET_KEY` | High-entropy random secret key (minimum 32 characters, recommended 64 hex characters). |
| `OAUTH_TOKEN_ENCRYPTION_KEY` | Dedicated 32-byte URL-safe base64-encoded Fernet key generated via `cryptography.fernet.Fernet.generate_key()`. |
| `GOOGLE_CLIENT_ID` | Production Google OAuth Web Application Client ID (ending with `.apps.googleusercontent.com`). |
| `GOOGLE_CLIENT_SECRET` | Production Google OAuth Client Secret. |
| `GOOGLE_REDIRECT_URI` | `https://maamai.vercel.app/api/auth/google/callback` |
| `ALLOWED_GOOGLE_EMAILS` | `sivakumarelango10@gmail.com,avishka.s@kalvium.com` |
| `CORS_ORIGINS` | `https://maamai.vercel.app,http://localhost:5173` |

---

## 5. Deployment Verification Status

- **Local Verification:** Completely verified. All tests pass, production mode initializes cleanly, database errors are handled with safe HTTP 503, and `GET /api/auth/google/url` returns a valid authorization URL without database dependencies.
- **Live Deployed Endpoint:** The production URL `https://maamai.vercel.app/api/auth/google/url` was running deployment `dpl_7K7VST1Uqk7xkKzV3riEQ8ZN5UKa`. Once the new commit is pushed to GitHub `main`, Vercel will trigger a new build and deployment.
- **Verification Notice:** Local tests prove the code defect has been resolved. The live production deployment will only be resolved once:
  1. The commit is pushed to `origin/main`.
  2. Vercel builds the new deployment.
  3. The environment variables listed in Section 4 are verified in Vercel's dashboard.

---

## 6. Remaining Steps

1. **Commit and Push:** Stage modified files and regression tests, commit with clear message, and push to `origin/main`.
2. **Verify Vercel Dashboard Variables:** Open the Vercel dashboard for project `maamai`, navigate to **Settings -> Environment Variables**, and ensure all variables from Section 4 are set with matching production values.
3. **Monitor Vercel Deployment:** Check that the deployment triggered by this push builds and deploys successfully.
4. **Live Verification:** Issue `GET https://maamai.vercel.app/api/auth/google/url` in a browser or curl to confirm HTTP 200 with the Google OAuth consent URL.
