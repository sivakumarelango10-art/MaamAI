# MaamAI Phase 2: Supabase PostgreSQL Database Setup Guide

This guide details the complete database architecture, Alembic migration workflow, connection pooler configuration, and security model for running **MaamAI** on **Supabase PostgreSQL** under a strict **₹0 budget**.

---

## 1. Architecture & Security Model

### Trusted Backend Layer vs. Direct Client Access
MaamAI uses a **Trusted Backend Access Layer** model:
1. **Zero Browser Exposure**: The database connection string (`DATABASE_URL`) containing Postgres credentials is kept strictly server-side inside backend environment variables on Vercel. It is **never** bundled into the React frontend (`VITE_*`).
2. **Server-Side Verified Identity**: Every API request arriving at the FastAPI backend is validated against signed JWT bearer tokens. User identity is derived strictly from `current_user.id`.
3. **Application-Level Ownership Isolation**: Every SQLAlchemy query filters by `user_id = current_user.id` (e.g., emails, drafts, tasks, calendar events, OAuth connections, settings).
4. **Why Next.js SSR / Direct Browser RLS Snippets Were Adapted**:
   - Generic Supabase dashboard onboarding snippets often target Next.js full-stack apps using Supabase's proprietary Auth tokens (`@supabase/ssr` / `@supabase/supabase-js`).
   - MaamAI is built with a high-performance Python FastAPI backend and a React Vite SPA.
   - Because Supabase's native Row Level Security (RLS) evaluates `auth.uid()` from Supabase Auth tokens, our backend serves as the authoritative authentication and enforcement gatekeeper.
   - If direct browser querying via Supabase client is desired in the future, Supabase JWTs must be mapped or custom RLS policies with `request.jwt.claims` must be applied. For Phase 2, direct client database access is disabled by design.

---

## 2. Supabase Free Tier Specifications (₹0 Budget)

| Feature | Supabase Free Plan Limit | MaamAI Footprint |
| :--- | :--- | :--- |
| **Database Size** | 500 MB PostgreSQL | < 5 MB (Faculty metadata, briefings, cached emails) |
| **Database Egress** | 2 GB / month | ~ 50 MB / month |
| **Max Connections** | ~60 direct connections | 5 connections via connection pooler |
| **Projects** | Up to 2 active projects | 1 project for MaamAI |
| **Pause Policy** | Inactive projects pause after 7 days | Can be unpaused via Supabase dashboard with 1 click |

> **Cost Verification**: Supabase requires no credit card for the free tier. Never enable Pro upgrades or add-ons.

---

## 3. Connection String & Serverless Pooling

Serverless environments like **Vercel Python Functions** create new execution environments during cold starts. Directly connecting to PostgreSQL's default port (`5432`) across multiple lambdas can quickly exhaust the database's connection limit (60 max).

To prevent connection exhaustion:
- Connect through **Supabase Transaction Pooler (Supavisor)** on port **`6543`**.
- Append `?pgbouncer=true` if using transaction pooling.
- For running Alembic schema migrations (DDL), use the **Session Pooler** on port **`5432`** or the direct connection.

### Connection String Format
```env
# Production Runtime on Vercel (Supabase Transaction Pooler - IPv4 Compatible)
DATABASE_URL=postgresql://postgres.[PROJECT-REF]:[YOUR-PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres?sslmode=require

# Direct / Migration URL (Used when running Alembic migrations)
DIRECT_URL=postgresql://postgres.[PROJECT-REF]:[YOUR-PASSWORD]@aws-0-[REGION].pooler.supabase.com:5432/postgres?sslmode=require
```

> **Note on SQLAlchemy**: If your Supabase URI begins with `postgres://`, MaamAI's `get_database_url()` in `backend/app/config.py` automatically normalizes it to `postgresql://` to maintain compatibility with SQLAlchemy 2.0 and `psycopg2`.

---

## 4. Database Schema & Tables

MaamAI's initial schema consists of 10 PostgreSQL tables managed by Alembic:

