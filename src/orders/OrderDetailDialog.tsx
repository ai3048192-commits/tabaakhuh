import { useEffect, useRef } from 'react'
import { X } from 'lucide-react'
import DialogShell from '../shared/DialogShell'
import OrderTypeBadge from './OrderTypeBadge'
import OrderStatusBadge from './OrderStatusBadge'
import { isCancelled } from './orderStatus'
import { formatOrderDate, formatOrderDateTime } from './cairoDates'
import { orderMessages as M } from './messages'
import type { Order } from './types'

function Line({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 py-1 text-sm">
      <span className="font-bold text-gray-500">{label}</span>
      <span className="text-gray-800" dir="auto">
        {value}
      </span>
    </div>
  )
}

/**
 * Read-only order detail, shown as a centred modal over the list. Built entirely
 * from the in-memory `Order` — no per-order request (FR-019..FR-027, SC-013a).
 * `quote` and `status_history` are never rendered; a later phase fills the slot
 * marked below (FR-026 / FR-026a).
 */
export default function OrderDetailDialog({
  order,
  onClose,
}: {
  order: Order
  onClose: () => void
}) {
  const closeRef = useRef<HTMLButtonElement>(null)
  useEffect(() => {
    closeRef.current?.focus()
  }, [])

  const cd = order.custom_details
  const showCustom = order.type === 'custom' && cd != null
  const budget =
    cd && (cd.budget_min != null || cd.budget_max != null)
      ? `${cd.budget_min ?? '—'} – ${cd.budget_max ?? '—'}`
      : null

  return (
    <DialogShell label={M.detailTitle(order.order_number)} onDismiss={onClose}>
      <div className="max-h-[80vh] overflow-y-auto">
        <div className="mb-3 flex items-start justify-between gap-3">
          <div>
            <p className="text-base font-black text-gray-900" dir="ltr">
              {order.order_number}
            </p>
            <p className="mt-1 text-sm text-gray-600">
              {order.cook_name?.trim() || M.unknownCook}
            </p>
          </div>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label={M.close}
            className="rounded-lg p-1 text-gray-400 hover:bg-gray-100"
          >
            <X size={18} aria-hidden="true" />
          </button>
        </div>

        <div className="mb-3 flex flex-wrap gap-2">
          <OrderTypeBadge type={order.type} />
          <OrderStatusBadge status={order.status} />
        </div>

        <div className="mb-3 border-t border-gray-100 pt-3">
          <Line
            label={M.colRequestedDelivery}
            value={`${formatOrderDate(order.requested_delivery_date)} · ${order.delivery_time_slot}`}
          />
          <Line label={M.customerLabel} value={String(order.customer_id)} />
          <Line label={M.addressLabel} value={String(order.delivery_address_id)} />
        </div>

        <div className="mb-3 border-t border-gray-100 pt-3">
          <Line label={M.colSubtotal} value={M.currency(order.subtotal)} />
          <Line label={M.colDeliveryFee} value={M.currency(order.delivery_fee)} />
          <Line label={M.colTotal} value={M.currency(order.total)} />
        </div>

        <div className="mb-3 border-t border-gray-100 pt-3">
          <p className="mb-2 text-xs font-black text-gray-500">{M.lineItems}</p>
          {order.items.length === 0 ? (
            <p className="text-sm text-gray-500">{M.noLineItems}</p>
          ) : (
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="text-right text-xs text-gray-400">
                  <th scope="col" className="py-1 font-bold">{M.colItemName}</th>
                  <th scope="col" className="py-1 font-bold">{M.colUnitPrice}</th>
                  <th scope="col" className="py-1 font-bold">{M.colQty}</th>
                  <th scope="col" className="py-1 font-bold">{M.colLineTotal}</th>
                </tr>
              </thead>
              <tbody>
                {order.items.map((it) => (
                  <tr key={it.id} className="border-t border-gray-50">
                    <td className="py-1.5">{it.item_name}</td>
                    <td className="py-1.5" dir="ltr">{M.currency(it.unit_price)}</td>
                    <td className="py-1.5" dir="ltr">{it.quantity}</td>
                    <td className="py-1.5" dir="ltr">{M.currency(it.line_total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {order.customer_note && order.customer_note.trim() !== '' && (
          <div className="mb-3 border-t border-gray-100 pt-3">
            <p className="mb-1 text-xs font-black text-gray-500">{M.customerNote}</p>
            <p className="text-sm text-gray-700">{order.customer_note}</p>
          </div>
        )}

        {isCancelled(order.status) && order.cancel_reason && order.cancel_reason.trim() !== '' && (
          <div className="mb-3 border-t border-gray-100 pt-3">
            <p className="mb-1 text-xs font-black text-red-600">{M.cancelReason}</p>
            <p className="text-sm text-gray-700">{order.cancel_reason}</p>
          </div>
        )}

        {showCustom && cd && (
          <div className="mb-1 border-t border-gray-100 pt-3">
            <p className="mb-2 text-xs font-black text-gray-500">{M.customDetails}</p>
            {cd.occasion_type != null && <Line label={M.occasionType} value={cd.occasion_type} />}
            {cd.guest_count != null && <Line label={M.guestCount} value={String(cd.guest_count)} />}
            {cd.requested_dishes_text != null && (
              <Line label={M.requestedDishes} value={cd.requested_dishes_text} />
            )}
            {budget != null && <Line label={M.budgetRange} value={budget} />}
            {cd.requested_delivery_date_time != null && (
              <Line
                label={M.requestedDeliveryDateTime}
                value={formatOrderDateTime(cd.requested_delivery_date_time)}
              />
            )}
          </div>
        )}

        {/* FR-026a: status timeline + price quote — populated in a later phase from
            the shared order-details endpoint. Intentionally renders nothing now. */}
      </div>
    </DialogShell>
  )
}
