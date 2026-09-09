import { useId } from 'react'
import { Search } from 'lucide-react'
import { userMessages as M } from './messages'
import type { UsersFilters as UF, UserRole, UserStatus } from './types'

const ROLES: UserRole[] = ['customer', 'cook', 'driver', 'admin']
const STATUSES: UserStatus[] = ['active', 'suspended']

export default function UsersFilters({
  filters,
  onRole,
  onStatus,
  onQuery,
}: {
  filters: UF
  onRole: (r: UF['role']) => void
  onStatus: (s: UF['status']) => void
  onQuery: (q: string) => void
}) {
  const uid = useId()
  const field = 'rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm'
  return (
    <div className="mb-5 flex flex-wrap items-end gap-3 rounded-2xl border border-gray-100 bg-white p-4">
      <div className="flex min-w-[220px] flex-1 flex-col gap-1">
        <label htmlFor={`${uid}-q`} className="text-xs font-bold text-gray-500">{M.searchLabel}</label>
        <div className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3">
          <Search size={15} className="text-gray-400" aria-hidden="true" />
          <input
            id={`${uid}-q`}
            type="search"
            className="w-full py-2 text-sm outline-none"
            value={filters.q}
            onChange={(e) => onQuery(e.target.value)}
          />
        </div>
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor={`${uid}-role`} className="text-xs font-bold text-gray-500">{M.filterRole}</label>
        <select id={`${uid}-role`} className={field} value={filters.role} onChange={(e) => onRole(e.target.value as UF['role'])}>
          <option value="all">{M.allRoles}</option>
          {ROLES.map((r) => <option key={r} value={r}>{M.roleLabels[r]}</option>)}
        </select>
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor={`${uid}-status`} className="text-xs font-bold text-gray-500">{M.filterStatus}</label>
        <select id={`${uid}-status`} className={field} value={filters.status} onChange={(e) => onStatus(e.target.value as UF['status'])}>
          <option value="all">{M.allStatuses}</option>
          {STATUSES.map((s) => <option key={s} value={s}>{M.statusLabels[s]}</option>)}
        </select>
      </div>
    </div>
  )
}
