/**
 * Delivery Operations shapes.
 *
 * The `/admin/delivery/*` endpoints are live (`AdminDeliveryController`). The
 * list responses are nested (`cook.store_name`, `driver.name`, …); this module
 * normalises them into the flat rows the screen renders. This screen polls on a
 * manual refresh only.
 */

// --- Wire shapes: exactly what the endpoints return -----------------------

interface RawParty {
  id: number
  name: string | null
  phone: string | null
}

/** One row of `GET /admin/delivery/active` (`data` is a flat array). */
export interface RawActiveDelivery {
  order_id: number
  order_number: string | null
  status: string
  delivery_address_text: string | null
  subtotal: number
  delivery_fee: number
  total: number
  commission: number
  driver: RawParty | null
  customer: RawParty | null
  cook: { id: number; store_name: string | null } | null
  assigned_at: string | null
  picked_up_at: string | null
}

/** One `items[]` entry of `GET /admin/delivery/drivers`. */
export interface RawDeliveryDriver {
  id: number
  full_name: string | null
  phone: string | null
  city_id: number | null
  /** On-shift flag (not "free"): a driver can be on-shift and mid-delivery. */
  is_available: boolean
  /** The order this driver is currently delivering, or `null` when free. */
  active_delivery_id: number | null
  rating_avg: number
}

export interface RawDeliveryDriversResponse {
  available_count: number
  busy_count: number
  items: RawDeliveryDriver[]
}

// --- Normalised shapes the screen renders --------------------------------

export interface ActiveDelivery {
  order_id: number
  order_number: string
  /** Free-form status label from the backend (e.g. `ready_for_pickup`, `on_the_way`). */
  status: string
  /** Fulfilling cook's store name. */
  cook_name: string | null
  /** Customer's delivery area / address text. */
  area: string | null
  driver_id: number | null
  driver_name: string | null
  total: number
  /** Driver commission for this delivery, EGP (= the order's `delivery_fee`). */
  commission: number
  assigned_at: string | null
  picked_up_at: string | null
}

export interface DeliveryDriver {
  id: number
  name: string | null
  phone: string | null
  city_id: number | null
  /** On shift. */
  is_available: boolean
  /** Currently mid-delivery (has an `active_delivery_id`). */
  is_busy: boolean
  active_delivery_id: number | null
  rating_avg: number
}

export type DeliveryScreenStatus = 'loading' | 'ready' | 'error'
