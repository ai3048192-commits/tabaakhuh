# Quickstart & Validation: Dashboard Reports / Overview

Feature: `008-dashboard-reports-overview` · Date: 2026-09-07

How to run the dashboard against the reports backend and verify every acceptance scenario from [spec.md](./spec.md). Design details live in [plan.md](./plan.md), [research.md](./research.md), [data-model.md](./data-model.md), and [contracts/](./contracts/).

---

## Prerequisites

- Node ≥ 20; `npm install` completed.
- Phase 1 (`001-admin-auth-session`) implemented and working — this feature reuses its session, transport (`authedRequest` / `setTokenProvider`), and route guard.
- A reachable backend implementing `admin-dashboard-api.md` **Phase 8**: `GET /admin/reports/overview`.
- Seed data: at least a few users across roles, a spread of orders across statuses (including some `completed`), and some non-zero `total_sales_revenue`. Also test an **empty** environment (no users/orders) for the all-zero case.
- An `admin` test account (from Phase 1) and one non-`admin` account (for FR-001 / SC-007).
- Optional: Phase 7 (`007-orders-oversight`) implemented — enables the User Story 3 drill-down. Without it, every orders-by-status card is a plain figure (expected).

## Setup

```bash
cp .env.example .env
# VITE_API_BASE_URL=https://<your-host>/api/v1   (same var as Phase 1)
npm install
npm run dev            # http://localhost:5173  → sign in; you land on /dashboard (sidebar: "لوحة التحكم")
```

## Automated checks

```bash
npm run test           # Vitest watch (unit + integration + a11y)
npm run test:run       # single pass, for CI
npm run build          # vite build (tsc) must pass
```

| Suite | File | Covers |
|---|---|---|
| Normalisation | `tests/unit/overviewModel.test.ts` | `normalizeOverview` — fixed role/status order, missing keys → 0, unknown status → `known:false` row, revenue coercion, `{}` → all zeros (FR-006/017/018) |
| Formatting | `tests/unit/overviewFormat.test.ts` | `formatCount` / `formatCurrency` / `formatTime` — thousands separators, 2-dp currency + `ج.م`, Western-digit assertion (FR-008, SC-008) |
| Overview / load | `tests/integration/dashboard-overview.test.tsx` | US1 AC1–9, FR-002–011/017–019, SC-001/002/003/006/008 |
| Refresh / auto-refresh | `tests/integration/dashboard-refresh.test.tsx` | US2 AC1–8, FR-012–016, SC-004/005 |
| Session / access | `tests/integration/dashboard-session.test.tsx` | FR-001 (`401` → `/login`), non-admin never reaches `/dashboard` (SC-007) |
| Dashboard a11y (axe) | `tests/a11y/dashboard-a11y.test.tsx` | FR-019/020/021, SC-008 (automated portion) |

> `fetchMock` keys are `"<METHOD> <path>"` with **no query string** for this feature. Tests assert `GET /admin/reports/overview` (no body, `Bearer` header). Ordered replies on that key exercise retry-after-failed-load, changed-figures-on-refresh, and failed-refresh. A single mount issues **exactly one** call; a manual Refresh **exactly one** more; a fake-timer 60 s tick while `document.visibilityState === 'hidden'` issues **zero**; while `'visible'` **exactly one**; a `visibilitychange` back to `'visible'` issues **exactly one** immediately.
> Fake timers: `vi.useFakeTimers()` + `await vi.advanceTimersByTimeAsync(REFRESH_INTERVAL_MS)`; restore in `afterEach`. Visibility: `Object.defineProperty(document, 'visibilityState', { value, configurable: true })` then `document.dispatchEvent(new Event('visibilitychange'))`.
> jsdom cannot evaluate colour contrast, true focus visibility, or real RTL glyph layout — those parts of SC-008 stay in the manual checklist below.

---

## Manual validation scenarios

Run against `npm run dev`, signed in as `admin`, on `/dashboard`. Use the Network tab to inspect requests, and the Elements tab to toggle `document.visibilityState` (or switch browser tabs) for the auto-refresh checks.

### US1 — See the platform overview at a glance (P1)

