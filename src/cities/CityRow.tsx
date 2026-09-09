import { Pencil } from 'lucide-react'
import CityStatusBadge from './CityStatusBadge'
import { cityMessages as M } from './messages'
import type { City, RowState } from './types'

interface Props {
  city: City
  state: RowState
  onEdit: (city: City) => void
  onToggle: (city: City) => void
}

/**
 * One row: Arabic name, English name (LTR cell), status badge, and the Edit +
 * activate/deactivate controls. There is no delete control (FR-026).
 */
export default function CityRow({ city, state, onEdit, onToggle }: Props) {
  const busy = state === 'submitting'
  const toggleLabel = city.is_active
    ? M.rowToggleToInactive(city.name_ar)
    : M.rowToggleToActive(city.name_ar)

  return (
    <tr className="border-b border-gray-100 last:border-0">
      <td className="px-4 py-3 text-sm font-bold text-gray-800">{city.name_ar}</td>
      <td className="px-4 py-3 text-sm text-gray-600" dir="ltr">
        {city.name_en}
      </td>
      <td className="px-4 py-3">
        <CityStatusBadge active={city.is_active} />
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => onEdit(city)}
            disabled={busy}
            aria-label={M.editLabel(city.name_ar)}
            className="flex items-center gap-1 rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs font-bold text-gray-600 hover:border-[#7a0d0d] disabled:opacity-50"
          >
            <Pencil size={13} aria-hidden="true" />
            {M.editCity}
          </button>
          <button
            type="button"
            role="switch"
            aria-checked={city.is_active}
            aria-label={toggleLabel}
            aria-busy={busy}
            disabled={busy}
            onClick={() => onToggle(city)}
            className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors disabled:opacity-50 ${
              city.is_active ? 'bg-green-600' : 'bg-gray-300'
            }`}
          >
            <span
              className={`inline-block h-5 w-5 rounded-full bg-white shadow transition-transform ${
                city.is_active ? 'translate-x-1' : 'translate-x-5'
              }`}
            />
          </button>
        </div>
      </td>
    </tr>
  )
}
