import { useEffect, useRef, useState } from 'react'
import DialogShell from '../review/DialogShell'
import { driverMessages as M } from './messages'

const MAX = 1000

interface Props {
  driverLabel: string
  busy: boolean
  /** Server-side field error to surface under the textarea (FR-027). */
  fieldError?: string
  onSubmit: (reason: string) => void
  onCancel: () => void
}

/**
 * Collects the mandatory rejection reason (FR-016). Submit is blocked while the
 * reason is empty/whitespace (FR-017) or over the limit (FR-018). The typed
 * reason survives a failed submit because the parent keeps this mounted on a
 * transient or validation failure (FR-020 / FR-027).
 */
export default function RejectDialog({
  driverLabel,
  busy,
  fieldError,
  onSubmit,
  onCancel,
}: Props) {
  const [reason, setReason] = useState('')
  const taRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    taRef.current?.focus()
  }, [])

  const trimmedLen = reason.trim().length
  const valid = trimmedLen >= 1 && reason.length <= MAX

  return (
    <DialogShell label={M.rejectTitle(driverLabel)} onDismiss={onCancel}>
      <h2 className="mb-3 text-base font-black text-gray-800">{M.rejectTitle(driverLabel)}</h2>

      <label htmlFor="reject-reason" className="mb-1 block text-xs font-bold text-gray-500">
        {M.rejectReasonLabel}
      </label>
      <textarea
        id="reject-reason"
        ref={taRef}
        value={reason}
        maxLength={MAX}
        rows={4}
        onChange={(e) => setReason(e.target.value)}
        aria-invalid={trimmedLen === 0 || Boolean(fieldError)}
        aria-describedby="reject-counter reject-required"
        className="w-full resize-none rounded-xl border border-gray-200 p-3 text-sm focus-visible:outline-2 focus-visible:outline-[#7a0d0d]"
      />
      <div className="mt-1 flex items-center justify-between">
        <p
          id="reject-required"
          className={`text-xs text-red-600 ${trimmedLen === 0 || fieldError ? '' : 'invisible'}`}
        >
          {fieldError || M.rejectReasonRequired}
        </p>
        <span id="reject-counter" className="text-xs text-gray-400">
          {M.rejectCounter(reason.length)}
        </span>
      </div>

      <div className="mt-5 flex gap-3">
        <button
          type="button"
          onClick={onCancel}
          disabled={busy}
          className="flex-1 rounded-xl border border-gray-200 py-2.5 text-sm font-bold text-gray-600 disabled:opacity-50"
        >
          {M.cancel}
        </button>
        <button
          type="button"
          onClick={() => onSubmit(reason)}
          disabled={busy || !valid}
          aria-busy={busy}
          className="flex-1 rounded-xl bg-[#7a0d0d] py-2.5 text-sm font-black text-white disabled:opacity-50"
        >
          {M.confirmReject}
        </button>
      </div>
    </DialogShell>
  )
}
