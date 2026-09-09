# Contract — Internal UI: Dashboard Reports / Overview

Feature: `008-dashboard-reports-overview`

Internal module boundaries for the new `src/overview/` folder, plus the edits to existing files. Types are described, not restated verbatim — see [data-model.md](../data-model.md).

---

## `src/App.tsx` (edited — route repoint)

- Remove `import Dashboard from './pages/Dashboard'`; add `import OverviewPage from './overview/OverviewPage'`.
- `<Route path="/dashboard" element={<Dashboard setModalType={setModalType} />} />` → `<Route path="/dashboard" element={<OverviewPage />} />`.
- No other route change, no guard change (`/*` is already wrapped in `<RequireAdmin>`).
- The `modalType` state in `AdminLayout` and the `AddCookModal` / `AddUserModal` / `NotificationModal` JSX blocks it gates are now unreachable (only `Dashboard` set `modalType`). **Left as-is** — removing the placeholder quick-action modals is out of scope for Phase 8 (research R2 / R10). `setSidebarOpen` and the rest of `AdminLayout` are untouched.

## `src/pages/Dashboard.tsx` (deleted)

Placeholder mock: a weekly-orders bar chart with hard-coded data, a `statsData` array of Arabic-Indic mock numbers, and quick-action buttons. Removed once the route is repointed. Not referenced anywhere else (the test harness uses its own `DashboardStub`, not this file).

## `src/components/Sidebar.tsx` (unchanged)

The entry `{ name: 'لوحة التحكم', icon: LayoutGrid, path: '/dashboard' }` already exists and already points at the route this feature now owns. No edit.

## `src/api/*` (unchanged)

`GET` is already in `HttpOptions.method`. No transport change (contrast Phases 5/6). `authedRequest`, `ApiError`, `parseEnvelope`, `unauthorizedHandler`, `logger` are reused verbatim.

---

## `src/overview/overviewApi.ts` (new)

```ts
function getOverview(signal?: AbortSignal): Promise<RawOverview>
// GET /admin/reports/overview → data (RawOverview). No body, no query. Propagates ApiError.
```

- Calls `authedRequest<RawOverview>('/admin/reports/overview', { signal })`, never `apiRequest` directly.
- No memo / cache — `useOverview` holds the single snapshot for the life of the screen.
- No `404` / `422` handling — the endpoint is a singleton computed view.

---

## `src/overview/types.ts` (new)

Exports: `Role`, `OrderStatus`, `RawOverview`, `RoleCount`, `StatusCount`, `OverviewSnapshot`, `OverviewStatus`, and the constants `ROLE_ORDER`, `STATUS_ORDER`, `REFRESH_INTERVAL_MS`. Shapes in [data-model.md §1–§3](../data-model.md).

---

## `src/overview/overviewModel.ts` (new — pure)

```ts
function normalizeOverview(raw: RawOverview): OverviewSnapshot
```

- Iterates `ROLE_ORDER` then `STATUS_ORDER`, filling missing wire keys with `0`; appends unknown `orders_by_status` keys as `StatusCount { known: false }` in object-key order; coerces `total_sales_revenue` to a finite `≥ 0` number (`0` otherwise). See [data-model.md §4](../data-model.md) for the full table.
- Pure: no `Date`, no I/O, no `messages` import. Deterministic.

Unit tests: [data-model.md §4](../data-model.md).

---

## `src/overview/format.ts` (new — pure)

```ts
function formatCount(n: number): string      // Intl.NumberFormat('en-US') on trunc(max(0,n))
function formatCurrency(n: number): string   // Intl.NumberFormat('en-US', 2dp) on max(0,n) + ' ج.م'
function formatTime(d: Date): string         // 24-hour "HH:MM", Western digits
```

- Locale pinned to `'en-US'` → Western digits + `,` groups regardless of viewer locale (clarify Q4).
- No `messages` dependency; the currency unit is a local constant kept identical to `messages.currencyUnit`.

Unit tests: [data-model.md §5](../data-model.md).

---

## `src/overview/ordersLink.ts` (new)

