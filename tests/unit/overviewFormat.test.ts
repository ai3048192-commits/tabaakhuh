import { describe, it, expect } from 'vitest'
import { formatCount, formatCurrency, formatTime } from '../../src/overview/format'

describe('formatCount (FR-008 / SC-008)', () => {
  it('groups thousands with Western digits', () => {
    expect(formatCount(0)).toBe('0')
    expect(formatCount(3)).toBe('3')
    expect(formatCount(1240)).toBe('1,240')
    expect(formatCount(1_000_000)).toBe('1,000,000')
  })

  it('clamps below zero and truncates a fractional count', () => {
    expect(formatCount(-5)).toBe('0')
    expect(formatCount(12.9)).toBe('12')
  })

  it('contains no Arabic-Indic digits', () => {
    expect(formatCount(1234567)).toMatch(/^[\d,]+$/)
  })
})

describe('formatCurrency (FR-007 / FR-008 / SC-008)', () => {
  it('always two decimals plus the unit', () => {
    expect(formatCurrency(0)).toBe('0.00 ج.م')
    expect(formatCurrency(154300)).toBe('154,300.00 ج.م')
    expect(formatCurrency(154300.5)).toBe('154,300.50 ج.م')
  })

  it('clamps a negative total to zero', () => {
    expect(formatCurrency(-1)).toBe('0.00 ج.م')
  })

  it('the numeric portion has no Arabic-Indic digits', () => {
    expect(formatCurrency(154300.5).replace(' ج.م', '')).toMatch(/^[\d,.]+$/)
  })
})

describe('formatTime (FR-015)', () => {
  it('is a zero-padded 24-hour HH:MM in Western digits', () => {
    expect(formatTime(new Date(2026, 8, 7, 9, 5))).toBe('09:05')
    expect(formatTime(new Date(2026, 8, 7, 14, 30))).toBe('14:30')
    expect(formatTime(new Date(2026, 8, 7, 0, 0))).toBe('00:00')
  })
})
