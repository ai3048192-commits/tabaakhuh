import { useState } from 'react'
import { Check, Loader2, Smartphone } from 'lucide-react'
import SettingsCard from './SettingsCard'
import { updateSettings } from './settingsApi'
import { settingsMessages as M } from './messages'
import type { AppIconKey, PlatformSettings } from './types'
import defaultIcon from '../assets/app-icons/default.png'
import ramadanIcon from '../assets/app-icons/ramadan.png'
import eidFitrIcon from '../assets/app-icons/eid_fitr.png'
import eidAdhaIcon from '../assets/app-icons/eid_adha.png'
import mawlidIcon from '../assets/app-icons/mawlid.png'
import christmasIcon from '../assets/app-icons/christmas.png'

const ICONS: { key: AppIconKey; src: string }[] = [
  { key: 'default', src: defaultIcon },
  { key: 'ramadan', src: ramadanIcon },
  { key: 'eid_fitr', src: eidFitrIcon },
  { key: 'eid_adha', src: eidAdhaIcon },
  { key: 'mawlid', src: mawlidIcon },
  { key: 'christmas', src: christmasIcon },
]

/**
 * The customer app's seasonal launcher icon. Saved on its own (`PUT
 * /admin/settings` with just `app_icon`) rather than through the sticky
 * "save settings" bar — switching the icon is a deliberate, visible act.
 * The app reads it from `GET /app-config` on launch.
 */
export default function AppIconCard({
  current,
  onSaved,
  onToast,
}: {
  current: AppIconKey
  onSaved: (data: PlatformSettings) => void
  onToast: (msg: string) => void
}) {
  const [picked, setPicked] = useState<AppIconKey>(current)
  const [saving, setSaving] = useState(false)

  const apply = async () => {
    setSaving(true)
    try {
      onSaved(await updateSettings({ app_icon: picked }))
      onToast(M.appIconSavedToast)
    } catch {
      onToast(M.saveRetryToast)
    } finally {
      setSaving(false)
    }
  }

  return (
    <SettingsCard title={M.cardAppIconTitle} icon={<Smartphone size={18} aria-hidden="true" />}>
      <p className="mb-4 text-xs text-gray-500">{M.appIconHint}</p>
      <div role="radiogroup" aria-label={M.cardAppIconTitle} className="grid grid-cols-3 gap-3 sm:grid-cols-6">
        {ICONS.map(({ key, src }) => {
          const selected = picked === key
          return (
            <button
              key={key}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => setPicked(key)}
              className={`relative flex flex-col items-center gap-2 rounded-2xl border-2 p-2.5 transition ${
                selected ? 'border-[#7a0d0d] bg-[#fffaf1]' : 'border-transparent hover:border-[#efe3cc]'
              }`}
            >
              <img src={src} alt="" className="aspect-square w-full rounded-[22%] shadow-md" />
              <span className="text-xs font-black text-[#6b4f3a]">{M.appIconNames[key]}</span>
              {current === key && (
                <span className="absolute -top-2 left-1/2 -translate-x-1/2 rounded-full bg-[#7a0d0d] px-2 py-0.5 text-[10px] font-bold text-white">
                  {M.appIconCurrent}
                </span>
              )}
              {selected && (
                <span className="absolute right-1.5 top-1.5 grid h-5 w-5 place-items-center rounded-full bg-[#7a0d0d] text-white">
                  <Check size={12} aria-hidden="true" />
                </span>
              )}
            </button>
          )
        })}
      </div>
      <div className="mt-4 flex justify-end">
        <button
          type="button"
          onClick={apply}
          disabled={picked === current || saving}
          aria-busy={saving}
          className="inline-flex items-center gap-1.5 rounded-xl bg-[#7a0d0d] px-5 py-2.5 text-sm font-black text-white shadow-md shadow-[#7a0d0d]/20 transition hover:bg-[#5a0909] disabled:opacity-50"
        >
          {saving && <Loader2 size={15} className="animate-spin" aria-hidden="true" />}
          {saving ? M.saving : M.appIconApply}
        </button>
      </div>
    </SettingsCard>
  )
}
