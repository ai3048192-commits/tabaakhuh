import { authedRequest } from '../api/httpClient'
import type { RawOverview } from './types'

/**
 * `GET /admin/reports/overview` → the live snapshot (`users_by_role`,
 * `orders_by_status`, `total_sales_revenue`). No body, no query string, no
 * `404` / `422` — the endpoint is a singleton computed view. Propagates
 * `ApiError`; a `401` is handled upstream by the shared `unauthorizedHandler`
 * and never observed here.
 */
export function getOverview(signal?: AbortSignal): Promise<RawOverview> {
  return authedRequest<RawOverview>('/admin/reports/overview', { signal })
}
