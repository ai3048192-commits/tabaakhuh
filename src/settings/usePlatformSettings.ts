import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { getSettings, updateSettings } from './settingsApi'
import { validateFeeInput, formatFee } from './feeValidation'
import { classifySettingsMutation } from './mutationOutcome'
import { feeErrorText } from './messages'
import type { PlatformSettings, SettingsMutationOutcome, SettingsStatus } from './types'

export interface UsePlatformSettings {
  status: SettingsStatus
  /** The whole settings object as last loaded / saved — `null` until the first load succeeds. */
  saved: PlatformSettings | null
  savedFee: number | null
  draft: string
  /** Client validation message, or a server `422` message; `null` when the field is clean. */
  fieldError: string | null
  dirty: boolean
  canSave: boolean
  saving: boolean
  setDraft: (raw: string) => void
  reload: () => void
  save: () => Promise<SettingsMutationOutcome>
  /** Fold a full settings object from another `PUT` (the non-fee cards) back into this hook. */
  applyServerSettings: (data: PlatformSettings) => void
}

/**
 * Owns the delivery-fee setting — load / retry, the raw draft string, the
 * derived validation + dirty state, and the fee-only save flow (which the
 * backend still answers with `"Delivery fee updated."`). It also holds the full
 * settings object it loaded so the non-fee cards ({@link useSystemSettings}) can
 * share the single `GET /admin/settings`. A `401` on either call is handled
 * upstream by the shared `unauthorizedHandler` and never observed here.
 */
export function usePlatformSettings(): UsePlatformSettings {
  const [status, setStatus] = useState<SettingsStatus>('loading')
  const [saved, setSaved] = useState<PlatformSettings | null>(null)
  const [draft, setDraftState] = useState('')
  const [serverError, setServerError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const inFlight = useRef<Promise<SettingsMutationOutcome> | null>(null)

  const savedFee = saved?.delivery_fee ?? null

  const load = useCallback(async () => {
    setStatus((s) => (s === 'ready' ? s : 'loading'))
    try {
      const data = await getSettings()
      setSaved(data)
      setDraftState(formatFee(data.delivery_fee))
      setServerError(null)
      setStatus('ready')
    } catch {
      setStatus((s) => (s === 'ready' ? s : 'error'))
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const applyServerSettings = useCallback((data: PlatformSettings) => {
    setSaved(data)
    setDraftState(formatFee(data.delivery_fee))
    setServerError(null)
  }, [])

  const validation = useMemo(() => validateFeeInput(draft), [draft])
  const clientError = validation.error ? feeErrorText(validation.error) : null
  const fieldError = clientError ?? serverError

  const dirty =
    validation.value !== null &&
    validation.error === null &&
    savedFee !== null &&
    validation.value !== savedFee

  const canSave = dirty && !saving

  const setDraft = useCallback((raw: string) => {
    setDraftState(raw)
    setServerError(null)
  }, [])

  const save = useCallback((): Promise<SettingsMutationOutcome> => {
    if (inFlight.current) return inFlight.current

    const v = validateFeeInput(draft)
    if (v.error !== null) {
      return Promise.resolve({
        ok: false,
        reason: 'validation',
        message: feeErrorText(v.error),
      })
    }
    const value = v.value as number

    const run = (async (): Promise<SettingsMutationOutcome> => {
      setSaving(true)
      try {
        const data = await updateSettings({ delivery_fee: value })
        setSaved(data)
        setDraftState(formatFee(data.delivery_fee))
        setServerError(null)
        return classifySettingsMutation(null)
      } catch (err) {
        const outcome = classifySettingsMutation(err)
        if (!outcome.ok && outcome.reason === 'validation') {
          setServerError(outcome.message)
        }
        return outcome
      } finally {
        setSaving(false)
        inFlight.current = null
      }
    })()

    inFlight.current = run
    return run
  }, [draft])

  return {
    status,
    saved,
    savedFee,
    draft,
    fieldError,
    dirty,
    canSave,
    saving,
    setDraft,
    reload: load,
    save,
    applyServerSettings,
  }
}
