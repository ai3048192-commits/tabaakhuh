/**
 * Fixed Africa/Cairo date handling (FR-013b). Every administrator sees the same
 * "today", the same default 30-day window, and the same from/to day boundaries,
 * regardless of their device time zone. Built on `Intl.DateTimeFormat` — no date
 * library.
 */

const CAIRO = 'Africa/Cairo'
const DAY_MS = 86_400_000

const ymdFmt = new Intl.DateTimeFormat('en-CA', {
  timeZone: CAIRO,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
})

const utcYmdFmt = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'UTC',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
})

const dateFmt = new Intl.DateTimeFormat('en-GB', {
  timeZone: CAIRO,
  year: 'numeric',
  month: 'short',
  day: 'numeric',
})

const dateTimeFmt = new Intl.DateTimeFormat('en-GB', {
  timeZone: CAIRO,
  year: 'numeric',
  month: 'short',
  day: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
})

/** Today's calendar date in Africa/Cairo, `YYYY-MM-DD`. */
export function cairoToday(): string {
  return ymdFmt.format(new Date())
}

/** `n` calendar days before {@link cairoToday}, `YYYY-MM-DD`. */
export function daysAgoCairo(n: number): string {
  const [y, m, d] = cairoToday().split('-').map(Number)
  const anchor = Date.UTC(y, m - 1, d) - n * DAY_MS
  return utcYmdFmt.format(new Date(anchor))
}

/**
 * True when the range is the default "last 30 days" or wider — no `to`, and a
 * `from` that is unset or no later than 30 days ago. Gates the auto-refresh
 * (FR-009a) and the unfiltered-vs-no-match empty state.
 */
export function isDefaultOrWiderRange(from: string | null, to: string | null): boolean {
  if (to != null) return false
  return from == null || from <= daysAgoCairo(30)
}

/**
 * Format a delivery date for display, in Africa/Cairo. Accepts a plain
 * `YYYY-MM-DD` (rendered as-is, no day shift) or a full ISO 8601 instant — some
 * endpoints send `requested_delivery_date` with a time component — which is
 * converted to the Cairo calendar day rather than printed raw.
 */
export function formatOrderDate(value: string): string {
  if (value.includes('T')) {
    const t = Date.parse(value)
    if (!Number.isNaN(t)) return dateFmt.format(new Date(t))
  }
  const [y, m, d] = value.split('-').map(Number)
  if (!y || !m || !d) return value
  return dateFmt.format(new Date(Date.UTC(y, m - 1, d, 12)))
}

/** Format an ISO 8601 instant for display, in Africa/Cairo wall-clock. */
export function formatOrderDateTime(iso: string): string {
  const t = Date.parse(iso)
  if (Number.isNaN(t)) return iso
  return dateTimeFmt.format(new Date(t))
}
