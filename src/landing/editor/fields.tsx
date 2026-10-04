import { useEffect, useId, useRef, useState, type ReactNode } from 'react'
import {
  ArrowDown, ArrowUp, Copy, ImagePlus, Link2, Loader2, Plus, Trash2, UploadCloud, X,
} from 'lucide-react'
import {
  ACCEPT_ATTR, CloudinaryError, cloudinaryConfigured, uploadImage, type UploadErrorKind,
} from '../../settings/cloudinary'
import { ICON_KEYS, ICONS, type IconKey } from '../icons'
import LandingIcon from '../LandingIcon'
import { newId } from '../content'

const inputCls =
  'w-full rounded-xl border border-[#e8dcc4] bg-white px-3.5 py-2.5 text-sm text-gray-800 shadow-sm outline-none transition placeholder:text-gray-300 focus:border-[#7a0d0d] focus:ring-4 focus:ring-[#7a0d0d]/10'

export function Text({
  label, value, onChange, placeholder, hint, ltr, multiline, rows = 3,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
  hint?: string
  ltr?: boolean
  multiline?: boolean
  rows?: number
}) {
  const id = useId()
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-xs font-black text-[#6b4f3a]">{label}</label>
      {multiline ? (
        <textarea
          id={id}
          rows={rows}
          value={value}
          placeholder={placeholder}
          dir={ltr ? 'ltr' : undefined}
          onChange={(e) => onChange(e.target.value)}
          className={`${inputCls} resize-y leading-relaxed`}
        />
      ) : (
        <input
          id={id}
          value={value}
          placeholder={placeholder}
          dir={ltr ? 'ltr' : undefined}
          onChange={(e) => onChange(e.target.value)}
          className={inputCls}
        />
      )}
      {hint && <p className="text-[11px] text-gray-400">{hint}</p>}
    </div>
  )
}

export function Switch({
  label, checked, onChange, description,
}: {
  label: string
  checked: boolean
  onChange: (v: boolean) => void
  description?: string
}) {
  const id = useId()
  return (
    <label
      htmlFor={id}
      className="flex cursor-pointer items-center justify-between gap-4 rounded-2xl border border-[#efe3cc] bg-white px-4 py-3 transition hover:border-[#d9c39b]"
    >
      <span>
        <span className="block text-sm font-bold text-gray-800">{label}</span>
        {description && <span className="mt-0.5 block text-[11px] text-gray-400">{description}</span>}
      </span>
      <input id={id} type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="peer sr-only" />
      <span
        aria-hidden="true"
        className="relative h-6 w-11 shrink-0 rounded-full bg-gray-200 transition peer-checked:bg-[#7a0d0d] peer-focus-visible:ring-4 peer-focus-visible:ring-[#7a0d0d]/20 after:absolute after:right-0.5 after:top-0.5 after:h-5 after:w-5 after:rounded-full after:bg-white after:shadow after:transition peer-checked:after:-translate-x-5"
      />
    </label>
  )
}

