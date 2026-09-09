import { useCallback, useMemo, useRef, useState } from 'react'
import { ApiError } from '../api/envelope'
import { updateSettings } from './settingsApi'
import { settingsMessages as M } from './messages'
import {
  NUMBER_FIELDS,
  STRING_FIELDS,
  TOGGLE_FIELDS,
  validateNumberField,
  validateStringField,
  type NumberField,
  type StringField,
  type ToggleField,
} from './systemSettingsValidation'
import type { PlatformSettings, SettingsMutationOutcome, SettingsPatch } from './types'

type NumDrafts = Record<NumberField, string>
type StrDrafts = Record<StringField, string>
type Toggles = Record<ToggleField, boolean>
type FieldErrors = Partial<Record<NumberField | StringField, string>>

export interface UseSystemSettings {
  numDrafts: NumDrafts
  strDrafts: StrDrafts
  toggles: Toggles
  /** Per-field message (client rule first, then a server `422`); absent when clean. */
  errors: FieldErrors
  dirty: boolean
  canSave: boolean
  saving: boolean
  setNum: (f: NumberField, raw: string) => void
  setStr: (f: StringField, raw: string) => void
  setToggle: (f: ToggleField, value: boolean) => void
  save: () => Promise<SettingsMutationOutcome>
}

const numFrom = (n: number | null): string => (n == null ? '' : String(n))

function draftsFrom(s: PlatformSettings | null) {
  return {
    numDrafts: {
      commission_percent: numFrom(s?.commission_percent ?? 0),
      min_order_total: numFrom(s?.min_order_total ?? 0),
      default_delivery_radius_km: numFrom(s?.default_delivery_radius_km ?? null),
    } as NumDrafts,
    strDrafts: {
      store_name: s?.store_name ?? '',
      support_email: s?.support_email ?? '',
      support_phone: s?.support_phone ?? '',
      logo_url: s?.logo_url ?? '',
      icon_url: s?.icon_url ?? '',
    } as StrDrafts,
    toggles: {
      first_order_discount_enabled: s?.first_order_discount_enabled ?? false,
      cashback_enabled: s?.cashback_enabled ?? false,
      notif_push_enabled: s?.notif_push_enabled ?? true,
      notif_new_orders_enabled: s?.notif_new_orders_enabled ?? true,
      notif_sms_cooks_enabled: s?.notif_sms_cooks_enabled ?? true,
      notif_order_status_enabled: s?.notif_order_status_enabled ?? true,
    } as Toggles,
  }
}

/**
 * Owns the non-fee System Settings fields (`admin-dashboard-api.md` §6): the
 * per-field draft strings / toggles, the derived client validation + dirty
 * state, and a partial `save` that PUTs only the changed keys. It does **not**
 * fetch — {@link usePlatformSettings} does the single `GET /admin/settings` and
 * passes the loaded object in; on a successful save the full echoed object is
 * handed back through `onSaved` so both hooks stay in sync.
 */
export function useSystemSettings(
  saved: PlatformSettings | null,
  onSaved: (data: PlatformSettings) => void,
): UseSystemSettings {
  const [numDrafts, setNumDrafts] = useState<NumDrafts>(() => draftsFrom(saved).numDrafts)
  const [strDrafts, setStrDrafts] = useState<StrDrafts>(() => draftsFrom(saved).strDrafts)
  const [toggles, setToggles] = useState<Toggles>(() => draftsFrom(saved).toggles)
  const [serverErrors, setServerErrors] = useState<FieldErrors>({})
  const [saving, setSaving] = useState(false)
  const inFlight = useRef<Promise<SettingsMutationOutcome> | null>(null)

  // Re-seed the drafts whenever a new server object arrives (initial load, a
  // retry, or a fee save that echoed the full object) — React's documented
  // "adjust state while rendering when a prop changed" pattern, keyed on the
  // object identity so a re-render with the same `saved` is a no-op.
  const [seededFrom, setSeededFrom] = useState(saved)
  if (seededFrom !== saved) {
    const d = draftsFrom(saved)
    setSeededFrom(saved)
    setNumDrafts(d.numDrafts)
    setStrDrafts(d.strDrafts)
    setToggles(d.toggles)
    setServerErrors({})
  }

  const { errors, patch, clientErrorCount } = useMemo(() => {
    const clientErrs: FieldErrors = {}
    const p: SettingsPatch = {}
    if (!saved) return { errors: {} as FieldErrors, patch: p, clientErrorCount: 0 }

    for (const f of NUMBER_FIELDS) {
      const r = validateNumberField(f, numDrafts[f])
      if (r.error) clientErrs[f] = r.error
      else if (r.value !== saved[f]) p[f] = r.value as never
    }
    for (const f of STRING_FIELDS) {
      const r = validateStringField(f, strDrafts[f])
      if (r.error) clientErrs[f] = r.error
      else if (r.value !== (saved[f] ?? null)) p[f] = r.value as never
    }
    for (const f of TOGGLE_FIELDS) {
      if (toggles[f] !== saved[f]) p[f] = toggles[f] as never
    }
    return {
      errors: { ...clientErrs, ...serverErrors } as FieldErrors,
      patch: p,
      clientErrorCount: Object.keys(clientErrs).length,
    }
  }, [saved, numDrafts, strDrafts, toggles, serverErrors])

  const dirty = Object.keys(patch).length > 0
  const canSave = dirty && clientErrorCount === 0 && !saving

  const setNum = useCallback((f: NumberField, raw: string) => {
    setNumDrafts((d) => ({ ...d, [f]: raw }))
    setServerErrors((e) => (e[f] ? { ...e, [f]: undefined } : e))
  }, [])
  const setStr = useCallback((f: StringField, raw: string) => {
    setStrDrafts((d) => ({ ...d, [f]: raw }))
    setServerErrors((e) => (e[f] ? { ...e, [f]: undefined } : e))
  }, [])
  const setToggle = useCallback((f: ToggleField, value: boolean) => {
    setToggles((t) => ({ ...t, [f]: value }))
  }, [])

  const save = useCallback((): Promise<SettingsMutationOutcome> => {
    if (inFlight.current) return inFlight.current
    if (Object.keys(patch).length === 0) {
      return Promise.resolve({ ok: false, reason: 'validation', message: M.noChanges })
    }

    const run = (async (): Promise<SettingsMutationOutcome> => {
      setSaving(true)
      try {
        const data = await updateSettings(patch)
        onSaved(data)
        return { ok: true, message: M.settingsSavedToast }
      } catch (err) {
        if (err instanceof ApiError && err.status === 422) {
          const mapped: FieldErrors = {}
          for (const [k, v] of Object.entries(err.fieldErrors ?? {})) {
            if (Array.isArray(v) && v[0]) mapped[k as keyof FieldErrors] = v[0]
          }
          setServerErrors(mapped)
          return { ok: false, reason: 'validation', message: Object.values(mapped)[0] ?? err.message }
        }
        return { ok: false, reason: 'transient' }
      } finally {
        setSaving(false)
        inFlight.current = null
      }
    })()

    inFlight.current = run
    return run
  }, [patch, onSaved])

  return { numDrafts, strDrafts, toggles, errors, dirty, canSave, saving, setNum, setStr, setToggle, save }
}
