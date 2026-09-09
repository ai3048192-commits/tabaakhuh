---
description: "Task list for Driver Applications Review"
---

# Tasks: Driver Applications Review

**Input**: Design documents from `/specs/003-driver-applications-review/`

**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md), [data-model.md](./data-model.md), [contracts/](./contracts/)

**Depends on**: Features `001-admin-auth-session` and `002-cook-applications-review` implemented — this feature reuses their session, the `src/api/` transport (`authedRequest` / `setTokenProvider`, already added in Phase 2), the `<RequireAdmin>` guard, the `src/cities/` directory module (unchanged), and the `tests/` harness.

**Tests**: INCLUDED. The user stories carry explicit acceptance scenarios and measurable criteria (SC-001…SC-010), and [quickstart.md](./quickstart.md) maps automated suites to requirements. Test tasks are written before the implementation they cover and must fail first.

**Organization**: Tasks are grouped by user story. Phases 1–2 are shared; Phases 3/4/5 are US1/US2/US3 and each is an independently testable increment.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependency on an incomplete task)
- **[Story]**: US1 / US2 / US3 (setup, foundational, polish carry no story label)
- Exact file paths are in every task

## Path Conventions

Single Vite SPA at repo root: source in `src/`, tests in `tests/`. Layout per [plan.md](./plan.md) "Project Structure".

⚠️ **Serialization points** (same file touched across phases — not `[P]` with each other; sequence or single-owner):

- `src/drivers/useDriverApplications.ts` — created T016 (US1 load/refresh/count), extended T023 (US2 `approve`), T029 (US3 `reject`)
- `src/drivers/DriverApplicationCard.tsx` — created T017 (US1 view), extended T025 (US2 Approve button), T031 (US3 Reject button)
- `src/drivers/DriverApplicationsPage.tsx` — created T018 (US1 list), extended T025 (US2 dialog+toasts), T031 (US3 dialog+toasts)
- `tests/a11y/driver-review-a11y.test.tsx` — created T014 (US1 surfaces), extended T022 (US2 `ApproveDialog`), T028 (US3 `RejectDialog`)
- `src/App.tsx` + `src/components/Sidebar.tsx` — one edit each, T019 (new `/drivers` route + sidebar entry)
- `src/cooks/DocumentViewer.tsx` / `src/cooks/DialogShell.tsx` / `src/cooks/messages.ts` — touched only in T004/T006 (the `src/review/` promotion); no behaviour change

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Folder skeleton and test fixtures/helpers for the new endpoints. No new dependencies or env vars — `VITE_API_BASE_URL` and the Vitest/`vitest-axe` tooling are reused.

