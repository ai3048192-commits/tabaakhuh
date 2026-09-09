import type { OrderFilters, OrderStatus } from './types'
import { ORDER_STATUSES } from './orderStatus'
import { daysAgoCairo } from './cairoDates'

const YMD = /^\d{4}-\d{2}-\d{2}$/

/** Shape-valid AND a real calendar date (rejects e.g. `2026-13-99`). */
function isValidYmd(v: string | null): v is string {
  if (v == null || !YMD.test(v)) return false
  const [y, m, d] = v.split('-').map(Number)
  const dt = new Date(Date.UTC(y, m - 1, d))
  return (
    dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d
  )
}

/** Default `placed_from` when the URL carries none — the last 30 days (Africa/Cairo). */
export function defaultFrom(): string {
  return daysAgoCairo(30)
}

/**
 * Read `{ filters, page }` from the URL query string. An empty query string
 * yields the default view: all statuses, no city, `from` = 30 days ago, no `to`,
 * page 1. Unknown / malformed params fall back to their default (FR-010, FR-036).
 */
export function filtersFromSearchParams(sp: URLSearchParams): {
  filters: OrderFilters
  page: number
} {
  const rawStatus = sp.get('status')
  const status: OrderStatus | 'all' =
    rawStatus != null && (ORDER_STATUSES as readonly string[]).includes(rawStatus)
      ? (rawStatus as OrderStatus)
      : 'all'

  const rawCity = Number(sp.get('city'))
  const cityId = Number.isInteger(rawCity) && rawCity > 0 ? rawCity : null

  const rawFrom = sp.get('from')
  const from = isValidYmd(rawFrom) ? rawFrom : defaultFrom()

  const rawTo = sp.get('to')
  const to = isValidYmd(rawTo) ? rawTo : null

  const page = Math.max(1, Math.trunc(Number(sp.get('page'))) || 1)

  return { filters: { status, cityId, from, to }, page }
}

/**
 * Inverse of {@link filtersFromSearchParams}, omitting defaults so a clean entry
 * stays clean and a filtered entry round-trips exactly (SC-017). `status` is
 * omitted for 'all', `city` for null, `from` when it equals the 30-day default,
 * `to` for null, `page` for 1.
 */
export function filtersToSearchParams(filters: OrderFilters, page: number): URLSearchParams {
  const sp = new URLSearchParams()
  if (filters.status !== 'all') sp.set('status', filters.status)
  if (filters.cityId != null) sp.set('city', String(filters.cityId))
  if (filters.from != null && filters.from !== defaultFrom()) sp.set('from', filters.from)
  if (filters.to != null) sp.set('to', filters.to)
  if (page > 1) sp.set('page', String(page))
  return sp
}
