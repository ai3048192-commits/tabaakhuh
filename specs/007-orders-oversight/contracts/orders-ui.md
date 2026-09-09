# Contract — Internal UI: Orders Oversight

Feature: `007-orders-oversight`

Internal module boundaries for the new `src/orders/` folder. Types are described, not restated verbatim — see [data-model.md](../data-model.md). Everything here is **read-only**; there is no mutation surface.

---

## `src/orders/ordersApi.ts` (new)

```ts
function listOrders(query: OrdersQuery, signal?: AbortSignal): Promise<OrderPage>
// GET /admin/orders?<buildOrdersQuery(query.filters, query.page)>
// Resolves with `data` (OrderPage). Propagates ApiError (422 / 0 / 5xx). Calls authedRequest, never apiRequest.
```

- The only export. No `POST`/`PUT`/`PATCH`.
- Does not read or build the query itself beyond calling `buildOrdersQuery` — the omit rules live in the pure helper so they are unit-tested.

---

## `src/orders/ordersQuery.ts` (new — pure)

```ts
function buildOrdersQuery(filters: OrderFilters, page: number): string
// Returns "?..." — params appended in the fixed order:
//   status     — only when filters.status !== 'all'
//   city_id    — only when filters.cityId != null
//   placed_from — only when filters.from != null
//   placed_to  — only when filters.to != null
//   page       — always (>= 1)
// URLSearchParams-encoded.

function validateDateRange(from: string | null, to: string | null): DateRangeError
// { code: 'from_after_to' } when both set and from > to (lexicographic on YYYY-MM-DD); else null.
```

Unit tests: default range → `?placed_from=<x>&page=1`; explicit `to`; `status` absent for `'all'`; `city_id` absent for `null`; `page` always present and last; encoding of a status containing `_`. `validateDateRange`: `from > to` → error; `from === to` → null; one side `null` → null; both `null` → null.

---

## `src/orders/urlState.ts` (new — pure)

```ts
function filtersFromSearchParams(sp: URLSearchParams): { filters: OrderFilters; page: number }
// status ← sp.get('status') if in ORDER_STATUSES, else 'all'
// cityId ← positive int from sp.get('city'), else null
// from   ← sp.get('from') if /^\d{4}-\d{2}-\d{2}$/, else daysAgoCairo(30)   ← default applied here
// to     ← sp.get('to') if YYYY-MM-DD, else null
// page   ← max(1, Number(sp.get('page')) || 1)
// unknown params ignored

function filtersToSearchParams(filters: OrderFilters, page: number): URLSearchParams
// inverse; OMITS: status when 'all', city when null, from when === daysAgoCairo(30), to when null, page when 1
```

Unit tests: empty `sp` → default 30-day `from` + `page 1` + `status 'all'` + `cityId null`; full round-trip of every field; unknown params ignored; `page=0`/`page=-3` → `1`; `filtersToSearchParams` emits a minimal set for the default view and a complete set for a filtered view (round-trips through `filtersFromSearchParams`).

---

## `src/orders/cairoDates.ts` (new — pure)

```ts
function cairoToday(): string                                   // 'YYYY-MM-DD' in Africa/Cairo
function daysAgoCairo(n: number): string                        // n calendar days before cairoToday()
function isDefaultOrWiderRange(from: string | null, to: string | null): boolean
//   to == null && (from == null || from <= daysAgoCairo(30))
function formatOrderDate(ymd: string): string                   // Intl, timeZone: 'Africa/Cairo'
function formatOrderDateTime(iso: string): string               // Intl, timeZone: 'Africa/Cairo'
```

- Built on `Intl.DateTimeFormat` (`'en-CA'` for machine dates, the dashboard locale for display) with `timeZone: 'Africa/Cairo'`. No date library.
- `daysAgoCairo`: parse `cairoToday()` ints → `Date.UTC(y, m-1, d) - n*86_400_000` → format back in UTC → `YYYY-MM-DD`.

