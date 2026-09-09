# Implementation Plan: Dashboard Reports / Overview

**Branch**: `008-dashboard-reports-overview` | **Date**: 2026-09-07 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/008-dashboard-reports-overview/spec.md`

## Summary

Replace the placeholder `src/pages/Dashboard.tsx` mock with a real **Overview** screen on the existing `/dashboard` route and its existing sidebar entry ("لوحة التحكم"). The screen loads a single live snapshot from `GET /admin/reports/overview` (`data = { users_by_role, orders_by_status, total_sales_revenue }`), shows a loading state distinct from an all-zero result, and on a failed first load shows a screen error with Retry. On success it renders three labelled groups of stat cards: **users by role** (customer, cook, driver, admin — all four always shown, zeros included), **orders by status** (all twelve `OrderStatus` values always shown in a fixed order, zeros included, an unrecognised status still shown with a fallback label), and **total sales revenue** (one currency-formatted figure for `completed` orders only, with a "completed orders only" note). Every count and the revenue total render in **Western/Latin digits with thousands separators**; every label, group title, role name, and status name is Arabic; the layout is RTL-first.

The figures are computed live with no caching, so the screen keeps them current: a manual **Refresh** control, plus an automatic re-fetch every 60 seconds while the tab is **visible**. While the tab is hidden the interval pauses; when it becomes visible again the screen fetches immediately and resumes the 60-second cycle. A manual refresh resets the interval. A refresh (manual or automatic) shows an in-progress indication while the previously retrieved figures stay on screen; if it fails, the last good figures stay put with a "couldn't refresh, showing last known figures" notice and a retry. The screen shows how current the figures are (time of the last successful retrieval). A `401` on any call routes through the Phase 1 session-loss path; `/dashboard` is already inside `<RequireAdmin>`.

Drill-down from an orders-by-status card to the orders screen filtered to that status (User Story 3, P3) is wired through a single seam, `ordersStatusHref(status)`, which returns `null` until Phase 7 (Orders Oversight) ships a status-filtered `/orders` view. While it returns `null` every card is a plain, non-activatable figure (FR-021's degradation clause); when Phase 7 lands, the seam returns `/orders?status=<value>` and the orders-by-status cards become keyboard-operable links with no other change to this feature.

Technical approach: same shape as Phases 2–6 — a feature folder under `src/overview/` with an API wrapper, pure helpers, a data hook, an Arabic `messages.ts`, and a screen plus small presentational components. It is the **simplest phase so far**: one `GET`, **no** mutations, **no** forms, **no** dialogs (so `DialogShell` is not involved), **no** pagination, **no** per-row state, **no** query params on the request. Two concrete edits to existing files: (1) delete the `src/pages/Dashboard.tsx` placeholder and repoint the `/dashboard` route in `src/App.tsx` to the new `OverviewPage` (the sidebar entry already exists — no `Sidebar.tsx` change); (2) extend the two test helpers. The Phase 1 transport (`authedRequest` + `setTokenProvider`) is reused unchanged — `GET` is already in `HttpOptions.method`, so **`src/api/` is not touched at all**. Reuse the Phase 3 inline toast / `aria-live` pattern. No new runtime dependencies (no chart library — the spec asks for labelled stat cards, not charts); tests use the existing Vitest + Testing Library + `vitest-axe` + `fetchMock` harness plus fake timers for the interval.

## Technical Context

**Language/Version**: TypeScript `~6.0.2` (`typescript` in package.json), compiled by Vite 8; `target` ES2023, `jsx: react-jsx`, `verbatimModuleSyntax: true`. `@types/react` 19.x against a React 18.x runtime — pre-existing, not touched.

**Primary Dependencies**: React 18, react-dom 18, react-router-dom 7 (routing already in place), Tailwind CSS 4, lucide-react (icons — the sidebar already uses `LayoutGrid` for this route; the screen uses `RefreshCw` for Refresh/Retry and optionally `Users` / `ChefHat` / `Bike` / `ShoppingBag` / `Coins` for group headers). No HTTP client, state library, data-fetching library, form library, or chart library — native `fetch` (via the Phase 1 `authedRequest`) + React hooks + `setInterval` + the Page Visibility API are sufficient for one GET rendered as three groups of number cards. `chart.js` / `react-chartjs-2` stay in `package.json` (still used by `src/pages/FinancialReports.tsx`) but are **not** used here.

**Storage**: None new. The bearer token continues to live in `localStorage` under the Phase 1 keys and is read only through the `setTokenProvider` seam. The last successful snapshot, the last-updated timestamp, the screen status, the refreshing flag, and the refresh-error flag are in-memory only and are dropped when the administrator leaves `/dashboard`. No client cache of the snapshot beyond the current screen instance — every mount, every manual refresh, and every automatic tick issue a fresh `GET /admin/reports/overview`.

**Testing**: Vitest + @testing-library/react + @testing-library/user-event + jsdom for unit/integration; `vitest-axe` for the WCAG checks (SC-008). Reuses `tests/helpers/fetchMock.ts`, `tests/helpers/harness.tsx`, `tests/helpers/fixtures.ts`, `tests/setup.ts`. `fetch` is mocked per test with envelope fixtures mirroring `admin-dashboard-api.md` Phase 8. `vi.useFakeTimers()` drives the 60-second interval; `document.visibilityState` is overridden + a `visibilitychange` event dispatched to exercise the pause/resume behaviour. Ordered `fetchMock` replies on `GET /admin/reports/overview` cover retry-after-failed-load, changed-figures-on-refresh, and failed-refresh paths.

**Target Platform**: Modern desktop browsers (Chromium, Firefox, Safari current). Static SPA, RTL Arabic UI (`dir="rtl"` already on `AdminLayout`); numeric values render in Western digits.

**Project Type**: Web — single existing frontend project in `src/`. No backend work.

**Performance Goals**:
- SC-003: the overview figures are visible within 3 s of opening the screen in ≥ 95 % of loads, with a loading state shown until then — met trivially by rendering ~17 number cards from one response (no list, no per-row async work, no chart render).
- SC-001: an administrator can read every figure with no filter or other action — the screen has no inputs; it loads on mount.
- The 60-second interval and the `visibilitychange` handler add one timer and one document listener; both are cleared on unmount.

**Constraints**:
- FR-001: `/dashboard` renders only inside `<RequireAdmin>`; an unauthenticated visitor is handled by the Phase 1 session-loss path, a signed-in non-admin never reaches it.
- FR-002: the snapshot is retrieved on mount with no input, filter, or parameter; `GET /admin/reports/overview` carries no query string and no body.
- FR-003/FR-004/FR-005: three distinct labelled groups — users by role (customer, cook, driver, admin), orders by status (the twelve `OrderStatus` values), total sales revenue.
- FR-006: all four roles and all twelve statuses are **always** shown, zeros included, in a fixed, stable order that does not change between retrievals (order defined once in `overviewModel.ts`).
- FR-007: total sales revenue is one currency-formatted figure for `completed` orders only, with the "completed orders only" scope shown (card label / note).
- FR-008/FR-019/SC-008: every count and the revenue total render in Western/Latin digits (0–9) with thousands separators; all titles, labels, role names, and status names are Arabic; the layout is RTL-first; no figure's meaning is conveyed by colour alone.
- FR-009/FR-010: a loading state distinct from a genuine all-zero result; an all-zero platform shows every count as `0` and the revenue as a zero amount, as real values, not an error or a blank screen.
- FR-011: a failed first load shows a retryable "something went wrong, please try again" screen state; no stale or partial figures are shown as current.
- FR-012/FR-013/FR-014: a manual Refresh control; while any re-fetch is in flight, an in-progress indication with the previous figures still visible; a failed re-fetch keeps the last good figures and shows a "couldn't refresh, showing last known figures" notice + retry.
- FR-015: the screen shows how current the figures are — the time of the last successful retrieval.
- FR-016: automatic re-fetch every 60 s while the tab is open **and visible**; paused while hidden/backgrounded; on becoming visible, an immediate fetch then the 60-second cycle resumes; a manual refresh resets the interval; automatic and manual refreshes share the in-progress indication and the failure handling (FR-013/FR-014).
- FR-017: a response that omits a group or an expected role/status key still renders that role/status as a zero-count card (per FR-006); no broken cards, no render failure.
- FR-018: a response that includes an unrecognised order status still shows that status's count with a readable fallback label and an intact layout.
- FR-020/FR-021: each orders-by-status card links to the orders screen filtered to that status **when that screen is available**; the users-by-role cards and the revenue card are display-only. Availability is the `ordersStatusHref(status)` seam — `null` (all cards plain) until Phase 7 ships the filtered `/orders` view, then `/orders?status=<value>`. An activatable card is keyboard-reachable and operable and exposes its purpose to assistive technology; an orders-by-status card with no target is a plain, non-activatable figure.
- Backend base URL stays `import.meta.env.VITE_API_BASE_URL`; no new env vars.
- The standard envelope + status codes (401 unauthenticated, 403 non-admin, 500 unexpected) from `admin-dashboard-api.md` §0 apply; this screen sends no parameters, so it has no request validation and there is no `404` (the report is a singleton computed view).

**Scale/Scope**: ~9 new source files under `src/overview/`; delete `src/pages/Dashboard.tsx`; 1 route repoint + 1 import change in `src/App.tsx` (no `Sidebar.tsx` change); `tests/helpers/fixtures.ts` + `tests/helpers/harness.tsx` extended; ~7 new test files. 21 functional requirements, 8 success criteria, 3 user stories (P1 view, P2 refresh, P3 drill-down — P3 gated on Phase 7). No change to `src/api/`, `src/auth/`, `src/cooks/`, `src/drivers/`, `src/cities/`, `src/review/`, `src/settings/`.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

`.specify/memory/constitution.md` is an unratified template — every principle and section is still a `[PLACEHOLDER]`. There are **no project-specific constitutional gates to enforce**. The plan holds itself to the general principles the template gestures at, consistent with Phases 1–6:

| Principle (template intent) | How this plan complies |
|---|---|
| Test-First | The Vitest harness already exists. Each user story's acceptance scenarios become integration tests written alongside the implementation; the pure helpers (`normalizeOverview`, `formatCount` / `formatCurrency`) get unit tests first. |
| Simplicity / YAGNI | Zero new runtime dependencies (explicitly **no** chart library — the spec asks for labelled number cards). Reuses the Phase 1 `authedRequest` / `ApiError` / `unauthorizedHandler` with **no** `src/api/` edit. No form library, no data-fetching library, no global store, no modal/dialog, no pagination, no URL state. One feature hook + local component state + one `setInterval` + one `visibilitychange` listener. Drill-down is a one-function seam, off by default. |
| Integration testing on contract boundaries | `src/overview/overviewApi.ts` gets integration tests against mocked `fetch` mirroring `admin-dashboard-api.md` Phase 8 — the `200` (well-formed / all-zero / missing-keys / unknown-status), `0`, and `5xx` branches and the request shape (`GET /admin/reports/overview`, no body, no query) covered explicitly. Existing transport tests (`tests/unit/authedRequest.test.ts`, `tests/unit/envelope.test.ts`) are untouched (no `src/api/` change). |
| Observability | Non-2xx envelope failures are logged via the existing `logger` seam inside `apiRequest` (status + path only; no figures logged). |
| Versioning | N/A — no published library surface; app version stays `0.0.0`. |

**Result**: PASS (no violations; Complexity Tracking table left empty).

*Post-Phase 1 re-check*: PASS — the design adds zero runtime dependencies and no extra projects. The only shared-surface changes are deleting a placeholder mock (`src/pages/Dashboard.tsx`) and repointing one `<Route>`. `src/api/` is not modified. See [research.md](./research.md) decisions R1–R11.

## Project Structure

### Documentation (this feature)

```text
specs/008-dashboard-reports-overview/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
│   ├── reports-api.md         # External: GET /admin/reports/overview
│   └── reports-ui.md          # Internal: overviewApi / useOverview, component props, messages, the ordersStatusHref seam
├── checklists/
│   └── requirements.md  # Pre-existing spec-quality checklist
└── tasks.md             # Created later by /speckit-tasks
```

### Source Code (repository root)

```text
src/
├── api/                       # UNCHANGED — authedRequest / setTokenProvider / unauthorizedHandler reused as-is;
│                              #   GET is already in HttpOptions.method, so no edit (contrast Phases 5/6)
├── auth/                      # UNCHANGED — session, RequireAdmin, unauthorized handler reused as-is
├── overview/                  # NEW feature folder
│   ├── overviewApi.ts         # NEW: getOverview(signal?) → GET /admin/reports/overview → RawOverview. Propagates ApiError.
│   ├── types.ts               # NEW: Role, OrderStatus, RawOverview, RoleCount, StatusCount, OverviewSnapshot,
│   │                          #      OverviewStatus; ROLE_ORDER, STATUS_ORDER constants
│   ├── overviewModel.ts       # NEW pure: normalizeOverview(raw) → OverviewSnapshot —
│   │                          #      roles in ROLE_ORDER (missing → 0), statuses in STATUS_ORDER (missing → 0),
│   │                          #      any extra/unknown status key appended as a StatusCount{ known:false },
│   │                          #      revenue = Number(raw.total_sales_revenue) || 0
│   ├── format.ts              # NEW pure: formatCount(n) → "1,240" ; formatCurrency(n) → "154,300.00 ج.م"
│   │                          #      (Western digits, Intl.NumberFormat('en-US'), 2dp for currency)
│   ├── ordersLink.ts          # NEW: ordersStatusHref(status: OrderStatus) → string | null
│   │                          #      returns null for now (Phase 7 not shipped); later `/orders?status=${status}`
│   ├── useOverview.ts         # NEW hook: owns status + snapshot + lastUpdated + refreshing + refreshError;
│   │                          #      load() on mount; refresh() (manual/auto/on-visible); 60s setInterval gated on
│   │                          #      document.visibilityState==='visible'; visibilitychange → immediate refresh +
│   │                          #      interval reset; manual refresh resets interval; cleanup clears both
│   ├── messages.ts            # NEW: Arabic strings — group titles, role labels, the 12 status labels,
│   │                          #      revenue label + "للطلبات المكتملة فقط", loading/error/retry/refresh,
│   │                          #      lastUpdated(t), refreshFailedNotice, unknownStatusLabel(key)
│   ├── OverviewPage.tsx       # NEW: /dashboard screen — header + Refresh + lastUpdated + refresh-error notice;
│   │                          #      loading / error+Retry / three StatGroups; one polite aria-live region
│   ├── StatGroup.tsx          # NEW: a titled <section> wrapping a responsive grid of StatCard
│   └── StatCard.tsx           # NEW: label + formatted value; for orders-by-status renders a <Link> when
│                              #      ordersStatusHref(status) is non-null, else a plain figure; never colour-only
├── pages/
│   └── Dashboard.tsx          # DELETE — placeholder mock (weekly bar chart with fake data, mock statsData,
│                              #   quick-action buttons); replaced by src/overview/OverviewPage
├── cooks/ , drivers/ , cities/ , review/ , settings/   # UNCHANGED
└── App.tsx                    # EDIT: remove `import Dashboard from './pages/Dashboard'`; add
                               #   `import OverviewPage from './overview/OverviewPage'`; the /dashboard <Route>
                               #   element changes from <Dashboard setModalType={setModalType}/> to <OverviewPage/>.
                               #   The now-unused `modalType` state + AddCookModal/AddUserModal/NotificationModal
                               #   JSX in AdminLayout become dead (unreachable) — left as-is; removing those
                               #   placeholder quick-action modals is out of scope for Phase 8 (noted in research R10).

