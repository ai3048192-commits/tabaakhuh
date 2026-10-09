import { authedRequest } from '../api/httpClient'
import type { DepositPage } from './types'

/**
 * `GET /admin/deposits` — one page of the (read-only) list: every deposit a
 * customer has sent to a cook, newest activity first. No filter — one that
 * hasn't been paid yet isn't listed.
 */
export function listDeposits(page: number, signal?: AbortSignal): Promise<DepositPage> {
  const n = Math.max(1, Math.trunc(page) || 1)
  return authedRequest<DepositPage>(`/admin/deposits?page=${n}`, { signal })
}
