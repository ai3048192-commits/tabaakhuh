# Contract: Backend Auth API (consumed by the dashboard)

Feature: `001-admin-auth-session`. Source of truth: `admin-dashboard-api.md` Phase 1. This file restates only what the client depends on and how it reacts. The client does **not** implement these endpoints; it treats them as a fixed external contract (Assumption in spec.md).

Base URL: `import.meta.env.VITE_API_BASE_URL` (e.g. `https://<host>/api/v1`).
Common request headers: `Accept: application/json`, `Content-Type: application/json`.
Authenticated requests additionally send: `Authorization: Bearer <token>`.

Response envelope (all responses, success or failure):

```jsonc
{ "success": boolean, "data": object|array|null, "message": string, "errors": object|null }
```

---

## 1. `POST /auth/login`

Authenticate and obtain a bearer token. **Public** (no token). Backend-throttled (`login`, `login-ip`).

### Request body

```json
{ "identifier": "admin@tabbakha.com", "password": "secret123" }
```

| Field | Rules (server) | Client pre-checks |
|---|---|---|
| `identifier` | required, string (email or phone) | required, non-empty after trim (FR-003) |
| `password` | required, string | required, non-empty (FR-003) |

### Responses

| Status | Body shape | Client behaviour |
|---|---|---|
| `200` | `data.user` (see AccountProfile) + `data.token` (string) | If `data.user.role === "admin"`: store token + profile, go `authenticated` (FR-004, FR-006). Else: **do not store**; best-effort `POST /auth/logout` with `data.token`; show not-permitted notice, stay `unauthenticated` (FR-005). |
| `401` | `message: "Unauthenticated."` (bad credentials variant) | Generic credential error — do not reveal which field (FR-007, SC-006). |
| `422` | `message: "The given data was invalid."`, `errors: { identifier?: [...], password?: [...] }` | For the incorrect-credentials case: same single generic message; **do not** render `errors` field messages for login (FR-007). Missing-field 422 should not normally occur because the client blocks empty submits (FR-003). |
| `429` | throttle message | "Too many attempts, wait and try again" (FR-008); do not echo limits/counts. |
| `500` | `message: "Something went wrong. Please try again."` | Generic retryable message; stay on sign-in, no partial session (FR-010, FR-024). |
| network failure / non-JSON | — | Retryable "connection problem" message; no session created (FR-010). |

### Contract tests (integration, mocked `fetch`)

- 200 + `role:"admin"` ⇒ token persisted to `localStorage["tbk.admin.auth.token"]`, state `authenticated`, header shows `first_name last_name`.
- 200 + `role:"customer"|"cook"|"driver"` ⇒ nothing in `localStorage`, one `POST /auth/logout` fired with the returned token, not-permitted message visible, state `unauthenticated`.
- 401 ⇒ exactly the generic credential message; identifier/password fields not individually flagged.
- 422 with `errors` ⇒ still the generic message for login (no field echo).
- 429 ⇒ rate-limit message; no counts in text.
- 500 ⇒ generic try-again message; `localStorage` untouched.
- `fetch` rejects ⇒ connection message; `localStorage` untouched.
- Rapid double submit ⇒ exactly one `POST /auth/login` request (FR-009, SC-007).

---

## 2. `GET /auth/me`

Fetch the current account to rebuild the session on startup / re-validate. **Authenticated** (`Authorization: Bearer <token>`). No body.

### Responses

| Status | Body shape | Client behaviour |
|---|---|---|
| `200` | `data.user` (AccountProfile) | If `role === "admin"`: state `authenticated`, refresh cached profile (FR-012). Else: clear storage, best-effort `POST /auth/logout`, not-permitted notice, `unauthenticated` (FR-015). |
| `401` | `message: "Unauthenticated."` | Startup: discard stored token, show `/login`, **no** error toast (FR-014). Live session: end session, go `/login`, no broken view (FR-016). |
| `403` | not-admin message | Treat as not-permitted (defensive; primary gate is the `role` field). |
| `500` / network | — | Startup: show `/login`, no toast, but **retain** the token so the next startup retries (FR-014a). Live session: end session, `/login`, no broken view. |

### Contract tests

- No token in storage on boot ⇒ **no** `GET /auth/me` request; `/login` shown immediately (FR-013, SC — no failed background request).
- Token in storage on boot ⇒ `GET /auth/me` sent with `Authorization: Bearer <token>`; while pending, neither `/login` form nor dashboard content is rendered — only the loader (FR-017, SC-008).
- 200 role admin ⇒ dashboard shown, no credential prompt (FR-012, SC-002).
- 401 ⇒ `localStorage` token removed, `/login` shown, no toast asserted (FR-014).
- 500 / `fetch` reject at startup ⇒ `localStorage` token **retained**, `/login` shown, no toast (FR-014a).
- 200 role != admin ⇒ storage cleared, best-effort logout fired, not-permitted message (FR-015).
- 401 on a live authenticated request mid-session ⇒ state `unauthenticated`, redirected to `/login` (FR-016, SC-005).

---

## 3. `POST /auth/logout`

Invalidate the current token. **Authenticated**. Optional body.

### Request body (optional)

```json
{ "device_token": "fcm-token-optional" }
```

`device_token` is included only if the dashboard has one available; its absence must not block logout (Assumption). This dashboard has no push integration in this phase, so the body is normally omitted / `{}`.

### Responses

| Status | Body | Client behaviour |
|---|---|---|
| `200` | `{ success:true, data:null, message:"Logged out successfully.", errors:null }` | Proceed to `/login`. |
| `401` | token already invalid | Ignored — local session is cleared regardless (FR-020). |
| `500` / network | — | Ignored — local session is cleared regardless (FR-020, SC-004). |

Ordering: the client **clears `localStorage` and dispatches `SIGN_OUT` first**, then fires `POST /auth/logout` as best-effort. The user reaches `/login` without waiting on the response.

### Contract tests

- Sign-out ⇒ `localStorage` token+profile removed synchronously, `POST /auth/logout` sent with bearer header, `/login` shown (FR-019–021).
- `POST /auth/logout` rejects / 500 / 401 ⇒ user still ends on `/login`, `localStorage` still empty (FR-020, SC-004).
- After sign-out, browser back navigation to a dashboard route ⇒ `RequireAdmin` redirects to `/login`; no authenticated content painted (FR-021).
- Non-admin refusal path ⇒ `POST /auth/logout` is fired with the just-issued token and its failure does not change the not-permitted outcome (FR-005).
