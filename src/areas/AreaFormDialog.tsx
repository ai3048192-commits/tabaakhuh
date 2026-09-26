import { useId, useState } from 'react'
import DialogShell from '../shared/DialogShell'
import { areaMessages as M } from './messages'
import { parseFee } from './mutationOutcome'
import type { Area, AreaMutationOutcome } from './types'

type Fields = { name_ar: string; name_en: string; delivery_fee: string }
type FieldErrors = Partial<Record<keyof Fields, string>>

interface Props {
  title: string
  /** The area being edited, or undefined when adding. */
  area?: Area
  onSubmit: (values: { name_ar: string; name_en: string; delivery_fee: number }) => Promise<AreaMutationOutcome>
  onDone: () => void
  onCancel: () => void
}

/** Add / edit an area: both names and its delivery fee. */
export default function AreaFormDialog({ title, area, onSubmit, onDone, onCancel }: Props) {
  const [values, setValues] = useState<Fields>({
    name_ar: area?.name_ar ?? '',
    name_en: area?.name_en ?? '',
    delivery_fee: area ? String(area.delivery_fee) : '',
  })
  const [errors, setErrors] = useState<FieldErrors>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const ids = { name_ar: useId(), name_en: useId(), delivery_fee: useId(), hint: useId() }

  const set = (k: keyof Fields) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value
    setValues((s) => ({ ...s, [k]: v }))
    setErrors((s) => ({ ...s, [k]: undefined }))
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    const fee = parseFee(values.delivery_fee)
    const next: FieldErrors = {}
    if (values.name_ar.trim() === '') next.name_ar = M.errRequired
    if (values.name_en.trim() === '') next.name_en = M.errRequired
    if (fee === null) next.delivery_fee = M.errFee
    setErrors(next)
    setFormError(null)
    if (Object.keys(next).length > 0 || fee === null) return

    setBusy(true)
    const outcome = await onSubmit({
      name_ar: values.name_ar.trim(),
      name_en: values.name_en.trim(),
      delivery_fee: fee,
    })
    setBusy(false)

    if (outcome.ok || outcome.reason === 'not_found') {
      onDone()
      return
    }
    if (outcome.reason === 'validation') {
      setErrors(outcome.fieldErrors)
      if (Object.keys(outcome.fieldErrors).length === 0) setFormError(outcome.message)
      return
    }
    setFormError(M.retryToast)
  }

  const field = (k: keyof Fields, label: string, opts: { ltr?: boolean; numeric?: boolean } = {}) => (
    <div className="mb-3">
      <label htmlFor={ids[k]} className="mb-1 block text-xs font-bold text-gray-500">
        {label}
      </label>
      <input
        id={ids[k]}
        type="text"
        inputMode={opts.numeric ? 'decimal' : undefined}
        dir={opts.ltr ? 'ltr' : 'rtl'}
        value={values[k]}
        onChange={set(k)}
        aria-invalid={errors[k] ? true : undefined}
        aria-describedby={k === 'delivery_fee' ? ids.hint : undefined}
        className="w-full rounded-xl border border-gray-200 p-2.5 text-sm focus-visible:outline-2 focus-visible:outline-[#7a0d0d]"
      />
      {errors[k] && <p className="mt-1 text-xs text-red-600">{errors[k]}</p>}
    </div>
  )

  return (
    <DialogShell label={title} onDismiss={busy ? () => {} : onCancel} size="md">
      <form onSubmit={submit} noValidate>
        <h2 className="mb-4 text-base font-black text-gray-800">{title}</h2>
        {field('name_ar', M.fieldNameAr)}
        {field('name_en', M.fieldNameEn, { ltr: true })}
        {field('delivery_fee', M.fieldFee, { ltr: true, numeric: true })}
        <p id={ids.hint} className="-mt-2 mb-4 text-xs text-gray-400">
          {M.feeHint}
        </p>
        {formError && (
          <p role="alert" className="mb-3 text-xs text-red-600">
            {formError}
          </p>
        )}
        <div className="flex gap-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            className="flex-1 rounded-xl border border-gray-200 py-2.5 text-sm font-bold text-gray-600 disabled:opacity-50"
          >
            {M.cancel}
          </button>
          <button
            type="submit"
            disabled={busy}
            aria-busy={busy}
            className="flex-1 rounded-xl bg-[#7a0d0d] py-2.5 text-sm font-black text-white disabled:opacity-50"
          >
            {busy ? M.saving : M.save}
          </button>
        </div>
      </form>
    </DialogShell>
  )
}
