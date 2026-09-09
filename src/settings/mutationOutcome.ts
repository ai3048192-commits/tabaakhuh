import { ApiError } from '../api/envelope'
import type { SettingsMutationOutcome } from './types'

/**
 * Classify the result of `updateSettings` into a `SettingsMutationOutcome`.
 * `null` (a resolved call) → success. A `422` → `validation`, preferring the
 * `delivery_fee` field message and falling back to the envelope message. Every
 * other error — network (`0`), `5xx`, an unexpected status, or a non-`ApiError`
 * throw — → `transient`. There is no `404`: `/admin/settings` is a singleton.
 */
export function classifySettingsMutation(err: unknown | null): SettingsMutationOutcome {
  if (err == null) return { ok: true, message: '' }

  if (err instanceof ApiError && err.status === 422) {
    const field = err.fieldErrors?.delivery_fee?.[0]
    return { ok: false, reason: 'validation', message: field ?? err.message }
  }

  return { ok: false, reason: 'transient' }
}
