import { describe, it, expect } from 'vitest'
import { validateFeeInput, formatFee } from '../../src/settings/feeValidation'

describe('validateFeeInput (FR-008 / FR-009 / FR-010 / FR-011, SC-004)', () => {
  it('empty or whitespace-only → required', () => {
    expect(validateFeeInput('')).toEqual({ value: null, error: 'required' })
    expect(validateFeeInput('   ')).toEqual({ value: null, error: 'required' })
  })

  it('non-numeric text → not_a_number', () => {
    for (const raw of ['abc', '1.2.3', '1e3', '1.', '.5', '-', '12abc', '1,5', '٥']) {
      expect(validateFeeInput(raw)).toEqual({ value: null, error: 'not_a_number' })
    }
  })

  it('negative → negative (value still parsed)', () => {
    expect(validateFeeInput('-5')).toEqual({ value: -5, error: 'negative' })
    expect(validateFeeInput('-0.5')).toEqual({ value: -0.5, error: 'negative' })
  })

  it('more than two decimal places → too_many_decimals (no rounding)', () => {
    expect(validateFeeInput('10.005')).toEqual({ value: 10.005, error: 'too_many_decimals' })
    expect(validateFeeInput('0.001')).toEqual({ value: 0.001, error: 'too_many_decimals' })
  })

  it('valid amounts → error null with the parsed value', () => {
    expect(validateFeeInput('0')).toEqual({ value: 0, error: null })
    expect(validateFeeInput('0.00')).toEqual({ value: 0, error: null })
    expect(validateFeeInput('10')).toEqual({ value: 10, error: null })
    expect(validateFeeInput('10.5')).toEqual({ value: 10.5, error: null })
    expect(validateFeeInput('10.50')).toEqual({ value: 10.5, error: null })
    expect(validateFeeInput('  10.5  ')).toEqual({ value: 10.5, error: null })
    expect(validateFeeInput('1000000')).toEqual({ value: 1000000, error: null })
  })
})

describe('formatFee', () => {
  it('renders two decimals with Western digits', () => {
    expect(formatFee(25)).toBe('25.00')
    expect(formatFee(30.5)).toBe('30.50')
    expect(formatFee(0)).toBe('0.00')
    expect(formatFee(12.345)).toBe('12.35')
  })
})
