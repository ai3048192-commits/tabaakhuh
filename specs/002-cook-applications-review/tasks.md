---
description: "Task list for Cook Applications Review"
---

# Tasks: Cook Applications Review

**Input**: Design documents from `/specs/002-cook-applications-review/`

**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md), [data-model.md](./data-model.md), [contracts/](./contracts/)

**Depends on**: Feature `001-admin-auth-session` implemented — this feature reuses its session, `src/api/` transport, `<RequireAdmin>` guard, and the `tests/` harness.

**Tests**: INCLUDED. The user stories carry explicit acceptance scenarios and measurable criteria (SC-001…SC-008), and [quickstart.md](./quickstart.md) maps automated suites to requirements. Test tasks are written before the implementation they cover and must fail first.

**Organization**: Tasks are grouped by user story. Phases 1–2 are shared; Phases 3/4/5 are US1/US2/US3 and each is an independently testable increment.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependency on an incomplete task)
- **[Story]**: US1 / US2 / US3 (setup, foundational, polish carry no story label)
- Exact file paths are in every task

## Path Conventions

Single Vite SPA at repo root: source in `src/`, tests in `tests/`. Layout per [plan.md](./plan.md) "Project Structure".

⚠️ **Serialization points** (same file edited across phases — not `[P]` with each other, sequence or single-owner):

- `src/cooks/useCookApplications.ts` — created T019 (US1 load/refresh/count), extended T027 (US2 `approve`), T033 (US3 `reject`)
- `src/cooks/CookApplicationCard.tsx` — created T021 (US1 view), extended T029 (US2 Approve button), T035 (US3 Reject button)
- `src/cooks/CookApplicationsPage.tsx` — created T022 (US1 list), extended T029 (US2 dialog+toasts), T035 (US3 dialog+toasts)
- `tests/a11y/cook-review-a11y.test.tsx` — created T017 (US1 surfaces), extended T026 (US2 `ApproveDialog`), T032 (US3 `RejectDialog`)
- `src/api/httpClient.ts` — one edit only, T004 (the `authedRequest` seam)

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Folder skeleton and test fixtures/helpers for the new endpoints. No new dependencies or env vars — `VITE_API_BASE_URL` and the Vitest/`vitest-axe` tooling from feature 001 are reused.