- [X] T001 [P] Create `src/drivers/` and `src/review/` directories (add a `.gitkeep` in each until files land)
- [X] T002 [P] Extend `tests/helpers/fixtures.ts` with builders producing envelope-shaped payloads from `admin-dashboard-api.md` Phase 3: `pendingDriver(overrides?)` (a flat driver object with `id`, `vehicle_type`, `vehicle_model`, `vehicle_year`, `vehicle_color`, `vehicle_plate_no`, `vehicle_plate_letters`, `national_id_front_url`, `national_id_back_url`, `license_url`, `city_id`, `birth_date`, `is_available`, `submitted_at`, `approval_status: 'pending'`, `rejection_reason: null`, `rating_avg`, `rating_count`), `pendingDriversResponse(drivers)` (`GET /admin/drivers/pending` body — a plain array in `data`), and `approvedDriver(overrides?)` / `rejectedDriver(overrides?)` (decision 200 bodies with the updated `approval_status`). Reuse the existing `ok` / `fail` / `cityList` helpers
- [X] T003 [P] Extend `tests/helpers/harness.tsx` with `renderAtDrivers({ cities?, pending? })` — seeds `localStorage` with a valid admin token + cached profile so `<RequireAdmin>` renders `AdminLayout`, mounts the router at `/drivers`, and installs the `fetchMock` with default replies for `GET /auth/me`, `GET /admin/cities`, and `GET /admin/drivers/pending`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Promote the two generic review components into `src/review/`, then add the driver-specific shared types, API wrappers, and message strings that all three stories build on. The Phase 1 `authedRequest` seam and the Phase 2 `src/cities/` module are consumed as-is — no tasks to build them.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [X] T004 Move `src/cooks/DialogShell.tsx` verbatim to `src/review/DialogShell.tsx` (no code change — it already takes only `label` / `onDismiss` / `children`). Replace `src/cooks/DialogShell.tsx` with a one-line re-export: `export { default } from '../review/DialogShell'`
- [X] T005 [P] Create `src/review/messages.ts` exporting `reviewMessages` with the viewer-chrome keys currently living in `src/cooks/messages.ts`: `viewerClose`, `viewerPrev`, `viewerNext`, `viewerZoomIn`, `viewerZoomOut`, `viewerZoomReset`, `docUnavailable`, `openInNewTab`, `docContract` (Arabic, RTL — copy the existing values)
- [X] T006 Move `src/cooks/DocumentViewer.tsx` to `src/review/DocumentViewer.tsx`: its chrome strings now default to `reviewMessages` (add an optional `strings?: Partial<typeof reviewMessages>` prop that shallow-merges over the default); keep both the image path and the `kind === 'contract'` `<iframe>` + new-tab-fallback path. Replace `src/cooks/DocumentViewer.tsx` with `export { default } from '../review/DocumentViewer'`, and in `src/cooks/messages.ts` re-export the moved keys from `reviewMessages` (or repoint the two internal `src/cooks` call sites) so Phase 2 source compiles unchanged (depends on T004, T005)
- [X] T007 Regression gate: run `npm run test:run` and confirm every existing Phase 1/2 suite (`tests/integration/cook-*.test.tsx`, `tests/a11y/cook-review-a11y.test.tsx`, all `tests/unit/*`) still passes with **zero** code changes beyond the moved import paths; run `npm run build` and confirm `tsc` + `vite build` are clean (depends on T006)
- [X] T008 [P] Create `src/drivers/types.ts` — `DriverApplication`, `DriverDocumentKind`, `DocumentRef`, `DecisionOutcome` (5-variant union incl. `validation`), `CardStatus` per [data-model.md](./data-model.md) §1–5 and [contracts/driver-review-ui.md](./contracts/driver-review-ui.md) §1
- [X] T009 [P] Implement `src/drivers/driversApi.ts` — `listPendingDrivers(signal?)` returns `data` as `DriverApplication[]` directly (no wrapper mapping, no sort here); `approveDriver(id)` → `POST /admin/drivers/{id}/approve` with **no body**; `rejectDriver(id, reason)` → `POST /admin/drivers/{id}/reject` with body `{ reason }`. All three go through `authedRequest` and propagate `ApiError` unchanged (depends on T008)
- [X] T010 [P] Create `src/drivers/messages.ts` — all Arabic RTL keys from [contracts/driver-review-ui.md](./contracts/driver-review-ui.md) §6: `pageTitle`, `awaitingCount(n)`, `loading`, `queueError`, `retry`, `refresh`, `empty`, `docIdFront`, `docIdBack`, `docLicense`, `fieldVehicle`, `fieldPlate`, `fieldCity`, `fieldBirthDate`, `fieldSubmittedAt`, `available`, `unavailable`, `rating(avg, count)`, `approve`, `reject`, `approveTitle(label)`, `approveBody`, `confirmApprove`, `cancel`, `rejectTitle(label)`, `rejectReasonLabel`, `rejectReasonRequired`, `rejectCounter(n)`, `confirmReject`, `approvedToast`, `rejectedToast`, `noLongerPendingToast`, `notFoundToast`, `decisionRetryToast` (reuse `reviewMessages.docUnavailable` for the "document unavailable" string)

**Checkpoint**: `src/review/` shared; Phase 2 still green (T007); driver types, API wrappers, and messages ready.

---

## Phase 3: User Story 1 - Administrator reviews the queue of pending driver applications (Priority: P1) 🎯 MVP

**Goal**: An administrator opens `/drivers` (via a new sidebar entry) and sees every pending driver, ordered oldest-first by `submitted_at`, with resolved city names, all submitted identity and vehicle details (missing fields shown as `—`, birth date display-only), an in-dashboard zoomable viewer for the three verification images, a count, loading and empty states, and a refresh — all behind the admin guard.

**Independent Test**: Sign in as admin, open `/drivers` → all pending drivers listed oldest-first by submission date with details and city names; two same-timestamp entries ordered by `id`; open a document → in-dashboard overlay, zoom, keyboard-navigate the three docs, Esc; an empty queue shows the empty state; a slow load shows the loader; Refresh reflects changes; a non-admin is refused.

