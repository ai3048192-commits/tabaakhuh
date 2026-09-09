---
description: "Task list for Admin Authentication & Session"
---

# Tasks: Admin Authentication & Session

**Input**: Design documents from `/specs/001-admin-auth-session/`

**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md), [data-model.md](./data-model.md), [contracts/](./contracts/)

**Tests**: INCLUDED. The spec's user stories carry explicit acceptance scenarios and measurable criteria (SC-001…SC-009), and [quickstart.md](./quickstart.md) maps automated suites to requirements. Test tasks are written before the implementation they cover and must fail first.

**Organization**: Tasks are grouped by user story. Phases 1–2 are shared; Phases 3/4/5 are US1/US2/US3 and each is an independently testable increment.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependency on an incomplete task)
- **[Story]**: US1 / US2 / US3 (setup, foundational, polish carry no story label)
- Exact file paths are in every task

## Path Conventions

Single Vite SPA at repo root: source in `src/`, tests in `tests/`. Layout per [plan.md](./plan.md) "Project Structure".

⚠️ **Serialization point**: `src/auth/AuthContext.tsx` is edited by T017 (scaffold), then T022 (US1), T028–T030 (US2), T033 (US3). These edits touch the same file and are **not** `[P]` with each other — sequence them or coordinate a single owner.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Test tooling, environment config, and folder skeleton

- [X] T001 Add dev dependencies to `package.json` and install: `vitest`, `jsdom`, `@testing-library/react`, `@testing-library/user-event`, `@testing-library/jest-dom`, `vitest-axe` (run `npm install`)
- [X] T002 [P] Create `vitest.config.ts` at repo root (environment `jsdom`, `setupFiles: ["./tests/setup.ts"]`, globals enabled) and `tests/setup.ts` registering `@testing-library/jest-dom` and `vitest-axe` matchers
- [X] T003 [P] Add scripts to `package.json`: `"test": "vitest"` and `"test:run": "vitest run"`
- [X] T004 [P] Create `.env.example` at repo root with `VITE_API_BASE_URL=https://your-host/api/v1`, and add `.env` to `.gitignore`
- [X] T005 [P] Create empty directory structure: `src/api/`, `src/auth/`, `tests/unit/`, `tests/integration/`, `tests/a11y/` (add a `.gitkeep` where needed)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Transport layer, storage, state machine, provider scaffold, route guard, and app wiring — everything all three stories build on

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [X] T006 [P] Implement `ApiEnvelope<T>` interface, `ApiError` class (`status`, `fieldErrors`), and `parseEnvelope<T>(res)` (throws `ApiError` on `!res.ok` or `success === false`; non-JSON body → `ApiError(0, connectionMessage)`) in `src/api/envelope.ts`
- [X] T007 [P] Unit test envelope shapes and `ApiError` mapping (success / 422-with-errors / 401 / non-JSON) in `tests/unit/envelope.test.ts` — write first, must fail
- [X] T008 [P] Implement a tiny dev-only `logger` seam (console in dev, no-op in prod; documented to never receive request bodies for auth paths or the token) in `src/api/logger.ts`
- [X] T009 Implement `apiRequest<T>(path, opts)` and `setUnauthorizedHandler(fn)` in `src/api/httpClient.ts`: prepend `import.meta.env.VITE_API_BASE_URL`, set `Accept`/`Content-Type: application/json`, add `Authorization: Bearer <token>` when `opts.token` present, delegate to `parseEnvelope`, normalise `fetch` rejection to `ApiError(0, connectionMessage)`, invoke the unauthorized handler once on a `401` from a token-bearing request (depends on T006, T008)
- [X] T010 [P] Implement `STORAGE_KEYS`, `readToken()`, `readProfile()` (defensive JSON parse → `null`), `writeSession(token, profile)`, `clearSession()` (both keys together), and `subscribeExternalChange(cb)` over the `window` `storage` event filtered to `STORAGE_KEYS.token` in `src/auth/authStorage.ts`
- [X] T011 [P] Unit test `authStorage`: write/read round-trip, `clearSession` removes both keys, corrupt profile JSON yields `null`, `subscribeExternalChange` fires on a token-key `StorageEvent` and not on unrelated keys in `tests/unit/authStorage.test.ts` — write first, must fail
- [X] T012 Implement `authApi.login(identifier, password)`, `authApi.fetchMe(token)`, and `authApi.logout(token, deviceToken?)` (login/fetchMe propagate `ApiError`; logout swallows all errors and always resolves) in `src/auth/authApi.ts` (depends on T009)
- [X] T013 [P] Implement `AuthStatus`/`AuthState` types and the pure `authReducer(state, action)` covering every transition in the [data-model.md](./data-model.md) state table (RESTORE_OK/REJECTED/FORBIDDEN/NETWORK_ERROR, SIGNIN_* variants, SIGN_OUT, SESSION_LOST, EXTERNAL_CLEAR) in `src/auth/authMachine.ts`
- [X] T014 [P] Unit test `authReducer` — one assertion per row of the state/transition table, plus invariants (`authenticated ⟺ account !== null`; `notice` only with `unauthenticated`) in `tests/unit/authMachine.test.ts` — write first, must fail
- [X] T015 [P] Create Arabic RTL user-facing strings (`credentialError`, `rateLimited`, `notPermitted`, `serverError`, `networkError`, `identifierRequired`, `passwordRequired`) in `src/auth/messages.ts`
- [X] T016 [P] Create a neutral full-screen loading component (no authenticated-area branding, no login form) in `src/auth/FullScreenLoader.tsx`
- [X] T017 Implement `AuthProvider` + `useAuth()` scaffold in `src/auth/AuthContext.tsx`: `useReducer(authReducer)`, initial state from `readToken()` (`checking` if a token exists else `unauthenticated`, per FR-013), context value exposing `status`/`account`/`notice` and `signIn`/`signOut`/`clearNotice` as typed placeholders (no network branches yet) (depends on T010, T013, T015)
- [X] T018 Implement `RequireAdmin` in `src/auth/RequireAdmin.tsx`: `checking` → `<FullScreenLoader/>`, `unauthenticated` → `<Navigate to="/login" replace/>`, `authenticated` → `children` (FR-017, SC-008) (depends on T016, T017)
- [X] T019 Wire `src/App.tsx`: wrap the `<Routes>` subtree in `<AuthProvider>`, wrap the `"/*"` (`AdminLayout`) route element in `<RequireAdmin>`, and make `"/login"` redirect to `/dashboard` when `useAuth().status === "authenticated"` (depends on T017, T018)