| Table | Primary Key | User Foreign Key | Description |
| :--- | :--- | :--- | :--- |
| `users` | `id` (SERIAL) | — | Faculty accounts (`aris_vance`, `priya_sharma`) with bcrypt password hashes |
| `revoked_tokens` | `id` (SERIAL) | `user_id` -> `users.id` | Revoked JWT identifiers for instant logout enforcement |
| `oauth_connections` | `id` (SERIAL) | `user_id` -> `users.id` | Scoped Google OAuth connections with Fernet-encrypted tokens |
| `briefings` | `id` (SERIAL) | `user_id` -> `users.id` | Daily morning briefing summaries, focus items, urgent counts |
| `emails` | `id` (SERIAL) | `user_id` -> `users.id` | Academic inboxes with priority, category, and read status |
| `ai_drafts` | `id` (SERIAL) | `user_id` -> `users.id` | Generated email drafts with approval/rejection state |
| `calendar_events` | `id` (SERIAL) | `user_id` -> `users.id` | Lectures, office hours, faculty senate meetings |
| `tasks` | `id` (SERIAL) | `user_id` -> `users.id` | Faculty tasks with status, priority, and due dates |
| `activity_logs` | `id` (SERIAL) | `user_id` -> `users.id` | Audit trail of user actions, approvals, and sync events |
| `system_settings` | `id` (SERIAL) | `user_id` -> `users.id` | Faculty tone preferences, default office hours, dark mode |

---

## 5. Step-by-Step Setup Guide

### Step 1: Create Free Supabase Project
1. Log in to [supabase.com](https://supabase.com) (free account).
2. Click **New Project**.
3. Choose an Organization and enter project details:
   - **Name**: `MaamAI-Production`
   - **Database Password**: Generate a secure 32+ character random password. **Store this password securely**.
   - **Region**: Select a region geographically closest to your users (e.g., `Singapore (ap-southeast-1)` or `Mumbai (ap-south-1)`).
   - **Pricing Plan**: Free (₹0).
4. Click **Create new project** and wait ~2 minutes for provisioning.

### Step 2: Retrieve the Pooler Connection String
1. In your Supabase dashboard, navigate to **Project Settings** (gear icon) -> **Database**.
2. Scroll to the **Connection Pooling** section.
3. Select **Mode**: `Transaction` (Port `6543`).
4. Copy the connection string. Replace `[YOUR-PASSWORD]` with the database password created in Step 1.

### Step 3: Run Alembic Migrations
From your local terminal, apply the schema to your remote Supabase instance:

```bash
# In Windows PowerShell:
cd F:\Agent\backend

# Set the temporary migration connection string to your Supabase instance
$env:DATABASE_URL="postgresql://postgres.[PROJECT-REF]:[YOUR-PASSWORD]@aws-0-[REGION].pooler.supabase.com:5432/postgres?sslmode=require"

# Run migrations to create all 10 tables
.\.venv\Scripts\alembic upgrade head
```

Verify table creation in the Supabase dashboard under **Table Editor**. You should see all 10 tables present with appropriate foreign keys and indexes.

### Step 4: Seed Production Staff Accounts
Provision the two faculty accounts securely using the non-interactive staff provisioning script:

```bash
# Provision Dr. Aris Vance and Dr. Priya Sharma in production database
python ..\scripts\provision_staff.py --env production
```

> **Security Note**: This script generates strong, unique initial passwords for both staff members and outputs them once. Staff members must log in and change their passwords upon first access.

---

## 6. Optional: Supabase Row Level Security (RLS) Policies

If you decide to enable RLS in the future to allow direct Supabase client queries from the frontend:

```sql
-- Enable RLS on all tables
ALTER TABLE briefings ENABLE ROW LEVEL SECURITY;
ALTER TABLE emails ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_drafts ENABLE ROW LEVEL SECURITY;
ALTER TABLE calendar_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE oauth_connections ENABLE ROW LEVEL SECURITY;

-- Sample policy for tasks (requires Supabase Auth JWT with user_id claim)
CREATE POLICY "Users can only access their own tasks"
ON tasks
FOR ALL
USING (auth.jwt() ->> 'sub' = user_id::text);
```

For Phase 2, all database operations route through the authenticated FastAPI service layer with connection credentials protected server-side on Vercel.
