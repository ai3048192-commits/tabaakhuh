---
description: "Task list for Dashboard Reports / Overview"
---

# Tasks: Dashboard Reports / Overview

**Input**: Design documents from `/specs/008-dashboard-reports-overview/`

**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md), [data-model.md](./data-model.md), [contracts/](./contracts/)

**Depends on**: Feature `001-admin-auth-session` implemented, and the `authedRequest` / `setTokenProvider` seam in `src/api/httpClient.ts`. This feature reuses that transport (with **no** edit — `GET` is already supported), the `<RequireAdmin>` guard, the shared layout / sidebar / header, and the `tests/` harness. It does **not** depend on features `002` / `003` / `004` / `005` / `006`. **User Story 3 (drill-down)** additionally depends on feature `007-orders-oversight` shipping a status-filtered `/orders` view; until then it is delivered as plain figures through the `ordersStatusHref` seam.

**Tests**: INCLUDED. The user stories carry explicit acceptance scenarios and measurable criteria (SC-001…SC-008), and [quickstart.md](./quickstart.md) maps automated suites to requirements. Test tasks are written before the implementation they cover and must fail first.

**Organization**: Tasks are grouped by user story. Phases 1–2 are shared; Phases 3/4/5 are US1/US2/US3 and each is an independently testable increment; Phase 6 is polish.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependency on an incomplete task)
- **[Story]**: US1 / US2 / US3 (setup, foundational, polish carry no story label)
- Exact file paths are in every task

## Path Conventions

Single Vite SPA at repo root: source in `src/`, tests in `tests/`. Layout per [plan.md](./plan.md) "Project Structure". New feature code lands in `src/overview/`.

⚠️ **Serialization points** (same file edited across phases — not `[P]` with each other; sequence or single-owner):

- `src/overview/types.ts` — created once, T003 (all shapes + `ROLE_ORDER` / `STATUS_ORDER` / `REFRESH_INTERVAL_MS`)
- `src/overview/messages.ts` — created once, T010 (all Arabic keys at once)
- `src/overview/useOverview.ts` — created T015 (US1: `load`, `status`, `snapshot`, `lastUpdated`, a reload-only `refresh`), extended T024 (US2: `refreshing` / `refreshError`, the 60 s interval, the visibility pause/resume, single-flight guard)
- `src/overview/OverviewPage.tsx` — created T018 (US1: loading / error+Retry / three groups, header, "آخر تحديث", card assembly incl. the `href` wiring through `ordersStatusHref`), extended T025 (US2: busy Refresh, the refresh-error notice + retry, the extended live region)
- `src/overview/StatCard.tsx` — created T016 (US1, both the plain-figure and the `<Link>` branches)
- `tests/a11y/dashboard-a11y.test.tsx` — created T014 (US1 surfaces), extended T023 (US2 refresh-error notice), extended T028 (US3 link semantics)
- `src/App.tsx` — one edit only, T019 (the `/dashboard` route element + imports)
- `src/pages/Dashboard.tsx` — deleted once, T020
- `tests/helpers/fixtures.ts` — one edit only, T001
- `tests/helpers/harness.tsx` — one edit only, T002