**Checkpoint**: A signed-out visitor always lands on `/login`; every `/*` route is guarded; `npm run test:run` passes T007/T011/T014.

---

## Phase 3: User Story 1 - Administrator signs in to the dashboard (Priority: P1) 🎯 MVP

**Goal**: An administrator submits identifier + password and reaches the authenticated dashboard; non-admins and bad credentials are refused with the right messages; the token is persisted.

**Independent Test**: Load `/login` signed out, submit valid admin credentials → dashboard with real account details visible. Repeat with valid non-admin credentials → refused, no session, not-permitted message.

### Tests for User Story 1 ⚠️ (write first, must fail)

- [X] T020 [P] [US1] Integration test `tests/integration/sign-in.test.tsx` with mocked `fetch`: AC1 admin success (token in `localStorage`, state authenticated), AC2 non-admin refused (nothing stored, one `POST /auth/logout` with the returned token, not-permitted message) [SC-003], AC3 wrong creds → single generic message, no field blame [SC-006], AC4 empty fields blocked with per-field flags and no request [FR-003], AC5 `429` → rate-limit message with no counters [FR-008], AC6 rapid submit → submit disabled + exactly one `POST /auth/login` [SC-007], plus `500` and `fetch`-reject → retryable messages, nothing stored [FR-010]
- [X] T021 [P] [US1] Accessibility test `tests/a11y/login-a11y.test.tsx`: `vitest-axe` reports zero violations on the default, validation-error, server-error, and in-flight/loading states of `Login.tsx` [FR-027, SC-009]

### Implementation for User Story 1

