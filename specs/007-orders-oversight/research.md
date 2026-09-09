# Phase 0 Research: Orders Oversight

Feature: `007-orders-oversight` · Date: 2026-09-07

All Technical Context unknowns are resolved below. No open `NEEDS CLARIFICATION` remain — `/speckit-specify` and two `/speckit-clarify` passes closed every ambiguity (default "last 30 days" window shown pre-set; detail = a modal built from the list payload with a reserved slot for a future timeline/quote; conditional auto-refresh on page 1 with the default-or-wider range; status/city filters immediate, date range behind Apply with a local `from ≤ to` check; all dates in fixed Africa/Cairo; `customer_id` / `delivery_address_id` shown as reference numbers only; filters + page synced to the URL). This document records the design decisions that follow.

---

## R1. Authenticated request seam (FR-029, the one endpoint)

**Decision**: Reuse the Phase 1 seam in `src/api/httpClient.ts` **unchanged**. `ordersApi.listOrders()` calls `authedRequest<OrderPage>('/admin/orders?…', { signal })`, never `apiRequest` directly. `AuthProvider` already wires `setTokenProvider(readToken)` and `setUnauthorizedHandler(...)` on mount; a token-bearing `401` from `apiRequest` calls the handler, which `AuthContext` maps to `clearSession()` + `SESSION_LOST` → `<RequireAdmin>` redirects to `/login`.

**Rationale**: Feature code never sees or stores the bearer token; `401` handling is centralised. This is a **read-only** feature with exactly one endpoint, so there is no mutation/outcome layer at all — a marked simplification versus Phases 2–6.

**Alternatives considered**:
- *Expose `token` from `useAuth()`* — rejected: threads the token through every call site.
- *An orders-specific transport* — rejected: the existing wrapper already does base-URL prefixing, envelope parsing, `ApiError` normalisation, and `401` routing.

---

## R2. Server-paginated list — one page held, replaced on navigation (FR-001..FR-008, FR-016, FR-017)

**Decision**: `useOrdersOversight()` derives `{ filters, page }` from `useSearchParams` (R4) and owns the current page payload:

- `listOrders(query, signal)` builds the path `/admin/orders?<buildOrdersQuery(filters, page)>` (R3) and returns `data` verbatim as `pageData: OrderPage` — `{ items: Order[], page, per_page, total }`. `per_page` is read from the response, never hard-coded (documented as 20; the client does not depend on the literal).
- Exactly **one page** is held. Navigating pages issues a fresh `GET`; visited pages are **not** cached (a cached page would show stale rows and contradict FR-017 / the auto-refresh contract).
- `totalPages = Math.max(1, Math.ceil(pageData.total / pageData.per_page))`. First/prev/next are disabled at the ends.
- Screen `status`: `loading` on the first load and on any load with no page currently shown; `ready` once a page is in hand; `error` only when a load fails **and** nothing is currently shown. A failed refresh / auto-refresh with a page already shown keeps that page and shows a transient toast (mirrors `useDriverApplications` / `useCitiesManagement`).
- **Page beyond range** (FR-007): the backend returns `items: []` with the requested `page`. The screen shows an explicit "no orders on this page" state with a "back to first page" control; it does **not** auto-jump (there is no post-action re-fetch in a read-only feature that could strand the administrator, unlike Phase 4).
- **Unfiltered empty** vs **no-match**: `status === 'ready' && pageData.total === 0` with no status/city filter and the default range → "no orders" (FR-006); the same with any status/city filter or a non-default range → "no orders match these filters" + Reset (FR-018). "Default range" here means: the `from` equals `daysAgoCairo(30)` (or is absent/earlier) and there is no `to`.

**Rationale**: The endpoint is genuinely server-paginated (`?page=N`, fixed `per_page`, `total` in the body) — contrast Phase 5's whole-array-in-memory. Holding one page and replacing it keeps every render ≤20 rows and every list state a direct function of the current query.

**Alternatives considered**:
- *Infinite scroll / append pages* — rejected: complicates `total` display, the page indicator, and the auto-refresh "page 1 only" rule.
- *Cache visited pages* — rejected: stale rows; each page is one cheap `GET`.
- *Client-side date/status filtering of a big fetch* — rejected: the endpoint is paginated, so the client never holds the whole set; the query params are the intended mechanism.

---

## R3. Query building — `buildOrdersQuery` (FR-010, FR-011, FR-012, FR-013, FR-016)

