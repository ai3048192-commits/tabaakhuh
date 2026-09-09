# Quickstart & Validation: Withdrawals Management

Feature: `004-withdrawals-management` · Date: 2026-09-07

How to run the dashboard against the withdrawals backend and verify every acceptance scenario from [spec.md](./spec.md). Design details live in [plan.md](./plan.md), [research.md](./research.md), [data-model.md](./data-model.md), and [contracts/](./contracts/).

---

## Prerequisites

- Node ≥ 20; `npm install` completed.
- Phase 1 (`001-admin-auth-session`) implemented and working — this feature reuses its session, transport (`authedRequest` / `setTokenProvider`, added in Phase 2), and route guard.
- A reachable backend implementing `admin-dashboard-api.md` **Phase 4**: `GET /admin/withdrawals` (with `?status=` and `?page=`), `POST /admin/withdrawals/{id}/approve`, `POST /admin/withdrawals/{id}/reject`, `POST /admin/withdrawals/{id}/mark-paid`.
- Seed data: enough withdrawal requests to exercise pagination and every status —
  - at least **21** in `pending` (≥ 2 pages at `per_page` 20),
  - at least one each in `approved`, `rejected`, `paid`,
  - at least one row with an unusual/empty `payment_details` and one with a large `amount`.
- An `admin` test account (from Phase 1).

## Setup

```bash
cp .env.example .env
# VITE_API_BASE_URL=https://<your-host>/api/v1   (same var as Phase 1)
npm install
npm run dev            # http://localhost:5173  → sign in, open /withdrawals (sidebar: "طلبات السحب")
```

## Automated checks

```bash
npm run test           # Vitest watch (unit + integration + a11y)
npm run test:run       # single pass, for CI
npm run build          # tsc + vite build must pass
```

| Suite | File | Covers |
|---|---|---|
| Pagination math | `tests/unit/withdrawalsPagination.test.ts` | `totalPages` / `clampPage` — exact multiple, remainder, zero, beyond-range (FR-014/015/016) |
| Formatting & filter guard | `tests/unit/withdrawalsFormat.test.ts` | `formatAmount` / `formatDateTime` placeholders (FR-002/004), `isValidStatusFilter` (FR-012) |
| Action outcome classifier | `tests/unit/withdrawalsOutcome.test.ts` | 200 / 404 / 422 / 0 / 5xx → `ActionOutcome` (data-model §6) |
| List / filter / pager | `tests/integration/withdrawals-list.test.tsx` | US1 AC1–6, FR-001–016, FR-035, SC-001/006/007/010 |
| Approve | `tests/integration/withdrawals-approve.test.tsx` | US2 AC1–6, FR-017–020, FR-029–033, SC-002/004/005 |
| Reject | `tests/integration/withdrawals-reject.test.tsx` | US3 AC1–6, FR-021–024, SC-003 |
| Mark Paid | `tests/integration/withdrawals-mark-paid.test.tsx` | US4 AC1–6, FR-025–028 |
| Session loss | `tests/integration/withdrawals-session.test.tsx` | FR-034 (401 on list or any action → `/login`) |
| Withdrawals a11y (axe) | `tests/a11y/withdrawals-a11y.test.tsx` | FR-040, SC-009 (automated portion) |

> `fetchMock` keys include the query string — tests assert the hook builds `GET /admin/withdrawals?page=1` for the `all` filter and `GET /admin/withdrawals?status=pending&page=1` otherwise. Post-action re-fetch is exercised with **ordered replies** on the list key.
> jsdom cannot evaluate colour contrast or true focus visibility — those parts of SC-009 stay in the manual checklist below.

---

## Manual validation scenarios

Run against `npm run dev`, signed in as `admin`, on `/withdrawals`. Use the Network tab to inspect requests and bodies.

### US1 — Review the queue, filter, paginate (P1)

