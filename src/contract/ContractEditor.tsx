import { useEffect, useState } from 'react'
import { ArrowDown, ArrowUp, FileDown, Loader2, Plus, Save, Send, Trash2, X } from 'lucide-react'
import DialogShell from '../shared/DialogShell'
import { ApiError } from '../api/envelope'
import {
  PLACEHOLDER_INFO,
  contentOf,
  deleteDraft,
  fillSample,
  openPreviewPdf,
  publishVersion,
  saveDraft,
  type ContractContent,
  type ContractVersion,
} from './contractApi'

function move<T>(list: T[], from: number, to: number): T[] {
  if (to < 0 || to >= list.length) return list
  const next = [...list]
  const [item] = next.splice(from, 1)
  next.splice(to, 0, item)
  return next
}

/** Which text field the placeholder bar writes into. */
type FieldPath =
  | { kind: 'title' }
  | { kind: 'intro' }
  | { kind: 'sectionTitle'; si: number }
  | { kind: 'clause'; si: number; ci: number }
  | { kind: 'ack'; ai: number }
  | { kind: 'declaration' }
  | { kind: 'footer' }

function withText(c: ContractContent, path: FieldPath, text: string): ContractContent {
  switch (path.kind) {
    case 'title': return { ...c, title: text }
    case 'intro': return { ...c, intro: text }
    case 'declaration': return { ...c, declaration: text }
    case 'footer': return { ...c, footer: text }
    case 'sectionTitle':
      return { ...c, sections: c.sections.map((s, i) => (i === path.si ? { ...s, title: text } : s)) }
    case 'clause':
      return {
        ...c,
        sections: c.sections.map((s, i) =>
          i === path.si ? { ...s, clauses: s.clauses.map((x, j) => (j === path.ci ? text : x)) } : s,
        ),
      }
    case 'ack':
      return { ...c, acknowledgements: c.acknowledgements.map((a, i) => (i === path.ai ? { ...a, text } : a)) }
  }
}

const inputCls =
  'w-full rounded-xl border border-[#efe3cc] bg-white px-3 py-2 text-sm leading-relaxed outline-none focus:border-[#7a0d0d]'

/**
 * specs/070 — edits one contract draft: title, intro, sections (each with
 * its clauses), the acknowledgements she ticks, the closing declaration and
 * the footer. "Save" keeps the draft; "Publish" makes it the contract new
 * cooks sign (and, optionally, asks existing cooks to sign it again). The
 * placeholder bar inserts `{signer_name}`-style fields at the cursor; the
 * preview fills them with a sample cook.
 */
