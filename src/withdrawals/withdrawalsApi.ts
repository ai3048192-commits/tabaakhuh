import { authedRequest } from '../api/httpClient'
import type { StatusFilter, Withdrawal, WithdrawalPage } from './types'

/**
 * `GET /admin/withdrawals` — one page. `status` is sent only when the filter is
 * not `'all'`; `page` is always sent. Returns `data` (the `WithdrawalPage`).
 */
export function listWithdrawals(
  { filter, page }: { filter: StatusFilter; page: number },
  signal?: AbortSignal,
): Promise<WithdrawalPage> {
  const sp = new URLSearchParams()
  if (filter !== 'all') sp.set('status', filter)
  sp.set('page', String(Math.max(1, Math.trunc(page) || 1)))
  return authedRequest<WithdrawalPage>(`/admin/withdrawals?${sp.toString()}`, { signal })
}

/** `POST /admin/withdrawals/{id}/approve` — no body. Propagates `ApiError`. */
export function approveWithdrawal(id: number): Promise<Withdrawal> {
  return authedRequest<Withdrawal>(`/admin/withdrawals/${id}/approve`, { method: 'POST' })
}

/** `POST /admin/withdrawals/{id}/reject` — no body (no reason). Propagates `ApiError`. */
export function rejectWithdrawal(id: number): Promise<Withdrawal> {
  return authedRequest<Withdrawal>(`/admin/withdrawals/${id}/reject`, { method: 'POST' })
}

/** `POST /admin/withdrawals/{id}/mark-paid` — no body. Propagates `ApiError`. */
export function markWithdrawalPaid(id: number): Promise<Withdrawal> {
  return authedRequest<Withdrawal>(`/admin/withdrawals/${id}/mark-paid`, { method: 'POST' })
}