- [X] T001 [P] Create `src/cooks/` and `src/cities/` directories (add a `.gitkeep` in each until files land)
- [X] T002 [P] Extend `tests/helpers/fixtures.ts` with builders producing envelope-shaped payloads from `admin-dashboard-api.md`: `pendingCook(overrides?)` (a `cook_profile` object), `signedContract(overrides?)`, `pendingCooksResponse(entries)` (`GET /admin/cooks/pending` body), `approvedProfile(overrides?)` / `rejectedProfile(overrides?)` (decision 200 bodies), and `cityList(overrides?)` (`GET /admin/cities` body, active + inactive)
- [X] T003 [P] Extend `tests/helpers/harness.tsx` with `renderAtCooks({ cities?, pending? })` — seeds `localStorage` with a valid admin token + cached profile so `<RequireAdmin>` renders `AdminLayout`, mounts the router at `/cooks`, and installs the `fetchMock` with default replies for `GET /auth/me`, `GET /admin/cities`, and `GET /admin/cooks/pending`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: The authenticated-request seam, shared types, the API wrappers, city-name resolution, and message strings — everything all three stories build on.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [X] T004 Add `setTokenProvider(fn: (() => string | null) | null)` and `authedRequest<T>(path, opts)` to `src/api/httpClient.ts`: `authedRequest` reads the ambient token; when it is `null`/empty, throw `ApiError(0, 'No active session')` **without** calling `fetch`; otherwise delegate to `apiRequest<T>(path, { ...opts, token })` so envelope parsing, `ApiError`, and `401 → unauthorizedHandler` are inherited. Do **not** import from `src/auth/`. Leave `apiRequest` / `setUnauthorizedHandler` / `envelope.ts` / `logger.ts` untouched
- [X] T005 [P] Unit test `tests/unit/authedRequest.test.ts` — write first, must fail: attaches `Authorization: Bearer <token>` from the provider; when the provider returns `null` it throws the typed error and `fetch` is never called; a `401` response from a token-bearing `authedRequest` still invokes the registered `unauthorizedHandler` (FR-026)
- [X] T006 In `src/auth/AuthContext.tsx`, add an effect that calls `setTokenProvider(readToken)` on mount and `setTokenProvider(null)` on cleanup, alongside the existing `setUnauthorizedHandler` wiring (depends on T004)
- [X] T007 [P] Create `src/cooks/types.ts` — `CookApplication`, `SignedContract`, `PendingCookEntry`, `DocumentKind`, `DocumentRef`, `DecisionOutcome` per [data-model.md](./data-model.md) §1–2, §5 and [contracts/cook-review-ui.md](./contracts/cook-review-ui.md) §1
- [X] T008 [P] Create `src/cities/types.ts` — `City { id: number; name_ar: string; name_en: string; is_active: boolean }`
- [X] T009 [P] Implement `fetchCityDirectory()` in `src/cities/citiesApi.ts` — `GET /admin/cities` via `authedRequest`, reduce `data` to `Map<number, { name_ar; name_en }>` (keep inactive cities), memoise the resolved promise at module scope (one request per browser session); let rejection propagate (depends on T004, T008)
- [X] T010 [P] Implement `useCityNames()` in `src/cities/useCityNames.ts` — returns `{ resolve(cityId) => name_ar | String(cityId), ready: boolean, failed: boolean }`; on `fetchCityDirectory()` rejection set `failed = true` and have `resolve` return the raw id string for every id; never throws (FR-003 / FR-003a) (depends on T009)
- [X] T011 [P] Unit test `tests/unit/cityDirectory.test.ts` — write first, must fail: known id → `name_ar`; unknown id → raw string; fetch `500` / reject → `failed` true and raw ids for all; an `is_active: false` city still resolves to its name; mounting the hook repeatedly issues only one `GET /admin/cities` (module memo, research R5)
- [X] T012 [P] Implement `src/cooks/cooksApi.ts` — `listPendingCooks(signal?)` maps each raw `{ cook_profile, contract }` to `PendingCookEntry` (no sorting here); `approveCook(id)` → `POST /admin/cooks/{id}/approve` with **no body**; `rejectCook(id, reason)` → `POST /admin/cooks/{id}/reject` with body `{ reason }`. All three go through `authedRequest` and propagate `ApiError` unchanged (depends on T004, T007)
- [X] T013 [P] Create `src/cooks/messages.ts` — all Arabic RTL keys from [contracts/cook-review-ui.md](./contracts/cook-review-ui.md) §7: `queueEmpty`, `queueError`, `retry`, `awaitingCount(n)`, `noContractSigned`, `docUnavailable`, `approveConfirmTitle(store)`, `approveConfirmBody`, `rejectReasonLabel`, `rejectReasonRequired`, `rejectCounter(n)`, `approvedToast(store)`, `rejectedToast(store)`, `noLongerPendingToast`, `notFoundToast`, `decisionRetryToast`

**Checkpoint**: `authedRequest` seam wired; city resolution and all API wrappers ready; `npm run test:run` passes T005 and T011.

---

## Phase 3: User Story 1 - Administrator reviews the queue of pending cook applications (Priority: P1) 🎯 MVP

**Goal**: An administrator opens `/cooks` and sees every pending cook, ordered oldest-first, with resolved city names, all submitted details, an in-dashboard zoomable viewer for the four verification images and the signed contract, a clear "not signed" state, a count, an empty state, and a refresh — all behind the admin guard.

**Independent Test**: Sign in as admin, open `/cooks` → all pending cooks listed oldest-first with details and city names; open a document → in-dashboard overlay, zoom, keyboard-navigate, Esc; a `contract: null` cook shows "no contract signed yet"; an empty queue shows the empty state; Refresh reflects changes.

### Tests for User Story 1 ⚠️ (write first, must fail)