```ts
function ordersStatusHref(status: OrderStatus): string | null
```

- **Returns `null` for every status now** — there is no working status-filtered `/orders` view yet, so every orders-by-status card renders as a plain figure (FR-021).
- When Phase 7 ships a filtered orders screen, that phase changes this one function to return `/orders?status=${encodeURIComponent(status)}` for supported statuses (and `null` for any unsupported). No other file in `src/overview/` changes.
- `StatCard` calls it only for orders-by-status cards; unknown (`known: false`) statuses are passed as `null` by the caller and never reach here.

See [data-model.md §7](../data-model.md).

---

## `src/overview/useOverview.ts` (new — hook)

Public shape: [data-model.md §6](../data-model.md).

```ts
interface UseOverview {
  status: OverviewStatus              // 'loading' | 'ready' | 'error'
  snapshot: OverviewSnapshot | null   // last SUCCESSFUL snapshot; survives a failed refresh
  lastUpdated: Date | null
  refreshing: boolean
  refreshError: boolean
  refresh: () => void                 // manual; also resets the 60s interval
}
```

- Mount → `load()` → `getOverview()` → `snapshot = normalizeOverview(data)`, `lastUpdated = new Date()`, `status='ready'`; on failure `status='error'` (snapshot stays `null`).
- `refresh()`:
  - `status !== 'ready'` → behaves as `load()`.
  - `status === 'ready'` → `refreshing=true`, `refreshError=false` → `getOverview()` → success: replace `snapshot` + `lastUpdated`, `refreshing=false`; failure (non-401): `refreshing=false`, `refreshError=true`, `snapshot`/`lastUpdated` unchanged.
- One `setInterval(tick, REFRESH_INTERVAL_MS)` on mount; `tick()` calls `refresh()` only if `document.visibilityState === 'visible'`.
- A `visibilitychange` listener: on transition to `'visible'` → `refresh()` immediately, then `clearInterval` + new `setInterval`.
- `refresh()` from the manual button also does `clearInterval` + new `setInterval`.
- A single-flight guard ref prevents overlapping `getOverview` calls.
- Cleanup: `clearInterval`, `removeEventListener('visibilitychange', …)`.
- A `401` on any call is handled by the shared `unauthorizedHandler` and never observed here.

---

## Components (new)

| Component | Key props | Responsibility |
|---|---|---|
| `OverviewPage` | — | `/dashboard` screen. Owns `useOverview()`. Header: `messages.pageTitle` + `subtitle`; a **Refresh** button (`disabled` + `aria-busy` while `refreshing`, label swaps to `messages.refreshing`); a "آخر تحديث: HH:MM" line from `formatTime(lastUpdated)`; when `refreshError`, an inline notice `messages.refreshFailedNotice` + a retry button (calls `refresh()`), text + icon, never colour-only. Body renders one of: `messages.loading` indicator (distinct from an all-zero snapshot) / an error panel with `messages.loadError` + **Retry** (`refresh()`) / the three `StatGroup`s. One persistent visually-hidden `role="status"` `aria-live="polite"` region carrying the `lastUpdated` / `refreshFailedNotice` text. RTL, Tajawal, brand `#7a0d0d`. |
| `StatGroup` | `title: string`, `children` | `<section>` with an `<h2>` heading = `title`. Wraps a responsive CSS-grid of cards. Rendered for users (`messages.usersGroupTitle`), orders (`messages.ordersGroupTitle`), and revenue (`messages.revenueGroupTitle`, holding one card + the `messages.revenueScopeNote` line). |
| `StatCard` | `label: string`, `value: string` (pre-formatted), `href?: string \| null`, `linkLabel?: string` | `href` non-empty → a React Router `<Link to={href}>` with `aria-label={linkLabel}` and a focus-visible ring; else a plain non-interactive figure. Renders `label` and `value` so assistive tech reads "label: value". Numeric text is always the Western-digit string passed in. No colour-only meaning. |

`OverviewPage` builds the cards:

