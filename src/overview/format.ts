/**
 * Pure display formatting for the overview figures. The locale is pinned to
 * `en-US` so every figure renders in Western/Latin digits with `,` thousands
 * separators regardless of the viewer's locale (spec Clarifications Q4).
 */

/** Kept identical to `overviewMessages.currencyUnit`. */
const CURRENCY_UNIT = 'ج.م'

const countFmt = new Intl.NumberFormat('en-US')
const currencyFmt = new Intl.NumberFormat('en-US', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

/** A count: whole number, Western digits, thousands separators. `1240` → `"1,240"`. */
export function formatCount(n: number): string {
  return countFmt.format(Math.trunc(Math.max(0, n)))
}

/** The revenue total: two decimals + unit. `154300` → `"154,300.00 ج.م"`. */
export function formatCurrency(n: number): string {
  return `${currencyFmt.format(Math.max(0, n))} ${CURRENCY_UNIT}`
}

/** A retrieval time as a zero-padded 24-hour `"HH:MM"` in Western digits. */
export function formatTime(d: Date): string {
  const hh = String(d.getHours()).padStart(2, '0')
  const mm = String(d.getMinutes()).padStart(2, '0')
  return `${hh}:${mm}`
}