**Not touched at all**: `src/api/*`, `src/components/Sidebar.tsx`, `src/auth/*`, `src/cooks/*`, `src/drivers/*`, `src/cities/*`, `src/review/*`, `src/settings/*`, and the harness `DashboardStub` (the other features' session tests keep using it).

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Test fixtures and helpers for the new endpoint. No new dependencies or env vars — `VITE_API_BASE_URL` and the Vitest / `vitest-axe` tooling from earlier features are reused. No chart library. The `src/overview/` folder is created implicitly by the first file written into it (Phase 2).

- [X] T001 [P] Extend `tests/helpers/fixtures.ts` with builders producing envelope-shaped payloads from `admin-dashboard-api.md` Phase 8: `overview(overrides: Partial<RawOverview> = {})` returning a full `RawOverview` — `users_by_role` `{ customer: 1240, cook: 85, driver: 60, admin: 3 }`, `orders_by_status` with all twelve keys (sample counts, `completed: 980`), `total_sales_revenue: 154300` — shallow-merged with `overrides` (so a test can pass `{ users_by_role: {} }`, `{ orders_by_status: { pending: 0, /* … */ } }`, `{ total_sales_revenue: 0 }`, or an extra key like `{ orders_by_status: { ...all12, archived: 5 } }`); and `overviewResponse(data: RawOverview)` returning `ok(data)`. Reuse the existing `ok` / `fail` helpers (e.g. `fail('Something went wrong. Please try again.')` for the `500`; a `{ networkError: true }` reply for the `0` case). Import the `RawOverview` type from `../../src/overview/types` (created in T003) or inline the shape with a `// keep in sync with src/overview/types.ts` note if T003 has not landed yet
- [X] T002 [P] Extend `tests/helpers/harness.tsx` with `renderAtDashboard(fm, opts?: { seedMe?: boolean; admin?: boolean })` — seeds `localStorage` with a valid token (`STORAGE_KEYS.token`) + cached profile (`STORAGE_KEYS.profile`; admin by default, `admin: false` seeds a `customer` role), replies to `GET /auth/me` by default, and mounts a `MemoryRouter` at `/dashboard` with the real `<OverviewPage/>` inside `<RequireAdmin>`, plus stub routes `/login` (`<div>صفحة تسجيل الدخول</div>`) for the session-loss assertion and `/orders` (`<div>شاشة الطلبات</div>`) for the US3 drill-down check. Mirror the existing `renderAtSettings` / `renderAtDrivers`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Feature types + display-order constants, the two pure helpers (normalisation, formatting) with their unit tests, the API wrapper, the drill-down seam, and the Arabic message strings — everything all three stories build on.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [X] T003 [P] Create `src/overview/types.ts` — export `Role` (`'customer' | 'cook' | 'driver' | 'admin'`), `OrderStatus` (the twelve values), `RawOverview` (`{ users_by_role: Partial<Record<Role, number>>; orders_by_status: Record<string, number>; total_sales_revenue: number }`), `RoleCount` (`{ role: Role; count: number }`), `StatusCount` (`{ status: string; count: number; known: boolean }`), `OverviewSnapshot` (`{ roles: RoleCount[]; statuses: StatusCount[]; revenue: number }`), `OverviewStatus` (`'loading' | 'ready' | 'error'`); and the constants `ROLE_ORDER: readonly Role[]`, `STATUS_ORDER: readonly OrderStatus[]` (both in the fixed order from [data-model.md](./data-model.md) §2), and `REFRESH_INTERVAL_MS = 60_000` ([data-model.md](./data-model.md) §1–§3, [contracts/reports-ui.md](./contracts/reports-ui.md))
- [X] T004 [P] Implement `src/overview/overviewModel.ts` — pure `normalizeOverview(raw: RawOverview): OverviewSnapshot`: `roles` = one `RoleCount` per `ROLE_ORDER` entry, missing wire key → `0`; `statuses` = one `StatusCount{ known: true }` per `STATUS_ORDER` entry (missing key → `0`) followed by any `orders_by_status` key not in `STATUS_ORDER` appended as `StatusCount{ known: false }` in object-key order; `revenue` = a finite `≥ 0` coercion of `total_sales_revenue` (`Number(x)`, else `0`); every count coerced to a finite `≥ 0` number; `normalizeOverview({} as RawOverview)` → all-zero roles + all-zero known statuses + no unknown rows + `revenue: 0`. No `Date`, no I/O, no `messages` import ([data-model.md](./data-model.md) §4) (depends on T003)
- [X] T005 [P] Unit test `tests/unit/overviewModel.test.ts` — write first, must fail: a full payload → `roles` length 4 in `ROLE_ORDER` order with matching counts and `statuses` length 12 in `STATUS_ORDER` order all `known:true`; `users_by_role` missing `driver` → `driver` row present with `count:0`; `orders_by_status` missing `quoted` + `picked_up` → both rows present `count:0` in position; an extra key `"archived": 4` → a 13th `statuses` row `{ status:'archived', count:4, known:false }` after the twelve; two unknown keys appended in object-key order; `total_sales_revenue` of `"1533.5"` → `1533.5`; of `null` / absent / `-10` / `NaN` → `0`; a count value of `null` / `"7"` / `-2` → `0` / `7` / `0`; `{}` → all-zero snapshot with no unknown rows (FR-006 / FR-017 / FR-018)
- [X] T006 [P] Implement `src/overview/format.ts` — pure `formatCount(n: number): string` = `new Intl.NumberFormat('en-US').format(Math.trunc(Math.max(0, n)))`; `formatCurrency(n: number): string` = `new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Math.max(0, n))` + `' '` + `'ج.م'`; `formatTime(d: Date): string` = zero-padded 24-hour `"HH:MM"` from `d.getHours()` / `d.getMinutes()`. Locale pinned to `'en-US'` so digits are always Western with `,` grouping regardless of viewer locale; no `messages` import (the unit string is a local constant kept identical to `messages.currencyUnit`) ([data-model.md](./data-model.md) §5, [contracts/reports-ui.md](./contracts/reports-ui.md))
- [X] T007 [P] Unit test `tests/unit/overviewFormat.test.ts` — write first, must fail: `formatCount` for `0` → `"0"`, `3` → `"3"`, `1240` → `"1,240"`, `1_000_000` → `"1,000,000"`, `-5` → `"0"`, `12.9` → `"12"`; `formatCurrency` for `0` → `"0.00 ج.م"`, `154300` → `"154,300.00 ج.م"`, `154300.5` → `"154,300.50 ج.م"`, `-1` → `"0.00 ج.م"`; `formatTime(new Date(2026, 8, 7, 9, 5))` → `"09:05"`; assert every numeric portion matches `/^[\d.,]+$/` (no Arabic-Indic digits `٠-٩`) (FR-008 / FR-019 / SC-008)
- [X] T008 [P] Implement `src/overview/overviewApi.ts` — `getOverview(signal?: AbortSignal): Promise<RawOverview>` = `authedRequest<RawOverview>('/admin/reports/overview', { signal })`; no body, no query string; propagates `ApiError` unchanged; never handles `401` ([contracts/reports-api.md](./contracts/reports-api.md)) (depends on T003)
- [X] T009 [P] Implement `src/overview/ordersLink.ts` — `ordersStatusHref(status: OrderStatus): string | null` returning **`null` for every status now** (no working status-filtered `/orders` view yet). Add a file-level comment: this is the single change point for feature `007` — when a filtered orders screen exists, return `` `/orders?status=${encodeURIComponent(status)}` `` for supported statuses and `null` for any unsupported; unknown (`known:false`) statuses are always passed as `null` by the caller ([data-model.md](./data-model.md) §7, research R7) (depends on T003)
- [X] T010 [P] Create `src/overview/messages.ts` — all Arabic RTL keys from [data-model.md](./data-model.md) §9: `pageTitle`, `subtitle`, `refresh`, `refreshing`, `retry`, `loading`, `loadError`, `lastUpdated(t)`, `refreshFailedNotice`, `usersGroupTitle`, `ordersGroupTitle`, `revenueGroupTitle`, `revenueScopeNote`, `currencyUnit` (`'ج.م'`), `roleLabel` (`customer`/`cook`/`driver`/`admin` → `العملاء`/`الطهاة`/`السائقون`/`المدراء`), `statusLabel` (all twelve `OrderStatus` → Arabic), `unknownStatusLabel(key)` → `` `حالة غير معروفة (${key})` ``, `statusCardLinkLabel(label, count)` → `` `عرض طلبات ${label} (${count})` ``
- [X] T011 Regression checkpoint: run `npm run test:run` and confirm T005 / T007 now exist and **fail** pending nothing (their implementations T004 / T006 exist, so they should actually pass — treat this as "unit suites green"); confirm **no** other suite changed and `tsc` is clean (no `src/api/` edit, `DashboardStub` untouched)

**Checkpoint**: types + constants, both pure helpers with green unit tests, the API wrapper, the drill-down seam (returning `null`), and all message strings are ready. No screen yet.

---

## Phase 3: User Story 1 - Administrator sees the platform overview at a glance (Priority: P1) 🎯 MVP

**Goal**: An administrator opens `/dashboard` and sees a live snapshot as three labelled groups of stat cards — users by role (all four roles, zeros included), orders by status (all twelve statuses, zeros included, fixed order, an unknown status shown with a fallback label), and one currency-formatted total sales revenue for `completed` orders only. Every figure is in Western digits with thousands separators; every label is Arabic; the layout is RTL. Distinct loading state, an all-zero platform shown as real values, a failed first load → screen error + Retry, a "how current" line. All behind the admin guard.

**Independent Test**: Sign in as admin, open `/dashboard` → one `GET /admin/reports/overview` (no query string), three labelled groups render; all four roles and all twelve statuses appear with counts (zeros included) in a stable order; the revenue shows as "N,NNN.NN ج.م" with a "completed orders only" note; a delayed reply shows a loading state distinct from an all-zero populated screen; an empty environment renders every count as `0` and revenue as "0.00 ج.م" (not an error/blank); an offline first load shows a screen error + working Retry; an unknown `orders_by_status` key renders as a 13th card with a fallback label without breaking the layout; a `401` redirects to `/login`; a non-admin never reaches `/dashboard`.

### Tests for User Story 1 ⚠️ (write first, must fail)

- [X] T012 [P] [US1] Integration test `tests/integration/dashboard-overview.test.tsx` with mocked `fetch` via `renderAtDashboard` (ordered replies on `GET /admin/reports/overview` for the retry path): AC1–3 first mount issues exactly one `GET /admin/reports/overview` (no query string, `Bearer` header) and renders three groups — `usersGroupTitle` with a labelled card per `roleLabel` (customer/cook/driver/admin), `ordersGroupTitle` with a labelled card per `statusLabel` (all twelve), `revenueGroupTitle` with one `formatCurrency` figure + the `revenueScopeNote` (FR-003/004/005/007); AC7 with some roles/statuses at `0` in the fixture, every one of the four role cards and twelve status cards is still present with its label and `0`, and the status card order equals `STATUS_ORDER` on two successive renders (FR-006); AC4 a `delayMs` reply shows the `loading` indicator, visibly distinct from a populated all-zero screen (FR-009); AC5 `overview({ users_by_role: {}, orders_by_status: {}, total_sales_revenue: 0 })` → every count `0`, revenue `"0.00 ج.م"`, no error/blank (FR-010); AC6 a `500` / `networkError` first load → a screen error panel with `loadError` + a **Retry** that issues a second `GET /admin/reports/overview`, after which the figures render (FR-011, SC-003); AC8 an `orders_by_status` with an extra `"archived": 5` key → a 13th card labelled `unknownStatusLabel('archived')` with `5`, layout intact (FR-018); AC9 large fixture values render with `,` grouping (FR-008); every rendered figure contains only `[\d.,]` characters — Western digits (SC-008); the "آخر تحديث: HH:MM" line is present after load (FR-015)
- [X] T013 [P] [US1] Integration test `tests/integration/dashboard-session.test.tsx`: a `401` reply to the initial `GET /admin/reports/overview` invokes the inherited `unauthorizedHandler` → session cleared → redirect to `/login`, no broken view (FR-001); `renderAtDashboard(fm, { admin: false })` → `/dashboard` is not reachable for a non-admin (FR-001, SC-007)
- [X] T014 [P] [US1] Accessibility test `tests/a11y/dashboard-a11y.test.tsx`: `vitest-axe` reports zero violations on the `loading` state, the error + Retry panel, and the populated screen (all three groups); each group title is a real heading (`<h2>` or role-appropriate) with its cards following in reading order; each card is announced as "label: value"; the page root is `dir="rtl"` (SC-008 smoke); a keyboard-only pass reaches and activates the **Refresh** control with a visible focus target; assert no figure's meaning is conveyed by colour alone (status/role cards are labelled text)

### Implementation for User Story 1

- [X] T015 [US1] Implement `useOverview()` in `src/overview/useOverview.ts` per [contracts/reports-ui.md](./contracts/reports-ui.md) / [data-model.md](./data-model.md) §6 — state `{ status: OverviewStatus, snapshot: OverviewSnapshot | null, lastUpdated: Date | null, refreshing: boolean, refreshError: boolean }`; on mount `load()` via `getOverview()` → `snapshot = normalizeOverview(data)`, `lastUpdated = new Date()`, `status = 'ready'`; on failure `status = 'error'` (snapshot stays `null`); expose `refresh()` that, for now, simply re-runs `load()` (full reload semantics — the keep-last-good path, the 60 s interval, and the visibility handling are added in US2); `refreshing` / `refreshError` are present but always `false` in this phase; a `401` on the call is handled by the shared `unauthorizedHandler` and never observed here; all state dropped on unmount (FR-002 / FR-011 / FR-015) (depends on T004, T008, T003)
- [X] T016 [P] [US1] Implement `StatCard` in `src/overview/StatCard.tsx` — props `{ label: string; value: string; href?: string | null; linkLabel?: string }`; when `href` is a non-empty string render a `react-router-dom` `<Link to={href}>` with `aria-label={linkLabel}` and a visible focus ring; otherwise a plain non-interactive figure; in both cases render `label` and `value` so assistive tech reads "label: value"; the numeric text is exactly the pre-formatted string passed in; never uses colour as the sole differentiator ([contracts/reports-ui.md](./contracts/reports-ui.md) "Components")
- [X] T017 [P] [US1] Implement `StatGroup` in `src/overview/StatGroup.tsx` — props `{ title: string; children }`; a `<section>` with a real `<h2>` heading = `title`, wrapping a responsive CSS-grid container for its `StatCard` children; RTL-friendly spacing ([contracts/reports-ui.md](./contracts/reports-ui.md) "Components")
- [X] T018 [US1] Implement `OverviewPage` in `src/overview/OverviewPage.tsx` — compose `useOverview()`; `status === 'loading'` → the `loading` indicator (no groups), visibly distinct from an all-zero populated screen; `status === 'error'` → an error panel with `loadError` + a **Retry** button calling `refresh()` (FR-011); `status === 'ready'` → a header (`pageTitle` + `subtitle`, a **Refresh** button calling `refresh()`, and a "آخر تحديث: HH:MM" line from `formatTime(lastUpdated)` — FR-015) followed by three `<StatGroup>`s: **users** (`usersGroupTitle`, a `<StatCard>` per `snapshot.roles` → `label = roleLabel[role]`, `value = formatCount(count)`, no `href`), **orders** (`ordersGroupTitle`, a `<StatCard>` per `snapshot.statuses` → `label = known ? statusLabel[status] : unknownStatusLabel(status)`, `value = formatCount(count)`, `href = known ? ordersStatusHref(status as OrderStatus) : null`, `linkLabel = statusCardLinkLabel(label, value)`), **revenue** (`revenueGroupTitle`, one `<StatCard label={revenueGroupTitle} value={formatCurrency(snapshot.revenue)} />` plus the `revenueScopeNote` line); own one persistent visually-hidden `role="status"` `aria-live="polite"` region carrying the `lastUpdated(formatTime(lastUpdated))` text; root `dir="rtl"`, `font-['Tajawal']`, brand `#7a0d0d` (FR-002/003/004/005/006/007/008/009/010/015/017/018/019) (depends on T015, T016, T017, T010, T006, T004, T009)
- [X] T019 [US1] In `src/App.tsx`, remove `import Dashboard from './pages/Dashboard'`, add `import OverviewPage from './overview/OverviewPage'`, and change the `/dashboard` `<Route>` element from `<Dashboard setModalType={setModalType} />` to `<OverviewPage />`. Leave the `modalType` state and the `AddCookModal` / `AddUserModal` / `NotificationModal` JSX in `AdminLayout` untouched (now dead but out of scope — research R2 / R10). No guard change (`/*` is already `<RequireAdmin>`) (FR-001) (depends on T018)
- [X] T020 [US1] Delete `src/pages/Dashboard.tsx` (the placeholder mock — weekly bar chart with fake data, `statsData` array, quick-action buttons). Confirm nothing else imports it (`grep -r "pages/Dashboard" src tests` → only the removed `App.tsx` line); the harness `DashboardStub` is a separate file and stays (depends on T019)
- [ ] T021 [US1] Run the quickstart "US1" scenarios 1–9 and the "Session loss" scenarios in [quickstart.md](./quickstart.md) against a Phase 8 backend and record results (depends on T019, T020)

**Checkpoint**: User Story 1 is fully functional and independently testable — this is the MVP. The screen loads once on mount and the Refresh button does a full reload; no 60 s auto-refresh, no "couldn't refresh" notice, no drill-down links yet (every orders-by-status card is a plain figure via the `ordersStatusHref` seam).

---

## Phase 4: User Story 2 - Administrator refreshes the overview to see current figures (Priority: P2)

**Goal**: The administrator re-fetches the live figures without leaving the dashboard — via a manual **Refresh** button and automatically every 60 seconds while the tab is visible. A refresh shows an in-progress indication while the previous figures stay on screen; on failure the last good figures stay put with a "couldn't refresh, showing last known figures" notice + retry. While the tab is hidden the 60 s cycle pauses; on return the screen fetches immediately and resumes the cycle. A manual refresh resets the interval.

**Independent Test**: With the overview on screen, click **Refresh** → one more `GET /admin/reports/overview`, figures update, "آخر تحديث" advances, an in-progress indication shows while the previous figures remain visible; make the refresh fail → the last good figures stay, a "تعذّر التحديث…" notice + retry appears, nothing blanks; with fake timers, advancing 60 s while `document.visibilityState === 'visible'` issues one automatic `GET`, while `'hidden'` issues none, and a `visibilitychange` back to `'visible'` issues one immediately; a manual refresh resets the next automatic tick to ~60 s later; a `401` on any refresh redirects to `/login`.

### Tests for User Story 2 ⚠️ (write first, must fail)

- [X] T022 [P] [US2] Integration test `tests/integration/dashboard-refresh.test.tsx` with mocked `fetch` and `vi.useFakeTimers()` (ordered replies on `GET /admin/reports/overview`; restore real timers in `afterEach`): AC1 clicking **Refresh** issues exactly one more `GET /admin/reports/overview` and the counts / revenue / "آخر تحديث" update to the new reply (FR-012); AC2 with a `delayMs` reply, a refresh-in-progress indication shows on the Refresh control (`aria-busy` / label swap to `refreshing`) while the previously retrieved figures stay fully visible (FR-013); AC3 a second reply with changed counts is reflected after a refresh (FR-016); AC4 a `500` / `networkError` on a refresh keeps the last good figures on screen, shows the `refreshFailedNotice` inline with a working retry, and blanks nothing (FR-014, SC-005); AC6 `await vi.advanceTimersByTimeAsync(REFRESH_INTERVAL_MS)` while `document.visibilityState === 'visible'` issues exactly one automatic `GET` using the same busy / failure handling (FR-016); AC8 after `Object.defineProperty(document, 'visibilityState', { value: 'hidden', configurable: true })` + `document.dispatchEvent(new Event('visibilitychange'))`, advancing `REFRESH_INTERVAL_MS` issues **zero** `GET`s; then setting `visibilityState` back to `'visible'` + dispatching `visibilitychange` issues **exactly one** `GET` immediately and the cycle resumes (FR-016); a manual **Refresh** click resets the interval so the next automatic tick is ~`REFRESH_INTERVAL_MS` later, not sooner (FR-016); overlapping triggers (a tick coinciding with a visibility-regain) issue **at most one** concurrent `GET` (single-flight guard); a `401` on a manual or automatic refresh routes through `unauthorizedHandler` → `/login` (FR-001); unmounting clears the interval and removes the `visibilitychange` listener (no `GET` after unmount when timers advance)
- [X] T023 [P] [US2] Extend `tests/a11y/dashboard-a11y.test.tsx` — `vitest-axe` clean on the `refreshError` state (last figures + inline notice + retry); the `refreshFailedNotice` is announced via the polite `aria-live` region when it appears; the notice conveys its meaning with text + an icon (not colour alone); the notice's **retry** button is keyboard-reachable and operable; the **Refresh** control exposes `aria-busy` while refreshing and its label change is announced *(same file as T014 — sequence after it)*

### Implementation for User Story 2

- [X] T024 [US2] Extend `useOverview()` in `src/overview/useOverview.ts` per [data-model.md](./data-model.md) §6 and research R5 / R6: make `refresh()` branch on `status` — `!== 'ready'` behaves as `load()`; `=== 'ready'` sets `refreshing = true`, `refreshError = false`, calls `getOverview()`, and on success replaces `snapshot` + `lastUpdated` and clears `refreshing`, on failure (non-`401`) keeps `snapshot` + `lastUpdated`, sets `refreshError = true`, clears `refreshing`; add a single-flight guard ref so overlapping calls collapse to one; add one effect owning `setInterval(tick, REFRESH_INTERVAL_MS)` where `tick()` calls `refresh()` only if `document.visibilityState === 'visible'`, plus a `visibilitychange` listener that on transition to `'visible'` calls `refresh()` immediately then `clearInterval` + fresh `setInterval`; the manual-button `refresh()` also does `clearInterval` + fresh `setInterval`; the effect cleanup clears the interval and removes the listener (FR-012 / FR-013 / FR-014 / FR-016) (depends on T015) *(same file as T015)*
- [X] T025 [US2] Extend `OverviewPage` in `src/overview/OverviewPage.tsx` — the **Refresh** button is `disabled` + `aria-busy` and its label swaps to `refreshing` while `refreshing` is true; when `refreshError` is true render an inline notice (text `refreshFailedNotice` + an icon, never colour-only) with a **retry** button calling `refresh()`, placed near the header without blanking the three groups (the previous `snapshot` stays rendered throughout); extend the persistent polite `aria-live` region so it carries `refreshFailedNotice` while `refreshError` is set and reverts to the `lastUpdated(...)` text on the next success (FR-013 / FR-014 / FR-015 / FR-019) (depends on T024) *(same file as T018)*
- [ ] T026 [US2] Run the quickstart "US2" scenarios 1–9 in [quickstart.md](./quickstart.md) against a Phase 8 backend (use tab-switching / DevTools `visibilityState` for the pause/resume checks) and record results (depends on T025)

**Checkpoint**: User Stories 1 and 2 both work independently. The screen now stays current on its own and degrades gracefully when a refresh fails.

---

## Phase 5: User Story 3 - Administrator jumps from an order-status figure to those orders (Priority: P3)

**Goal**: From a card in the orders-by-status group the administrator navigates to the orders screen filtered to that status. The users-by-role cards and the revenue card are display-only. This story's UI seam (`StatCard`'s `<Link>` branch + `OverviewPage` wiring through `ordersStatusHref`) is already in place from US1; **it activates only when feature `007-orders-oversight` ships a status-filtered `/orders` view and changes `ordersStatusHref` to return a target.** Until then every orders-by-status card is correctly a plain figure (FR-021). The tasks here lock that contract in with tests and a traceability check; no production code is expected to change in this phase.

