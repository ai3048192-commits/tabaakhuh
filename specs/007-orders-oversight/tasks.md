---
description: "Task list for Orders Oversight"
---

# Tasks: Orders Oversight

**Input**: Design documents from `/specs/007-orders-oversight/`

**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md), [data-model.md](./data-model.md), [contracts/](./contracts/)

**Depends on**: Feature `001-admin-auth-session` implemented (the `authedRequest` / `setTokenProvider` seam in `src/api/httpClient.ts`, the `<RequireAdmin>` guard, the shared layout / sidebar / header) and feature `005-cities-management` implemented (the shared modal shell at `src/shared/DialogShell.tsx` and the memoised **read-only** city directory `fetchCityDirectory()` in `src/cities/citiesApi.ts`). This feature reuses that transport, guard, shell, and directory, plus the `tests/` harness. It does **not** depend on the queue behaviour of `002` / `003` / `004` or on `006`.

**Tests**: INCLUDED. The user stories carry explicit acceptance scenarios and measurable criteria (SC-001…SC-017), and [quickstart.md](./quickstart.md) maps automated suites to requirements. Test tasks are written before the implementation they cover and must fail first.

**Organization**: Tasks are grouped by user story. Phases 1–2 are shared; Phases 3/4/5 are US1/US2/US3 and each is an independently testable increment; Phase 6 is cross-cutting (conditional auto-refresh) plus polish.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependency on an incomplete task)
- **[Story]**: US1 / US2 / US3 (setup, foundational, polish carry no story label)
- Exact file paths are in every task

## Path Conventions

Single Vite SPA at repo root: source in `src/`, tests in `tests/`. Layout per [plan.md](./plan.md) "Project Structure". This is a **read-only** feature: `src/orders/` issues exactly one `GET` and **no** `POST` / `PUT` / `PATCH` / `DELETE` anywhere.

⚠️ **Serialization points** (same file edited across phases — not `[P]` with each other; sequence or single-owner):

- `src/orders/types.ts` — one edit only, T004 (all types at once)
- `src/orders/messages.ts` — created T005 (all keys at once)
- `src/orders/ordersApi.ts` — one edit only, T014 (`listOrders` only)
- `src/orders/useOrdersOversight.ts` — created T019 (US1: URL-derived load, pagination, refresh, detail stubs), extended T031 (US2: filters, `applyRange`, `resetFilters`, `422` field errors), T037 (US3: `openDetail` / `closeDetail`), T042 (Polish: the conditional auto-refresh effect)
- `src/orders/OrdersPage.tsx` — created T024 (US1: list + states + header + manual refresh), extended T033 (US2: `<OrdersFilters>` + "no match" + result-summary live region), T039 (US3: `<OrderDetailDialog>` wiring), T043 (Polish: the auto-refresh toggle)
- `src/orders/OrderRow.tsx` — created T022 (US1: cells + badges), extended T039 (US3: the "عرض التفاصيل" button)
- `tests/a11y/orders-a11y.test.tsx` — created T018 (US1 surfaces), extended T030 (US2 filter bar), T036 (US3 dialog)
- `src/App.tsx` — one edit only, T025 (repoint the `/orders` route; drop the old import) — ⚠️ another session is currently editing this file for `006`; rebase onto its state, change only the `/orders` line
- `src/components/Sidebar.tsx` — one edit only, T026 (relabel the existing `/orders` entry)
- `src/pages/OrdersPage.tsx` — deleted in T025
- `tests/helpers/fixtures.ts` — one edit only, T002
- `tests/helpers/harness.tsx` — one edit only, T003

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Folder skeleton and test fixtures / helpers for the new endpoint. No new dependencies or env vars — `VITE_API_BASE_URL`, `react-router-dom`, and the Vitest / `vitest-axe` tooling from earlier features are reused.