export default function ContractEditor({
  draft,
  placeholders,
  onSaved,
  onPublished,
  onDeleted,
  onClose,
  onToast,
}: {
  draft: ContractVersion
  placeholders: string[]
  onSaved: (v: ContractVersion) => void
  onPublished: (v: ContractVersion) => void
  onDeleted: () => void
  onClose: () => void
  onToast: (msg: string) => void
}) {
  const [content, setContent] = useState<ContractContent>(() => contentOf(draft))
  const [savedJson, setSavedJson] = useState(() => JSON.stringify(contentOf(draft)))
  const [busy, setBusy] = useState<'save' | 'pdf' | 'publish' | 'delete' | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [publishing, setPublishing] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [focused, setFocused] = useState<{ el: HTMLInputElement | HTMLTextAreaElement; path: FieldPath } | null>(null)

  const dirty = JSON.stringify(content) !== savedJson

  // Leaving with unsaved edits asks first.
  useEffect(() => {
    const warn = (e: BeforeUnloadEvent) => {
      if (dirty) e.preventDefault()
    }
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [dirty])

  /** Binds a text field: its value, edits, and the cursor the placeholder bar inserts at. */
  const field = (path: FieldPath, value: string) => ({
    value,
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setContent((c) => withText(c, path, e.target.value)),
    onFocus: (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setFocused({ el: e.currentTarget, path }),
  })

  const insertPlaceholder = (name: string) => {
    if (!focused) {
      onToast('اضغط الأول في الخانة اللي عايز تضيف فيها.')
      return
    }
    const { el, path } = focused
    const token = `{${name}}`
    const start = el.selectionStart ?? el.value.length
    const end = el.selectionEnd ?? start
    const next = el.value.slice(0, start) + token + el.value.slice(end)
    setContent((c) => withText(c, path, next))
    requestAnimationFrame(() => {
      el.focus()
      el.setSelectionRange(start + token.length, start + token.length)
    })
  }

  const set = <K extends keyof ContractContent>(key: K, value: ContractContent[K]) =>
    setContent((c) => ({ ...c, [key]: value }))

  const setSection = (i: number, patch: Partial<ContractContent['sections'][number]>) =>
    set('sections', content.sections.map((s, idx) => (idx === i ? { ...s, ...patch } : s)))


  const message = (e: unknown) => (e instanceof ApiError ? e.message : 'حصلت مشكلة، حاول تاني.')

  const save = async (): Promise<ContractVersion | null> => {
    setBusy('save')
    setError(null)
    try {
      const v = await saveDraft(draft.id, content)
      setSavedJson(JSON.stringify(contentOf(v)))
      onSaved(v)
      onToast('اتحفظت المسودة.')
      return v
    } catch (e) {
      setError(message(e))
      return null
    } finally {
      setBusy(null)
    }
  }

  const previewPdf = async () => {
    if (dirty && !(await save())) return
    setBusy('pdf')
    try {
      await openPreviewPdf(draft.id)
    } catch (e) {
      setError(message(e))
    } finally {
      setBusy(null)
    }
  }

  const remove = async () => {
    setBusy('delete')
    try {
      await deleteDraft(draft.id)
      onToast('اتمسحت المسودة.')
      onDeleted()
    } catch (e) {
      setError(message(e))
    } finally {
      setBusy(null)
      setConfirmDelete(false)
    }
  }

  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
      {/* ── Editor ───────────────────────────────────────────── */}
      <div className="space-y-4">
        <div className="sticky top-2 z-10 rounded-2xl bg-white/95 p-3 shadow ring-1 ring-[#efe3cc] backdrop-blur">
          <p className="mb-2 text-xs font-black text-[#6b4f3a]">خانات بتتملي لوحدها — اضغط في أي خانة نص وبعدين اختار:</p>
          <div className="flex flex-wrap gap-1.5">
            {placeholders.map((p) => (
              <button
                key={p}
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => insertPlaceholder(p)}
                className="rounded-full bg-[#fff5e1] px-2.5 py-1 text-xs font-bold text-[#7a0d0d] ring-1 ring-[#efe3cc] hover:bg-[#ffe9bf]"
              >
                {PLACEHOLDER_INFO[p]?.label ?? p}
              </button>
            ))}
          </div>
        </div>

        <Card title="العنوان والمقدمة">
          <input
            className={inputCls}
            {...field({ kind: 'title' }, content.title)}
          />
          <textarea
            className={`${inputCls} mt-2`}
            rows={3}
            placeholder="مقدمة قصيرة بتظهر فوق العقد (اختياري)"
            {...field({ kind: 'intro' }, content.intro)}
          />
        </Card>

        {content.sections.map((section, si) => (
          <Card
            key={si}
            title={`البند ${si + 1}`}
            actions={
              <>
                <IconBtn label="لفوق" onClick={() => set('sections', move(content.sections, si, si - 1))}><ArrowUp size={14} /></IconBtn>
                <IconBtn label="لتحت" onClick={() => set('sections', move(content.sections, si, si + 1))}><ArrowDown size={14} /></IconBtn>
                <IconBtn label="امسح البند" danger onClick={() => set('sections', content.sections.filter((_, i) => i !== si))}><Trash2 size={14} /></IconBtn>
              </>
            }
          >
            <input
              className={`${inputCls} font-black`}
              placeholder="عنوان البند"
              {...field({ kind: 'sectionTitle', si }, section.title)}
            />
            <div className="mt-2 space-y-2">
              {section.clauses.map((clause, ci) => (
                <div key={ci} className="flex gap-2">
                  <span className="mt-2 w-5 shrink-0 text-center text-xs font-black text-gray-400">{ci + 1}</span>
                  <textarea
                    className={inputCls}
                    rows={Math.min(8, Math.max(2, Math.ceil(clause.length / 70)))}
                    {...field({ kind: 'clause', si, ci }, clause)}
                  />
                  <div className="flex shrink-0 flex-col gap-1">
                    <IconBtn label="لفوق" onClick={() => setSection(si, { clauses: move(section.clauses, ci, ci - 1) })}><ArrowUp size={12} /></IconBtn>
                    <IconBtn label="لتحت" onClick={() => setSection(si, { clauses: move(section.clauses, ci, ci + 1) })}><ArrowDown size={12} /></IconBtn>
                    <IconBtn label="امسح الفقرة" danger onClick={() => setSection(si, { clauses: section.clauses.filter((_, i) => i !== ci) })}><X size={12} /></IconBtn>
                  </div>
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={() => setSection(si, { clauses: [...section.clauses, ''] })}
              className="mt-2 inline-flex items-center gap-1 text-xs font-black text-[#7a0d0d] hover:underline"
            >
              <Plus size={14} /> إضافة فقرة
            </button>
          </Card>
        ))}

        <button
          type="button"
          onClick={() => set('sections', [...content.sections, { title: '', clauses: [''] }])}
          className="inline-flex w-full items-center justify-center gap-1.5 rounded-2xl border-2 border-dashed border-[#e0cfae] py-3 text-sm font-black text-[#7a0d0d] hover:bg-white"
        >
          <Plus size={16} /> إضافة بند
        </button>

        <Card title="الإقرارات (الطباخة بتعلّم عليها قبل التوقيع)">
          <div className="space-y-2">
            {content.acknowledgements.map((ack, ai) => (
              <div key={ai} className="flex gap-2">
                <textarea
                  className={inputCls}
                  rows={2}
                  {...field({ kind: 'ack', ai }, ack.text)}
                />
                <div className="flex shrink-0 flex-col gap-1">
                  <IconBtn label="لفوق" onClick={() => set('acknowledgements', move(content.acknowledgements, ai, ai - 1))}><ArrowUp size={12} /></IconBtn>
                  <IconBtn label="لتحت" onClick={() => set('acknowledgements', move(content.acknowledgements, ai, ai + 1))}><ArrowDown size={12} /></IconBtn>
                  <IconBtn label="امسح" danger onClick={() => set('acknowledgements', content.acknowledgements.filter((_, i) => i !== ai))}><X size={12} /></IconBtn>
                </div>
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={() => set('acknowledgements', [...content.acknowledgements, { key: null, text: '' }])}
            className="mt-2 inline-flex items-center gap-1 text-xs font-black text-[#7a0d0d] hover:underline"
          >
            <Plus size={14} /> إضافة إقرار
          </button>
        </Card>

        <Card title="الإقرار الأخير (فوق التوقيع) والتذييل">
          <textarea
            className={inputCls}
            rows={3}
            {...field({ kind: 'declaration' }, content.declaration)}
          />
          <textarea
            className={`${inputCls} mt-2`}
            rows={2}
            placeholder="تذييل (اختياري)"
            {...field({ kind: 'footer' }, content.footer)}
          />
        </Card>

        {error && <p className="rounded-2xl bg-red-50 p-3 text-sm font-bold text-red-700">{error}</p>}

        <div className="sticky bottom-3 z-10 flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-white/95 p-3 shadow-lg ring-1 ring-[#efe3cc] backdrop-blur">
          <span className="text-xs font-bold">
            {dirty ? <span className="text-[#b68614]">● تغييرات غير محفوظة</span> : <span className="text-gray-400">المسودة محفوظة</span>}
          </span>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => (dirty && !window.confirm('في تغييرات ما اتحفظتش. تخرج من غير حفظ؟') ? null : onClose())} className="rounded-xl px-3 py-2 text-sm font-bold text-gray-500 hover:bg-gray-100">
              رجوع
            </button>
            <button type="button" onClick={() => setConfirmDelete(true)} disabled={busy !== null} className="inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-bold text-red-600 hover:bg-red-50">
              <Trash2 size={15} /> مسح المسودة
            </button>
            <button type="button" onClick={previewPdf} disabled={busy !== null} className="inline-flex items-center gap-1.5 rounded-xl bg-[#fff5e1] px-3 py-2 text-sm font-black text-[#7a0d0d] ring-1 ring-[#efe3cc]">
              {busy === 'pdf' ? <Loader2 size={15} className="animate-spin" /> : <FileDown size={15} />} معاينة PDF
            </button>
            <button type="button" onClick={() => void save()} disabled={busy !== null || !dirty} className="inline-flex items-center gap-1.5 rounded-xl bg-white px-3 py-2 text-sm font-black text-[#7a0d0d] ring-1 ring-[#7a0d0d] disabled:opacity-50">
              {busy === 'save' ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />} حفظ
            </button>
            <button
              type="button"
              onClick={async () => { if (!dirty || (await save())) setPublishing(true) }}
              disabled={busy !== null}
              className="inline-flex items-center gap-1.5 rounded-xl bg-[#7a0d0d] px-4 py-2 text-sm font-black text-white hover:bg-[#5a0909]"
            >
              <Send size={15} /> نشر
            </button>
          </div>
        </div>
      </div>

      {/* ── Preview ──────────────────────────────────────────── */}
      <div className="xl:sticky xl:top-2 xl:max-h-[calc(100vh-1rem)] xl:overflow-y-auto">
        <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-[#efe3cc]">
          <p className="mb-3 text-center text-xs font-bold text-gray-400">معاينة — كده الطباخة هتشوف العقد (ببيانات طباخة تجريبية)</p>
          <h2 className="text-center text-lg font-black text-[#9a1212]">{fillSample(content.title, draft.label)}</h2>
          {content.intro && <p className="mt-3 rounded-xl bg-[#faf3e7] p-3 text-sm text-[#6b4f3a]">{fillSample(content.intro, draft.label)}</p>}
          {content.sections.map((s, si) => (
            <section key={si} className="mt-4">
              <h3 className="text-sm font-black text-[#9a1212]">{fillSample(s.title, draft.label)}</h3>
              {s.clauses.map((c, ci) => (
                <p key={ci} className="mt-1 text-sm leading-7 text-[#3b2a1e]">
                  {s.clauses.length > 1 ? `${ci + 1}. ` : ''}{fillSample(c, draft.label)}
                </p>
              ))}
            </section>
          ))}
          <h3 className="mt-5 text-sm font-black text-[#3b2a1e]">الإقرارات</h3>
          {content.acknowledgements.map((a, ai) => (
            <label key={ai} className="mt-1 flex items-start gap-2 text-sm text-[#3b2a1e]">
              <input type="checkbox" disabled className="mt-1.5" /> {fillSample(a.text, draft.label)}
            </label>
          ))}
          <p className="mt-4 rounded-xl bg-[#faf3e7] p-3 text-sm text-[#3b2a1e]">{fillSample(content.declaration, draft.label)}</p>
          {content.footer && <p className="mt-3 text-xs text-gray-500">{fillSample(content.footer, draft.label)}</p>}
        </div>
      </div>

      {publishing && (
        <PublishDialog
          draft={draft}
          onDismiss={() => setPublishing(false)}
          onDone={(v) => { setPublishing(false); onPublished(v) }}
          onError={setError}
        />
      )}

      {confirmDelete && (
        <DialogShell label="مسح المسودة" onDismiss={() => setConfirmDelete(false)}>
          <h3 className="mb-2 text-base font-black text-gray-900">تمسح المسودة دي؟</h3>
          <p className="mb-4 text-sm text-gray-500">كل التعديلات اللي في المسودة هتتمسح. العقد المنشور مش هيتأثر.</p>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setConfirmDelete(false)} className="rounded-xl px-3 py-2 text-sm font-bold text-gray-500 hover:bg-gray-100">رجوع</button>
            <button type="button" onClick={remove} disabled={busy === 'delete'} className="inline-flex items-center gap-1.5 rounded-xl bg-red-600 px-4 py-2 text-sm font-black text-white">
              {busy === 'delete' && <Loader2 size={15} className="animate-spin" />} مسح
            </button>
          </div>
        </DialogShell>
      )}
    </div>
  )
}

function PublishDialog({
  draft,
  onDismiss,
  onDone,
  onError,
}: {
  draft: ContractVersion
  onDismiss: () => void
  onDone: (v: ContractVersion) => void
  onError: (msg: string) => void
}) {
  const [note, setNote] = useState('')
  const [resign, setResign] = useState(false)
  const [busy, setBusy] = useState(false)
  const [localError, setLocalError] = useState<string | null>(null)

  const publish = async () => {
    if (note.trim().length < 3) {
      setLocalError('اكتب ملخّص التغييرات اللي في النسخة دي.')
      return
    }
    setBusy(true)
    try {
      onDone(await publishVersion(draft.id, note.trim(), resign))
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : 'حصلت مشكلة، حاول تاني.'
      setLocalError(msg)
      onError(msg)
    } finally {
      setBusy(false)
    }
  }

  return (
    <DialogShell label="نشر العقد" onDismiss={onDismiss} size="md">
      <h3 className="mb-1 text-base font-black text-gray-900">نشر العقد {draft.label}</h3>
      <p className="mb-4 rounded-xl bg-amber-50 p-3 text-xs font-bold leading-relaxed text-amber-800">
        النسخة دي هتبقى العقد الرسمي اللي أي طباخة جديدة بتوقّعه، ومش هتقدر تعدّلها بعد النشر (أي تعديل بعد كده بيعمل نسخة جديدة). العقود اللي اتوقّعت قبل كده بتفضل بنصها.
      </p>
      <label className="block">
        <span className="mb-1 block text-xs font-black text-[#6b4f3a]">ملخّص التغييرات (الطباخات هيشوفوه لو طلبت منهم يوقّعوا تاني)</span>
        <textarea
          className={inputCls}
          rows={4}
          value={note}
          onChange={(e) => { setNote(e.target.value); setLocalError(null) }}
          placeholder="مثلًا: التوصيل بقى عن طريق دليفري الطباخة، ومفيش عمولة حاليًا."
        />
      </label>
      <label className="mt-3 flex items-start gap-2 text-sm font-bold text-[#3b2a1e]">
        <input type="checkbox" checked={resign} onChange={(e) => setResign(e.target.checked)} className="mt-1" />
        اطلب من الطباخات الحاليين يوقّعوا النسخة الجديدة (هتظهر لهم شاشة في التطبيق ما تتقفلش غير لما يوقّعوا)
      </label>
      {localError && <p className="mt-3 text-sm font-bold text-red-600">{localError}</p>}
      <div className="mt-5 flex justify-end gap-2">
        <button type="button" onClick={onDismiss} className="rounded-xl px-3 py-2 text-sm font-bold text-gray-500 hover:bg-gray-100">رجوع</button>
        <button type="button" onClick={publish} disabled={busy} className="inline-flex items-center gap-1.5 rounded-xl bg-[#7a0d0d] px-4 py-2 text-sm font-black text-white">
          {busy && <Loader2 size={15} className="animate-spin" />} نشر
        </button>
      </div>
    </DialogShell>
  )
}

function Card({ title, actions, children }: { title: string; actions?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="rounded-3xl bg-white p-4 shadow-sm ring-1 ring-[#efe3cc]">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-sm font-black text-[#6b4f3a]">{title}</h3>
        {actions && <div className="flex gap-1">{actions}</div>}
      </div>
      {children}
    </div>
  )
}

function IconBtn({ label, onClick, danger, children }: { label: string; onClick: () => void; danger?: boolean; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className={`grid h-7 w-7 place-items-center rounded-lg ring-1 ring-[#efe3cc] ${danger ? 'text-red-600 hover:bg-red-50' : 'text-gray-500 hover:bg-gray-50'}`}
    >
      {children}
    </button>
  )
}