Unit tests (run with `process.env.TZ` set to a non-Cairo zone to prove the fix): `cairoToday()` matches `Intl` Cairo; `daysAgoCairo(30)` is 30 calendar days earlier; `isDefaultOrWiderRange` truth table; `formatOrderDateTime` of a known ISO instant renders the Cairo wall-clock regardless of `TZ`.

---

## `src/orders/orderStatus.ts` (new — pure)

```ts
const ORDER_STATUSES: readonly OrderStatus[]   // the 12, in spec order
function statusLabel(s: OrderStatus): string   // Arabic (delegates to messages.ts)
function isCancelled(s: OrderStatus): boolean
function statusIcon(s: OrderStatus): LucideIcon
function typeLabel(t: 'regular' | 'custom'): string
function typeIcon(t: 'regular' | 'custom'): LucideIcon
```

Unit tests: `ORDER_STATUSES` has exactly the 12 expected values; `statusLabel` returns a non-empty string for each; `isCancelled` only true for `'cancelled'`; `typeLabel` for both types.

---

## `src/orders/useOrdersOversight.ts` (new — hook)

```ts
interface UseOrdersOversight {
  status: 'loading' | 'ready' | 'error'
  page: OrderPage | null
  filters: OrderFilters
  pageNumber: number
  totalPages: number
  emptyKind: 'none' | 'unfiltered' | 'filtered' | 'beyond-range'   // data-model §6
  draftFrom: string | null
  draftTo: string | null
  dateFieldError: DateRangeError
  autoRefreshOn: boolean
  detail: { order: Order } | null
  toast: { text: string } | null

  refresh: () => void                       // manual; always issues one GET of the current query
  setStatusFilter: (s: OrderStatus | 'all') => void   // immediate → URL, page → 1
  setCityFilter: (id: number | null) => void          // immediate → URL, page → 1
  setDraftFrom: (v: string | null) => void
  setDraftTo: (v: string | null) => void
  applyRange: () => void                    // validateDateRange → URL (page 1) or dateFieldError
  resetFilters: () => void                  // status 'all', city null, from daysAgoCairo(30), to null, page 1
  goToPage: (n: number) => void
  firstPage: () => void
  prevPage: () => void
  nextPage: () => void
  setAutoRefresh: (on: boolean) => void
  openDetail: (order: Order) => void        // no request — uses the in-memory Order
  closeDetail: () => void
}
```

Behaviour:

- On mount and whenever `searchParams` changes: `{ filters, page } = filtersFromSearchParams(searchParams)` → `listOrders({ filters, page })` → `pageData`. `status` = `loading` only when no page is currently shown.
- `setStatusFilter` / `setCityFilter`: `setSearchParams(filtersToSearchParams(nextFilters, 1), { replace: true })`.
- `applyRange`: `validateDateRange(draftFrom, draftTo)` → `null` ⇒ `setSearchParams(..., 1, { replace: true })` and clear `dateFieldError`; error ⇒ set `dateFieldError`, **no** navigation, **no** request.
- `goToPage`/`first`/`prev`/`next`: `setSearchParams(filtersToSearchParams(filters, n), { replace: false })`, `n` clamped to `[1, totalPages]` (except a deliberately-too-high `n` from a shared URL is allowed through so the "beyond-range" state can show).
- Auto-refresh effect: interval `AUTO_REFRESH_MS` (30_000) only while `pageNumber === 1 && isDefaultOrWiderRange(filters.from, filters.to) && autoRefreshOn`; each tick calls an internal `load({ silent: true })` that never flips `status` to `loading`, never touches `searchParams`, `filters`, `detail`, or scroll; on failure keeps the page and sets `toast`.
- `openDetail(order)` sets `detail = { order }` (a snapshot); `closeDetail()` sets `null`. `DialogShell` restores focus.
- A `422` from `listOrders`: if `err.fieldErrors` has `status` / `city_id` / `placed_from` / `placed_to`, expose it via a `fieldError` map the page renders in the filter bar; otherwise set `toast`. Either way `pageData` is **not** replaced (FR-015/031).
- `401` never reaches the hook.

---

## `src/orders/OrdersPage.tsx` (new — screen at `/orders`)

