/**
 * Custom-order deposit shapes — `GET /admin/deposits` (backend specs/068).
 * The customer pays the COOK directly and uploads a screenshot; the cook
 * confirms receipt in her own app. The admin only monitors (read-only).
 */

export type DepositStatus = 'awaiting_payment' | 'submitted' | 'rejected' | 'confirmed'

export type DepositMethod = 'vodafone_cash' | 'instapay'

/** A payment account: the cook's Vodafone Cash wallet and/or InstaPay address. */
export interface PaymentAccounts {
  vodafone_cash: string | null
  instapay: string | null
}

/** The `deposit` object inside one item. */
export interface DepositInfo {
  id: number
  order_id: number
  amount: number
  /** The deposit as a share of the food price (the API calls it `percentage`). */
  percentage: number
  status: DepositStatus
  method: DepositMethod | null
  rejection_reason: string | null
  /** Rejections so far; `>= 2` while not confirmed = a dispute. */
  reject_count: number
  /** Short-lived signed link to the customer's transfer screenshot. */
  proof_image_url: string | null
  /** ISO 8601. */
  submitted_at: string | null
  confirmed_at: string | null
  cook_name: string | null
  /** The account the customer was told to pay (snapshot at deposit creation). */
  pay_to: PaymentAccounts | null
}

/** One element of `data.items`. */
export interface Deposit {
  deposit: DepositInfo
  order_number: string | null
  /** The order's own status — `cancelled` after a confirmed deposit needs a manual refund follow-up. */
  order_status: string
  order_subtotal: number
  order_total: number
  customer_name: string | null
  customer_phone: string | null
  cook_name: string | null
  cook_phone: string | null
}

export interface DepositCounts {
  awaiting_payment?: number
  submitted?: number
  confirmed?: number
  rejected?: number
  disputed?: number
}

export interface DepositPage {
  items: Deposit[]
  page: number
  per_page: number
  total: number
  /** Deposits per status. */
  counts: DepositCounts
  /** Sum of the confirmed deposits' amounts. */
  confirmed_total: number
}

export type DepositsStatus = 'loading' | 'ready' | 'error'
