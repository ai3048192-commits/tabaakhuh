import { Pencil, Power, PowerOff } from 'lucide-react'
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
 *
 * The status control is a plain labelled button, not a switch: changing a
 * city's status goes through an explicit confirmation (FR-027), and a switch
 * would promise an immediate flip it doesn't deliver.
 */
export default function CityRow({ city, state, onEdit, onToggle }: Props) {
  const busy = state === 'submitting'
  const toggleLabel = city.is_active
    ? M.rowToggleToInactive(city.name_ar)
    : M.rowToggleToActive(city.name_ar)
  const ToggleIcon = city.is_active ? PowerOff : Power

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
            className="flex items-center gap-1 rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs font-bold text-gray-600 hover:border-brand disabled:opacity-50"
          >
            <Pencil size={13} aria-hidden="true" />
            {M.editCity}
          </button>
          <button
            type="button"
            aria-label={toggleLabel}
            aria-busy={busy}
            disabled={busy}
            onClick={() => onToggle(city)}
            className={`flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-xs font-bold transition disabled:opacity-50 ${
              city.is_active
                ? 'border-gray-200 text-gray-600 hover:border-amber-400 hover:text-amber-700'
                : 'border-gray-200 text-gray-600 hover:border-emerald-400 hover:text-emerald-700'
            }`}
          >
            <ToggleIcon size={13} aria-hidden="true" />
            {city.is_active ? M.rowDeactivate : M.rowActivate}
          </button>
        </div>
      </td>
    </tr>
  )
}
