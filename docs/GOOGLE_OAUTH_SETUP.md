# MaamAI Phase 2: Google OAuth & Calendar/Gmail Integration Guide

This document outlines the security architecture, Google Cloud Console setup, encryption requirements, and multi-user isolation policies for future Google Workspace integrations in **MaamAI**.

---

## 1. Multi-User Google Account Isolation Policy

MaamAI supports two independent academic staff members:
- **Dr. Aris Vance** (`aris.vance@university.edu`)
- **Dr. Priya Sharma** (`priya.sharma@university.edu`)

### Mandatory Security Constraints
1. **Zero Shared Credentials**: Staff members **never** share OAuth connections, access tokens, or refresh tokens.
2. **User-Scoped Database Isolation**: Every OAuth record in the `oauth_connections` table is foreign-keyed to `users.id` with a unique constraint on `(user_id, provider)`.
3. **No Automatic Actions**: The application must **never** send an email or create/edit a calendar event autonomously. All AI-generated drafts and proposed calendar events require explicit, manual user review and approval in the dashboard.
4. **Never Ask for Google Passwords**: All Google authentication must use Google's official OAuth 2.0 Authorization Code flow with CSRF protection (`state` token).

---

## 2. Token Security: Authenticated Encryption at Rest

In accordance with Phase 2 security hardening, plaintext OAuth tokens are **never** stored in the database or exposed in API responses.

### Cryptographic Foundation
- **Algorithm**: Authenticated Encryption using **Fernet** (symmetric AES-128-CBC encryption combined with HMAC-SHA256 authentication).
- **Key Storage**: The encryption key is loaded from the environment variable `OAUTH_TOKEN_ENCRYPTION_KEY`.
- **Validation**: At production startup, `Settings.validate_production_secrets()` validates that the key exists and conforms to 32 URL-safe base64-encoded bytes. If missing or invalid, the backend halts immediately with a fatal configuration error.
- **API Sanitization**: All endpoints under `/api/oauth/google/*` redact sensitive tokens. Only status indicators (`is_connected`, `provider`, `email_account`, `scopes`) are exposed to the browser.

---

## 3. Step-by-Step Google Cloud Console Setup (₹0 Budget)

Google Cloud OAuth 2.0 authentication is completely free of charge. No billing account or credit card is required.

### Step 1: Create a Google Cloud Project
1. Visit the [Google Cloud Console](https://console.cloud.google.com/).
2. Click the project dropdown at the top left and click **New Project**.
3. Name the project `MaamAI-Assistant` and click **Create**.

### Step 2: Configure the OAuth Consent Screen
1. In the sidebar, navigate to **APIs & Services** -> **OAuth consent screen**.
2. Select **User Type**:
   - If using Google Workspace for Education: Choose **Internal** (recommended; automatically restricts access to institutional faculty).
   - If using personal Gmail accounts: Choose **External**.
3. Fill in the App Information:
   - **App name**: `MaamAI Academic Assistant`
   - **User support email**: Select your developer email.
   - **Developer contact information**: Provide your contact email.
4. Click **Save and Continue**.

### Step 3: Configure Scopes
Add the following least-privilege scopes:
- `.../auth/userinfo.email` (View primary email address)
- `.../auth/gmail.readonly` (Read faculty emails to summarize briefings and propose drafts)
- `.../auth/calendar` (View and manage scheduled faculty lectures and office hours)

### Step 4: Add Authorized Test Users (If using External mode)
If External mode was chosen in Step 2:
1. Under **Test users**, click **Add Users**.
2. Whitelist the exact staff email addresses:
   - `aris.vance@university.edu` (or designated test account)
   - `priya.sharma@university.edu` (or designated test account)
3. Click **Save and Continue**.

### Step 5: Create OAuth 2.0 Client Credentials
1. Navigate to **APIs & Services** -> **Credentials**.
2. Click **Create Credentials** -> **OAuth client ID**.
3. Select **Application type**: **Web application**.
4. Name: `MaamAI Web Client`.
5. Under **Authorized redirect URIs**, add:
   - Local development: `http://127.0.0.1:8000/api/oauth/google/callback`
   - Production Vercel: `https://[YOUR-VERCEL-SUBDOMAIN].vercel.app/api/oauth/google/callback`
6. Click **Create**.
7. Securely record the generated **Client ID** and **Client Secret**.

---

## 4. Production Environment Configuration

Add the Google OAuth credentials to your backend environment on Vercel:

```env
GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_REDIRECT_URI=https://your-vercel-domain.vercel.app/api/oauth/google/callback
```

---

## 5. Staff Connection Journey

1. **Staff Login**: Dr. Vance logs in to MaamAI at `https://your-app.vercel.app` using their private credentials.
2. **Connect Google Account**: In Settings or the Header, Dr. Vance clicks **Connect Google Workspace**.
3. **Consent & Verification**: The user is redirected to Google's official consent screen and grants permission.
4. **Encrypted Callback**: Google redirects back to `/api/oauth/google/callback` with a temporary code and CSRF state token.
5. **Storage**: The backend exchanges the code for access/refresh tokens, encrypts them with Fernet, and updates Dr. Vance's private row in `oauth_connections`.
6. **Isolation Check**: Dr. Sharma logs in from their device. Dr. Sharma's workspace shows "Not Connected" until Dr. Sharma connects their separate Google account.
