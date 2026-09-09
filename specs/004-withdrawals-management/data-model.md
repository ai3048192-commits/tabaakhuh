# Phase 1 Data Model: Withdrawals Management

Feature: `004-withdrawals-management` · Date: 2026-09-07

Client-only feature. "Entities" are the in-memory shapes the dashboard holds — no database tables, no persistence. Field names mirror the backend payloads in `admin-dashboard-api.md` Phase 4.

---

## 1. Withdrawal

One withdrawal request, from each element of `data.items` in `GET /admin/withdrawals`.

| Field | Type | Source | Notes |
|---|---|---|---|
| `id` | `number` | `items[].id` | Identifies the request in `POST /admin/withdrawals/{id}/approve\|reject\|mark-paid`. Shown as the row's `#`. |
| `amount` | `number` | `items[].amount` | Monetary value, shown via `formatAmount`. Missing / `NaN` → neutral placeholder (FR-004). |
| `payment_details` | `string` | `items[].payment_details` | Free text describing where/how to send the money (e.g. `"InstaPay: 01000000000"`). Sensitive (FR-038). Empty / missing → neutral placeholder (FR-004). |
| `status` | `WithdrawalStatus` | `items[].status` | `pending \| approved \| rejected \| paid`. Drives the badge and the row's action set. |
| `requested_at` | `string` (ISO 8601) | `items[].requested_at` | Shown as the requested date via `formatDateTime`. Backend list order key (client does not re-sort). |
| `processed_at` | `string \| null` (ISO 8601) | `items[].processed_at` | `null` until the request leaves `pending`. `null` → "—" placeholder (FR-002). Populated in the 200 response of approve/reject and shown after the post-action re-fetch. |

**Rules**
- Read-only in the list. The only mutations are the approve / reject / mark-paid calls; their 200 response returns the updated request but the client **discards it** and re-fetches the current filter+page instead (FR-007 / FR-032).
- The client does not re-order or client-filter `items` — the backend returns the queue order and applies `?status=`.
- No field is required for the row to render; any missing/malformed field degrades to a placeholder for that cell only (FR-004).

---

## 2. WithdrawalStatus & the lifecycle

```
pending ──approve──▶ approved ──mark-paid──▶ paid   (terminal)
   └────reject────▶ rejected                        (terminal)
```

| Status | Arabic label (provisional) | Row actions offered |
|---|---|---|
| `pending` | قيد المراجعة | Approve, Reject |
| `approved` | تمت الموافقة | Mark Paid |
| `rejected` | مرفوض | — (none) |
| `paid` | مدفوع | — (none) |

- The action set is a **pure function of `status`** (R5). No other signal gates it on the client; the backend is the source of truth and returns `422` if a transition is no longer valid (FR-029).
- `rejected` and `paid` are terminal — no action, ever (US3 AC6, US4 AC2).

---

## 3. WithdrawalPage (in-memory, `useWithdrawals`)

The current page payload, held verbatim from `data` in `GET /admin/withdrawals`.

| Field | Type | Source | Notes |
|---|---|---|---|
| `items` | `Withdrawal[]` | `data.items` | The rows for the current filter+page. `[]` for an empty filter or a page beyond range. |
| `page` | `number` | `data.page` | Echoed current page (1-based). |
| `per_page` | `number` | `data.per_page` | Page size the backend applied (documented 20; read, not assumed — FR-013). |
| `total` | `number` | `data.total` | Count of requests matching the active filter. Drives `total` display and `totalPages` (FR-014). |

Derived, not stored:
- `totalPages(pageData)` → `Math.max(1, Math.ceil(total / per_page))` (`src/withdrawals/pagination.ts`).
- `beyondRange(pageData)` → `items.length === 0 && page > 1` → triggers the "back to first page" affordance (FR-016).

---

## 4. StatusFilter (in-memory, `useWithdrawals`)

`type StatusFilter = 'all' | WithdrawalStatus`.

| Value | Query effect | Default? |
|---|---|---|
| `all` | `status` param **omitted** | no |
| `pending` | `?status=pending` | **yes** (FR-009) |
| `approved` | `?status=approved` | no |
| `rejected` | `?status=rejected` | no |
| `paid` | `?status=paid` | no |

