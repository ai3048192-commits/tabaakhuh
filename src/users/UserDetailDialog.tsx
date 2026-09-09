import { useEffect, useRef } from 'react'
import { X } from 'lucide-react'
import DialogShell from '../shared/DialogShell'
import { userMessages as M } from './messages'
import type { AdminUser } from './types'

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 py-1.5 text-sm">
      <span className="font-bold text-gray-500">{label}</span>
      <span className="text-gray-800" dir="auto">{value}</span>
    </div>
  )
}

export default function UserDetailDialog({ user, onClose }: { user: AdminUser; onClose: () => void }) {
  const closeRef = useRef<HTMLButtonElement>(null)
  useEffect(() => { closeRef.current?.focus() }, [])
  const name = `${user.first_name} ${user.last_name}`.trim()
  return (
    <DialogShell label={M.detailTitle(name)} onDismiss={onClose}>
      <div className="mb-3 flex items-start justify-between gap-3">
        <p className="text-base font-black text-gray-900">{name}</p>
        <button ref={closeRef} type="button" onClick={onClose} aria-label={M.close} className="rounded-lg p-1 text-gray-400 hover:bg-gray-100">
          <X size={18} aria-hidden="true" />
        </button>
      </div>
      <div className="border-t border-gray-100 pt-3">
        <Row label={M.fieldEmail} value={user.email} />
        <Row label={M.fieldPhone} value={user.phone} />
        <Row label={M.fieldRole} value={M.roleLabels[user.role]} />
        <Row label={M.fieldStatus} value={M.statusLabels[user.status]} />
        <Row label={M.fieldJoined} value={user.created_at?.slice(0, 10) ?? '—'} />
      </div>
    </DialogShell>
  )
}