1. **Default filter + columns (AC1, FR-002/003/009)** — open `/withdrawals`. → The list loads showing **pending** requests (filter control marks "قيد المراجعة" active). Each row shows id, amount, payment details, a status badge (text + shape, not colour only), requested date, and a "—" in the processed-date cell.
2. **Filter switch resets to page 1 (AC2, FR-008/010/011)** — move to page 2 of pending, then choose the "الكل" (all) filter. → The list reloads at page 1; the request is `GET /admin/withdrawals?page=1` (no `status`). Repeat for approved / rejected / paid → `?status=…&page=1` each; the active option is always visibly marked.
3. **Pager (AC3, FR-013/014/015)** — with ≥ 21 pending requests, filter = pending. → "صفحة 1 من N" and the total count show; Previous is disabled. Click Next → `GET …&page=2`, new rows, Previous now enabled; on the last page Next is disabled. Only one page's rows are ever in the DOM.
4. **Empty filter (AC4, FR-005)** — pick a status with no requests (e.g. paid before any exist). → An explicit "no withdrawal requests" message for that filter, not a blank table.
5. **Loading vs empty (AC6, FR-006)** — throttle the network and reload. → A loading state shows first, distinct from the empty state.
6. **Refresh (AC5, FR-007)** — have a colleague (or curl) add or decide a request, then click Refresh. → The current filter+page reloads and reflects the change; page position is kept.
7. **Page beyond range (edge case, FR-016)** — navigate to pending page 2, then reject/approve rows until page 2 would be empty, or manually request a too-high page. → An empty result with a "العودة للصفحة الأولى" button; clicking it returns to page 1. (After an action that empties the page, the screen auto-steps back one page.)
8. **Missing fields (edge case, FR-004)** — the row with empty `payment_details` (and, if available, a malformed amount). → That cell shows "—"; the rest of the row renders and its actions still work.
9. **Queue load error (FR-006)** — set Network to Offline and reload `/withdrawals`. → A screen-level error with a Retry button; Retry after going online loads the list. If a page was already shown, a failed Refresh keeps it and shows a toast instead.
10. **Non-admin (FR-035)** — sign in as a non-admin (or drop the role). → `/withdrawals` is not reachable; the admin shell redirects as for every other admin route.

### US2 — Approve a pending request (P2)

1. **Approve only on pending (AC-, FR-017)** — inspect an approved / rejected / paid row. → No Approve button.
2. **Confirm required + cancel (AC6, FR-018)** — click Approve, then Cancel (or press `Esc`). → No `POST …/approve` in Network; the row is unchanged.
3. **Approve happy path (AC1, FR-019, SC-002)** — click Approve → Confirm. → One `POST /admin/withdrawals/{id}/approve` with the bearer header and **no body**; a follow-up `GET /admin/withdrawals?…` re-fetches the page; the row now shows status "تمت الموافقة" and a processed date; a success toast shows the server message ("Withdrawal request approved.").
4. **In-flight lock (AC2, FR-020, SC-005)** — throttle the network, Approve → Confirm, then hammer the row's buttons. → The row's action buttons are disabled with a progress indicator; exactly one `POST` goes out.
5. **Already decided elsewhere (AC3, FR-029, SC-004)** — before confirming, have another client decide the same request; then Confirm. → `422`; a toast shows the server's message; the page re-fetches and the row reflects its real status. No "success" is shown.
6. **Not found (AC4, FR-030)** — delete the request server-side, then Confirm. → `404`; "تعذّر العثور على الطلب." toast; the page re-fetches.
7. **Transient failure (AC5, FR-031)** — go Offline, Confirm. → The row is unchanged; a retryable "تعذّر إتمام العملية. حاول مرة أخرى." toast; buttons re-enabled; no local "approved" state; no re-fetch.

### US3 — Reject a pending request (P3)

1. **Reject only on pending (FR-021)** — non-pending rows show no Reject button.
2. **Confirm-only, no reason (AC1, FR-022)** — click Reject. → The confirm dialog has **no text field**; Confirm / Cancel only. Cancel/`Esc` sends nothing.
3. **Reject happy path (AC1, FR-023)** — Reject → Confirm. → One `POST /admin/withdrawals/{id}/reject`, **no body**; page re-fetches; row shows "مرفوض" with a processed date; success toast = server message.
4. **Terminal row (AC6, US4 AC2)** — the just-rejected row (and any paid row). → No Approve, Reject, or Mark Paid.
5. **Transient failure (AC4, FR-024)** — go Offline, Confirm. → Row unchanged; retryable toast; no re-fetch.
6. **In-flight lock (AC2)** — throttle, Reject → Confirm, hammer buttons → one request; row buttons disabled.