### Tests for User Story 1 ⚠️ (write first, must fail)

- [X] T011 [P] [US1] Unit test `tests/unit/driverSortQueue.test.ts`: earlier `submitted_at` first; equal `submitted_at` → lower `id` first; `sortQueue` is pure (input not mutated) and idempotent on its own output; empty array → empty array (FR-010, SC-010)
- [X] T012 [P] [US1] Integration test `tests/integration/driver-review-list.test.tsx` with mocked `fetch` via `renderAtDrivers`: AC1 queue rendered oldest-first by `submitted_at` + visible count, approved/rejected never shown (FR-002 / FR-006 / FR-010); two entries with equal `submitted_at` render in ascending `id` order, identical across two loads (SC-010); AC2 every identity/vehicle field incl. resolved city name, plus raw-id fallback for a `city_id` absent from `cityList` (FR-003 / FR-003a); a missing/empty `vehicle_plate_letters` renders `—` and the card stays actionable (FR-003b); `birth_date` renders as a date with no age text (FR-003c); AC3 clicking a document tile opens an in-dashboard overlay (route unchanged), `←`/`→` move across id-front → id-back → licence, `Esc` closes and focus returns to the tile (FR-004 / FR-004a); FR-005 a `null` `license_url` renders an "unavailable" tile and the card is still actionable; AC4 `[]` → empty state, count "0" (FR-007); loading → loader distinct from empty (FR-008); AC5 Refresh re-issues `GET /admin/drivers/pending` and reflects added/decided entries (FR-009); FR-011 the list is a plain render with no pagination controls; FR-032 a `500` / offline queue load shows a screen-level error with a working Retry
- [X] T013 [P] [US1] Integration test `tests/integration/driver-review-session.test.tsx`: a `401` response to `GET /admin/drivers/pending` invokes the inherited `unauthorizedHandler` → session cleared → redirect to `/login`, no broken view (FR-028)
- [X] T014 [P] [US1] Accessibility test `tests/a11y/driver-review-a11y.test.tsx`: `vitest-axe` reports zero violations on the list, a single card, `DocumentViewer` (image state and unavailable state), the loading state, the empty state, and the error state; a keyboard-only pass opens the viewer, navigates between the three documents, zooms (`+`/`-`/`0`), and closes it with focus restored (FR-034, SC-009)

### Implementation for User Story 1

- [X] T015 [P] [US1] Implement the pure `sortQueue(entries)` in `src/drivers/sortQueue.ts` — comparator key `[entry.submitted_at, entry.id]` compared field by field (`submitted_at` as ISO string, `id` numeric); returns a new array; total order so results are stable across calls (FR-010)
- [X] T016 [US1] Implement `useDriverApplications()` in `src/drivers/useDriverApplications.ts` — on mount and on `refresh()` call `listPendingDrivers()` → `sortQueue` → `entries`; expose `status: 'loading' | 'ready' | 'error'` (a failed **initial** load → `error`; a failed `refresh()` keeps the shown list — FR-032), `entries`, `count` (= `entries.length`), `cardState(id)` backed by a `Map<number, CardStatus>`, `confirming`, `openConfirm(id, kind)` / `closeConfirm(id)`, and `approve` / `reject` as typed placeholders that throw "not implemented" (filled in US2/US3); `refresh()` preserves scroll position; all state is dropped on unmount (FR-006 / FR-008 / FR-009 / FR-010 / FR-031) (depends on T009, T015)
- [X] T017 [US1] Implement `DriverApplicationCard` in `src/drivers/DriverApplicationCard.tsx` — props per [contracts/driver-review-ui.md](./contracts/driver-review-ui.md) §5; render driver `id`, `vehicle_type`, `vehicle_model`, `vehicle_year`, `vehicle_color`, `vehicle_plate_no` + `vehicle_plate_letters`, `cityName`, formatted `birth_date` (date only, no age — FR-003c), `is_available` (available/unavailable), formatted `submitted_at`, and `rating_avg` + `rating_count`; every missing/empty field → `—` (FR-003b); three document tiles for `id_front` / `id_back` / `license` (`loading="lazy"`; `null` URL or load error → "unavailable" tile; click → `onView(documents(entry), index)` where `documents(entry)` = `[{id_front},{id_back},{license}]`); render Approve/Reject as disabled placeholder buttons (wired in US2/US3) (FR-003 / FR-005) (depends on T008, T010, T006)
- [X] T018 [US1] Implement `DriverApplicationsPage` in `src/drivers/DriverApplicationsPage.tsx` — compose `useDriverApplications()` + `useCityNames()` (from `src/cities/`); `status === 'loading'` → loader, no cards (FR-008); `status === 'error'` → error panel + Retry calling `refresh()` (FR-032); `ready && count === 0` → empty state (FR-007); otherwise a header showing `awaitingCount(count)` (FR-006) + a Refresh control (FR-009) + `entries.map(e => <DriverApplicationCard key={e.id} entry={e} cityName={resolve(e.city_id)} .../>)` as one plain list, no virtualization (FR-011); own an `aria-live` toast region and portal-mount the active `DocumentViewer` from `src/review/` (FR-001) (depends on T016, T017)
- [X] T019 [US1] Add the route and nav entry: in `src/App.tsx` add `<Route path="/drivers" element={<DriverApplicationsPage />} />` inside `AdminLayout`'s `<Routes>` (it is already wrapped by `<RequireAdmin>` — FR-029); in `src/components/Sidebar.tsx` add a `menuItems` entry `{ name: 'طلبات السائقين', icon: Bike, path: '/drivers' }` (`Bike` is already imported). Leave `src/pages/DeliveryPage.tsx` and the `/delivery` entry untouched (FR-001 / FR-033) (depends on T018)
- [ ] T020 [US1] Run the quickstart US1 manual scenarios 1–10 and the "Session loss" scenario in [quickstart.md](./quickstart.md) against a Phase 3 + `GET /admin/cities` backend and record results (depends on T019)

