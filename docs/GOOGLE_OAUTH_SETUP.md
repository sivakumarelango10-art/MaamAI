# Ma’amAI — Google Cloud Console & OAuth 2.0 Integration Guide
## Production Configuration for Authorized Staff Accounts

This guide provides instructions for configuring Google Cloud Console for **Ma’amAI**, enabling real Google authentication, Gmail integration, and Google Calendar synchronization for the two authorized staff members.

---

## 1. Application-Authorized Accounts & Strict Allowlist

Ma’amAI enforces a server-side allowlist restricting access strictly to:

1. **`sivakumarelango10@gmail.com`**
2. **`avishka.s@kalvium.com`**

Any other Google account will receive an immediate HTTP 403 Forbidden with the exact message:
> *"Access is restricted to the two authorized Ma’amAI accounts. Please sign in using an approved Google account."*

No database record or session token is created for unauthorized accounts.

---

## 2. Google Cloud Platform Setup Instructions (Strictly ₹0 Budget)

Google Cloud OAuth 2.0, Gmail API, and Calendar API are completely free of charge. No paid tier, credit card, or billing account is required.

### Step 1: Create or Select GCP Project
1. Open the [Google Cloud Console](https://console.cloud.google.com/).
2. Click the project dropdown in the top navigation bar and select **New Project**.
3. Set **Project name**: `MaamAI-Production`.
4. Click **Create** and ensure the project is active.

### Step 2: Enable Required Google APIs
In the sidebar, navigate to **APIs & Services** -> **Library** and search for and enable:
1. **Gmail API** (Click *Enable*)
2. **Google Calendar API** (Click *Enable*)

### Step 3: Configure the OAuth Consent Screen
1. Navigate to **APIs & Services** -> **OAuth consent screen**.
2. Select **User Type**: **External** (allows both `@gmail.com` and `@kalvium.com` accounts).
3. Click **Create**.
4. Fill in **App Information**:
   - **App name**: `Ma’amAI Academic Assistant`
   - **User support email**: `sivakumarelango10@gmail.com`
   - **Application home page**: `https://maamai.vercel.app`
   - **Developer contact information**: `sivakumarelango10@gmail.com`
5. Click **Save and Continue**.

### Step 4: Configure Scopes (Least Privilege)
Click **Add or Remove Scopes** and select:
- `openid` — OpenID Connect identity verification.
- `.../auth/userinfo.email` — Verified email address claim matching allowlist.
- `.../auth/userinfo.profile` — User display name and avatar photo.
- `.../auth/gmail.readonly` — Read faculty emails for briefings and draft assistance.
- `.../auth/gmail.compose` — Create Gmail drafts (`POST /users/me/drafts`). **Crucial:** Never sends emails automatically.
- `.../auth/calendar.readonly` — Fetch user's calendar appointments and lectures.
- `.../auth/calendar.events` — Add user-confirmed calendar events.

Click **Update** and **Save and Continue**.

### Step 5: Add Authorized Test Users
Because the OAuth Consent Screen is in **Testing** publishing status:
1. Under **Test users**, click **Add Users**.
2. Add both exact authorized emails:
   - `sivakumarelango10@gmail.com`
   - `avishka.s@kalvium.com`
3. Click **Save and Continue**.

> [!NOTE]
> In Google Cloud "Testing" mode, OAuth refresh tokens have a 7-day expiration lifespan. When expired, the user simply clicks "Continue with Google" to re-authenticate.

### Step 6: Create OAuth 2.0 Web Client Credentials
1. Navigate to **APIs & Services** -> **Credentials**.
2. Click **Create Credentials** -> **OAuth client ID**.
3. Set **Application type**: **Web application**.
4. Set **Name**: `MaamAI Web Client`.
5. Under **Authorized JavaScript origins**, add:
   - `https://maamai.vercel.app`
   - `http://localhost:5173`
   - `http://127.0.0.1:5173`
6. Under **Authorized redirect URIs**, add:
   - `https://maamai.vercel.app/api/auth/google/callback`
   - `https://maamai.vercel.app`
   - `http://localhost:5173`
   - `http://127.0.0.1:8000/api/auth/google/callback`
7. Click **Create**.
8. Copy the generated **Client ID** and **Client Secret**.

---

## 3. Vercel Production Environment Variables

Enter these credentials into your Vercel Dashboard:
**Vercel Dashboard -> Project `maamai` -> Settings -> Environment Variables**

| Variable Name | Environment | Value Description |
|:---|:---|:---|
| `GOOGLE_CLIENT_ID` | Production | Your Google OAuth Client ID (`*.apps.googleusercontent.com`) |
| `GOOGLE_CLIENT_SECRET` | Production | Your Google OAuth Client Secret |
| `GOOGLE_REDIRECT_URI` | Production | `https://maamai.vercel.app/api/auth/google/callback` |
| `ALLOWED_GOOGLE_EMAILS` | Production | `["sivakumarelango10@gmail.com","avishka.s@kalvium.com"]` |
| `OAUTH_TOKEN_ENCRYPTION_KEY` | Production | High-entropy Fernet 32-byte base64 encryption key |
| `JWT_SECRET_KEY` | Production | High-entropy 32+ character JWT signing key |
| `DATABASE_URL` | Production | Supabase Transaction Pooler URL (port 6543) |
| `DIRECT_URL` | Production | Supabase Session Pooler URL (port 5432) |
| `ENVIRONMENT` | Production | `production` |

---

## 4. Verification Workflow

1. Open `https://maamai.vercel.app`.
2. Click **Continue with Google**.
3. Sign in with `sivakumarelango10@gmail.com`.
4. Grant the requested scopes on the Google Consent Screen.
5. Google redirects back to `https://maamai.vercel.app/api/auth/google/callback`.
6. Ma’amAI server verifies cryptographic ID token signature, issuer, and email_verified claim.
7. Authenticated dashboard loads with real staff profile, live Supabase DB status, real inbox, calendar, and task queue.
8. Click **Save to Gmail Drafts** on any AI draft: genuine draft appears in the staff member's actual Gmail inbox without being sent.
