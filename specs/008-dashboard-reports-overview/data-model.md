# Data Model — Dashboard Reports / Overview

Feature: `008-dashboard-reports-overview` · Phase 1 output

No persistent storage, no entities in a database sense. This document defines the **client-side shapes** in `src/overview/` and the pure transformations over them. All fields mirror `admin-dashboard-api.md` Phase 8.

---

## 1. Wire shape — `RawOverview` (`src/overview/types.ts`)

The `data` object of `GET /admin/reports/overview`, exactly as received.

```ts
interface RawOverview {
  users_by_role: Partial<Record<Role, number>>
  orders_by_status: Record<string, number>   // keys SHOULD be OrderStatus values; unknown keys tolerated
  total_sales_revenue: number
}

type Role = 'customer' | 'cook' | 'driver' | 'admin'

type OrderStatus =
  | 'pending' | 'accepted' | 'preparing' | 'ready_for_pickup'
  | 'assigned_to_driver' | 'picked_up' | 'on_the_way' | 'delivered'
  | 'completed' | 'cancelled' | 'pending_review' | 'quoted'
```

- The API is expected to send all keys, but the client treats `users_by_role` / `orders_by_status` as **possibly partial** and `orders_by_status` as **possibly carrying extra keys** (FR-017 / FR-018). It never assumes a key is present.
- `total_sales_revenue` is the sum of `total` over `completed` orders only (contract note, not enforced client-side).
- No `id`, no timestamps, no pagination wrapper. Not cached.

---

## 2. Display order constants (`src/overview/types.ts`)

```ts
const ROLE_ORDER: readonly Role[] = ['customer', 'cook', 'driver', 'admin']

const STATUS_ORDER: readonly OrderStatus[] = [
  'pending', 'accepted', 'preparing', 'ready_for_pickup',
  'assigned_to_driver', 'picked_up', 'on_the_way', 'delivered',
  'completed', 'cancelled', 'pending_review', 'quoted',
]

const REFRESH_INTERVAL_MS = 60_000
```

`ROLE_ORDER` and `STATUS_ORDER` are the single source of truth for card order (FR-006). `REFRESH_INTERVAL_MS` is imported by the hook and by tests.

---

## 3. Normalised shape — `OverviewSnapshot` (`src/overview/types.ts`)

What the screen renders. Produced only by `normalizeOverview`.

```ts
interface RoleCount {
  role: Role
  count: number          // ≥ 0 integer; missing wire key → 0
}

interface StatusCount {
  status: string         // an OrderStatus, or an unrecognised key when known === false
  count: number          // ≥ 0 integer; missing wire key → 0
  known: boolean          // true → status ∈ STATUS_ORDER (use messages.statusLabel);
                          // false → unknown key (use messages.unknownStatusLabel)
}

interface OverviewSnapshot {
  roles: RoleCount[]          // exactly ROLE_ORDER.length, in ROLE_ORDER order
  statuses: StatusCount[]     // STATUS_ORDER.length known rows first (in order),
                              //   then any unknown rows in wire-key order
  revenue: number             // ≥ 0; non-numeric / missing wire value → 0
}
```

---

## 4. `normalizeOverview(raw: RawOverview): OverviewSnapshot` (`src/overview/overviewModel.ts`, pure)

| Step | Rule |
|---|---|
| roles | For each `r` in `ROLE_ORDER`: `{ role: r, count: num(raw.users_by_role?.[r]) }`. |
| known statuses | For each `s` in `STATUS_ORDER`: `{ status: s, count: num(raw.orders_by_status?.[s]), known: true }`. |
| unknown statuses | For each key `k` in `raw.orders_by_status` with `k ∉ STATUS_ORDER`, in object-key order: append `{ status: k, count: num(raw.orders_by_status[k]), known: false }`. |
| revenue | `num(raw.total_sales_revenue)`. |
| `num(x)` | `const n = Number(x); return Number.isFinite(n) && n > 0 ? Math.trunc(n) : (Number.isFinite(n) && n >= 0 ? n : 0)` — i.e. counts/revenue coerce to a finite `≥ 0` number, `NaN`/`null`/negative/`undefined` → `0`. (Counts are truncated at the formatter, not here; `num` only guarantees a safe non-negative finite number.) |
| empty input | `normalizeOverview({} as RawOverview)` → all roles `0`, all known statuses `0`, no unknown rows, `revenue: 0`. |

