import { Eye } from 'lucide-react'
import OrderTypeBadge from './OrderTypeBadge'
import OrderStatusBadge from './OrderStatusBadge'
import { formatOrderDate } from './cairoDates'
import { orderMessages as M } from './messages'
import type { Order } from './types'

/** One row of the oversight table. Read-only — the only action is "view details". */
export default function OrderRow({
  order,
  onOpenDetail,
}: {
  order: Order
  onOpenDetail: (order: Order) => void
}) {
  const td = 'px-3 py-3 align-middle text-sm text-gray-700'
  const cookName = order.cook_name?.trim() || M.unknownCook
  return (
    <tr className="border-b border-gray-100 last:border-0">
      <td className={`${td} font-bold text-gray-900`} dir="ltr">
        {order.order_number}
      </td>
      <td className={td}>
        <span className="flex items-center gap-2">
          {order.cook_avatar_url ? (
            <img
              src={order.cook_avatar_url}
              alt=""
              className="h-7 w-7 rounded-full object-cover"
            />
          ) : (
            <span
              aria-hidden="true"
              className="flex h-7 w-7 items-center justify-center rounded-full bg-gray-100 text-xs font-bold text-gray-400"
            >
              {cookName.slice(0, 1)}
            </span>
          )}
          {cookName}
        </span>
      </td>
      <td className={td}>
        <OrderTypeBadge type={order.type} />
      </td>
      <td className={td}>
        <OrderStatusBadge status={order.status} />
      </td>
      <td className={td} dir="ltr">
        {formatOrderDate(order.requested_delivery_date)} · {order.delivery_time_slot}
      </td>
      <td className={td} dir="ltr">
        {M.currency(order.subtotal)}
      </td>
      <td className={td} dir="ltr">
        {M.currency(order.delivery_fee)}
      </td>
      <td className={`${td} font-bold text-gray-900`} dir="ltr">
        {M.currency(order.total)}
      </td>
      <td className={td}>
        <button
          type="button"
          onClick={() => onOpenDetail(order)}
          className="inline-flex items-center gap-1 rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-xs font-bold text-[#7a0d0d]"
        >
          <Eye size={13} aria-hidden="true" />
          {M.viewDetails}
        </button>
      </td>
    </tr>
  )
}
