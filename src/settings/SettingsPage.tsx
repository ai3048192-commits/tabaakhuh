import { lazy, Suspense, useEffect, useId, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { RefreshCw, Wallet, Info, Bell, MapPin, Settings2, LayoutTemplate, ExternalLink, Save, Loader2 } from 'lucide-react'
import { fetchCityDirectory } from '../cities/citiesApi'
import { usePlatformSettings } from './usePlatformSettings'
import { useSystemSettings } from './useSystemSettings'
import ImageUploadField from './ImageUploadField'
import SettingsCard from './SettingsCard'
import { settingsMessages as M } from './messages'
import type { NumberField, StringField, ToggleField } from './systemSettingsValidation'
import PageHeader from '../shared/PageHeader'

/** The landing editor is only downloaded when its tab is opened. */
const LandingEditor = lazy(() => import('../landing/editor/LandingEditor'))

const fieldCls =
  'rounded-xl border border-[#e8dcc4] bg-white px-3.5 py-2.5 text-sm text-gray-800 shadow-sm outline-none transition placeholder:text-gray-300 focus:border-[#7a0d0d] focus:ring-4 focus:ring-[#7a0d0d]/10 aria-[invalid=true]:border-red-300'

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
      <label htmlFor={id} className="pr-1 text-xs font-black text-[#6b4f3a]">{label}</label>
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
        className={fieldCls}
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
      <label htmlFor={id} className="pr-1 text-xs font-black text-[#6b4f3a]">{label}</label>
      <input
        id={id}
        type={type}
        dir="ltr"
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(field, e.target.value)}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errId : undefined}
        className={fieldCls}
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
    <label
      htmlFor={id}
      className="flex cursor-pointer items-center justify-between gap-4 rounded-2xl border border-[#efe3cc] bg-white px-4 py-3 text-sm font-bold text-gray-700 transition hover:border-[#d9c39b]"
    >
      {label}
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(field, e.target.checked)}
        className="peer sr-only"
      />
      <span
        aria-hidden="true"
        className="relative h-6 w-11 shrink-0 rounded-full bg-gray-200 transition peer-checked:bg-[#7a0d0d] peer-focus-visible:ring-4 peer-focus-visible:ring-[#7a0d0d]/20 after:absolute after:right-0.5 after:top-0.5 after:h-5 after:w-5 after:rounded-full after:bg-white after:shadow after:transition peer-checked:after:-translate-x-5"
      />
    </label>
  )
}

type Tab = 'system' | 'landing'

/**
 * `/settings` — two tabs:
 *   - system: all §6 system settings + the cities view (delivery fees live on
 *     `/delivery-pricing`, per area);
 *   - landing (`?tab=landing`): the public home page's content editor.
 */