- [X] T014 [P] [US1] Unit test `tests/unit/sortQueue.test.ts`: signed entries before unsigned; earlier `contract.signed_at` first; equal `signed_at` → lower `profile.id` first; all-unsigned → ascending `profile.id`; `sortQueue` is pure (input not mutated) and idempotent on its own output (FR-011)
- [X] T015 [P] [US1] Integration test `tests/integration/cook-review-list.test.tsx` with mocked `fetch` via `renderAtCooks`: AC1 queue rendered oldest-first + visible count, approved/rejected never shown (FR-002 / FR-008 / FR-011); AC2 every detail field incl. resolved city name, plus raw-id fallback for a `city_id` absent from `cityList` (FR-003 / FR-003a); AC3 clicking a document tile opens an in-dashboard overlay (route unchanged), `←`/`→` move across the application's documents, `Esc` closes and focus returns to the tile (FR-004 / FR-004a); FR-005 a `null` document URL renders an "unavailable" tile and the card is still actionable; AC4 contract version + signed date shown and "open contract" opens it in the overlay; AC5 `contract: null` → "no contract signed yet" (FR-007); AC6 `[]` → empty state, count "0" (FR-009); AC7 Refresh re-issues `GET /admin/cooks/pending` and reflects added/decided entries (FR-010); FR-011a the list is a plain render with no pagination controls; FR-029 a `500` / offline queue load shows a screen-level error with a working Retry
- [X] T016 [P] [US1] Integration test `tests/integration/cook-review-session.test.tsx`: a `401` response to `GET /admin/cooks/pending` invokes the feature-inherited `unauthorizedHandler` → session cleared → redirect to `/login`, no broken view (FR-026)
- [X] T017 [P] [US1] Accessibility test `tests/a11y/cook-review-a11y.test.tsx`: `vitest-axe` reports zero violations on the list, a single card, `DocumentViewer` (image state and contract state), the empty state, and the error state; a keyboard-only pass opens the viewer, navigates between documents, zooms (`+`/`-`/`0`), and closes it (FR-030, SC-008)

### Implementation for User Story 1

- [X] T018 [P] [US1] Implement the pure `sortQueue(entries)` in `src/cooks/sortQueue.ts` — comparator key `[entry.contract ? 0 : 1, entry.contract?.signed_at ?? '', entry.profile.id]` compared field by field; returns a new array; total order so results are stable across calls (FR-011)
- [X] T019 [US1] Implement `useCookApplications()` in `src/cooks/useCookApplications.ts` — on mount and on `refresh()` call `listPendingCooks()` → `sortQueue` → `entries`; expose `status: 'loading' | 'ready' | 'error'`, `entries`, `count` (= `entries.length`), `cardState(id)` backed by a `Map<number, 'idle'|'confirming'|'submitting'|'error'>`, `openConfirm(id, kind)` / `closeConfirm(id)`, and `approve` / `reject` as typed placeholders that throw "not implemented" (filled in US2/US3); `refresh()` preserves scroll position; all state is dropped on unmount (FR-008 / FR-009 / FR-010 / FR-011 / FR-028 / FR-029) (depends on T012, T018)
- [X] T020 [US1] Implement `DocumentViewer` in `src/cooks/DocumentViewer.tsx` — portal overlay `role="dialog"` `aria-modal="true"` labelled by the current doc's `label`; image docs render `<img referrerPolicy="no-referrer" alt={label}>` in a pan/zoom area with CSS-transform zoom 1×–4× (buttons + `+`/`-`/`0`, arrow-key pan when zoomed); `kind === 'contract'` renders `<iframe title="signed contract" src={url}>` with an "open in new tab" link shown on load failure/timeout; `url === null` → "document unavailable" panel; `Esc` closes, `ArrowLeft`/`ArrowRight` change index (RTL-aware), focus trapped while open and restored to the invoking element on close; keeps no `Blob`/objectURL/dataURL/storage copy of any document (FR-004 / FR-004a / FR-005 / FR-028 / FR-030) (depends on T007, T013)
- [X] T021 [US1] Implement `CookApplicationCard` in `src/cooks/CookApplicationCard.tsx` — props per [contracts/cook-review-ui.md](./contracts/cook-review-ui.md) §6; render `store_name`, `bio`, `cityName`, `area`, `address_text`, `delivery_radius_km`, open/closed from `is_open`, and `rating_avg` + `rating_count`; four document tiles (`loading="lazy"`; `null` URL or load error → "unavailable" tile; click → `onView(documents(entry), index)`); contract block with `template_version` + formatted `signed_at` + "open contract" (→ `onView`) when `entry.contract`, else "no contract signed yet"; render Approve/Reject as disabled placeholder buttons (wired in US2/US3) (FR-003 / FR-005 / FR-006 / FR-007) (depends on T007, T013, T020)
- [X] T022 [US1] Implement `CookApplicationsPage` in `src/cooks/CookApplicationsPage.tsx` — compose `useCookApplications()` + `useCityNames()`; `status === 'loading'` → loader (no cards); `status === 'error'` → error panel + Retry calling `refresh()` (FR-029); `ready && count === 0` → empty state (FR-009); otherwise a header showing `awaitingCount(count)` (FR-008) + a Refresh control (FR-010) + `entries.map(e => <CookApplicationCard key={e.profile.id} entry={e} cityName={resolve(e.profile.city_id)} .../>)` as one plain list, no virtualization (FR-011a); own an `aria-live` toast region and portal-mount the active `DocumentViewer` (FR-001) (depends on T019, T021)
- [X] T023 [US1] In `src/App.tsx`, change the `/cooks` route element from `<CooksManagement />` to `<CookApplicationsPage />` (import swap); leave `src/pages/CooksManagement.tsx` in the tree but unrouted (FR-001) (depends on T022)
- [ ] T024 [US1] Run the quickstart US1 manual scenarios 1–10 and the "Session loss" scenario in [quickstart.md](./quickstart.md) against a Phase 2 + `GET /admin/cities` backend and record results (depends on T023)

