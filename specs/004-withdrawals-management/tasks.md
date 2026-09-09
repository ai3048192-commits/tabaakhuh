---
description: "Task list for Withdrawals Management"
---

# Tasks: Withdrawals Management

**Input**: Design documents from `/specs/004-withdrawals-management/`

**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md), [data-model.md](./data-model.md), [contracts/](./contracts/)

**Depends on**: Feature `001-admin-auth-session` implemented, and the `authedRequest` / `setTokenProvider` seam added to `src/api/httpClient.ts` in feature `002-cook-applications-review`. This feature reuses that transport, the `<RequireAdmin>` guard, the shared layout/sidebar/header, and the `tests/` harness. It does **not** depend on feature `003`.

**Tests**: INCLUDED. The user stories carry explicit acceptance scenarios and measurable criteria (SC-001…SC-010), and [quickstart.md](./quickstart.md) maps automated suites to requirements. Test tasks are written before the implementation they cover and must fail first.

**Organization**: Tasks are grouped by user story. Phases 1–2 are shared; Phases 3/4/5/6 are US1/US2/US3/US4 and each is an independently testable increment.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependency on an incomplete task)
- **[Story]**: US1 / US2 / US3 / US4 (setup, foundational, polish carry no story label)
- Exact file paths are in every task

## Path Conventions

Single Vite SPA at repo root: source in `src/`, tests in `tests/`. Layout per [plan.md](./plan.md) "Project Structure".

⚠️ **Serialization points** (same file edited across phases — not `[P]` with each other; sequence or single-owner):

- `src/withdrawals/useWithdrawals.ts` — created T017 (US1 load/filter/page/refresh), extended T029 (US2 `approve`), T035 (US3 `reject`), T040 (US4 `markPaid`)
- `src/withdrawals/WithdrawalRow.tsx` — created T021 (US1 cells), extended T031 (US2 Approve button), T036 (US3 Reject button), T041 (US4 Mark Paid button + terminal-row no-actions)
- `src/withdrawals/WithdrawalsPage.tsx` — created T023 (US1 list/filter/pager), extended T031 (US2 ConfirmDialog + toast mapping), T036 (US3 reject wiring), T041 (US4 mark-paid wiring)
- `tests/a11y/withdrawals-a11y.test.tsx` — created T016 (US1 surfaces), extended T028 (US2 ConfirmDialog), T034 (US3 reject dialog — no text input), T039 (US4 mark-paid dialog)
- `src/cooks/DialogShell.tsx` — one edit only, T004 (replaced by a re-export of `src/shared/DialogShell.tsx`)
- `src/App.tsx` — one edit only, T024 (the `/withdrawals` route)
- `src/components/Sidebar.tsx` — one edit only, T025 (the nav entry)
- `tests/helpers/fixtures.ts` — one edit only, T002
- `tests/helpers/harness.tsx` — one edit only, T003

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Folder skeleton and test fixtures/helpers for the new endpoints. No new dependencies or env vars — `VITE_API_BASE_URL` and the Vitest / `vitest-axe` tooling from features 001–002 are reused.

