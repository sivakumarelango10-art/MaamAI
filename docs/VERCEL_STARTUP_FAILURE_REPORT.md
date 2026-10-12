# Ma'amAI Production Startup Failure Diagnosis & Resolution Report

**Project:** Ma'amAI (`F:\Agent`)  
**Production URL:** `https://maamai.vercel.app`  
**Deployment ID:** `dpl_7K7VST1Uqk7xkKzV3riEQ8ZN5UKa`  
**Request ID:** `zc4lf-1791795839321-99e5d395b3ae`  
**Status:** Code remediation complete, test suite verified (57 backend + 6 frontend tests passing), build verified.

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
| `backend/app/services/google_service.py` | Replaced `"placeholder_client_id"` fallback with a strict check raising `ValueError` if client ID is missing or placeholder. Blocked mock ID token bypass in production. | Eliminates invalid placeholder client IDs; provides clear, actionable configuration feedback; closes production auth test bypass. |
| `backend/app/routers/auth.py` | Wrapped `build_google_auth_url(state)` in `try...except ValueError` returning `503 Service Unavailable`. Added single-use nonce replay defense storing consumed nonces in DB. | Returns structured HTTP 503 if OAuth credentials are missing without crashing; enforces one-time authorization state consumption. |
| `backend/app/auth.py` | Fixed cookie session dereference bug in `get_current_user` when Authorization header is absent. | Allows cookie-only requests to authenticate cleanly without dereferencing a `None` header credentials object. |
| `backend/main.py` | Created standard root entrypoint re-exporting `app` from `app.main`. | Allows Vercel's standard FastAPI service runner to locate `main:app` directly within `backend/`. |
| `backend/index.py` | Created fallback entrypoint re-exporting `app` from `app.main`. | Guarantees compatibility if Vercel attempts default `index.py` resolution. |
| `vercel.json` | Updated backend service entrypoint from `app.main:app` to `main:app`. | Conforms to official Vercel multi-service FastAPI deployment specification. |
| `backend/tests/test_production_startup.py` | Added 12 regression tests verifying production startup, DDL bypass, secret validation, database failure resilience, OAuth URL generation, and allowlist enforcement. | Guards against regressions across cold start, security validation, and Google OAuth behaviors. |

---

## 3. Test Execution & Evidence

### A. Backend Pytest Suite
Ran complete backend test suite:
```bash
pytest -v backend/tests
```
**Result:** **57 passed, 0 failed** in 3.94s.
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
- `test_oauth_state_nonce_replay_rejected`: PASSED
- `test_cookie_only_session_authenticated`: PASSED
- Plus all 43 tests for authentication, encryption, Google services, health, and user isolation.

### B. Frontend Vitest Suite
Ran frontend component and auth tests:
```bash
npm run test -- --run
```
**Result:** **6 passed, 0 failed** in 1.76s.

### C. Frontend Production Build
Ran frontend build:
```bash
npm run build
```
**Result:** Built successfully (`tsc -b && vite build`) into `frontend/dist`.

---

## 4. Required Vercel Environment Configuration

To ensure successful startup on Vercel, the following environment variables must be configured in the **Vercel Project Settings -> Environment Variables** for the `Production` environment:

1. `ENVIRONMENT`: `production`
2. `DATABASE_URL`: Supabase Transaction Pooler URL (IPv4 port 6543)
3. `DIRECT_URL`: Supabase Direct / Session URL (IPv4 port 5432)
4. `JWT_SECRET_KEY`: High-entropy 32+ character production secret
5. `FERNET_ENCRYPTION_KEY`: Valid urlsafe base64-encoded 32-byte Fernet key
6. `GOOGLE_CLIENT_ID`: Real Google Web OAuth Client ID
7. `GOOGLE_CLIENT_SECRET`: Real Google Web OAuth Client Secret
8. `GOOGLE_REDIRECT_URI`: `https://maamai.vercel.app/api/auth/google/callback`
9. `ALLOWED_EMAILS`: `sivakumarelango10@gmail.com,avishka.s@kalvium.com`
10. `FRONTEND_URL`: `https://maamai.vercel.app`
