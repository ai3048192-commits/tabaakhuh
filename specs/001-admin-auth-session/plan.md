# Implementation Plan: Admin Authentication & Session

**Branch**: `001-admin-auth-session` | **Date**: 2026-09-07 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/001-admin-auth-session/spec.md`

## Summary

Add real authentication and session handling to the existing Tabaakhuh admin dashboard (a client-only Vite + React + TypeScript SPA). Today `src/pages/Login.tsx` fakes a login with `setTimeout` and every `/*` route under `AdminLayout` is reachable unauthenticated. This feature wires the dashboard to the shared backend auth endpoints (`POST /auth/login`, `GET /auth/me`, `POST /auth/logout`) documented in `admin-dashboard-api.md` Phase 1: an administrator signs in with an identifier (email or phone) + password, the bearer token is persisted so the session survives reload and full browser restart, the session is silently rebuilt on startup from `GET /auth/me`, non-admin roles are refused (and their just-issued token invalidated), and sign-out clears local state and revokes the token. Cross-tab credential clearing propagates via the `storage` event, and the sign-in screen meets WCAG 2.1 AA.

Technical approach: a small `src/auth/` module (React context + reducer state machine `checking → authenticated | unauthenticated`), a `src/api/` fetch wrapper that attaches the bearer token, parses the standard `{success,data,message,errors}` envelope, and reports `401` back to the auth module, a `RequireAdmin` route guard, a rewritten `Login.tsx`, and minor edits to `App.tsx`, `Header.tsx`, `Sidebar.tsx`.

## Technical Context

**Language/Version**: TypeScript `~6.0` (`typescript` `~6.0.2` in package.json), compiled by Vite; `target` ES2023, `jsx: react-jsx`, `verbatimModuleSyntax: true`. Note: `@types/react` is on 19.x while the `react` runtime is 18.x — pre-existing, not touched by this feature.

**Primary Dependencies**: React 18, react-dom 18, react-router-dom 7, Tailwind CSS 4, lucide-react (icons). No HTTP client, no state-management library, no data-fetching library — all intentionally kept out; native `fetch` + React context are sufficient for this scope.

**Storage**: Browser `localStorage` for the bearer token and a cached account-profile snapshot (persists across reload + full browser restart per FR-006; cross-tab change detection via the `window` `storage` event per FR-026). No IndexedDB, no cookies.

**Testing**: Vitest + @testing-library/react + @testing-library/user-event + jsdom for unit/integration; `vitest-axe` (axe-core) for the WCAG checks in SC-009. `fetch` mocked per-test (no MSW needed for three endpoints). Added as devDependencies + a `test` script — none exist today.

**Target Platform**: Modern desktop browsers (Chromium, Firefox, Safari current). Single-page app served statically; RTL Arabic UI.

**Project Type**: Web — single frontend project (existing Vite SPA in `src/`). No backend work in this feature.

**Performance Goals**: Startup session validation (the `GET /auth/me` round trip gating first paint of authenticated content) completes well within the SC-001 15-second end-to-end budget; target < 2 s on a normal connection. No throughput concerns (single-user dashboard client).

**Constraints**:
- FR-017 / SC-008: no authenticated content may render before startup session validation resolves — the app shows a neutral full-screen loading state while `state === "checking"`.
- FR-025: the password is only ever read into the login request body; never logged, stored, or placed in component state longer than the form's lifetime.
- FR-007 / SC-006: a single generic credential error; never map `errors` field keys to identifier-vs-password hints for the incorrect-credentials case.
- WCAG 2.1 AA for the sign-in screen and all auth error/validation/loading states.
- Backend base URL comes from `import.meta.env.VITE_API_BASE_URL` (e.g. `https://<host>/api/v1`); committed `.env.example`, local `.env` git-ignored.

**Scale/Scope**: ~10 new source files under `src/auth/` and `src/api/`, 1 page rewrite (`Login.tsx`), 3 small edits (`App.tsx`, `Header.tsx`, `Sidebar.tsx`), ~3 test files. 27 functional requirements, 9 success criteria, 3 user stories (P1 sign-in, P2 restore, P3 sign-out).

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

`.specify/memory/constitution.md` is an unratified template — every principle and section is still a `[PLACEHOLDER]`. There are therefore **no project-specific constitutional gates to enforce**. The plan instead holds itself to the general principles the template gestures at:

| Principle (template intent) | How this plan complies |
|---|---|
| Test-First | Vitest harness added in the first task; each user story's acceptance scenarios become integration tests written before/with the implementation. |
| Simplicity / YAGNI | No new runtime dependencies. Native `fetch` + React context + a reducer; no Redux/Zustand/React Query/MSW. |
| Integration testing on contract boundaries | The `src/api` envelope parser and the three auth calls get integration tests against mocked `fetch` responses mirroring `admin-dashboard-api.md`. |
| Observability | Auth state transitions and non-2xx envelope failures are logged via a single tiny `logger` seam (console in dev); the password is explicitly excluded. |
| Versioning | N/A — no published library surface; app version stays `0.0.0`. |

**Result**: PASS (no violations; Complexity Tracking table left empty).

*Post-Phase 1 re-check*: PASS — design added zero dependencies and no extra projects; see [research.md](./research.md) decisions R1–R6.

## Project Structure

### Documentation (this feature)

```text
specs/001-admin-auth-session/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
│   ├── auth-api.md          # External: the 3 backend endpoints as consumed by the client
│   └── auth-module.md       # Internal: AuthProvider / useAuth surface, storage keys, events
├── checklists/
│   └── requirements.md  # Pre-existing spec-quality checklist
└── tasks.md             # Created later by /speckit-tasks
```

### Source Code (repository root)

```text
src/
├── api/
│   ├── envelope.ts          # ApiEnvelope<T> types; parseEnvelope(); ApiError with status + fieldErrors
│   └── httpClient.ts         # fetch wrapper: base URL, Accept/Content-Type, optional bearer,
│   │                         #   envelope parsing, network-error normalisation, onUnauthorized hook
├── auth/
│   ├── authStorage.ts        # get/set/clear token + cached profile in localStorage; STORAGE_KEYS;
│   │                         #   subscribe(cb) over the window "storage" event (cross-tab, FR-026)
│   ├── authApi.ts            # login(identifier,password) / fetchMe(token) / logout(token,deviceToken?)
│   ├── authMachine.ts        # pure reducer: {status, account} × actions → next state
│   ├── AuthContext.tsx       # <AuthProvider>: runs startup restore, exposes useAuth()
│   ├── RequireAdmin.tsx      # route guard: checking → loader, unauthenticated → <Navigate to="/login">
│   └── messages.ts           # Arabic user-facing strings (generic credential error, rate-limit, etc.)
├── components/
│   ├── Header.tsx            # EDIT: render useAuth().account name/role/avatar instead of hardcoded
│   └── Sidebar.tsx           # EDIT: "تسجيل الخروج" becomes a <button> calling useAuth().signOut()
├── pages/
│   └── Login.tsx             # REWRITE: real form, validation, states, a11y, calls useAuth().signIn()
├── App.tsx                  # EDIT: wrap Router children in <AuthProvider>; guard "/*" with <RequireAdmin>;
│                            #   redirect "/login" → "/dashboard" when already authenticated
└── main.tsx                 # unchanged

tests/
├── unit/
│   ├── envelope.test.ts          # success/error/validation envelope shapes; ApiError mapping
│   ├── authStorage.test.ts       # round-trip, clear, storage-event subscribe fires on key change
│   └── authMachine.test.ts       # every transition in the state table
├── integration/
│   ├── sign-in.test.tsx          # US1: admin ok, non-admin refused + token revoked, bad creds generic,
│   │                             #   empty fields blocked, 429 message, double-submit disabled
│   ├── session-restore.test.tsx  # US2: valid restore, no token, rejected token, role-downgrade, mid-session 401
│   ├── sign-out.test.tsx         # US3: logout clears + revokes, failure still clears, back-nav blocked
│   └── cross-tab.test.tsx        # FR-026: storage event in one tab drops the other to /login
└── a11y/
    └── login-a11y.test.tsx       # SC-009: axe on default / validation-error / server-error / loading

.env.example                 # VITE_API_BASE_URL=https://your-host/api/v1
vitest.config.ts             # jsdom env, setup file; or merged into vite.config.ts
```

**Structure Decision**: Keep the existing single Vite SPA. New code lands in two cohesive folders — `src/api/` (transport + envelope, reusable by later admin phases) and `src/auth/` (session state, guard, auth calls). Tests go in a new top-level `tests/` tree mirroring the spec's three user stories. No backend, no monorepo split, no new packages beyond dev-only test tooling.

## Complexity Tracking

*No constitutional violations — table intentionally empty.*