**Independent Test**: With `ordersStatusHref` returning `null` (current default) every orders-by-status card renders as a plain, non-interactive figure and the users-by-role and revenue cards are never interactive. With `ordersStatusHref` stubbed (via `vi.mock`) to return `/orders?status=<value>`, an orders-by-status card renders as a link to that href whose accessible name names the status, is keyboard-operable, and navigates to the `/orders` stub; a zero-count status card still links; an unknown-status card stays plain.

### Tests for User Story 3 ⚠️ (write first, must fail)

- [X] T027 [P] [US3] Integration test `tests/integration/dashboard-drilldown.test.tsx` with mocked `fetch` via `renderAtDashboard`: **default (`ordersStatusHref` unmocked → `null`)** — every card in the orders group is a plain figure with no `role="link"` / anchor and is not focusable as a control; the users-by-role cards and the revenue card are likewise non-interactive (FR-020 / FR-021, US3 AC2/AC3). **With `vi.mock('../../src/overview/ordersLink', () => ({ ordersStatusHref: (s) => \`/orders?status=${s}\` }))`** — each known orders-by-status card renders as a `<Link>` to `/orders?status=<value>` with `aria-label` = `statusCardLinkLabel(label, value)` (names the status), Enter/click navigates to the `/orders` stub (US3 AC1/AC5); a status card whose count is `0` still renders the link and navigates (US3 AC6); an unknown (`known:false`) status card is passed `href={null}` and stays a plain figure (FR-021); the users-by-role and revenue cards remain non-interactive even with the mock active (FR-020, US3 AC2)
- [X] T028 [P] [US3] Extend `tests/a11y/dashboard-a11y.test.tsx` — with `ordersStatusHref` stubbed non-null, `vitest-axe` is clean with the orders-by-status links present; each link has a visible focus ring, is reachable by keyboard in reading order, and exposes an accessible name that names the status (`statusCardLinkLabel`) (FR-020 / FR-021) *(same file as T014 / T023 — sequence after them)*

