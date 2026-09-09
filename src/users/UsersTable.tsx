import { Eye, Ban, ShieldCheck, UserCheck } from 'lucide-react'
import { userMessages as M } from './messages'
import type { AdminUser, UserStatus } from './types'

function StatusBadge({ status }: { status: UserStatus }) {
  const tone: Record<UserStatus, string> = {
    active: 'border-emerald-300 bg-emerald-50 text-emerald-800',
    suspended: 'border-red-300 bg-red-50 text-red-700 ring-1 ring-red-200',
  }
  const Icon = status === 'active' ? UserCheck : Ban
  return (
    <span className={`inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-xs font-bold ${tone[status]}`}>
      <Icon size={13} aria-hidden="true" />
      {M.statusLabels[status]}
    </span>
  )
}

export default function UsersTable({
  items,
  busyId,
  currentUserId,
  onView,
  onStatus,
}: {
  items: AdminUser[]
  busyId: number | null
  /** The signed-in admin — their own row can't be suspended from here. */
  currentUserId: number | null
  onView: (u: AdminUser) => void
  onStatus: (u: AdminUser, next: UserStatus) => void
}) {
  const th = 'px-3 py-2 text-right text-xs font-black text-gray-500'
  const td = 'px-3 py-3 align-middle text-sm text-gray-700'
  const iconBtn =
    'rounded-lg border border-gray-200 bg-white p-1.5 text-gray-500 hover:text-[#7a0d0d] disabled:opacity-40'

  return (
    <div className="overflow-x-auto rounded-2xl border border-gray-100 bg-white">
      <table className="w-full min-w-[820px] border-collapse">
        <thead className="border-b border-gray-100 bg-gray-50">
          <tr>
            <th scope="col" className={th}>{M.colId}</th>
            <th scope="col" className={th}>{M.colName}</th>
            <th scope="col" className={th}>{M.colContact}</th>
            <th scope="col" className={th}>{M.colRole}</th>
            <th scope="col" className={th}>{M.colStatus}</th>
            <th scope="col" className={th}>{M.colJoined}</th>
            <th scope="col" className={th}>{M.colActions}</th>
          </tr>
        </thead>
        <tbody>
          {items.map((u) => {
            const busy = busyId === u.id
            const isSelf = currentUserId != null && u.id === currentUserId
            return (
              <tr key={u.id} className="border-b border-gray-100 last:border-0">
                <td className={`${td} font-bold text-gray-900`} dir="ltr">{u.id}</td>
                <td className={`${td} font-bold text-gray-900`}>
                  {`${u.first_name} ${u.last_name}`.trim()}
                </td>
                <td className={td}>
                  <span dir="ltr" className="block">{u.email}</span>
                  <span dir="ltr" className="block text-xs text-gray-400">{u.phone}</span>
                </td>
                <td className={td}>{M.roleLabels[u.role]}</td>
                <td className={td}><StatusBadge status={u.status} /></td>
                <td className={td} dir="ltr">{u.created_at?.slice(0, 10) ?? '—'}</td>
                <td className={td}>
                  <div className="flex gap-2">
                    <button type="button" className={iconBtn} aria-label={M.view} onClick={() => onView(u)}>
                      <Eye size={15} aria-hidden="true" />
                    </button>
                    {isSelf ? (
                      <span className="self-center text-xs font-bold text-gray-400">{M.selfRow}</span>
                    ) : u.status === 'suspended' ? (
                      <button type="button" className={iconBtn} disabled={busy} aria-label={M.reactivate} onClick={() => onStatus(u, 'active')}>
                        <ShieldCheck size={15} aria-hidden="true" />
                      </button>
                    ) : (
                      <button type="button" className={`${iconBtn} text-red-500`} disabled={busy} aria-label={M.suspend} onClick={() => onStatus(u, 'suspended')}>
                        <Ban size={15} aria-hidden="true" />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