- Header: title ("مراقبة الطلبات"), a manual **Refresh** button, an **auto-refresh** toggle (labelled; reflects `autoRefreshOn`).
- `<OrdersFilters>` — status `<select>`, city `<select>`, from/to date inputs + **Apply** + **Reset**; renders `dateFieldError` and any server field error inline with `aria-describedby` / `aria-invalid`.
- Body by `status` / `emptyKind`: loading state · screen error + Retry · `<OrdersTable>` + `<Pagination>` · "no orders" · "no orders match these filters" + Reset · "no orders on this page" + "back to first page".
- Two always-present visually-hidden live regions: `role="status" aria-live="polite"` for the transient toast, and a second polite region announcing the result summary ("عرض N من M طلب" / the no-match state) on every result change.
- `<OrderDetailDialog>` rendered when `detail != null`.

## `src/orders/OrdersFilters.tsx` (new)

```ts
function OrdersFilters(props: {
  filters: OrderFilters
  cities: { id: number; name_ar: string }[]     // from fetchCityDirectory()
  draftFrom: string | null
  draftTo: string | null
  dateFieldError: DateRangeError
  serverFieldError: { status?: string; city?: string; from?: string; to?: string }
  onStatus: (s: OrderStatus | 'all') => void
  onCity: (id: number | null) => void
  onDraftFrom: (v: string | null) => void
  onDraftTo: (v: string | null) => void
  onApply: () => void
  onReset: () => void
}): JSX.Element
```

- Status `<select>`: `<option value="all">` + one per `ORDER_STATUSES` (`statusLabel`). `onChange` → `onStatus` immediately.
- City `<select>`: `<option value="">كل المدن` + one per `cities` (`name_ar`). `onChange` → `onCity` immediately.
- From/To: `<input type="date">` (`dir="ltr"`), bound to `draftFrom`/`draftTo`; **Apply** and **Reset** buttons. `dateFieldError` / `serverFieldError` shown next to the relevant field.

## `src/orders/OrdersTable.tsx` + `OrderRow.tsx` (new)

- `<table>` with `<th scope="col">` for: order number, cook, type, status, requested delivery, subtotal, delivery fee, total, (details).
- `OrderRow`: `order_number` (`dir="ltr"`), cook avatar + `cook_name`, `<OrderTypeBadge type>`, `<OrderStatusBadge status>`, `formatOrderDate(requested_delivery_date)` + `delivery_time_slot`, three money cells (Cairo currency), and an **"عرض التفاصيل"** button → `onOpenDetail(order)`.

## `src/orders/OrderTypeBadge.tsx` / `OrderStatusBadge.tsx` (new)

- A chip with an **icon + text label**, never colour-only (FR-004/035). `OrderStatusBadge` gives `cancelled` a distinct icon/outline so it reads as cancelled in greyscale.

## `src/orders/Pagination.tsx` (new)

```ts
function Pagination(props: {
  page: number
  totalPages: number
  total: number
  onFirst: () => void
  onPrev: () => void
  onNext: () => void
}): JSX.Element
```

- "صفحة N من M" + "M طلب ضمن النطاق المحدد" (labelled as within the applied range/filters). First/Prev disabled at page 1; Next disabled at the last page. Keyboard operable, labelled.

## `src/orders/OrderDetailDialog.tsx` (new — modal on `src/shared/DialogShell`)

```ts
function OrderDetailDialog(props: { order: Order; onClose: () => void }): JSX.Element
```

Renders, top to bottom:

1. Header: `order_number`, cook (avatar + name), `<OrderTypeBadge>`, `<OrderStatusBadge>`, requested delivery date + slot.
2. Reference ids: "رقم العميل: {customer_id}", "رقم العنوان: {delivery_address_id}" — plain labelled numbers, no lookup.
3. Money: subtotal, delivery fee, total.
4. Line items: `<table>` of `item_name` / `unit_price` / `quantity` / `line_total`; if `order.items.length === 0` → "لا توجد بنود بعد".
5. Customer note: only if `order.customer_note` is a non-empty string.
6. Cancellation reason: only if `isCancelled(order.status) && order.cancel_reason`.
7. Custom details: only if `order.type === 'custom' && order.custom_details` — each of occasion / guests / dishes text / budget min / budget max / requested delivery date-time rendered **only when present**.
8. `{/* FR-026a: status timeline + price quote — later phase, from the shared order-details endpoint */}` — renders nothing.

