# Implementation Plan: Orders Oversight

**Branch**: `007-orders-oversight` | **Date**: 2026-09-07 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/007-orders-oversight/spec.md`

## Summary

Replace the placeholder `src/pages/OrdersPage.tsx` mock with a real **read-only** Orders Oversight screen on the existing `/orders` route and its existing sidebar entry. An administrator sees one **server-paginated** page of orders at a time (`GET /admin/orders` → `{ items, page, per_page, total }`, `per_page` fixed at 20, navigation via `?page=N`). Each row shows order number, cook (name + avatar), type (regular/custom), status, requested delivery date + time slot, and the money breakdown (subtotal, delivery fee, total); custom and cancelled orders are marked by more than colour. Three filters combine — a single **status** (the 12 `OrderStatus` values + "all"), a **city** (the cook's city; any city, active or not), and a **placed-date range** (from / to). On first open with nothing in the URL, a default `placed_from` of **30 days ago (Africa/Cairo)** is applied and shown pre-set; the total is labelled as "within the applied range". Status and city filters apply **immediately** on selection; the date range applies only via an explicit **Apply** with a local `from ≤ to` pre-check (blocked, no request, message on the fields, current results kept); a **Reset** clears status + city and returns the range to the default 30 days. Filter state and page number are **synced to the URL query string** (`?status=&city=&from=&to=&page=`) so a reload restores the view and the URL is shareable; the order-detail dialog is *not* in the URL. From a row the administrator opens a **modal** order detail (centred over the list, list stays loaded behind it) built **entirely from the list payload — no per-order request**: header block, `customer_id` + `delivery_address_id` shown as labelled reference numbers, money breakdown, every line item (`item_name`, `unit_price`, `quantity`, `line_total`) or an explicit "no line items yet", the customer note when present, the cancellation reason when cancelled, and — for a custom order — the custom-details block. `quote` and `status_history` are never rendered; the layout keeps a defined, non-rendered slot for a later phase to add a timeline + quote from the shared order-details endpoint. A **conditional auto-refresh** re-issues the current query on an interval, but only while on **page 1** with the **default-or-wider** date range; it can be turned off, and it never moves scroll, changes filters, or closes the detail. All dates — display, "last 30 days", and the from/to day boundaries — use **fixed Africa/Cairo** for every administrator. All states (loading / empty / no-match / list-error / page-beyond-range) are explicit; `422` (invalid status, non-existent city, invalid date, `from` after `to`) surfaces a specific message without replacing the current results; `401` routes through the Phase 1 session-loss path.

Technical approach: same shape as Phases 2–6 — a feature folder under `src/orders/` with a data hook, an API wrapper, pure helpers, an Arabic `messages.ts`, a screen, and small presentational components; the detail dialog sits on the existing `src/shared/DialogShell`. Four things drive the new code versus Phase 5: (1) the endpoint is genuinely **server-paginated** (`?page=N`, fixed `per_page`, `total` in the body — the client holds exactly one page and replaces it on navigation; contrast Phase 5's whole-array-in-memory); (2) **URL as the source of truth** for filters + page via `react-router-dom` `useSearchParams` (Phase 4's research deferred this; Phase 7's FR-036 requires it); (3) a **fixed-timezone date module** (`Intl.DateTimeFormat` with `timeZone: 'Africa/Cairo'` — no date library added) for the default window, the from/to boundaries, and timestamp display; (4) a **conditional polling** effect gated on `page === 1 && rangeIsDefaultOrWider && autoRefreshOn`. The city filter's options are read from the **already-memoised** `fetchCityDirectory()` in `src/cities/citiesApi.ts` (includes inactive cities) — the same directory cook/driver review already use, so no new cities call. Reuse the Phase 1 transport seam (`authedRequest` + `setTokenProvider`) so feature code never handles the bearer token and `401`s route through the existing `unauthorizedHandler`. Reuse the Phase 3 inline toast + `aria-live` pattern. No new runtime dependencies (`react-router-dom` is already a dependency); tests use the existing Vitest + Testing Library + `vitest-axe` + `fetchMock` harness.

## Technical Context

**Language/Version**: TypeScript `~6.0.2` (`typescript` in package.json), compiled by Vite 8; `target` ES2023, `jsx: react-jsx`, `verbatimModuleSyntax: true`. `@types/react` 19.x against a React 18.x runtime — pre-existing, not touched.

**Primary Dependencies**: React 18, react-dom 18, react-router-dom 7 (routing already in place; this feature also uses its `useSearchParams` for URL-synced list state), Tailwind CSS 4, lucide-react (icons — the sidebar already has `ShoppingBag` for `/orders`; the screen uses `RefreshCw` for refresh, `Eye` for "view details", `ChevronRight`/`ChevronLeft`/`ChevronsRight` for pagination, `SlidersHorizontal` for the filter bar, `X` to close the dialog). No HTTP client, state library, data-fetching library, form library, table library, or date library — native `fetch` (via the Phase 1 `authedRequest`), React hooks, `URLSearchParams`, and `Intl.DateTimeFormat` cover one paginated GET plus URL state plus Cairo-fixed date handling.

**Storage**: None new. The bearer token continues to live in `localStorage` under the Phase 1 keys and is read only through the `setTokenProvider` seam. The **URL query string** (`?status=&city=&from=&to=&page=`) is the durable state for filters + page — it survives reload and is shareable (FR-036). Everything else (the current page payload, the open-detail order, the auto-refresh on/off flag, the draft from/to dates before Apply) is in-memory only and is dropped when the administrator leaves `/orders`. No client cache of visited pages — each page is one cheap `GET` and a stale cached page would contradict FR-017's "every retrieved page reflects the same filter set".

**Testing**: Vitest + @testing-library/react + @testing-library/user-event + jsdom for unit/integration; `vitest-axe` for the WCAG checks (SC-014). Reuses `tests/helpers/fetchMock.ts`, `tests/helpers/harness.tsx`, `tests/helpers/fixtures.ts`, `tests/setup.ts`. `fetch` is mocked per test with envelope fixtures mirroring `admin-dashboard-api.md` Phase 7 (paginated `data`, `quote: null`, `status_history: []`, `custom_details` populated only for `type: 'custom'`), including the `422` `errors` maps for an invalid `status`, a non-existent `city_id`, and `placed_from` after `placed_to`, and **ordered replies** on the `GET /admin/orders?...` keys for the auto-refresh and post-navigation paths. Because `fetchMock` keys are `"<METHOD> <path>"` **including the query string**, tests assert the exact query the hook builds (param order, omitted-when-default params).

**Target Platform**: Modern desktop browsers (Chromium, Firefox, Safari current). Static SPA, RTL Arabic UI (`dir="rtl"` already on `AdminLayout`); numeric/date cells are `dir="ltr"` within the RTL layout.

**Project Type**: Web — single existing frontend project in `src/`. No backend work.

**Performance Goals**:
- SC-001: a page of orders is visible within 5 s of the response arriving — met trivially by rendering ≤20 rows with no per-row async work.
- SC-013a: opening the detail triggers **no** network request — met because the detail renders the `Order` object already in `pageData.items` (data-model §2).
- SC-013b / FR-009a: the auto-refresh effect only schedules an interval when `page === 1 && rangeIsDefaultOrWider && autoRefreshOn`; changing any of those tears the interval down. Interval ~30 s (dashboard-side constant, not backend-driven).
- SC-017: a reload or a pasted URL reproduces the exact view — met because `useSearchParams` is the single source of truth for `{ status, city, from, to, page }`.

**Constraints**:
- FR-001/FR-002/FR-003: one server-paginated list, fixed 20/page, `?page=N` navigation; each row shows order number, cook (name + avatar where present), type, status, requested delivery date + time slot, subtotal, delivery fee, total; current page + total shown; first/prev/next controls each disabled when they do not apply. **No customer column** (only a numeric `customer_id` exists; it is shown in the detail only).
- FR-004: custom orders and cancelled orders distinguishable by more than colour (label + icon).
- FR-005/FR-006/FR-007/FR-008: loading state distinct from empty; explicit "no orders" empty state; explicit "no orders on this page" state (with "back to first page") when a page past the end returns `items: []`; a failed list request → retryable "something went wrong" with no blank/stale list shown as authoritative.
- FR-009/FR-009a/FR-009b: a manual refresh always available; conditional auto-refresh only on page 1 with the default-or-wider range and not turned off; an auto-refresh never moves scroll/selection, never resets filters, never closes the open detail; the administrator can turn it off.
- FR-010: on open with no query params, apply a default `placed_from` = 30 days ago (Africa/Cairo), shown pre-set and editable; most-recent first; the total is labelled "within the applied range".
- FR-011/FR-012/FR-013/FR-013a/FR-013b: status filter = exactly the 12 `OrderStatus` values + "all", single-select, **applies on selection**; city filter lists every city incl. deactivated (from the directory), **applies on selection**; placed-date range = optional from + optional to, inclusive, "to" covers the whole day to 23:59:59, open-ended when one side unset, **applied via an explicit Apply**; **all** date handling (display, default window, day boundaries) uses fixed Africa/Cairo for every administrator.
- FR-014: before sending a range request the client checks `from ≤ to` locally; if not, **no request**, a message on the date fields, current results unchanged; if the server still returns this `422`, surface it the same way without replacing results.
- FR-015: a `422` for an unknown status / non-existent city / unparseable date → a specific message for that case; the request is not treated as successful and the list is not updated with results for the invalid filter. (The status and city controls only offer valid values, so these are safeguards.)
- FR-016/FR-017: filters combine; changing one keeps the others; an immediate (status/city) change re-runs from page 1 at once; a date-range change re-runs from page 1 on Apply; filters stay in effect across page navigation; the total reflects the filtered set.
- FR-018: valid filters that match nothing → a "no orders match these filters" state distinct from the unfiltered empty state, filters still adjustable, plus a "reset filters" that clears status + city and restores the default 30-day range.
- FR-019/FR-020: the detail is a **modal dialog centred over the list**, no per-order route, list preserved behind it; it shows order number, cook, type, status, requested delivery date + slot, subtotal/fee/total, and `customer_id` + `delivery_address_id` as **labelled reference numbers** (no name/address, no extra request).
- FR-021/FR-022/FR-023/FR-024/FR-025: every line item with `item_name`, `unit_price`, `quantity`, `line_total`, or an explicit "no line items yet"; the customer note only when present; the cancellation reason only when cancelled; for a custom order the custom-details block (occasion, guest count, requested-dishes text, budget min/max, requested delivery date/time), showing only present values; for a regular order **no** custom-details block.
- FR-026/FR-026a: the detail is in scope, built entirely from the list response, **no** additional per-order request; **no** status history and **no** price quote rendered, and **no** empty timeline/quote shown; the layout reserves a clearly identified, non-rendered slot for a later phase to populate a timeline + quote.
- FR-027: closing the dialog (close control, `Esc`, or overlay dismiss) returns the administrator to the same page + scroll position with filters unchanged and restores focus to the row control that opened it.
- FR-028: **read-only** — no control anywhere changes an order (no status change, cancel, assign, edit).
- FR-029/FR-030: every request goes through `authedRequest`; a `401` triggers the Phase 1 `unauthorizedHandler` → session ends → `/login`. `/orders` renders only inside `<RequireAdmin>`; a signed-in non-admin never reaches it.
- FR-031/FR-032: the standard envelope drives error notifications; field-level validation messages surface against the from-date / to-date / status / city where the response provides them; unexpected server errors → a generic retryable message with the view left consistent (no stale results shown as authoritative).
- FR-033/FR-034: reuse the shared layout, sidebar, `authedRequest`, `<RequireAdmin>`, and the toast pattern; the `/orders` route + "إدارة الطلبات" sidebar entry already exist (repointed screen, label updated to the oversight wording). Arabic-first RTL for the table, filters, pagination, detail, and every state; money/dates/time slots formatted consistently with the dashboard, in Africa/Cairo.
- FR-035: WCAG 2.1 AA — programmatic labels on every control/field; full keyboard operation with a visible focus ring; the detail dialog traps + restores focus and is `Esc`-dismissible; `<th scope="col">` per column; type and status not by colour alone; result-set / total-count changes (incl. the no-match state) announced to AT; validation/error messages (incl. invalid-date and `from`-after-`to`) announced.
- FR-036: `{ status, city, from, to, page }` are synced to the URL query string; an empty query string resolves to the default view (last 30 days, page 1); applying / changing / resetting a filter and paging update the URL; the detail dialog's open/closed state and target order are **not** in the URL.
- Backend base URL stays `import.meta.env.VITE_API_BASE_URL`; no new env vars.

**Scale/Scope**: ~12 new source files under `src/orders/`; delete the placeholder `src/pages/OrdersPage.tsx`; 1 route repoint in `src/App.tsx`; 1 label change in `src/components/Sidebar.tsx` (same path); read-only reuse of `fetchCityDirectory` from `src/cities/citiesApi.ts` (no edit); `tests/helpers/fixtures.ts` + `tests/helpers/harness.tsx` extended; ~10 new test files. 40+ functional requirements, 17 success criteria, 3 user stories (P1 paginated list, P2 filters, P3 detail). No change to `src/api/`, `src/auth/`, `src/cities/`, `src/cooks/`, `src/drivers/`, `src/review/`, or `src/shared/`.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

`.specify/memory/constitution.md` is an unratified template — every principle and section is still a `[PLACEHOLDER]`. There are **no project-specific constitutional gates to enforce**. The plan holds itself to the general principles the template gestures at, consistent with Phases 1–6:

| Principle (template intent) | How this plan complies |
|---|---|
| Test-First | The Vitest harness already exists. Each user story's acceptance scenarios become integration tests written alongside the implementation; the pure helpers (`buildOrdersQuery`, `validateDateRange`, `filtersFromSearchParams` / `filtersToSearchParams`, the Cairo date helpers, the status/type label maps) get unit tests first. |
| Simplicity / YAGNI | Zero new runtime dependencies. Reuses the Phase 1 `authedRequest` / `ApiError` / `unauthorizedHandler`, the Phase 5 `fetchCityDirectory`, the shared `DialogShell`, and the Phase 3 toast pattern. No table library, no form library, no data-fetching library, no global store, no date library (`Intl` + calendar-date arithmetic), no client-side page cache. One feature hook + local component state + `useSearchParams`. The detail is one read-only dialog with no submit path. Read-only means no mutation/outcome machinery at all. |
| Integration testing on contract boundaries | `src/orders/ordersApi.ts` + `buildOrdersQuery` get integration/unit tests against mocked `fetch` mirroring `admin-dashboard-api.md` Phase 7 — the `200` paginated shape, the `422`(+`errors`) branches (invalid status, non-existent city, `from` after `to`), the `0`/`5xx` branch, and the exact query string built for every filter combination (default range omitted-vs-explicit, status omitted when "all", `city` omitted when none, `page` always sent). `quote: null` / `status_history: []` asserted to render nothing. |
| Observability | Non-2xx envelope failures are logged via the existing `logger` seam inside `apiRequest` (status + path only; order contents are not logged). |
| Versioning | N/A — no published library surface; app version stays `0.0.0`. |

**Result**: PASS (no violations; Complexity Tracking table left empty).

*Post-Phase 1 re-check*: PASS — the design adds zero runtime dependencies and no extra projects. The only shared-surface touch is deleting the dead `src/pages/OrdersPage.tsx` placeholder and repointing its route; `fetchCityDirectory` is consumed read-only exactly as cook/driver review already consume it; `DialogShell` is used unchanged. See [research.md](./research.md) decisions R1–R12.

## Project Structure

### Documentation (this feature)

```text
specs/007-orders-oversight/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
│   ├── orders-api.md         # External: GET /admin/orders (query params, paginated envelope, 422 cases)
│   └── orders-ui.md          # Internal: ordersApi / useOrdersOversight / pure helpers / component props / messages
├── checklists/
│   └── requirements.md  # Pre-existing spec-quality checklist
└── tasks.md             # Created later by /speckit-tasks
```

### Source Code (repository root)

```text
src/
├── api/                       # UNCHANGED — authedRequest / setTokenProvider / unauthorizedHandler reused as-is (GET only)
├── auth/                      # UNCHANGED — session, RequireAdmin, unauthorized handler reused as-is
├── shared/
│   └── DialogShell.tsx        # UNCHANGED — reused verbatim for the order-detail modal
├── cities/
│   └── citiesApi.ts           # UNCHANGED — fetchCityDirectory() consumed read-only for the city filter options
├── orders/                    # NEW feature folder
│   ├── ordersApi.ts           # NEW: listOrders(query: OrdersQuery, signal?) → OrderPage
│   │                          #      GET /admin/orders?<buildOrdersQuery(...)> ; propagates ApiError
│   ├── types.ts               # NEW: OrderStatus, Order, OrderItem, CustomOrderDetails, OrderPage,
│   │                          #      OrderFilters, OrdersQuery, DateRangeError, OrdersStatus, DetailState
│   ├── ordersQuery.ts         # NEW pure: buildOrdersQuery(filters, page) → string (leading "?"),
│   │                          #      omitting status when 'all', city when null, to when unset;
│   │                          #      validateDateRange(from, to) → DateRangeError | null (local from ≤ to)
│   ├── urlState.ts            # NEW pure: filtersFromSearchParams(sp) → { filters, page } (applies the
│   │                          #      default 30-day 'from' when absent); filtersToSearchParams(filters, page)
│   │                          #      → URLSearchParams (omits defaults so a clean URL stays clean)
│   ├── cairoDates.ts          # NEW pure: cairoToday() → 'YYYY-MM-DD'; daysAgoCairo(n) → 'YYYY-MM-DD';
│   │                          #      isDefaultOrWiderRange(from, to) → boolean; formatOrderDateTime(iso)
│   │                          #      & formatOrderDate(ymd) via Intl { timeZone: 'Africa/Cairo' }
│   ├── orderStatus.ts         # NEW pure: ORDER_STATUSES (the 12), statusLabel(s), isCancelled(s),
│   │                          #      statusIcon(s); typeLabel('regular'|'custom')
│   ├── useOrdersOversight.ts  # NEW hook: reads/writes useSearchParams; owns pageData + status +
│   │                          #      detail + draftRange + autoRefreshOn; load / refresh / setStatus /
│   │                          #      setCity / applyRange / resetFilters / goToPage / first / prev / next /
│   │                          #      openDetail / closeDetail; conditional polling effect
│   ├── messages.ts            # NEW: Arabic strings (page, columns, filters, pagination, states, dialog labels)
│   ├── OrdersPage.tsx             # /orders screen: header (title + manual refresh + auto-refresh toggle),
│   │                              #   OrdersFilters, loading / empty / no-match / list-error / page-beyond
│   │                              #   states, OrdersTable, Pagination, OrderDetailDialog wiring, two live regions
│   ├── OrdersFilters.tsx         # status <select> (immediate), city <select> (immediate, from directory),
│   │                              #   from/to date inputs + Apply + Reset; local from ≤ to check + field message
│   ├── OrdersTable.tsx           # <table>: header row + one <OrderRow> per item
│   ├── OrderRow.tsx              # order number, cook (avatar+name), <OrderTypeBadge>, <OrderStatusBadge>,
│   │                              #   requested delivery date + slot (dir="ltr"), subtotal/fee/total, "view details"
│   ├── OrderTypeBadge.tsx        # regular vs custom: label + icon, never colour-only (FR-004/035)
│   ├── OrderStatusBadge.tsx      # status label + icon; cancelled clearly marked, never colour-only
│   ├── Pagination.tsx            # first / prev / next + "صفحة N" + "M طلب ضمن النطاق"; disabled states
│   └── OrderDetailDialog.tsx     # modal on src/shared/DialogShell: header block (number, cook, type, status,
│                                 #   requested delivery), customer_id + delivery_address_id as labelled refs,
│                                 #   money breakdown, line-items table or "no line items yet", customer note
│                                 #   (if present), cancel reason (if cancelled), custom-details block (if custom).
│                                 #   A commented, non-rendered <!-- timeline + quote slot --> region (FR-026a).
├── pages/
│   └── OrdersPage.tsx         # DELETE — placeholder mock (hard-coded orders, fake stats); replaced by src/orders/OrdersPage
├── cooks/ , drivers/ , cities/ , review/   # UNCHANGED
└── App.tsx                    # EDIT: import OrdersPage from './orders/OrdersPage'; the /orders <Route>
                               #   element changes from the old <OrdersPage/> to the new one; drop the old import

