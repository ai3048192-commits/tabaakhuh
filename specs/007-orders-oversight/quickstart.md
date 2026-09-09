# Quickstart & Validation: Orders Oversight

Feature: `007-orders-oversight` · Date: 2026-09-07

How to run the dashboard against the orders backend and verify every acceptance scenario from [spec.md](./spec.md). Design details live in [plan.md](./plan.md), [research.md](./research.md), [data-model.md](./data-model.md), and [contracts/](./contracts/).

---

## Prerequisites

- Node ≥ 20; `npm install` completed.
- Phase 1 (`001-admin-auth-session`) implemented and working — this feature reuses its session, transport (`authedRequest` / `setTokenProvider`), and route guard.
- Phase 5 (`005-cities-management`) present — this feature reuses `fetchCityDirectory()` for the city filter options (it is already used by cook/driver review).
- A reachable backend implementing `admin-dashboard-api.md` **Phase 7**: `GET /admin/orders` with `status`, `city_id`, `placed_from`, `placed_to`, `page` and the paginated `{ items, page, per_page, total }` envelope.
- Seed data:
  - **> 40** orders (≥ 3 pages at `per_page = 20`), spread across several `OrderStatus` values including at least one `cancelled` (with a `cancel_reason`), one `pending_review`, and one `custom` order — one custom order with an **empty** `items` array, one with line items.
  - Orders in **at least two cities**, one of which is **deactivated**.
  - Orders placed **within the last 30 days** and at least one placed **31+ days ago** (to prove the default window excludes it).
  - At least one order placed at **23:30 Cairo time** on a chosen "to" date and one just after **midnight Cairo** the next day (SC-005).
- An `admin` test account (from Phase 1).

## Setup

```bash
cp .env.example .env
# VITE_API_BASE_URL=https://<your-host>/api/v1   (same var as Phase 1)
npm install
npm run dev            # http://localhost:5173  → sign in, open /orders (sidebar: "مراقبة الطلبات")
```

## Automated checks

```bash
npm run test           # Vitest watch (unit + integration + a11y)
npm run test:run       # single pass, for CI
npm run build          # tsc + vite build must pass
```

| Suite | File | Covers |
|---|---|---|
| Query builder | `tests/unit/ordersQuery.test.ts` | `buildOrdersQuery` omit rules + param order; `validateDateRange` from ≤ to (FR-011–014, FR-016) |
| URL state | `tests/unit/ordersUrlState.test.ts` | `filtersFromSearchParams` default 30-day `from` + round-trips; `filtersToSearchParams` omits defaults (FR-010, FR-036) |
| Cairo dates | `tests/unit/cairoDates.test.ts` | `daysAgoCairo`, `isDefaultOrWiderRange`, fixed-Cairo formatting under a non-Cairo `TZ` (FR-013b, SC-005) |
| Status/type | `tests/unit/orderStatus.test.ts` | 12 `ORDER_STATUSES`, labels, `isCancelled`, `typeLabel` (FR-004, FR-011) |
| List / paging | `tests/integration/orders-list.test.tsx` | US1 AC1–9, FR-001–008/010/030, SC-001/001a/002/016 |
| Filters | `tests/integration/orders-filter.test.tsx` | US2 AC1–13, FR-011–018/031, SC-003/004/005/006/007/008 |
| Detail | `tests/integration/orders-detail.test.tsx` | US3 AC1–9, FR-019–027, SC-009/010/011/012/013a |
| URL state | `tests/integration/orders-url-state.test.tsx` | FR-036, SC-017 (render at a full query string; detail not in URL) |
| Auto-refresh | `tests/integration/orders-autorefresh.test.tsx` | FR-009/009a/009b, SC-013b (fake timers; page-1+default only; toggle off; scroll/detail untouched) |
| Session / access | `tests/integration/orders-session.test.tsx` | FR-029 (401 → `/login`), FR-030 (non-admin never reaches `/orders`) |
| Orders a11y (axe) | `tests/a11y/orders-a11y.test.tsx` | FR-034/035, SC-014 (automated portion), SC-015 (RTL smoke) |