- [X] T001 [P] Create the `src/orders/` directory with a `.gitkeep` (removed once `types.ts` lands in T004)
- [X] T002 [P] Extend `tests/helpers/fixtures.ts` with builders producing envelope-shaped payloads from `admin-dashboard-api.md` Phase 7: `orderItem(overrides?)` (one line item — sequential `id`, `dish_id`, `item_name` `"صنف <id>"`, `unit_price` `45`, `quantity` `1`, `line_total` `45`); `order(overrides?)` (one `Order` — sequential `id`, `order_number` `"ORD-2026-<id padded>"`, `customer_id`, `cook_id`, `cook_name` `"مطبخ <id>"`, `cook_avatar_url` `"https://cdn.test/<id>/a.jpg"`, `type: 'regular'`, `status: 'completed'`, `delivery_address_id`, `requested_delivery_date` `"2026-09-05"`, `delivery_time_slot` `"13:00-15:00"`, `subtotal` `45`, `delivery_fee` `25`, `total` `70`, `customer_note: null`, `cancel_reason: null`, `items: [orderItem()]`, `custom_details: null`, `quote: null`, `status_history: []`); `customOrder(overrides?)` (`order({ type: 'custom', items: [], custom_details: { occasion_type: 'زفاف', guest_count: 120, requested_dishes_text: 'أرز وخروف', budget_min: 5000, budget_max: 8000, requested_delivery_date_time: '2026-10-01T18:00:00+02:00' }, ...overrides })`); `ordersPage(items, { page = 1, per_page = 20, total = items.length } = {})` → `ok({ items, page, per_page, total })`. Reuse the `ok` / `fail` helpers (e.g. `fail('The given data was invalid.', { city_id: ['المدينة غير موجودة.'] })`, `fail('The given data was invalid.', { placed_from: ['تاريخ غير صالح.'] })`)
- [X] T003 [P] Extend `tests/helpers/harness.tsx` with `renderAtOrders(fm, opts?: { seedMe?: boolean; admin?: boolean; path?: string })` — seeds `localStorage` with a valid token + cached profile (admin by default; `admin: false` seeds a `customer` role), replies to `GET /auth/me` by default, and mounts `<MemoryRouter initialEntries={[opts.path ?? '/orders']}>` with the real `<OrdersPage/>` inside `<RequireAdmin>` (so URL-state tests can pass `'/orders?status=completed&page=2'`). Mirror the existing `renderAtCities`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Feature types, the four pure helpers (Cairo dates, query builder + local date-range check, URL ⇄ filters, status/type labels) with their unit tests, the API wrapper, and message strings — everything all three stories build on.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [X] T004 [P] Create `src/orders/types.ts` per [data-model.md](./data-model.md) §1–8 and [contracts/orders-ui.md](./contracts/orders-ui.md): `OrderStatus` (the 12-value union), `OrderItem`, `CustomOrderDetails`, `Order`, `OrderPage`, `OrderFilters` (`status: OrderStatus | 'all'`, `cityId: number | null`, `from: string | null`, `to: string | null`), `OrdersQuery` (`{ filters, page }`), `DateRangeError` (`{ code: 'from_after_to' } | null`), `OrdersStatus` (`'loading' | 'ready' | 'error'`), `EmptyKind` (`'none' | 'unfiltered' | 'filtered' | 'beyond-range'`), `DetailState` (`{ order: Order } | null`). `quote` / `status_history` typed loosely (`unknown` / `unknown[]`) and never read
- [X] T005 [P] Create `src/orders/messages.ts` — all Arabic RTL keys from the [contracts/orders-ui.md](./contracts/orders-ui.md) "messages" section, including the `statusLabels` map for all 12 statuses, `typeRegular` / `typeCustom`, filter labels, pagination strings (`pageIndicator(n,m)`, `totalInRange(t)`, `resultSummary(shown,total)`), empty/error strings, and every detail-dialog label
- [X] T006 [P] Implement `src/orders/cairoDates.ts` — pure, on `Intl.DateTimeFormat` with `timeZone: 'Africa/Cairo'` (no date library): `cairoToday(): string` (`'YYYY-MM-DD'` via `'en-CA'`); `daysAgoCairo(n): string` (parse `cairoToday()` ints → `Date.UTC(y, m-1, d) - n*86_400_000` → format back in UTC → `'YYYY-MM-DD'`); `isDefaultOrWiderRange(from, to): boolean` (`to == null && (from == null || from <= daysAgoCairo(30))`); `formatOrderDate(ymd): string` and `formatOrderDateTime(iso): string` (Cairo zone, dashboard digit convention) ([contracts/orders-ui.md](./contracts/orders-ui.md), research R5)
- [X] T007 [P] Unit test `tests/unit/cairoDates.test.ts` — write first, must fail; run the file with `process.env.TZ` set to a non-Cairo zone (e.g. `'America/New_York'`) to prove the fix: `cairoToday()` equals an independent `Intl` Cairo format of `now`; `daysAgoCairo(30)` is exactly 30 calendar days before `cairoToday()`; `daysAgoCairo(0) === cairoToday()`; `isDefaultOrWiderRange` truth table (`null,null`→true; `daysAgoCairo(30),null`→true; `daysAgoCairo(10),null`→false; any non-null `to`→false); `formatOrderDateTime('2026-09-05T22:30:00Z')` renders the Cairo wall-clock regardless of `TZ` (FR-013b, SC-005)
- [X] T008 [P] Implement `src/orders/ordersQuery.ts` — pure per [data-model.md](./data-model.md) §5 and [contracts/orders-ui.md](./contracts/orders-ui.md): `buildOrdersQuery(filters: OrderFilters, page: number): string` returns `"?"` + params appended in the fixed order `status` (only when `!== 'all'`), `city_id` (only when `cityId != null`), `placed_from` (only when `from != null`), `placed_to` (only when `to != null`), `page` (always, `>= 1`), `URLSearchParams`-encoded; `validateDateRange(from: string | null, to: string | null): DateRangeError` → `{ code: 'from_after_to' }` when both set and `from > to` (lexicographic on `YYYY-MM-DD`), else `null`
- [X] T009 [P] Unit test `tests/unit/ordersQuery.test.ts` — write first, must fail: default filters (`status:'all'`, `cityId:null`, `from:'2026-08-08'`, `to:null`) + page 1 → `'?placed_from=2026-08-08&page=1'`; a chosen status → `status=` present and first; `cityId` set → `city_id=` present; `to` set → `placed_to=` present; `page` always present and last; a status containing `_` is encoded intact; `validateDateRange`: `('2026-09-10','2026-09-01')` → `from_after_to`; `('2026-09-01','2026-09-01')` → `null`; `('2026-09-01',null)` / `(null,'2026-09-01')` / `(null,null)` → `null` (FR-010–014, FR-016)
- [X] T010 [P] Implement `src/orders/urlState.ts` — pure per [data-model.md](./data-model.md) §7 and [contracts/orders-ui.md](./contracts/orders-ui.md): `filtersFromSearchParams(sp: URLSearchParams): { filters: OrderFilters; page: number }` — `status` ← `sp.get('status')` if in `ORDER_STATUSES` else `'all'`; `cityId` ← positive int of `sp.get('city')` else `null`; `from` ← `sp.get('from')` if `/^\d{4}-\d{2}-\d{2}$/` **else `daysAgoCairo(30)`**; `to` ← `sp.get('to')` if `YYYY-MM-DD` else `null`; `page` ← `Math.max(1, Number(sp.get('page')) || 1)`; unknown params ignored. `filtersToSearchParams(filters, page): URLSearchParams` — the inverse, omitting `status` when `'all'`, `city` when `null`, `from` when `=== daysAgoCairo(30)`, `to` when `null`, `page` when `1` (depends on T004, T006, T012)
- [X] T011 [P] Unit test `tests/unit/ordersUrlState.test.ts` — write first, must fail: empty `URLSearchParams` → `{ filters: { status:'all', cityId:null, from: daysAgoCairo(30), to:null }, page: 1 }`; a full query round-trips through `filtersToSearchParams` → `filtersFromSearchParams`; unknown params ignored; `page=0` / `page=-2` / `page=abc` → `1`; an unrecognised `status` value → `'all'`; a non-numeric `city` → `null`; `filtersToSearchParams` for the default view emits **no** `status` / `city` / `from` / `to` / `page` keys; for a fully filtered view emits all five (FR-010, FR-036, SC-017)
- [X] T012 [P] Implement `src/orders/orderStatus.ts` — pure per [contracts/orders-ui.md](./contracts/orders-ui.md): `ORDER_STATUSES: readonly OrderStatus[]` (the 12 in spec order); `statusLabel(s)` → `orderMessages.statusLabels[s]`; `isCancelled(s)` → `s === 'cancelled'`; `statusIcon(s)` / `typeIcon(t)` → a lucide-react icon per value; `typeLabel(t: 'regular' | 'custom')` → `orderMessages.typeRegular` / `typeCustom` (depends on T005)
- [X] T013 [P] Unit test `tests/unit/orderStatus.test.ts` — write first, must fail: `ORDER_STATUSES` deep-equals `['pending','accepted','preparing','ready_for_pickup','assigned_to_driver','picked_up','on_the_way','delivered','completed','cancelled','pending_review','quoted']`; `statusLabel` returns a non-empty string for every entry; `isCancelled` is true only for `'cancelled'`; `typeLabel('regular')` and `typeLabel('custom')` are non-empty and distinct (FR-004, FR-011)
- [X] T014 Implement `src/orders/ordersApi.ts` per [contracts/orders-api.md](./contracts/orders-api.md) and [contracts/orders-ui.md](./contracts/orders-ui.md): `listOrders(query: OrdersQuery, signal?: AbortSignal): Promise<OrderPage>` → `authedRequest<OrderPage>('/admin/orders' + buildOrdersQuery(query.filters, query.page), { signal })`; propagates `ApiError` unchanged; never handles `401`; **no other exports** and no non-GET method anywhere (depends on T004, T008)
- [X] T015 Regression checkpoint: run `npm run test:run` — confirm `tests/unit/cairoDates.test.ts`, `ordersQuery.test.ts`, `ordersUrlState.test.ts`, `orderStatus.test.ts` now exist and **fail** pending their implementations being wired, and that no other feature's suite regressed; run `npm run build` to confirm `src/orders/types.ts` type-checks