**Checkpoint**: User Story 1 is fully functional and independently testable — this is the MVP. Approve/Reject buttons are visible but inert.

---

## Phase 4: User Story 2 - Administrator approves a cook application (Priority: P2)

**Goal**: After reviewing, the administrator approves via an explicit confirmation; the card leaves the queue with a success toast; an already-decided or missing application is reconciled out with an informative message; transient failures leave the card in place for a retry.

**Independent Test**: With a pending card on screen, click Approve → Cancel (no request); click Approve → Confirm (card removed, toast); force `422`/`404` (card removed + info + refetch); force `500`/offline (card stays + retry toast).

### Tests for User Story 2 ⚠️ (write first, must fail)

- [X] T025 [P] [US2] Integration test `tests/integration/cook-approve.test.tsx` with mocked `fetch`: AC6 cancelling the confirm dialog sends **zero** `POST …/approve` and the card stays (FR-013); AC1 confirm → exactly one `POST /admin/cooks/{id}/approve` with the bearer header and no body, card removed without reload, success toast names the store (FR-014, SC-002); AC2 while in flight both card controls are `disabled` / `aria-busy` and rapid clicks still send one request (FR-015, SC-005); AC3 `422` (not pending) → card removed, info toast text = envelope `message`, a follow-up `GET /admin/cooks/pending` is issued (FR-022, SC-004); AC4 `404` → card removed, "not found" toast, refetch (FR-023); AC5 `500` / `fetch` reject → card remains, retryable toast, controls re-enabled, no local "approved" state (FR-024); a `200` with unreadable `data` still removes the card and shows success (FR-025)
- [X] T026 [P] [US2] Extend `tests/a11y/cook-review-a11y.test.tsx` — `ApproveDialog`: `vitest-axe` clean; focus moves into the dialog on open, is trapped, and returns to the triggering button on close; `Esc` / Cancel dismiss with no request; the result is announced via the page `aria-live` region (FR-030) *(same file as T017 — sequence after it)*

### Implementation for User Story 2

