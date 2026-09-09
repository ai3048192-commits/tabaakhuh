import { ApiError } from '../api/envelope'
import type { CityMutationOutcome } from './types'

/**
 * Classify the result of a create / edit / status-change call (data-model.md §5).
 *
 * - `null` (resolved) → `ok` — even a `success:true` envelope whose `data` is
 *   unusable resolves here; the caller re-fetches to fix the display (FR-032).
 * - `422` with a `name_ar` / `name_en` `errors` entry → field-level `validation`.
 * - `422` otherwise → form-level `validation` (carries the envelope message).
 * - `404` → `not_found`.
 * - `0` / `>= 500` / unexpected → `transient`.
 */
export function classifyMutation(err: unknown | null): CityMutationOutcome {
  if (err == null) return { ok: true, message: '' }

  if (err instanceof ApiError) {
    if (err.status === 422) {
      const nameAr = err.fieldErrors?.name_ar?.[0]
      const nameEn = err.fieldErrors?.name_en?.[0]
      if (nameAr || nameEn) {
        return {
          ok: false,
          reason: 'validation',
          fieldErrors: {
            ...(nameAr ? { name_ar: nameAr } : {}),
            ...(nameEn ? { name_en: nameEn } : {}),
          },
          message: err.message,
        }
      }
      return { ok: false, reason: 'validation', message: err.message }
    }
    if (err.status === 404) return { ok: false, reason: 'not_found' }
  }

  return { ok: false, reason: 'transient' }
}
