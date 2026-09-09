import { authedRequest } from '../api/httpClient'

/**
 * Extra endpoints the rich dashboard home uses beyond `GET /admin/reports/overview`
 * (`backend-requirements.md` §ج — implemented 2026-09-08). Each call still
 * degrades gracefully: on any error the matching home section shows a note
 * instead of breaking the page.
 */

export interface OrdersDailyPoint {
  /** `YYYY-MM-DD` (Africa/Cairo bucket). */
  date: string
  count: number
}

export interface RecentCook {
  id: number
  store_name: string
  area: string | null
  city_id: number | null
  /** ISO 8601 — when the cook was approved. */
  joined_at: string
}

/** `GET /admin/reports/orders-daily?days=7` → one point per day for the home chart. */
export function getOrdersDaily(days = 7, signal?: AbortSignal): Promise<OrdersDailyPoint[]> {
  return authedRequest<OrdersDailyPoint[]>(
    `/admin/reports/orders-daily?days=${Math.max(1, Math.trunc(days) || 7)}`,
    { signal },
  )
}

/** `GET /admin/cooks/recent?limit=5` → most recently joined cooks for the home list. */
export function getRecentCooks(limit = 5, signal?: AbortSignal): Promise<RecentCook[]> {
  return authedRequest<RecentCook[]>(
    `/admin/cooks/recent?limit=${Math.max(1, Math.trunc(limit) || 5)}`,
    { signal },
  )
}
