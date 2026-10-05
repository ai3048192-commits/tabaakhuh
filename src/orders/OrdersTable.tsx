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
  const th = 'px-4 py-3 text-right text-xs font-bold text-gray-400'
  return (
    <div className="overflow-x-auto rounded-3xl bg-white shadow-[0_18px_40px_-30px_rgba(122,13,13,0.45)] ring-1 ring-[#efe3cc]">
      <table className="w-full min-w-[900px] border-collapse">
        <thead className="bg-[#fffaf1]">
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
