# MaamAI Phase 2: Deployment Architecture & Cloud Compatibility Evaluation

This document evaluates hosting options for the **MaamAI** application, provides the architectural blueprint for deploying on **Vercel** with a **Supabase PostgreSQL** database, and outlines the free-tier-compatible alternatives under a strict **₹0 budget**.

---

## 1. Technical Evaluation: FastAPI on Vercel Python Serverless Functions

We evaluated deploying the existing FastAPI backend as **Vercel Serverless Functions** (`api/index.py`). Below is the architectural assessment:

| Dimension | Vercel Serverless Behavior | MaamAI Compatibility & Adaptations | Status |
| :--- | :--- | :--- | :--- |
| **Runtime & Dependencies** | Amazon Linux 2 / Python 3.12 AWS Lambda environment | Dependencies (`fastapi`, `pydantic`, `cryptography`, `psycopg2-binary`, `python-jose`, `passlib`) compile and install from pre-built manylinux wheels via root `requirements.txt`. | **COMPATIBLE** |
| **Application Entry Point** | Vercel natively inspects `api/index.py` and detects ASGI `app` export | Serverless adapter in `api/index.py` injects `backend/` into `sys.path` and cleanly exports `app` from `app.main`. | **COMPATIBLE** |
| **Filesystem & Ephemeral Storage** | Read-only filesystem except ephemeral `/tmp` (wiped after invocation) | **SQLite is incompatible for shared production data.** Replaced by remote **Supabase PostgreSQL** accessed via connection pooler. | **ADAPTED** |
| **Database Connection Lifecycle** | Hundreds of concurrent lambda cold starts can quickly exhaust database connections | SQLAlchemy configured with `pool_pre_ping=True`, `pool_recycle=300`, `pool_size=5`, connecting to Supabase's transaction pooler on port `6543`. | **COMPATIBLE** |
| **Execution Duration Limits** | Hobby tier imposes a strict 10–15 second timeout per request | All Phase 2 requests (login, briefing, emails, tasks, calendar) execute in < 200ms. Long-running batch background syncs are avoided. | **COMPATIBLE** |
| **Lifespan & Startup Events** | Cold starts run ASGI lifespan handlers; shutdown handlers may not execute reliably | Database schema creation relies on version-controlled **Alembic migrations** rather than expensive runtime DDL checks on every cold start. | **COMPATIBLE** |
| **CORS & Routing** | Same-origin rewrites via `vercel.json` forward `/api/*` to `api/index.py` | Eliminates CORS preflight overhead in production while keeping development origins configured. | **COMPATIBLE** |
| **WebSockets & Long Polling** | Unsupported on Vercel Serverless | MaamAI exclusively uses stateless REST APIs; no WebSockets required. | **COMPATIBLE** |

### Evaluation Verdict
The existing FastAPI application **can be deployed reliably on Vercel Serverless Functions** for the Phase 2 scope using the unified `vercel.json` routing configuration and `api/index.py` serverless adapter.

---

## 2. Architecture Comparison: Unified Vercel vs. Decoupled Free-Tier Hosting

```mermaid
graph TD
    Client["Client Browser (Desktop / Mobile)"]
    
    subgraph Option_A ["Option A: Unified Vercel Deployment (Implemented)"]
        VercelCDN["Vercel Global Edge Network"]
        ViteSPA["Static React 19 Frontend (/dist)"]
        ServerlessFn["Vercel Python Function (/api/index.py)"]
        FastAPI["FastAPI ASGI Router"]
        
        Client --> VercelCDN
        VercelCDN -->|Static Routes /| ViteSPA
        VercelCDN -->|API Routes /api/*| ServerlessFn
        ServerlessFn --> FastAPI
    end

    subgraph Option_B ["Option B: Decoupled Architecture (Alternative)"]
        RenderAPI["Render.com Free Web Service (FastAPI)"]
        Client -.->|Direct API calls| RenderAPI
    end

    subgraph Cloud_DB ["Cloud Storage & Database (₹0 Free Tier)"]
        SupabasePooler["Supabase Transaction Pooler (Port 6543)"]
        PostgresDB[("Supabase PostgreSQL DB")]
        
        FastAPI --> SupabasePooler
        RenderAPI -.-> SupabasePooler
        SupabasePooler --> PostgresDB
    end
```

