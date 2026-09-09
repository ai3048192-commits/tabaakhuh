/**
 * Withdrawals Management shapes. Field names mirror `admin-dashboard-api.md`
 * Phase 4 (`GET /admin/withdrawals` + the three action endpoints).
 */

export type WithdrawalStatus = 'pending' | 'approved' | 'rejected' | 'paid'

/** One withdrawal request, from each element of `data.items`. */
export interface Withdrawal {
  id: number
  amount: number
  payment_details: string
  status: WithdrawalStatus
  /** ISO 8601. */
  requested_at: string
  /** ISO 8601, or `null` while still `pending`. */
  processed_at: string | null
}

/** The paginated `data` envelope. `per_page` is documented 20; read it, never hard-code. */
export interface WithdrawalPage {
  items: Withdrawal[]
  page: number
  per_page: number
  total: number
}

/** The status filter — `'all'` omits the `status` query param. */
export type StatusFilter = 'all' | WithdrawalStatus

/** Per-row control state; absent ⇒ `idle`. */
export type RowStatus = 'idle' | 'confirming' | 'submitting'

/** Which action a confirm dialog / request represents. */
export type ActionKind = 'approve' | 'reject' | 'mark_paid'

/** Result of an approve / reject / mark-paid attempt (see data-model.md §6). */
export type ActionOutcome =
  | { ok: true; message: string }
  | { ok: false; reason: 'invalid_transition'; message: string }
  | { ok: false; reason: 'not_found' }
  | { ok: false; reason: 'transient' }

/** Screen-level load status. */
export type WithdrawalsStatus = 'loading' | 'ready' | 'error'