**Checkpoint**: pure helpers, API wrapper and messages ready; the four unit specs are red; nothing else regressed.

---

## Phase 3: User Story 1 - Administrator reviews the platform's orders (Priority: P1) 🎯 MVP

**Goal**: An administrator opens `/orders` and sees one server-paginated page (fixed 20/row) of orders, defaulted to the **last 30 days (Africa/Cairo)** shown pre-set, most-recent first. Each row shows order number, cook (name + avatar), a colour-independent type badge and status badge, the requested delivery date + time slot, and subtotal / delivery fee / total. First / prev / next paging issues the correct `GET /admin/orders?…&page=N` and updates the "صفحة N من M" indicator and the "M طلب ضمن النطاق" count. Distinct loading, "no orders", "no orders on this page" (+ back-to-first), and screen-error (+ Retry) states; a manual Refresh; `{ page }` and the non-default `from` synced to the URL; all behind the admin guard.

**Independent Test**: Sign in as admin, open `/orders` with a clean URL → the filter bar shows "من تاريخ" pre-set to 30 days ago and the list loads one `GET /admin/orders?placed_from=<30d>&page=1`; rows carry all the columns; custom and cancelled orders are marked without colour; Next / Prev / First re-issue the query with `&page=N` and update the indicator + count; `?page=999` shows "no orders on this page" + a working back-to-first; a slow load shows a loading state; an offline first load shows a screen error + Retry; a `401` redirects to `/login`; a non-admin never reaches `/orders`.

### Tests for User Story 1 ⚠️ (write first, must fail)

- [X] T016 [P] [US1] Integration test `tests/integration/orders-list.test.tsx` with mocked `fetch` via `renderAtOrders` (ordered replies on the paginated `GET /admin/orders?...` keys): AC1 a clean-URL open issues exactly one `GET /admin/orders?placed_from=<daysAgoCairo(30)>&page=1` and renders a `<table>` row per item — order number (`dir="ltr"` cell), cook name + avatar, an `OrderTypeBadge`, an `OrderStatusBadge`, `formatOrderDate(requested_delivery_date)` + `delivery_time_slot`, and subtotal / delivery fee / total; the header count reads `totalInRange(total)` (labelled "within the range"), **not** a bare total; there is **no** customer column (FR-001 / FR-002 / FR-010); AC1a widening the URL `from` (or clearing it via a control) re-issues the query and the count updates (SC-001a); AC2 a delayed reply shows a loading state distinct from the empty state (FR-005); AC3 `items: []` on page 1 with the default range and no status/city filter → the "لا توجد طلبات." state (FR-006); AC4/AC5 Next → `GET …&page=2`, Prev / First → `…&page=1`; the `pageIndicator` updates and First/Prev disable on page 1, Next disables on the last page (FR-003 / SC-002); AC6/AC7 a `type: 'custom'` row and a `status: 'cancelled'` row each carry a non-colour cue (icon + label), and the cancelled row's `cancel_reason` is reachable (FR-004); AC8 a `500` / offline first load → a screen-level error with a working Retry; a failed Refresh with a page already shown keeps that page and shows a toast (FR-008); AC9 `?page=999` → `items: []` with `page > 1` → the "لا توجد طلبات في هذه الصفحة." state with a "العودة إلى الصفحة الأولى" control that issues `…&page=1` (FR-007 / SC-016)
- [X] T017 [P] [US1] Integration test `tests/integration/orders-session.test.tsx`: a `401` response to `GET /admin/orders` invokes the inherited `unauthorizedHandler` → session cleared → redirect to `/login`, no broken view (FR-029); `renderAtOrders(fm, { admin: false })` → `/orders` is not reachable for a non-admin (FR-030)
- [X] T018 [P] [US1] Accessibility test `tests/a11y/orders-a11y.test.tsx`: `vitest-axe` reports zero violations on the loading state, the list/table, the "no orders" empty state, the "no orders on this page" state, and the screen-error state; the `<table>` exposes `<th scope="col">` for every column; `OrderTypeBadge` and `OrderStatusBadge` convey type/status by text + icon (assert a non-colour cue is present) and `cancelled` is distinctly marked (FR-004 / FR-034 / FR-035 / SC-014); a keyboard-only pass tabs to the pagination controls and activates Next with a visible focus target; the page root is `dir="rtl"` (SC-015 smoke)

### Implementation for User Story 1

