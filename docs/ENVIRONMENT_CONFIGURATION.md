# MaamAI: Root Environment Configuration & Consolidation Guide

This document details the consolidated environment architecture for **MaamAI**, covering local development, Vercel multi-service cloud deployment, security isolation between public and private settings, and verification results.

---

## 1. Single Root Environment Architecture

All project configuration is consolidated at the workspace root:

```text
F:\Agent\
├── .env                # Local development configuration (UNTRACKED / GIT-IGNORED)
├── .env.example        # Single canonical template documenting all variables (TRACKED)
├── backend/            # No nested .env or .env.example files
└── frontend/           # No nested .env or .env.example files
```

### Purpose of Each File
- **[`F:\Agent\.env`](file:///F:/Agent/.env)**: The active local environment file. Contains local development defaults (SQLite database, local CORS origins, development JWT secrets). Kept strictly off Git.
- **[`F:\Agent\.env.example`](file:///F:/Agent/.env.example)**: The comprehensive reference template. Fully documented with safe placeholders, generation commands, and descriptions for every variable used across the frontend and backend.

All redundant nested files (`backend/.env.example` and `frontend/.env.example`) have been migrated and removed.

---

## 2. Complete Environment Variable Inventory

Every variable in the application is cataloged below:

| Variable Name | Scope | Sensitivity | Default / Example Value | Description & Purpose |
| :--- | :--- | :--- | :--- | :--- |
| `ENVIRONMENT` | Backend | **Private** | `development` | Operating mode: `'development'` or `'production'`. In production, staff directory listing, demo resets, and automatic seeding are disabled. |
| `JWT_SECRET_KEY` | Backend | **Private (Secret)** | `dev_jwt_secret_key...` | Cryptographic key used to sign and verify staff JWT session tokens. Must be >= 32 characters in production (`openssl rand -hex 32`). |
| `JWT_ALGORITHM` | Backend | **Private** | `HS256` | Symmetric signature algorithm for JWT tokens. |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | Backend | **Private** | `120` | Lifetime in minutes of issued staff JWT tokens before re-authentication is required. |
| `LOGIN_RATE_LIMIT_PER_MINUTE` | Backend | **Private** | `5` | Maximum failed authentication attempts allowed per IP/account before `429 Too Many Requests` is returned. |
| `OAUTH_TOKEN_ENCRYPTION_KEY` | Backend | **Private (Secret)** | `cKNExS5e...` | Fernet 32-byte URL-safe base64 key used for authenticated AES-128-CBC + HMAC-SHA256 encryption of Google OAuth tokens at rest. |
| `DATABASE_URL` | Backend | **Private (Secret in Prod)** | `sqlite:///./maamai.db` | SQLAlchemy connection string. In development: local SQLite. In production: Supabase PostgreSQL pooler URL. |
| `DIRECT_URL` | Backend / Migrations | **Private (Secret in Prod)** | *(Supabase Session Pooler)* | Direct database connection string (port 5432) used for running Alembic schema migrations on Supabase. |
| `CORS_ORIGINS` | Backend | **Private** | `["http://localhost:5173", ...]` | JSON array of authorized origins allowed to make credentialed requests to the FastAPI backend. |
| `GOOGLE_CLIENT_ID` | Backend | **Private** | `placeholder_client_id_phase2` | Google Cloud Platform OAuth 2.0 client identifier. |
| `GOOGLE_CLIENT_SECRET` | Backend | **Private (Secret)** | `placeholder_client_secret_phase2` | Google Cloud Platform OAuth 2.0 client secret. |
| `GOOGLE_REDIRECT_URI` | Backend | **Private** | `http://localhost:8000/api/oauth/google/callback` | Authorized OAuth redirect callback URL registered in Google Cloud Console. |
| `ENABLE_GMAIL_SYNC` | Backend | **Private** | `false` | Feature flag to enable live Gmail synchronization in Phase 3. |
| `ENABLE_GCAL_SYNC` | Backend | **Private** | `false` | Feature flag to enable live Google Calendar synchronization in Phase 3. |
| `AI_PROVIDER` | Backend | **Private** | `gemini_free` | Active AI inference engine: `'gemini_free'`, `'ollama_local'`, or `'deterministic'`. |
| `GEMINI_API_KEY` | Backend | **Private (Secret)** | *(empty locally)* | Free tier Google AI Studio API key for Gemini 1.5 Flash. |
| `OLLAMA_BASE_URL` | Backend | **Private** | `http://localhost:11434` | Endpoint for local on-device Ollama inference. |
| `BACKEND_URL` | Vercel Binding | **Private / Internal** | `http://127.0.0.1:8000` | Injected dynamically by Vercel Services to bind the `frontend` dev server to the `backend` service during `vercel dev`. |
| `VITE_API_BASE_URL` | Frontend | **Public (Browser-Safe)** | `/api` | Base URL used by the frontend fetch client to call the backend API. |
| `VITE_API_URL` | Frontend | **Public (Browser-Safe)** | `/api` | Backward-compatibility alias for `VITE_API_BASE_URL`. |
| `VITE_APP_ENV` | Frontend | **Public (Browser-Safe)** | `development` | Client-side indicator for UI mode and staff switcher visibility. |
| `VITE_SUPABASE_URL` | Frontend | **Public (Browser-Safe)** | *(optional)* | Supabase public project URL (only needed if direct browser client subscriptions are enabled). |
| `VITE_SUPABASE_ANON_KEY` | Frontend | **Public (Browser-Safe)** | *(optional)* | Supabase public anon/publishable key. |

---

## 3. How Local Configuration is Loaded

### Backend (FastAPI & Alembic)
In [`backend/app/config.py`](file:///F:/Agent/backend/app/config.py):
1. **Dynamic Root Resolution**:
   ```python
   ROOT_DIR = Path(__file__).resolve().parent.parent.parent
   ROOT_ENV_FILE = ROOT_DIR / ".env"
   ```
2. **CWD Independence**:
   `Settings.model_config` explicitly sets `"env_file": str(ROOT_ENV_FILE) if ROOT_ENV_FILE.exists() else None`.
   Whether the process is started from `F:\Agent` (`python backend/app/main.py`) or `F:\Agent\backend` (`uvicorn app.main:app`), the backend always resolves `F:\Agent\.env`.
3. **Canonical SQLite Pathing**:
   Relative SQLite URLs (`sqlite:///./maamai.db`) are normalized to `sqlite:///F:/Agent/maamai.db`, ensuring Alembic and FastAPI always interact with the same database file regardless of execution working directory.
4. **Alembic Migration Integration**:
   [`backend/alembic/env.py`](file:///F:/Agent/backend/alembic/env.py) imports `from app.config import settings` and loads the same database configuration without separate configuration files.

### Frontend (Vite)
In [`frontend/vite.config.ts`](file:///F:/Agent/frontend/vite.config.ts):
```typescript
export default defineConfig({
  plugins: [react()],
  envDir: '../', // Directs Vite to load environment files from F:\Agent
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: process.env.BACKEND_URL || 'http://127.0.0.1:8000',
        changeOrigin: true,
      },
    },
  },
  // ...
});
```
- **Strict Prefix Filtering**: Vite only exposes variables prefixed with `VITE_` to browser code (`import.meta.env`). All server secrets (`DATABASE_URL`, `JWT_SECRET_KEY`, `OAUTH_TOKEN_ENCRYPTION_KEY`) in `F:\Agent\.env` are strictly hidden from the frontend bundle.

---

## 4. How Production Environment Variables are Configured on Vercel

In production on Vercel:
- No `.env` file is deployed to Vercel (prevented by `.gitignore` and `.vercelignore`).
- All production variables are configured in **Vercel Dashboard -> Project Settings -> Environment Variables**:

| Production Variable | Vercel Scope | Value / Guidance |
| :--- | :--- | :--- |
| `ENVIRONMENT` | Production | `production` |
| `DATABASE_URL` | Production | `postgresql://postgres.[REF]:[PASS]@aws-0-[REGION].pooler.supabase.com:6543/postgres?sslmode=require` |
| `JWT_SECRET_KEY` | Production | Random 64-char hex string (`openssl rand -hex 32`) |
| `OAUTH_TOKEN_ENCRYPTION_KEY` | Production | Dedicated Fernet key (`python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"`) |
| `CORS_ORIGINS` | Production | `["https://YOUR-APP.vercel.app"]` |
| `VITE_API_BASE_URL` | Production | `/api` |
| `VITE_APP_ENV` | Production | `production` |

---

## 5. Security & Verification Audit

### A. Git Secret Protection
- **`.gitignore` Verification**: Line 6 of `.gitignore` explicitly ignores `.env` and `.env.*` (while keeping `!.env.example`).
- **`git check-ignore -v .env`**: Returned `.gitignore:6:.env`.
- **Git Tracking History**: Confirmed `F:\Agent\.env` has never been committed or tracked in Git history.

### B. Frontend Secret Bundle Inspection
Inspected the compiled production bundle in `frontend/dist/` for leaks:
- `JWT_SECRET_KEY` search: **0 matches**
- `OAUTH_TOKEN_ENCRYPTION_KEY` search: **0 matches**
- `DATABASE_URL` search: **0 matches**
- Local database file `maamai.db` search: **0 matches**

### C. Test Execution Results
1. **Config Loading Test (from `F:\Agent`)**:
   `Root env exists: True`, `Environment: development`, `DB URL: sqlite:///F:/Agent/maamai.db` — **PASSED**
2. **Config Loading Test (from `F:\Agent\backend`)**:
   `Root env exists: True`, `Environment: development`, `DB URL: sqlite:///F:/Agent/maamai.db` — **PASSED**
3. **Alembic Migration Check (`alembic current`)**:
   Connected to SQLite cleanly using root configuration — **PASSED**
4. **Backend Pytest Suite**:
   **28/28 tests passed** in 3.29s — **PASSED**
5. **Frontend Vitest Suite**:
   **6/6 tests passed** in 2.34s — **PASSED**
6. **Frontend Production Build (`npm run build`)**:
   Succeeded in 1.35s with 0 errors and 0 warnings — **PASSED**