### Free-Tier Alternative: Render.com or Fly.io
If background email polling or persistent cron jobs exceeding the 10-second serverless execution limit are introduced in Phase 3:
- **Render.com Free Tier**: Provides 750 free hours/month of Python web service runtime (spins down after 15 minutes of inactivity; 30–50s cold start).
- **Frontend Configuration**: The React frontend supports this decoupled mode seamlessly by setting `VITE_API_BASE_URL=https://maamai-api.onrender.com/api`.

---

## 3. Production Environment Variables Checklist

Set these variables in the **Vercel Project Settings -> Environment Variables** dashboard:

| Variable Name | Required | Target Environment | Description / Example |
| :--- | :--- | :--- | :--- |
| `ENVIRONMENT` | **Yes** | Production | Must be set to `production` (disables demo seeding & staff switching). |
| `DATABASE_URL` | **Yes** | Production | `postgresql://postgres.[REF]:[PASS]@aws-0-[REGION].pooler.supabase.com:6543/postgres?sslmode=require` |
| `JWT_SECRET_KEY` | **Yes** | Production | High-entropy 64-character hex secret for signing staff tokens (`openssl rand -hex 32`). |
| `OAUTH_TOKEN_ENCRYPTION_KEY` | **Yes** | Production | Fernet 32-byte URL-safe base64 key (`python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"`). |
| `CORS_ORIGINS` | **Yes** | Production | JSON string of allowed frontend domains, e.g. `["https://maamai.vercel.app"]`. |
| `VITE_API_BASE_URL` | Optional | Production | Leave empty when deployed unified on Vercel (defaults to relative `/api`). |
| `VITE_SUPABASE_URL` | Optional | Production | Public Supabase project URL (e.g. `https://[REF].supabase.co`). |
| `VITE_SUPABASE_ANON_KEY` | Optional | Production | Public Supabase anon/publishable key. |

> **Critical Rule**: Never prefix backend credentials (`DATABASE_URL`, `JWT_SECRET_KEY`, `OAUTH_TOKEN_ENCRYPTION_KEY`) with `VITE_`. Any variable starting with `VITE_` is baked into public client JavaScript bundles!

---

## 4. Step-by-Step Vercel Deployment Instructions

### Step 1: Connect Repository to Vercel
1. Log in to [vercel.com](https://vercel.com).
2. Click **Add New...** -> **Project**.
3. Import the `MaamAI` GitHub repository (`sivakumarelango10-art/MaamAI`).

### Step 2: Configure Project Settings
1. **Framework Preset**: Select `Other` (or leave default; `vercel.json` provides explicit commands).
2. **Root Directory**: Leave as `./` (project root).
3. **Build Command**: `cd frontend && npm install && npm run build` (handled automatically by `vercel.json`).
4. **Output Directory**: `frontend/dist` (handled automatically by `vercel.json`).

### Step 3: Populate Environment Variables
In the **Environment Variables** section, add the required production keys detailed in Section 3:
- `ENVIRONMENT=production`
- `DATABASE_URL`
- `JWT_SECRET_KEY`
- `OAUTH_TOKEN_ENCRYPTION_KEY`
- `CORS_ORIGINS=["https://YOUR-VERCEL-SUBDOMAIN.vercel.app"]`

### Step 4: Deploy and Verify
1. Click **Deploy**.
2. Monitor build logs:
   - Python dependencies are installed from `requirements.txt`.
   - Node packages and Vite compile the frontend to `frontend/dist`.
3. Test health check endpoint: `https://[YOUR-APP].vercel.app/api/health`.
4. Test staff authentication with provisioned credentials.