- [X] T019 [US1] Implement `useOrdersOversight()` in `src/orders/useOrdersOversight.ts` per [contracts/orders-ui.md](./contracts/orders-ui.md): read `useSearchParams()`; on mount and whenever `searchParams` changes compute `{ filters, page } = filtersFromSearchParams(searchParams)` and `load()` via `listOrders({ filters, page })` → `pageData: OrderPage | null`; `status: OrdersStatus` = `'loading'` only when no page is currently shown, `'ready'` once a page is in hand (an empty `items` array is still `'ready'`), `'error'` only when a load fails with nothing shown (a failed reload with a page shown keeps it + sets `toast`); derive `pageNumber`, `totalPages = Math.max(1, Math.ceil(pageData.total / pageData.per_page))`, and `emptyKind` per [data-model.md](./data-model.md) §6 (`'beyond-range'` when `items` empty and `pageNumber > 1`; `'unfiltered'` when empty on page 1 with `status:'all'`, `cityId:null`, and `isDefaultOrWiderRange`; `'filtered'` otherwise-empty on page 1; else `'none'`); `refresh()` re-issues the current query; `goToPage(n)` / `firstPage()` / `prevPage()` / `nextPage()` call `setSearchParams(filtersToSearchParams(filters, n), { replace: false })` with `n` clamped to `[1, totalPages]` (but a too-high `n` already in the URL is left so `'beyond-range'` can render); `openDetail(order)` / `closeDetail()` set `detail: DetailState` (no request); `setStatusFilter` / `setCityFilter` / `setDraftFrom` / `setDraftTo` / `applyRange` / `resetFilters` / `setAutoRefresh` are typed placeholders that throw `"not implemented"` (filled in US2 / Polish); `autoRefreshOn` state defaults `true` with **no** effect yet; all non-URL state dropped on unmount; `401` never observed here (FR-001–008, FR-010, FR-017, FR-036) (depends on T014, T010, T004)
- [X] T020 [P] [US1] Implement `OrderStatusBadge` in `src/orders/OrderStatusBadge.tsx` (props `{ status: OrderStatus }` → a chip with `statusIcon(status)` + `statusLabel(status)`; `isCancelled(status)` adds a distinct icon/outline so it reads as cancelled in greyscale) and `OrderTypeBadge` in `src/orders/OrderTypeBadge.tsx` (props `{ type: 'regular' | 'custom' }` → `typeIcon(type)` + `typeLabel(type)`); neither conveys meaning by colour alone (FR-004 / FR-035) (depends on T012, T005)
- [X] T021 [P] [US1] Implement `Pagination` in `src/orders/Pagination.tsx` — props `{ page, totalPages, total, onFirst, onPrev, onNext }`; render `pageIndicator(page, totalPages)` + `totalInRange(total)`; First / Prev `disabled` at `page <= 1`, Next `disabled` at `page >= totalPages`; all three are labelled buttons, keyboard operable (FR-003 / FR-035) (depends on T005)
- [X] T022 [US1] Implement `OrderRow` in `src/orders/OrderRow.tsx` — props `{ order }` (plus an `onOpenDetail` prop wired in US3); render `<td>`s for `order.order_number` (`dir="ltr"`), a cook cell (avatar with a fallback glyph when `cook_avatar_url` is `null` + `cook_name`), `<OrderTypeBadge type={order.type} />`, `<OrderStatusBadge status={order.status} />`, `formatOrderDate(order.requested_delivery_date)` + `order.delivery_time_slot` (`dir="ltr"`), and three money `<td>`s (`subtotal` / `delivery_fee` / `total`, Cairo currency format), then an actions `<td>` placeholder (the "عرض التفاصيل" button is added in US3). **No** control that changes the order (FR-002 / FR-028) (depends on T020, T006)
- [X] T023 [US1] Implement `OrdersTable` in `src/orders/OrdersTable.tsx` — props `{ items, onOpenDetail }`; a semantic `<table>` with a header row of `<th scope="col">` (`colOrderNumber`, `colCook`, `colType`, `colStatus`, `colRequestedDelivery`, `colSubtotal`, `colDeliveryFee`, `colTotal`, `colActions`) from `messages.ts`, then `items.map(o => <OrderRow key={o.id} order={o} onOpenDetail={onOpenDetail} />)`; wrap in an `overflow-x:auto` container so the table scrolls, not the page (FR-002 / FR-034) (depends on T022)
- [X] T024 [US1] Implement `OrdersPage` in `src/orders/OrdersPage.tsx` — compose `useOrdersOversight()`; `status === 'loading'` → loader (no table); `status === 'error'` → error panel + Retry calling `refresh()` (FR-008); by `emptyKind`: `'unfiltered'` → `emptyNoOrders`; `'beyond-range'` → `emptyBeyondRange` + a "العودة إلى الصفحة الأولى" button calling `firstPage()` (FR-007); `'filtered'` → placeholder for US2; else a header (`pageTitle` + a manual **Refresh** control — FR-009), `<OrdersTable items={pageData.items} onOpenDetail={openDetail} />`, and `<Pagination page={pageNumber} totalPages={totalPages} total={pageData.total} onFirst={firstPage} onPrev={prevPage} onNext={nextPage} />`; own a visually-hidden `role="status"` `aria-live="polite"` region + a transient toast bubble cleared after ~6 s (pattern copied from `DriverApplicationsPage`) and a second polite live region announcing `resultSummary(items.length, total)` when the result changes (FR-035); render nothing for filters or the dialog yet; root `dir="rtl"`, `font-['Tajawal']`, brand `#7a0d0d` (FR-001 / FR-034 / FR-035 / FR-036) (depends on T019, T023, T021)
- [X] T025 [US1] In `src/App.tsx`, change the `/orders` `<Route>` element to the new `OrdersPage` — `import OrdersPage from './orders/OrdersPage'`, drop the `import OrdersPage from './pages/OrdersPage'` line — and **delete** `src/pages/OrdersPage.tsx`. ⚠️ Rebase onto the current file state (another session is editing it for `006`); change only the one import + the one route line (FR-001 / FR-036) (depends on T024)
- [X] T026 [US1] In `src/components/Sidebar.tsx`, change the existing `menuItems` entry `{ name: 'إدارة الطلبات', icon: ShoppingBag, path: '/orders' }` → `name: 'مراقبة الطلبات'` (keep `icon` and `path`) (FR-033) (depends on T024)
- [ ] T027 [US1] Run the quickstart **US1** scenarios 1–8 and the **Session loss** scenario in [quickstart.md](./quickstart.md) against a Phase 7 backend and record results (depends on T025, T026) — ⚠️ MANUAL: requires a live Phase 7 backend; deferred (automated integration + a11y coverage for these scenarios is green via the test files above)

**Checkpoint**: User Story 1 is fully functional and independently testable — this is the MVP. No filter controls, no detail dialog, no auto-refresh yet.

---

## Phase 4: User Story 2 - Administrator filters orders by status, city, and date placed (Priority: P2)

