import { authedRequest } from '../api/httpClient'
import type {
  ActiveDelivery,
  DeliveryDriver,
  RawActiveDelivery,
  RawDeliveryDriver,
  RawDeliveryDriversResponse,
} from './types'

/** Live delivery-operations endpoints (`routes/api.php` — `AdminDeliveryController`). */

function toActiveDelivery(r: RawActiveDelivery): ActiveDelivery {
  return {
    order_id: r.order_id,
    order_number: r.order_number ?? String(r.order_id),
    status: r.status,
    cook_name: r.cook?.store_name ?? null,
    area: r.delivery_address_text,
    driver_id: r.driver?.id ?? null,
    driver_name: r.driver?.name ?? null,
    total: r.total,
    commission: r.commission,
    assigned_at: r.assigned_at,
    picked_up_at: r.picked_up_at,
  }
}

function toDeliveryDriver(r: RawDeliveryDriver): DeliveryDriver {
  return {
    id: r.id,
    name: r.full_name,
    phone: r.phone,
    city_id: r.city_id,
    is_available: r.is_available,
    is_busy: r.active_delivery_id != null,
    active_delivery_id: r.active_delivery_id,
    rating_avg: r.rating_avg,
  }
}

/** `GET /admin/delivery/active` → in-progress deliveries (nested rows, flattened here). */
export async function listActiveDeliveries(signal?: AbortSignal): Promise<ActiveDelivery[]> {
  const rows = await authedRequest<RawActiveDelivery[]>('/admin/delivery/active', { signal })
  return (rows ?? []).map(toActiveDelivery)
}

export interface DeliveryDriversResult {
  available_count: number
  busy_count: number
  drivers: DeliveryDriver[]
}

/**
 * `GET /admin/delivery/drivers?city_id=&available=` → `{ available_count,
 * busy_count, items[] }`. Optional filters narrow `items` (the counts always
 * reflect the same filter). Returns the counts plus the normalised driver list.
 */
export async function listDeliveryDrivers(
  params: { cityId?: number; available?: boolean } = {},
  signal?: AbortSignal,
): Promise<DeliveryDriversResult> {
  const sp = new URLSearchParams()
  if (params.cityId != null) sp.set('city_id', String(params.cityId))
  if (params.available != null) sp.set('available', params.available ? '1' : '0')
  const qs = sp.toString()
  const res = await authedRequest<RawDeliveryDriversResponse>(
    `/admin/delivery/drivers${qs ? `?${qs}` : ''}`,
    { signal },
  )
  return {
    available_count: res?.available_count ?? 0,
    busy_count: res?.busy_count ?? 0,
    drivers: (res?.items ?? []).map(toDeliveryDriver),
  }
}

/** `POST /admin/delivery/orders/{id}/assign` — body `{ driver_id }`. */
export function assignDriver(orderId: number, driverId: number): Promise<unknown> {
  return authedRequest<unknown>(`/admin/delivery/orders/${orderId}/assign`, {
    method: 'POST',
    body: { driver_id: driverId },
  })
}
