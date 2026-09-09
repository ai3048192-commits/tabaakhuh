import { useEffect, useRef } from 'react'
import DialogShell from '../review/DialogShell'
import { driverMessages as M } from './messages'

interface Props {
  driverLabel: string
  busy: boolean
  onConfirm: () => void
  onCancel: () => void
}

/** Explicit confirmation before an approval is submitted (FR-012 / FR-013). */
export default function ApproveDialog({ driverLabel, busy, onConfirm, onCancel }: Props) {
  const confirmRef = useRef<HTMLButtonElement>(null)
  useEffect(() => {
    confirmRef.current?.focus()
  }, [])

  return (
    <DialogShell label={M.approveTitle(driverLabel)} onDismiss={onCancel}>
      <h2 className="mb-2 text-base font-black text-gray-800">{M.approveTitle(driverLabel)}</h2>
      <p className="mb-6 text-sm text-gray-600">{M.approveBody}</p>
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
          ref={confirmRef}
          type="button"
          onClick={onConfirm}
          disabled={busy}
          aria-busy={busy}
          className="flex-1 rounded-xl bg-green-600 py-2.5 text-sm font-black text-white disabled:opacity-50"
        >
          {M.confirmApprove}
        </button>
      </div>
    </DialogShell>
  )
}
