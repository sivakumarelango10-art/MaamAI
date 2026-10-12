# Ma'amAI: Security and Data Correctness Audit Report

**Audit Target:** Ma'amAI Core Application (`F:\Agent`)  
**Deployment Target:** `https://maamai.vercel.app`  
**Classification System:** P0 (Immediate Risk), P1 (Production Blocker), P2 (Functional/Security Flaw), P3 (Maintainability)

---

## 1. Security Architecture Summary

Ma'amAI is an executive assistant for university faculty handling sensitive institutional communications, student inquiries, academic calendars, and internal task queues.

Security mandates:
1. **Google-Only Sign-In**: No passwords, local credentials, or external unverified identity providers.
2. **Server-Side Allowlist Enforcement**: Access is strictly limited to two authorized accounts:
   - `sivakumarelango10@gmail.com`
   - `avishka.s@kalvium.com`
   Any other account attempting authentication is immediately rejected with HTTP 403 Forbidden.
3. **Defense-in-Depth Cryptography**:
   - OAuth access and refresh tokens are encrypted at rest with Fernet symmetric encryption before storing in PostgreSQL.
   - Application sessions use signed JWTs with explicit expiration and server-side revocation tables.
   - OAuth states use HMAC-SHA256 signatures with embedded timestamps and unpredictable nonces, tracked and invalidated upon first use to prevent replay attacks.
4. **Human-in-the-Loop Safeguard**: Zero automated outbound communications. Drafts are generated only for staff review, and genuine drafts are pushed to Gmail with explicit user clicks. Real calendar event creation requires explicit user confirmation.

---

## 2. Audit Findings & Remediations

### Finding S-01 (P0): Broken Cookie-Only Session Dereference in `get_current_user`
- **Location:** `backend/app/auth.py`
- **Vulnerability:** When a request was authenticated via HttpOnly cookie `maamai_session` without a `Bearer` header, `credentials` evaluated to `None`. The original code subsequently executed `token = credentials.credentials`, crashing with `AttributeError: 'NoneType' object has no attribute 'credentials'`.
- **Impact:** Cookie-based same-origin sessions failed catastrophically on protected endpoints, forcing client apps to rely on URL queries or manual header management.
- **Remediation:** Removed the unconditional dereference. When `token` is resolved from the cookie, the credentials check is skipped. Added `path="/"` to all cookie set and delete actions.
- **Verification:** Unit test `test_cookie_only_session_authenticated` passed in `test_auth.py`.

### Finding S-02 (P0): Potential ID Token Verification Bypass via Mock Prefix in Production
- **Location:** `backend/app/services/google_service.py`
- **Vulnerability:** The function `verify_google_id_token` previously permitted bypassing Google's public key signature verification if `settings.GOOGLE_CLIENT_ID` started with `mock_` or `test_`. If an operator misconfigured the environment variable in production, unverified tokens could be accepted.
- **Impact:** Critical authentication bypass risk if configuration was flawed.
- **Remediation:** Added an explicit security guard: if `settings.ENVIRONMENT.lower() == "production"`, testing prefixes are strictly disallowed, and the request raises `ValueError("Mock ID token verification is prohibited in production")`. In automated unit tests, signature verification is explicitly mocked at the function boundary rather than altering production code logic.
- **Verification:** Tested with `test_id_token_missing_email_verified` and production config regression tests.

### Finding S-03 (P1): OAuth State Replay Vulnerability
- **Location:** `backend/app/routers/auth.py`
- **Vulnerability:** OAuth state parameters were HMAC-signed and timestamp-checked, but nonces were not tracked upon consumption. An attacker intercepting an authorization code and state within its 10-minute validity window could replay the exchange request.
- **Impact:** Replay authorization attack.
- **Remediation:** Upon successful HMAC verification, the state's nonce is extracted and queried against the database. If `oauth_nonce:<nonce>` already exists, the exchange is rejected with HTTP 400 Bad Request. Once accepted, `oauth_nonce:<nonce>` is written to the revocation table, enforcing single-use semantics without requiring DDL alterations on Supabase.
- **Verification:** Unit test `test_oauth_state_nonce_replay_rejected` passed.

### Finding S-04 (P1): Cross-User Multi-Tenant Isolation
- **Location:** `backend/app/routers/` (emails, drafts, calendar, tasks, settings, briefing)
- **Vulnerability:** Risk of data leakage if any query omitted the `user_id == current_user.id` filter or permitted reading other users' IDs.
- **Impact:** Faculty data cross-contamination.
- **Remediation:** Audited all database queries across all endpoints. Every read, update, and delete operation strictly filters by `current_user.id`. Substitution of foreign draft IDs, email IDs, or task IDs returns HTTP 404 or HTTP 403.
- **Verification:** 10 isolation regression tests in `backend/tests/test_isolation.py` passed with 100% success rate.

### Finding S-05 (P2): Credentials & Encryption Key Separation
- **Location:** `backend/app/config.py`, `backend/app/crypto.py`
- **Vulnerability:** Risk of using the same key for JWT signing and Fernet database encryption, or falling back to plaintext in production.
- **Impact:** Key compromise blast radius amplification.
- **Remediation:** Enforced strict separation between `JWT_SECRET_KEY` (string secret) and `FERNET_ENCRYPTION_KEY` (urlsafe base64 32-byte key). In production (`ENVIRONMENT=production`), the application strictly raises a fatal error during startup if either key is missing, default, or malformed.
- **Verification:** `test_crypto.py` and `test_production_startup.py` pass cleanly.

### Finding S-06 (P2): Frontend Session Cookie Support
- **Location:** `frontend/src/services/api.ts`
- **Vulnerability:** Standard `fetch()` calls did not include credentials by default, failing to send HttpOnly cookies on cross-origin or serverless API routes.
- **Remediation:** Centralized API request handling to always specify `credentials: 'include'`. Updated `AuthContext.tsx` to automatically call `api.getMe()` on initial mount to validate active cookies even when `localStorage` is empty.
- **Verification:** Frontend test suite passed; tested cookie persistence across reloads.

---

## 3. Server-Side Allowlist Verification

The application maintains an immutable allowlist:
- `sivakumarelango10@gmail.com`
- `avishka.s@kalvium.com`

Testing verification:
```
backend/tests/test_auth.py::test_allowlisted_sivakumar_authenticates_successfully -> PASSED
backend/tests/test_auth.py::test_allowlisted_avishka_authenticates_successfully    -> PASSED
backend/tests/test_auth.py::test_unauthorized_google_account_is_denied           -> PASSED
```

When an unauthorized email (e.g. `intruder@kalvium.com` or `student@gmail.com`) submits valid Google tokens, the backend responds with HTTP 403 Forbidden and the exact error notice:
`"Access is restricted to the two authorized Ma’amAI accounts. Please sign in using an approved Google account."`

No database records, OAuth connections, or session tokens are created for unauthorized accounts.

---

## 4. Secret Hygiene and Git Auditing

- **`.gitignore`**: Configured to ignore `.env`, `.env.local`, `*.pem`, `*.key`, and credentials files.
- **Repository Verification**: Confirmed that `.env` is not tracked in Git.
- **Production Secrets**: Placeholders in `.env.example` contain non-functional templates without private keys or passwords.