- [X] T001 [P] Create `src/withdrawals/` and `src/shared/` directories (add a `.gitkeep` in each until files land)
- [X] T002 [P] Extend `tests/helpers/fixtures.ts` with builders producing envelope-shaped payloads from `admin-dashboard-api.md` Phase 4: `withdrawal(overrides?)` (one `items[]` object — sequential `id`, `amount` 500, `payment_details` `"InstaPay: 0100…"`, `status` `'pending'`, fixed `requested_at`, `processed_at` `null`) and `withdrawalPage(items, meta?)` (`{ items, page: meta?.page ?? 1, per_page: meta?.per_page ?? 20, total: meta?.total ?? items.length }`). Reuse the existing `ok` / `fail` envelope helpers
- [X] T003 [P] Extend `tests/helpers/harness.tsx` with `renderAtWithdrawals(fm, opts?: { seedMe?: boolean })` — seeds `localStorage` with a valid admin token + cached profile so `<RequireAdmin>` renders, mounts the router at `/withdrawals` with the real `<WithdrawalsPage/>`, and (by default) replies to `GET /auth/me`; the test configures the `GET /admin/withdrawals?...` replies on `fm` before calling. Mirror the existing `renderAtCooks`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: The shared modal shell, feature types, pure helpers (pagination, formatting, error classification), the API wrappers, and message strings — everything all four stories build on.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [X] T004 Promote the modal shell: move `src/cooks/DialogShell.tsx` verbatim to `src/shared/DialogShell.tsx`, then replace `src/cooks/DialogShell.tsx` with exactly `export { default } from '../shared/DialogShell'`. Confirm `src/cooks/ApproveDialog.tsx` / `src/cooks/RejectDialog.tsx` still import `./DialogShell` and that `npm run test:run` shows no Phase 2 regression (research R4)
- [X] T005 [P] Create `src/withdrawals/types.ts` — `WithdrawalStatus`, `Withdrawal`, `WithdrawalPage`, `StatusFilter`, `RowStatus`, `ActionKind`, `ActionOutcome` per [data-model.md](./data-model.md) §1–6 and [contracts/withdrawals-ui.md](./contracts/withdrawals-ui.md) §1
- [X] T006 [P] Implement `src/withdrawals/pagination.ts` — pure `totalPages(total, perPage)` = `Math.max(1, Math.ceil(total / perPage))` (`perPage <= 0` → `1`) and `clampPage(page, pages)` = `Math.min(Math.max(1, Math.floor(page)), Math.max(1, pages))` ([contracts/withdrawals-ui.md](./contracts/withdrawals-ui.md) §3)
- [X] T007 [P] Unit test `tests/unit/withdrawalsPagination.test.ts` — write first, must fail: `totalPages` for an exact multiple, a remainder, `total` `0` (→ `1`), and `perPage` `0`; `clampPage` below `1`, above `pages`, and a fractional input; a `page` beyond range clamps to `totalPages` (FR-014 / FR-015 / FR-016)
- [X] T008 [P] Implement `src/withdrawals/format.ts` — pure `formatAmount(n)` (finite number → dashboard-standard money string; `null` / `undefined` / `NaN` → `PLACEHOLDER`), `formatDateTime(iso)` (valid ISO → dashboard-standard date/time; `null` / `undefined` / invalid → `PLACEHOLDER`), `isValidStatusFilter(v)` (type guard for `'all' | 'pending' | 'approved' | 'rejected' | 'paid'`), and `export const PLACEHOLDER = '—'` ([contracts/withdrawals-ui.md](./contracts/withdrawals-ui.md) §4)
- [X] T009 [P] Unit test `tests/unit/withdrawalsFormat.test.ts` — write first, must fail: `formatAmount` on an integer, a decimal, `NaN`, `null` → placeholder; `formatDateTime` on a valid ISO, `null` (→ placeholder), and a garbage string (→ placeholder) (FR-002 / FR-004); `isValidStatusFilter` accepts exactly the five values and rejects `''`, `'PAID'`, `null`, `undefined` (FR-012)
- [X] T010 [P] Implement `src/withdrawals/outcome.ts` — pure `classifyActionError(err: unknown): { reason: 'invalid_transition'; message: string } | { reason: 'not_found' } | { reason: 'transient' }`: `ApiError.status === 422` → `invalid_transition` carrying `err.message`; `=== 404` → `not_found`; `=== 0` or `>= 500` or non-`ApiError` → `transient` ([data-model.md](./data-model.md) §6)
- [X] T011 [P] Unit test `tests/unit/withdrawalsOutcome.test.ts` — write first, must fail: `ApiError(422, 'not in approved status')` → `{ reason: 'invalid_transition', message: 'not in approved status' }`; `ApiError(404, …)` → `not_found`; `ApiError(0, …)` and `ApiError(503, …)` and a plain `Error` → `transient`
- [X] T012 [P] Implement `src/withdrawals/withdrawalsApi.ts` per [contracts/withdrawals-api.md](./contracts/withdrawals-api.md) and [contracts/withdrawals-ui.md](./contracts/withdrawals-ui.md) §2: `listWithdrawals({ filter, page }, signal?)` builds `/admin/withdrawals?page=<n>` for `filter === 'all'` else `/admin/withdrawals?status=<filter>&page=<n>` and returns the `WithdrawalPage` from `data`; `approveWithdrawal(id)` / `rejectWithdrawal(id)` / `markWithdrawalPaid(id)` call `authedRequest('/admin/withdrawals/{id}/(approve|reject|mark-paid)', { method: 'POST' })` with **no `body`** key. All four go through `authedRequest` and propagate `ApiError` unchanged; none handle `401` (depends on T005)
- [X] T013 [P] Create `src/withdrawals/messages.ts` — all Arabic RTL keys from [contracts/withdrawals-ui.md](./contracts/withdrawals-ui.md) §7, including the complete confirm-dialog copy for all three kinds (`confirmApproveTitle/Body/Cta`, `confirmRejectTitle/Body/Cta`, `confirmMarkPaidTitle/Body/Cta`), the column headers, the five filter labels, the four status labels, `pagerPosition(page, pages)`, `pagerTotal(n)`, `backToFirstPage`, `emptyFor(filter)`, `notFoundToast`, `actionRetryToast`, `queueError`, `retry`, `refresh`, `loading`

**Checkpoint**: `src/shared/DialogShell.tsx` in place with the cooks re-export shim; pure helpers and API wrappers ready; `npm run test:run` passes T007, T009, T011 and shows no Phase 2 regression.

---

## Phase 3: User Story 1 - Administrator reviews the queue of withdrawal requests (Priority: P1) 🎯 MVP

