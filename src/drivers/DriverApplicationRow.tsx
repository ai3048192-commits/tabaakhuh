import { Eye } from 'lucide-react'
import { driverMessages as M } from './messages'
import { DriverDetails } from './driverDetail'
import type { DriverApplication } from './types'

interface Props {
  entry: DriverApplication
  cityName: string
  /** Open the full-screen review screen for this application. */
  onOpen: () => void
}

/**
 * One line of the pending-driver queue: identity/vehicle facts at a glance plus
 * an "eye" action that opens the review screen where the decision is made.
 * Approve/reject live only on that screen, not on the row.
 */
export default function DriverApplicationRow({ entry, cityName, onOpen }: Props) {
  return (
    <article className="flex items-start gap-3 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
      <div className="min-w-0 flex-1">
        <div className="mb-2 flex items-center gap-2">
          <h3 className="truncate text-sm font-black text-gray-800">
            {M.driverName(entry.name, entry.id)}
          </h3>
          {entry.name && entry.name.trim() && (
            <span className="shrink-0 text-[11px] text-gray-400">{M.driverLabel(entry.id)}</span>
          )}
          <span
            className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-bold ${
              entry.is_available ? 'bg-green-50 text-green-600' : 'bg-gray-100 text-gray-500'
            }`}
          >
            {entry.is_available ? M.available : M.unavailable}
          </span>
        </div>
        <DriverDetails entry={entry} cityName={cityName} layout="inline" />
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
