import { isCancelled, statusLabel, STATUS_ICONS } from './orderStatus'
import type { OrderStatus } from './types'

/** Status chip: icon + label, never colour-only (FR-004 / FR-035). Cancelled is outlined distinctly. */
export default function OrderStatusBadge({ status }: { status: OrderStatus }) {
  const Icon = STATUS_ICONS[status]
  const cancelled = isCancelled(status)
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-xs font-bold ${
        cancelled
          ? 'border-red-300 bg-red-50 text-red-700 ring-1 ring-red-200'
          : 'border-gray-200 bg-gray-50 text-gray-700'
      }`}
    >
      <Icon size={13} aria-hidden="true" />
      {statusLabel(status)}
    </span>
  )
}
