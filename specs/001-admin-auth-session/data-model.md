# Phase 1 Data Model: Admin Authentication & Session

Feature: `001-admin-auth-session` · Date: 2026-09-07

This is a client-only feature. "Entities" here are the in-memory/stored shapes the dashboard holds — not database tables. Field names mirror the backend payloads in `admin-dashboard-api.md` Phase 1.

---

## 1. AccountProfile

The authenticated administrator's account, as returned in `data.user` by `POST /auth/login` and `GET /auth/me`.

| Field | Type | Source | Notes |
|---|---|---|---|
| `id` | `number` | `data.user.id` | Stable unique id. |
| `first_name` | `string` | `data.user.first_name` | |
| `last_name` | `string` | `data.user.last_name` | |
| `email` | `string` | `data.user.email` | |
| `phone` | `string` | `data.user.phone` | E.164-ish, e.g. `+201000000000`. |
| `role` | `string` | `data.user.role` | **Access gate.** Must be exactly `"admin"` (spec text says "administrator"; API value is `"admin"`). Any other value ⇒ refuse. |
| `status` | `string` | `data.user.status` | e.g. `"active"`. Displayed; not currently a gate. |
| `email_verified` | `boolean` | `data.user.email_verified` | Displayed only. |
| `avatar_url` | `string \| null` | `data.user.avatar_url` | Optional; UI falls back to an icon. |

**Validation / rules**
- `role === "admin"` is the sole access condition (FR-005, FR-015). Checked on every login and every startup restore.
- Treated as read-only by the client. No mutation endpoints in this phase.
- A snapshot MAY be cached in `localStorage` (`tbk.admin.auth.profile`) to paint the header instantly on restore; the `GET /auth/me` response always overwrites it.
- Derived: `displayName = \`${first_name} ${last_name}\`.trim()`.

**Relationships**: 1:1 with the active `SessionCredential` for the lifetime of a session.

---

## 2. SessionCredential

The bearer token representing the authenticated session.

| Field | Type | Source | Notes |
|---|---|---|---|
| `token` | `string` | `data.token` from `POST /auth/login` | Laravel Sanctum plain-text token, format `"<id>|<40+ chars>"`. Opaque to the client. |

**Storage**
- Persisted at `localStorage["tbk.admin.auth.token"]` (FR-006 — survives reload + browser restart).
- Attached as `Authorization: Bearer <token>` to `GET /auth/me`, `POST /auth/logout`, and every future authenticated admin request (FR-022).
- Removed from storage on: sign-out (FR-020), `401` on any authenticated request (FR-014, FR-016), role-not-admin on restore (FR-015).
- Never logged, never shown in UI, never sent anywhere except the `Authorization` header of same-origin API calls.

**Lifecycle**

```
        POST /auth/login 200 + role==admin
none ─────────────────────────────────────────▶ stored
stored ── sign-out (FR-019/020) ─────────────▶ none   (+ best-effort POST /auth/logout)
stored ── any authed request → 401 ──────────▶ none   (FR-014 startup / FR-016 live)
stored ── GET /auth/me → role != admin ──────▶ none   (FR-015, + best-effort logout)
stored ── storage event: key removed in tab B ─▶ none in tab A (FR-026)
```

There is **no client-side expiry timer** (clarification: no inactivity auto-logout). The client only reacts to backend `401`s.

**Non-admin login exception**: when `POST /auth/login` succeeds but `role != "admin"`, a `token` is returned but is **never stored**; the client fires a best-effort `POST /auth/logout` with it and drops it (FR-005).

---

## 3. AuthState (in-memory, `AuthProvider` reducer)

The single source of truth for what the app renders. Not persisted (rebuilt on every load).

| Field | Type | Notes |
|---|---|---|
| `status` | `"checking" \| "authenticated" \| "unauthenticated"` | See state table below. |
| `account` | `AccountProfile \| null` | Non-null iff `status === "authenticated"`. |
| `notice` | `"not_permitted" \| null` | Set when a non-admin was refused (login or restore); shown on the sign-in screen; cleared on next sign-in attempt. |

**Initial state**
- token present in storage → `{ status: "checking", account: null, notice: null }`
- no token → `{ status: "unauthenticated", account: null, notice: null }` (FR-013)

**State / transition table**

