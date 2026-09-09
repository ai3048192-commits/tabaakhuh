import { useEffect, useId, useState } from 'react'
import { Link } from 'react-router-dom'
import { RefreshCw, Wallet, Info, Bell, MapPin } from 'lucide-react'
import { fetchCityDirectory } from '../cities/citiesApi'
import { usePlatformSettings } from './usePlatformSettings'
import { useSystemSettings } from './useSystemSettings'
import DeliveryFeeForm from './DeliveryFeeForm'
import ImageUploadField from './ImageUploadField'
import SettingsCard from './SettingsCard'
import { settingsMessages as M } from './messages'
import type { NumberField, StringField, ToggleField } from './systemSettingsValidation'

/** A labelled numeric field bound to the system-settings hook. */
function NumField({
  label,
  field,
  value,
  error,
  placeholder,
  onChange,
}: {
  label: string
  field: NumberField
  value: string
  error?: string
  placeholder?: string
  onChange: (f: NumberField, raw: string) => void
}) {
  const id = useId()
  const errId = useId()
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="pr-1 text-[11px] font-bold text-gray-500">{label}</label>
      <input
        id={id}
        type="text"
        inputMode="decimal"
        dir="ltr"
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(field, e.target.value)}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errId : undefined}
        className="rounded-xl border border-gray-200 p-2.5 text-sm focus-visible:outline-2 focus-visible:outline-[#7a0d0d]"
      />
      <p id={errId} aria-live="polite" className="min-h-[0.9rem] text-[11px] text-red-600">{error ?? ''}</p>
    </div>
  )
}

/** A labelled text field bound to the system-settings hook. */
function TextField({
  label,
  field,
  value,
  error,
  type = 'text',
  placeholder,
  onChange,
}: {
  label: string
  field: StringField
  value: string
  error?: string
  type?: string
  placeholder?: string
  onChange: (f: StringField, raw: string) => void
}) {
  const id = useId()
  const errId = useId()
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="pr-1 text-[11px] font-bold text-gray-500">{label}</label>
      <input
        id={id}
        type={type}
        dir="ltr"
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(field, e.target.value)}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errId : undefined}
        className="rounded-xl border border-gray-200 p-2.5 text-sm focus-visible:outline-2 focus-visible:outline-[#7a0d0d]"
      />
      <p id={errId} aria-live="polite" className="min-h-[0.9rem] text-[11px] text-red-600">{error ?? ''}</p>
    </div>
  )
}

function Toggle({
  label,
  field,
  checked,
  onChange,
}: {
  label: string
  field: ToggleField
  checked: boolean
  onChange: (f: ToggleField, value: boolean) => void
}) {
  const id = useId()
  return (
    <label htmlFor={id} className="flex items-center justify-between rounded-xl border border-gray-200 p-3 text-sm text-gray-700">
      {label}
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(field, e.target.checked)}
        className="h-4 w-4 accent-[#7a0d0d]"
      />
    </label>
  )
}