### Implementation for User Story 3

- [X] T029 [US3] Verify — no production change expected — that `src/overview/StatCard.tsx` (T016) renders the `<Link>` branch exactly when `href` is a non-empty string and a plain figure otherwise, and that `src/overview/OverviewPage.tsx` (T018) already passes `href={known ? ordersStatusHref(status as OrderStatus) : null}` + `linkLabel={statusCardLinkLabel(label, value)}` for orders-by-status cards and **no** `href` for users-by-role and revenue cards. If T027 / T028 surface a gap, fix it here (in `StatCard.tsx` and/or `OverviewPage.tsx`). Add a one-line comment at `src/overview/ordersLink.ts` confirming it is the sole change point for feature `007` to enable this story (FR-020 / FR-021, research R7) (depends on T016, T018, T009)
- [ ] T030 [US3] Run the quickstart "US3" scenarios in [quickstart.md](./quickstart.md): without feature `007`, verify every orders-by-status card is a plain figure and the users/revenue cards are display-only; record that the link-navigation scenarios are deferred until `007` flips `ordersStatusHref` (depends on T029)

**Checkpoint**: All three user stories are accounted for. US1 + US2 are fully functional; US3's contract is enforced by tests and will light up with a one-line change when feature `007` ships.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Cross-story verification that does not belong to a single user story.

