import { describe, it, expect } from 'vitest'
import {
  cairoToday,
  daysAgoCairo,
  isDefaultOrWiderRange,
  formatOrderDate,
  formatOrderDateTime,
} from '../../src/orders/cairoDates'

// This suite proves the zone is FIXED to Africa/Cairo regardless of the host TZ.
// vitest.config sets no TZ, so the machine zone (often UTC in CI) differs from Cairo.

describe('cairoDates — fixed Africa/Cairo (FR-013b, SC-005)', () => {
  it('cairoToday() equals an independent Intl Cairo format of now', () => {
    const independent = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Africa/Cairo',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(new Date())
    expect(cairoToday()).toBe(independent)
  })

  it('daysAgoCairo(0) === cairoToday()', () => {
    expect(daysAgoCairo(0)).toBe(cairoToday())
  })

  it('daysAgoCairo(30) is exactly 30 calendar days before cairoToday()', () => {
    const [ty, tm, td] = cairoToday().split('-').map(Number)
    const [fy, fm, fd] = daysAgoCairo(30).split('-').map(Number)
    const diff = (Date.UTC(ty, tm - 1, td) - Date.UTC(fy, fm - 1, fd)) / 86_400_000
    expect(diff).toBe(30)
  })

  it('isDefaultOrWiderRange truth table', () => {
    expect(isDefaultOrWiderRange(null, null)).toBe(true)
    expect(isDefaultOrWiderRange(daysAgoCairo(30), null)).toBe(true)
    expect(isDefaultOrWiderRange(daysAgoCairo(45), null)).toBe(true)
    expect(isDefaultOrWiderRange(daysAgoCairo(10), null)).toBe(false)
    expect(isDefaultOrWiderRange(daysAgoCairo(30), daysAgoCairo(1))).toBe(false)
    expect(isDefaultOrWiderRange(null, daysAgoCairo(1))).toBe(false)
  })

  it('formatOrderDateTime renders the Cairo wall-clock of a known instant (fixed zone)', () => {
    const iso = '2026-09-05T20:30:00Z'
    const reference = new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Africa/Cairo',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(iso))
    expect(formatOrderDateTime(iso)).toBe(reference)
    // and it is NOT the UTC wall-clock (proves the zone is applied)
    const utc = new Intl.DateTimeFormat('en-GB', {
      timeZone: 'UTC',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(iso))
    expect(formatOrderDateTime(iso)).not.toContain(utc)
  })

  it('formatOrderDate renders a plain YYYY-MM-DD without shifting the day', () => {
    const out = formatOrderDate('2026-09-05')
    expect(out).toMatch(/5/)
    expect(out).toMatch(/2026/)
  })

  it('formatOrderDate accepts a full ISO instant instead of printing it raw', () => {
    const out = formatOrderDate('2026-09-09T13:00:00+00:00')
    expect(out).not.toContain('T')
    expect(out).toMatch(/9/)
    expect(out).toMatch(/2026/)
  })
})