- [X] T027 [US2] Implement `approve(id)` in `src/cooks/useCookApplications.ts` — set `cardState(id) = 'submitting'`; call `approveCook(id)`; classify the result: `200` → delete the entry and its `cardState` key, return `{ ok: true, storeName }`; `ApiError.status === 404` → delete entry + `refresh()`, return `{ ok: false, reason: 'not_found' }`; `=== 422` → delete entry + `refresh()`, return `{ ok: false, reason: 'not_pending', message: err.message }`; `=== 0` or `>= 500` → keep entry, `cardState(id) = 'error'`, return `{ ok: false, reason: 'transient' }`; never observe `401` (FR-014 / FR-022 / FR-023 / FR-024 / FR-025) (depends on T019, T012) *(same file as T019, T033)*
- [X] T028 [P] [US2] Implement `ApproveDialog` in `src/cooks/ApproveDialog.tsx` — props per [contracts/cook-review-ui.md](./contracts/cook-review-ui.md) §6; focus-trapped `role="dialog"` with the store name, a warning line, and Confirm / Cancel; `Esc` / Cancel → `onCancel` and no request (FR-013); Confirm disabled while `busy` (FR-012 / FR-030) (depends on T013)
- [X] T029 [US2] Wire approve into `src/cooks/CookApplicationCard.tsx` (enable the Approve button → `props.onApprove`; when `state === 'submitting'` disable **both** Approve and Reject with `aria-busy` — FR-015) and `src/cooks/CookApplicationsPage.tsx` (on Approve → `openConfirm(id, 'approve')` and render `<ApproveDialog busy={cardState(id)==='submitting'} onConfirm={() => approve(id).then(toastFor)} onCancel={() => closeConfirm(id)} />`; `toastFor` maps `DecisionOutcome` → `approvedToast(store)` / `noLongerPendingToast` (or envelope `message`) / `notFoundToast` / `decisionRetryToast`) (depends on T027, T028) *(Card + Page files also touched by US1 and US3)*
- [ ] T030 [US2] Run the quickstart US2 scenarios 1–6 in [quickstart.md](./quickstart.md) and record results (depends on T029)

**Checkpoint**: User Stories 1 and 2 both work independently.

---

## Phase 5: User Story 3 - Administrator rejects a cook application with a reason (Priority: P3)

**Goal**: The administrator rejects with a mandatory reason (1–1000 chars, enforced before the request); the card leaves the queue with a success toast; the typed reason survives a transient failure; already-decided applications reconcile out.

**Independent Test**: With a pending card, open Reject → submit blocked on empty/whitespace and on >1000 chars; submit a valid reason → card removed with the reason sent; force `500` → dialog stays open with the reason intact.

### Tests for User Story 3 ⚠️ (write first, must fail)

- [X] T031 [P] [US3] Integration test `tests/integration/cook-reject.test.tsx` with mocked `fetch`: AC1–2 an empty or whitespace-only reason keeps Submit `disabled`, shows "reason required", and sends **zero** `POST …/reject` (FR-017, SC-003); AC3 pasting 1500 chars is capped at 1000 (counter `1000 / 1000`) and a request never carries more than 1000 (FR-018); AC4 a valid reason → exactly one `POST /admin/cooks/{id}/reject` with body `{ "reason": <text> }` and the bearer header, card removed, success toast (FR-019); AC6 `500` / offline → dialog stays open, `reason` value unchanged, retryable toast, Submit re-enabled (FR-020, FR-024); AC5 `422` (not pending) → card removed, info toast = envelope `message`, refetch (FR-022); assert across the file that every reject request sent carries a non-empty `reason` (SC-003)
- [X] T032 [P] [US3] Extend `tests/a11y/cook-review-a11y.test.tsx` — `RejectDialog`: `vitest-axe` clean; the `<textarea>` has an associated label; the character counter is exposed via `aria-describedby`; the "reason required" state is announced; focus trapped and restored (FR-030) *(same file as T017/T026 — sequence after T026)*

### Implementation for User Story 3