/** `/settings` — platform settings. Delivery fee + all §6 system settings + the cities view. */
export default function SettingsPage() {
  const s = usePlatformSettings()
  const sys = useSystemSettings(s.saved, s.applyServerSettings)
  const [toast, setToast] = useState<string | null>(null)
  const [cities, setCities] = useState<string[] | null>(null)

  useEffect(() => {
    let live = true
    fetchCityDirectory()
      .then((dir) => { if (live) setCities([...dir.values()].map((c) => c.name_ar)) })
      .catch(() => { if (live) setCities([]) })
    return () => { live = false }
  }, [])

  const showToast = (msg: string) => {
    setToast(msg)
    window.setTimeout(() => setToast((t) => (t === msg ? null : t)), 6000)
  }

  const runFeeSave = async () => {
    const outcome = await s.save()
    if (outcome.ok) showToast(M.updatedToast)
    else if (outcome.reason === 'transient') showToast(M.saveRetryToast)
  }

  const runSystemSave = async () => {
    const outcome = await sys.save()
    if (outcome.ok) showToast(M.settingsSavedToast)
    else if (outcome.reason === 'transient') showToast(M.saveRetryToast)
  }

  return (
    <div className="min-h-full bg-[#fcf9f2] p-4 font-['Tajawal'] md:p-6" dir="rtl">
      <div className="mb-4">
        <h1 className="text-xl font-black text-[#7a0d0d]">{M.pageTitle}</h1>
        <p className="mt-1 text-xs font-bold text-gray-400">{M.subtitle}</p>
      </div>
      <p className="mb-6 flex items-start gap-2 rounded-2xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
        <Info size={14} className="mt-0.5 shrink-0" aria-hidden="true" />
        {M.liveNote}
      </p>

      {s.status === 'loading' && <p className="text-sm text-gray-500">{M.loading}</p>}

      {s.status === 'error' && (
        <div className="max-w-md rounded-2xl border border-red-100 bg-red-50 p-6 text-center">
          <p className="mb-3 text-sm text-red-700">{M.loadError}</p>
          <button
            type="button"
            onClick={s.reload}
            className="inline-flex items-center gap-2 rounded-xl bg-[#7a0d0d] px-4 py-2 text-sm font-black text-white"
          >
            <RefreshCw size={14} aria-hidden="true" />
            {M.retry}
          </button>
        </div>
      )}

      {s.status === 'ready' && s.savedFee !== null && (
        <>
          <div className="grid gap-6 lg:grid-cols-2">
            <SettingsCard title={M.cardFinanceTitle} icon={<Wallet size={18} aria-hidden="true" />}>
              <DeliveryFeeForm
                savedFee={s.savedFee}
                draft={s.draft}
                fieldError={s.fieldError}
                canSave={s.canSave}
                saving={s.saving}
                onDraftChange={s.setDraft}
                onSave={runFeeSave}
              />
              <div className="mt-6 space-y-3 border-t border-gray-100 pt-4">
                <p className="text-[11px] font-bold text-gray-400">{M.financeExtraHeading}</p>
                <div className="grid gap-3 sm:grid-cols-2">
                  <NumField label={M.commissionLabel} field="commission_percent" value={sys.numDrafts.commission_percent} error={sys.errors.commission_percent} placeholder="15" onChange={sys.setNum} />
                  <NumField label={M.minOrderLabel} field="min_order_total" value={sys.numDrafts.min_order_total} error={sys.errors.min_order_total} placeholder="50" onChange={sys.setNum} />
                </div>
                <div className="space-y-2">
                  <Toggle label={M.firstOrderDiscountLabel} field="first_order_discount_enabled" checked={sys.toggles.first_order_discount_enabled} onChange={sys.setToggle} />
                  <Toggle label={M.cashbackLabel} field="cashback_enabled" checked={sys.toggles.cashback_enabled} onChange={sys.setToggle} />
                </div>
              </div>
            </SettingsCard>

            <SettingsCard title={M.cardCitiesTitle} icon={<MapPin size={18} aria-hidden="true" />}>
              {cities === null ? (
                <p className="text-sm text-gray-500">{M.citiesLoading}</p>
              ) : cities.length === 0 ? (
                <p className="text-sm text-gray-400">{M.citiesEmpty}</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {cities.map((c) => (
                    <span key={c} className="rounded-full border border-gray-200 bg-white px-3 py-1 text-sm shadow-sm">
                      {c}
                    </span>
                  ))}
                </div>
              )}
              <p className="mt-4 text-xs text-gray-400">{M.citiesHint}</p>
              <Link
                to="/cities"
                className="mt-2 inline-block rounded-xl bg-[#7a0d0d] px-4 py-2 text-sm font-black text-white"
              >
                {M.manageCities}
              </Link>
            </SettingsCard>

            <SettingsCard title={M.cardStoreTitle} icon={<Info size={18} aria-hidden="true" />}>
              <div className="space-y-3">
                <TextField label={M.storeNameLabel} field="store_name" value={sys.strDrafts.store_name} error={sys.errors.store_name} placeholder="طباخة" onChange={sys.setStr} />
                <TextField label={M.supportEmailLabel} field="support_email" type="email" value={sys.strDrafts.support_email} error={sys.errors.support_email} placeholder="support@tabakha.app" onChange={sys.setStr} />
                <TextField label={M.supportPhoneLabel} field="support_phone" value={sys.strDrafts.support_phone} error={sys.errors.support_phone} placeholder="+201000000000" onChange={sys.setStr} />
                <div className="grid gap-3 sm:grid-cols-2">
                  <ImageUploadField label={M.logoLabel} field="logo_url" value={sys.strDrafts.logo_url} error={sys.errors.logo_url} onChange={sys.setStr} />
                  <ImageUploadField label={M.iconLabel} field="icon_url" value={sys.strDrafts.icon_url} error={sys.errors.icon_url} onChange={sys.setStr} />
                </div>
              </div>
            </SettingsCard>

            <SettingsCard title={M.cardNotifTitle} icon={<Bell size={18} aria-hidden="true" />}>
              <div className="space-y-2">
                <Toggle label={M.notifPushLabel} field="notif_push_enabled" checked={sys.toggles.notif_push_enabled} onChange={sys.setToggle} />
                <Toggle label={M.notifNewOrdersLabel} field="notif_new_orders_enabled" checked={sys.toggles.notif_new_orders_enabled} onChange={sys.setToggle} />
                <Toggle label={M.notifSmsCooksLabel} field="notif_sms_cooks_enabled" checked={sys.toggles.notif_sms_cooks_enabled} onChange={sys.setToggle} />
                <Toggle label={M.notifOrderStatusLabel} field="notif_order_status_enabled" checked={sys.toggles.notif_order_status_enabled} onChange={sys.setToggle} />
                <div className="pt-1">
                  <NumField label={M.deliveryRadiusLabel} field="default_delivery_radius_km" value={sys.numDrafts.default_delivery_radius_km} error={sys.errors.default_delivery_radius_km} placeholder="10" onChange={sys.setNum} />
                </div>
              </div>
            </SettingsCard>
          </div>

          <div className="sticky bottom-4 mt-6 flex items-center justify-end gap-3 rounded-2xl border border-gray-100 bg-white/90 p-3 shadow-sm backdrop-blur">
            {sys.dirty && <span className="text-xs font-bold text-gray-500">تغييرات غير محفوظة</span>}
            <button
              type="button"
              onClick={runSystemSave}
              disabled={!sys.canSave}
              aria-busy={sys.saving}
              className="rounded-xl bg-[#7a0d0d] px-5 py-2.5 text-sm font-black text-white disabled:opacity-50"
            >
              {sys.saving ? M.saving : M.saveSettings}
            </button>
          </div>
        </>
      )}

      <div aria-live="polite" role="status" className="sr-only">{toast}</div>
      {toast && (
        <div className="fixed bottom-6 left-1/2 z-[80] -translate-x-1/2 rounded-xl bg-gray-900 px-4 py-2.5 text-sm text-white shadow-lg">
          {toast}
        </div>
      )}
    </div>
  )
}