**Decision**: `buildOrdersQuery(filters: OrderFilters, page: number): string` (pure, `src/orders/ordersQuery.ts`) returns a string beginning with `?`:

| Param | Emitted when | Value |
|---|---|---|
| `status` | `filters.status !== 'all'` | the raw `OrderStatus` string |
| `city_id` | `filters.cityId != null` | the numeric id |
| `placed_from` | `filters.from` is set | `YYYY-MM-DD` (Cairo calendar date) |
| `placed_to` | `filters.to` is set | `YYYY-MM-DD` (Cairo calendar date) |
| `page` | **always** | `page` (≥ 1) |

- Params are appended in the fixed order above and `URLSearchParams`-encoded, so `fetchMock` keys are deterministic (`GET /admin/orders?placed_from=2026-08-08&page=1`).
- The default-window `from` is a **real value** that is sent (`placed_from=<30 days ago>`); "default" only affects whether it appears in the *browser* URL (R4), not whether it goes to the API.
- `validateDateRange(from: string | null, to: string | null): DateRangeError | null` — pure, same module: returns `{ code: 'from_after_to' }` when both are set and `from > to` (string compare is valid for `YYYY-MM-DD`), else `null`. The hook calls this **before** issuing a range request (FR-014); no request goes out on a failure.

**Rationale**: One pure function makes the exact wire query test-assertable for every filter combination, and keeps "which params are omitted" (a spec detail: status omitted for "all", `to` omitted when open-ended) in one place.

**Alternatives considered**:
- *Build the query inline in `ordersApi`* — rejected: not independently testable; the omit rules would be scattered.
- *Always send `status=all` / `placed_to`* — rejected: the API treats an absent param as "no constraint"; sending sentinels risks a `422` on an unrecognised status.

---

## R4. URL as the source of truth for filters + page (FR-036, SC-017)

**Decision**: `useOrdersOversight` uses `react-router-dom`'s `useSearchParams`. Two pure helpers in `src/orders/urlState.ts`:

- `filtersFromSearchParams(sp: URLSearchParams): { filters: OrderFilters; page: number }`:
  - `status` ← `sp.get('status')` if it is one of the 12 `OrderStatus` values, else `'all'`.
  - `city` ← `Number(sp.get('city'))` if a positive integer, else `null`.
  - `from` ← `sp.get('from')` if it matches `YYYY-MM-DD`, **else the default** `daysAgoCairo(30)`.
  - `to` ← `sp.get('to')` if it matches `YYYY-MM-DD`, else `null`.
  - `page` ← `Math.max(1, Number(sp.get('page')) || 1)`.
  - Unknown params are ignored.
- `filtersToSearchParams(filters, page): URLSearchParams` — the inverse, **omitting defaults** so a clean entry stays clean: no `status` when `'all'`, no `city` when `null`, no `from` when it equals `daysAgoCairo(30)`, no `to` when `null`, no `page` when `1`.
- The hook writes the URL with `setSearchParams(next, { replace: true })` for filter changes (so the back button leaves the screen, not each keystroke) and `{ replace: false }` for page navigation (so back/forward walk pages) — small nuance, documented in `orders-ui.md`.
- The **order-detail dialog** is transient: `detail: { order: Order } | null` in hook state, never written to the URL (FR-036). A reload with the dialog open reopens to the list only.

**Rationale**: FR-036 requires shareable, reload-surviving list state; `useSearchParams` is the idiomatic react-router mechanism and needs no new dependency. Phase 4's research explicitly deferred this ("trivial to add later") — Phase 7 is where it is required, so it is done here.

**Alternatives considered**:
- *In-memory state only* — rejected by FR-036.
- *`localStorage` for last filters* — rejected by clarify Q5 (Option A, URL) — not shareable, invisible.
- *Encode the open order in the URL (`?order=901`)* — rejected by FR-036 (the dialog state is explicitly excluded); it would also imply a per-order fetch path that does not exist here.

---

## R5. Fixed Africa/Cairo date handling (FR-013b, SC-005) — no date library

**Decision**: `src/orders/cairoDates.ts`, pure, built on `Intl.DateTimeFormat` with `timeZone: 'Africa/Cairo'`:

- `cairoToday(): string` — `new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Cairo' }).format(new Date())` → `YYYY-MM-DD` (the `en-CA` locale renders ISO-ordered date parts).
- `daysAgoCairo(n): string` — take `cairoToday()`, parse the three integers, `Date.UTC(y, m-1, d) - n*86_400_000`, then format that instant back with `en-CA` **in UTC** → `YYYY-MM-DD`. Pure calendar-date arithmetic anchored on a UTC midnight; DST is irrelevant because only the date label matters and the anchor/format zone match.
- `isDefaultOrWiderRange(from, to): boolean` — `to == null && (from == null || from <= daysAgoCairo(30))`. Drives the auto-refresh gate (R7) and the "no-match vs empty" split (R2).
- `formatOrderDateTime(iso): string` and `formatOrderDate(ymd): string` — `Intl.DateTimeFormat` with `timeZone: 'Africa/Cairo'` and the dashboard's locale/digit convention (Western digits, `ar`-style month/day as the existing screens use), so an order timestamp reads the same for every administrator regardless of device zone.

The client sends `placed_from` / `placed_to` as **plain `YYYY-MM-DD` strings**; the backend snaps `placed_to` to `23:59:59` and (per the spec's Assumptions) evaluates the range in Egypt local time. The client therefore never computes wall-clock offsets — only Cairo calendar dates for the default window and for display.

**Rationale**: The platform, its cooks, and its customers are in Egypt; a fixed zone makes the administrator's "today" and the operational data agree, and makes SC-005's "23:30 on the to-date is included / next day is excluded" deterministic across machines. `Intl` ships in every target browser and in jsdom; a date library would be a dependency for one zone and some `YYYY-MM-DD` maths.

**Alternatives considered**:
- *Device-local time* (clarify Q3 Option C) — rejected: two administrators in different zones would see different results for the same filter.
- *UTC everywhere* (Option B) — rejected: "last 30 days" and day boundaries would jump a few hours off the Egyptian business day the administrator is reasoning about.
- *Add `date-fns-tz` / `luxon`* — rejected: `Intl` + integer date maths is enough and dependency-free.

---

## R6. Order detail — a modal built from the list payload, with a reserved slot (FR-019..FR-027, FR-026a, clarify Q1/Q2/Q4)

**Decision**: `OrderDetailDialog` on `src/shared/DialogShell` (portal, backdrop, `role="dialog"` + `aria-modal`, `dir="rtl"`, `Esc`, focus trap, focus restore — unchanged). It receives the `Order` object **already in `pageData.items`** and renders:

1. **Header block** — order number, cook (avatar + name), `OrderTypeBadge`, `OrderStatusBadge`, requested delivery date + time slot.
2. **Reference identifiers** — `customer_id` and `delivery_address_id` as labelled numbers (e.g. "رقم العميل: 55", "رقم العنوان: 88"); no name, no textual address, **no** lookup request (clarify Q4).
3. **Money breakdown** — subtotal, delivery fee, total (Cairo-formatted currency).
4. **Line items** — a `<table>` of `item_name` / `unit_price` / `quantity` / `line_total`; when `items` is empty (an unquoted custom order) an explicit "لا توجد بنود بعد" (FR-021).
5. **Customer note** — shown only when `customer_note` is a non-empty string (FR-022).
6. **Cancellation reason** — shown only when `status` is `cancelled` **and** `cancel_reason` is a non-empty string (FR-023).
7. **Custom details** — only when `type === 'custom'` and `custom_details != null`: occasion type, guest count, requested-dishes text, budget min/max, requested delivery date/time — each line rendered **only if present** (FR-024). No block at all for a regular order (FR-025).
8. **Reserved slot** — a single commented placeholder region (`{/* FR-026a: status timeline + price quote — populated in a later phase from the shared order-details endpoint */}`) that renders **nothing** in this phase. `quote` and `status_history` from the payload are ignored entirely (FR-026).

`openDetail(order)` sets `detail = { order }`; `closeDetail()` sets `null`. `DialogShell` restores focus to the row's "view details" button (FR-027). The list, its scroll position, and the URL query are untouched throughout.

**Rationale**: Clarify Q1 chose a centred modal; Q2 chose "in scope, built from the list payload, no extra request, reserve a slot for a future timeline/quote"; Q4 chose "reference ids in the detail only". Reusing `DialogShell` avoids a second focus-trap and inherits the axe-clean behaviour from Phases 2–5. Rendering from the already-loaded object is what makes SC-013a ("no network request on open") true by construction.

**Alternatives considered**:
- *A side drawer / a dedicated `/orders/:id` route* — rejected by clarify Q1.
- *Fetch full detail from the shared order-details endpoint* — rejected: out of scope for Phase 7 (clarify Q2); the endpoint is not in `admin-dashboard-api.md` Phase 7.
- *Render an empty "timeline" / "quote" section now* — rejected by FR-026 (must not look like data failed to load); the slot is a comment, not empty UI.

---

## R7. Conditional auto-refresh (FR-009, FR-009a, FR-009b, SC-013b)

**Decision**: The hook holds `autoRefreshOn: boolean` (default `true`, toggled by a labelled control in the page header). An effect:

```
useEffect(() => {
  const eligible = page === 1
    && isDefaultOrWiderRange(filters.from, filters.to)
    && autoRefreshOn
  if (!eligible) return
  const id = setInterval(() => { void load({ silent: true }) }, AUTO_REFRESH_MS) // 30_000
  return () => clearInterval(id)
}, [page, filters.from, filters.to, autoRefreshOn, load])
```

- `load({ silent: true })` re-issues the **current** query and replaces `pageData` on success; on failure it keeps the shown page and shows a transient toast (no `error` state flip).
- A silent reload **never** changes `status` to `loading` (no spinner flash), never touches the URL, never changes `filters`/`page`, and never touches `detail` — so an open dialog stays open and unchanged (it holds its own `order` reference; FR-009b). The list behind it updates; on close the administrator sees the latest list.
- Any of {leaving page 1, narrowing the date range below the default, toggling off} tears the interval down via the dependency array.

**Rationale**: The spec calls this a "monitoring screen" but only wants live behaviour where it is cheap and unambiguous — the newest orders, which sit on page 1 of the default recent window. Gating on `isDefaultOrWiderRange` + `page === 1` keeps request volume bounded and avoids re-ordering rows under the administrator while they read a filtered historical page.

**Alternatives considered**:
- *Always poll* — rejected by FR-009a (off on later pages / custom ranges).
- *WebSocket / SSE live feed* — rejected: not in the API; far past the spec.
- *Pause polling while the dialog is open* — considered; rejected as unnecessary since the dialog holds its own snapshot and FR-009b only forbids *closing* it. Simpler to let the silent reload proceed.

---

## R8. City filter options from the existing directory (FR-012)

**Decision**: `OrdersFilters` gets its city list from `fetchCityDirectory()` in `src/cities/citiesApi.ts` — the session-memoised `Map<id, { name_ar, name_en }>` that **already includes inactive cities** and that cook-review and driver-review already consume to resolve `city_id → name`. The filter `<select>` renders `<option value={id}>{name_ar}</option>` for every entry, plus a "كل المدن" default. The selected id is sent as `city_id` (R3). No new cities request, no `src/cities/` edit.

**Rationale**: The directory is exactly the data the filter needs (every city, active or not), it is already fetched once per session, and reusing it keeps a single source of truth for city names across the dashboard. A deactivated city being a valid filter value (FR-012) falls out for free — the directory never filtered them.

**Alternatives considered**:
- *A fresh `GET /admin/cities` for the filter* — rejected: duplicates a call the app already makes and memoises.
- *Hard-code / omit the city names, show ids* — rejected: unusable filter UI.
- *Only list active cities* — rejected by FR-012.

---

## R9. Status & type presentation (FR-004, FR-011, FR-035)

**Decision**: `src/orders/orderStatus.ts`, pure:

- `ORDER_STATUSES: readonly OrderStatus[]` — the 12 values in the spec's order (`pending` … `quoted`). The status `<select>` renders these plus an "all" sentinel.
- `statusLabel(s): string` — Arabic label per status (from `messages.ts`).
- `isCancelled(s): boolean` — `s === 'cancelled'`.
- `statusIcon(s)` / `typeIcon(t)` — a lucide icon per status/type so badges carry **icon + text**, never colour alone (FR-004 / FR-035).
- `typeLabel(t: 'regular' | 'custom'): string`.

`OrderStatusBadge` and `OrderTypeBadge` are thin presentational components: a coloured chip **with** an icon and the label; cancelled orders additionally get a distinct icon/border so they read as cancelled in greyscale.

**Rationale**: Keeping the enum, the labels, and the "is this cancelled" test in one pure module makes `orderStatus.test.ts` a complete guard that all 12 statuses have a label and an icon, and keeps the badge components trivial.

**Alternatives considered**:
- *Inline the label map in the badge component* — rejected: not unit-testable in isolation; risk of a missing status.
- *Colour-only status chips* (as the placeholder `OrdersPage` mock did) — rejected by FR-004 / FR-035.

---

## R10. Routing, sidebar, and the guard (FR-030, FR-033)

**Decision**: In `src/App.tsx` `AdminLayout`, change the `/orders` route's element from the placeholder `./pages/OrdersPage` to `./orders/OrdersPage` and drop the old import; delete `src/pages/OrdersPage.tsx`. In `src/components/Sidebar.tsx` change the one menu entry's `name` from `'إدارة الطلبات'` to `'مراقبة الطلبات'` (Orders Oversight), keeping `icon: ShoppingBag` and `path: '/orders'`. No new guard — `<RequireAdmin>` already gates the whole admin shell on `/*`, so a signed-in non-admin never reaches `/orders` (FR-030).

**Rationale**: The route, layout, guard, header, and sidebar all exist from Phase 1; like Phase 6 this feature repoints an existing placeholder route rather than adding one. The label change aligns the nav with the spec's area name and is the entirety of the `Sidebar.tsx` diff.

**Alternatives considered**:
- *Keep the "إدارة الطلبات" label* — acceptable, but "مراقبة" (oversight/monitoring) better signals the read-only nature and matches the spec.
- *A nested `/orders/:id` route for the detail* — rejected by clarify Q1 (modal, no per-order route) and FR-036.

---

## R11. Toasts and live regions (FR-031, FR-034, FR-035)

**Decision**: Replicate the Phase 3 `DriverApplicationsPage` toast pattern inline in `OrdersPage`: a visually-hidden `role="status"` `aria-live="polite"` region always in the DOM plus a transient styled bubble cleared after ~6 s, used for: a failed refresh / auto-refresh ("تعذّر التحديث. حاول مرة أخرى."), and a server `422` whose message should be surfaced globally rather than against a field. **Field-level** `422` messages (from the envelope `errors` map keyed `status` / `city_id` / `placed_from` / `placed_to`) are shown **in the filter bar** next to the offending control (FR-031). A **second** polite live region announces the result summary — "عرض ٢٠ من ٤٢ طلب" / the "no orders match these filters" state — whenever the query result changes (FR-035).

**Rationale**: Matches Phases 2–6 so announcements behave identically. The local `from > to` block (R3) is rendered as an inline error on the date fields with `aria-describedby` / `aria-invalid`, not a toast, so it sits where the administrator fixes it.

**Alternatives considered**:
- *Extract a shared `useToast`* — deferred again (would require editing Phases 2–6); the ~15-line pattern is duplicated once more, consolidation left as a cross-feature cleanup.
- *A toast library* — rejected: one dependency for one bubble.

---

## R12. Testing & accessibility tooling (SC-014, all ACs)

**Decision**: Reuse the Phase 1–5 harness unchanged — `tests/helpers/fetchMock.ts` (`installFetchMock().reply("GET /admin/orders?placed_from=…&page=1", …)` with **ordered replies** for the auto-refresh tick and post-navigation loads), `tests/helpers/harness.tsx`, `tests/setup.ts`. Extend `tests/helpers/fixtures.ts` with `order(overrides)`, `customOrder(overrides)` (populates `custom_details`, empty `items`), `orderItem(overrides)`, and `ordersPage(items, { page = 1, per_page = 20, total = items.length })` producing the Phase 7 envelope (with `quote: null`, `status_history: []` on every item). Add `renderAtOrders(fm, { seedMe?, admin?, path? })` to `harness.tsx` mirroring `renderAtCities` but with `initialEntries=[path ?? '/orders']` so URL-state tests pass a full query string. New specs per the Project Structure tree. `vitest-axe` runs on each visual state and on `OrderDetailDialog` for a regular, a custom, and a cancelled order. Keyboard-only flows (`user-event`) cover changing the status filter, paging next, and opening + closing the detail. The auto-refresh spec uses `vi.useFakeTimers()` to advance past `AUTO_REFRESH_MS`.

> `fetchMock` keys include the **query string**, so every test asserts the exact query `buildOrdersQuery` produced — param order (`status`, `city_id`, `placed_from`, `placed_to`, `page`), omitted params (`status` gone for "all", `city_id` gone for none, `placed_to` gone when open-ended), and `page` always present. `jsdom` cannot evaluate colour contrast, true focus visibility, or real RTL glyph layout — those parts of SC-014 / SC-015 stay in the manual checklist in `quickstart.md`. `Intl` with `timeZone: 'Africa/Cairo'` works in jsdom, so `cairoDates.test.ts` can pin the fixed-zone behaviour by running under a different `process.env.TZ`.

**Rationale**: The tooling and fetch-mock already exist and mirror the same envelope. Automated axe gives measurable AA coverage; residual manual checks (contrast, focus visibility, RTL rendering) are the same short list Phases 1–6 used, scripted in `quickstart.md`.

**Alternatives considered**:
- *MSW* — rejected: the per-test `fetchMock` already handles ordered replies and records the query string.
- *Playwright e2e* — deferred: integration tests with mocked `fetch` cover every acceptance scenario.

---

## Resolved Technical Context summary

| Field | Value |
|---|---|
| Auth to API | Reuse `authedRequest` + `setTokenProvider` (wired in `AuthProvider`); `401` → existing `unauthorizedHandler` → `/login`. Read-only: no mutation layer |
| List load | `useOrdersOversight()` — one `GET /admin/orders?<query>` per `{filters,page}`; one page held in `pageData`; no page cache |
| Query build | pure `buildOrdersQuery(filters,page)` — `status` omitted for `'all'`, `city_id` omitted for `null`, `placed_to` omitted when open-ended, `placed_from` always the real 30-day-default value, `page` always present |
| URL state | `useSearchParams` is the source of truth for `{status,city,from,to,page}`; `filtersFromSearchParams` applies the default 30-day `from` when absent; `filtersToSearchParams` omits defaults; detail dialog **not** in the URL |
| Default window | `placed_from = daysAgoCairo(30)`, no `placed_to`; shown pre-set in the filter bar; total labelled "within the applied range" |
| Dates / TZ | fixed **Africa/Cairo** for display, the default window, and `from`/`to` day boundaries — `Intl.DateTimeFormat({ timeZone: 'Africa/Cairo' })` + integer calendar-date maths; no date library; client sends plain `YYYY-MM-DD` |
| Filters | status + city apply **on selection** (→ page 1); date range applied via **Apply** with a local `from ≤ to` pre-check (no request on failure, message on the fields, results kept); **Reset** clears status+city, restores default range |
| Server 422 | invalid status / non-existent city / bad date → specific message (field-level where the `errors` map keys it), list not updated; `from`>`to` from the server surfaced like the local block |
| Pagination | first / prev / next; `totalPages = ceil(total/per_page)`; page beyond range → "no orders on this page" + back-to-first; no auto-jump |
| Detail | modal on `src/shared/DialogShell`, built from the in-memory `Order`; **no** per-order request; header + `customer_id`/`delivery_address_id` as labelled refs + money + line items ("no line items yet" when empty) + note (if any) + cancel reason (if cancelled) + custom-details (if custom); **no** timeline / quote, reserved comment slot for a later phase; close → focus restored, list + URL untouched |
| Auto-refresh | `setInterval(30s)` gated on `page===1 && isDefaultOrWiderRange && autoRefreshOn`; silent reload (no spinner, no URL/filter/detail change); toggleable off |
| City options | read-only reuse of memoised `fetchCityDirectory()` (includes inactive cities); no new request, no `src/cities/` edit |
| Status/type UI | pure `orderStatus.ts` — 12 `ORDER_STATUSES`, `statusLabel`, `isCancelled`, icons; badges are icon + text, never colour-only |
| Read-only | no control mutates an order anywhere (FR-028) |
| Routing | `App.tsx` repoints `/orders` → `./orders/OrdersPage`; delete `src/pages/OrdersPage.tsx`; `RequireAdmin` already gates it; Sidebar entry relabelled "مراقبة الطلبات" (same path/icon) |
| RTL / a11y | `dir="rtl"`; `<th scope="col">` per column; badges = icon + label; dialog traps/restores focus; two polite live regions (toasts, result summary); date/number cells `dir="ltr"` |
| Testing | Phase 1–5 Vitest + Testing Library + `vitest-axe` + `fetchMock` (keys include query string); extend `fixtures.ts` + `harness.tsx` (`renderAtOrders` with `path`); 4 unit + 6 integration + 1 a11y spec; fake timers for auto-refresh |
| Config | no new env; `VITE_API_BASE_URL` reused |