1. **Three labelled groups (AC1–3, FR-003–005/007)** — open `/dashboard`. → One `GET /admin/reports/overview` with the bearer header. Three groups render: **المستخدمون حسب الدور** (العملاء / الطهاة / السائقون / المدراء), **الطلبات حسب الحالة** (twelve labelled statuses), **إجمالي المبيعات** (one "N,NNN.NN ج.م" figure with a "للطلبات المكتملة فقط" note). Counts and the revenue reconcile against your seed data.
2. **All twelve statuses, zeros included, fixed order (AC7, FR-006, clarify Q1)** — ensure some statuses have zero orders. → Every one of the twelve status cards is present with its label and a `0`, in the same order on every load; no card is missing and none is added/removed as data changes.
3. **Loading state distinct from all-zero (AC4, FR-009)** — throttle the network and reload. → A "جارٍ تحميل الإحصائيات…" indicator shows first; it is visibly different from a populated screen where every number happens to be `0`.
4. **All-zero platform (AC5, FR-010)** — point at an empty environment (no users, no orders, no completed sales). → Every count shows `0` and the revenue shows "0.00 ج.م", presented as real values — not an error, not a blank screen.
5. **Failed first load → error + Retry (AC6, FR-011, SC-003)** — set Network to Offline and reload `/dashboard`. → A "حدث خطأ ما. حاول مرة أخرى." panel with **Retry**; no stale or partial numbers shown. Go back online, click Retry → a second `GET /admin/reports/overview`; the figures appear.
6. **Western digits with separators (FR-008/019, clarify Q4, SC-008)** — with large seed values (e.g. 1,240 customers, 154,300 revenue). → Numbers read "1,240" and "154,300.00 ج.م" using Latin digits and comma grouping; labels remain Arabic; the layout is right-to-left.
7. **Unknown status tolerated (AC8, FR-018)** — if the backend can emit an extra `orders_by_status` key (or mock it), e.g. `"archived": 5`. → A thirteenth card appears after the twelve, labelled "حالة غير معروفة (archived)" with its count; nothing else shifts or breaks.
8. **Missing key tolerated (FR-017)** — if the backend omits, say, `users_by_role.driver`. → The "السائقون" card still shows, with `0`.
9. **Large figures don't break layout (AC9, FR-008)** — with very large counts / revenue. → Values stay on their cards with digit grouping; no overflow.

### US2 — Refresh to see current figures (P2)

1. **Manual refresh (AC1, FR-012)** — click **تحديث**. → Exactly one more `GET /admin/reports/overview`; the counts and revenue update to current values; the "آخر تحديث: HH:MM" line advances.
2. **In-progress indication keeps figures (AC2, FR-013)** — throttle the network, click **تحديث**. → The button shows "جارٍ التحديث…" / a busy state; the previously retrieved figures stay fully visible during the fetch.
3. **Changed data reflected (AC3, FR-016)** — move an order to `completed` on the backend, then refresh. → The `completed` count and the revenue total change accordingly.
4. **Failed refresh keeps last good + notice (AC4, FR-014, SC-005)** — after a successful load, go Offline and click **تحديث**. → The last good figures stay on screen; an inline "تعذّر التحديث، تُعرض آخر أرقام معروفة." notice with a retry appears; nothing is blanked. Go online and retry → figures refresh and the notice clears.
5. **How current (AC5, FR-015)** — on first load and after each refresh. → A visible "آخر تحديث: HH:MM" reflects the last successful retrieval time.
6. **Auto-refresh every 60 s while visible (AC6, FR-016, clarify Q3)** — leave `/dashboard` open and focused; watch the Network tab for ~2 minutes. → A `GET /admin/reports/overview` fires roughly every 60 seconds; each uses the same busy indication and, on failure, the same "couldn't refresh" notice.
7. **Paused while hidden (AC8, FR-016, clarify Q5)** — switch to another browser tab (or set `document.visibilityState` to `hidden`) and wait > 60 s. → **No** `GET /admin/reports/overview` fires while hidden.
8. **Immediate fetch on return (AC8, FR-016, clarify Q5)** — switch back to the `/dashboard` tab. → One `GET /admin/reports/overview` fires immediately; the "آخر تحديث" line updates; the 60-second cycle resumes from the return.
9. **Manual refresh resets the interval (FR-016)** — click **تحديث**, then time the next automatic fetch. → It is ~60 s after the manual click, not sooner.

### US3 — Jump from an order-status figure to those orders (P3 — requires Phase 7)

