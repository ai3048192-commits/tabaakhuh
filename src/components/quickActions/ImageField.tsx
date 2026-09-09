import { useEffect, useId, useRef, useState } from 'react'
import { ImagePlus, Loader2, Trash2, UploadCloud } from 'lucide-react'
import {
  ACCEPT_ATTR,
  CloudinaryError,
  cloudinaryConfigured,
  uploadImage,
  type UploadErrorKind,
} from '../../settings/cloudinary'

const ERR_TEXT: Record<UploadErrorKind, string> = {
  unconfigured: 'رفع الصور غير مُهيّأ حاليًا.',
  bad_type: 'نوع الملف غير مدعوم — استخدم PNG أو JPG أو WEBP.',
  too_large: 'حجم الصورة كبير جدًا (الحد 5 ميجابايت).',
  network: 'تعذّر رفع الصورة — تحقّق من الاتصال.',
  rejected: 'رُفض رفع الصورة. حاول بصورة أخرى.',
}

/**
 * Optional image upload for the quick-action application forms. Uploads the
 * picked file straight to Cloudinary (the same unsigned flow as Settings) and
 * hands back the resulting `secure_url` via `onChange`. The raw file never
 * touches our own backend — only the URL is submitted with the form.
 */
export default function ImageField({
  label,
  value,
  onChange,
}: {
  label: string
  /** Current URL for this field ('' when unset). */
  value: string
  onChange: (url: string) => void
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const errId = useId()
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const abortRef = useRef<AbortController | null>(null)
  useEffect(() => () => abortRef.current?.abort(), [])

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = '' // allow re-picking the same file
    if (!file) return
    setErr(null)
    setBusy(true)
    abortRef.current = new AbortController()
    try {
      const { url } = await uploadImage(file, abortRef.current.signal)
      onChange(url)
    } catch (e2) {
      if (e2 instanceof DOMException && e2.name === 'AbortError') return
      const kind: UploadErrorKind = e2 instanceof CloudinaryError ? e2.kind : 'rejected'
      setErr(ERR_TEXT[kind])
    } finally {
      setBusy(false)
      abortRef.current = null
    }
  }

  const hasImage = value.trim() !== ''
  const shown = err ?? (cloudinaryConfigured ? null : ERR_TEXT.unconfigured)

  return (
    <div className="flex flex-col gap-1">
      <span className="pr-1 text-[11px] font-bold text-gray-500">{label}</span>
      <div className="flex items-center gap-3">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-[#e8dfc9] bg-white">
          {hasImage ? (
            <img src={value} alt={label} className="h-full w-full object-cover" />
          ) : (
            <ImagePlus size={18} className="text-gray-300" aria-hidden="true" />
          )}
        </div>
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={busy || !cloudinaryConfigured}
          aria-describedby={shown ? errId : undefined}
          className="inline-flex items-center gap-1.5 rounded-xl border border-[#e8dfc9] bg-white px-3 py-2 text-xs font-bold text-gray-700 transition hover:bg-gray-50 disabled:opacity-50"
        >
          {busy ? (
            <Loader2 size={14} className="animate-spin" aria-hidden="true" />
          ) : (
            <UploadCloud size={14} aria-hidden="true" />
          )}
          {busy ? 'جارٍ الرفع…' : hasImage ? 'تغيير' : 'اختيار صورة'}
        </button>
        {hasImage && !busy && (
          <button
            type="button"
            onClick={() => { setErr(null); onChange('') }}
            className="inline-flex items-center gap-1.5 rounded-xl border border-[#e8dfc9] bg-white px-3 py-2 text-xs font-bold text-red-600 transition hover:bg-red-50"
          >
            <Trash2 size={14} aria-hidden="true" /> حذف
          </button>
        )}
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPT_ATTR}
          onChange={onFile}
          className="sr-only"
          tabIndex={-1}
          aria-hidden="true"
        />
      </div>
      {shown && <p id={errId} aria-live="polite" className="pr-1 text-[11px] text-red-600">{shown}</p>}
    </div>
  )
}
