import { Eye } from 'lucide-react'
import { cookMessages as M } from './messages'
import { CookDetails } from './cookDetail'
import type { PendingCookEntry } from './types'

interface Props {
  entry: PendingCookEntry
  cityName: string
  /** Open the full-screen review screen for this application. */
  onOpen: () => void
}

/**
 * One line of the pending-cook queue: the submitted facts at a glance plus an
 * "eye" action that opens the review screen where the decision is made.
 * Approve/reject and the signed contract live only on that screen, not the row.
 */
export default function CookApplicationRow({ entry, cityName, onOpen }: Props) {
  const p = entry.profile
  const named = Boolean(p.name && p.name.trim())
  return (
    <article className="flex items-start gap-3 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
      <div className="min-w-0 flex-1">
        <div className="mb-2 flex items-center gap-2">
          <h3 className="truncate text-sm font-black text-gray-800">
            {M.cookName(p.name, p.store_name)}
          </h3>
          {named && (
            <span className="shrink-0 truncate text-[11px] text-gray-400">{p.store_name}</span>
          )}
          <span
            className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-bold ${
              p.is_open ? 'bg-green-50 text-green-600' : 'bg-gray-100 text-gray-500'
            }`}
          >
            {p.is_open ? M.open : M.closed}
          </span>
        </div>
        <CookDetails entry={entry} cityName={cityName} layout="inline" />
      </div>
      <button
        type="button"
        onClick={onOpen}
        aria-label={M.review}
        title={M.review}
        className="shrink-0 rounded-xl border border-gray-200 bg-white p-2.5 text-gray-500 hover:border-[#7a0d0d] hover:text-[#7a0d0d]"
      >
        <Eye size={18} aria-hidden="true" />
      </button>
    </article>
  )
}
