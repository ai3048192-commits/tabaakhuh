import type { StatusFilter } from './types'

/** Neutral placeholder for a missing / malformed cell value (FR-004). */
export const PLACEHOLDER = '—'

const money = new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 })
const dt = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'Africa/Cairo',
  year: 'numeric',
  month: 'short',
  day: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
})

/** Money string in the dashboard's convention; non-finite → placeholder. */
export function formatAmount(n: number | null | undefined): string {
  if (typeof n !== 'number' || !Number.isFinite(n)) return PLACEHOLDER
  return `${money.format(n)} ج.م`
}

/** Date/time string (Africa/Cairo); null / invalid → placeholder. */
export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return PLACEHOLDER
  const t = Date.parse(iso)
  if (Number.isNaN(t)) return PLACEHOLDER
  return dt.format(new Date(t))
}

const FILTERS: readonly StatusFilter[] = ['all', 'pending', 'approved', 'rejected', 'paid']

/** Type guard for a persisted / external status-filter value (FR-012). */
export function isValidStatusFilter(v: unknown): v is StatusFilter {
  return typeof v === 'string' && (FILTERS as readonly string[]).includes(v)
}