- **Users group**: for each `snapshot.roles[i]` → `<StatCard label={messages.roleLabel[role]} value={formatCount(count)} />` (no `href`).
- **Orders group**: for each `snapshot.statuses[i]` → `label = known ? messages.statusLabel[status] : messages.unknownStatusLabel(status)`; `value = formatCount(count)`; `href = known ? ordersStatusHref(status as OrderStatus) : null`; `linkLabel = messages.statusCardLinkLabel(label, value)`.
- **Revenue group**: one `<StatCard label={messages.revenueGroupTitle} value={formatCurrency(snapshot.revenue)} />` plus the `revenueScopeNote`.

---

## `src/overview/messages.ts` (new)

Arabic, RTL, provisional wording. Full key list in [data-model.md §9](../data-model.md). Group titles / labels / role names / status names are Arabic; card values are pre-formatted Western-digit strings from `format.ts`.

---

## `tests/helpers` (extended)

- `fixtures.ts`:
  - `overview(overrides: Partial<RawOverview> = {}): RawOverview` — a full payload: all four roles (`customer: 1240, cook: 85, driver: 60, admin: 3`), all twelve statuses (sample counts, `completed: 980`), `total_sales_revenue: 154300`, shallow-merged with `overrides` (so a test can pass `{ users_by_role: {} }` or `{ orders_by_status: { pending: 0, /* … */ } }` or `{ total_sales_revenue: 0 }`).
  - `overviewResponse(data: RawOverview)` → `ok(data)` (message `'OK'`).
  - reuse `fail(...)` for the `500` (`fail('Something went wrong. Please try again.')`) and a `{ networkError: true }` reply for the `0` case.
- `harness.tsx`: `renderAtDashboard(fm, { seedMe = true, admin = true } = {})` — mirrors `renderAtSettings`: `__resetCityDirectory()` not needed; seeds `STORAGE_KEYS.token` + `STORAGE_KEYS.profile` (admin or `{ …adminUser, role: 'customer' }`), optional `GET /auth/me` reply, renders the real `OverviewPage` at `/dashboard` inside `<RequireAdmin>` in a `MemoryRouter` with a `/login` stub route (session-loss assertion) and an `/orders` stub route (drill-down a11y check). Returns the `render` result.

---

## Test files (new) — see [plan.md](../plan.md) Project Structure and [quickstart.md](../quickstart.md)

| File | Covers |
|---|---|
| `tests/unit/overviewModel.test.ts` | `normalizeOverview` — fixed order, missing keys → 0, unknown status → `known:false` row, revenue coercion, `{}` → all zeros (FR-006/017/018) |
| `tests/unit/overviewFormat.test.ts` | `formatCount` / `formatCurrency` / `formatTime` — grouping, 2dp currency + `ج.م`, Western-digit assertion (FR-008/SC-008) |
| `tests/integration/dashboard-overview.test.tsx` | US1 — three groups; all 4 roles + 12 statuses incl. zeros in fixed order; revenue currency + scope note; loading ≠ all-zero; all-zero platform; failed first load + Retry; unknown status fallback; large numbers grouped (FR-002–011/017–019, SC-001/002/003/006/008) |
| `tests/integration/dashboard-refresh.test.tsx` | US2 — manual refresh updates figures + `lastUpdated`; in-progress indication keeps previous figures; changed data reflected; failed refresh keeps last good + notice + retry; fake-timer 60 s tick auto-refreshes; hidden tab → no tick call; visible again → immediate call + cycle resumes; manual refresh resets interval (FR-012–016, SC-004/005) |
| `tests/integration/dashboard-session.test.tsx` | FR-001 — `401` on initial GET or on refresh → session-loss → `/login`; non-admin never reaches `/dashboard` (SC-007) |
| `tests/a11y/dashboard-a11y.test.tsx` | axe on loading / error+Retry / populated / refresh-error-notice; keyboard: Refresh + retry; live region; heading structure; Western digits; not colour-only; (with `ordersStatusHref` stubbed non-null) an orders-by-status card is a keyboard-operable link with a status-naming accessible name (FR-020/021, SC-008) |