src/components/
└── Sidebar.tsx               # EDIT (label only): 'إدارة الطلبات' → 'مراقبة الطلبات', same icon (ShoppingBag),
                              #   same path '/orders'  (matches the "Orders Oversight" area name; FR-033)

tests/
├── helpers/
│   ├── fixtures.ts           # EDIT: add order(overrides) / customOrder(overrides) / orderItem(overrides) /
│   │                         #   ordersPage(items, { page?, per_page?, total? }) → ok({items,page,per_page,total});
│   │                         #   reuse ok()/fail() (e.g. fail('The given data was invalid.',
│   │                         #   { city_id: ['المدينة غير موجودة.'] }))
│   └── harness.tsx           # EDIT: add renderAtOrders(fm, { seedMe?, admin?, path? }) — MemoryRouter
│                             #   initialEntries=[path ?? '/orders'] so URL-state tests pass '/orders?status=…&page=2'
├── unit/
│   ├── ordersQuery.test.ts            # buildOrdersQuery: default range → only from+page; explicit to; status
│   │                                  #   omitted when 'all'; city omitted when null; page always present; encoding.
│   │                                  #   validateDateRange: from>to → error; from==to ok; one side unset ok; both unset ok
│   ├── ordersUrlState.test.ts         # filtersFromSearchParams: empty → default 30-day from + page 1; round-trips
│   │                                  #   status/city/from/to/page; ignores unknown params; clamps page ≥ 1.
│   │                                  #   filtersToSearchParams: omits default from, omits 'all' status, omits null city
│   ├── cairoDates.test.ts             # daysAgoCairo(30) is 'YYYY-MM-DD' 30 calendar days before cairoToday();
│   │                                  #   isDefaultOrWiderRange: default from + no to → true; narrower from → false;
│   │                                  #   any explicit to → false; formatOrderDateTime uses Africa/Cairo (fixed —
│   │                                  #   assert with a mocked TZ different from Cairo)
│   └── orderStatus.test.ts            # ORDER_STATUSES has the 12 values; statusLabel covers all; isCancelled;
│                                      #   typeLabel('regular'|'custom')
├── integration/
│   ├── orders-list.test.tsx           # US1 AC1–9: default 30-day range applied + shown; row columns; loading vs
│   │                                  #   empty; custom + cancelled marked (not colour-only); cancel reason reachable;
│   │                                  #   next/prev/first paging → correct GET query + page indicator + total;
│   │                                  #   list-load error → retry; page-beyond-range → "no orders on this page" +
│   │                                  #   back-to-first (FR-001–008, FR-010, FR-030, SC-001/001a/002/016)
│   ├── orders-filter.test.tsx         # US2 AC1–13: status select → immediate GET ?status=…&page=1, total updates;
│   │                                  #   clear status; city select → ?city=… incl. a deactivated city; from/to +
│   │                                  #   Apply → ?from=&to=; one side only; from>to → NO request + field message +
│   │                                  #   results unchanged; server 422 (bad status / bad city / bad date) → specific
│   │                                  #   message, list not updated; combine + change one keeps others, resets to
│   │                                  #   page 1; no-match state + Reset (FR-011–018, SC-003–008)
│   ├── orders-detail.test.tsx         # US3 AC1–9: open modal from a row → NO extra request; header block +
│   │                                  #   customer_id/address_id as labelled refs; line items with unit price/qty/
│   │                                  #   line total; "no line items yet" for an unquoted custom order; note shown
│   │                                  #   only when present; cancel reason only when cancelled; custom-details block
│   │                                  #   for custom, absent for regular; no timeline / no quote rendered; close →
│   │                                  #   same page + focus restored (FR-019–027, SC-009/010/011/012/013a)
│   ├── orders-url-state.test.tsx      # FR-036 / SC-017: render at '/orders?status=completed&city=3&from=2026-08-01&
│   │                                  #   to=2026-08-31&page=2' → one GET with that exact query, page 2 shown;
│   │                                  #   changing a filter rewrites the query; opening/closing the detail does NOT
│   │                                  #   touch the query; render at '/orders' (no params) → default 30-day view
│   ├── orders-autorefresh.test.tsx    # FR-009/009a/009b / SC-013b: on page 1 + default range → a second identical
│   │                                  #   GET fires after the interval (fake timers), scroll/filters/open-detail
│   │                                  #   untouched; on page 2 → no auto GET; with a custom narrower range → no auto
│   │                                  #   GET; toggle off → no auto GET; manual refresh always issues one GET
│   └── orders-session.test.tsx        # FR-029/FR-030: 401 on the list GET → Phase 1 session-loss → /login;
│                                      #   non-admin never reaches /orders
└── a11y/
    └── orders-a11y.test.tsx           # axe on: loading, the table, the filter bar, the empty state, the no-match
                                       #   state, the list-error state, the page-beyond state, OrderDetailDialog
                                       #   (regular + custom + cancelled). Keyboard-only: change status, page next,
                                       #   open + close the detail. <th scope="col"> per column; type/status not
                                       #   colour-only; result-count + validation messages announced. RTL smoke
                                       #   (SC-015). (FR-034/035, SC-014)