**Goal**: A filter bar with a **status** `<select>` and a **city** `<select>` (options from `fetchCityDirectory()`, including deactivated cities) that each apply **immediately** on change (re-running from page 1), plus a **from / to** date range that applies only via an explicit **Apply** — with a local `from ≤ to` pre-check that blocks the request and shows a field message without disturbing the current results. A **Reset** clears status + city and returns the range to the default 30 days. Filters combine, persist across paging, and are synced to the URL query string (`?status=&city=&from=&to=&page=`). A `422` for an unknown status / non-existent city / bad date surfaces a specific inline message and never replaces the list. Valid filters that match nothing show a distinct "no orders match these filters" state.

**Independent Test**: With the list on screen, pick a status → **no** Apply needed, one `GET …?status=…&page=1`, only that status, count updates, `?status=` in the URL; pick a city (then a deactivated city) → `…?city_id=…`; set from/to and click Apply → `…?placed_from=…&placed_to=…&page=1`, with 23:30-on-the-to-date included and the next day excluded; set from after to and Apply → **no** request, a field message, results unchanged; combine all three and change one → the others stay and it re-runs from page 1; filters that match nothing → "لا توجد طلبات مطابقة لهذه الفلاتر." + Reset; reload the browser on a filtered page 2 → the same view returns.

### Tests for User Story 2 ⚠️ (write first, must fail)

- [X] T028 [P] [US2] Integration test `tests/integration/orders-filter.test.tsx` with mocked `fetch` (ordered replies on the `GET /admin/orders?...` keys; seed `GET /admin/cities` for the directory): AC1 selecting a status issues exactly one `GET /admin/orders?status=<s>&placed_from=<30d>&page=1` with **no** Apply step, shows only that status, updates the count, and adds `status=` to the URL (FR-011 / FR-013a / SC-003); AC2 setting status back to "all" drops `status` from the query and URL (FR-011); AC3/AC4 selecting a city → `…&city_id=<id>&…`; the city `<select>` lists a **deactivated** city (from the directory) and it is a usable value (FR-012 / SC-004); AC5 setting `from` + `to` and clicking **Apply** issues `…?placed_from=<f>&placed_to=<t>&page=1` (nothing fires on the field `change` alone), and the backend-inclusive end is respected in the fixture (FR-013 / SC-005); AC6 only `from` → `placed_to` omitted; only `to` → `placed_from` omitted (FR-013); AC7 `from` later than `to` + **Apply** → **zero** `fetch`, `fromAfterTo` shown on the date fields (`aria-invalid` + `aria-describedby`), the current results unchanged (FR-014 / SC-006); AC8/AC9/AC10 a server `422` with `errors.placed_from` / `errors.status` / `errors.city_id` → that message renders inline on the matching control and `pageData` is **not** replaced (FR-015 / FR-031 / SC-007); AC11 with status + city + range applied, changing only the status keeps the city and range and re-runs from `page=1` (FR-016); AC12 filters that match nothing → the `emptyNoMatch` state, distinct from `emptyNoOrders`, with **Reset** clearing status + city and restoring `from = daysAgoCairo(30)` / `to = null` / `page = 1` (FR-018); AC13 with filters applied, Next / Prev carry the same `status` / `city_id` / `placed_from` / `placed_to` on every page (FR-017)
- [X] T029 [P] [US2] Integration test `tests/integration/orders-url-state.test.tsx` via `renderAtOrders(fm, { path: '/orders?status=completed&city=3&from=2026-08-01&to=2026-08-31&page=2' })`: exactly one `GET /admin/orders?status=completed&city_id=3&placed_from=2026-08-01&placed_to=2026-08-31&page=2` fires and page 2 is shown; changing the status rewrites the query string and resets `page`; `renderAtOrders(fm, { path: '/orders' })` (no params) → the default last-30-days, page-1 view with a clean URL; opening a row's detail does **not** change the query string (FR-036 / SC-017)
- [X] T030 [P] [US2] Extend `tests/a11y/orders-a11y.test.tsx` — the filter bar: `vitest-axe` clean; the status and city `<select>`s and the from/to `<input type="date">`s each have a programmatic label; `fromAfterTo` and any server field error are associated with their control (`aria-invalid` + `aria-describedby`) and announced via a live region; the "no orders match these filters" state and the result-summary change are announced (FR-035) *(same file as T018 — sequence after it)*

### Implementation for User Story 2

- [X] T031 [US2] Extend `useOrdersOversight()` in `src/orders/useOrdersOversight.ts`: implement `setStatusFilter(s)` and `setCityFilter(id)` → `setSearchParams(filtersToSearchParams({ ...filters, status|cityId }, 1), { replace: true })` (immediate, page → 1); add `draftFrom` / `draftTo` state (initialised from `filters.from` / `filters.to`, re-synced when the URL changes) with `setDraftFrom` / `setDraftTo`; `applyRange()` → `validateDateRange(draftFrom, draftTo)` → `null` ⇒ `setSearchParams(filtersToSearchParams({ ...filters, from: draftFrom, to: draftTo }, 1), { replace: true })` and clear `dateFieldError`; error ⇒ set `dateFieldError` and send **nothing**; `resetFilters()` → `setSearchParams(filtersToSearchParams({ status:'all', cityId:null, from: daysAgoCairo(30), to:null }, 1), { replace: true })`; in `load()`'s `catch`, when `err` is an `ApiError` with `status === 422` and `err.fieldErrors` has `status` / `city_id` / `placed_from` / `placed_to`, expose a `fieldError: { status?, city?, from?, to? }` map for the page and **do not** replace `pageData`; otherwise set `toast` and keep `pageData` (FR-011–018, FR-031) (depends on T019, T008) *(same file as T019, T037, T042)*
- [X] T032 [P] [US2] Implement `OrdersFilters` in `src/orders/OrdersFilters.tsx` per [contracts/orders-ui.md](./contracts/orders-ui.md) — props `{ filters, cities, draftFrom, draftTo, dateFieldError, serverFieldError, onStatus, onCity, onDraftFrom, onDraftTo, onApply, onReset }`; a status `<select>` (`<option value="all">{allStatuses}` + one per `ORDER_STATUSES` via `statusLabel`) whose `onChange` calls `onStatus` immediately; a city `<select>` (`<option value="">{allCities}` + one per `cities` via `name_ar`) whose `onChange` calls `onCity(Number(value) || null)` immediately; `from` / `to` `<input type="date">` (`dir="ltr"`) bound to `draftFrom` / `draftTo`; **Apply** and **Reset** buttons; render `dateFieldError` (`fromAfterTo`) and any `serverFieldError` message next to the relevant control with `aria-invalid` + `aria-describedby`; the `cities` list is obtained by the page from `fetchCityDirectory()` in `src/cities/citiesApi.ts` (read-only; includes inactive cities) (FR-011 / FR-012 / FR-013 / FR-013a / FR-014 / FR-035) (depends on T012, T005; consumes `src/cities/citiesApi.ts` unchanged)
- [X] T033 [US2] Wire filters into `src/orders/OrdersPage.tsx` — on mount resolve the city options from `fetchCityDirectory()` (tolerate a rejection: render the filter with an empty city list rather than failing the page); render `<OrdersFilters ... />` above the table with `onStatus={setStatusFilter}`, `onCity={setCityFilter}`, `onDraftFrom/onDraftTo`, `onApply={applyRange}`, `onReset={resetFilters}`, passing `dateFieldError` and the hook's `fieldError`; render the `emptyKind === 'filtered'` branch as `emptyNoMatch` + a **Reset** button; keep the result-summary live region updated on every result change (FR-011–018 / FR-031 / FR-035) (depends on T031, T032) *(Page also touched by US1 / US3 / Polish)*
- [ ] T034 [US2] Run the quickstart **US2** scenarios 1–9 and the **URL state** scenarios in [quickstart.md](./quickstart.md) and record results (depends on T033) — ⚠️ MANUAL: requires a live Phase 7 backend; deferred (automated integration + a11y coverage for these scenarios is green via the test files above)

