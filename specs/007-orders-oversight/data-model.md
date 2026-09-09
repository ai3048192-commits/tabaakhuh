# Phase 1 Data Model: Orders Oversight

Feature: `007-orders-oversight` · Date: 2026-09-07

Client-only, **read-only** feature. "Entities" are the in-memory shapes the dashboard holds — no database tables, no persistence, no mutations. Field names mirror the backend payloads in `admin-dashboard-api.md` Phase 7. The only durable state is the URL query string (§7).

---

## 1. OrderStatus

```ts
type OrderStatus =
  | 'pending' | 'accepted' | 'preparing' | 'ready_for_pickup'
  | 'assigned_to_driver' | 'picked_up' | 'on_the_way' | 'delivered'
  | 'completed' | 'cancelled' | 'pending_review' | 'quoted'
```

- `ORDER_STATUSES` (`src/orders/orderStatus.ts`) is this list as a `readonly` tuple, in the spec's order. The status filter offers exactly these 12 plus an `'all'` sentinel (not part of the type — a filter-only value).
- `statusLabel(s)` → Arabic label (from `messages.ts`); `isCancelled(s)` → `s === 'cancelled'`; every status also has an icon so a badge is never colour-only.
- Not editable anywhere in this feature.

---

## 2. Order

One element of `data.items` in `GET /admin/orders`. Held only as part of the current `OrderPage` (§4); never fetched individually.

| Field | Type | Notes |
|---|---|---|
| `id` | `number` | React key; not shown as a column. |
| `order_number` | `string` | Primary identifying column (e.g. `ORD-2026-000901`). `dir="ltr"` cell. |
| `customer_id` | `number` | Shown in the **detail only**, as a labelled reference number. No name is available (FR-020, clarify Q4). |
| `cook_id` | `number` | Not shown directly; `cook_name` / `cook_avatar_url` are. |
| `cook_name` | `string` | Row + detail. |
| `cook_avatar_url` | `string \| null` | Row + detail; a fallback glyph when `null`. |
| `type` | `'regular' \| 'custom'` | Drives `OrderTypeBadge` and whether `custom_details` renders (FR-004/025). |
| `status` | `OrderStatus` | Drives `OrderStatusBadge`; `cancelled` is marked distinctly (FR-004). |
| `delivery_address_id` | `number` | Shown in the **detail only**, as a labelled reference number (FR-020). |
| `requested_delivery_date` | `string` (`YYYY-MM-DD`) | Row + detail; formatted via `formatOrderDate` (Africa/Cairo). |
| `delivery_time_slot` | `string` | e.g. `13:00-15:00`; row + detail, `dir="ltr"`. |
| `subtotal` | `number` | Row + detail; Cairo currency format. |
| `delivery_fee` | `number` | Row + detail. |
| `total` | `number` | Row + detail. |
| `customer_note` | `string \| null` | Detail only; rendered only when a non-empty string (FR-022). |
| `cancel_reason` | `string \| null` | Detail only; rendered only when `status === 'cancelled'` and non-empty (FR-023). |
| `items` | `OrderItem[]` | Detail only; may be `[]` for an unquoted custom order → "no line items yet" (FR-021). |
| `custom_details` | `CustomOrderDetails \| null` | Detail only; non-null only for `type === 'custom'` (FR-024). |
| `quote` | `unknown` (always `null` here) | **Ignored.** Never rendered (FR-026). |
| `status_history` | `unknown[]` (always `[]` here) | **Ignored.** Never rendered (FR-026). |

**Rules**
- Purely read. There is no create/update/delete and no request that targets a single order.
- The client does not re-order, filter, or de-duplicate `items` (the page array) — the backend order (most-recent-placed first, per Assumptions) is used as-is.
- `quote` and `status_history` are typed loosely and never read; the detail layout keeps a commented, non-rendered slot for a future phase (FR-026a).

---

## 3. OrderItem / CustomOrderDetails

```ts
interface OrderItem {
  id: number
  dish_id: number
  item_name: string
  unit_price: number
  quantity: number
  line_total: number
}

interface CustomOrderDetails {
  occasion_type: string | null
  guest_count: number | null
  requested_dishes_text: string | null
  budget_min: number | null
  budget_max: number | null
  requested_delivery_date_time: string | null   // ISO 8601
}
```

- `OrderItem`: every field rendered in the detail's line-items table (`item_name`, `unit_price`, `quantity`, `line_total`); `id` is the row key, `dish_id` is not shown.
- `CustomOrderDetails`: each line rendered **only if present** (FR-024) — a `null`/absent value shows nothing, not a placeholder. Money values use the Cairo currency format; `requested_delivery_date_time` uses `formatOrderDateTime` (Africa/Cairo).