> `fetchMock` keys are `"<METHOD> <path>"` **including the query string** for this feature. Tests assert the exact query `buildOrdersQuery` produced — param order (`status`, `city_id`, `placed_from`, `placed_to`, `page`), omitted params (`status` gone for "all", `city_id` gone for none, `placed_to` gone when open-ended, `placed_from` always the real 30-day-default value), and `page` always present. Post-navigation and auto-refresh loads are exercised with **ordered replies** on the relevant `GET /admin/orders?...` keys.
> `jsdom` cannot evaluate colour contrast, true focus visibility, or real RTL glyph layout — those parts of SC-014 / SC-015 stay in the manual checklist below. `Intl` with `timeZone: 'Africa/Cairo'` works in `jsdom`, so `cairoDates.test.ts` sets a different `process.env.TZ` to prove the fixed zone.

---

## Manual validation scenarios

Run against `npm run dev`, signed in as `admin`, on `/orders`. Use the Network tab to inspect the exact `GET /admin/orders?...` query and the URL bar to inspect the synced query string.

### US1 — Review the paginated list (P1)

1. **Default 30-day window (AC1, FR-010, SC-001)** — open `/orders` with a clean URL. → The filter bar shows "من تاريخ" pre-set to 30 days ago (Cairo) and "إلى تاريخ" empty; one `GET /admin/orders?placed_from=<30d>&page=1`; the URL bar stays clean (no `from`/`page` because they equal the defaults). The count reads "N طلب ضمن النطاق المحدد", not a platform total. An order placed 31 days ago is **not** listed.
2. **Row columns (AC1, FR-002)** — each row shows order number, cook name + avatar, type badge, status badge, requested delivery date + time slot, subtotal, delivery fee, total. **No customer column.**
3. **Loading vs empty (AC2/AC3, FR-005/006)** — throttle the network and reload. → A loading state, distinct from the empty state. Against a range that matches nothing, "لا توجد طلبات مطابقة لهذه الفلاتر." (or "لا توجد طلبات." when nothing is filtered).
4. **Custom & cancelled marked (AC6/AC7, FR-004)** — find a custom order and a cancelled order. → Each is distinguishable from a regular / non-cancelled order **without colour** (icon + label). The cancelled order's `cancel_reason` is reachable (in the detail).
5. **Paging (AC4/AC5, FR-003, SC-002)** — click Next, then Previous, then First. → Each issues `GET …&page=N` with the same filters; the "صفحة N من M" indicator and the row set update; First/Prev disable on page 1, Next disables on the last page. The URL bar gains/updates `page=N` (and drops it on page 1).
6. **List-load error (FR-008)** — set Network to Offline and reload `/orders`. → A screen-level "حدث خطأ ما" with Retry; Retry after going online loads the list. If a list was already shown, a failed refresh keeps it and shows a toast.
7. **Page beyond range (AC9, FR-007, SC-016)** — manually set `?page=999` in the URL. → "لا توجد طلبات في هذه الصفحة." with a "العودة إلى الصفحة الأولى" control that works.
8. **Non-admin (FR-030)** — sign in as a non-admin (or drop the role). → `/orders` is not reachable; the admin shell redirects as for every other admin route.

### US2 — Filter by status, city, date (P2)