**Checkpoint**: User Story 1 is fully functional and independently testable — this is the MVP. Approve/Reject buttons are visible but inert.

---

## Phase 4: User Story 2 - Administrator approves a driver application (Priority: P2)

**Goal**: After reviewing, the administrator approves via an explicit confirmation; the card leaves the queue with a success toast; an already-decided or missing application is reconciled out with an informative message; transient failures leave the card in place for a retry.

**Independent Test**: With a pending card on screen, click Approve → Cancel (no request); click Approve → Confirm (card removed, toast); force `422`/`404` (card removed + info + refetch); force `500`/offline (card stays + retry toast).

### Tests for User Story 2 ⚠️ (write first, must fail)

- [X] T021 [P] [US2] Integration test `tests/integration/driver-approve.test.tsx` with mocked `fetch`: AC6 cancelling the confirm dialog sends **zero** `POST …/approve` and the card stays (FR-013); AC1 confirm → exactly one `POST /admin/drivers/{id}/approve` with the bearer header and no body, card removed without reload, success toast from the envelope `message` (FR-014, SC-002); AC2 while in flight both card controls are `disabled` / `aria-busy` and rapid clicks still send one request (FR-015, SC-005); AC3 `422` (not pending) → card removed, info toast text = envelope `message`, a follow-up `GET /admin/drivers/pending` is issued (FR-023, SC-004); AC4 `404` → card removed, "not found" toast, refetch (FR-024); AC5 `500` / `fetch` reject → card remains, retryable toast, controls re-enabled, no local "approved" state (FR-025); a `200` with unreadable `data` still removes the card and shows success (FR-026)
- [X] T022 [P] [US2] Extend `tests/a11y/driver-review-a11y.test.tsx` — `ApproveDialog`: `vitest-axe` clean; focus moves into the dialog on open, is trapped, and returns to the triggering button on close; `Esc` / Cancel dismiss with no request; the result is announced via the page `aria-live` region (FR-034) *(same file as T014 — sequence after it)*

### Implementation for User Story 2

