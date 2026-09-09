import OrderRow from './OrderRow'
import { orderMessages as M } from './messages'
import type { Order } from './types'

/** The oversight table. Scrolls inside its own container, not the page (FR-034). */
export default function OrdersTable({
  items,
  onOpenDetail,
}: {
  items: Order[]
  onOpenDetail: (order: Order) => void
}) {
  const th = 'px-3 py-2 text-right text-xs font-black text-gray-500'
  return (
    <div className="overflow-x-auto rounded-2xl border border-gray-100 bg-white">
      <table className="w-full min-w-[900px] border-collapse">
        <thead className="border-b border-gray-100 bg-gray-50">
          <tr>
            <th scope="col" className={th}>{M.colOrderNumber}</th>
            <th scope="col" className={th}>{M.colCook}</th>
            <th scope="col" className={th}>{M.colType}</th>
            <th scope="col" className={th}>{M.colStatus}</th>
            <th scope="col" className={th}>{M.colRequestedDelivery}</th>
            <th scope="col" className={th}>{M.colSubtotal}</th>
            <th scope="col" className={th}>{M.colDeliveryFee}</th>
            <th scope="col" className={th}>{M.colTotal}</th>
            <th scope="col" className={th}>{M.colActions}</th>
          </tr>
        </thead>
        <tbody>
          {items.map((o) => (
            <OrderRow key={o.id} order={o} onOpenDetail={onOpenDetail} />
          ))}
        </tbody>
      </table>
    </div>
  )
}
