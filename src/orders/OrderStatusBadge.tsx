import { pillCls, statusTone } from '../shared/statusTone'
import { statusLabel, STATUS_ICONS } from './orderStatus'
import type { OrderStatus } from './types'

/** Status chip: icon + label, never colour-only (FR-004 / FR-035); the colour groups the lifecycle stage. */
export default function OrderStatusBadge({ status }: { status: OrderStatus }) {
  const Icon = STATUS_ICONS[status]
  return (
    <span className={`${pillCls} ${statusTone(status)}`}>
      <Icon size={12} aria-hidden="true" />
      {statusLabel(status)}
    </span>
  )
}