Pure: no `Date`, no I/O, no `messages` import. Deterministic for a given `raw`.

**Unit tests** (`tests/unit/overviewModel.test.ts`):

| Input | Expect |
|---|---|
| full payload (all keys, sample values) | `roles` length 4 in `ROLE_ORDER` order with matching counts; `statuses` length 12 in `STATUS_ORDER` order, all `known:true`; `revenue` equals the input |
| `users_by_role` missing `driver` | `driver` row present with `count: 0` |
| `orders_by_status` missing `quoted` and `picked_up` | both rows present, `count: 0`, still in `STATUS_ORDER` position |
| `orders_by_status` has extra key `"archived": 4` | a 13th `statuses` row `{ status:'archived', count:4, known:false }` appended after the 12 known rows |
| two unknown keys `"archived"`, `"disputed"` | appended in that (object-key) order |
| `total_sales_revenue: "1533.5"` | `revenue: 1533.5` |
| `total_sales_revenue: null` / absent / `-10` / `NaN` | `revenue: 0` |
| a count value of `null` / `"7"` / `-2` | coerced to `0` / `7` / `0` respectively |
| `{}` | all-zero snapshot, no unknown rows |

---

## 5. Formatting — `src/overview/format.ts` (pure)

```ts
function formatCount(n: number): string
// Intl.NumberFormat('en-US').format(Math.trunc(Math.max(0, n)))
// 0 → "0" · 3 → "3" · 1240 → "1,240" · 1_000_000 → "1,000,000"

function formatCurrency(n: number): string
// Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
//   .format(Math.max(0, n)) + ' ' + 'ج.م'   // "ج.م"
// 0 → "0.00 ج.م" · 154300 → "154,300.00 ج.م" · 154300.5 → "154,300.50 ج.م"

function formatTime(d: Date): string
// 24-hour "HH:MM", zero-padded, Western digits (d.getHours()/getMinutes())
// used for the "آخر تحديث: HH:MM" line
```

- Locale pinned to `'en-US'` so digits are always Western and the group separator is `,` regardless of the viewer's locale (clarify Q4).
- No `messages` dependency for `formatCount` / `formatCurrency` / `formatTime`; the currency unit string is a local constant (kept identical to `messages.currencyUnit`).

**Unit tests** (`tests/unit/overviewFormat.test.ts`): the example rows above, plus `formatCount(-5) → "0"`, `formatCurrency(-1) → "0.00 ج.م"`, and an assertion that each output matches `/^[\d.,\sجم]+$/` (no Arabic-Indic digits `٠-٩`).

---

## 6. Hook contract — `useOverview()` (`src/overview/useOverview.ts`)

```ts
type OverviewStatus = 'loading' | 'ready' | 'error'

interface UseOverview {
  status: OverviewStatus
  snapshot: OverviewSnapshot | null   // last SUCCESSFUL snapshot; survives a failed refresh
  lastUpdated: Date | null            // time of the last successful fetch (FR-015)
  refreshing: boolean                 // a re-fetch is in flight while snapshot is shown (FR-013)
  refreshError: boolean               // last re-fetch failed; cleared on next success / next attempt (FR-014)
  refresh: () => void                 // manual button; also resets the 60s interval (FR-016)
}
```

State transitions:

| From | Event | To |
|---|---|---|
| — (mount) | `load()` starts | `status='loading'`, `snapshot=null` |
| `loading` | `getOverview` resolves | `status='ready'`, `snapshot=normalize(data)`, `lastUpdated=now` |
| `loading` | `getOverview` rejects (non-401) | `status='error'` (snapshot stays `null`) — FR-011 |
| `error` | `refresh()` | behaves as `load()` (back to `loading`) |
| `ready` | `refresh()` starts (button / 60s tick while visible / visibility→visible) | `refreshing=true`, `refreshError=false` |
| `ready` + `refreshing` | resolves | `snapshot`/`lastUpdated` replaced, `refreshing=false` |
| `ready` + `refreshing` | rejects (non-401) | `refreshing=false`, `refreshError=true`, `snapshot`/`lastUpdated` unchanged — FR-014 |
| any | `getOverview` rejects with `401` | not observed here — shared `unauthorizedHandler` → session-loss → `/login` (FR-001) |

Timer / visibility rules (FR-016, clarify Q3 + Q5):

