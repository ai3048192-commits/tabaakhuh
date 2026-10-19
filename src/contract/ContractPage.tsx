import { useCallback, useEffect, useState } from 'react'
import { Eye, FileSignature, Loader2, Pencil, RefreshCw } from 'lucide-react'
import PageHeader from '../shared/PageHeader'
import DialogShell from '../shared/DialogShell'
import { ApiError } from '../api/envelope'
import ContractEditor from './ContractEditor'
import { listContracts, startDraft, type ContractVersion } from './contractApi'

const dateFmt = new Intl.DateTimeFormat('ar-EG', { day: 'numeric', month: 'long', year: 'numeric' })
const fmt = (iso: string | null) => (iso ? dateFmt.format(new Date(iso)) : '—')

/**
 * `/contract` — the cook contract (specs/070). The current published
 * version, the version history, and one draft at a time edited in
 * {@link ContractEditor}. A published version is read-only: "edit" copies it
 * into a new draft.
 */
export default function ContractPage() {
  const [versions, setVersions] = useState<ContractVersion[]>([])
  const [placeholders, setPlaceholders] = useState<string[]>([])
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')
  const [editing, setEditing] = useState<ContractVersion | null>(null)
  const [viewing, setViewing] = useState<ContractVersion | null>(null)
  const [opening, setOpening] = useState(false)
  const [toast, setToast] = useState<string | null>(null)

  const showToast = (msg: string) => {
    setToast(msg)
    window.setTimeout(() => setToast((t) => (t === msg ? null : t)), 5000)
  }

  const load = useCallback(async () => {
    setStatus('loading')
    try {
      const data = await listContracts()
      setVersions(data.versions)
      setPlaceholders(data.placeholders)
      setStatus('ready')
    } catch {
      setStatus('error')
    }
  }, [])

  useEffect(() => { void load() }, [load])

  const current = versions.find((v) => v.is_current) ?? null
  const draft = versions.find((v) => v.status === 'draft') ?? null

  const edit = async () => {
    setOpening(true)
    try {
      const d = await startDraft()
      setEditing(d)
      setVersions((vs) => (vs.some((v) => v.id === d.id) ? vs : [d, ...vs]))
    } catch (e) {
      showToast(e instanceof ApiError ? e.message : 'تعذّر فتح المسودة، حاول تاني.')
    } finally {
      setOpening(false)
    }
  }

  return (
    <div className="min-h-full bg-[#f7f1e6] p-4 font-['Tajawal'] md:p-8" dir="rtl">
      <PageHeader
        title="عقد الطباخة"
        subtitle="عدّل نص العقد واحفظه كمسودة، وانشره لما يبقى جاهز"
        actions={
          !editing && status === 'ready' ? (
            <button
              type="button"
              onClick={edit}
              disabled={opening}
              className="inline-flex items-center gap-1.5 rounded-xl bg-white px-4 py-2.5 text-sm font-black text-[#7a0d0d] shadow transition hover:bg-[#fff5e1]"
            >
              {opening ? <Loader2 size={16} className="animate-spin" /> : <Pencil size={16} />}
              {draft ? 'كمّل تعديل المسودة' : 'تعديل العقد'}
            </button>
          ) : undefined
        }
      />

      {status === 'loading' && <div className="h-40 animate-pulse rounded-3xl bg-white/70" aria-hidden="true" />}

      {status === 'error' && (
        <div className="max-w-md rounded-3xl border border-red-100 bg-red-50 p-6 text-center">
          <p className="mb-3 text-sm text-red-700">تعذّر تحميل العقد.</p>
          <button type="button" onClick={load} className="inline-flex items-center gap-2 rounded-xl bg-[#7a0d0d] px-4 py-2 text-sm font-black text-white">
            <RefreshCw size={14} /> إعادة المحاولة
          </button>
        </div>
      )}

      {status === 'ready' && editing && (
        <ContractEditor
          key={editing.id}
          draft={editing}
          placeholders={placeholders}
          onToast={showToast}
          onSaved={(v) => setVersions((vs) => vs.map((x) => (x.id === v.id ? v : x)))}
          onPublished={(v) => {
            setEditing(null)
            showToast(`اتنشر العقد ${v.label} — أي طباخة جديدة هتوقّعه.`)
            void load()
          }}
          onDeleted={() => { setEditing(null); void load() }}
          onClose={() => { setEditing(null); void load() }}
        />
      )}

      {status === 'ready' && !editing && (
        <div className="space-y-6">
          <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-[#efe3cc]">
            <div className="flex flex-wrap items-center gap-4">
              <span className="grid h-12 w-12 place-items-center rounded-2xl bg-[#7a0d0d]/10 text-[#7a0d0d]">
                <FileSignature size={24} />
              </span>
              <div className="flex-1">
                <p className="text-xs font-bold text-gray-400">العقد الحالي</p>
                <p className="text-lg font-black text-[#3b2a1e]">{current ? `${current.title} — ${current.label}` : 'مفيش عقد منشور'}</p>
                {current && (
                  <p className="text-xs text-gray-500">
                    اتنشر {fmt(current.published_at)} · وقّعت عليه {current.signature_count} طباخة
                  </p>
                )}
              </div>
              {current && (
                <button type="button" onClick={() => setViewing(current)} className="inline-flex items-center gap-1.5 rounded-xl bg-[#fff5e1] px-3 py-2 text-sm font-black text-[#7a0d0d] ring-1 ring-[#efe3cc]">
                  <Eye size={15} /> عرض
                </button>
              )}
            </div>
            {draft && (
              <p className="mt-4 rounded-xl bg-amber-50 p-3 text-xs font-bold text-amber-800">
                فيه مسودة {draft.label} لسه ما اتنشرتش (آخر حفظ {fmt(draft.updated_at)}). الطباخات مش شايفينها لحد ما تنشرها.
              </p>
            )}
          </div>

          <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-[#efe3cc]">
            <h2 className="mb-3 text-sm font-black text-[#6b4f3a]">سجل النسخ</h2>
            <ul className="divide-y divide-[#f3ead8]">
              {versions.map((v) => (
                <li key={v.id} className="flex flex-wrap items-center gap-3 py-3">
                  <span className="w-10 font-black text-[#7a0d0d]">{v.label}</span>
                  <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${
                    v.status === 'draft' ? 'bg-amber-100 text-amber-800' : v.is_current ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-100 text-gray-600'
                  }`}>
                    {v.status === 'draft' ? 'مسودة' : v.is_current ? 'الحالي' : 'قديم'}
                  </span>
                  <span className="flex-1 text-xs text-gray-500">
                    {v.status === 'draft' ? `آخر حفظ ${fmt(v.updated_at)}` : `اتنشر ${fmt(v.published_at)} · ${v.signature_count} توقيع`}
                    {v.requires_resign && ' · طلب إعادة توقيع'}
                    {v.change_note && <span className="block text-gray-600">{v.change_note}</span>}
                  </span>
                  <button
                    type="button"
                    onClick={() => (v.status === 'draft' ? setEditing(v) : setViewing(v))}
                    className="rounded-xl px-3 py-1.5 text-xs font-black text-[#7a0d0d] ring-1 ring-[#efe3cc] hover:bg-[#fff5e1]"
                  >
                    {v.status === 'draft' ? 'تعديل' : 'عرض'}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {viewing && (
        <DialogShell label={`العقد ${viewing.label}`} onDismiss={() => setViewing(null)} size="md">
          <div className="max-h-[70vh] overflow-y-auto">
            <h3 className="text-center text-base font-black text-[#9a1212]">{viewing.title} — {viewing.label}</h3>
            {viewing.intro && <p className="mt-2 text-sm text-[#6b4f3a]">{viewing.intro}</p>}
            {viewing.sections.map((s, i) => (
              <section key={i} className="mt-3">
                <h4 className="text-sm font-black text-[#9a1212]">{s.title}</h4>
                {s.clauses.map((c, j) => <p key={j} className="mt-1 text-sm leading-7">{s.clauses.length > 1 ? `${j + 1}. ` : ''}{c}</p>)}
              </section>
            ))}
            <h4 className="mt-4 text-sm font-black">الإقرارات</h4>
            {viewing.acknowledgements.map((a, i) => <p key={i} className="mt-1 text-sm">☐ {a.text}</p>)}
            <p className="mt-3 rounded-xl bg-[#faf3e7] p-3 text-sm">{viewing.declaration}</p>
          </div>
          <div className="mt-4 flex justify-end">
            <button type="button" onClick={() => setViewing(null)} className="rounded-xl px-3 py-2 text-sm font-bold text-gray-500 hover:bg-gray-100">قفل</button>
          </div>
        </DialogShell>
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