**Checkpoint**: User Stories 1 and 2 both work independently; filters + page are shareable via the URL.

---

## Phase 5: User Story 3 - Administrator inspects a single order in detail (Priority: P3)

**Goal**: From a row's "عرض التفاصيل" button the administrator opens a **modal** (on `src/shared/DialogShell`) centred over the list — the list stays loaded behind it. The dialog is built **entirely from the `Order` already in memory** (no network request) and shows: the header block; `customer_id` and `delivery_address_id` as labelled reference numbers; the money breakdown; every line item (`item_name` / `unit_price` / `quantity` / `line_total`) or "لا توجد بنود بعد"; the customer note when present; the cancellation reason when cancelled; and, for a custom order, the custom-details block (each line only when present). **No** status timeline and **no** price quote are rendered — a commented, non-rendered slot marks where a later phase adds them. Closing (X / `Esc` / overlay) returns to the same page + scroll and restores focus to the row button.

**Independent Test**: Open the detail for a regular order → the Network tab shows **no** new request; every line item is listed and the line totals are consistent with the subtotal; the customer note shows only when present. Open a custom order with an empty `items` array → "لا توجد بنود بعد" and the custom-details block. Open a cancelled order → its `cancel_reason`. A regular order shows **no** custom-details block. No timeline / no quote anywhere. Close from a filtered page other than the first → same page, same filters, focus back on the "عرض التفاصيل" button.

### Tests for User Story 3 ⚠️ (write first, must fail)

- [X] T035 [P] [US3] Integration test `tests/integration/orders-detail.test.tsx` with mocked `fetch` (record the call count): AC1 clicking a row's "عرض التفاصيل" opens a `role="dialog"` `aria-modal` element and issues **zero** additional `fetch` (SC-013a); the header shows order number, cook, `OrderTypeBadge`, `OrderStatusBadge`, requested delivery date + slot, and "رقم العميل: {customer_id}" + "رقم العنوان: {delivery_address_id}" as plain numbers — **no** name / address text (FR-019 / FR-020); AC2 every `order.items[]` renders `item_name` / `unit_price` / `quantity` / `line_total`, and for a regular order the line totals sum to `subtotal` (SC-009); AC2b a `customOrder({ items: [] })` → "لا توجد بنود بعد" instead of an empty table (FR-021); AC3 `customer_note` shows only when a non-empty string, otherwise no note area/placeholder (FR-022); AC4 `cancel_reason` shows only when `status === 'cancelled'` and non-empty (FR-023 / SC-011); AC5 a `customOrder()` shows occasion / guests / dishes text / budget min+max / requested delivery date-time, omitting any `null` field (FR-024 / SC-010); AC6 a regular `order()` shows **no** custom-details block (FR-025); AC8 the dialog renders **no** status-timeline and **no** price-quote section even though `quote: null` / `status_history: []` are on the payload (FR-026); AC7/AC9 close via the X, `Esc`, and an overlay click each return to the same list page (query string unchanged) with focus back on the triggering "عرض التفاصيل" button (FR-027 / SC-012)
- [X] T036 [P] [US3] Extend `tests/a11y/orders-a11y.test.tsx` — `OrderDetailDialog` for a regular, a custom, and a cancelled order: `vitest-axe` clean; focus moves into the dialog on open, is trapped, and returns to the row button on close; `Esc` and an overlay click both close it; the dialog has an accessible name derived from the order number (`detailTitle`) *(same file as T018 / T030 — sequence after them)*

### Implementation for User Story 3

- [X] T037 [US3] Extend `useOrdersOversight()` in `src/orders/useOrdersOversight.ts` — implement `openDetail(order: Order)` → `setDetail({ order })` (a snapshot of the in-memory object; **no** `listOrders` call) and `closeDetail()` → `setDetail(null)`; `detail` is never written to `searchParams` (FR-019 / FR-027 / FR-036 / SC-013a) (depends on T019) *(same file as T019, T031, T042)*
- [X] T038 [P] [US3] Implement `OrderDetailDialog` in `src/orders/OrderDetailDialog.tsx` on `src/shared/DialogShell` per [contracts/orders-ui.md](./contracts/orders-ui.md) — props `{ order, onClose }`; `DialogShell` `label={detailTitle(order.order_number)}`, `onDismiss={onClose}`; render, in order: (1) header — order number, cook avatar + name, `<OrderTypeBadge>`, `<OrderStatusBadge>`, `formatOrderDate` + slot; (2) `customerRef(order.customer_id)` + `addressRef(order.delivery_address_id)` as labelled numbers; (3) money — subtotal / delivery fee / total; (4) a line-items `<table>` (`colItemName` / `colUnitPrice` / `colQty` / `colLineTotal`) or `noLineItems` when `order.items.length === 0`; (5) `customerNote` block only when `order.customer_note` is a non-empty string; (6) `cancelReason` block only when `isCancelled(order.status) && order.cancel_reason`; (7) a `customDetails` block only when `order.type === 'custom' && order.custom_details` — render `occasionType` / `guestCount` / `requestedDishes` / `budgetRange` (min–max) / `requestedDeliveryDateTime` (via `formatOrderDateTime`) each **only when its value is present**; (8) `{/* FR-026a: status timeline + price quote — later phase, from the shared order-details endpoint */}` rendering nothing. A single **Close** control; **no** other actions (FR-019–026 / FR-026a / FR-028 / FR-035) (depends on T020, T005, T006; `src/shared/DialogShell.tsx` from feature 005)
- [X] T039 [US3] Wire the detail into `src/orders/OrderRow.tsx` (render the "عرض التفاصيل" button in the actions `<td>` → `onOpenDetail(order)`) and `src/orders/OrdersPage.tsx` (when `detail != null` render `<OrderDetailDialog order={detail.order} onClose={closeDetail} />` after the table) (FR-019 / FR-027) (depends on T037, T038) *(Row + Page also touched by US1 / US2 / Polish)*
- [ ] T040 [US3] Run the quickstart **US3** scenarios 1–8 in [quickstart.md](./quickstart.md) and record results (depends on T039) — ⚠️ MANUAL: requires a live Phase 7 backend; deferred (automated integration + a11y coverage for these scenarios is green via the test files above)

