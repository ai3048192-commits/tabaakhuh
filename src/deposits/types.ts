/**
 * Custom-order deposit shapes — `GET /admin/deposits` and its three action
 * endpoints (backend specs/066). The customer transfers the deposit to the
 * platform's Vodafone Cash / InstaPay account and uploads a screenshot; the
 * admin verifies it, then forwards the money to the cook.
 */

export type DepositStatus = 'awaiting_payment' | 'submitted' | 'rejected' | 'verified' | 'paid_to_cook'

export type DepositMethod = 'vodafone_cash' | 'instapay'

export interface DepositParty {
  name: string | null
  phone: string | null
}

/** One element of `data.items`. */
export interface Deposit {
  id: number
  order_id: number
  order_number: string | null
  /** The order's own status — `cancelled` means the deposit must be refunded, not forwarded. */
  order_status: string
  order_subtotal: number
  order_total: number
  amount: number
  percentage: number
  status: DepositStatus
  method: DepositMethod | null
  rejection_reason: string | null
  /** Short-lived signed link to the customer's transfer screenshot. */
  proof_image_url: string | null
  payout_note: string | null
  /** ISO 8601. */
  submitted_at: string | null
  verified_at: string | null
  paid_to_cook_at: string | null
  customer: DepositParty
  cook: DepositParty
}

export interface DepositPage {
  items: Deposit[]
  page: number
  per_page: number
  total: number
  /** Deposits per status — the tab badges. */
  counts: Partial<Record<DepositStatus, number>>
}

/** The queue tabs; `all` omits the `status` query param (everything but awaiting payment). */
export type DepositFilter = 'submitted' | 'verified' | 'paid_to_cook' | 'rejected' | 'all'

export type DepositAction = 'verify' | 'reject' | 'mark_paid'

export type ActionOutcome =
  | { ok: true }
  | { ok: false; reason: 'conflict'; message: string }
  | { ok: false; reason: 'not_found' }
  | { ok: false; reason: 'transient' }

export type DepositsStatus = 'loading' | 'ready' | 'error'
