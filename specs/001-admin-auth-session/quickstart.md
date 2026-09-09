# Quickstart & Validation: Admin Authentication & Session

Feature: `001-admin-auth-session` · Date: 2026-09-07

How to run the dashboard against the auth backend and verify every acceptance scenario from [spec.md](./spec.md). Design details live in [plan.md](./plan.md), [data-model.md](./data-model.md), and [contracts/](./contracts/).

---

## Prerequisites

- Node ≥ 20, the repo's `npm install` completed.
- A reachable backend implementing `admin-dashboard-api.md` Phase 1 (`POST /auth/login`, `GET /auth/me`, `POST /auth/logout`).
- Test accounts: one with `role: "admin"`, one with `role: "customer"` (or `cook`/`driver`).
- After implementation: dev test tooling installed (`vitest`, `@testing-library/*`, `vitest-axe`, `jsdom`).

## Setup

```bash
cp .env.example .env
# edit .env:
# VITE_API_BASE_URL=https://<your-host>/api/v1
npm install
npm run dev            # http://localhost:5173
```

## Automated checks

```bash
npm run test           # Vitest watch (unit + integration + a11y)
npm run test:run       # single pass, for CI
npm run build          # tsc + vite build must pass
```

Automated suites and the requirements they cover:

| Suite | File | Covers |
|---|---|---|
| Envelope parsing | `tests/unit/envelope.test.ts` | FR-023 |
| Storage + cross-tab event | `tests/unit/authStorage.test.ts` | FR-006, FR-026 |
| State machine transitions | `tests/unit/authMachine.test.ts` | FR-011–017, FR-005 |
| Sign-in flows | `tests/integration/sign-in.test.tsx` | US1 AC1–6, FR-003–010, SC-003, SC-006, SC-007 |
| Session restore | `tests/integration/session-restore.test.tsx` | US2 AC1–5, FR-011–017, SC-002, SC-005, SC-008 |
| Sign-out | `tests/integration/sign-out.test.tsx` | US3 AC1–4, FR-018–021, SC-004 |
| Cross-tab | `tests/integration/cross-tab.test.tsx` | FR-026 |
| Login a11y (axe) | `tests/a11y/login-a11y.test.tsx` | FR-027, SC-009 (automated portion) |

**Automated status (implementation sandbox, mocked `fetch`):** 8 files, **57 tests, all passing** via `npm run test:run`. `npm run build` is clean. Note: axe-core cannot evaluate colour contrast under jsdom, so SC-009 contrast + keyboard/screen-reader passes remain manual (below).

---

## Manual validation scenarios

Run against `npm run dev`. Use DevTools → Application → Local Storage to inspect `tbk.admin.auth.token` / `tbk.admin.auth.profile`, and the Network tab to count requests.

### US1 — Administrator signs in (P1)

1. **Happy path (AC1)** — visit `/`, go to `/login` while signed out. Enter valid **admin** identifier + password, submit. → Land in `/dashboard`; header shows the real name/role; `tbk.admin.auth.token` is set.
2. **Non-admin refused (AC2, SC-003)** — sign in with valid **customer** credentials. → Stay on `/login`; "not permitted" message; `localStorage` has **no** auth keys; Network shows a `POST /auth/logout` fired with the just-issued token.
3. **Wrong credentials (AC3, SC-006)** — unknown identifier or wrong password. → Single generic "بيانات الدخول غير صحيحة" message; neither field is individually blamed.
4. **Empty fields (AC4)** — submit with identifier and/or password blank. → No network request; each blank field flagged inline.
5. **Rate limited (AC5)** — force repeated failures until the backend returns `429` (or mock it). → "Too many attempts, wait" message; no numbers/counters in the text.
6. **In-flight lock (AC6, SC-007)** — submit valid admin creds and rapidly click submit / hold Enter. → Submit control disabled with a progress indicator; exactly **one** `POST /auth/login` in the Network tab.
7. **Network failure** — set DevTools Network to Offline, submit. → Retryable "connection problem" message; still on `/login`; no auth keys written.

### US2 — Session restored on reopen (P2)

1. **Restore (AC1, SC-002, SC-008)** — while signed in, reload. → Brief neutral loader, then `/dashboard`; **no** credential prompt; no flash of the login form or of dashboard content before the loader resolves. Network shows one `GET /auth/me`.
2. **No session (AC3)** — clear both `localStorage` keys, reload. → `/login` immediately; Network shows **no** `GET /auth/me`.
3. **Rejected credential (AC2)** — set `tbk.admin.auth.token` to a garbage value, reload. → Token removed from storage; `/login` shown; **no** error toast.
4. **Role downgraded (AC4)** — sign in as admin, then have the backend flip that account to non-admin (or mock `GET /auth/me` → role `customer`), reload. → `/login` with the "not permitted" message; storage cleared; best-effort `POST /auth/logout` fired.
5. **Session lost mid-use (AC5, SC-005)** — while on `/dashboard`, revoke the token server-side (or mock the next authed call → `401`), trigger any authenticated request. → Redirected to `/login`; no blank/broken screen.

### US3 — Administrator signs out (P3)

1. **Sign out (AC1)** — click "تسجيل الخروج" in the sidebar. → `POST /auth/logout` sent with the bearer token; both `localStorage` keys removed; `/login` shown.
2. **No flash on reload (AC2)** — after signing out, reload. → `/login`; no authenticated content briefly visible.
3. **Logout request fails (AC3, SC-004)** — go Offline, then sign out. → Still redirected to `/login`; `localStorage` still cleared.
4. **Prior session unusable (AC4)** — after sign-out, restore the old token value into `localStorage` and reload. → `GET /auth/me` returns `401` (token was revoked server-side) → `/login`. (If testing against a mock that doesn't revoke, this asserts only the client path.)
5. **Back navigation (FR-021)** — after sign-out, press the browser Back button toward a dashboard route. → `RequireAdmin` redirects to `/login`; no dashboard content painted.

### Cross-tab (FR-026)

1. Open `/dashboard` in **two** tabs, both signed in.
2. In tab A, sign out. → Tab B returns to `/login` promptly (on focus/next tick) without needing a manual reload and without a failed request first.
3. Reverse: in tab A, clear `tbk.admin.auth.token` via DevTools. → Tab B drops to `/login`.

### Accessibility — WCAG 2.1 AA (FR-027, SC-009)

Automated: `tests/a11y/login-a11y.test.tsx` must report **zero** axe violations on the default, validation-error, server-error, and loading states.

Manual sign-off checklist (run with keyboard only + a screen reader — VoiceOver/NVDA):

- [ ] Tab order: identifier → password → show/password toggle → submit; visible focus ring on each.
- [ ] Every input has a programmatically associated label (screen reader announces it on focus).
- [ ] Submitting empty: focus moves to the error/first invalid field; the message is announced.
- [ ] Wrong-credentials / rate-limit / server error: the message is announced via the `role="alert"` region without moving the pointer.
- [ ] Submit button announces its busy/disabled state while the request is in flight.
- [ ] Returning to `/login` after a refusal: focus lands on the identifier field.
- [ ] Colour contrast of error text and buttons meets AA (check the red `#7a0d0d` / error red against their backgrounds).

---

## Definition of done for this feature

- All Vitest suites green; `npm run build` clean.
- Every manual scenario above passes against a real Phase 1 backend.
- The a11y manual checklist is fully ticked and `vitest-axe` shows zero violations.
- No `remember me` / `forgot password` UI remains in `Login.tsx`; no hardcoded identity remains in `Header.tsx`; `/*` routes are unreachable while `unauthenticated`.