- [X] T033 [US3] Implement `reject(id, reason)` in `src/cooks/useCookApplications.ts` — identical outcome classification to `approve` (T027) but calling `rejectCook(id, reason)`; assume the caller pre-validated the reason; on the `transient` branch keep the entry so `RejectDialog` can stay mounted (FR-019 / FR-020 / FR-022 / FR-023 / FR-024 / FR-025) (depends on T019, T012) *(same file as T019, T027)*
- [X] T034 [P] [US3] Implement `RejectDialog` in `src/cooks/RejectDialog.tsx` — props per [contracts/cook-review-ui.md](./contracts/cook-review-ui.md) §6; focus-trapped `role="dialog"` with a `<textarea maxLength={1000}>` and a live `count / 1000` bound via `aria-describedby`; Submit disabled unless `reason.trim().length >= 1` (FR-017) and `reason.length <= 1000` (FR-018); local `reason` state is **not** cleared when a submit fails (dialog stays as `busy` returns to false) so the text is preserved (FR-020); focus trapped and restored (FR-016 / FR-030) (depends on T013)
- [X] T035 [US3] Wire reject into `src/cooks/CookApplicationCard.tsx` (enable the Reject button → `props.onReject`) and `src/cooks/CookApplicationsPage.tsx` (on Reject → `openConfirm(id, 'reject')` and render `<RejectDialog busy={cardState(id)==='submitting'} onSubmit={(reason) => reject(id, reason).then(outcome => { if (outcome.reason === 'transient') keepOpen(); else closeAndToast(outcome); })} onCancel={() => closeConfirm(id)} />`; toast mapping → `rejectedToast(store)` / `noLongerPendingToast` (or envelope `message`) / `notFoundToast` / `decisionRetryToast`) (depends on T033, T034) *(Card + Page files also touched by US1 and US2)*
- [ ] T036 [US3] Run the quickstart US3 scenarios 1–5 in [quickstart.md](./quickstart.md) and record results (depends on T035)

**Checkpoint**: All three user stories are independently functional.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Sensitive-document audit, docs, performance and accessibility sign-off, full validation.

- [X] T037 [P] FR-028 / SC-007 audit: grep `src/cooks/` and `src/cities/` for `createObjectURL`, `localStorage` / `sessionStorage` / `indexedDB` / `caches`, `data:` URLs, and any `logger` call carrying a document URL; confirm `DocumentViewer` only ever sets `src` to a URL from the API response and that `useCookApplications` state (which holds those URLs) is released when `/cooks` unmounts; record findings in the quickstart results
- [X] T038 [P] Update `README.md` with a "Cook applications review" section: the `/cooks` screen, the `src/cooks/` + `src/cities/` module overview, the `setTokenProvider` / `authedRequest` seam in `src/api/httpClient.ts`, and the `GET /admin/cities` read dependency
- [X] T039 [P] SC-006a: render `cook-review-list` with a ~200-entry `pendingCooksResponse` fixture; measure time from data arrival to an interactive list and check scroll smoothness; record the numbers against the 3 s / no-stutter bar
- [ ] T040 Complete the SC-008 WCAG 2.1 AA manual checklist in [quickstart.md](./quickstart.md) (keyboard tab order + visible focus, document alt text, `DocumentViewer` + dialog focus management, `aria-live` announcements of toasts and the "no longer awaiting review" / "not found" messages, colour contrast of buttons / toasts / "unavailable" / "no contract" states) and record sign-off
- [X] T041 Run `npm run test:run` — all unit / integration / a11y suites green
- [X] T042 Run `npm run build` — `tsc` + `vite build` clean; fix any `noUnusedLocals` / `noUnusedParameters` / `verbatimModuleSyntax` issues introduced
- [ ] T043 Execute the full [quickstart.md](./quickstart.md) validation end-to-end against a real Phase 2 + `GET /admin/cities` backend and confirm the "Definition of done" list

### Deferred — require a running backend + browser + assistive tech

T024, T030, T036, T039, T040, T043 cannot be executed without a live Phase 2 backend, a real browser, or a screen reader. Every acceptance scenario they enumerate is also asserted with a mocked `fetch` in the `tests/integration/*` and `tests/a11y/*` suites; the manual passes remain outstanding and should be run against a deployed backend before release. axe-core cannot evaluate colour contrast under jsdom, so that part of SC-008 stays in T040.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: no dependencies — start immediately
- **Foundational (Phase 2)**: depends on Setup — **blocks all user stories**
- **User Stories (Phases 3–5)**: all depend on Phase 2. Priority order US1 → US2 → US3; they can overlap if staffed, but US2 and US3 each extend `useCookApplications.ts`, `CookApplicationCard.tsx`, and `CookApplicationsPage.tsx` created in US1 (see serialization points)
- **Polish (Phase 6)**: depends on the user stories you intend to ship