**Goal**: An administrator opens `/withdrawals` and sees one page (≤20) of withdrawal requests, defaulting to the `pending` filter, each row showing id, amount, payment details, a colour-independent status badge, requested date and processed date; can switch the status filter (which resets to page 1), page through the result set with a position + total readout, and refresh — with an empty state per filter, a loading state, a screen error + retry, and a "back to first page" affordance for a page beyond range — all behind the admin guard.

**Independent Test**: Sign in as admin, open `/withdrawals` → the pending requests load with all columns; switching the filter reloads at page 1 with the right `?status=` (omitted for "all"); Next/Previous page through the set with position + total shown and disabled at the ends; an empty filter shows the empty state; a page beyond range shows "back to first page"; Refresh reflects backend changes.

### Tests for User Story 1 ⚠️ (write first, must fail)

- [X] T014 [P] [US1] Integration test `tests/integration/withdrawals-list.test.tsx` with mocked `fetch` via `renderAtWithdrawals`: AC1 first load issues `GET /admin/withdrawals?status=pending&page=1` and renders rows with id, `formatAmount(amount)`, payment details, a `StatusBadge`, `formatDateTime(requested_at)`, and `formatDateTime(processed_at)` / `—` for `null` (FR-002 / FR-003 / FR-009); AC2 choosing "all" issues `GET /admin/withdrawals?page=1` (**no** `status`), choosing approved/rejected/paid issues `?status=<v>&page=1`, and the active option is visibly marked; changing the filter while on page 2 returns to page 1 (FR-008 / FR-010 / FR-011 / FR-012); AC3 with `total` > `per_page`, Next issues `…&page=2`, Previous is disabled on page 1 and Next disabled on the last page, and "صفحة X من Y" + the total are shown; only one page of rows is ever in the DOM (FR-013 / FR-014 / FR-015); AC4 `items: []` for a filter → the empty state, not a blank table (FR-005); AC6 a slow reply shows the loading state distinct from empty (FR-006); AC5 Refresh re-issues the current `GET …` and reflects added/decided rows, keeping the page position (FR-007); edge case a `page` beyond range (`items: []`, `page > 1`) shows "back to first page" → click issues `…&page=1` (FR-016); edge case a row with empty `payment_details` / non-finite `amount` shows `—` in that cell and the rest of the row renders (FR-004); FR-006 a `500` / offline first load shows a screen-level error with a working Retry, while a failed Refresh keeps the page already shown
- [X] T015 [P] [US1] Integration test `tests/integration/withdrawals-session.test.tsx`: a `401` response to `GET /admin/withdrawals?...` invokes the inherited `unauthorizedHandler` → session cleared → redirect to `/login`, no broken view (FR-034)
- [X] T016 [P] [US1] Accessibility test `tests/a11y/withdrawals-a11y.test.tsx`: `vitest-axe` reports zero violations on the list/table, the `StatusFilter` control, the `Pager`, the empty state, and the error state; the `<table>` exposes `<th scope="col">` for every column; each `StatusBadge` conveys status by text + shape/icon (assert non-colour cue present) (FR-003 / FR-040 / SC-003); a keyboard-only pass changes the filter and moves to the next page using the keyboard alone with a visible focus target

### Implementation for User Story 1