**Checkpoint**: All three user stories are independently functional.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: The conditional auto-refresh (spans US1's page state and US2's date-range state) and cross-story verification that does not belong to a single user story.

### Conditional auto-refresh (FR-009 / FR-009a / FR-009b, SC-013b)

- [X] T041 [P] Integration test `tests/integration/orders-autorefresh.test.tsx` — write first, must fail; `vi.useFakeTimers()`: on page 1 with the default range and `autoRefreshOn`, advancing past `AUTO_REFRESH_MS` issues a **second identical** `GET /admin/orders?placed_from=<30d>&page=1`, the row set updates in place, and the scroll position, the filter values, and an open `OrderDetailDialog` are **untouched** (the dialog stays open, its content unchanged); on `?page=2` no automatic `GET` fires; with a custom narrower `from` (e.g. `daysAgoCairo(3)`) no automatic `GET` fires; toggling auto-refresh **off** stops the automatic `GET`; the manual **Refresh** button still issues exactly one `GET` on demand in every case (FR-009 / FR-009a / FR-009b / SC-013b)
- [X] T042 Implement the conditional auto-refresh in `src/orders/useOrdersOversight.ts` — add `setAutoRefresh(on: boolean)` and an effect: when `pageNumber === 1 && isDefaultOrWiderRange(filters.from, filters.to) && autoRefreshOn`, `setInterval(() => load({ silent: true }), AUTO_REFRESH_MS)` (`AUTO_REFRESH_MS = 30_000`, a module constant) with a cleanup that clears it; `load({ silent: true })` re-issues the current query and replaces `pageData` on success but **never** flips `status` to `'loading'`, **never** calls `setSearchParams`, and **never** touches `filters` / `draftFrom` / `draftTo` / `detail`; on failure it keeps the shown page and sets `toast`; any of {leaving page 1, a narrower range, toggling off} tears the interval down via the dependency array (FR-009 / FR-009a / FR-009b) (depends on T031, T037, T006) *(same file as T019, T031, T037)*
- [X] T043 Extend `src/orders/OrdersPage.tsx` — render a labelled **auto-refresh** toggle (`autoRefresh` string) in the header that reflects `autoRefreshOn` and calls `setAutoRefresh`; it is present regardless of page/range but only has an effect where FR-009a allows (FR-009b) (depends on T042) *(Page also touched by US1 / US2 / US3)*
- [ ] T044 Run the quickstart **Auto-refresh** scenarios 1–5 in [quickstart.md](./quickstart.md) against a Phase 7 backend and record results (depends on T043) — ⚠️ MANUAL: requires a live Phase 7 backend; deferred (automated integration + a11y coverage for these scenarios is green via the test files above)

### Cross-cutting verification

- [X] T045 [P] Work through the quickstart "Accessibility — WCAG 2.1 AA and RTL" manual checklist in [quickstart.md](./quickstart.md) — keyboard-only completion of changing a filter, paging, and opening + closing the detail; screen-reader announcement of the result summary, the `fromAfterTo` message, any server field error, and the refresh-failed toast; colour-independent type/status badges (greyscale check); and the full RTL sign-off (table, filter bar, pagination, detail dialog, all state messages; order numbers / dates / time slots / money left-to-right in their cells, formatted in Africa/Cairo) (FR-034 / FR-035 / SC-014 / SC-015)
- [X] T046 [P] Verify observability, config, and the read-only contract: list failures are logged through the existing `logger` seam with status + path only (no order payloads); no new environment variables are introduced and `import.meta.env.VITE_API_BASE_URL` is the only base-URL source; grep `src/orders/` and confirm **no** `method: 'POST' | 'PUT' | 'PATCH' | 'DELETE'` and no second endpoint — `listOrders` is the only call (FR-028, plan "Constraints")
- [X] T047 [P] Full regression: run `npm run test:run` and `npm run build` — all unit / integration / a11y suites green; **no** test file other than `tests/helpers/fixtures.ts` and `tests/helpers/harness.tsx` was changed for this feature; `src/pages/OrdersPage.tsx` is deleted and nothing imports it; `tsc` + `vite build` clean
- [X] T048 Final traceability review against [spec.md](./spec.md): confirm every FR-001…FR-036 and SC-001…SC-017 is exercised by a task above, and tick the "Definition of done for this feature" bullets in [quickstart.md](./quickstart.md)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: no dependencies — start immediately.
- **Foundational (Phase 2)**: depends on Setup. **Blocks all user stories.** T004 → T010 / T012 / T014; T005 → T012; T006 → T007 and T010; T008 → T009 and T014; T010 → T011; T012 → T013. T015 after them.
- **User Story 1 (Phase 3)**: depends on Foundational. No dependency on US2 / US3. **This is the MVP.**
- **User Story 2 (Phase 4)**: depends on Foundational **and** US1 (extends `useOrdersOversight` and `OrdersPage`; needs the list on screen to filter). Consumes `src/cities/citiesApi.ts` `fetchCityDirectory()` unchanged.
- **User Story 3 (Phase 5)**: depends on Foundational **and** US1 (extends `useOrdersOversight`, `OrderRow`, `OrdersPage`; needs a row to open the detail from). Independent of US2 in behaviour.
- **Polish (Phase 6)**: the auto-refresh tasks (T041–T044) depend on US1 (page state) **and** US2 (the date-range/`draftFrom` plumbing from T031); the verification tasks depend on every story phase being shipped.