- [X] T023 [US2] Implement `approve(id)` in `src/drivers/useDriverApplications.ts` — set `cardState(id) = 'submitting'`; call `approveDriver(id)`; classify: `200` → delete the entry and its `cardState` key, return `{ ok: true, message }`; `ApiError.status === 404` → delete entry + `refresh()`, return `{ ok: false, reason: 'not_found' }`; `=== 422` → delete entry + `refresh()`, return `{ ok: false, reason: 'not_pending', message: err.message }`; `=== 0` or `>= 500` → keep entry, `cardState(id) = 'error'`, return `{ ok: false, reason: 'transient' }`; never observe `401` (FR-014 / FR-023 / FR-024 / FR-025 / FR-026) (depends on T016) *(same file as T016, T029)*
- [X] T024 [P] [US2] Implement `ApproveDialog` in `src/drivers/ApproveDialog.tsx` — props per [contracts/driver-review-ui.md](./contracts/driver-review-ui.md) §5; built on `src/review/DialogShell`; focus-trapped `role="dialog"` with the driver label, a warning line, and Confirm / Cancel; `Esc` / Cancel → `onCancel` and no request (FR-013); Confirm disabled while `busy` (FR-012 / FR-034) (depends on T010)
- [X] T025 [US2] Wire approve into `src/drivers/DriverApplicationCard.tsx` (enable the Approve button → `props.onApprove`; when `state === 'submitting'` disable **both** Approve and Reject with `aria-busy` — FR-015) and `src/drivers/DriverApplicationsPage.tsx` (on Approve → `openConfirm(id, 'approve')` and render `<ApproveDialog busy={cardState(id)==='submitting'} onConfirm={() => approve(id).then(toastFor)} onCancel={() => closeConfirm(id)} />`; `toastFor` maps `DecisionOutcome` → success (`message` or `approvedToast`) / `noLongerPendingToast` (or envelope `message`) / `notFoundToast` / `decisionRetryToast`) (depends on T023, T024) *(Card + Page files also touched by US1 and US3)*
- [ ] T026 [US2] Run the quickstart US2 scenarios 1–6 in [quickstart.md](./quickstart.md) and record results (depends on T025)

**Checkpoint**: User Stories 1 and 2 both work independently.

---

## Phase 5: User Story 3 - Administrator rejects a driver application with a reason (Priority: P3)

**Goal**: The administrator rejects via a modal with a mandatory reason (1–1000 chars, enforced before the request); the card leaves the queue with a success toast; the typed reason survives a transient failure; the modal can be cancelled with no effect; already-decided applications reconcile out.

**Independent Test**: With a pending card, open Reject → submit blocked on empty/whitespace and on >1000 chars; submit a valid reason → card removed with the reason sent; force `500` → dialog stays open with the reason intact; cancel the modal → no request.

### Tests for User Story 3 ⚠️ (write first, must fail)

- [X] T027 [P] [US3] Integration test `tests/integration/driver-reject.test.tsx` with mocked `fetch`: AC1 clicking Reject opens a modal (FR-016); AC1–2 an empty or whitespace-only reason keeps Submit `disabled`, shows "reason required", and sends **zero** `POST …/reject` (FR-017, SC-003); AC3 pasting 1500 chars is capped at 1000 (counter `1000 / 1000`) and a request never carries more than 1000 (FR-018); AC4 a valid reason → exactly one `POST /admin/drivers/{id}/reject` with body `{ "reason": <text> }` and the bearer header, card removed, success toast (FR-019); AC6 `500` / offline → dialog stays open, `reason` value unchanged, retryable toast, Submit re-enabled (FR-020, FR-025); AC7 Cancel / `Esc` closes the modal with no request, card stays (FR-022); AC5 `422` (not pending) → card removed, info toast = envelope `message`, refetch (FR-023); a `422` carrying `errors.reason` keeps the dialog open and surfaces the field error (FR-027); assert across the file that every reject request sent carries a non-empty `reason` of ≤1000 chars (SC-003)
- [X] T028 [P] [US3] Extend `tests/a11y/driver-review-a11y.test.tsx` — `RejectDialog`: `vitest-axe` clean; the `<textarea>` has an associated label; the character counter is exposed via `aria-describedby`; the "reason required" state is announced; focus trapped and restored (FR-034) *(same file as T014/T022 — sequence after T022)*

### Implementation for User Story 3