**Rules**
- Only these five values are selectable (FR-012); `isValidStatusFilter(v)` guards any external/stored value and falls back to `'pending'`.
- `setFilter(next)` also sets `page = 1` (FR-011) before loading.
- The active value is visibly indicated in the control (FR-010).

---

## 5. RowStatus (in-memory, per withdrawal id)

`Map<number, 'confirming' | 'submitting'>` in the hook; drives one row's action controls. Absent ⇒ `idle`.

| Value | Meaning | UI |
|---|---|---|
| `idle` | default | status-appropriate action buttons enabled |
| `confirming` | `ConfirmDialog` open for this row | dialog modal; row controls inert behind it |
| `submitting` | an action request is in flight for this row | that row's action buttons disabled + progress shown (FR-020 / FR-024 / FR-028) |

There is no per-row `error` state — a transient failure returns the row to `idle` with the page unchanged and shows a retryable toast (FR-031). On a successful or reconciled action the map key is cleared and the page is re-fetched.

---

## 6. ActionKind & ActionOutcome

```ts
type ActionKind = 'approve' | 'reject' | 'mark_paid'
```

Discriminated union the hook produces from the API result; the page maps it to a toast.

| Variant | Trigger | Effect | Toast |
|---|---|---|---|
| `{ ok: true, message }` | 200 | re-fetch current filter+page (then clamp if the page went empty) | success — envelope `message` verbatim (FR-019 / FR-023 / FR-027) |
| `{ ok: false, reason: 'invalid_transition', message }` | `ApiError.status === 422` | re-fetch current filter+page | envelope `message` verbatim ("current status does not allow…" / "not in approved status") (FR-029) |
| `{ ok: false, reason: 'not_found' }` | `ApiError.status === 404` | re-fetch current filter+page | fixed: "تعذّر العثور على الطلب." (FR-030) |
| `{ ok: false, reason: 'transient' }` | `ApiError.status === 0` or `>= 500` | **no** change; row → `idle` | fixed retryable: "تعذّر إتمام العملية. حاول مرة أخرى." (FR-031) |

`401` never reaches this union — handled by the Phase 1 `unauthorizedHandler` inside `apiRequest`.

---

## 7. List-load outcome (screen status)

`useWithdrawals().status: 'loading' | 'ready' | 'error'`

| Situation | status |
|---|---|
| First load in flight, nothing shown yet | `loading` |
| A page payload is in hand | `ready` (empty `items` → empty state, not `error`) |
| Load rejected and no page currently shown | `error` (screen-level, with Retry) |
| Load rejected but a page is already shown (failed refresh / filter change) | stays `ready`; a transient toast is shown, the existing page remains (mirrors Phase 2) |
| `422` on the list (invalid `status` value — unreachable from the UI) | treated as a failed load: `error` if nothing shown, else keep current page + error toast (FR-012 edge case) |

---

## Data flow (one screen open)

```
mount /withdrawals
  └─ useWithdrawals: filter='pending', page=1
        authedRequest GET /admin/withdrawals?status=pending&page=1
        → pageData = { items, page, per_page, total }
        → status='ready'; items.length === 0 → empty state (FR-005)

change filter        → setFilter(next): page=1; GET /admin/withdrawals[?status=next]&page=1   (FR-011)
change page          → setPage(n): clamp to [1, totalPages]; GET …&page=n                     (FR-013/015)
back-to-first        → setPage(1)                                                             (FR-016)

approve(id) / reject(id) / markPaid(id)
  ├─ ConfirmDialog confirm → RowStatus[id]='submitting' → authedRequest POST …/{approve|reject|mark-paid}  (no body)
  └─ outcome (§6):
       200            → toast(envelope msg) + refresh(filter,page); if page emptied & page>1 → setPage(min(page,totalPages))
       422            → toast(envelope msg) + refresh(filter,page)
       404            → toast("not found") + refresh(filter,page)
       0 / >=500      → no change; RowStatus[id]→idle; retryable toast

refresh()             → re-GET current filter+page; existing page kept on failure (FR-007)
unmount /withdrawals   → pageData, filter, page, row states all dropped (FR-038, SC-008)
any call → 401         → Phase 1 unauthorizedHandler → clearSession → /login (FR-034)
```
