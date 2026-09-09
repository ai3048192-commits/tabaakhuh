import { describe, it, expect } from 'vitest'
import {
  formatAmount,
  formatDateTime,
  isValidStatusFilter,
  PLACEHOLDER,
} from '../../src/withdrawals/format'

describe('formatAmount (FR-004)', () => {
  it('integer', () => expect(formatAmount(500)).toContain('500'))
  it('decimal', () => expect(formatAmount(499.5)).toContain('499.5'))
  it('NaN → placeholder', () => expect(formatAmount(NaN)).toBe(PLACEHOLDER))
  it('null → placeholder', () => expect(formatAmount(null)).toBe(PLACEHOLDER))
  it('Infinity → placeholder', () => expect(formatAmount(Infinity)).toBe(PLACEHOLDER))
})

describe('formatDateTime (FR-002)', () => {
  it('valid ISO → a formatted string', () => {
    const out = formatDateTime('2026-09-03T08:00:00+00:00')
    expect(out).not.toBe(PLACEHOLDER)
    expect(out).toMatch(/2026/)
  })
  it('null → placeholder', () => expect(formatDateTime(null)).toBe(PLACEHOLDER))
  it('garbage → placeholder', () => expect(formatDateTime('not a date')).toBe(PLACEHOLDER))
})

describe('isValidStatusFilter (FR-012)', () => {
  it('accepts exactly the five values', () => {
    for (const v of ['all', 'pending', 'approved', 'rejected', 'paid']) {
      expect(isValidStatusFilter(v)).toBe(true)
    }
  })
  it('rejects others', () => {
    expect(isValidStatusFilter('')).toBe(false)
    expect(isValidStatusFilter('PAID')).toBe(false)
    expect(isValidStatusFilter(null)).toBe(false)
    expect(isValidStatusFilter(undefined)).toBe(false)
  })
})