- [X] T029 [US3] Implement `reject(id, reason)` in `src/drivers/useDriverApplications.ts` — identical outcome classification to `approve` (T023) but calling `rejectDriver(id, reason)`, plus a `422`-with-`errors.reason` branch returning `{ ok: false, reason: 'validation', message }` that keeps the entry and dialog (FR-027); assume the caller pre-validated the reason; on the `transient` branch keep the entry so `RejectDialog` can stay mounted (FR-019 / FR-020 / FR-022 / FR-023 / FR-024 / FR-025 / FR-027) (depends on T016) *(same file as T016, T023)*
- [X] T030 [P] [US3] Implement `RejectDialog` in `src/drivers/RejectDialog.tsx` — props per [contracts/driver-review-ui.md](./contracts/driver-review-ui.md) §5; built on `src/review/DialogShell`; focus-trapped `role="dialog"` with a `<textarea maxLength={1000}>` and a live `count / 1000` bound via `aria-describedby`; Submit disabled unless `reason.trim().length >= 1` (FR-017) and `reason.length <= 1000` (FR-018); local `reason` state is **not** cleared when a submit fails (dialog stays as `busy` returns to false) so the text is preserved (FR-020); an optional `fieldError` prop renders under the textarea (FR-027); Cancel / `Esc` / backdrop → `onCancel`, no request (FR-022); focus trapped and restored (FR-016 / FR-034) (depends on T010)
- [X] T031 [US3] Wire reject into `src/drivers/DriverApplicationCard.tsx` (enable the Reject button → `props.onReject`) and `src/drivers/DriverApplicationsPage.tsx` (on Reject → `openConfirm(id, 'reject')` and render `<RejectDialog busy={cardState(id)==='submitting'} fieldError={...} onSubmit={(reason) => reject(id, reason).then(outcome => { if (outcome.reason === 'transient' || outcome.reason === 'validation') keepOpen(outcome); else closeAndToast(outcome); })} onCancel={() => closeConfirm(id)} />`; toast mapping → success (`message` or `rejectedToast`) / `noLongerPendingToast` (or envelope `message`) / `notFoundToast` / `decisionRetryToast`) (depends on T029, T030) *(Card + Page files also touched by US1 and US2)*
- [ ] T032 [US3] Run the quickstart US3 scenarios 1–6 in [quickstart.md](./quickstart.md) and record results (depends on T031)

**Checkpoint**: All three user stories are independently functional.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Sensitive-document audit, docs, performance and accessibility sign-off, full validation.

- [X] T033 [P] FR-031 / SC-008 audit: grep `src/drivers/` and `src/review/` for `createObjectURL`, `localStorage` / `sessionStorage` / `indexedDB` / `caches`, `data:` URLs, and any `logger` call carrying a document URL; confirm `DocumentViewer` only ever sets `src` to a URL from the API response and that `useDriverApplications` state (which holds those URLs) is released when `/drivers` unmounts; record findings in the quickstart results
- [X] T034 [P] Update `README.md` with a "Driver applications review" section: the `/drivers` screen and its sidebar entry, the `src/drivers/` module overview, the `src/review/` shared viewer promotion, and the reuse of `src/cities/` and the `authedRequest` seam
- [ ] T035 [P] SC-007: render `driver-review-list` with a ~200-entry `pendingDriversResponse` fixture; measure time from data arrival to an interactive list and check scroll smoothness; record the numbers against the 3 s / no-stutter bar
- [ ] T036 Complete the SC-009 WCAG 2.1 AA manual checklist in [quickstart.md](./quickstart.md) (keyboard tab order + visible focus, document alt text naming each of the three documents, `DocumentViewer` + dialog focus management, `aria-live` announcements of toasts and the "no longer awaiting review" / "not found" messages, colour contrast of buttons / toasts / "unavailable" / `—` states) and record sign-off
- [X] T037 Run `npm run test:run` — all new driver suites **and** the untouched Phase 1/2 suites green
- [X] T038 Run `npm run build` — `tsc` + `vite build` clean; fix any `noUnusedLocals` / `noUnusedParameters` / `verbatimModuleSyntax` issues introduced
- [ ] T039 Execute the full [quickstart.md](./quickstart.md) validation end-to-end against a real Phase 3 + `GET /admin/cities` backend and confirm the "Definition of done" list

### Deferred — require a running backend + browser + assistive tech

T020, T026, T032, T035, T036, T039 cannot be executed without a live Phase 3 backend, a real browser, or a screen reader. Every acceptance scenario they enumerate is also asserted with a mocked `fetch` in the `tests/integration/*` and `tests/a11y/*` suites; the manual passes remain outstanding and should be run against a deployed backend before release. axe-core cannot evaluate colour contrast under jsdom, so that part of SC-009 stays in T036.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: no dependencies — start immediately
- **Foundational (Phase 2)**: depends on Setup — **blocks all user stories**. T004→T006 (component promotion) are sequential; T007 gates on T006; T008/T009/T010 are parallel and independent of the promotion
- **User Stories (Phases 3–5)**: all depend on Phase 2. Priority order US1 → US2 → US3; they can overlap if staffed, but US2 and US3 each extend `useDriverApplications.ts`, `DriverApplicationCard.tsx`, and `DriverApplicationsPage.tsx` created in US1 (see serialization points)
- **Polish (Phase 6)**: depends on the user stories you intend to ship