- [X] T017 [US1] Implement `useWithdrawals()` in `src/withdrawals/useWithdrawals.ts` per [contracts/withdrawals-ui.md](./contracts/withdrawals-ui.md) §5: state `{ filter, pageNum, page: WithdrawalPage | null, status }`; on mount load `{ filter: 'pending', pageNum: 1 }` via `listWithdrawals`; `setFilter(next)` sets the filter, resets `pageNum` to `1`, reloads (FR-011); `setPage(n)` clamps to `[1, totalPages]` via `clampPage`/`totalPages` and reloads (FR-013 / FR-015); `refresh()` reloads the current `{ filter, pageNum }`; `status` = `loading` (first load, nothing shown), `ready` (a page in hand — empty `items` is still `ready`), `error` (load failed with nothing shown); a failed reload with a page already shown keeps it; expose `totalPages`, `beyondRange` (`page.items.length === 0 && pageNum > 1`), `rowState(id)` backed by `Map<number, 'confirming' | 'submitting'>`, `openConfirm(id, kind)` / `closeConfirm(id)`, and `approve` / `reject` / `markPaid` as typed placeholders that throw `"not implemented"` (filled in US2–US4); all state dropped on unmount (FR-006 / FR-007 / FR-038) (depends on T012, T006)
- [X] T018 [P] [US1] Implement `StatusBadge` in `src/withdrawals/StatusBadge.tsx` — props `{ status }`; render the Arabic label from `messages.ts` paired with a shape/icon per status so status is never distinguished by colour alone (FR-003 / FR-040 / SC-003) (depends on T013)
- [X] T019 [P] [US1] Implement `StatusFilter` in `src/withdrawals/StatusFilter.tsx` — props `{ value, onChange }`; a labelled group (or `<select>`) over `all | pending | approved | rejected | paid` with the five labels from `messages.ts`; the active value is visibly indicated and exposed to assistive tech as selected; fully keyboard operable (FR-008 / FR-010 / FR-012 / FR-040) (depends on T013)
- [X] T020 [P] [US1] Implement `Pager` in `src/withdrawals/Pager.tsx` — props `{ page, totalPages, total, beyondRange, onPage }`; show `pagerPosition(page, totalPages)` + `pagerTotal(total)`; Previous disabled when `page <= 1`, Next disabled when `page >= totalPages` (FR-014 / FR-015); when `beyondRange`, render a single `backToFirstPage` button calling `onPage(1)` (FR-016) (depends on T006, T013)
- [X] T021 [US1] Implement `WithdrawalRow` in `src/withdrawals/WithdrawalRow.tsx` — props per [contracts/withdrawals-ui.md](./contracts/withdrawals-ui.md) §6; render `<td>`s for `id`, `formatAmount(item.amount)`, `item.payment_details` (empty/nullish → `PLACEHOLDER`), `<StatusBadge status={item.status} />`, `formatDateTime(item.requested_at)`, `formatDateTime(item.processed_at)`; render an empty actions `<td>` (a `—` placeholder) — action buttons are added in US2–US4 (FR-002 / FR-004) (depends on T008, T018)
- [X] T022 [US1] Implement `WithdrawalsTable` in `src/withdrawals/WithdrawalsTable.tsx` — props `{ items, rowState, onAction }`; a semantic `<table>` with a header row of `<th scope="col">` (#, amount, payment details, status, requested date, processed date, actions) using `messages.ts` column keys, then `items.map(w => <WithdrawalRow key={w.id} item={w} state={rowState(w.id)} onAction={(k) => onAction(w.id, k)} />)`; wrap in an `overflow-x:auto` container so the table scrolls, not the page (FR-002 / FR-040) (depends on T021)
- [X] T023 [US1] Implement `WithdrawalsPage` in `src/withdrawals/WithdrawalsPage.tsx` — compose `useWithdrawals()`; `status === 'loading'` → loader (no table); `status === 'error'` → error panel + Retry calling `refresh()` (FR-006); `ready` with `page.items.length === 0` → empty state via `emptyFor(filter)` (FR-005) with the `Pager` still shown when `beyondRange` (FR-016); otherwise a header (`pageTitle` + a Refresh control — FR-007), the `<StatusFilter value={filter} onChange={setFilter} />` (FR-008), the `<WithdrawalsTable items={page.items} rowState={rowState} onAction={openConfirm} />`, and `<Pager page={page.page} totalPages={totalPages} total={page.total} beyondRange={beyondRange} onPage={setPage} />`; own a visually-hidden `role="status"` `aria-live="polite"` region plus a transient toast bubble cleared after ~6 s (pattern copied from `CookApplicationsPage`); render nothing for `ConfirmDialog` yet (FR-001 / FR-036 / FR-040) (depends on T017, T019, T020, T022)
- [X] T024 [US1] In `src/App.tsx`, import `WithdrawalsPage` from `./withdrawals/WithdrawalsPage` and add `<Route path="/withdrawals" element={<WithdrawalsPage />} />` inside the `AdminLayout` `<Routes>` (already wrapped by `<RequireAdmin>` on `/*`) (FR-001 / FR-035) (depends on T023)
- [X] T025 [US1] In `src/components/Sidebar.tsx`, add `{ name: 'طلبات السحب', icon: Wallet, path: '/withdrawals' }` to `menuItems` immediately before `'التقارير المالية'`, importing `Wallet` from `lucide-react` (FR-039) (depends on T023)
- [ ] T026 [US1] Run the quickstart US1 manual scenarios 1–10 and the "Session loss" scenario in [quickstart.md](./quickstart.md) against a Phase 4 backend and record results (depends on T024, T025)

**Checkpoint**: User Story 1 is fully functional and independently testable — this is the MVP. No action buttons on rows yet.

---

## Phase 4: User Story 2 - Administrator approves a pending withdrawal request (Priority: P2)

**Goal**: On a `pending` row the administrator clicks Approve, confirms in an explicit dialog, and on success the current filter+page is re-fetched so the row shows `approved` with a processed date and a success toast; an already-decided or missing request surfaces the server message and reconciles via re-fetch; a transient failure leaves the row untouched with a retryable toast.

**Independent Test**: With a pending row on screen, Approve → Cancel (no request); Approve → Confirm (one no-body `POST …/approve`, re-fetch, row now `approved`, success toast); force `422`/`404` (toast = message, re-fetch); force `500`/offline (row unchanged, retry toast).

### Tests for User Story 2 ⚠️ (write first, must fail)

- [X] T027 [P] [US2] Integration test `tests/integration/withdrawals-approve.test.tsx` with mocked `fetch` (ordered replies on the list key for the post-action re-fetch): Approve is rendered only on `pending` rows and never on approved/rejected/paid (FR-017); cancelling the confirm dialog (button or `Esc`) sends **zero** `POST …/approve` (FR-018); Confirm → exactly one `POST /admin/withdrawals/{id}/approve` with the bearer header and `body === undefined`, then a follow-up `GET /admin/withdrawals?status=pending&page=1`, after which the row reflects `approved` + a processed date and a success toast shows the envelope `message` (FR-019 / FR-033 / SC-002); while in flight that row's action buttons are `disabled` / `aria-busy` and rapid clicks still send one request (FR-020 / FR-028 / SC-005); `422` → toast text = envelope `message`, a re-fetch is issued, the row shows its real status, **no** "success" (FR-029 / SC-004); `404` → `notFoundToast`, re-fetch (FR-030); `500` / `fetch` reject → row unchanged, `actionRetryToast`, buttons re-enabled, **no** re-fetch, no local "approved" state (FR-031); a `200` with unreadable `data` still shows success + re-fetch (FR-032)
- [X] T028 [P] [US2] Extend `tests/a11y/withdrawals-a11y.test.tsx` — `ConfirmDialog` (kind `approve`): `vitest-axe` clean; focus moves into the dialog on open, is trapped, and returns to the triggering button on close; `Esc` / Cancel / backdrop dismiss with no request; the confirm button is labelled; the outcome is announced via the page `aria-live` region (FR-018 / FR-040) *(same file as T016 — sequence after it)*

### Implementation for User Story 2

- [X] T029 [US2] Implement `approve(id)` in `src/withdrawals/useWithdrawals.ts` — guard against re-entry while `rowState(id) === 'submitting'`; set `rowState(id) = 'submitting'`; call `approveWithdrawal(id)`; on resolve → `{ ok: true, message }` then `refresh()` the current `{ filter, pageNum }`, and if the refreshed `page.items` is empty and `pageNum > 1` call `setPage(min(pageNum, totalPages))` once; on reject → `classifyActionError(err)`: `invalid_transition` / `not_found` → return the outcome **and** `refresh()`; `transient` → clear `rowState(id)` to idle, **no** reload, return `{ ok: false, reason: 'transient' }`; never observe `401` ([data-model.md](./data-model.md) §6) (depends on T017, T010, T012) *(same file as T017, T035, T040)*
- [X] T030 [P] [US2] Implement `ConfirmDialog` in `src/withdrawals/ConfirmDialog.tsx` on `src/shared/DialogShell` — props `{ kind: ActionKind, busy, onConfirm, onCancel }`; pick `title` / `body` / `confirmLabel` from `messages.ts` by `kind` (approve / reject / mark-paid all supported now); **no text input**; the confirm button auto-focuses on open; both buttons `disabled` + `aria-busy` while `busy`; `Esc` / Cancel / backdrop → `onCancel`, nothing submitted (FR-018 / FR-022 / FR-026 / FR-040) (depends on T004, T013)
- [X] T031 [US2] Wire approve into `src/withdrawals/WithdrawalRow.tsx` (render an **Approve** button in the actions `<td>` only when `item.status === 'pending'`; `disabled` + `aria-busy` when `state === 'submitting'`; click → `onAction('approve')`) and `src/withdrawals/WithdrawalsPage.tsx` (drive one `<ConfirmDialog>` from the hook's `confirming: { id, kind } | null`; on Approve → `openConfirm(id, 'approve')`; `onConfirm` → `approve(id).then(mapOutcomeToToast)` where `mapOutcomeToToast` shows the envelope `message` for `{ ok: true }` and `invalid_transition`, `notFoundToast` for `not_found`, `actionRetryToast` for `transient`, and closes the dialog except… it always closes for approve; `onCancel` → `closeConfirm(id)`) (FR-017 / FR-019 / FR-029–FR-033) (depends on T029, T030) *(Row + Page also touched by US1/US3/US4)*
- [ ] T032 [US2] Run the quickstart US2 scenarios 1–7 in [quickstart.md](./quickstart.md) and record results (depends on T031)

**Checkpoint**: User Stories 1 and 2 both work independently.

---

## Phase 5: User Story 3 - Administrator rejects a pending withdrawal request (Priority: P3)

**Goal**: On a `pending` row the administrator clicks Reject and confirms in a dialog that has **no reason field**; on success the current filter+page is re-fetched so the row shows `rejected` with a processed date and a success toast; a transient failure leaves the row untouched; terminal rows expose no action.

**Independent Test**: With a pending row, Reject → the confirm dialog has no text input → Confirm → one no-body `POST …/reject`, re-fetch, row `rejected`, success toast; the just-rejected row shows no Approve/Reject/Mark Paid; force `500` → row unchanged + retry toast.

### Tests for User Story 3 ⚠️ (write first, must fail)

- [X] T033 [P] [US3] Integration test `tests/integration/withdrawals-reject.test.tsx` with mocked `fetch` (ordered list replies): Reject is rendered only on `pending` rows (FR-021); opening the confirm dialog shows **no `<textarea>` / `<input>`** (FR-022); cancelling sends **zero** `POST …/reject`; Confirm → exactly one `POST /admin/withdrawals/{id}/reject` with the bearer header and `body === undefined`, then a re-fetch, after which the row shows `rejected` + a processed date and a success toast = envelope `message` (FR-023 / FR-033); a `rejected` (and a `paid`) row renders no action buttons (FR-021 / FR-025 — US3 AC6); while in flight the row's actions are `disabled` / `aria-busy` and rapid clicks send one request (FR-024 / FR-028); `500` / offline → row unchanged, `actionRetryToast`, no re-fetch (FR-031)
- [X] T034 [P] [US3] Extend `tests/a11y/withdrawals-a11y.test.tsx` — `ConfirmDialog` (kind `reject`): `vitest-axe` clean; assert the dialog contains no form field; focus trap + restore + `Esc` behaviour as for approve (FR-022 / FR-040) *(same file as T016 / T028 — sequence after T028)*

### Implementation for User Story 3

- [X] T035 [US3] Implement `reject(id)` in `src/withdrawals/useWithdrawals.ts` — identical shape to `approve` (T029) but calling `rejectWithdrawal(id)`; same success re-fetch + empty-page clamp, same `classifyActionError` branches, same re-entry guard ([data-model.md](./data-model.md) §6) (depends on T017, T010, T012; sequence after T029) *(same file as T017, T029, T040)*
- [X] T036 [US3] Wire reject into `src/withdrawals/WithdrawalRow.tsx` (render a **Reject** button next to Approve in the actions `<td>` only when `item.status === 'pending'`; same `disabled` / `aria-busy` rule; click → `onAction('reject')`) and `src/withdrawals/WithdrawalsPage.tsx` (on Reject → `openConfirm(id, 'reject')`; reuse the single `<ConfirmDialog>` — `kind` comes from `confirming.kind`; `onConfirm` → `reject(id).then(mapOutcomeToToast)`) (FR-021 / FR-023 / FR-029–FR-033) (depends on T035, T030) *(Row + Page also touched by US1/US2/US4)*
- [ ] T037 [US3] Run the quickstart US3 scenarios 1–6 in [quickstart.md](./quickstart.md) and record results (depends on T036)

**Checkpoint**: User Stories 1, 2, and 3 are independently functional.

---

## Phase 6: User Story 4 - Administrator marks an approved withdrawal as paid (Priority: P4)

**Goal**: On an `approved` row (and only there) the administrator clicks Mark Paid, confirms, and on success the current filter+page is re-fetched so the row shows `paid` with a success toast; a `422` "not in approved status" surfaces the server message and reconciles; a transient failure leaves the row untouched.

**Independent Test**: An `approved` row shows exactly a Mark Paid button; pending/rejected/paid rows show none; Mark Paid → Confirm → one no-body `POST …/mark-paid`, re-fetch, row `paid`, success toast; force `422` (message toast, re-fetch); Cancel sends nothing.

### Tests for User Story 4 ⚠️ (write first, must fail)

- [X] T038 [P] [US4] Integration test `tests/integration/withdrawals-mark-paid.test.tsx` with mocked `fetch` (ordered list replies; seed the list with rows in every status): Mark Paid is rendered only on `approved` rows and on no other status (FR-025 — US4 AC2); cancelling sends **zero** `POST …/mark-paid` (FR-026); Confirm → exactly one `POST /admin/withdrawals/{id}/mark-paid` with the bearer header and `body === undefined`, then a re-fetch, after which the row shows `paid` and a success toast = envelope `message` (FR-027 / FR-033); while in flight the row's action is `disabled` / `aria-busy`, one request only (FR-028); `422` (not approved) → toast = envelope `message`, re-fetch, row shows its real status (FR-029); `404` → `notFoundToast`, re-fetch (FR-030); `500` / offline → row unchanged, `actionRetryToast`, no re-fetch (FR-031)
- [X] T039 [P] [US4] Extend `tests/a11y/withdrawals-a11y.test.tsx` — `ConfirmDialog` (kind `mark_paid`): `vitest-axe` clean; focus trap + restore + `Esc`; the mark-paid confirm copy is present and the button labelled (FR-026 / FR-040) *(same file as T016 / T028 / T034 — sequence after T034)*

### Implementation for User Story 4

- [X] T040 [US4] Implement `markPaid(id)` in `src/withdrawals/useWithdrawals.ts` — identical shape to `approve` (T029) but calling `markWithdrawalPaid(id)`; the `422` case ("request is not in approved status") flows through the `invalid_transition` branch and surfaces `err.message` ([data-model.md](./data-model.md) §6) (depends on T017, T010, T012; sequence after T035) *(same file as T017, T029, T035)*
- [X] T041 [US4] Wire mark-paid into `src/withdrawals/WithdrawalRow.tsx` (render a **Mark Paid** button in the actions `<td>` only when `item.status === 'approved'`; render **no** action buttons when `item.status` is `'rejected'` or `'paid'` — a muted `—`; same `disabled` / `aria-busy` rule; click → `onAction('mark_paid')`) and `src/withdrawals/WithdrawalsPage.tsx` (on Mark Paid → `openConfirm(id, 'mark_paid')`; reuse the single `<ConfirmDialog>`; `onConfirm` → `markPaid(id).then(mapOutcomeToToast)`) (FR-025 / FR-027 / FR-029–FR-033) (depends on T040, T030) *(Row + Page also touched by US1/US2/US3)*
- [ ] T042 [US4] Run the quickstart US4 scenarios 1–6 in [quickstart.md](./quickstart.md) and record results (depends on T041)

**Checkpoint**: All four user stories are independently functional; the full `pending → approved → paid` and `pending → rejected` paths work end to end.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Retention audit, docs, pagination coverage, accessibility sign-off, full validation.

- [X] T043 [P] FR-038 / SC-008 audit: grep `src/withdrawals/` for `createObjectURL`, `localStorage` / `sessionStorage` / `indexedDB` / `caches`, `data:` URLs, and any `logger` call carrying `payment_details` or `amount`; confirm `useWithdrawals` holds only the current page in memory, keeps no cross-page cache, and releases all state when `/withdrawals` unmounts; record findings in the quickstart results
- [X] T044 [P] Update `README.md` with a "Withdrawals management" section: the `/withdrawals` screen, the `src/withdrawals/` module overview, the `src/cooks/DialogShell` → `src/shared/DialogShell` promotion, and the server-pagination + `?status=` filter behaviour (default `pending`, `status` omitted for "all", filter change resets to page 1, re-fetch after every action)
- [ ] T045 [P] SC-007: render `withdrawals-list` with a dataset spanning ≥ 3 pages (`total` ≥ 60), page forward through every page and back, and assert the position + total are always shown and navigation never leaves `[1, totalPages]`; record the result
- [ ] T046 Complete the SC-009 WCAG 2.1 AA manual checklist in [quickstart.md](./quickstart.md) (keyboard tab order + visible focus across filter → row actions → pager, `StatusFilter` group semantics and selected announcement, `<table>` header association, status distinguishable without colour, `ConfirmDialog` focus management + `Esc`, `aria-live` announcement of success / invalid-transition / not-found / retry toasts, the "back to first page" affordance, and colour contrast of buttons / badges / toast text / the `—` placeholder) and record sign-off
- [X] T047 Run `npm run test:run` — all unit / integration / a11y suites green
- [X] T048 Run `npm run build` — `tsc` + `vite build` clean; fix any `noUnusedLocals` / `noUnusedParameters` / `verbatimModuleSyntax` issues introduced
- [ ] T049 Execute the full [quickstart.md](./quickstart.md) validation end-to-end against a real Phase 4 backend and confirm the "Definition of done" list

### Deferred — require a running backend + browser + assistive tech

T026, T032, T037, T042, T045, T046, T049 cannot be executed without a live Phase 4 backend, a real browser, or a screen reader. Every acceptance scenario they enumerate is also asserted with a mocked `fetch` in the `tests/integration/*` and `tests/a11y/*` suites; the manual passes remain outstanding and should be run against a deployed backend before release. axe-core cannot evaluate colour contrast under jsdom, so that part of SC-009 stays in T046.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: no dependencies — start immediately
- **Foundational (Phase 2)**: depends on Setup — **blocks all user stories**
- **User Stories (Phases 3–6)**: all depend on Phase 2. Priority order US1 → US2 → US3 → US4; they can overlap if staffed, but US2/US3/US4 each extend `useWithdrawals.ts`, `WithdrawalRow.tsx`, and `WithdrawalsPage.tsx` created in US1 (see serialization points)
- **Polish (Phase 7)**: depends on the user stories you intend to ship

### User Story Dependencies

- **US1 (P1)**: after Phase 2. No dependency on US2/US3/US4. Delivers the reviewable, filterable, paginated queue (MVP).
- **US2 (P2)**: after Phase 2 **and** US1 (extends the US1 hook/row/page; introduces `ConfirmDialog`). Independently testable via `withdrawals-approve.test.tsx`.
- **US3 (P3)**: after Phase 2 **and** US1; reuses `ConfirmDialog` from US2 (sequence US2 → US3, or coordinate one owner for the shared Row/Page files). Independently testable via `withdrawals-reject.test.tsx`.
- **US4 (P4)**: after Phase 2 **and** US1; reuses `ConfirmDialog`. Independently testable via `withdrawals-mark-paid.test.tsx`.

### Within Each User Story

- Test tasks (⚠️) are written first and must fail before the implementation tasks in the same phase
- The hook / API wrappers before the components that consume them (T017 before T018–T023; T029 before T031; T035 before T036; T040 before T041)
- `ConfirmDialog` (T030) before the row/page wiring that mounts it (T031, T036, T041)
- The manual quickstart task is last in each phase

### Parallel Opportunities

- **Phase 1**: T001, T002, T003 all parallel
- **Phase 2**: T004 independent; T005, T006, T008, T010, T012, T013 parallel after T005 lands for T012; T007 after T006; T009 after T008; T011 after T010
- **Phase 3**: T014, T015, T016 parallel (tests); then T017 → (T018, T019, T020 parallel) → T021 → T022 → T023 → (T024, T025 parallel) → T026
- **Phase 4**: T027, T028 parallel; T030 parallel with T029; then T031 → T032
- **Phase 5**: T033, T034 parallel; then T035 → T036 → T037
- **Phase 6**: T038, T039 parallel; then T040 → T041 → T042
- **Phase 7**: T043, T044, T045 parallel; T046 independent; then T047 → T048 → T049

---

## Parallel Example: Phase 2 Foundational

```bash
# T004 is a standalone move; run this wave in parallel (T012 needs T005 first):
Task: "Create src/withdrawals/types.ts"                                    # T005
Task: "Implement src/withdrawals/pagination.ts"                            # T006
Task: "Implement src/withdrawals/format.ts"                               # T008
Task: "Implement src/withdrawals/outcome.ts"                              # T010
Task: "Create src/withdrawals/messages.ts (all Arabic keys)"             # T013

# Then the unit tests alongside their targets: T007 (after T006), T009 (after T008), T011 (after T010)
# Then: Task "Implement src/withdrawals/withdrawalsApi.ts"                 # T012 (after T005)
```

## Parallel Example: User Story 1

```bash
# Tests first, together:
Task: "Integration test the list/filter/pager in tests/integration/withdrawals-list.test.tsx"   # T014
Task: "Integration test 401 handling in tests/integration/withdrawals-session.test.tsx"          # T015
Task: "Accessibility test in tests/a11y/withdrawals-a11y.test.tsx"                                # T016

# Implementation: T017 first, then the leaf components in parallel:
Task: "Implement StatusBadge in src/withdrawals/StatusBadge.tsx"          # T018
Task: "Implement StatusFilter in src/withdrawals/StatusFilter.tsx"        # T019
Task: "Implement Pager in src/withdrawals/Pager.tsx"                       # T020
# then T021 → T022 → T023 → (T024, T025) → T026
```

---

## Implementation Strategy

### MVP First (User Story 1 only)

1. Phase 1: Setup (T001–T003)
2. Phase 2: Foundational (T004–T013)
3. Phase 3: User Story 1 (T014–T026)
4. **STOP and VALIDATE**: an administrator can open `/withdrawals`, filter by status, and page through every withdrawal request with amount, payment details, status, and dates — demo-ready

### Incremental Delivery

1. Setup + Foundational → shell, helpers, and wrappers ready
2. + US1 → the reviewable, filterable, paginated queue (MVP)
3. + US2 → approve with confirmation and re-fetch reconciliation
4. + US3 → reject (confirm-only, no reason)
5. + US4 → mark paid (approved rows only); terminal rows show no action
6. Phase 7 → retention audit, pagination + WCAG AA sign-off, full quickstart run

### Parallel Team Strategy

1. Team completes Setup + Foundational together
2. One owner takes `useWithdrawals.ts` / `WithdrawalRow.tsx` / `WithdrawalsPage.tsx` across US1→US4 (serialization points); another can own `ConfirmDialog`, the leaf components, and the test suites
3. US2, US3, US4 integration test files are independent and can be written in parallel

### Notes

- `[P]` = different files, no incomplete-task dependency
- Verify each ⚠️ test fails before writing its implementation
- Commit after each task or logical group
- `useWithdrawals.ts`, `WithdrawalRow.tsx`, `WithdrawalsPage.tsx`, and `tests/a11y/withdrawals-a11y.test.tsx` are the cross-phase files — coordinate edits across US1–US4
- `fetchMock` reply keys include the query string — assert the exact `?status=…&page=…` the hook builds (and the omission of `status` for the `all` filter); use ordered replies on the list key to exercise the post-action re-fetch
- Final Arabic copy for `src/withdrawals/messages.ts` is descriptive per the spec Assumptions; placeholders are acceptable for implementation and tests