### User Story Dependencies

- **US1 (P1)**: Foundational only.
- **US2 (P2)**: Foundational + US1.
- **US3 (P3)**: Foundational + US1 (independent of US2).

### Within Each User Story

- Tests (the `⚠️ write first, must fail` tasks) before implementation.
- Hook (`useOrdersOversight`) method before the Page / Row wiring that calls it.
- Presentational components (`OrderStatusBadge`, `OrderTypeBadge`, `Pagination`, `OrdersFilters`, `OrderDetailDialog`) can be built in parallel with the hook, then composed.
- The manual quickstart task last in each story.

### Parallel Opportunities

- **Setup**: T001, T002, T003 all `[P]`.
- **Foundational**: T004 and T005 first (in parallel); then T006+T007, T008+T009, T012+T013 as independent impl+test pairs `[P]`; T010+T011 after T006 and T012; T014 after T004 and T008. T015 last.
- **US1 tests**: T016, T017, T018 in parallel.
- **US1 impl**: T020, T021 in parallel with T019; T022 → T023 → T024 sequential (component chain); then T025, T026 in parallel; T027 last.
- **US2**: T028, T029, T030 in parallel; T032 `[P]` with T031; T033 after both; T034 last.
- **US3**: T035, T036 in parallel; T038 `[P]` with T037; T039 after both; T040 last.
- **Polish**: T041 first (red); T042 → T043 → T044 sequential; T045, T046, T047 in parallel; T048 last.
- **Cross-story**: once Foundational is done, one developer takes US1 while another builds `OrdersFilters` (T032) and `OrderDetailDialog` (T038) and the pure-helper tests — they only depend on Foundational.

---

## Parallel Example: Foundational pure helpers

```bash
# After T004 (types) and T005 (messages) land, these impl+test pairs are independent files:
Task: "Implement src/orders/cairoDates.ts"
Task: "Unit test tests/unit/cairoDates.test.ts (write first, must fail; run under a non-Cairo TZ)"
Task: "Implement src/orders/ordersQuery.ts (buildOrdersQuery + validateDateRange)"
Task: "Unit test tests/unit/ordersQuery.test.ts (write first, must fail)"
Task: "Implement src/orders/orderStatus.ts (ORDER_STATUSES, statusLabel, isCancelled, icons)"
Task: "Unit test tests/unit/orderStatus.test.ts (write first, must fail)"
# Then, after cairoDates + orderStatus:
Task: "Implement src/orders/urlState.ts (filtersFromSearchParams / filtersToSearchParams)"
Task: "Unit test tests/unit/ordersUrlState.test.ts (write first, must fail)"
```

## Parallel Example: User Story 1 tests

```bash
Task: "Integration test tests/integration/orders-list.test.tsx"
Task: "Integration test tests/integration/orders-session.test.tsx"
Task: "Accessibility test tests/a11y/orders-a11y.test.tsx"
```

---

## Implementation Strategy

### MVP First (User Story 1 only)

1. Complete Phase 1: Setup.
2. Complete Phase 2: Foundational (CRITICAL — blocks all stories).
3. Complete Phase 3: User Story 1 — the paginated orders list with the default 30-day window, all states, pagination, manual refresh, the route repoint, and the sidebar label.
4. **STOP and VALIDATE**: run `tests/integration/orders-list.test.tsx`, `orders-session.test.tsx`, `orders-a11y.test.tsx`, and the quickstart US1 scenarios. This is a shippable read-only Orders Oversight screen.

### Incremental Delivery

1. Setup + Foundational → foundation ready.
2. US1 → test independently → demo (paginated list + states).
3. US2 → test independently → demo (status / city / date filters + URL-shareable views).
4. US3 → test independently → demo (order detail modal).
5. Phase 6 → conditional auto-refresh, then full a11y + RTL sign-off, observability, regression, traceability.

### Parallel Team Strategy

1. Whole team completes Setup + Foundational.
2. Then: Developer A on US1 (`useOrdersOversight` core + `OrdersPage` + table). Developer B builds `OrdersFilters` (T032), `OrderDetailDialog` (T038), and the four pure-helper unit tests. Once US1's `useOrdersOversight` + `OrdersPage` exist, US2 and US3 wiring can be split, coordinating on the shared `useOrdersOversight.ts` / `OrdersPage.tsx` / `OrderRow.tsx` edits (serialize per the Serialization Points list).

---

## Notes

- `[P]` = different files, no dependency on an incomplete task.
- `[Story]` label maps a task to its user story for traceability; Setup / Foundational / Polish carry none.
- **Read-only**: `src/orders/` issues exactly one `GET /admin/orders` and no other request; there is no mutation, no outcome-classifier, no confirmation dialog (FR-028).
- The URL query string (`?status=&city=&from=&to=&page=`) is the single source of truth for filters + page; `from` equal to `daysAgoCairo(30)` and `page` equal to `1` are omitted from the URL but the real `placed_from` is **always** sent to the API. The detail dialog is never in the URL (FR-036).
- All dates — display, the default window, and the from/to day boundaries — use fixed `Africa/Cairo` via `Intl`; no date library is added (research R5; FR-013b).
- `fetchMock` keys for this feature **include the query string**; every list assertion checks the exact query `buildOrdersQuery` produced (param order, omitted params, `page` always present) and post-navigation / auto-refresh loads use **ordered replies**.
- Opening the detail must issue **zero** network requests (SC-013a); auto-refresh runs only on page 1 with the default-or-wider range, is toggleable off, and never disturbs scroll, filters, or an open dialog (FR-009a / FR-009b).
- `quote` and `status_history` are never rendered; the detail keeps a commented, non-rendered slot for a later phase (FR-026 / FR-026a).
- Verify each `⚠️` test fails before implementing the code it covers.
- Commit after each task or logical group; stop at any checkpoint to validate a story independently.
- Do not edit any `src/cooks/**`, `src/drivers/**`, `src/cities/**`, or `src/settings/**` file or their tests. `src/cities/citiesApi.ts` is **consumed** (`fetchCityDirectory`) but not modified. The only shared-surface changes are T025 (`src/App.tsx` route repoint + placeholder delete) and T026 (`src/components/Sidebar.tsx` label) — both one-line, and T025 must rebase onto the concurrent `006` edit to `src/App.tsx`.