---

## 4. OrderPage (paginated envelope `data`)

```ts
interface OrderPage {
  items: Order[]
  page: number
  per_page: number   // documented 20; read from the response, never hard-coded
  total: number
}
```

- The hook holds exactly one `OrderPage` (`pageData`). Navigating pages replaces it with a fresh `GET`; pages are not cached (research R2).
- `totalPages = Math.max(1, Math.ceil(total / per_page))` — drives the first/prev/next disabled states and the "page N of M" indicator.
- `total` is displayed **labelled as "within the applied range/filters"**, never as a platform-wide count (FR-010).
- `items: []` with `page > 1` → the "no orders on this page" state (FR-007); with `page === 1` → an empty state (unfiltered "no orders" vs filtered "no orders match", per §6).

---

## 5. OrderFilters / OrdersQuery / DateRangeError

```ts
interface OrderFilters {
  status: OrderStatus | 'all'
  cityId: number | null
  from: string | null   // 'YYYY-MM-DD' (Africa/Cairo calendar date); default = daysAgoCairo(30)
  to: string | null     // 'YYYY-MM-DD'; null = open-ended
}

interface OrdersQuery {          // what listOrders() receives
  filters: OrderFilters
  page: number                   // >= 1
}

type DateRangeError = { code: 'from_after_to' } | null
```

**Rules**
- `status: 'all'` and `cityId: null` mean "no constraint" — `buildOrdersQuery` **omits** the param entirely (research R3). Only the 12 real values are ever sent as `status`.
- `from` is **always a concrete date** in a live filter set: absent-in-URL resolves to `daysAgoCairo(30)` (research R4). "Default range" = `to == null && (from == null || from <= daysAgoCairo(30))`.
- `to`, when set, is sent as `placed_to=YYYY-MM-DD`; the backend snaps it to `23:59:59` Cairo time (Assumptions). Open-ended when `null`.
- `validateDateRange(from, to)` returns `{ code: 'from_after_to' }` when both are set and `from > to` (lexicographic compare is valid for `YYYY-MM-DD`). The hook calls it **before** any range request; on error **no request** is sent, an inline message shows on the date fields, and the current results are unchanged (FR-014).
- `page` is always sent (`?page=N`), even for page 1.

### `buildOrdersQuery(filters, page)` → string

Appends, in this order, `URLSearchParams`-encoded, prefixed with `?`:

| Param | Included when | Value |
|---|---|---|
| `status` | `filters.status !== 'all'` | the `OrderStatus` string |
| `city_id` | `filters.cityId != null` | `String(cityId)` |
| `placed_from` | `filters.from != null` | `filters.from` |
| `placed_to` | `filters.to != null` | `filters.to` |
| `page` | always | `String(Math.max(1, page))` |

Example: default view page 1 → `?placed_from=2026-08-08&page=1`. Filtered → `?status=completed&city_id=3&placed_from=2026-09-01&placed_to=2026-09-06&page=2`.

---

## 6. Screen status & empty-state resolution

`useOrdersOversight().status: 'loading' | 'ready' | 'error'`

| Situation | status | UI |
|---|---|---|
| First load in flight, nothing shown yet | `loading` | loading state, distinct from empty (FR-005) |
| A page is in hand | `ready` | table / one of the empty states below |
| Load rejected and nothing currently shown | `error` | screen-level "something went wrong" + Retry (FR-008) |
| Load rejected but a page is already shown (failed refresh / auto-refresh) | stays `ready` | existing page kept + transient toast (FR-008, research R2) |

When `status === 'ready'`:

| Condition | State |
|---|---|
| `pageData.items.length > 0` | the table (FR-001/002) |
| `items.length === 0 && page > 1` | "no orders on this page" + "back to first page" (FR-007) |
| `items.length === 0 && page === 1 && isDefaultOrWiderRange && status filter is 'all' && cityId is null` | "no orders" (unfiltered empty) (FR-006) |
| `items.length === 0 && page === 1` otherwise (a status/city filter or a narrower range) | "no orders match these filters" + Reset (FR-018) |

---

## 7. URL-synced state (`useSearchParams`) — the only durable state

| Query key | Maps to | Omitted from the URL when |
|---|---|---|
| `status` | `filters.status` (validated against `ORDER_STATUSES`) | `'all'` |
| `city` | `filters.cityId` (positive integer) | `null` |
| `from` | `filters.from` (`YYYY-MM-DD`) | equal to `daysAgoCairo(30)` |
| `to` | `filters.to` (`YYYY-MM-DD`) | `null` |
| `page` | `page` (`>= 1`) | `1` |

