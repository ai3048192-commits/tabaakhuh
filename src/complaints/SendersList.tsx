import { CalendarDays, ChevronLeft } from 'lucide-react'
import { complaintMessages as M, senderName } from './messages'
import { RolePill, SenderAvatar } from './pills'
import type { ComplaintSender } from './types'

/** One card per person who wrote in, with how many messages and how many are open. */
export default function SendersList({
  items,
  onOpen,
}: {
  items: ComplaintSender[]
  onOpen: (s: ComplaintSender) => void
}) {
  return (
    <ul className="space-y-3">
      {items.map((s) => {
        const name = senderName(s.name, s.user_id)
        const hasOpen = s.open_count > 0
        return (
          <li
            key={s.user_id}
            className="group relative flex flex-col gap-4 overflow-hidden rounded-3xl bg-white p-5 shadow-[0_18px_40px_-30px_rgba(122,13,13,0.45)] ring-1 ring-[#efe3cc] transition hover:-translate-y-0.5 hover:shadow-[0_24px_50px_-28px_rgba(122,13,13,0.5)] sm:flex-row sm:items-center"
          >
            <span
              className={`absolute inset-y-0 right-0 w-1 ${hasOpen ? 'bg-[#e0a52e]' : 'bg-emerald-400'}`}
              aria-hidden="true"
            />
            <SenderAvatar name={name} avatarUrl={s.avatar_url} />

            <div className="min-w-0 flex-1">
              <div className="mb-1.5 flex flex-wrap items-center gap-2">
                <h3 className="truncate text-base font-black text-gray-900">{name}</h3>
                <RolePill role={s.role} />
              </div>
              <div className="flex flex-wrap items-center gap-2 text-[11px] font-black">
                <span className="rounded-full bg-[#faf3e7] px-2.5 py-1 text-[#6b4f3a]">{M.messagesCount(s.total)}</span>
                {hasOpen && (
                  <span className="rounded-full bg-amber-50 px-2.5 py-1 text-amber-800 ring-1 ring-amber-200">{M.openCount(s.open_count)}</span>
                )}
                {s.complaints_count > 0 && (
                  <span className="rounded-full bg-[#7a0d0d]/[0.08] px-2.5 py-1 text-[#7a0d0d]">{M.complaintsCount(s.complaints_count)}</span>
                )}
                {s.suggestions_count > 0 && (
                  <span className="rounded-full bg-sky-50 px-2.5 py-1 text-sky-700">{M.suggestionsCount(s.suggestions_count)}</span>
                )}
              </div>
              {s.last_at && (
                <p className="mt-2 flex items-center gap-1 text-[11px] font-bold text-gray-400">
                  <CalendarDays size={11} aria-hidden="true" />
                  {M.lastAt}: <span dir="ltr">{s.last_at.slice(0, 10)}</span>
                </p>
              )}
            </div>

            <button
              type="button"
              onClick={() => onOpen(s)}
              aria-label={`${M.viewMessages} — ${name}`}
              className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-xl bg-[#7a0d0d] px-4 py-2.5 text-xs font-black text-white shadow-sm transition hover:bg-[#5a0909]"
            >
              {M.viewMessages}
              <ChevronLeft size={14} aria-hidden="true" />
            </button>
          </li>
        )
      })}
    </ul>
  )
}
