/**
 * Orders Oversight shapes. Field names mirror `admin-dashboard-api.md` Phase 7
 * (`GET /admin/orders`). Read-only feature — no request bodies, no mutations.
 */

/** The 12 order statuses, in spec order. */
export type OrderStatus =
  | 'pending'
  | 'accepted'
  | 'preparing'
  | 'ready_for_pickup'
  | 'assigned_to_driver'
  | 'picked_up'
  | 'on_the_way'
  | 'delivered'
  | 'completed'
  | 'cancelled'
  | 'pending_review'
  | 'quoted'

/** One line item within an order. */
export interface OrderItem {
  id: number
  dish_id: number
  item_name: string
  unit_price: number
  quantity: number
  line_total: number
}

/** Extra information attached to a custom order (`type === 'custom'`). Any field may be null. */
export interface CustomOrderDetails {
  occasion_type: string | null
  guest_count: number | null
  requested_dishes_text: string | null
  budget_min: number | null
  budget_max: number | null
  /** ISO 8601. */
  requested_delivery_date_time: string | null
}

/** One order from `data.items` in `GET /admin/orders`. */
export interface Order {
  id: number
  order_number: string
  customer_id: number
  cook_id: number
  /** May be `null` in practice even though the spec implies a string. */
  cook_name: string | null
  cook_avatar_url: string | null
  type: 'regular' | 'custom'
  status: OrderStatus
  delivery_address_id: number
  /** `YYYY-MM-DD`. */
  requested_delivery_date: string
  delivery_time_slot: string
  subtotal: number
  delivery_fee: number
  total: number
  customer_note: string | null
  cancel_reason: string | null
  items: OrderItem[]
  custom_details: CustomOrderDetails | null
  /** Always `null` on this screen — never read. */
  quote: unknown
  /** Always `[]` on this screen — never read. */
  status_history: unknown[]
}

/** The paginated `data` envelope. `per_page` is documented 20; read it, never hard-code. */
export interface OrderPage {
  items: Order[]
  page: number
  per_page: number
  total: number
}

/** The administrator's filter selection. `from` defaults to `daysAgoCairo(30)` in a live set. */
export interface OrderFilters {
  status: OrderStatus | 'all'
  cityId: number | null
  /** `YYYY-MM-DD` (Africa/Cairo calendar date). */
  from: string | null
  /** `YYYY-MM-DD`; `null` = open-ended. */
  to: string | null
}

/** What `listOrders()` receives. */
export interface OrdersQuery {
  filters: OrderFilters
  page: number
}

/** Result of the local from/to ordering check. */
export type DateRangeError = { code: 'from_after_to' } | null

/** Screen-level load status. */
export type OrdersStatus = 'loading' | 'ready' | 'error'

/** Which explicit empty state (if any) to show — see data-model.md §6. */
export type EmptyKind = 'none' | 'unfiltered' | 'filtered' | 'beyond-range'

/** The open order-detail modal, or `null` when none. Holds a snapshot of the order. */
export type DetailState = { order: Order } | null

/** Field-level messages from a 422 (keyed to the offending filter control). */
export interface OrderFieldError {
  status?: string
  city?: string
  from?: string
  to?: string
}
