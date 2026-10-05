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
