import { authedRequest } from '../api/httpClient'
import { buildOrdersQuery } from './ordersQuery'
import type { Order, OrderPage, OrdersQuery } from './types'

/** `GET /admin/orders/{id}` → the order in full (people, address, timeline, quote). */
export function getOrder(id: number, signal?: AbortSignal): Promise<Order> {
  return authedRequest<Order>(`/admin/orders/${id}`, { signal })
}

/**
 * `GET /admin/orders?<query>` → the paginated `{ items, page, per_page, total }`
 * envelope. Propagates `ApiError` (422 / 0 / 5xx) unchanged; never handles 401.
 * Orders Oversight is read-only.
 */
export function listOrders(query: OrdersQuery, signal?: AbortSignal): Promise<OrderPage> {
  return authedRequest<OrderPage>(
    `/admin/orders${buildOrdersQuery(query.filters, query.page)}`,
    { signal },
  )
}

/**
 * `POST /admin/orders/{id}/cancel` — support cancels a problem order from any
 * live status (even after the cook marked it ready or a driver took it). The
 * reason is required: it is shown to the customer and cook and kept on the
 * order's history. Returns the cancelled order. A finished order answers 409.
 */
export function cancelOrder(id: number, reason: string): Promise<Order> {
  return authedRequest<Order>(`/admin/orders/${id}/cancel`, {
    method: 'POST',
    body: { reason },
    // The server's own message is Arabic for this header — shown as is on failure.
    headers: { 'Accept-Language': 'ar' },
  })
}