- [X] T022 [US1] Implement `signIn(identifier, password)` in `src/auth/AuthContext.tsx`: dispatch busy, call `authApi.login`, on success check `account.role === "admin"` → `writeSession` + `authenticated`; non-admin → **no** storage write, best-effort `authApi.logout(token)`, set `notice: "not_permitted"`; map `ApiError.status` (401/422 → `bad_credentials`, 429 → `rate_limited`, 500 → `server_error`, 0 → `network_error`) to a discriminated `SignInResult`; never retain `password` after the call [FR-004, FR-005, FR-007, FR-008, FR-010, FR-025] (depends on T012, T017)
- [X] T023 [US1] Rewrite `src/pages/Login.tsx`: single `<form>` with `<label htmlFor>`↔`<input id>` pairs, `role="alert"` / `aria-live` error-summary region, `aria-invalid` + `aria-describedby` per field, submit `disabled` + `aria-busy` while in flight, focus moves to the error summary / first invalid field on failure and to the identifier field on mount, empty-field validation before submit, single-flight guard, call `useAuth().signIn` and render the message for each `SignInResult.reason` from `src/auth/messages.ts`; **remove** the "تذكرني" checkbox and "نسيت الباسورد؟" link [FR-001, FR-002, FR-003, FR-009, FR-027] (depends on T022, T015)
- [X] T024 [P] [US1] Update `src/components/Header.tsx` to render `useAuth().account` — `\`${first_name} ${last_name}\``, a localized role label, and `avatar_url` with the existing `User` icon as fallback — replacing the hardcoded "أحمد إسماعيل" / "مدير النظام" [FR-006] (depends on T017)
- [ ] T025 [US1] Run the quickstart US1 manual scenarios 1–7 in [quickstart.md](./quickstart.md) against a Phase 1 backend and record results (depends on T023, T024)

**Checkpoint**: User Story 1 is fully functional and independently testable — this is the MVP.

---

## Phase 4: User Story 2 - Session is restored when the dashboard is reopened (Priority: P2)

**Goal**: On reload/reopen, the dashboard silently rebuilds the session from the stored token via `GET /auth/me`; missing/expired/revoked/role-downgraded credentials return the administrator to `/login`; a mid-session `401` ends the session cleanly; clearing the credential in one tab drops the others.

**Independent Test**: Sign in, reload → authenticated area with no prompt and current details. Corrupt the stored token, reload → `/login`, no toast. Open two tabs, sign out in one → the other returns to `/login`.

### Tests for User Story 2 ⚠️ (write first, must fail)

- [X] T026 [P] [US2] Integration test `tests/integration/session-restore.test.tsx` with mocked `fetch`: AC1 valid token → one `GET /auth/me`, dashboard shown, no prompt [SC-002]; AC3 no token → **no** `GET /auth/me`, `/login` immediately [FR-013]; AC2 garbage token → `401` → token **removed**, `/login`, **no** error toast asserted [FR-014]; startup `500`/offline → token **retained**, `/login`, **no** error toast [FR-014a]; AC4 `me` returns role `customer` → storage cleared, best-effort `POST /auth/logout`, not-permitted message [FR-015]; AC5 mid-session `401` on an authed request → redirect to `/login`, no broken view [FR-016, SC-005]; loader-only render while `me` is pending, no login form / no dashboard flash [FR-017, SC-008]
- [X] T027 [P] [US2] Integration test `tests/integration/cross-tab.test.tsx`: dispatching a `storage` `StorageEvent` that removes `tbk.admin.auth.token` moves an `authenticated` app to `unauthenticated` / `/login` without a preceding failed request; a `StorageEvent` that changes the token to a new value re-enters `checking` [FR-026]

### Implementation for User Story 2

- [X] T028 [US2] Add the startup-restore effect to `src/auth/AuthContext.tsx`: when initial `status === "checking"`, call `authApi.fetchMe(readToken())` and dispatch `RESTORE_OK` (role admin — cache profile), `RESTORE_FORBIDDEN` (role ≠ admin — `clearSession` + best-effort `authApi.logout` + `notice`), `RESTORE_REJECTED` (`ApiError.status === 401` — `clearSession`, silent `/login`), or `RESTORE_UNCONFIRMED` (status 0 / 5xx — **retain token**, silent `/login`, retry on next startup) [FR-011, FR-012, FR-014, FR-014a, FR-015, FR-017] (depends on T017, T012)
- [X] T029 [US2] In `src/auth/AuthContext.tsx`, register `setUnauthorizedHandler` so a `401` from any token-bearing request while `authenticated` dispatches `SESSION_LOST` → `clearSession` + `unauthenticated` (the declarative `RequireAdmin` guard then redirects) [FR-016, SC-005] (depends on T028, T009)
- [X] T030 [US2] In `src/auth/AuthContext.tsx`, subscribe via `authStorage.subscribeExternalChange`: token removed elsewhere → dispatch `EXTERNAL_CLEAR` → `unauthenticated`; token replaced with a different value → re-enter `checking` with the new token; unsubscribe on unmount [FR-026] (depends on T028, T010)
- [ ] T031 [US2] Run the quickstart US2 scenarios 1–5 and the Cross-tab scenarios 1–3 in [quickstart.md](./quickstart.md) and record results (depends on T029, T030)