*Without Phase 7 implemented:* every orders-by-status card is a plain figure — not a link, not focusable as a control. The users-by-role cards and the revenue card are display-only in every case. This is the expected state and satisfies FR-021.

*With Phase 7 implemented* (`ordersStatusHref` returns `/orders?status=…`):

1. **Drill-down (AC1, FR-020)** — activate the "ملغى" (cancelled) card. → The orders screen opens filtered to `cancelled`.
2. **Display-only cards (AC2, FR-020)** — the users-by-role cards and the revenue card are not activatable.
3. **Unavailable target → plain figure (AC3, FR-021)** — a status with no supported filter value shows as a plain figure.
4. **Zero-count card still navigates (AC6)** — activate a status card showing `0`. → The orders screen opens filtered to that status and shows its own "no orders match these filters" state.
5. **Keyboard (AC5, FR-021)** — Tab to an orders-by-status card and activate it with Enter. → It navigates; its accessible name names the status.

### Session loss (FR-001)

1. On `/dashboard`, revoke the token server-side (or corrupt the stored token in DevTools), then trigger a call (click **تحديث**, or wait for the 60 s tick). → `401` → the Phase 1 handler clears the session and redirects to `/login`; no broken view.
2. **Non-admin (SC-007)** — sign in as a non-admin (or drop the role). → `/dashboard` is not reachable; the admin shell redirects as for every other admin route.

### Accessibility — WCAG 2.1 AA (FR-019/020/021, SC-008)

Automated: `tests/a11y/dashboard-a11y.test.tsx` must report **zero** axe violations on the loading state, the error+Retry panel, the populated screen (all three groups), and the refresh-error-notice state.

Manual sign-off (keyboard only + a screen reader — VoiceOver / NVDA):

- [ ] Tab reaches the **تحديث** button and (when shown) the refresh-error **retry** in a sensible order; visible focus ring throughout.
- [ ] Each group has a real heading; the reading order is title → its cards.
- [ ] Each card is announced as "label: value" (e.g. "العملاء: 1,240"); numbers are Latin digits.
- [ ] The "آخر تحديث: HH:MM" line and the "تعذّر التحديث…" notice are announced via the `aria-live` region when they appear or change, without moving the pointer.
- [ ] The **تحديث** button exposes its busy state (`aria-busy`) while refreshing; the label change is announced.
- [ ] No figure's meaning depends on colour alone (the refresh-error notice has text + an icon; status/role cards are labelled text).
- [ ] Colour contrast of headings, card text, button, and the notice meets AA (brand red `#7a0d0d`).
- [ ] RTL: the whole screen — header, groups, cards, "آخر تحديث" line, notice, loading and error states — lays out right-to-left with nothing clipped or mis-mirrored; each number and its unit read left-to-right within their span.
- [ ] (With Phase 7) an orders-by-status card link is keyboard-operable, has a visible focus ring, and its accessible name names the status.

---

## Definition of done for this feature

- All Vitest suites green; `npm run test:run` and `npm run build` clean. No pre-existing test changed (no `src/api/` edit).
- Every manual scenario above passes against a real Phase 8 backend, including the empty-environment all-zero case and the hidden-tab pause / return-fetch behaviour.
- The a11y manual checklist is fully ticked and `vitest-axe` shows zero violations.
- `/dashboard` renders `OverviewPage` inside `<RequireAdmin>`; `src/pages/Dashboard.tsx` is deleted; `src/App.tsx` imports `OverviewPage`; `Sidebar.tsx` is unchanged.
- No feature module reads the bearer token directly; the call goes through `authedRequest`.
- `GET /admin/reports/overview` is sent with no query string and no body; a single mount sends exactly one; a manual Refresh exactly one more; a hidden-tab interval tick sends none.
- All four roles and all twelve statuses render on every load, zeros included, in a fixed order; an unknown status renders with a fallback label; a missing key renders as `0`.
- Every count and the revenue total render in Western/Latin digits with thousands separators; all labels are Arabic; the layout is RTL.
- Total sales revenue reflects `completed` orders only and shows that scope.
- Orders-by-status cards link to the filtered orders screen only when `ordersStatusHref` returns a target (Phase 7); otherwise they, and always the users-by-role and revenue cards, are plain figures.