### US4 — Mark an approved request paid (P4)

1. **Mark Paid only on approved (AC2, FR-025)** — pending / rejected / paid rows show no Mark Paid button; an approved row shows exactly that one.
2. **Confirm required (AC6, FR-026)** — Mark Paid → Cancel. → No `POST …/mark-paid`; row unchanged.
3. **Mark Paid happy path (AC1, FR-027)** — Mark Paid → Confirm. → One `POST /admin/withdrawals/{id}/mark-paid`, **no body**; page re-fetches; row shows "مدفوع"; success toast = "Withdrawal request marked paid."
4. **Not approved anymore (AC3, FR-029)** — have another client mark it paid first, then Confirm. → `422` "request is not in approved status"; that message toasts; the page re-fetches and the row shows "مدفوع".
5. **Not found (AC4, FR-030)** — delete server-side, Confirm → `404`; not-found toast; re-fetch.
6. **Transient failure (AC5, FR-028/031)** — Offline, Confirm → row unchanged; retryable toast.

### Session loss (FR-034)

1. On `/withdrawals`, revoke the token server-side (or corrupt `tbk.admin.auth.token` in DevTools), then trigger any of the four calls (Refresh, page change, or an action). → `401` → the Phase 1 handler clears the session and redirects to `/login`; no broken view.

### Sensitive payment details (FR-038, SC-008)

1. Browse several pages, then navigate away from `/withdrawals` (e.g. to `/dashboard`).
2. DevTools → Application → Local/Session Storage, IndexedDB, Cache Storage: **no** entry holds a withdrawal row, page payload, or `payment_details` string written by the dashboard.
3. Console/Network logs contain no `payment_details` values or amounts.

### Accessibility — WCAG 2.1 AA (FR-040, SC-009)

Automated: `tests/a11y/withdrawals-a11y.test.tsx` must report **zero** axe violations on the list/table, the status filter, the pager, the confirm dialog, the empty state, and the error state.

Manual sign-off (keyboard only + a screen reader — VoiceOver / NVDA):

- [ ] Tab reaches the filter control, every row's action buttons, and the pager in a sensible order; visible focus ring throughout.
- [ ] The status filter is a labelled group; the active option is announced as selected.
- [ ] The table exposes column headers programmatically; each data cell is associated with its header.
- [ ] Status is distinguishable without colour (badge text + shape/icon).
- [ ] `ConfirmDialog`: focus moves into the dialog on open, is trapped, and returns to the triggering button on close; `Esc` cancels with no request; the confirm button is reachable and labelled.
- [ ] Success / invalid-transition / not-found / retry toasts are announced via the `aria-live` region without moving the pointer.
- [ ] The "back to first page" affordance is keyboard reachable and labelled.
- [ ] Colour contrast of buttons, badges, toast text, and the "—" placeholder meets AA (check brand red `#7a0d0d` and status colours against their backgrounds).

---

## Definition of done for this feature

- All Vitest suites green; `npm run test:run` and `npm run build` clean.
- Every manual scenario above passes against a real Phase 4 backend.
- The a11y manual checklist is fully ticked and `vitest-axe` shows zero violations.
- `/withdrawals` renders `WithdrawalsPage` inside `<RequireAdmin>`; the sidebar has a "طلبات السحب" entry.
- `src/cooks/DialogShell.tsx` is a one-line re-export of `src/shared/DialogShell.tsx`; no Phase 2 test changed.
- No feature module reads the bearer token directly; every call goes through `authedRequest`.
- The three action calls send `POST` with no body; the list call omits `status` for the `all` filter.
- No withdrawal row, page payload, or `payment_details` value is written to any dashboard storage; amounts and payment details are absent from logs.
