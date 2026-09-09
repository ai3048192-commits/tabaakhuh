import { authedRequest } from '../api/httpClient'
import { buildOrdersQuery } from './ordersQuery'
import type { OrderPage, OrdersQuery } from './types'

/**
 * `GET /admin/orders?<query>` → the paginated `{ items, page, per_page, total }`
 * envelope. Propagates `ApiError` (422 / 0 / 5xx) unchanged; never handles 401.
 * This is the only call this feature makes — Orders Oversight is read-only.
 */
export function listOrders(query: OrdersQuery, signal?: AbortSignal): Promise<OrderPage> {
  return authedRequest<OrderPage>(
    `/admin/orders${buildOrdersQuery(query.filters, query.page)}`,
    { signal },
  )
}