- `DialogShell` provides the portal, backdrop, `role="dialog"` + `aria-modal`, `dir="rtl"`, `Esc` → `onClose`, focus trap, focus restore. No submit, no action buttons other than close (FR-028).

---

## `src/orders/messages.ts` (new)

Arabic, RTL-first, provisional copy (spec Assumptions):

```ts
export const orderMessages = {
  pageTitle: 'مراقبة الطلبات',
  refresh: 'تحديث',
  autoRefresh: 'تحديث تلقائي',
  loading: 'جارٍ تحميل الطلبات…',
  listError: 'حدث خطأ ما. حاول مرة أخرى.',
  retry: 'إعادة المحاولة',
  refreshFailed: 'تعذّر التحديث. حاول مرة أخرى.',

  emptyNoOrders: 'لا توجد طلبات.',
  emptyNoMatch: 'لا توجد طلبات مطابقة لهذه الفلاتر.',
  emptyBeyondRange: 'لا توجد طلبات في هذه الصفحة.',
  backToFirst: 'العودة إلى الصفحة الأولى',
  resetFilters: 'إعادة ضبط الفلاتر',

  filterStatus: 'الحالة',
  filterCity: 'المدينة',
  allStatuses: 'كل الحالات',
  allCities: 'كل المدن',
  filterFrom: 'من تاريخ',
  filterTo: 'إلى تاريخ',
  apply: 'تطبيق',
  fromAfterTo: 'تاريخ البداية يجب ألا يكون بعد تاريخ النهاية.',

  colOrderNumber: 'رقم الطلب',
  colCook: 'الطاهي',
  colType: 'النوع',
  colStatus: 'الحالة',
  colRequestedDelivery: 'موعد التوصيل المطلوب',
  colSubtotal: 'المجموع',
  colDeliveryFee: 'رسوم التوصيل',
  colTotal: 'الإجمالي',
  colActions: 'تفاصيل',
  viewDetails: 'عرض التفاصيل',

  typeRegular: 'عادي',
  typeCustom: 'مخصّص',

  pageIndicator: (n: number, m: number) => `صفحة ${n} من ${m}`,
  totalInRange: (t: number) => `${t} طلب ضمن النطاق المحدد`,
  resultSummary: (shown: number, total: number) => `عرض ${shown} من ${total} طلب`,

  detailTitle: (orderNumber: string) => `تفاصيل الطلب ${orderNumber}`,
  close: 'إغلاق',
  customerRef: (id: number) => `رقم العميل: ${id}`,
  addressRef: (id: number) => `رقم العنوان: ${id}`,
  lineItems: 'البنود',
  noLineItems: 'لا توجد بنود بعد.',
  colItemName: 'الصنف',
  colUnitPrice: 'سعر الوحدة',
  colQty: 'الكمية',
  colLineTotal: 'الإجمالي',
  customerNote: 'ملاحظة العميل',
  cancelReason: 'سبب الإلغاء',
  customDetails: 'تفاصيل الطلب المخصّص',
  occasionType: 'المناسبة',
  guestCount: 'عدد الضيوف',
  requestedDishes: 'الأصناف المطلوبة',
  budgetRange: 'نطاق الميزانية',
  requestedDeliveryDateTime: 'موعد التوصيل المطلوب',

  statusLabels: {
    pending: 'قيد الانتظار',
    accepted: 'مقبول',
    preparing: 'قيد التحضير',
    ready_for_pickup: 'جاهز للاستلام',
    assigned_to_driver: 'مُسند لسائق',
    picked_up: 'تم الاستلام',
    on_the_way: 'في الطريق',
    delivered: 'تم التوصيل',
    completed: 'مكتمل',
    cancelled: 'ملغي',
    pending_review: 'بانتظار المراجعة',
    quoted: 'تم التسعير',
  },
} as const
```