### User Story Dependencies

- **US1 (P1)**: after Phase 2. No dependency on US2/US3. Delivers the reviewable queue (MVP).
- **US2 (P2)**: after Phase 2 **and** US1 (extends the US1 hook/card/page). Independently testable via `cook-approve.test.tsx`.
- **US3 (P3)**: after Phase 2 **and** US1. Independent of US2 for testing (`cook-reject.test.tsx`); both touch the same three files, so sequence US2 then US3 or coordinate one owner.

### Within Each User Story

- Test tasks (⚠️) are written first and must fail before the implementation tasks in the same phase
- `useCookApplications` / API wrappers before the components that consume them (T019 before T021/T022; T027 before T029; T033 before T035)
- `DocumentViewer` (T020) before `CookApplicationCard` (T021)
- The manual quickstart task is last in each phase

### Parallel Opportunities

- **Phase 1**: T001, T002, T003 all parallel
- **Phase 2**: T004 first; then T005, T007, T008, T012, T013 parallel; T009 after T004/T008; T010 after T009; T011 after T010; T006 after T004
- **Phase 3**: T014, T015, T016, T017 parallel (tests); T018 parallel with the tests; then T019 → (T020 → T021) → T022 → T023 → T024
- **Phase 4**: T025, T026 parallel; T028 parallel with T027; then T029 → T030
- **Phase 5**: T031, T032 parallel; T034 parallel with T033; then T035 → T036
- **Phase 6**: T037, T038, T039 parallel; T040 independent; then T041 → T042 → T043

---

## Parallel Example: Phase 2 Foundational

```bash
# T004 first (the seam), then this wave (independent files):
Task: "Unit test authedRequest in tests/unit/authedRequest.test.ts"                 # T005
Task: "Create src/cooks/types.ts"                                                   # T007
Task: "Create src/cities/types.ts"                                                  # T008
Task: "Implement src/cooks/cooksApi.ts (list/approve/reject via authedRequest)"     # T012
Task: "Create src/cooks/messages.ts (all Arabic keys)"                              # T013

# Then serially for the cities module: T009 → T010 → T011 ; and T006 (AuthContext wiring)
```

## Parallel Example: User Story 1

```bash
# Tests first, together:
Task: "Unit test sortQueue in tests/unit/sortQueue.test.ts"                          # T014
Task: "Integration test the review queue in tests/integration/cook-review-list.test.tsx"   # T015
Task: "Integration test 401 handling in tests/integration/cook-review-session.test.tsx"    # T016
Task: "Accessibility test in tests/a11y/cook-review-a11y.test.tsx"                   # T017

# Implementation: T018 parallel with the tests, then the component chain:
Task: "Implement pure sortQueue in src/cooks/sortQueue.ts"                           # T018
# then T019 → T020 → T021 → T022 → T023
```

---

## Implementation Strategy

### MVP First (User Story 1 only)

1. Phase 1: Setup (T001–T003)
2. Phase 2: Foundational (T004–T013)
3. Phase 3: User Story 1 (T014–T024)
4. **STOP and VALIDATE**: an administrator can open `/cooks`, review every pending application, inspect all documents and contracts, and refresh — demo-ready

### Incremental Delivery

1. Setup + Foundational → seam and wrappers ready
2. + US1 → the reviewable queue (MVP)
3. + US2 → approve with confirmation and queue reconciliation
4. + US3 → reject with a mandatory reason
5. Phase 6 → sensitive-doc audit, performance + WCAG AA sign-off, full quickstart run

### Notes

- `[P]` = different files, no incomplete-task dependency
- Verify each ⚠️ test fails before writing its implementation
- Commit after each task or logical group
- `useCookApplications.ts`, `CookApplicationCard.tsx`, `CookApplicationsPage.tsx`, and `tests/a11y/cook-review-a11y.test.tsx` are the cross-phase files — coordinate edits across US1/US2/US3
- Final Arabic copy for `src/cooks/messages.ts` is descriptive per the spec Assumptions; placeholders are acceptable for implementation and tests