- One `setInterval(tick, REFRESH_INTERVAL_MS)` created on mount.
- `tick()` → `if (document.visibilityState === 'visible') refresh()`. Hidden tab → no-op (paused).
- `visibilitychange` listener: on transition to `'visible'` → `refresh()` immediately, then `clearInterval` + new `setInterval` (cycle restarts at a full interval).
- `refresh()` invoked from the **manual button** also does `clearInterval` + new `setInterval`.
- A single-flight guard ref prevents overlapping `getOverview` calls (tick + visibility can coincide).
- Cleanup on unmount: `clearInterval`, `removeEventListener('visibilitychange', …)`.

---

## 7. `ordersStatusHref(status: OrderStatus): string | null` (`src/overview/ordersLink.ts`)

The **only** coupling to Phase 7.

| Situation | Return |
|---|---|
| now (Phase 7 not shipped) | `null` for every status → every orders-by-status card is a plain figure (FR-021) |
| after Phase 7 ships a status-filtered `/orders` | `/orders?status=${encodeURIComponent(status)}` for supported statuses; `null` for any it does not support |
| `known === false` (unrecognised status) | always `null` — no filter value exists for an unknown status |

`StatCard` calls this only for orders-by-status cards. Users-by-role and revenue cards never call it.

---

## 8. Component props (`src/overview/`)

| Component | Props | Notes |
|---|---|---|
| `OverviewPage` | — | Owns `useOverview()`. Renders one of: loading indicator / error panel + **Retry** / the three `StatGroup`s. Header shows the title, the **Refresh** button (`disabled`/`aria-busy` while `refreshing`), the "آخر تحديث: HH:MM" line, and — when `refreshError` — the inline "تعذّر التحديث…" notice + a retry button. One persistent polite `aria-live` region carrying `lastUpdated` / `refreshFailedNotice` text. RTL, Tajawal, brand `#7a0d0d`. |
| `StatGroup` | `title: string`, `children` | `<section>` with a real heading (`<h2>`), wrapping a responsive CSS grid of `StatCard`. Used three times: users, orders, revenue (the revenue group holds a single card + the "completed orders only" note). |
| `StatCard` | `label: string`, `value: string` (already formatted), `href?: string \| null`, `linkLabel?: string` | If `href` is a non-empty string → render as a React Router `<Link to={href}>` with `aria-label={linkLabel}`, focus-visible ring. Else → a plain non-interactive figure. The numeric `value` is wrapped so screen readers read "label: value". Never uses colour as the sole differentiator. |

---

## 9. Messages (`src/overview/messages.ts`) — Arabic, RTL, provisional wording

```
pageTitle: 'لوحة التحكم'
subtitle: 'نظرة عامة على المنصة'

refresh: 'تحديث'
refreshing: 'جارٍ التحديث…'
retry: 'إعادة المحاولة'
loading: 'جارٍ تحميل الإحصائيات…'
loadError: 'حدث خطأ ما. حاول مرة أخرى.'

lastUpdated: (t: string) => `آخر تحديث: ${t}`
refreshFailedNotice: 'تعذّر التحديث، تُعرض آخر أرقام معروفة.'

usersGroupTitle: 'المستخدمون حسب الدور'
ordersGroupTitle: 'الطلبات حسب الحالة'
revenueGroupTitle: 'إجمالي المبيعات'
revenueScopeNote: 'للطلبات المكتملة فقط'
currencyUnit: 'ج.م'

roleLabel: {
  customer: 'العملاء',
  cook: 'الطهاة',
  driver: 'السائقون',
  admin: 'المدراء',
}

statusLabel: {
  pending: 'قيد الانتظار',
  accepted: 'مقبول',
  preparing: 'قيد التحضير',
  ready_for_pickup: 'جاهز للاستلام',
  assigned_to_driver: 'مُسند إلى سائق',
  picked_up: 'تم الاستلام',
  on_the_way: 'في الطريق',
  delivered: 'تم التوصيل',
  completed: 'مكتمل',
  cancelled: 'ملغى',
  pending_review: 'قيد المراجعة',
  quoted: 'تم التسعير',
}

unknownStatusLabel: (key: string) => `حالة غير معروفة (${key})`
statusCardLinkLabel: (label: string, count: string) => `عرض طلبات ${label} (${count})`
```

Wording is provisional per the spec's Assumptions ("descriptive, not final copy"). Group titles and labels are Arabic; values passed to cards are pre-formatted Western-digit strings.
