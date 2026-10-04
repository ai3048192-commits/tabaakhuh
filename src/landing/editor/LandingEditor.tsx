import { useCallback, useEffect, useMemo, useState } from 'react'
import { AlertTriangle, Eye, EyeOff, ExternalLink, Loader2, RefreshCw, RotateCcw, Save } from 'lucide-react'
import { ApiError } from '../../api/envelope'
import { DEFAULT_LANDING_CONTENT, type LandingContent } from '../content'
import { fetchLandingContent, saveLandingContent, writePreviewDraft } from '../landingApi'
import { SECTIONS } from './sections'

type Status = 'loading' | 'ready' | 'error'

const fmtTime = (iso: string | null) => {
  if (!iso) return null
  const d = new Date(iso)
  return Number.isNaN(d.getTime())
    ? null
    : d.toLocaleString('ar-EG', { dateStyle: 'medium', timeStyle: 'short' })
}

/**
 * Settings → "محتوى الصفحة الرئيسية": edits every text, image and link on the
 * public landing page. The whole document is saved in one `PUT`; "معاينة"
 * opens the landing page in a new tab with the unsaved draft.
 */
export default function LandingEditor({ onToast }: { onToast: (msg: string) => void }) {
  const [status, setStatus] = useState<Status>('loading')
  const [saved, setSaved] = useState<LandingContent>(DEFAULT_LANDING_CONTENT)
  const [draft, setDraft] = useState<LandingContent>(DEFAULT_LANDING_CONTENT)
  const [hasSaved, setHasSaved] = useState(false)
  const [updatedAt, setUpdatedAt] = useState<string | null>(null)
  const [active, setActive] = useState<keyof LandingContent>('hero')
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  const load = useCallback((signal?: AbortSignal) => {
    setStatus('loading')
    fetchLandingContent(signal)
      .then((l) => {
        setSaved(l.content)
        setDraft(l.content)
        setHasSaved(l.saved)
        setUpdatedAt(l.updatedAt)
        setStatus('ready')
      })
      .catch((err) => {
        if ((err as Error)?.name === 'AbortError') return
        setStatus('error')
      })
  }, [])

  useEffect(() => {
    const ctrl = new AbortController()
    load(ctrl.signal)
    return () => ctrl.abort()
  }, [load])

  const dirty = useMemo(() => JSON.stringify(draft) !== JSON.stringify(saved), [draft, saved])

  // Warn before leaving the tab with unsaved edits.
  useEffect(() => {
    if (!dirty) return
    const h = (e: BeforeUnloadEvent) => { e.preventDefault() }
    window.addEventListener('beforeunload', h)
    return () => window.removeEventListener('beforeunload', h)
  }, [dirty])

  const set = useCallback(<K extends keyof LandingContent>(key: K, value: LandingContent[K]) => {
    setDraft((d) => ({ ...d, [key]: value }))
  }, [])

  const save = async () => {
    setSaving(true)
    setSaveError(null)
    try {
      const l = await saveLandingContent(draft)
      setSaved(l.content)
      setDraft(l.content)
      setHasSaved(true)
      setUpdatedAt(l.updatedAt)
      onToast('تم حفظ محتوى الصفحة الرئيسية — التعديلات ظاهرة للزوار دلوقتي.')
    } catch (err) {
      const msg =
        err instanceof ApiError && err.status === 422
          ? 'المحتوى كبير جدًا أو غير صالح. قلّل النصوص الطويلة وحاول تاني.'
          : err instanceof ApiError && err.status === 404
            ? 'خدمة حفظ المحتوى مش متاحة على السيرفر لسه — لازم تحديث الباك إند.'
            : 'تعذّر الحفظ. تأكد من الاتصال وحاول مرة أخرى.'
      setSaveError(msg)
    } finally {
      setSaving(false)
    }
  }

  const preview = () => {
    if (writePreviewDraft(draft)) window.open('/?preview=1', '_blank', 'noopener')
    else onToast('المتصفح منع المعاينة. جرّب تحفظ وتفتح الصفحة.')
  }

  const resetSection = () => {
    if (!window.confirm('ترجيع القسم ده للمحتوى الافتراضي؟ (التغيير مش هيتحفظ غير لما تدوس حفظ)')) return
    set(active, DEFAULT_LANDING_CONTENT[active])
  }

  if (status === 'loading') {
    return (
      <div className="flex items-center gap-2 rounded-3xl bg-white p-8 text-sm text-gray-500 shadow-sm">
        <Loader2 size={16} className="animate-spin" aria-hidden="true" /> جارٍ تحميل محتوى الصفحة…
      </div>
    )
  }

  if (status === 'error') {
    return (
      <div className="max-w-md rounded-3xl border border-red-100 bg-red-50 p-6 text-center">
        <p className="mb-3 text-sm text-red-700">تعذّر تحميل محتوى الصفحة الرئيسية.</p>
        <button
          type="button"
          onClick={() => load()}
          className="inline-flex items-center gap-2 rounded-xl bg-[#7a0d0d] px-4 py-2 text-sm font-black text-white"
        >
          <RefreshCw size={14} aria-hidden="true" /> إعادة المحاولة
        </button>
      </div>
    )
  }

  const section = SECTIONS.find((s) => s.key === active) ?? SECTIONS[0]
  const sectionValue = draft[section.key] as { enabled?: boolean }
  const enabled = !section.toggleable || sectionValue.enabled !== false
  const lastSaved = fmtTime(updatedAt)

  return (
    <div className="grid gap-6 lg:grid-cols-[17rem_minmax(0,1fr)]">
      {/* Section list */}
      <nav aria-label="أقسام الصفحة" className="lg:sticky lg:top-24 lg:self-start">
        <div className="rounded-3xl bg-white p-2 shadow-sm ring-1 ring-[#efe3cc]">
          <p className="px-3 pb-2 pt-2 text-[11px] font-black text-gray-400">أقسام الصفحة</p>
          <ul className="flex gap-1.5 overflow-x-auto pb-1 lg:flex-col lg:overflow-visible lg:pb-0">
            {SECTIONS.map((s) => {
              const on = !s.toggleable || (draft[s.key] as { enabled?: boolean }).enabled !== false
              const isActive = s.key === active
              const changed = JSON.stringify(draft[s.key]) !== JSON.stringify(saved[s.key])
              return (
                <li key={s.key} className="shrink-0">
                  <button
                    type="button"
                    onClick={() => setActive(s.key)}
                    aria-current={isActive ? 'true' : undefined}
                    className={`flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-right transition ${
                      isActive ? 'bg-[#7a0d0d] text-white shadow-md' : 'text-gray-700 hover:bg-[#faf3e7]'
                    }`}
                  >
                    <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-xl ${isActive ? 'bg-white/15 text-[#ffd27a]' : 'bg-[#faf3e7] text-[#7a0d0d]'}`}>
                      <s.icon size={16} aria-hidden="true" />
                    </span>
                    <span className={`whitespace-nowrap text-sm font-bold lg:flex-1 ${on ? '' : 'line-through opacity-60'}`}>{s.title}</span>
                    {changed && <span className="h-2 w-2 shrink-0 rounded-full bg-[#e0a52e]" aria-label="فيه تعديلات" />}
                    {!on && <EyeOff size={14} className="shrink-0 opacity-60" aria-label="مخفي" />}
                  </button>
                </li>
              )
            })}
          </ul>
        </div>
      </nav>

      {/* Active section */}
      <div className="min-w-0 space-y-4">
        {!hasSaved && (
          <p className="flex items-start gap-2 rounded-2xl border border-sky-100 bg-sky-50 p-3 text-xs font-bold text-sky-800">
            <AlertTriangle size={14} className="mt-0.5 shrink-0" aria-hidden="true" />
            الصفحة بتعرض المحتوى الافتراضي حاليًا. أول ما تحفظ، تعديلاتك هتظهر للزوار.
          </p>
        )}

        <section className="overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-[#efe3cc]">
          <header className="flex flex-wrap items-center justify-between gap-3 border-b border-[#f3ead9] bg-gradient-to-l from-[#fffaf1] to-white px-6 py-5">
            <div className="flex items-center gap-3">
              <span className="grid h-11 w-11 place-items-center rounded-2xl bg-[#7a0d0d] text-[#ffd27a] shadow">
                <section.icon size={20} aria-hidden="true" />
              </span>
              <div>
                <h2 className="text-lg font-black text-[#7a0d0d]">{section.title}</h2>
                <p className="text-xs text-gray-500">{section.description}</p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {section.toggleable && (
                <button
                  type="button"
                  onClick={() => set(section.key, { ...(draft[section.key] as object), enabled: !enabled } as never)}
                  aria-pressed={enabled}
                  className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-black transition ${
                    enabled ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200 hover:bg-emerald-100' : 'bg-gray-100 text-gray-500 ring-1 ring-gray-200 hover:bg-gray-200'
                  }`}
                >
                  {enabled ? <Eye size={14} aria-hidden="true" /> : <EyeOff size={14} aria-hidden="true" />}
                  {enabled ? 'القسم ظاهر' : 'القسم مخفي'}
                </button>
              )}
              <button
                type="button"
                onClick={resetSection}
                className="inline-flex items-center gap-1.5 rounded-xl border border-[#e8dcc4] bg-white px-3 py-2 text-xs font-bold text-gray-600 hover:bg-[#faf3e7]"
              >
                <RotateCcw size={14} aria-hidden="true" /> المحتوى الافتراضي
              </button>
            </div>
          </header>
          <div className={`space-y-6 p-6 ${enabled ? '' : 'opacity-60'}`}>{section.render(draft, set)}</div>
        </section>

        {/* Save bar */}
        <div className="sticky bottom-4 z-20 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-white/95 p-3 shadow-lg ring-1 ring-[#efe3cc] backdrop-blur">
          <div className="px-2 text-xs">
            {saveError ? (
              <span className="font-bold text-red-600" aria-live="polite">{saveError}</span>
            ) : dirty ? (
              <span className="flex items-center gap-1.5 font-bold text-[#b68614]">
                <span className="h-2 w-2 rounded-full bg-[#e0a52e]" /> تعديلات غير محفوظة
              </span>
            ) : (
              <span className="text-gray-400">{lastSaved ? `آخر حفظ: ${lastSaved}` : 'كل التعديلات محفوظة'}</span>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {dirty && (
              <button
                type="button"
                onClick={() => { setDraft(saved); setSaveError(null) }}
                className="rounded-xl px-3 py-2.5 text-sm font-bold text-gray-500 hover:bg-gray-50"
              >
                تجاهل التعديلات
              </button>
            )}
            <button
              type="button"
              onClick={preview}
              className="inline-flex items-center gap-1.5 rounded-xl border border-[#e8dcc4] bg-white px-4 py-2.5 text-sm font-bold text-[#7a0d0d] hover:bg-[#faf3e7]"
            >
              <ExternalLink size={15} aria-hidden="true" /> معاينة
            </button>
            <button
              type="button"
              onClick={save}
              disabled={!dirty || saving}
              aria-busy={saving}
              className="inline-flex items-center gap-1.5 rounded-xl bg-[#7a0d0d] px-5 py-2.5 text-sm font-black text-white shadow-md shadow-[#7a0d0d]/20 transition hover:bg-[#5a0909] disabled:opacity-50"
            >
              {saving ? <Loader2 size={15} className="animate-spin" aria-hidden="true" /> : <Save size={15} aria-hidden="true" />}
              {saving ? 'جارٍ الحفظ…' : 'حفظ ونشر'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