- `filtersFromSearchParams(sp)` → `{ filters, page }`. An **empty** query string yields `{ status:'all', cityId:null, from: daysAgoCairo(30), to:null }`, `page: 1` — the default view (FR-010 / FR-036). Unknown params ignored; malformed values fall back to their default.
- `filtersToSearchParams(filters, page)` → `URLSearchParams` with defaults omitted, so a shared "clean" URL stays clean and a shared filtered URL round-trips exactly (SC-017).
- Filter changes: `setSearchParams(next, { replace: true })`. Page navigation: `{ replace: false }` (back/forward walk pages).
- The **order-detail dialog** (`detail`, §8) is **never** written to the URL (FR-036).

---

## 8. In-memory-only UI state (`useOrdersOversight`)

| State | Type | Purpose | Dropped when |
|---|---|---|---|
| `pageData` | `OrderPage \| null` | the one page currently shown | leaving `/orders` |
| `status` | `'loading' \| 'ready' \| 'error'` | screen status (§6) | leaving `/orders` |
| `detail` | `{ order: Order } \| null` | the open detail modal + its order snapshot (FR-019/027) | closing the dialog / leaving `/orders` |
| `draftFrom` / `draftTo` | `string \| null` | the from/to inputs **before** Apply (FR-013a) | Apply (commits to URL) / Reset / leaving |
| `dateFieldError` | `DateRangeError` | the inline `from > to` message (FR-014) | a valid Apply / editing a date field |
| `autoRefreshOn` | `boolean` (default `true`) | the auto-refresh toggle (FR-009b) | leaving `/orders` |
| `toast` | `{ text: string } \| null` | transient failure bubble (FR-031) | ~6 s timeout / next toast |

- `status`, `city` apply **immediately**: selecting a value writes the URL (which re-runs the load) and resets `page` to 1 (FR-016).
- `from`/`to` are staged in `draftFrom`/`draftTo`; **Apply** runs `validateDateRange` → on `null` writes `from`/`to` to the URL with `page = 1`; on error sets `dateFieldError` and sends nothing. **Reset** clears `status`/`city` and sets `from = daysAgoCairo(30)`, `to = null`, `page = 1`.
- `detail` holds its own `Order` reference, so a background auto-refresh that replaces `pageData` cannot disturb the open dialog (FR-009b).

---

## 9. Data flow (one screen open)

```
mount /orders?<query>
  └─ useOrdersOversight:
        { filters, page } = filtersFromSearchParams(searchParams)   // empty → default 30-day, page 1
        status = 'loading'
        GET /admin/orders?buildOrdersQuery(filters, page)
          → pageData = data (OrderPage); status = 'ready'
          → items empty? → §6 resolves "no orders" | "no orders match" | "no orders on this page"

change status / city (immediate)
  → setSearchParams({ ...omit-defaults, status|city, page:1 }, { replace:true })
  → effect re-runs load for the new query                         (FR-011/012/016)

edit from / to  → draftFrom/draftTo only (no request)             (FR-013a)
  Apply → validateDateRange(draftFrom, draftTo)
            null      → setSearchParams({ ...from,to, page:1 })   → load  (FR-013)
            from>to   → dateFieldError set; NO request; results unchanged (FR-014)
  Reset → setSearchParams({ page:1, from:daysAgoCairo(30) })      → load  (FR-018)

paginate (first / prev / next)
  → setSearchParams({ ...same filters, page:n }, { replace:false })
  → load; page-beyond-range → items:[] → "no orders on this page" (FR-003/007)

open detail (row "view details")
  → detail = { order }   // the Order already in pageData.items — NO request  (FR-019, SC-013a)
close detail (X / Esc / overlay)
  → detail = null; DialogShell restores focus to the row button; list + URL untouched (FR-027)

auto-refresh tick (only if page===1 && isDefaultOrWiderRange && autoRefreshOn)
  → GET same query, silent: replace pageData on success; keep page + toast on failure
  → status/filters/URL/detail/scroll all untouched                (FR-009a/009b, SC-013b)

server 422 (bad status / bad city / bad date / from>to)
  → field-level errors.<key> → inline message in the filter bar; list NOT updated (FR-015/031)
  → otherwise → transient toast; list NOT updated

any call → 401 → Phase 1 unauthorizedHandler → clearSession → /login  (FR-029)
unmount /orders → pageData, detail, drafts, toast all dropped; URL is the only carry-over
```