- [ ] T031 [P] Work through the quickstart "Accessibility — WCAG 2.1 AA" manual checklist in [quickstart.md](./quickstart.md) — keyboard-only reach/operation of **Refresh** and the refresh-error **retry**; screen-reader announcement of the "آخر تحديث" line and the "تعذّر التحديث…" notice via the live region; group headings and reading order; every card announced as "label: value" with Western digits; colour-independent meaning; AA contrast for headings / card text / button / notice against brand red `#7a0d0d`; and the full RTL sign-off (header, three groups, cards, "آخر تحديث" line, notice, loading and error states; each number + unit reads left-to-right within its span) (FR-019 / FR-020 / FR-021 / SC-008)
- [X] T032 [P] Verify observability and config: a failed `GET /admin/reports/overview` (initial or refresh) is logged through the existing `logger` seam inside `apiRequest` with status + path only (no figures); **no** new environment variable is introduced and `import.meta.env.VITE_API_BASE_URL` remains the only base-URL source; confirm `src/api/*` has no diff for this feature (plan "Constraints", research R1 / R10)
- [X] T033 [P] Full regression: run `npm run test:run` and `npm run build` — all unit / integration / a11y suites green; `tsc` + `vite build` clean; confirm **no** pre-existing test file changed, the harness `DashboardStub` is untouched, and `src/pages/Dashboard.tsx` is gone with no dangling import
- [X] T034 Final traceability review against [spec.md](./spec.md): confirm every FR-001…FR-021 and SC-001…SC-008 is exercised by a task above (US3's link-navigation criteria explicitly deferred to feature `007`), and tick the "Definition of done for this feature" bullets in [quickstart.md](./quickstart.md)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: no dependencies — start immediately. T001, T002 are independent `[P]`.
- **Foundational (Phase 2)**: depends on Setup. **Blocks all user stories.** T003 → T004 / T008 / T009; T004 → T005; T006 → T007; T010 independent; T011 is the checkpoint after T003–T010.
- **User Story 1 (Phase 3)**: depends on Foundational. T015 → T018; T016 / T017 `[P]` after Foundational; T018 → T019 → T020 → T021.
- **User Story 2 (Phase 4)**: depends on Foundational; builds on US1's `useOverview` (T015) and `OverviewPage` (T018). Independently testable once US1 is in. T024 → T025 → T026.
- **User Story 3 (Phase 5)**: depends on Foundational; verifies the seam built in US1 (T016 / T018 / T009). Independently testable via `vi.mock`. Full runtime behaviour additionally depends on feature `007-orders-oversight`. T027 / T028 `[P]` → T029 → T030.
- **Polish (Phase 6)**: depends on all desired user stories being complete.

### User Story Dependencies

- **US1 (P1)**: no dependency on other stories. MVP.
- **US2 (P2)**: extends US1's hook + page (same files) — sequence after US1; no logic dependency that breaks US1's independent tests.
- **US3 (P3)**: no code dependency on US2; only touches test files + a verification task. Runtime activation depends on external feature `007`.

### Within Each User Story

- Tests are written first and must fail before the implementation they cover.
- `useOverview` (hook) before `OverviewPage` (screen); `StatCard` / `StatGroup` before `OverviewPage`.
- Route repoint (`App.tsx`) after the screen exists; delete the placeholder after the route no longer references it.
- Story complete and its checkpoint validated before moving to the next priority.

### Parallel Opportunities

- Setup: T001, T002 together.
- Foundational: after T003, run T004 / T008 / T009 in parallel; T006 and T010 in parallel with them; T005 after T004, T007 after T006.
- US1: T012 / T013 / T014 (tests) in parallel; then T016 / T017 in parallel; T015 in parallel with T016 / T017; T018 after all four.
- US2: T022 / T023 in parallel; then T024 → T025.
- US3: T027 / T028 in parallel; then T029.
- Polish: T031 / T032 / T033 in parallel; T034 last.
- Different developers can take US1, US2, US3 in parallel once Foundational is done, coordinating on the two shared files (`useOverview.ts`, `OverviewPage.tsx`) via the serialization points above.

---

## Parallel Example: User Story 1

```bash
# Tests for User Story 1 together (write first, must fail):
Task: "Integration test tests/integration/dashboard-overview.test.tsx"
Task: "Integration test tests/integration/dashboard-session.test.tsx"
Task: "Accessibility test tests/a11y/dashboard-a11y.test.tsx"

# Presentational components for User Story 1 together:
Task: "Implement StatCard in src/overview/StatCard.tsx"
Task: "Implement StatGroup in src/overview/StatGroup.tsx"
# (useOverview in src/overview/useOverview.ts can run alongside these)
```

## Parallel Example: Foundational

```bash
# After T003 (types) lands:
Task: "Implement src/overview/overviewModel.ts"      # T004
Task: "Implement src/overview/overviewApi.ts"        # T008
Task: "Implement src/overview/ordersLink.ts"         # T009
Task: "Implement src/overview/format.ts"             # T006
Task: "Create src/overview/messages.ts"              # T010
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (T001–T002).
2. Complete Phase 2: Foundational (T003–T011) — **blocks everything**.
3. Complete Phase 3: User Story 1 (T012–T021).
4. **STOP and VALIDATE**: run the US1 integration + a11y suites and the quickstart US1 + Session-loss scenarios. The dashboard home screen now shows the live snapshot with loading / error / Retry and a manual full-reload Refresh.
5. Deploy / demo if ready.

### Incremental Delivery

1. Setup + Foundational → foundation ready.
2. Add US1 → test independently → deploy/demo (MVP — the overview screen).
3. Add US2 → test independently → deploy/demo (auto-refresh + "couldn't refresh" resilience).
4. Add US3 tests + verification → the drill-down seam is contract-locked; links activate later with a one-line change in `src/overview/ordersLink.ts` once feature `007` ships.
5. Polish (T031–T034).

### Parallel Team Strategy

1. Team completes Setup + Foundational together.
2. Then: Dev A → US1; Dev B → US2 (coordinating on `useOverview.ts` / `OverviewPage.tsx` per the serialization points); Dev C → US3 test files.
3. Stories integrate independently; US1's tests stay green as US2/US3 land.

---

## Notes

- `[P]` tasks = different files, no dependency on an incomplete task.
- `[Story]` label maps a task to a user story for traceability; Setup / Foundational / Polish carry no label.
- **No `src/api/` change** — `GET` is already supported; do not widen `HttpOptions.method`.
- **No new runtime dependency** — no chart library; `orders_by_status` is twelve labelled count cards.
- Verify each test fails before implementing the code it covers.
- Commit after each task or logical group.
- Stop at any checkpoint to validate a story independently.
- Avoid: vague tasks, same-file conflicts (respect the serialization points), cross-story dependencies that break US1's independent testability.
