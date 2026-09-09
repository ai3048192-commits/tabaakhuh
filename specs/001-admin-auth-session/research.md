# Phase 0 Research: Admin Authentication & Session

Feature: `001-admin-auth-session` · Date: 2026-09-07

All Technical Context unknowns below are resolved. No open `NEEDS CLARIFICATION` remain.

---

## R1. Credential storage mechanism (FR-006, FR-026)

**Decision**: Store the bearer token and a small cached account-profile JSON snapshot in `localStorage` under namespaced keys (`tbk.admin.auth.token`, `tbk.admin.auth.profile`). Detect cross-tab changes with a `window.addEventListener("storage", …)` listener in `AuthProvider`.

**Rationale**:
- The clarification session fixed persistence to survive a full browser restart → `localStorage` (not `sessionStorage`, which dies with the tab/session).
- The `storage` event fires in *other* same-origin tabs whenever a key is written or removed — this is exactly the primitive FR-026 needs for "sign-out in one tab drops the others", with zero extra dependency (`BroadcastChannel` would also work but is redundant here).
- A cached profile snapshot lets the UI paint the header immediately on restore while `GET /auth/me` re-validates in the background; the network result is still authoritative.
- Token is a Sanctum plain-text string (`"12|xxxx…"` per `admin-dashboard-api.md`), so no serialization concerns.

**Alternatives considered**:
- *`sessionStorage`* — rejected: contradicts the "survives browser restart" clarification.
- *`httpOnly` cookie* — rejected: requires backend/CORS changes that are explicitly out of scope; the API is documented as `Authorization: Bearer` header only.
- *In-memory only* — rejected: fails FR-006 (no reload survival).
- *IndexedDB* — rejected: overkill for two string values; synchronous `localStorage` keeps startup simpler.

**XSS note**: `localStorage` tokens are readable by injected script. Accepted for this phase — it is the only mechanism compatible with the fixed header-bearer contract and out-of-scope backend. Mitigations in scope: never `dangerouslySetInnerHTML` in auth screens, keep the token out of logs (FR-025-style discipline extended to the token), rely on backend token expiry/revocation.

---

## R2. Session state model (FR-011–FR-017)

**Decision**: A three-state machine held in a `useReducer` inside `AuthProvider`:

| State | Meaning | UI |
|---|---|---|
| `checking` | startup restore in flight (a stored token exists and `GET /auth/me` has not resolved) | full-screen neutral loader; **no** authenticated content, **no** login form |
| `authenticated` | `me` confirmed role `admin`; `account` populated | dashboard (`/*`) |
| `unauthenticated` | no token, or token rejected, or role ≠ admin, or signed out | `/login` |

Initial state is `checking` **iff** a token is present in storage, otherwise `unauthenticated` (FR-013 — no background request, immediate sign-in screen).

**Rationale**: Directly satisfies FR-017 / SC-008 (nothing authenticated renders during `checking`). A single enum avoids the "briefly authenticated then bounced" flespecially class of bugs. Reducer is a pure function → trivially unit-testable (`authMachine.test.ts`).

**Alternatives considered**: boolean `isAuthenticated` + `isLoading` pair — rejected: representable invalid combos (`isAuthenticated && isLoading`), and harder to guarantee the "no flash" rule.

---

## R3. HTTP layer & response envelope (FR-022, FR-023, FR-024)

**Decision**: One `httpClient` function wrapping `fetch`:
- prepends `import.meta.env.VITE_API_BASE_URL`;
- sets `Accept: application/json`, `Content-Type: application/json`;
- attaches `Authorization: Bearer <token>` when a token argument is passed;
- always parses the body as the envelope `{ success, data, message, errors }`;
- on `!response.ok` **or** `success === false`, throws `ApiError { status, message, fieldErrors }` where `fieldErrors` is the `errors` object (or `null`);
- normalises fetch rejections / non-JSON bodies to `ApiError { status: 0, message: <generic connection message> }` (FR-010, FR-024);
- accepts an `onUnauthorized` callback invoked on `status === 401` so the auth module can end the live session (FR-016).

**Status-code handling table** (from `admin-dashboard-api.md` §0):

| Status | Meaning | Client behaviour |
|---|---|---|
| `200` | OK | resolve with `data` |
| `401` | missing/invalid token | login: generic credential error (FR-007). live session: end session → `/login` (FR-016). startup: discard token → `/login`, no toast (FR-014) |
| `403` | authenticated but not admin | treat as not-permitted (defensive; primary role gate is `data.user.role`) |
| `422` | validation / bad credentials | login: generic credential error (do **not** disclose field, FR-007). other: surface `errors` field messages (FR-023) |
| `429` | throttled | rate-limit "wait and try again" message (FR-008); do not echo limits/counters |
| `500` | unexpected | generic "please try again" (FR-024); state stays consistent |
| network / offline | — | retryable connection message (FR-010); no partial session |

**Rationale**: Three endpoints do not justify MSW or a client library. A single throwing wrapper gives every caller uniform error semantics and one place to enforce "never leak which credential field was wrong".

