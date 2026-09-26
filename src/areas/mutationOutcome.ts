import { ApiError } from '../api/envelope'
import type { AreaMutationOutcome } from './types'

/**
 * Classify a create / edit / status-change result: `null` → ok; `422` →
 * validation (field errors for name_ar / name_en / delivery_fee when the
 * server keyed them, else the envelope message — e.g. a duplicate name);
 * `404` → not_found; anything else → transient.
 */
export function classifyAreaMutation(err: unknown | null): AreaMutationOutcome {
  if (err == null) return { ok: true }

  if (err instanceof ApiError) {
    if (err.status === 422) {
      const fe = err.fieldErrors ?? {}
      const fieldErrors: { name_ar?: string; name_en?: string; delivery_fee?: string } = {}
      for (const k of ['name_ar', 'name_en', 'delivery_fee'] as const) {
        if (fe[k]?.[0]) fieldErrors[k] = fe[k][0]
      }
      return { ok: false, reason: 'validation', fieldErrors, message: err.message }
    }
    if (err.status === 404) return { ok: false, reason: 'not_found' }
  }

  return { ok: false, reason: 'transient' }
}

/** A fee draft → number, or null when it isn't a valid non-negative amount (≤ 2 decimals). */
export function parseFee(raw: string): number | null {
  const t = raw.trim()
  if (!/^\d+(\.\d{1,2})?$/.test(t)) return null
  const n = Number(t)
  return Number.isFinite(n) && n >= 0 ? n : null
}
