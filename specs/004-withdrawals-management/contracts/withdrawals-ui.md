# Contract: Withdrawals UI module (internal surface)

Feature: `004-withdrawals-management`. Defines the internal seams other code and tests depend on: the promoted shared modal shell, the feature hook, the API wrappers, the pure helpers, and the component props. Names are indicative; behaviour is the contract. The Phase 1 `authedRequest` / `setTokenProvider` / `unauthorizedHandler` seam is consumed **unchanged** — see `specs/002-cook-applications-review/contracts/cook-review-ui.md` for its contract.

---

## 0. `src/shared/DialogShell.tsx` — promoted from `src/cooks/` (R4)

```ts
// MOVED verbatim from src/cooks/DialogShell.tsx
export default function DialogShell(props: {
  label: string
  onDismiss: () => void
  children: React.ReactNode
}): JSX.Element
// Portal to <body>, backdrop, role="dialog" + aria-modal, aria-label={label},
// dir="rtl", Esc to dismiss, lightweight focus trap, focus restore to the
// pre-open element. No feature-specific logic.
```

`src/cooks/DialogShell.tsx` becomes exactly:

```ts
export { default } from '../shared/DialogShell'
```

No Phase 2 source or test changes. (Phase 3, when built, should also import `DialogShell` from `src/shared/`.)

---

## 1. `src/withdrawals/types.ts`

```ts
export type WithdrawalStatus = 'pending' | 'approved' | 'rejected' | 'paid'

export interface Withdrawal {
  id: number
  amount: number
  payment_details: string
  status: WithdrawalStatus
  requested_at: string          // ISO 8601
  processed_at: string | null   // ISO 8601, null while pending
}

export interface WithdrawalPage {
  items: Withdrawal[]
  page: number
  per_page: number
  total: number
}

export type StatusFilter = 'all' | WithdrawalStatus

export type RowStatus = 'idle' | 'confirming' | 'submitting'

export type ActionKind = 'approve' | 'reject' | 'mark_paid'

export type ActionOutcome =
  | { ok: true; message: string }
  | { ok: false; reason: 'invalid_transition'; message: string }
  | { ok: false; reason: 'not_found' }
  | { ok: false; reason: 'transient' }
```

---

## 2. `src/withdrawals/withdrawalsApi.ts`

```ts
import { authedRequest } from '../api/httpClient'
import type { Withdrawal, WithdrawalPage, StatusFilter } from './types'

/** GET /admin/withdrawals — `status` omitted from the query when filter === 'all'. */
export function listWithdrawals(
  params: { filter: StatusFilter; page: number },
  signal?: AbortSignal,
): Promise<WithdrawalPage>

/** POST /admin/withdrawals/{id}/approve — no body. Propagates ApiError. */
export function approveWithdrawal(id: number): Promise<Withdrawal>

/** POST /admin/withdrawals/{id}/reject — no body. Propagates ApiError. */
export function rejectWithdrawal(id: number): Promise<Withdrawal>

/** POST /admin/withdrawals/{id}/mark-paid — no body. Propagates ApiError. */
export function markWithdrawalPaid(id: number): Promise<Withdrawal>
```

Rules:
- `listWithdrawals` builds `/admin/withdrawals?page=<n>` for `filter === 'all'`, else `/admin/withdrawals?status=<filter>&page=<n>`. `page` is always present.
- The three action functions call `authedRequest(path, { method: 'POST' })` with **no `body`** key.
- All four propagate `ApiError` unchanged (status `0` for network/parse). None handle `401` — the shared `unauthorizedHandler` fires inside `apiRequest`.

---

## 3. `src/withdrawals/pagination.ts` (pure)

```ts
export function totalPages(total: number, perPage: number): number
// Math.max(1, Math.ceil(total / perPage)); perPage <= 0 → 1

export function clampPage(page: number, pages: number): number
// Math.min(Math.max(1, Math.floor(page)), Math.max(1, pages))
```

---

## 4. `src/withdrawals/format.ts` (pure)

```ts
export function formatAmount(n: number | null | undefined): string
// finite number → localized amount (e.g. "٥٠٠٫٠٠" or "500.00" per dashboard convention);
// null/undefined/NaN → PLACEHOLDER ("—")

export function formatDateTime(iso: string | null | undefined): string
// valid ISO → dashboard-standard date/time; null/undefined/invalid → PLACEHOLDER ("—")

export function isValidStatusFilter(v: unknown): v is StatusFilter
// true only for 'all' | 'pending' | 'approved' | 'rejected' | 'paid'

export const PLACEHOLDER = '—'
```

---

## 5. `src/withdrawals/useWithdrawals.ts`

```ts
export interface UseWithdrawals {
  status: 'loading' | 'ready' | 'error'
  page: WithdrawalPage | null       // current page payload; null only before the first successful load
  filter: StatusFilter
  pageNum: number                   // requested page (may differ from page.page during a load)
  totalPages: number                // derived; 1 when no page yet
  beyondRange: boolean              // page.items empty && pageNum > 1

  rowState: (id: number) => RowStatus
  confirming: { id: number; kind: ActionKind } | null

  setFilter: (next: StatusFilter) => void   // also resets pageNum to 1
  setPage: (n: number) => void              // clamped to [1, totalPages]
  refresh: () => void                       // re-load current filter + page

  openConfirm: (id: number, kind: ActionKind) => void
  closeConfirm: (id: number) => void
  approve: (id: number) => Promise<ActionOutcome>
  reject: (id: number) => Promise<ActionOutcome>
  markPaid: (id: number) => Promise<ActionOutcome>
}
```

