import { useEffect, useMemo, useRef, useState } from 'react'
import { MapPin, X } from 'lucide-react'
import DialogShell from '../shared/DialogShell'
import { validateNames } from './cityValidation'
import { cityMessages as M } from './messages'
import type { CityNamePatch, NameErrors, NewCityInput } from './types'

interface Props {
  mode: 'add' | 'edit'
  initialValues?: { name_ar: string; name_en: string }
  serverErrors: NameErrors
  busy: boolean
  onSubmit: (payload: NewCityInput | CityNamePatch) => void
  onCancel: () => void
}

const EMPTY = { name_ar: '', name_en: '' }
type FieldKey = 'name_ar' | 'name_en'

/**
 * Add / Edit modal (clarify Q1: Edit mirrors Add). Two labelled fields with live
 * required / length validation (FR-009 / FR-010 / FR-018 / FR-019); server field
 * errors from a 422 render under the matching input until that field is edited
 * again (FR-012 / FR-021). `edit` emits a `CityNamePatch` of only the changed keys.
 */
export default function CityFormDialog({
  mode,
  initialValues,
  serverErrors,
  busy,
  onSubmit,
  onCancel,
}: Props) {
  const initial = initialValues ?? EMPTY
  const [values, setValues] = useState(initial)
  // Whether the admin has changed a field since the dialog opened. Used to keep
  // the "at least one name" hint from flashing red on an untouched edit form.
  const [dirty, setDirty] = useState(false)
  const firstRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    firstRef.current?.focus()
  }, [])

  const clientErrors = useMemo(
    () => validateNames(values, mode, initial),
    [values, mode, initial],
  )

  // Server (422) field errors take precedence and stay until the next submit,
  // which the parent clears before re-calling (mirrors the review dialogs).
  const shown: NameErrors = {
    name_ar: serverErrors.name_ar ?? clientErrors.name_ar,
    name_en: serverErrors.name_en ?? clientErrors.name_en,
    // The form-level "at least one name" hint only makes sense once something
    // has actually been edited — don't show it on a freshly opened edit form.
    form: serverErrors.form ?? (dirty ? clientErrors.form : undefined),
  }
  const blocked = Boolean(clientErrors.name_ar || clientErrors.name_en || clientErrors.form)

  const title = mode === 'add' ? M.addCity : M.editCity

  const submit = () => {
    if (blocked || busy) return
    if (mode === 'add') {
      onSubmit({
        name_ar: values.name_ar.trim(),
        name_en: values.name_en.trim(),
      } satisfies NewCityInput)
      return
    }
    const patch: { name_ar?: string; name_en?: string } = {}
    if (values.name_ar.trim() !== '' && values.name_ar !== initial.name_ar) {
      patch.name_ar = values.name_ar.trim()
    }
    if (values.name_en.trim() !== '' && values.name_en !== initial.name_en) {
      patch.name_en = values.name_en.trim()
    }
    onSubmit(patch as CityNamePatch)
  }

  const renderField = (key: FieldKey, label: string, dir: 'rtl' | 'ltr') => (
    <div>
      <label htmlFor={key} className="mb-1.5 block text-xs font-bold text-gray-500">
        {label}
      </label>
      <input
        id={key}
        ref={key === 'name_ar' ? firstRef : undefined}
        type="text"
        dir={dir}
        value={values[key]}
        maxLength={255}
        aria-invalid={Boolean(shown[key])}
        aria-describedby={shown[key] ? `${key}-err` : undefined}
        onChange={(e) => {
          const v = e.target.value
          setDirty(true)
          setValues((prev) => ({ ...prev, [key]: v }))
        }}
        className={[
          'w-full rounded-xl border bg-gray-50 p-2.5 text-sm transition',
          'focus-visible:bg-white focus-visible:outline-2 focus-visible:outline-[#7a0d0d]',
          shown[key] ? 'border-red-300' : 'border-gray-200',
        ].join(' ')}
      />
      {shown[key] && (
        <p id={`${key}-err`} className="mt-1 text-xs text-red-600">
          {shown[key]}
        </p>
      )}
    </div>
  )

  return (
    <DialogShell label={title} onDismiss={onCancel} padded={false} size="md">
      {/* Header */}
      <div className="flex items-center justify-between bg-gradient-to-l from-[#7a0d0d] to-[#9a1212] px-5 py-4 text-white">
        <div className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/15">
            <MapPin size={18} aria-hidden="true" />
          </span>
          <h2 className="text-base font-black">{title}</h2>
        </div>
        <button
          type="button"
          onClick={onCancel}
          disabled={busy}
          aria-label={M.close}
          className="rounded-lg p-1.5 text-white/80 transition hover:bg-white/15 hover:text-white disabled:opacity-50"
        >
          <X size={20} aria-hidden="true" />
        </button>
      </div>

      {/* Body */}
      <div className="space-y-4 px-5 py-5">
        {renderField('name_ar', M.fieldNameAr, 'rtl')}
        {renderField('name_en', M.fieldNameEn, 'ltr')}
        {shown.form && <p className="text-xs text-red-600">{shown.form}</p>}
      </div>

      {/* Footer */}
      <div className="flex gap-3 border-t border-gray-100 bg-gray-50 px-5 py-4">
        <button
          type="button"
          onClick={onCancel}
          disabled={busy}
          className="flex-1 rounded-xl border border-gray-200 bg-white py-2.5 text-sm font-bold text-gray-600 transition hover:bg-gray-100 disabled:opacity-50"
        >
          {M.cancel}
        </button>
        <button
          type="button"
          onClick={submit}
          disabled={blocked || busy}
          aria-busy={busy}
          className="flex-1 rounded-xl bg-[#7a0d0d] py-2.5 text-sm font-black text-white transition hover:bg-[#5a0909] disabled:opacity-50"
        >
          {M.save}
        </button>
      </div>
    </DialogShell>
  )
}
