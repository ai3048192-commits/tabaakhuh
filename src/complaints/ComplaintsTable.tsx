import { Eye, MessageSquareWarning, Lightbulb, CalendarDays, User, Package } from 'lucide-react'
import { complaintMessages as M } from './messages'
import type { Complaint, ComplaintStatus } from './types'

export function StatusPill({ status }: { status: ComplaintStatus }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-black ring-1 ${
        status === 'resolved'
          ? 'bg-emerald-50 text-emerald-700 ring-emerald-200'
          : 'bg-amber-50 text-amber-800 ring-amber-200'
      }`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden="true" />
      {M.statusLabels[status]}
    </span>
  )
}

export function TypePill({ type }: { type: Complaint['type'] }) {
  const Icon = type === 'suggestion' ? Lightbulb : MessageSquareWarning
  return (
    <span
      className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-black ${
        type === 'suggestion' ? 'bg-sky-50 text-sky-700' : 'bg-[#7a0d0d]/[0.08] text-[#7a0d0d]'
      }`}
    >
      <Icon size={12} aria-hidden="true" />
      {M.typeLabels[type]}
    </span>
  )
}

/** The complaints list, one card per message. */
export default function ComplaintsTable({
  items,
  onOpen,
}: {
  items: Complaint[]
  onOpen: (id: number) => void
}) {
  return (
    <ul className="space-y-3">
      {items.map((c) => {
        const suggestion = c.type === 'suggestion'
        const Icon = suggestion ? Lightbulb : MessageSquareWarning
        return (
          <li
            key={c.id}
            className={`group relative flex flex-col gap-4 overflow-hidden rounded-3xl bg-white p-5 shadow-[0_18px_40px_-30px_rgba(122,13,13,0.45)] ring-1 ring-[#efe3cc] transition hover:-translate-y-0.5 hover:shadow-[0_24px_50px_-28px_rgba(122,13,13,0.5)] sm:flex-row sm:items-center ${
              c.status === 'open' ? '' : 'opacity-90'
            }`}
          >
            <span
              className={`absolute inset-y-0 right-0 w-1 ${c.status === 'open' ? 'bg-[#e0a52e]' : 'bg-emerald-400'}`}
              aria-hidden="true"
            />
            <span
              className={`grid h-12 w-12 shrink-0 place-items-center rounded-2xl ${
                suggestion ? 'bg-sky-100 text-sky-700' : 'bg-[#7a0d0d]/10 text-[#7a0d0d]'
              }`}
            >
              <Icon size={20} aria-hidden="true" />
            </span>

            <div className="min-w-0 flex-1">
              <div className="mb-1.5 flex flex-wrap items-center gap-2">
                <TypePill type={c.type} />
                <StatusPill status={c.status} />
                <span className="text-[11px] font-bold text-gray-300" dir="ltr">#{c.id}</span>
              </div>
              <h3 className="truncate text-base font-black text-gray-900">{c.subject}</h3>
              {c.body && <p className="mt-1 line-clamp-2 text-sm leading-relaxed text-gray-500">{c.body}</p>}
              <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] font-bold text-gray-400">
                <span className="flex items-center gap-1">
                  <CalendarDays size={11} aria-hidden="true" />
                  <span dir="ltr">{c.created_at?.slice(0, 10) ?? '—'}</span>
                </span>
                <span className="flex items-center gap-1">
                  <User size={11} aria-hidden="true" />
                  {M.fromCustomer(c.customer_id)}
                </span>
                {c.order_id != null && (
                  <span className="flex items-center gap-1">
                    <Package size={11} aria-hidden="true" />
                    {M.relatedOrder(c.order_id)}
                  </span>
                )}
              </div>
            </div>

            <button
              type="button"
              onClick={() => onOpen(c.id)}
              className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-xl bg-[#7a0d0d] px-4 py-2.5 text-xs font-black text-white shadow-sm transition hover:bg-[#5a0909]"
            >
              <Eye size={14} aria-hidden="true" />
              {M.open}
            </button>
          </li>
        )
      })}
    </ul>
  )
}
