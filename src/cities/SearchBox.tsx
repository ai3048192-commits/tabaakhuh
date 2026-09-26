import { useId } from 'react'
import { Search, X } from 'lucide-react'
import { cityMessages as M } from './messages'

interface Props {
  value: string
  onChange: (v: string) => void
}

/**
 * Labelled client-side filter input for the cities list (FR-042 / FR-043).
 * No debounce — the list is small and filtering is in-memory. A clear button
 * appears while the box is non-empty.
 */
export default function SearchBox({ value, onChange }: Props) {
  const id = useId()
  return (
    <div>
      <label htmlFor={id} className="mb-1 block text-xs font-bold text-gray-500">
        {M.searchLabel}
      </label>
      <div className="relative">
        <Search
          size={15}
          aria-hidden="true"
          className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
        />
        <input
          id={id}
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full rounded-xl border border-gray-200 bg-white py-2.5 pr-9 pl-9 text-sm focus-visible:outline-2 focus-visible:outline-[#7a0d0d]"
        />
        {value !== '' && (
          <button
            type="button"
            onClick={() => onChange('')}
            aria-label={M.searchClear}
            className="absolute left-2 top-1/2 -translate-y-1/2 rounded-lg p-1 text-gray-400 hover:bg-gray-100"
          >
            <X size={14} aria-hidden="true" />
          </button>
        )}
      </div>
    </div>
  )
}
