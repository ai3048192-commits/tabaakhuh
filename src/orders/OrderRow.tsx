import { Eye, Truck } from 'lucide-react'
import { Link } from 'react-router-dom'
import OrderTypeBadge from './OrderTypeBadge'
import OrderStatusBadge from './OrderStatusBadge'
import { formatOrderDate } from './cairoDates'
import { needsDriverAssignment } from './orderStatus'
import { orderMessages as M } from './messages'
import type { Order } from './types'

/**
 * One row of the oversight table. Read-only — no mutation happens here
 * (FR-028): "view details" opens an in-page dialog, and "assign driver" (shown
 * only while the order is in the delivery pipeline) is a plain navigation to
 * the `/delivery` screen, which owns the actual assignment.
 */
export default function OrderRow({
  order,
  onOpenDetail,
}: {
  order: Order
  onOpenDetail: (order: Order) => void
}) {
  const td = 'whitespace-nowrap px-4 py-3.5 align-middle text-sm text-gray-700'
  const cookName = order.cook_name?.trim() || M.unknownCook
  return (
    <tr className="border-t border-[#f3ead9] transition hover:bg-[#fffaf1]">
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
        {formatOrderDate(order.requested_delivery_date)} · {order.delivery_time_slot ?? '—'}
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
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onOpenDetail(order)}
            className="inline-flex items-center gap-1 rounded-xl border border-[#e8dcc4] bg-white px-3 py-2 text-xs font-black text-[#7a0d0d] transition hover:bg-[#faf3e7]"
          >
            <Eye size={13} aria-hidden="true" />
            {M.viewDetails}
          </button>
          {needsDriverAssignment(order.status) && (
            <Link
              to={`/delivery?order=${order.id}`}
              className="inline-flex items-center gap-1 rounded-xl border border-[#e8dcc4] bg-white px-3 py-2 text-xs font-black text-[#7a0d0d] transition hover:bg-[#faf3e7]"
            >
              <Truck size={13} aria-hidden="true" />
              {M.assignDriver}
            </Link>
          )}
        </div>
      </td>
    </tr>
  )
}
