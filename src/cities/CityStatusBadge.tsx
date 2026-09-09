import { CheckCircle2, Circle } from 'lucide-react'
import { cityMessages as M } from './messages'

/**
 * Active / inactive indicator. Status is carried by the text label **and** a
 * distinct icon (filled check vs empty circle), never by colour alone
 * (FR-003 / FR-041 / SC-007).
 */
export default function CityStatusBadge({ active }: { active: boolean }) {
  const Icon = active ? CheckCircle2 : Circle
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold ${
        active ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-500'
      }`}
    >
      <Icon size={13} aria-hidden="true" />
      {active ? M.statusActive : M.statusInactive}
    </span>
  )
}
