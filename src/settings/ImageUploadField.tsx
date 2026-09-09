import { useEffect, useId, useRef, useState } from 'react'
import { ImagePlus, Loader2, Trash2, UploadCloud } from 'lucide-react'
import { settingsMessages as M } from './messages'
import type { StringField } from './systemSettingsValidation'
import {
  ACCEPT_ATTR,
  CloudinaryError,
  cloudinaryConfigured,
  uploadImage,
  type UploadErrorKind,
} from './cloudinary'

const ERR_TEXT: Record<UploadErrorKind, string> = {
  unconfigured: M.imageErrUnconfigured,
  bad_type: M.imageErrBadType,
  too_large: M.imageErrTooLarge,
  network: M.imageErrNetwork,
  rejected: M.imageErrRejected,
}

/**
 * A file-picker bound to one string settings field (`logo_url` / `icon_url`).
 * The admin picks an image; it's uploaded straight to Cloudinary and, on
 * success, the returned `secure_url` is written into the draft via `onChange` —
 * exactly where the old URL text input used to write. Nothing is persisted here;
 * the page-level "حفظ الإعدادات" button still does the single `PUT`.
 */
export default function ImageUploadField({
  label,
  field,
  value,
  error,
  onChange,
}: {
  label: string
  field: StringField
  /** Current draft URL for this field ('' when unset). */
  value: string
  /** Server/client validation error for this field, if any. */
  error?: string
  onChange: (f: StringField, raw: string) => void
}) {
  const inputId = useId()
  const errId = useId()
  const inputRef = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)

  // Abort an in-flight upload if the field unmounts mid-request.
  const abortRef = useRef<AbortController | null>(null)
  useEffect(() => () => abortRef.current?.abort(), [])

  const pick = () => {
    setUploadError(null)
    inputRef.current?.click()
  }

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = '' // allow re-picking the same file
    if (!file) return

    setUploadError(null)
    setBusy(true)
    abortRef.current = new AbortController()
    try {
      const { url } = await uploadImage(file, abortRef.current.signal)
      onChange(field, url)
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return
      const kind: UploadErrorKind = err instanceof CloudinaryError ? err.kind : 'rejected'
      setUploadError(ERR_TEXT[kind])
    } finally {
      setBusy(false)
      abortRef.current = null
    }
  }

  const shownError = uploadError ?? error ?? (cloudinaryConfigured ? undefined : M.imageErrUnconfigured)
  const hasImage = value.trim() !== ''
  const actionText = busy ? M.imageUploading : hasImage ? M.imageReplace : M.imageChoose

  return (
    <div className="flex flex-col gap-1.5">
      <span id={inputId} className="pr-1 text-[11px] font-bold text-gray-500">{label}</span>

      <div className="flex items-center gap-3">
        <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-gray-200 bg-gray-50">
          {hasImage ? (
            <img src={value} alt={M.imagePreviewAlt} className="h-full w-full object-contain" />
          ) : (
            <ImagePlus size={20} className="text-gray-300" aria-hidden="true" />
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={pick}
            disabled={busy || !cloudinaryConfigured}
            aria-label={`${actionText} — ${label}`}
            aria-describedby={shownError ? errId : undefined}
            className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-bold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            {busy ? (
              <Loader2 size={14} className="animate-spin" aria-hidden="true" />
            ) : (
              <UploadCloud size={14} aria-hidden="true" />
            )}
            {actionText}
          </button>

          {hasImage && !busy && (
            <button
              type="button"
              onClick={() => { setUploadError(null); onChange(field, '') }}
              className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-bold text-red-600 hover:bg-red-50"
            >
              <Trash2 size={14} aria-hidden="true" />
              {M.imageRemove}
            </button>
          )}
        </div>

        <input
          ref={inputRef}
          id={inputId + '-file'}
          type="file"
          accept={ACCEPT_ATTR}
          onChange={onFile}
          className="sr-only"
          tabIndex={-1}
          aria-hidden="true"
        />
      </div>

      <p className="pr-1 text-[10px] text-gray-400">{M.imageHint}</p>
      <p id={errId} aria-live="polite" className="min-h-[0.9rem] pr-1 text-[11px] text-red-600">
        {shownError ?? ''}
      </p>
    </div>
  )
}
