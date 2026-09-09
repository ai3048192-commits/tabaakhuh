import { useEffect, useId, useRef, useState } from 'react'
import DialogShell from '../shared/DialogShell'
import { userMessages as M } from './messages'
import type { AdminUser, UserStatus } from './types'

export default function StatusChangeDialog({
  user,
  next,
  busy,
  onConfirm,
  onCancel,
}: {
  user: AdminUser
  next: UserStatus
  busy: boolean
  onConfirm: (reason?: string) => void
  onCancel: () => void
}) {
  const confirmRef = useRef<HTMLButtonElement>(null)
  const reasonRef = useRef<HTMLTextAreaElement>(null)
  const uid = useId()
  const [reason, setReason] = useState('')
  const suspending = next === 'suspended'
  const reasonMissing = suspending && reason.trim() === ''

  useEffect(() => {
    if (suspending) reasonRef.current?.focus()
    else confirmRef.current?.focus()
  }, [suspending])

  const name = `${user.first_name} ${user.last_name}`.trim()

  return (
    <DialogShell label={M.confirmTitle(name, next)} onDismiss={onCancel}>
      <h2 className="mb-2 text-base font-black text-gray-800">{M.confirmTitle(name, next)}</h2>
      <p className="mb-4 text-sm text-gray-600">{M.confirmBody(next)}</p>

      {suspending && (
        <div className="mb-6 flex flex-col gap-1">
          <label htmlFor={`${uid}-reason`} className="text-xs font-bold text-gray-500">
            {M.reasonLabel}
          </label>
          <textarea
            ref={reasonRef}
            id={`${uid}-reason`}
            rows={3}
            required
            maxLength={1000}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder={M.reasonPlaceholder}
            className="resize-none rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-[#7a0d0d]"
          />
        </div>
      )}

      <div className="flex gap-3">
        <button type="button" onClick={onCancel} disabled={busy} className="flex-1 rounded-xl border border-gray-200 py-2.5 text-sm font-bold text-gray-600 disabled:opacity-50">
          {M.cancel}
        </button>
        <button
          ref={confirmRef}
          type="button"
          onClick={() => onConfirm(suspending ? reason.trim() : undefined)}
          disabled={busy || reasonMissing}
          aria-busy={busy}
          className={`flex-1 rounded-xl py-2.5 text-sm font-black text-white disabled:opacity-50 ${suspending ? 'bg-red-600' : 'bg-[#7a0d0d]'}`}
        >
          {M.confirmCta}
        </button>
      </div>
    </DialogShell>
  )
}
