# Phase 0 Research: Dashboard Reports / Overview

Feature: `008-dashboard-reports-overview` · Date: 2026-09-07

All Technical Context unknowns are resolved below. No open `NEEDS CLARIFICATION` remain — `/speckit-clarify` closed the five real ambiguities (Q1 always show all twelve statuses incl. zeros in a fixed order; Q2 only orders-by-status cards link, to the filtered orders screen, others display-only; Q3 auto-refresh every 60 s plus a manual button; Q4 Western/Latin digits with thousands separators, Arabic labels; Q5 auto-refresh pauses while the tab is hidden and fetches immediately on return) and the spec's Assumptions section fixed the rest (overview is the `/dashboard` landing screen, read-only, no filters, `completed` means the `completed` status only, one platform-wide revenue total, currency formatting matches the rest of the dashboard, no `404`). This document records the design decisions that follow.

---

## R1. Authenticated request seam (FR-001, the one endpoint)

**Decision**: Reuse the Phase 1 seam in `src/api/httpClient.ts` **unchanged**:

- `authedRequest<T>(path, opts)` reads the ambient token; if `null`, throws `ApiError(0, "No active session")` without a network call; otherwise delegates to `apiRequest<T>` with `Authorization: Bearer <token>`.
- `AuthProvider` already calls `setTokenProvider(readToken)` and `setUnauthorizedHandler(...)` on mount. `getOverview` calls `authedRequest`, never `apiRequest` directly.
- **No `src/api/` edit at all** — `GET` is already in `HttpOptions.method` (contrast Phase 5, which needed `PUT | PATCH`, and Phase 6, which needed `PUT`).

**Rationale**: Feature code never sees or stores the bearer token. `401` handling is centralised — `apiRequest` calls `unauthorizedHandler` on a token-bearing `401`, which `AuthContext` wires to `clearSession()` + `SESSION_LOST` → `<RequireAdmin>` redirects to `/login`. This feature gets FR-001's unauthenticated behaviour for free, on both the initial load and every refresh.

**Alternatives considered**:
- *Expose `token` from `useAuth()`* — rejected: forces the call site to thread the token and widens the misuse surface.
- *An overview-specific transport* — rejected: the existing wrapper already does envelope parsing, `ApiError` normalisation, and `401` routing.

---

## R2. Screen placement — replace the placeholder, repoint `/dashboard` (FR-002, Assumptions)

**Context**: `src/App.tsx` `AdminLayout` renders `<Route path="/dashboard" element={<Dashboard setModalType={setModalType} />} />`. `src/pages/Dashboard.tsx` is a placeholder: a weekly-orders bar chart with hard-coded data, a `statsData` array of Arabic-Indic mock numbers, and quick-action buttons that set `modalType` to open `AddCookModal` / `AddUserModal` / `NotificationModal` (themselves placeholders with no API). The sidebar entry `{ name: 'لوحة التحكم', icon: LayoutGrid, path: '/dashboard' }` already exists and is the first item.

**Decision**:
- Delete `src/pages/Dashboard.tsx`. In `src/App.tsx`, drop its import, add `import OverviewPage from './overview/OverviewPage'`, and change the `/dashboard` `<Route>` element to `<OverviewPage />` (no prop).
- **No `Sidebar.tsx` change** — the entry already points at the route this feature now owns (same pattern as Phase 6 with `/settings`).
- Leave the rest of `AdminLayout` untouched. Its `modalType` state and the three `Add*Modal` / `NotificationModal` JSX blocks become unreachable (only `Dashboard` set `modalType`). Removing those placeholder quick-action modals is **out of scope for Phase 8** — it touches unrelated scaffold features and would enlarge the diff for no Phase-8 benefit. Noted for a later cleanup.

**Rationale**: Mirrors Phase 6 exactly (delete `pages/Settings.tsx` mock, repoint the route, no sidebar edit). The spec's Assumptions say the overview *is* the dashboard home screen reached after sign-in; `/dashboard` is that route. Keeping the diff to one route element + one deleted file is the smallest correct change.

