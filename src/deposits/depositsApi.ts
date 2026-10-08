import { authedRequest } from '../api/httpClient'
import type { DepositFilter, DepositPage } from './types'

/** `GET /admin/deposits` — one page of the (read-only) monitoring list. */
export function listDeposits(
  { filter, page }: { filter: DepositFilter; page: number },
  signal?: AbortSignal,
): Promise<DepositPage> {
  const sp = new URLSearchParams()
  if (filter === 'disputed') sp.set('disputed', '1')
  else sp.set('status', filter)
  sp.set('page', String(Math.max(1, Math.trunc(page) || 1)))
  return authedRequest<DepositPage>(`/admin/deposits?${sp.toString()}`, { signal })
}
