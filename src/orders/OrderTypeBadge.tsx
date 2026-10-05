import { pillCls } from '../shared/statusTone'
import { typeLabel, TYPE_ICONS } from './orderStatus'

/** Order-type chip: icon + label, never colour-only (FR-004 / FR-035). */
export default function OrderTypeBadge({ type }: { type: 'regular' | 'custom' }) {
  const Icon = TYPE_ICONS[type]
  return (
    <span
      className={`${pillCls} ${
        type === 'custom' ? 'bg-[#b68614]/10 text-[#8f680d] ring-[#b68614]/30' : 'bg-gray-50 text-gray-600 ring-gray-200'
      }`}
    >
      <Icon size={12} aria-hidden="true" />
      {typeLabel(type)}
    </span>
  )
}
