import type { FeeValidation } from './types'

/** An optional leading `-`, digits, and at most one `.<digits>` group. No exponents. */
const NUMERIC = /^-?\d+(\.\d+)?$/

/**
 * Validate the raw delivery-fee input string. Rule order (first match wins):
 * `required` → `not_a_number` → `negative` → `too_many_decimals` → ok.
 *
 * `value` is the parsed number whenever the string parses at all (so the caller
 * can show it even for `negative` / `too_many_decimals`); the caller still blocks
 * submission while `error !== null`. Zero is valid; there is no upper bound.
 */
export function validateFeeInput(raw: string): FeeValidation {
  const trimmed = raw.trim()
  if (trimmed === '') return { value: null, error: 'required' }
  if (!NUMERIC.test(trimmed)) return { value: null, error: 'not_a_number' }

  const value = Number(trimmed)
  if (!Number.isFinite(value)) return { value: null, error: 'not_a_number' }
  if (value < 0) return { value, error: 'negative' }

  const dot = trimmed.indexOf('.')
  if (dot !== -1 && trimmed.length - dot - 1 > 2) {
    return { value, error: 'too_many_decimals' }
  }
  return { value, error: null }
}

/** Format a stored fee for display / as the pre-filled draft: two decimals, Western digits. */
export function formatFee(n: number): string {
  return n.toFixed(2)
}