### User Story Dependencies

- **US1 (P1)**: after Phase 2. No dependency on US2/US3. Delivers the reviewable queue (MVP).
- **US2 (P2)**: after Phase 2 **and** US1 (extends the US1 hook/card/page). Independently testable via `driver-approve.test.tsx`.
- **US3 (P3)**: after Phase 2 **and** US1. Independent of US2 for testing (`driver-reject.test.tsx`); both touch the same three files, so sequence US2 then US3 or coordinate one owner.

### Within Each User Story

- Test tasks (⚠️) are written first and must fail before the implementation tasks in the same phase
- `useDriverApplications` / API wrappers before the components that consume them (T016 before T017/T018; T023 before T025; T029 before T031)
- The shared `DocumentViewer` (T006) before `DriverApplicationCard` (T017)
- The manual quickstart task is last in each phase

### Parallel Opportunities

- **Phase 1**: T001, T002, T003 all parallel
- **Phase 2**: T004 → T006 sequential (T005 parallel with T004); T007 after T006; T008, T009, T010 parallel and can run alongside T004–T007
- **Phase 3**: T011, T012, T013, T014 parallel (tests); T015 parallel with the tests; then T016 → T017 → T018 → T019 → T020
- **Phase 4**: T021, T022 parallel; T024 parallel with T023; then T025 → T026
- **Phase 5**: T027, T028 parallel; T030 parallel with T029; then T031 → T032
- **Phase 6**: T033, T034, T035 parallel; T036 independent; then T037 → T038 → T039

---

## Parallel Example: Phase 2 Foundational

```bash
# Promotion chain (sequential): T004 → T006 → T007 ; T005 parallel with T004
Task: "Create src/review/messages.ts (reviewMessages chrome keys)"                     # T005

# Independent of the promotion — run in parallel with T004–T007:
Task: "Create src/drivers/types.ts"                                                    # T008
Task: "Implement src/drivers/driversApi.ts (list/approve/reject via authedRequest)"    # T009
Task: "Create src/drivers/messages.ts (all Arabic keys)"                               # T010
```

## Parallel Example: User Story 1

```bash
# Tests first, together:
Task: "Unit test driverSortQueue in tests/unit/driverSortQueue.test.ts"                        # T011
Task: "Integration test the review queue in tests/integration/driver-review-list.test.tsx"     # T012
Task: "Integration test 401 handling in tests/integration/driver-review-session.test.tsx"      # T013
Task: "Accessibility test in tests/a11y/driver-review-a11y.test.tsx"                            # T014

# Implementation: T015 parallel with the tests, then the component chain:
Task: "Implement pure sortQueue in src/drivers/sortQueue.ts"                                    # T015
# then T016 → T017 → T018 → T019 → T020
```

---

## Implementation Strategy

### MVP First (User Story 1 only)

1. Phase 1: Setup (T001–T003)
2. Phase 2: Foundational (T004–T010)
3. Phase 3: User Story 1 (T011–T020)
4. **STOP and VALIDATE**: an administrator can open `/drivers`, review every pending application, inspect the three documents, and refresh — demo-ready

### Incremental Delivery

1. Setup + Foundational → shared viewer promoted, wrappers ready
2. + US1 → the reviewable queue (MVP)
3. + US2 → approve with confirmation and queue reconciliation
4. + US3 → reject with a mandatory reason
5. Phase 6 → sensitive-doc audit, performance + WCAG AA sign-off, full quickstart run

### Notes

- `[P]` = different files, no incomplete-task dependency
- Verify each ⚠️ test fails before writing its implementation
- Commit after each task or logical group
- `useDriverApplications.ts`, `DriverApplicationCard.tsx`, `DriverApplicationsPage.tsx`, and `tests/a11y/driver-review-a11y.test.tsx` are the cross-phase files — coordinate edits across US1/US2/US3
- The `src/review/` promotion (T004–T007) touches Phase 2 files; keep it a pure move + re-export so `cook-*` suites pass unchanged
- Final Arabic copy for `src/drivers/messages.ts` is descriptive per the spec Assumptions; placeholders are acceptable for implementation and tests
