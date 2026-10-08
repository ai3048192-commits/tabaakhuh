import { authedRequest } from '../api/httpClient'
import type { Deposit, DepositFilter, DepositPage } from './types'

/** `GET /admin/deposits` — one page of the queue. */
export function listDeposits(
  { filter, page }: { filter: DepositFilter; page: number },
  signal?: AbortSignal,
): Promise<DepositPage> {
  const sp = new URLSearchParams()
  if (filter !== 'all') sp.set('status', filter)
  sp.set('page', String(Math.max(1, Math.trunc(page) || 1)))
  return authedRequest<DepositPage>(`/admin/deposits?${sp.toString()}`, { signal })
}

/** `POST /admin/deposits/{id}/verify` — the transfer is in the platform's account. */
export function verifyDeposit(id: number): Promise<Deposit> {
  return authedRequest<Deposit>(`/admin/deposits/${id}/verify`, { method: 'POST' })
}

/** `POST /admin/deposits/{id}/reject` — the reason is shown to the customer. */
export function rejectDeposit(id: number, reason: string): Promise<Deposit> {
  return authedRequest<Deposit>(`/admin/deposits/${id}/reject`, { method: 'POST', body: { reason } })
}

/** `POST /admin/deposits/{id}/mark-paid` — the money was sent on to the cook. */
export function markDepositPaid(id: number, note: string | null): Promise<Deposit> {
  return authedRequest<Deposit>(`/admin/deposits/${id}/mark-paid`, {
    method: 'POST',
    body: note ? { note } : {},
  })
}