export function IconPicker({ value, onChange }: { value: IconKey; onChange: (v: IconKey) => void }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-xs font-black text-[#6b4f3a]">الأيقونة</span>
      <div className="relative">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          className="flex w-full items-center gap-2 rounded-xl border border-[#e8dcc4] bg-white px-3 py-2 text-sm font-bold text-gray-700 shadow-sm hover:border-[#d9c39b]"
        >
          <span className="grid h-7 w-7 place-items-center rounded-lg bg-[#7a0d0d]/10 text-[#7a0d0d]">
            <LandingIcon name={value} size={16} aria-hidden="true" />
          </span>
          {ICONS[value]?.label ?? value}
        </button>
        {open && (
          <div className="absolute right-0 top-full z-30 mt-2 grid w-64 grid-cols-6 gap-1.5 rounded-2xl border border-[#efe3cc] bg-white p-2.5 shadow-xl">
            {ICON_KEYS.map((k) => {
              return (
                <button
                  key={k}
                  type="button"
                  title={ICONS[k].label}
                  aria-label={ICONS[k].label}
                  onClick={() => { onChange(k); setOpen(false) }}
                  className={`grid h-9 w-9 place-items-center rounded-lg transition ${
                    k === value ? 'bg-[#7a0d0d] text-white' : 'text-gray-600 hover:bg-[#faf3e7] hover:text-[#7a0d0d]'
                  }`}
                >
                  <LandingIcon name={k} size={17} aria-hidden="true" />
                </button>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

const UPLOAD_ERR: Record<UploadErrorKind, string> = {
  unconfigured: 'رفع الصور غير مُفعّل على هذه النسخة — الصق رابط الصورة بدلًا من ذلك.',
  bad_type: 'نوع الملف غير مدعوم. استخدم PNG أو JPG أو WEBP أو SVG.',
  too_large: 'حجم الصورة أكبر من ٥ ميجا.',
  network: 'تعذّر الاتصال. حاول مرة أخرى.',
  rejected: 'تم رفض الصورة. جرّب صورة أخرى.',
}

/**
 * An image slot: upload a file (to Cloudinary) or paste any image URL. An empty
 * value means "use the image that ships with the site", which `fallback` shows.
 */
export function ImageInput({
  label, value, onChange, fallback, hint,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  fallback?: string
  hint?: string
}) {
  const fileRef = useRef<HTMLInputElement>(null)
  const abortRef = useRef<AbortController | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [urlMode, setUrlMode] = useState(false)
  const urlId = useId()
  useEffect(() => () => abortRef.current?.abort(), [])

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setError(null)
    setBusy(true)
    abortRef.current = new AbortController()
    try {
      const { url } = await uploadImage(file, abortRef.current.signal)
      onChange(url)
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return
      setError(UPLOAD_ERR[err instanceof CloudinaryError ? err.kind : 'rejected'])
    } finally {
      setBusy(false)
      abortRef.current = null
    }
  }

  const shown = value.trim() || fallback
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-xs font-black text-[#6b4f3a]">{label}</span>
      <div className="flex items-start gap-3 rounded-2xl border border-dashed border-[#dcc8a4] bg-[#fffdf8] p-3">
        <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-xl border border-[#efe3cc] bg-white">
          {shown ? (
            <img src={shown} alt="" className="h-full w-full object-cover" />
          ) : (
            <span className="grid h-full w-full place-items-center text-gray-300">
              <ImagePlus size={22} aria-hidden="true" />
            </span>
          )}
          {!value.trim() && fallback && (
            <span className="absolute inset-x-0 bottom-0 bg-black/55 py-0.5 text-center text-[9px] font-bold text-white">افتراضية</span>
          )}
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => { setError(null); fileRef.current?.click() }}
              disabled={busy || !cloudinaryConfigured}
              className="inline-flex items-center gap-1.5 rounded-lg bg-[#7a0d0d] px-3 py-1.5 text-xs font-black text-white transition hover:bg-[#5a0909] disabled:opacity-50"
            >
              {busy ? <Loader2 size={13} className="animate-spin" aria-hidden="true" /> : <UploadCloud size={13} aria-hidden="true" />}
              {busy ? 'جارٍ الرفع…' : 'رفع صورة'}
            </button>
            <button
              type="button"
              onClick={() => setUrlMode((m) => !m)}
              aria-expanded={urlMode}
              className="inline-flex items-center gap-1.5 rounded-lg border border-[#e8dcc4] bg-white px-3 py-1.5 text-xs font-bold text-gray-700 hover:bg-[#faf3e7]"
            >
              <Link2 size={13} aria-hidden="true" /> رابط
            </button>
            {value.trim() && (
              <button
                type="button"
                onClick={() => onChange('')}
                className="inline-flex items-center gap-1.5 rounded-lg border border-red-100 bg-white px-3 py-1.5 text-xs font-bold text-red-600 hover:bg-red-50"
              >
                <X size={13} aria-hidden="true" /> {fallback ? 'رجوع للافتراضية' : 'إزالة'}
              </button>
            )}
          </div>
          {urlMode && (
            <>
              <label htmlFor={urlId} className="sr-only">{`${label} — رابط الصورة`}</label>
              <input
                id={urlId}
                dir="ltr"
                value={value}
                placeholder="https://…"
                onChange={(e) => onChange(e.target.value)}
                className={`${inputCls} py-2 text-xs`}
              />
            </>
          )}
          {hint && <p className="text-[11px] text-gray-400">{hint}</p>}
          {error && <p className="text-[11px] font-bold text-red-600" aria-live="polite">{error}</p>}
        </div>
        <input ref={fileRef} type="file" accept={ACCEPT_ATTR} onChange={onFile} className="sr-only" tabIndex={-1} aria-hidden="true" />
      </div>
    </div>
  )
}

/**
 * An editable list: add, delete, duplicate and reorder items. Each item gets a
 * collapsible card; `renderItem` draws its fields.
 */
export function ListEditor<T extends { id: string }>({
  title, items, onChange, makeItem, renderItem, itemTitle, addLabel = 'إضافة عنصر', max,
}: {
  title: string
  items: T[]
  onChange: (items: T[]) => void
  makeItem: () => Omit<T, 'id'>
  renderItem: (item: T, update: (patch: Partial<T>) => void) => ReactNode
  itemTitle: (item: T, index: number) => string
  addLabel?: string
  max?: number
}) {
  const [openId, setOpenId] = useState<string | null>(null)

  const update = (id: string, patch: Partial<T>) =>
    onChange(items.map((it) => (it.id === id ? { ...it, ...patch } : it)))
  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir
    if (j < 0 || j >= items.length) return
    const next = [...items]
    ;[next[i], next[j]] = [next[j], next[i]]
    onChange(next)
  }
  const remove = (id: string) => onChange(items.filter((it) => it.id !== id))
  const duplicate = (i: number) => {
    const copy = { ...items[i], id: newId() }
    onChange([...items.slice(0, i + 1), copy, ...items.slice(i + 1)])
    setOpenId(copy.id)
  }
  const add = () => {
    const item = { ...makeItem(), id: newId() } as T
    onChange([...items, item])
    setOpenId(item.id)
  }
  const full = max != null && items.length >= max
  const iconBtn = 'grid h-8 w-8 place-items-center rounded-lg text-gray-500 transition hover:bg-[#faf3e7] hover:text-[#7a0d0d] disabled:opacity-30 disabled:hover:bg-transparent'

  return (
    <div className="rounded-2xl border border-[#efe3cc] bg-[#fffaf1] p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h4 className="text-sm font-black text-[#7a0d0d]">
          {title} <span className="mr-1 rounded-full bg-white px-2 py-0.5 text-[11px] font-bold text-gray-500">{items.length}</span>
        </h4>
        <button
          type="button"
          onClick={add}
          disabled={full}
          className="inline-flex items-center gap-1.5 rounded-xl bg-[#b68614] px-3 py-1.5 text-xs font-black text-white shadow-sm transition hover:bg-[#9a7110] disabled:opacity-40"
        >
          <Plus size={14} aria-hidden="true" /> {addLabel}
        </button>
      </div>

      {items.length === 0 ? (
        <p className="rounded-xl border border-dashed border-[#e8dcc4] bg-white py-6 text-center text-xs text-gray-400">
          لا توجد عناصر — اضغط «{addLabel}».
        </p>
      ) : (
        <ul className="space-y-2">
          {items.map((it, i) => {
            const open = openId === it.id
            const name = itemTitle(it, i)
            return (
              <li key={it.id} className={`overflow-hidden rounded-xl border bg-white transition ${open ? 'border-[#d9c39b] shadow-sm' : 'border-[#f0e6d3]'}`}>
                <div className="flex items-center gap-1 pl-1.5">
                  <button
                    type="button"
                    onClick={() => setOpenId(open ? null : it.id)}
                    aria-expanded={open}
                    className="flex min-w-0 flex-1 items-center gap-2.5 px-3 py-2.5 text-right"
                  >
                    <span className="grid h-6 w-6 shrink-0 place-items-center rounded-md bg-[#7a0d0d]/10 text-[11px] font-black text-[#7a0d0d]">{i + 1}</span>
                    <span className="truncate text-sm font-bold text-gray-800">{name || 'بدون عنوان'}</span>
                  </button>
                  <button type="button" className={iconBtn} onClick={() => move(i, -1)} disabled={i === 0} aria-label={`تحريك «${name}» لأعلى`}>
                    <ArrowUp size={15} aria-hidden="true" />
                  </button>
                  <button type="button" className={iconBtn} onClick={() => move(i, 1)} disabled={i === items.length - 1} aria-label={`تحريك «${name}» لأسفل`}>
                    <ArrowDown size={15} aria-hidden="true" />
                  </button>
                  <button type="button" className={iconBtn} onClick={() => duplicate(i)} disabled={full} aria-label={`نسخ «${name}»`}>
                    <Copy size={15} aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    className="grid h-8 w-8 place-items-center rounded-lg text-red-400 transition hover:bg-red-50 hover:text-red-600"
                    onClick={() => remove(it.id)}
                    aria-label={`حذف «${name}»`}
                  >
                    <Trash2 size={15} aria-hidden="true" />
                  </button>
                </div>
                {open && (
                  <div className="space-y-4 border-t border-[#f3ead9] bg-[#fffdf8] p-4">
                    {renderItem(it, (patch) => update(it.id, patch))}
                  </div>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

/** A titled group of fields inside a section. */
export function Group({ title, children }: { title?: string; children: ReactNode }) {
  return (
    <div className="space-y-4">
      {title && <h4 className="border-b border-[#f0e6d3] pb-2 text-sm font-black text-[#7a0d0d]">{title}</h4>}
      {children}
    </div>
  )
}

export function Row({ children }: { children: ReactNode }) {
  return <div className="grid gap-4 sm:grid-cols-2">{children}</div>
}
