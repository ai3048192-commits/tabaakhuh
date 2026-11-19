import { useEffect, useId, useRef, useState } from 'react'
import { AlertTriangle } from 'lucide-react'
import DialogShell from '../shared/DialogShell'
import { userMessages as M } from './messages'
import type { AdminUser } from './types'

/**
 * Confirm-first permanent delete. The admin must type the confirm word before
 * the button unlocks — the delete can't be undone.
 */
export default function DeleteUserDialog({
  user,
  busy,
  onConfirm,
  onCancel,
}: {
  user: AdminUser
  busy: boolean
  onConfirm: () => void
  onCancel: () => void
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const uid = useId()
  const [typed, setTyped] = useState('')
  const name = `${user.first_name} ${user.last_name}`.trim()
  const ready = typed.trim() === M.deleteConfirmWord

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  return (
    <DialogShell label={M.deleteTitle(name)} onDismiss={busy ? () => {} : onCancel}>
      <div className="mb-3 flex items-center gap-2 text-red-700">
        <AlertTriangle size={20} aria-hidden="true" />
        <h2 className="text-lg font-black">{M.deleteTitle(name)}</h2>
      </div>
      <p className="mb-2 text-sm text-gray-700">{M.deleteBody(M.roleLabels[user.role])}</p>
      <ul className="mb-3 list-disc pr-5 text-xs text-gray-600">
        {M.deleteWhat.map((line) => <li key={line}>{line}</li>)}
      </ul>
      <p className="mb-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-bold text-red-700">{M.deleteIrreversible}</p>

      <div className="mb-6 flex flex-col gap-1">
        <label htmlFor={`${uid}-confirm`} className="text-xs font-black text-[#6b4f3a]">
          {M.deleteTypeLabel(M.deleteConfirmWord)}
        </label>
        <input
          ref={inputRef}
          id={`${uid}-confirm`}
          value={typed}
          onChange={(e) => setTyped(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && ready && !busy) onConfirm()
          }}
          autoComplete="off"
          className="rounded-xl border border-[#e8dcc4] bg-white px-3.5 py-2.5 text-sm text-gray-800 shadow-sm outline-none transition focus:border-red-600 focus:ring-4 focus:ring-red-600/10"
        />
      </div>

      <div className="flex gap-3">
        <button type="button" onClick={onCancel} disabled={busy} className="flex-1 rounded-xl border border-[#e8dcc4] py-2.5 text-sm font-bold text-gray-600 transition hover:bg-[#faf3e7] disabled:opacity-50">
          {M.cancel}
        </button>
        <button
          type="button"
          onClick={onConfirm}
          disabled={busy || !ready}
          aria-busy={busy}
          className="flex-1 rounded-xl bg-red-600 py-2.5 text-sm font-black text-white transition hover:bg-red-700 disabled:opacity-50"
        >
          {busy ? M.deleting : M.deleteCta}
        </button>
      </div>
    </DialogShell>
  )
}