| From | Action | To | Side effects |
|---|---|---|---|
| `checking` | `RESTORE_OK(account)` (me 200, role admin) | `authenticated` | cache profile snapshot |
| `checking` | `RESTORE_REJECTED` (me 401/invalid) | `unauthenticated` | clear storage; **no** toast (FR-014) |
| `checking` | `RESTORE_FORBIDDEN` (me ok, role≠admin) | `unauthenticated` + `notice: not_permitted` | clear storage; best-effort logout (FR-015) |
| `checking` | `RESTORE_UNCONFIRMED` (me 5xx / network / timeout) | `unauthenticated` | **retain token**; no error toast; next startup retries the restore (FR-014a) |
| `unauthenticated` | `SIGNIN_START` | `unauthenticated` (form shows busy) | clear `notice`; disable submit (FR-009) |
| `unauthenticated` | `SIGNIN_OK(account, token)` (role admin) | `authenticated` | store token + profile |
| `unauthenticated` | `SIGNIN_BAD_CREDENTIALS` (401/422) | `unauthenticated` | generic error message (FR-007) |
| `unauthenticated` | `SIGNIN_RATE_LIMITED` (429) | `unauthenticated` | rate-limit message (FR-008) |
| `unauthenticated` | `SIGNIN_FORBIDDEN` (200, role≠admin) | `unauthenticated` + `notice: not_permitted` | best-effort logout; nothing stored (FR-005) |
| `unauthenticated` | `SIGNIN_SERVER_ERROR` (500) | `unauthenticated` | generic "try again" (FR-010/024) |
| `unauthenticated` | `SIGNIN_NETWORK_ERROR` | `unauthenticated` | retryable "connection problem" (FR-010) |
| `authenticated` | `SIGN_OUT` (user action) | `unauthenticated` | clear storage first; best-effort `POST /auth/logout`; then `/login` (FR-019–021) |
| `authenticated` | `SESSION_LOST` (401 on a live request) | `unauthenticated` | clear storage; `/login`, no broken view (FR-016) |
| `authenticated` | `EXTERNAL_CLEAR` (storage event: token key removed/changed) | `unauthenticated` | drop in-memory account; `/login` (FR-026) |
| `authenticated` | `EXTERNAL_CLEAR` where new token value present & differs | re-run `checking` restore with new token | supports another tab signing in as a different admin |

**Invariants**
- `status === "authenticated"` ⟺ `account !== null` ⟺ a token exists in storage (except the sub-second window during `SIGN_OUT`/`SESSION_LOST` where storage is cleared before the reducer dispatch — dispatch is synchronous immediately after).
- No render path shows `AdminLayout` content while `status === "checking"` (FR-017, SC-008).
- `notice` is only ever set alongside `status === "unauthenticated"`.

---

## 4. SignInFormModel (component-local, `Login.tsx`)

Ephemeral; never persisted (FR-025).

| Field | Type | Validation (client, pre-request) |
|---|---|---|
| `identifier` | `string` | required, non-empty after trim (FR-003). No email/phone format enforcement — server decides (Assumptions; API rule is just "required, string"). |
| `password` | `string` | required, non-empty (FR-003). Never trimmed, never logged, never stored; cleared on unmount and on successful sign-in. |
| `showPassword` | `boolean` | UI toggle only. |
| `submitting` | `boolean` | mirrors `AuthState` signin-in-flight; disables submit + sets `aria-busy` (FR-009). |
| `fieldErrors` | `{ identifier?: string; password?: string }` | populated only by the empty-field check; per-field, `aria-describedby` + `aria-invalid` (FR-027). |
| `formError` | `string \| null` | the single generic credential / rate-limit / server / network message; rendered in a `role="alert"` region (FR-007, FR-027). |

Note: the current `Login.tsx` also has a `remember` checkbox and a "forgot password" link — both are **removed** (out of scope per Assumptions: no "remember me", no password reset; storage is always persistent now).

---

## Storage keys (single source)

| Key | Value | Written by | Cleared by |
|---|---|---|---|
| `tbk.admin.auth.token` | raw bearer token string | sign-in success (admin) | sign-out, 401, role-downgrade |
| `tbk.admin.auth.profile` | `JSON.stringify(AccountProfile)` | sign-in success, restore success | same as token |

Both keys are always written/cleared **together**; the `storage` event handler keys off `tbk.admin.auth.token`.
