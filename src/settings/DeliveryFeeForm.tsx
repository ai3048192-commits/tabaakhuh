import { useId } from 'react'
import { settingsMessages as M } from './messages'
import { formatFee } from './feeValidation'

interface Props {
  savedFee: number
  draft: string
  fieldError: string | null
  canSave: boolean
  saving: boolean
  onDraftChange: (raw: string) => void
  onSave: () => void
}

/**
 * The one-field delivery-fee form. Save is a `type="submit"` button driven by
 * `canSave` (dirty + valid + not saving); the parent owns the request. No
 * confirmation dialog — submit goes straight through (Clarifications 2026-09-07).
 */
export default function DeliveryFeeForm({
  savedFee,
  draft,
  fieldError,
  canSave,
  saving,
  onDraftChange,
  onSave,
}: Props) {
  const fieldId = useId()
  const hintId = useId()
  const errorId = useId()

  return (
    <form
      dir="rtl"
      onSubmit={(e) => {
        e.preventDefault()
        if (canSave) onSave()
      }}
    >
      <p className="mb-4 text-sm text-gray-600">
        <span className="font-bold">{M.currentFeeLabel}: </span>
        <span dir="ltr">{formatFee(savedFee)}</span> <span>{M.feeUnit}</span>
      </p>

      <label htmlFor={fieldId} className="mb-1 block text-xs font-bold text-gray-500">
        {M.feeFieldLabel}
      </label>
      <div className="flex items-center gap-2" dir="ltr">
        <input
          id={fieldId}
          type="text"
          inputMode="decimal"
          dir="ltr"
          value={draft}
          onChange={(e) => onDraftChange(e.target.value)}
          aria-describedby={`${hintId} ${errorId}`}
          aria-invalid={fieldError ? true : undefined}
          className="w-40 rounded-xl border border-gray-200 p-2.5 text-sm focus-visible:outline-2 focus-visible:outline-[#7a0d0d]"
        />
        <span aria-hidden="true" className="text-sm font-bold text-gray-500">
          {M.feeUnit}
        </span>
      </div>

      <p id={hintId} className="mt-1 text-xs text-gray-400">
        {M.feeHint} ({M.feeUnitName})
      </p>
      <p id={errorId} aria-live="polite" className="mt-1 min-h-[1rem] text-xs text-red-600">
        {fieldError}
      </p>

      <button
        type="submit"
        disabled={!canSave}
        aria-busy={saving}
        className="mt-4 rounded-xl bg-[#7a0d0d] px-5 py-2.5 text-sm font-black text-white disabled:opacity-50"
      >
        {saving ? M.saving : M.save}
      </button>
    </form>
  )
}
