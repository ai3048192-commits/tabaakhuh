import { typeLabel, TYPE_ICONS } from './orderStatus'

/** Order-type chip: icon + label, never colour-only (FR-004 / FR-035). */
export default function OrderTypeBadge({ type }: { type: 'regular' | 'custom' }) {
  const Icon = TYPE_ICONS[type]
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-xs font-bold ${
        type === 'custom'
          ? 'border-amber-300 bg-amber-50 text-amber-800'
          : 'border-gray-200 bg-white text-gray-600'
      }`}
    >
      <Icon size={13} aria-hidden="true" />
      {typeLabel(type)}
    </span>
  )
}
