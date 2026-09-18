import { Eye, AlertTriangle } from 'lucide-react'
import { incidentMessages as M } from './messages'
import type { Incident, IncidentStatus } from './types'

const STATUS_STYLE: Record<IncidentStatus, string> = {
  open: 'border-red-300 bg-red-50 text-red-800',
  pending: 'border-amber-300 bg-amber-50 text-amber-800',
  resolved: 'border-emerald-300 bg-emerald-50 text-emerald-800',
  closed: 'border-gray-300 bg-gray-50 text-gray-600',
}

function StatusPill({ status }: { status: IncidentStatus }) {
  return (
    <span className={`inline-flex items-center rounded-lg border px-2 py-1 text-xs font-bold ${STATUS_STYLE[status]}`}>
      {M.statusLabels[status]}
    </span>
  )
}

export default function IncidentsTable({
  items,
  onOpen,
}: {
  items: Incident[]
  onOpen: (id: number) => void
}) {
  const th = 'px-3 py-2 text-right text-xs font-black text-gray-500'
  const td = 'px-3 py-3 align-middle text-sm text-gray-700'
  return (
    <div className="overflow-x-auto rounded-2xl border border-gray-100 bg-white">
      <table className="w-full min-w-[760px] border-collapse">
        <thead className="border-b border-gray-100 bg-gray-50">
          <tr>
            <th scope="col" className={th}>{M.colId}</th>
            <th scope="col" className={th}>{M.colDriver}</th>
            <th scope="col" className={th}>{M.colSubject}</th>
            <th scope="col" className={th}>{M.colStatus}</th>
            <th scope="col" className={th}>{M.colCreated}</th>
            <th scope="col" className={th}>{M.colActions}</th>
          </tr>
        </thead>
        <tbody>
          {items.map((it) => (
            <tr key={it.id} className="border-b border-gray-100 last:border-0">
              <td className={`${td} font-bold text-gray-900`} dir="ltr">{it.id}</td>
              <td className={td}>
                <span className="inline-flex items-center gap-1">
                  <AlertTriangle size={13} className="text-[#7a0d0d]" aria-hidden="true" />
                  {it.user?.name ?? `#${it.user_id}`}
                </span>
              </td>
              <td className={`${td} font-bold text-gray-900`}>{it.subject}</td>
              <td className={td}><StatusPill status={it.status} /></td>
              <td className={td} dir="ltr">{it.created_at?.slice(0, 10) ?? '—'}</td>
              <td className={td}>
                <button
                  type="button"
                  onClick={() => onOpen(it.id)}
                  className="inline-flex items-center gap-1 rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-xs font-bold text-[#7a0d0d]"
                >
                  <Eye size={13} aria-hidden="true" />
                  {M.open}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