**Alternatives considered**: `axios` (interceptors) — rejected: new dependency for what ~60 lines of `fetch` covers; `axios` error shape still needs normalising.

---

## R4. Role gate & non-admin token revocation (FR-005, FR-015)

**Decision**:
- After `POST /auth/login` succeeds, read `data.user.role`. If `!== "admin"`: do **not** persist anything, fire `POST /auth/logout` with the just-received token on a best-effort basis (ignore its result / errors), then set state `unauthenticated` with the not-permitted message.
- On startup restore, if `GET /auth/me` returns role `!== "admin"`: clear storage, best-effort `POST /auth/logout` with that token, show not-permitted message.
- "Best-effort" = fire-and-forget with a `.catch(() => {})`; it never blocks the UI transition or changes the outcome (per clarification + FR-005 last sentence).

**Rationale**: The clarification chose active invalidation over letting the token expire, closing the dangling-credential window. Making it non-blocking keeps the refused-user experience instant and keeps FR-005/FR-024 consistency guarantees.

**Alternatives considered**: awaiting logout before showing the message — rejected: adds latency and a failure mode to a security-refusal path for no user benefit.

---

## R5. Route protection & redirects (FR-001, FR-012, FR-021, US2/US3)

**Decision**:
- Wrap the `Router` subtree in `<AuthProvider>`.
- New `<RequireAdmin>` wraps the `"/*"` (`AdminLayout`) route: `checking` → `<FullScreenLoader>`; `unauthenticated` → `<Navigate to="/login" replace>`; `authenticated` → render children.
- `"/login"` route: when `authenticated`, `<Navigate to="/dashboard" replace>` (prevents seeing the form while signed in and handles post-login redirect).
- Sign-out and any `onUnauthorized` set state `unauthenticated`; because the guard is declarative, the dashboard unmounts in the same render → no stale authenticated view, no back-button access (FR-021) since navigation uses `replace` and the guard re-evaluates on every route.

**Rationale**: react-router v7 is already the router. Declarative guard = the "session lost mid-use" and "signed out in another tab" cases are handled by one code path (state change → re-render → redirect), matching FR-016 and FR-026 without imperative navigation scattered around.

**Alternatives considered**: per-page `useEffect` redirects — rejected: race-prone, easy to miss a page, causes content flashes.

---

## R6. Testing & accessibility tooling (SC-009, all ACs)

**Decision**: Add devDependencies: `vitest`, `@vitest/coverage-v8` (optional), `jsdom`, `@testing-library/react`, `@testing-library/user-event`, `@testing-library/jest-dom`, `vitest-axe`. Add `"test": "vitest"` (and `"test:run": "vitest run"`) to `package.json`. Config via `vitest.config.ts` (jsdom environment, `setupFiles` registering jest-dom + axe matchers). Mock `globalThis.fetch` per test with hand-built envelope fixtures mirroring `admin-dashboard-api.md`.

**Accessibility approach for WCAG 2.1 AA (FR-027)**:
- Native `<form>` with `<label htmlFor>` bound to each `<input id>` (current `Login.tsx` labels are not associated).
- Error summary region with `role="alert"` / `aria-live="assertive"` for the generic credential error, the rate-limit message, and the server-error message; per-field messages referenced via `aria-describedby` and `aria-invalid`.
- Submit button `disabled` + `aria-busy="true"` while in flight; visible focus rings (Tailwind `focus-visible:` utilities) not removed.
- On validation failure, move focus to the error summary (or first invalid field); on return to `/login` after refusal, focus the identifier input.
- `vitest-axe` assertion (`expect(await axe(container)).toHaveNoViolations()`) on each Login visual state; a manual keyboard-only pass is listed in `quickstart.md` for the SC-009 sign-off.

**Rationale**: Vitest aligns with the Vite toolchain (shared config, ESM, fast). `vitest-axe` gives automated AA coverage for the measurable SC-009 target; the residual manual checks (focus order, screen-reader announcement) are scripted in quickstart.

**Alternatives considered**: Jest — rejected: needs separate Babel/ts config against a Vite project. Playwright e2e — deferred: valuable later but heavier than this feature needs; integration tests with a mocked fetch cover every acceptance scenario.

---

## Resolved Technical Context summary

| Field | Value |
|---|---|
| Storage | `localStorage`, keys `tbk.admin.auth.token` / `tbk.admin.auth.profile`, cross-tab via `storage` event |
| Session model | reducer state machine `checking → authenticated \| unauthenticated` |
| HTTP | single `fetch` wrapper, throwing `ApiError`, `onUnauthorized` hook, env base URL |
| Role gate | `data.user.role === "admin"`; non-admin → best-effort `POST /auth/logout` |
| Routing | `<AuthProvider>` + `<RequireAdmin>` guard on `/*`, `replace` redirects |
| Testing | Vitest + Testing Library + `vitest-axe`; mocked `fetch` |
| Config | `VITE_API_BASE_URL` (`.env.example` committed, `.env` ignored) |
