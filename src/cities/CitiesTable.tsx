import CityRow from './CityRow'
import { cityMessages as M } from './messages'
import type { City, RowState } from './types'

interface Props {
  cities: City[]
  rowState: (id: number) => RowState
  onEdit: (city: City) => void
  onToggle: (city: City) => void
}

/** Semantic table of the (filtered) cities. Scrolls inside its own container. */
export default function CitiesTable({ cities, rowState, onEdit, onToggle }: Props) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-gray-100 bg-white">
      <table className="w-full min-w-[34rem] text-right">
        <thead>
          <tr className="border-b border-gray-200 bg-gray-50 text-xs font-bold text-gray-500">
            <th scope="col" className="px-4 py-3">
              {M.colNameAr}
            </th>
            <th scope="col" className="px-4 py-3">
              {M.colNameEn}
            </th>
            <th scope="col" className="px-4 py-3">
              {M.colStatus}
            </th>
            <th scope="col" className="px-4 py-3">
              {M.colActions}
            </th>
          </tr>
        </thead>
        <tbody>
          {cities.map((c) => (
            <CityRow
              key={c.id}
              city={c}
              state={rowState(c.id)}
              onEdit={onEdit}
              onToggle={onToggle}
            />
          ))}
        </tbody>
      </table>
    </div>
  )
}