**Checkpoint**: User Stories 1 and 2 both work independently.

---

## Phase 5: User Story 3 - Administrator signs out (Priority: P3)

**Goal**: The administrator ends the session; local token + cached profile are removed regardless of the network result; `/login` is shown and the old session cannot be reached by back navigation; the server token is revoked.

**Independent Test**: Sign in, click sign-out → `/login`; `localStorage` auth keys gone; `POST /auth/logout` sent with the bearer token. Repeat offline → still signed out locally. Back button → still `/login`.

### Tests for User Story 3 ⚠️ (write first, must fail)

- [X] T032 [P] [US3] Integration test `tests/integration/sign-out.test.tsx` with mocked `fetch`: AC1 sign-out → both `localStorage` keys removed synchronously, `POST /auth/logout` sent with `Authorization: Bearer`, `/login` shown [FR-019, FR-020, FR-021]; AC3 `logout` rejects / `500` / `401` → still `/login`, storage still empty [FR-020, SC-004]; AC2 reload after sign-out → `/login`, no authenticated content flash; AC4/FR-021 back-navigation to a dashboard route → `RequireAdmin` redirects to `/login`

### Implementation for User Story 3

- [X] T033 [US3] Implement `signOut()` in `src/auth/AuthContext.tsx`: call `authStorage.clearSession()` and dispatch `SIGN_OUT` **first**, then fire best-effort `authApi.logout(token)` (no `await` blocking the transition); always resolves [FR-019, FR-020, FR-021, SC-004] (depends on T017, T012)
- [X] T034 [US3] Update `src/components/Sidebar.tsx`: replace the `<Link to="/">` "تسجيل الخروج" element with a `<button type="button">` that calls `useAuth().signOut()`, keeping the current icon and styling (depends on T033)
- [ ] T035 [US3] Run the quickstart US3 scenarios 1–5 in [quickstart.md](./quickstart.md) and record results (depends on T034)

**Checkpoint**: All three user stories are independently functional.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Security audit, docs, and full validation across stories

- [X] T036 [P] FR-025 audit: grep the codebase for logging of `password`/`token`; confirm the password lives only in `Login.tsx` component state for the form's lifetime and is only ever sent in the `POST /auth/login` body, and that `src/api/logger.ts` / `httpClient.ts` never emit bodies for auth paths or the token
- [ ] T042 [P] Measure and record cold-load startup-to-authenticated-view timing (`performance.now()` / Performance API, or manual) against SC-001's 15 s ceiling and the plan's < 2 s target; capture the numbers in the quickstart results [SC-001]
- [X] T037 [P] Update `README.md` with an auth section: `VITE_API_BASE_URL` setup from `.env.example`, `npm run test` / `npm run test:run`, and the `src/auth` + `src/api` module overview
- [ ] T038 Complete the SC-009 WCAG 2.1 AA manual checklist from [quickstart.md](./quickstart.md) (keyboard-only tab order + visible focus, screen-reader label/alert announcement, focus management, error-text and button colour contrast) and record sign-off
- [X] T039 Run `npm run test:run` — all unit / integration / a11y suites green
- [X] T040 Run `npm run build` — `tsc` + `vite build` clean; fix any `noUnusedLocals` / `noUnusedParameters` / `verbatimModuleSyntax` issues introduced
- [ ] T041 Execute the full [quickstart.md](./quickstart.md) validation end-to-end against a real Phase 1 backend and confirm the "Definition of done" list

### Deferred — require a running backend + browser + assistive tech

T025, T031, T035, T038, T041, T042 cannot be executed in the implementation sandbox (no Phase 1 backend, no real browser, no screen reader). Their behaviour is covered by the automated suites below; the manual passes remain outstanding and should be run against a deployed backend before release:

- **T025 / T031 / T035 / T041** — every acceptance scenario they enumerate is asserted with a mocked `fetch` in `tests/integration/sign-in.test.tsx`, `session-restore.test.tsx`, `cross-tab.test.tsx`, `sign-out.test.tsx` (57 tests, all green).
- **T038** — automated axe (`tests/a11y/login-a11y.test.tsx`) passes on the default / validation-error / server-error / in-flight states and asserts focus-on-mount. Still manual: keyboard tab-order walkthrough, screen-reader announcement, and colour-contrast (axe-core cannot check contrast under jsdom — `getContext` is unimplemented).
- **T042** — needs the app running against a real backend to time cold-load → authenticated view.

