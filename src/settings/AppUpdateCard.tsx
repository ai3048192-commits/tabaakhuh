import { useState } from 'react'
import { Loader2, RefreshCw } from 'lucide-react'
import SettingsCard from './SettingsCard'
import { updateSettings } from './settingsApi'
import { settingsMessages as M } from './messages'
import type { PlatformSettings } from './types'

const VERSION = /^\d{1,3}\.\d{1,3}\.\d{1,3}$/

type Field =
  | 'app_latest_version_android'
  | 'app_latest_version_ios'
  | 'app_min_version'
  | 'app_android_store_url'
  | 'app_ios_store_url'

const FIELDS: { key: Field; label: string; placeholder: string; kind: 'version' | 'url' }[] = [
  { key: 'app_latest_version_android', label: M.appUpdateLatestAndroid, placeholder: '1.1.0', kind: 'version' },
  { key: 'app_latest_version_ios', label: M.appUpdateLatestIos, placeholder: '1.1.0', kind: 'version' },
  { key: 'app_min_version', label: M.appUpdateMinVersion, placeholder: '1.0.0', kind: 'version' },
  { key: 'app_android_store_url', label: M.appUpdateAndroidUrl, placeholder: 'https://play.google.com/store/apps/details?id=…', kind: 'url' },
  { key: 'app_ios_store_url', label: M.appUpdateIosUrl, placeholder: 'https://apps.apple.com/app/id…', kind: 'url' },
]

/**
 * specs/070 — the app's "a new version is out" prompt. When a store's
 * newest version is above what someone has installed, the app shows a
 * dialog: "Update" opens the store, "Later" brings it back the next day.
 * Below the minimum version there is no "Later". Saved on its own, like the
 * app icon.
 */
export default function AppUpdateCard({
  saved,
  onSaved,
  onToast,
}: {
  saved: PlatformSettings | null
  onSaved: (data: PlatformSettings) => void
  onToast: (msg: string) => void
}) {
  const initial = Object.fromEntries(FIELDS.map((f) => [f.key, saved?.[f.key] ?? ''])) as Record<Field, string>
  const [values, setValues] = useState<Record<Field, string>>(initial)
  const [errors, setErrors] = useState<Partial<Record<Field, string>>>({})
  const [saving, setSaving] = useState(false)

  const validate = (): boolean => {
    const next: Partial<Record<Field, string>> = {}
    for (const f of FIELDS) {
      const v = values[f.key].trim()
      if (v === '') continue
      if (f.kind === 'version' && !VERSION.test(v)) next[f.key] = M.appUpdateVersionError
      if (f.kind === 'url' && !/^https:\/\/\S+$/.test(v)) next[f.key] = M.appUpdateUrlError
    }
    setErrors(next)
    return Object.keys(next).length === 0
  }

  const apply = async () => {
    if (!validate()) return
    setSaving(true)
    try {
      const patch = Object.fromEntries(
        FIELDS.map((f) => [f.key, values[f.key].trim() === '' ? null : values[f.key].trim()]),
      ) as Partial<PlatformSettings>
      onSaved(await updateSettings(patch))
      onToast(M.appUpdateSavedToast)
    } catch {
      onToast(M.saveRetryToast)
    } finally {
      setSaving(false)
    }
  }

  return (
    <SettingsCard title={M.cardAppUpdateTitle} icon={<RefreshCw size={18} aria-hidden="true" />}>
      <p className="mb-4 text-xs leading-relaxed text-gray-500">{M.appUpdateHint}</p>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {FIELDS.map((f) => (
          <label key={f.key} className={`block ${f.kind === 'url' ? 'sm:col-span-2' : ''}`}>
            <span className="mb-1 block text-xs font-black text-[#6b4f3a]">{f.label}</span>
            <input
              dir="ltr"
              value={values[f.key]}
              placeholder={f.placeholder}
              onChange={(e) => setValues((v) => ({ ...v, [f.key]: e.target.value }))}
              className={`w-full rounded-xl border bg-white px-3 py-2 text-sm outline-none focus:border-[#7a0d0d] ${
                errors[f.key] ? 'border-red-400' : 'border-[#efe3cc]'
              }`}
            />
            {errors[f.key] && <span className="mt-1 block text-xs text-red-600">{errors[f.key]}</span>}
          </label>
        ))}
      </div>
      <div className="mt-4 flex justify-end">
        <button
          type="button"
          onClick={apply}
          disabled={saving}
          className="inline-flex items-center gap-2 rounded-xl bg-[#7a0d0d] px-4 py-2 text-sm font-black text-white transition hover:bg-[#5a0909] disabled:opacity-60"
        >
          {saving && <Loader2 size={16} className="animate-spin" aria-hidden="true" />}
          {M.appUpdateSave}
        </button>
      </div>
    </SettingsCard>
  )
}
