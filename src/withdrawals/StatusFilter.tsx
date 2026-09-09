import { withdrawalMessages as M } from './messages'
import type { StatusFilter as SF } from './types'

const OPTIONS: { value: SF; label: string }[] = [
  { value: 'all', label: M.filterAll },
  { value: 'pending', label: M.filterPending },
  { value: 'approved', label: M.filterApproved },
  { value: 'rejected', label: M.filterRejected },
  { value: 'paid', label: M.filterPaid },
]

/** The status filter — a labelled segmented group; the active value is `aria-pressed`. */
export default function StatusFilter({
  value,
  onChange,
}: {
  value: SF
  onChange: (next: SF) => void
}) {
  return (
    <div
      role="group"
      aria-label={M.colStatus}
      className="flex flex-wrap gap-1 rounded-xl border border-gray-200 bg-white p-1"
    >
      {OPTIONS.map((o) => {
        const active = o.value === value
        return (
          <button
            key={o.value}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(o.value)}
            className={`rounded-lg px-3 py-1.5 text-xs font-bold ${
              active ? 'bg-[#7a0d0d] text-white' : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            {o.label}
          </button>
        )
      })}
    </div>
  )
}