### Phase Dependencies

- **Setup (Phase 1)**: no dependencies — start immediately
- **Foundational (Phase 2)**: depends on Setup — **blocks all user stories**
- **User Stories (Phases 3–5)**: all depend on Phase 2. US1 → US2 → US3 by priority; can overlap if staffed, but every US2 and US3 implementation task edits `src/auth/AuthContext.tsx` (see serialization note)
- **Polish (Phase 6)**: depends on the user stories you intend to ship

### User Story Dependencies

- **US1 (P1)**: after Phase 2. No dependency on US2/US3.
- **US2 (P2)**: after Phase 2. Independent of US1 for testing (restore path can be exercised by seeding `localStorage`), but shares `AuthContext.tsx`.
- **US3 (P3)**: after Phase 2. Independent of US1/US2 for testing; shares `AuthContext.tsx`.

### Within Each User Story

- Test tasks (Txxx marked ⚠️) are written first and must fail before the implementation tasks in the same phase
- `AuthContext.tsx` behaviour before the component that consumes it (T022 before T023; T033 before T034)
- Manual quickstart task is last in each phase

### Parallel Opportunities

- Phase 1: T002, T003, T004, T005 in parallel after T001
- Phase 2: T006+T007, T008, T010+T011, T013+T014, T015, T016 all in parallel; then T009 (needs T006/T008), T012 (needs T009), T017 (needs T010/T013/T015), T018 (needs T016/T017), T019 (needs T017/T018)
- Phase 3: T020 and T021 in parallel; T024 in parallel with T022/T023 (different file)
- Phase 4: T026 and T027 in parallel; T028→T029→T030 are sequential (same file)
- Phase 5: T032 in parallel with nothing blocking; T033→T034 sequential
- Phase 6: T036, T037 in parallel; T038 independent; then T039, T040, T041

---

## Parallel Example: Phase 2 Foundational

```bash
# First wave (independent files):
Task: "Implement envelope + ApiError + parseEnvelope in src/api/envelope.ts"          # T006
Task: "Unit test envelope shapes in tests/unit/envelope.test.ts"                       # T007
Task: "Implement dev logger seam in src/api/logger.ts"                                 # T008
Task: "Implement authStorage.ts (keys, read/write/clear, subscribeExternalChange)"    # T010
Task: "Unit test authStorage in tests/unit/authStorage.test.ts"                        # T011
Task: "Implement authReducer + AuthState types in src/auth/authMachine.ts"            # T013
Task: "Unit test authReducer transitions in tests/unit/authMachine.test.ts"           # T014
Task: "Create Arabic strings in src/auth/messages.ts"                                  # T015
Task: "Create FullScreenLoader in src/auth/FullScreenLoader.tsx"                       # T016

# Then serially: T009 → T012 → T017 → T018 → T019
```

## Parallel Example: User Story 1

```bash
# Tests first, together:
Task: "Integration test sign-in flows in tests/integration/sign-in.test.tsx"           # T020
Task: "Accessibility test in tests/a11y/login-a11y.test.tsx"                            # T021

# Implementation: T022 then T023 (same concern), with T024 in parallel:
Task: "Update Header.tsx to show useAuth().account"                                     # T024
```

---

## Implementation Strategy

### MVP First (User Story 1 only)

1. Phase 1: Setup (T001–T005)
2. Phase 2: Foundational (T006–T019) — the guard alone already fixes the open `/*` routes
3. Phase 3: User Story 1 (T020–T025)
4. **STOP and VALIDATE**: real admin can sign in, non-admin is refused, token persists — demo-ready

### Incremental Delivery

1. Setup + Foundational → signed-out users are correctly gated to `/login`
2. + US1 → sign-in works (MVP)
3. + US2 → reload/reopen keeps the session; mid-session and cross-tab loss handled
4. + US3 → explicit sign-out with server revocation
5. Phase 6 → security audit, WCAG AA sign-off, full quickstart run

### Notes

- `[P]` = different files, no incomplete-task dependency
- Verify each ⚠️ test fails before writing its implementation
- Commit after each task or logical group
- `src/auth/AuthContext.tsx` is the one cross-phase file — coordinate edits
- Final copy for `src/auth/messages.ts` is TBD per spec Assumptions; placeholders are acceptable for implementation and tests
