import type { DateRangeError, OrderFilters } from './types'

/**
 * Build the `GET /admin/orders` query string (leading `?`). Params are appended
 * in a fixed order so `fetchMock` keys are deterministic:
 *   status (only when not 'all') · city_id (only when set) ·
 *   placed_from (only when set) · placed_to (only when set) · page (always).
 */
export function buildOrdersQuery(filters: OrderFilters, page: number): string {
  const sp = new URLSearchParams()
  if (filters.status !== 'all') sp.set('status', filters.status)
  if (filters.cityId != null) sp.set('city_id', String(filters.cityId))
  if (filters.from != null) sp.set('placed_from', filters.from)
  if (filters.to != null) sp.set('placed_to', filters.to)
  sp.set('page', String(Math.max(1, Math.trunc(page) || 1)))
  return `?${sp.toString()}`
}

/**
 * Local pre-check for the placed-date range (FR-014). Returns an error only when
 * both ends are set and `from` is strictly later than `to` (lexicographic
 * compare is valid for `YYYY-MM-DD`); otherwise `null`.
 */
export function validateDateRange(from: string | null, to: string | null): DateRangeError {
  if (from != null && to != null && from > to) return { code: 'from_after_to' }
  return null
}