src/components/
└── Sidebar.tsx               # UNCHANGED — "لوحة التحكم" → /dashboard entry already exists (LayoutGrid icon)

tests/
├── helpers/
│   ├── fixtures.ts           # EDIT: add overview(overrides?) → RawOverview (all keys, sample counts),
│   │                         #   overviewResponse(data) → ok(data); reuse ok()/fail()
│   └── harness.tsx           # EDIT: add renderAtDashboard(fm, { seedMe?, admin? }) alongside renderAtSettings()
├── unit/
│   ├── overviewModel.test.ts        # normalizeOverview: full payload → all rows in fixed order; missing role/status
│   │                                #   keys → 0; unknown status key → appended row with known:false; non-numeric
│   │                                #   revenue → 0; empty {} → all zeros (FR-006/FR-017/FR-018)
│   └── overviewFormat.test.ts       # formatCount: 0, 3, 1240, 1000000 → grouped Western digits; formatCurrency:
│                                    #   0 → "0.00 ج.م", 154300 → "154,300.00 ج.م", 154300.5 → "154,300.50 ج.م" (FR-008/SC-008)
├── integration/
│   ├── dashboard-overview.test.tsx  # US1 AC1–9: three labelled groups; all 4 roles + all 12 statuses shown incl.
│   │                                #   zeros in a fixed order; revenue as "…ج.م" for completed only + scope note;
│   │                                #   loading state distinct from all-zero; all-zero platform → real zeros not
│   │                                #   error/blank; failed first load → screen error + Retry → ordered 2nd GET →
│   │                                #   figures shown; unknown status → fallback label, layout intact; large
│   │                                #   numbers grouped; Western digits throughout
│   │                                #   (FR-002–011, FR-017–019, SC-001/002/003/006/008)
│   ├── dashboard-refresh.test.tsx   # US2 AC1–8: manual Refresh → 2nd GET → figures update + lastUpdated advances;
│   │                                #   in-progress indication with previous figures still visible; changed data on
│   │                                #   refresh reflected; failed refresh → last good figures kept + "couldn't
│   │                                #   refresh" notice + retry; fake timers: 60s tick auto-refreshes; tab hidden
│   │                                #   (visibilityState='hidden' + visibilitychange) → no tick fetch; tab visible
│   │                                #   again → immediate fetch + cycle resumes; manual refresh resets interval
│   │                                #   (FR-012–016, SC-004/005)
│   └── dashboard-session.test.tsx   # FR-001: 401 on the initial GET or on a refresh → Phase 1 session-loss →
│                                    #   /login; non-admin never reaches /dashboard (SC-007)
└── a11y/
    └── dashboard-a11y.test.tsx      # axe on: loading, error+Retry, populated (all three groups), refresh-error
                                     #   notice state. Keyboard-only: focus Refresh, activate it. lastUpdated + the
                                     #   refresh-error notice in a polite aria-live region; group titles are real
                                     #   headings; values not colour-only; RTL smoke. When ordersStatusHref is
                                     #   stubbed non-null: an orders-by-status card is a keyboard-operable link with
                                     #   an accessible name naming the status (FR-020/021, SC-008)
```

**Structure Decision**: Keep the existing single Vite SPA. New feature code lands in a new `src/overview/` folder mirroring the `src/settings/` / `src/cities/` layout (api wrapper + pure helpers + hook + messages + screen + small presentational components). The `/dashboard` route and its sidebar entry already exist from the initial scaffold pointing at a placeholder `src/pages/Dashboard.tsx`; this feature deletes that placeholder and repoints the route at `src/overview/OverviewPage`, so **no `Sidebar.tsx` edit is required** (as in Phase 6). The Phase 1 `src/api/` transport is reused with **no change** — `GET` is already supported. No modal shell (no dialogs in this feature). Drill-down to the orders screen is isolated in `src/overview/ordersLink.ts` so this feature ships complete now with plain figures and gains links when Phase 7 provides the filtered route. Tests extend the existing `tests/` tree, mirroring the three user stories, and add fake-timer + Page-Visibility coverage for the auto-refresh.

## Complexity Tracking

*No constitutional violations — table intentionally empty.*