1. **Status is immediate (AC1/AC2, FR-011/013a, SC-003)** — pick "مكتمل" from the status select. → **No** Apply needed; one `GET …?status=completed&…&page=1`; only completed orders; the count updates; the URL gains `status=completed`. Set it back to "كل الحالات" → `status` drops from the query and URL.
2. **City incl. deactivated (AC3/AC4, FR-012, SC-004)** — pick a city, then pick a **deactivated** city. → Both are selectable (the list comes from the directory, which keeps inactive cities); each issues `GET …?city_id=<id>&…`; only that city's cooks' orders show.
3. **Date range needs Apply (AC5, FR-013/013a, SC-005)** — set "من" and "إلى" to a window; **no** request fires until you click "تطبيق". → Then `GET …?placed_from=…&placed_to=…&page=1`; an order placed 23:30 Cairo on the "to" date is included, one just after midnight the next day is not. The URL gains `from`/`to`.
4. **Open-ended range (AC6, FR-013)** — set only "من", Apply. → `placed_from` sent, `placed_to` omitted; set only "إلى", Apply → `placed_to` sent, `placed_from` omitted.
5. **from > to blocked locally (AC7, FR-014, SC-006)** — set "من" after "إلى", click Apply. → **No** request; "تاريخ البداية يجب ألا يكون بعد تاريخ النهاية." appears on the date fields; the current results are unchanged.
6. **Server 422 safeguards (AC8/AC9/AC10, FR-015, SC-007)** — (needs a backend or a proxy to force it) an unparseable date / unknown status / non-existent city → a specific inline message on that control; the list is **not** replaced with results for the invalid filter.
7. **Combine + change one (AC11, FR-016)** — apply status + city + range; then change only the status. → The city and range stay in effect; the combined query re-runs from `page=1`.
8. **No match + Reset (AC12, FR-018)** — apply filters that match nothing. → "لا توجد طلبات مطابقة لهذه الفلاتر." (distinct from the unfiltered empty state); "إعادة ضبط الفلاتر" clears status + city and returns the range to the last 30 days; the URL returns to clean.
9. **Filters persist across pages (AC13, FR-017)** — with filters applied, page Next/Prev. → Every page's `GET` carries the same `status`/`city_id`/`placed_from`/`placed_to`.

### US3 — Inspect one order (P3)

1. **Open from a row, no request (AC1, FR-019, SC-013a)** — click "عرض التفاصيل" on a row. → A centred modal opens over the list; **the Network tab shows no new request**; the list and its scroll position are preserved behind it.
2. **Header + reference ids (AC1, FR-020)** — the dialog shows order number, cook, type, status, requested delivery date + slot, subtotal/fee/total, and "رقم العميل: …" + "رقم العنوان: …" as plain numbers (no name, no address text).
3. **Line items (AC2, FR-021, SC-009)** — for a regular order, every line item shows صنف / سعر الوحدة / الكمية / الإجمالي, and the line totals are consistent with the order subtotal. For a custom order with an empty `items` array → "لا توجد بنود بعد.".
4. **Customer note (AC3, FR-022)** — a note shows only when present; an order without one shows no note area / an explicit empty, not a placeholder.
5. **Cancellation reason (AC4, FR-023, SC-011)** — a cancelled order's reason shows; a non-cancelled order's detail shows none.
6. **Custom details (AC5/AC6, FR-024/025, SC-010)** — a custom order shows المناسبة / عدد الضيوف / الأصناف المطلوبة / نطاق الميزانية / موعد التوصيل المطلوب, omitting any absent value; a regular order shows **no** custom-details block.
7. **No timeline / no quote (AC8, FR-026/026a)** — the dialog shows **no** status timeline and **no** price quote, and no empty "loading" section where they would go.
8. **Close restores context (AC7, FR-027, SC-012)** — from a filtered page other than the first, open a detail and close it (X, `Esc`, and overlay click each work). → Back to the same page and scroll position, same filters, and focus returns to the "عرض التفاصيل" button that opened it.

### URL state (FR-036, SC-017)

1. Apply status + city + a date range and go to page 2. → The URL bar reads e.g. `/orders?status=completed&city=3&from=2026-08-01&to=2026-08-31&page=2`.
2. Reload the browser. → The exact same filtered page-2 view returns (one `GET` with that query).
3. Copy the URL into another admin's browser (signed in). → Same view.
4. Open `/orders` with **no** query params. → The default last-30-days, page-1 view.
5. Open a detail, then reload. → The list returns **without** the dialog open (the dialog is not in the URL).

### Auto-refresh (FR-009 / FR-009a / FR-009b, SC-013b)