**Alternatives considered**:
- *Keep `Dashboard.tsx` as a shell and mount `<OverviewCards />` inside it* — rejected: its chart and quick actions are placeholder features not in any spec; keeping them means keeping fake data on the real screen.
- *Rip out the `modalType` scaffolding too* — rejected: unrelated to Phase 8; a separate cleanup PR.
- *A new `/overview` route distinct from `/dashboard`* — rejected: the spec says this is the landing screen; a second route would orphan the existing sidebar entry.

---

## R3. Fixed role/status order and normalisation (FR-006, FR-017, FR-018, clarify Q1)

**Decision**: A pure `normalizeOverview(raw: RawOverview): OverviewSnapshot` in `src/overview/overviewModel.ts`, driven by two module constants:

```ts
const ROLE_ORDER   = ['customer', 'cook', 'driver', 'admin'] as const
const STATUS_ORDER  = ['pending', 'accepted', 'preparing', 'ready_for_pickup',
  'assigned_to_driver', 'picked_up', 'on_the_way', 'delivered', 'completed',
  'cancelled', 'pending_review', 'quoted'] as const
```

- `roles`: one `RoleCount { role, count }` per entry in `ROLE_ORDER`, in that order. A key missing from `raw.users_by_role` → `count: 0`.
- `statuses`: one `StatusCount { status, count, known }` per entry in `STATUS_ORDER` (`known: true`), in that order, each missing key → `count: 0`. Then any key present in `raw.orders_by_status` that is **not** in `STATUS_ORDER` is appended as `StatusCount { status: key, count, known: false }` (stable order: object-key order, which mirrors the API's declared list). `known: false` tells `StatCard` to render the fallback label `messages.unknownStatusLabel(key)`.
- `revenue`: `Number(raw.total_sales_revenue)`, or `0` if that is `NaN` / missing.
- An empty object `{}` yields all-zero roles + all-zero known statuses + no unknowns + `revenue: 0` (covers FR-010 / FR-017 together).
- Every `count` is coerced with `Number(x) || 0` so a stray `null` / string cannot produce `NaN` on screen.

**Rationale**: Clarify Q1 requires all twelve statuses and all four roles always, in a stable order. Encoding the order once as a constant the model iterates over makes "fixed order" a property of the code, not of the response, and makes the missing-key and unknown-key rules (FR-017/FR-018) a single well-tested function. The screen then renders `snapshot.roles` / `snapshot.statuses` verbatim.

**Alternatives considered**:
- *Render straight from `Object.entries(raw.orders_by_status)`* — rejected: order and completeness would follow the response, violating Q1/FR-006; a dropped key would silently vanish.
- *Drop unknown statuses* — rejected by FR-018 (must still show the count with a fallback label).
- *Sort statuses by count* — rejected: order must be stable between retrievals (FR-006).

---

## R4. Number and currency formatting (FR-008, FR-019, SC-008, clarify Q4)

**Decision**: A pure `src/overview/format.ts`:

- `formatCount(n: number): string` → `new Intl.NumberFormat('en-US').format(Math.trunc(n))` — Western digits, comma thousands separators, no decimals (counts are integers). `en-US` is pinned so the digit/separator style does not follow the viewer locale (Q4: always Western/Latin with thousands separators).
- `formatCurrency(n: number): string` → `new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n)` + `' '` + `messages.currencyUnit` (`'ج.م'`). Two decimals always, so `154300` → `"154,300.00 ج.م"` and `154300.5` → `"154,300.50 ج.م"`, matching the Phase 6 `formatFee` convention (`toFixed(2)` + unit).
- Both are dependency-free (`Intl` is in every target browser and in jsdom).

**Rationale**: Q4 fixes the numeral system for every figure on the screen; a pinned `Intl.NumberFormat('en-US')` gives grouped Western digits deterministically and is unit-testable (SC-008). Currency style matches the existing Settings screen so the two dashboards read consistently (spec Assumption). Truncating counts guards against a fractional count in a malformed response.

**Alternatives considered**:
- *Manual `String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ',')`* — works but re-implements `Intl`; rejected for the currency case (rounding, locale edge cases).
- *`Intl.NumberFormat(undefined, …)` (viewer locale)* — rejected by Q4: an `ar-EG` viewer would get Arabic-Indic digits.
- *`style: 'currency', currency: 'EGP'`* — rejected: emits `"EGP"` / `"£E"` glyphs, not the dashboard's `"ج.م"`; Phase 6 already settled on a plain amount + `"ج.م"` suffix.

---

## R5. The data hook — load, manual refresh, last-updated, refresh-error (FR-011..FR-015)

**Decision**: `useOverview()` in `src/overview/useOverview.ts` owns:

| State | Meaning |
|---|---|
| `status: 'loading' \| 'ready' \| 'error'` | `loading` only on the first load with nothing shown; `ready` once a snapshot is in hand; `error` only when the **first** load fails |
| `snapshot: OverviewSnapshot \| null` | the last **successful** normalised snapshot; never cleared by a failed refresh |
| `lastUpdated: Date \| null` | timestamp set on every successful fetch (FR-015) |
| `refreshing: boolean` | a re-fetch (manual, interval, or on-visible) is in flight while a snapshot is already shown (FR-013) |
| `refreshError: boolean` | the most recent re-fetch failed; cleared by the next successful fetch or a new refresh attempt (FR-014) |

- `load()` (mount): `status='loading'` → `getOverview()` → `snapshot = normalizeOverview(data)`, `lastUpdated = new Date()`, `status='ready'`; on failure `status='error'` (nothing shown).
- `refresh()` (manual button, interval tick, visibility-regain): if `status !== 'ready'` it behaves as `load()`; otherwise `refreshing=true`, `refreshError=false` → `getOverview()` → on success replace `snapshot` + `lastUpdated`, `refreshing=false`; on failure keep `snapshot` + `lastUpdated`, set `refreshError=true`, `refreshing=false`.
- Exactly one in-flight `getOverview` at a time — a guard ref drops a tick/visibility refresh if one is already running (rapid `visibilitychange` + interval overlap). The manual button is disabled while `refreshing`.
- A `401` on either call is handled by the shared `unauthorizedHandler` and never observed here.

**Rationale**: This is the `useDriverApplications` / `usePlatformSettings` shape (first-load error vs. keep-what-you-have on refresh), extended with the "last known figures" retention and the timestamp the spec calls for. Keeping `snapshot` as *last success only* makes FR-011 (no partial/stale as current on first load — there is nothing, so it's the error state) and FR-014 (refresh failure keeps the good data + a notice) fall out of the same field.

**Alternatives considered**:
- *One `data` field mutated in place* — rejected: a failed refresh could leave a half-updated object; a whole-snapshot swap on success only is atomic.
- *A data-fetching library (TanStack Query etc.)* — rejected: one endpoint, one screen; `useState` + `useEffect` + one `setInterval` is smaller and dependency-free, consistent with Phases 1–6.

---

## R6. Auto-refresh every 60 s, paused while hidden (FR-016, clarify Q3 + Q5)

**Decision**: In `useOverview`, one effect owns a `setInterval(tick, 60_000)` plus a `document` `visibilitychange` listener:

- `tick()` calls `refresh()` **only if** `document.visibilityState === 'visible'`. (A timer can still fire once in some browsers just after the tab hides; the guard makes that a no-op.)
- `onVisibilityChange()`: when `visibilityState` flips to `'visible'`, call `refresh()` immediately, then `clearInterval` + `setInterval` again so the next automatic tick is a full 60 s after the return (the "resume the 60-second cycle" in Q5). When it flips to `'hidden'`, nothing extra — the guard in `tick()` covers the paused state.
- `refresh()` from the **manual button** also resets the interval (`clearInterval` + fresh `setInterval`) so a manual refresh and the next auto tick can't bunch up (FR-016: "a manual refresh MUST reset the interval").
- The effect's cleanup clears the interval and removes the listener. The effect depends only on stable callbacks, so it is set up once per mount.
- 60 000 ms is a module constant `REFRESH_INTERVAL_MS` so tests can import it.

**Rationale**: Q3 wants a 60 s poll on top of the manual button; Q5 wants that poll paused while hidden with an immediate catch-up fetch on return. The Page Visibility API (`visibilityState` + `visibilitychange`) is the standard, universally supported mechanism and is fully controllable from jsdom (override the property, dispatch the event). Guarding `tick()` on `visibilityState` rather than tearing the interval down on hide keeps the effect simple and race-free; the explicit interval reset on return and on manual refresh keeps the cadence predictable.

**Alternatives considered**:
- *`clearInterval` on hide, `setInterval` on show* — equivalent behaviour but two code paths mutating the timer; the single always-running interval + a visibility guard is fewer moving parts.
- *Keep polling while hidden (Q5 option B)* — rejected by the clarification: needless load on an uncached endpoint from background tabs.
- *`setTimeout` chain instead of `setInterval`* — considered; `setInterval` + guard is adequate and the reset-on-manual-refresh is a clean `clear`+`set`.
- *Pause via `requestIdleCallback` / focus events* — rejected: `visibilitychange` is the precise signal; `focus`/`blur` miss the "other window covering this one" case inconsistently.

---

## R7. Drill-down seam — orders-by-status cards (FR-020, FR-021, clarify Q2, User Story 3 / P3)

**Context**: Q2 chose: only the orders-by-status cards link, and only to the orders screen filtered to that status; users-by-role and revenue cards are display-only; a status card with no available target is a plain figure. Phase 7 (Orders Oversight) currently has a spec only — no plan, no implementation — and the placeholder `src/pages/OrdersPage.tsx` ignores query params.

**Decision**:
- `src/overview/ordersLink.ts` exports `ordersStatusHref(status: OrderStatus): string | null`. **Today it returns `null`** for every status (there is no working filtered `/orders` view yet).
- `StatCard`, when rendering an orders-by-status card, calls `ordersStatusHref(status)`. `null` → a plain `<div>` figure with no interactive semantics. A string → a `<Link to={href}>` whose accessible name is `messages.statusCardLinkLabel(label, count)` ("عرض طلبات <الحالة>"), keyboard-reachable and operable (React Router `<Link>` gives that for free), focus-visible.
- Users-by-role cards and the revenue card never consult the seam — always plain figures.
- **When Phase 7 ships** a status-filtered `/orders` route, its plan changes this one function to `return \`/orders?status=${encodeURIComponent(status)}\`` (and, if some statuses are unsupported there, returns `null` for those). No other file in this feature changes. `known: false` (unknown) statuses always get `null` — there is no orders filter value for a status the client doesn't recognise.

**Rationale**: User Story 3 is P3 and explicitly "depends on the orders oversight screen existing ... may be deferred". Isolating the entire dependency in one pure function lets Phase 8 ship complete and correct now (every card a plain figure — exactly FR-021's degradation clause), and lets Phase 7 light up the links with a one-line change and its own tests. It also keeps this feature's a11y contract testable now: a test can stub `ordersStatusHref` to a string and assert the link's keyboard operability and accessible name.

**Alternatives considered**:
- *Implement `/orders?status=` here* — rejected: that is Phase 7's screen and query handling; building it from Phase 8 would duplicate/pre-empt that work and its tests.
- *Ship no drill-down code at all until Phase 7* — rejected: the seam + the `StatCard` branch are tiny, keep US3 visible in `tasks.md`, and give Phase 7 a defined integration point instead of a later retrofit.
- *A runtime feature flag / context* — rejected: over-engineered; a pure function the next phase edits is enough.

---

## R8. Toast / notice and the live region (FR-014, FR-015, FR-019, SC-008)

**Decision**: The screen has **no success toast** (nothing is mutated). It has:

- A persistent, visually-hidden `role="status"` `aria-live="polite"` region that carries the current announcement text: on `ready`, `messages.lastUpdated(lastUpdated)`; when `refreshError`, `messages.refreshFailedNotice`. Changing between them re-announces.
- A visible "آخر تحديث: HH:MM" line near the header (from `lastUpdated`, formatted with a small `formatTime` helper — Western digits, 24-h `HH:MM`).
- A visible inline notice (not a transient bubble) when `refreshError` is set: "تعذّر التحديث، تُعرض آخر أرقام معروفة" + a **retry** button that calls `refresh()`. It clears when the next fetch succeeds.
- The `refreshing` state shows a small spinner/`aria-busy` on the Refresh control while the previous figures stay fully visible (FR-013).

**Rationale**: The Phase 3 transient-bubble toast is for one-off action feedback; here the "how current" and "couldn't refresh" states are *sticky* conditions of the screen, so they are rendered as persistent UI with a matching live-region announcement (FR-014/FR-015). No colour-only signalling — the notice has text + an icon (SC-008 / FR-019).

**Alternatives considered**:
- *A transient toast for the refresh failure* — rejected: it would disappear while the stale-data condition persists; the administrator needs a standing indication.
- *Silently retry on failure with no notice* — rejected by FR-014.

---

## R9. Routing, sidebar, and the guard (FR-001)

**Decision**: In `src/App.tsx` `AdminLayout`, swap the `/dashboard` `<Route>` element to `<OverviewPage />` and fix the imports (R2). No new guard — `<RequireAdmin>` already wraps `/*`, so an unauthenticated visitor hits the session-loss redirect and a signed-in non-admin never reaches `/dashboard` (FR-001, SC-007). `Sidebar.tsx` is untouched — "لوحة التحكم" → `/dashboard` already exists.

**Rationale**: Route, layout, guard, header, and sidebar all exist from Phase 1; this feature supplies one page body. Same as Phase 6.

**Alternatives considered**: none material — this is the established pattern.

---

## R10. What is explicitly NOT built

- **No chart / graph.** `orders_by_status` is twelve labelled count cards, not a bar chart (spec: "a labelled count for each order status"). `chart.js` / `react-chartjs-2` stay installed for `FinancialReports.tsx` but are unused here — no new dependency, and none removed.
- **No `src/api/` change.** `GET` is already supported (contrast Phases 5/6 widening `HttpOptions.method`).
- **No dialog / `DialogShell`.** Nothing is confirmed or edited.
- **No pagination, no filters, no query string** on the request.
- **No removal of the `modalType` quick-action scaffolding** in `AdminLayout` (R2) — out of scope, left dead.
- **No per-city / per-cook / per-period revenue breakdown** (spec Assumption — one platform-wide total).

---

## R11. Testing & accessibility tooling (SC-008, all ACs)

**Decision**: Reuse the Phase 1–6 harness — `tests/helpers/fetchMock.ts` (`installFetchMock().reply("GET /admin/reports/overview", …)` with ordered replies for retry-after-failed-load, changed-figures-on-refresh, and failed-refresh), `tests/helpers/harness.tsx`, `tests/setup.ts`. Extend:

- `tests/helpers/fixtures.ts`: `overview(overrides: Partial<RawOverview> = {})` → a full `RawOverview` (all four roles, all twelve statuses, a sample `total_sales_revenue`), and `overviewResponse(data)` → `ok(data)`. Reuse `ok()` / `fail()` (e.g. `fail('Something went wrong. Please try again.')` for the `500`, and a `networkError` reply for `0`).
- `tests/helpers/harness.tsx`: `renderAtDashboard(fm, { seedMe = true, admin = true } = {})` — mirrors `renderAtSettings`: seeds token + profile, optional `GET /auth/me`, renders the real `OverviewPage` at `/dashboard` inside `<RequireAdmin>` in a `MemoryRouter` (with a `/login` stub route for the session-loss assertion and, for the drill-down a11y check, an `/orders` stub). `{ admin: false }` seeds a non-admin profile (SC-007).

Fake timers: `vi.useFakeTimers()` in the refresh spec; `await vi.advanceTimersByTimeAsync(REFRESH_INTERVAL_MS)` to fire a tick; restore real timers in `afterEach`. Visibility: `Object.defineProperty(document, 'visibilityState', { value: 'hidden', configurable: true })` then `document.dispatchEvent(new Event('visibilitychange'))`, and back to `'visible'`.

`vitest-axe` runs on each visual state: `loading`, `error` + Retry, the populated screen (all three groups), and the `refreshError` notice state. Keyboard-only (`user-event`) covers focusing and activating **Refresh** and the notice's **retry**; with `ordersStatusHref` stubbed to a string, tabbing to an orders-by-status card link and reading its accessible name. Group titles are asserted to be real headings; every rendered figure is asserted to contain only ASCII digits + `,` + `.` (Western-digit check for SC-008).

> `fetchMock` keys are `"<METHOD> <path>"`; this feature's path carries **no query string** — tests assert exactly `GET /admin/reports/overview` with no body and a `Bearer` header, and that a single mount issues exactly one such call, a manual refresh exactly one more, and a paused (hidden) interval tick issues **none**. `jsdom` cannot evaluate colour contrast or true focus visibility — those parts of SC-008 stay in the manual checklist in `quickstart.md`.

**Rationale**: The tooling and fetch-mock already exist and mirror the same envelope. Fake timers make the 60-second cadence and the visibility pause deterministic and fast. Automated axe gives measurable AA coverage; residual manual checks (contrast, true focus visibility, RTL rendering) are the same short list Phases 1–6 used and are scripted in `quickstart.md`.

**Alternatives considered**:
- *Real timers with a shortened interval via an env override* — rejected: fake timers are the standard Vitest approach and need no production seam.
- *MSW* — rejected: the per-test `fetchMock` already handles ordered replies and records request shape.
- *Playwright e2e* — deferred: integration tests with mocked `fetch` + fake timers cover every acceptance scenario.

---

## Resolved Technical Context summary

| Field | Value |
|---|---|
| Auth to API | Reuse `authedRequest` + `setTokenProvider` (already wired in `AuthProvider`); `401` → existing `unauthorizedHandler` → `/login`. **No `src/api/` edit.** |
| Endpoint | `GET /admin/reports/overview` — no params, no body, no `404`; standard envelope |
| Screen placement | Delete `src/pages/Dashboard.tsx`; repoint `/dashboard` `<Route>` → `<OverviewPage />`; no `Sidebar.tsx` change; `modalType` scaffolding left dead (out of scope) |
| Normalisation | `normalizeOverview(raw)` — `ROLE_ORDER` (4) + `STATUS_ORDER` (12) always emitted in fixed order, missing keys → 0; unknown status keys appended with `known:false`; `revenue = Number(x) || 0`; `{}` → all zeros |
| Formatting | `formatCount` = `Intl.NumberFormat('en-US')` on `trunc(n)`; `formatCurrency` = `Intl.NumberFormat('en-US', 2dp)` + `' ج.م'`; pinned locale → Western digits + `,` groups (Q4) |
| Data hook | `useOverview()` — `status` (loading/ready/error), `snapshot` (last success only), `lastUpdated`, `refreshing`, `refreshError`; first-load fail → `error`; refresh fail → keep snapshot + `refreshError` + retry |
| Auto-refresh | `setInterval(tick, 60_000)` gated on `document.visibilityState==='visible'`; `visibilitychange`→visible → immediate `refresh()` + interval reset; manual refresh also resets interval; cleared on unmount (Q3 + Q5) |
| Drill-down | `ordersStatusHref(status) → string \| null`, returns `null` now → all cards plain figures; Phase 7 flips it to `/orders?status=…`; only orders-by-status cards consult it; unknown statuses always `null` (Q2, US3/P3) |
| Notices | no success toast; persistent polite live region for `lastUpdated` / `refreshFailedNotice`; visible "آخر تحديث: HH:MM"; inline refresh-error notice + retry; `aria-busy` Refresh while `refreshing` |
| Not built | no chart, no dialog, no pagination, no filters, no `src/api/` change, no `modalType` cleanup, no revenue breakdown |
| Routing / a11y | `App.tsx` repoints `/dashboard`; `RequireAdmin` already gates it; `dir="rtl"`, Tajawal; group titles are headings; values Western digits, never colour-only; Refresh + retry keyboard-operable |
| Testing | Phase 1–6 Vitest + Testing Library + `vitest-axe` + `fetchMock`; extend `fixtures.ts` (`overview`, `overviewResponse`) + `harness.tsx` (`renderAtDashboard`); 2 unit + 3 integration + 1 a11y spec; fake timers + Page Visibility overrides for auto-refresh |
| Config | no new env; `VITE_API_BASE_URL` reused |