```

**Structure Decision**: Keep the existing single Vite SPA. New feature code lands in a new `src/orders/` folder mirroring the `src/cities/` / `src/drivers/` layout (api wrapper + pure helpers + hook + messages + screen + presentational components + one dialog). The `/orders` route and its "إدارة الطلبات" sidebar entry already exist from the initial scaffold pointing at a placeholder `src/pages/OrdersPage.tsx`; this feature deletes that placeholder, repoints the route at `src/orders/OrdersPage`, and relabels the sidebar entry to "مراقبة الطلبات" (same path, same icon) to match the Orders Oversight area name — so the only `Sidebar.tsx` change is one string. The Phase 1 `src/api/` transport is reused with no edits (GET only; `httpClient` already permits every method). The city filter reuses the memoised `fetchCityDirectory()` from `src/cities/citiesApi.ts` read-only — the same call cook-review and driver-review already depend on — so this feature adds no cities request and no `src/cities/` edit. The order-detail modal reuses `src/shared/DialogShell` unchanged. `react-router-dom`'s `useSearchParams` is the single source of truth for `{ status, city, from, to, page }` (FR-036); the detail dialog is transient state and stays out of the URL. Tests extend the existing `tests/` tree, mirroring the three user stories plus URL-state and auto-refresh.

## Complexity Tracking

*No constitutional violations — table intentionally empty.*