1. On page 1 with the default range, wait ~30 s (or watch the Network tab). → A second identical `GET /admin/orders?placed_from=<30d>&page=1` fires; the row set updates in place; your scroll position, the filter bar, and any open detail dialog are **untouched**.
2. Go to page 2 and wait. → **No** automatic `GET`.
3. Back on page 1, set a **narrower** custom date range and Apply, then wait. → **No** automatic `GET`.
4. Toggle "تحديث تلقائي" **off** on page 1 + default range, then wait. → **No** automatic `GET`. The manual **Refresh** button still issues one `GET` on demand.
5. With auto-refresh on and a detail dialog open, wait for a tick. → The dialog stays open and unchanged; the list behind it refreshes.

### Session loss (FR-029)

1. On `/orders`, revoke the token server-side (or corrupt the stored token in DevTools), then trigger any load (Refresh, a filter change, or a page change). → `401` → the Phase 1 handler clears the session and redirects to `/login`; no broken view.

### Accessibility — WCAG 2.1 AA (FR-034/035, SC-014) and RTL (FR-034, SC-015)

Automated: `tests/a11y/orders-a11y.test.tsx` must report **zero** axe violations on the loading state, the table, the filter bar, the empty state, the no-match state, the list-error state, the page-beyond state, and `OrderDetailDialog` for a regular, a custom, and a cancelled order.

Manual sign-off (keyboard only + a screen reader — VoiceOver / NVDA):

- [ ] Tab reaches the status select, city select, date fields, Apply, Reset, each row's "عرض التفاصيل" button, the pagination controls, the manual Refresh, and the auto-refresh toggle, in a sensible order; visible focus ring throughout.
- [ ] The status and city selects, the date fields, and every pagination control have programmatic labels.
- [ ] The table exposes column headers programmatically; each data cell is associated with its header.
- [ ] Order type and status are distinguishable without colour (badge icon + text) — verify in greyscale; `cancelled` is unmistakable.
- [ ] Changing a filter announces the new result summary / the no-match state via a live region without moving focus.
- [ ] The `from > to` message and any server field error are associated with the date/status/city control (`aria-describedby` / `aria-invalid`) and announced.
- [ ] `OrderDetailDialog`: focus moves into the dialog on open, is trapped, and returns to the "عرض التفاصيل" button on close; `Esc` and the overlay both close it; the dialog has an accessible name (the order number).
- [ ] A failed refresh / auto-refresh toast is announced via the `aria-live` region.
- [ ] Colour contrast of buttons, badges, toast text, and the table meets AA (brand red `#7a0d0d`, status colours against their backgrounds).
- [ ] RTL: the whole screen — table, filter bar, pagination, detail dialog, all state messages — lays out right-to-left with nothing clipped, mis-mirrored, or overlapping; order numbers, dates, time slots, and money read left-to-right within their cells; dates and money are formatted in Africa/Cairo consistently with the rest of the dashboard.

---

## Definition of done for this feature

- All Vitest suites green; `npm run test:run` and `npm run build` clean.
- Every manual scenario above passes against a real Phase 7 backend.
- The a11y manual checklist is fully ticked and `vitest-axe` shows zero violations.
- `/orders` renders `src/orders/OrdersPage` inside `<RequireAdmin>`; `src/pages/OrdersPage.tsx` is deleted; the sidebar entry reads "مراقبة الطلبات" and still points at `/orders`.
- No feature module reads the bearer token directly; the one call goes through `authedRequest`; there is **no** `POST`/`PUT`/`PATCH`/`DELETE` anywhere in `src/orders/`.
- The list request carries the exact query `buildOrdersQuery` builds: `status` omitted for "all", `city_id` omitted when none, `placed_to` omitted when open-ended, `placed_from` always sent (default = 30 days ago, Africa/Cairo), `page` always sent.
- `{ status, city, from, to, page }` round-trip through the URL query string (defaults omitted); the order-detail dialog is never in the URL.
- Opening a detail issues no network request; auto-refresh runs only on page 1 with the default-or-wider range and can be turned off, and never disturbs scroll, filters, or an open dialog.
- `quote` and `status_history` are never rendered; the detail keeps a non-rendered slot for a later phase.
