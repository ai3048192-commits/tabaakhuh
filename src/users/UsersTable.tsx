import { Eye, Ban, ShieldCheck, UserCheck, FileWarning } from 'lucide-react'
import { warningMessages as WM } from '../warnings/messages'
import { userMessages as M } from './messages'
import { tenure } from './tenure'
import type { AdminUser, UserStatus } from './types'

function StatusBadge({ status }: { status: UserStatus }) {
  const tone: Record<UserStatus, string> = {
    active: 'border-emerald-300 bg-emerald-50 text-emerald-800',
    suspended: 'border-red-300 bg-red-50 text-red-700 ring-1 ring-red-200',
  }
  const Icon = status === 'active' ? UserCheck : Ban
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-black ${tone[status]}`}>
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
  onWarn,
  hideRole = false,
}: {
  /** Role-scoped screens: every row has the same role, so the column is dropped. */
  hideRole?: boolean
  items: AdminUser[]
  busyId: number | null
  /** The signed-in admin — their own row can't be suspended from here. */
  currentUserId: number | null
  onView: (u: AdminUser) => void
  onStatus: (u: AdminUser, next: UserStatus) => void
  /** Only cooks and drivers can receive a warning letter. */
  onWarn: (u: AdminUser) => void
}) {
  const th = 'px-4 py-3 text-right text-xs font-bold text-gray-400'
  const td = 'px-4 py-3.5 align-middle text-sm text-gray-700'
  const iconBtn =
    'grid h-8 w-8 place-items-center rounded-lg border border-[#e8dcc4] bg-white text-gray-500 transition hover:bg-[#faf3e7] hover:text-[#7a0d0d] disabled:opacity-40'

  return (
    <div className="overflow-x-auto rounded-3xl bg-white shadow-[0_18px_40px_-30px_rgba(122,13,13,0.45)] ring-1 ring-[#efe3cc]">
      <table className="w-full min-w-[820px] border-collapse">
        <thead className="bg-[#fffaf1]">
          <tr>
            <th scope="col" className={th}>{M.colId}</th>
            <th scope="col" className={th}>{M.colName}</th>
            <th scope="col" className={th}>{M.colContact}</th>
            {!hideRole && <th scope="col" className={th}>{M.colRole}</th>}
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
              <tr key={u.id} className="border-t border-[#f3ead9] transition hover:bg-[#fffaf1]">
                <td className={`${td} font-bold text-gray-900`} dir="ltr">{u.id}</td>
                <td className={`${td} font-bold text-gray-900`}>
                  <button type="button" onClick={() => onView(u)} className="flex items-center gap-2.5 text-right hover:text-[#7a0d0d]">
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[#7a0d0d] text-xs font-black text-[#ffd27a]" aria-hidden="true">
                      {u.first_name?.trim().charAt(0) || '؟'}
                    </span>
                    {`${u.first_name} ${u.last_name}`.trim()}
                  </button>
                </td>
                <td className={td}>
                  <span dir="ltr" className="block">{u.email}</span>
                  <span dir="ltr" className="block text-xs text-gray-400">{u.phone}</span>
                </td>
                {!hideRole && <td className={td}>{M.roleLabels[u.role]}</td>}
                <td className={td}><StatusBadge status={u.status} /></td>
                <td className={td}>
                  <span className="block font-bold text-gray-800">{tenure(u.created_at) ?? '—'}</span>
                  <span className="block text-xs text-gray-400" dir="ltr">{u.created_at?.slice(0, 10) ?? ''}</span>
                </td>
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
                    {!isSelf && (u.role === 'cook' || u.role === 'driver') && (
                      <button
                        type="button"
                        className={`${iconBtn} text-amber-600`}
                        aria-label={`${WM.issue}: ${`${u.first_name} ${u.last_name}`.trim()}`}
                        title={WM.issue}
                        onClick={() => onWarn(u)}
                      >
                        <FileWarning size={15} aria-hidden="true" />
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