export default function SettingsPage() {
  const [params, setParams] = useSearchParams()
  const tab: Tab = params.get('tab') === 'landing' ? 'landing' : 'system'
  const [toast, setToast] = useState<string | null>(null)

  const showToast = (msg: string) => {
    setToast(msg)
    window.setTimeout(() => setToast((t) => (t === msg ? null : t)), 6000)
  }

  const go = (t: Tab) =>
    setParams((prev) => {
      const next = new URLSearchParams(prev)
      if (t === 'system') next.delete('tab')
      else next.set('tab', t)
      return next
    }, { replace: true })

  const tabs: { key: Tab; label: string; icon: typeof Settings2 }[] = [
    { key: 'system', label: 'إعدادات النظام', icon: Settings2 },
    { key: 'landing', label: 'محتوى الصفحة الرئيسية', icon: LayoutTemplate },
  ]

  return (
    <div className="min-h-full bg-[#f7f1e6] p-4 font-['Tajawal'] md:p-8" dir="rtl">
      <PageHeader
        title={M.pageTitle}
        subtitle={tab === 'system' ? M.subtitle : 'عدّل كل نصوص وصور وروابط الصفحة الرئيسية للموقع'}
        actions={tab === 'landing' && (
          <a
            href="/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-xl bg-white/10 px-4 py-2.5 text-xs font-black text-white ring-1 ring-white/20 backdrop-blur transition hover:bg-white/20"
          >
            <ExternalLink size={14} aria-hidden="true" /> فتح الصفحة الرئيسية
          </a>
        )}
      >
        <div role="tablist" aria-label="أقسام الإعدادات" className="inline-flex flex-wrap gap-1 rounded-2xl bg-black/20 p-1 ring-1 ring-white/10">
          {tabs.map((t) => (
            <button
              key={t.key}
              type="button"
              role="tab"
              aria-selected={tab === t.key}
              onClick={() => go(t.key)}
              className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-black transition ${
                tab === t.key ? 'bg-white text-[#7a0d0d] shadow' : 'text-white/75 hover:bg-white/10 hover:text-white'
              }`}
            >
              <t.icon size={16} aria-hidden="true" />
              {t.label}
            </button>
          ))}
        </div>
      </PageHeader>

      {tab === 'system' ? (
        <SystemSettings onToast={showToast} />
      ) : (
        <Suspense
          fallback={
            <div className="flex items-center gap-2 rounded-3xl bg-white p-8 text-sm text-gray-500 shadow-sm">
              <Loader2 size={16} className="animate-spin" aria-hidden="true" /> جارٍ التحميل…
            </div>
          }
        >
          <LandingEditor onToast={showToast} />
        </Suspense>
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

function SystemSettings({ onToast }: { onToast: (msg: string) => void }) {
  const s = usePlatformSettings()
  const sys = useSystemSettings(s.saved, s.applyServerSettings)
  const [cities, setCities] = useState<string[] | null>(null)

  useEffect(() => {
    let live = true
    fetchCityDirectory()
      .then((dir) => { if (live) setCities([...dir.values()].map((c) => c.name_ar)) })
      .catch(() => { if (live) setCities([]) })
    return () => { live = false }
  }, [])

  const runSystemSave = async () => {
    const outcome = await sys.save()
    if (outcome.ok) onToast(M.settingsSavedToast)
    else if (outcome.reason === 'transient') onToast(M.saveRetryToast)
  }

  return (
    <>
      <p className="mb-6 flex items-start gap-2 rounded-2xl border border-amber-200 bg-amber-50 p-3 text-xs font-bold text-amber-800">
        <Info size={14} className="mt-0.5 shrink-0" aria-hidden="true" />
        {M.liveNote}
      </p>

      {s.status === 'loading' && (
        <div className="grid gap-6 lg:grid-cols-2" aria-hidden="true">
          {[0, 1, 2, 3].map((i) => <div key={i} className="h-64 animate-pulse rounded-3xl bg-white/70" />)}
        </div>
      )}
      {s.status === 'loading' && <p className="sr-only">{M.loading}</p>}

      {s.status === 'error' && (
        <div className="max-w-md rounded-3xl border border-red-100 bg-red-50 p-6 text-center">
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
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-[#faf3e7] p-4">
                <p className="text-sm text-[#6b4f3a]">{M.deliveryPricingMoved}</p>
                <Link
                  to="/delivery-pricing"
                  className="inline-block rounded-xl bg-[#7a0d0d] px-4 py-2 text-sm font-black text-white transition hover:bg-[#5a0909]"
                >
                  {M.deliveryPricingLink}
                </Link>
              </div>
              <div className="mt-5 space-y-3">
                <p className="text-xs font-black text-gray-400">{M.financeExtraHeading}</p>
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
                    <span key={c} className="inline-flex items-center gap-1.5 rounded-full border border-[#efe3cc] bg-[#fffaf1] px-3 py-1.5 text-sm font-bold text-[#6b4f3a]">
                      <MapPin size={12} className="text-[#b68614]" aria-hidden="true" />
                      {c}
                    </span>
                  ))}
                </div>
              )}
              <p className="mt-4 text-xs text-gray-400">{M.citiesHint}</p>
              <Link
                to="/cities"
                className="mt-3 inline-block rounded-xl bg-[#7a0d0d] px-4 py-2 text-sm font-black text-white transition hover:bg-[#5a0909]"
              >
                {M.manageCities}
              </Link>
            </SettingsCard>

            <SettingsCard title={M.cardStoreTitle} icon={<Info size={18} aria-hidden="true" />}>
              <div className="space-y-3">
                <TextField label={M.storeNameLabel} field="store_name" value={sys.strDrafts.store_name} error={sys.errors.store_name} placeholder="طباخة" onChange={sys.setStr} />
                <div className="grid gap-3 sm:grid-cols-2">
                  <TextField label={M.supportEmailLabel} field="support_email" type="email" value={sys.strDrafts.support_email} error={sys.errors.support_email} placeholder="support@tabakha.app" onChange={sys.setStr} />
                  <TextField label={M.supportPhoneLabel} field="support_phone" value={sys.strDrafts.support_phone} error={sys.errors.support_phone} placeholder="+201000000000" onChange={sys.setStr} />
                </div>
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
                <div className="pt-2">
                  <NumField label={M.deliveryRadiusLabel} field="default_delivery_radius_km" value={sys.numDrafts.default_delivery_radius_km} error={sys.errors.default_delivery_radius_km} placeholder="10" onChange={sys.setNum} />
                </div>
              </div>
            </SettingsCard>
          </div>

          <div className="sticky bottom-4 z-20 mt-6 flex items-center justify-between gap-3 rounded-2xl bg-white/95 p-3 shadow-lg ring-1 ring-[#efe3cc] backdrop-blur">
            <span className="px-2 text-xs font-bold">
              {sys.dirty ? (
                <span className="flex items-center gap-1.5 text-[#b68614]">
                  <span className="h-2 w-2 rounded-full bg-[#e0a52e]" /> تغييرات غير محفوظة
                </span>
              ) : (
                <span className="text-gray-400">كل الإعدادات محفوظة</span>
              )}
            </span>
            <button
              type="button"
              onClick={runSystemSave}
              disabled={!sys.canSave}
              aria-busy={sys.saving}
              className="inline-flex items-center gap-1.5 rounded-xl bg-[#7a0d0d] px-5 py-2.5 text-sm font-black text-white shadow-md shadow-[#7a0d0d]/20 transition hover:bg-[#5a0909] disabled:opacity-50"
            >
              {sys.saving ? <Loader2 size={15} className="animate-spin" aria-hidden="true" /> : <Save size={15} aria-hidden="true" />}
              {sys.saving ? M.saving : M.saveSettings}
            </button>
          </div>
        </>
      )}
    </>
  )
}