Behaviour:
- Mounts with `filter='pending'`, `pageNum=1`, `status='loading'`; loads immediately (FR-009).
- `setFilter` sets the filter, resets `pageNum=1`, reloads (FR-011). `setPage` clamps and reloads (FR-013/015).
- Load success → `page = payload`, `status='ready'`. Load failure with a page already shown → keep it, stay `ready` (caller may toast). Load failure with nothing shown → `status='error'`.
- `approve` / `reject` / `markPaid` → set `rowState(id)='submitting'`, call the matching API fn, classify per data-model §6, then:
  - `ok` or `invalid_transition` or `not_found` → `refresh()` the current filter+page; if the refreshed page has `items: []` and `pageNum > 1`, `setPage(min(pageNum, totalPages))` once.
  - `transient` → no reload; `rowState(id)` back to `idle`.
- Exactly one in-flight action request per row; re-entrant calls while `submitting` are ignored (FR-020/024/028).
- Never throws for `401`; that is handled upstream.

---

## 6. Components

```ts
// WithdrawalsPage.tsx — default export, route element for /withdrawals
// Renders: header (title + refresh), <StatusFilter>, one of {loading | error+retry | empty | <WithdrawalsTable>+<Pager>},
// an aria-live="polite" role="status" toast region + transient bubble (~6s), and one <ConfirmDialog> from `confirming`.

export interface StatusFilterProps {
  value: StatusFilter
  onChange: (next: StatusFilter) => void
  // renders all|pending|approved|rejected|paid; active option visibly marked (FR-010);
  // keyboard operable; labelled group (FR-040)
}

export interface WithdrawalsTableProps {
  items: Withdrawal[]
  rowState: (id: number) => RowStatus
  onAction: (id: number, kind: ActionKind) => void   // opens the confirm dialog
  // semantic <table>; <th scope="col"> for #, amount, payment details, status, requested, processed, actions
}

export interface WithdrawalRowProps {
  item: Withdrawal
  state: RowStatus
  onAction: (kind: ActionKind) => void
  // cells via format.ts; <StatusBadge>; actions by status:
  //   pending → Approve + Reject; approved → Mark Paid; rejected/paid → none
  // while state==='submitting' the row's action buttons are disabled + aria-busy (FR-020/024/028)
}

export interface StatusBadgeProps {
  status: WithdrawalStatus
  // label text + a shape/icon; MUST NOT rely on colour alone (FR-003 / FR-040 / SC-003)
}

export interface PagerProps {
  page: number
  totalPages: number
  total: number
  beyondRange: boolean
  onPage: (n: number) => void
  // shows "صفحة {page} من {totalPages}" + total; Prev disabled page<=1; Next disabled page>=totalPages (FR-014/015);
  // beyondRange → single "back to first page" button → onPage(1) (FR-016)
}

export interface ConfirmDialogProps {
  kind: ActionKind
  busy: boolean
  onConfirm: () => void
  onCancel: () => void
  // built on src/shared/DialogShell; confirm-only, NO text input; confirm button auto-focus;
  // both buttons disabled while busy; Esc / Cancel / backdrop → onCancel, nothing sent (FR-018/022/026)
}
```

---

## 7. `src/withdrawals/messages.ts` (Arabic, RTL — provisional copy)

Keys (indicative):

```
pageTitle, refresh, loading, queueError, retry,
emptyFor(filter), backToFirstPage,
colId, colAmount, colPaymentDetails, colStatus, colRequestedAt, colProcessedAt, colActions,
filterAll, filterPending, filterApproved, filterRejected, filterPaid,
statusPending, statusApproved, statusRejected, statusPaid,
actionApprove, actionReject, actionMarkPaid,
confirmApproveTitle, confirmApproveBody, confirmApproveCta,
confirmRejectTitle,  confirmRejectBody,  confirmRejectCta,
confirmMarkPaidTitle, confirmMarkPaidBody, confirmMarkPaidCta,
cancel,
pagerPosition(page, pages), pagerTotal(n),
notFoundToast, actionRetryToast,
// success + invalid_transition toasts use the envelope `message` verbatim
```

---

## 8. Test helpers (added to existing files)

```ts
// tests/helpers/fixtures.ts
export function withdrawal(overrides?: Partial<Withdrawal>): Withdrawal
// defaults: sequential id, amount 500, payment_details "InstaPay: 0100…", status 'pending',
//           requested_at fixed ISO, processed_at null

export function withdrawalPage(
  items: Withdrawal[],
  meta?: { page?: number; per_page?: number; total?: number },
): WithdrawalPage
// defaults: page 1, per_page 20, total = items.length

// tests/helpers/harness.tsx
export function renderAtWithdrawals(fm: FetchMock, opts?: { seedMe?: boolean }): RenderResult
// seeds stored admin token + profile, (default) GET /auth/me reply; renders <WithdrawalsPage/>
// inside <RequireAdmin> at initialEntries={['/withdrawals']}. The test configures the
// GET /admin/withdrawals?... replies on `fm` before calling.
```
