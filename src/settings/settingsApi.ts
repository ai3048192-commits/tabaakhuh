import { authedRequest } from '../api/httpClient'
import type { PlatformSettings, SettingsPatch } from './types'

/**
 * The defaults the backend applies for an unset key (`admin-dashboard-api.md`
 * §6.1). Used to fill any key a `GET` omits so the UI always has a complete,
 * well-typed object to bind to.
 */
const DEFAULTS: PlatformSettings = {
  delivery_fee: 0,
  commission_percent: 0,
  min_order_total: 0,
  first_order_discount_enabled: false,
  cashback_enabled: false,
  store_name: null,
  support_email: null,
  support_phone: null,
  logo_url: null,
  icon_url: null,
  notif_push_enabled: true,
  notif_new_orders_enabled: true,
  notif_sms_cooks_enabled: true,
  notif_order_status_enabled: true,
  default_delivery_radius_km: null,
}

function normalize(raw: Partial<PlatformSettings> | null | undefined): PlatformSettings {
  return { ...DEFAULTS, ...(raw ?? {}) }
}

/** `GET /admin/settings` → the full settings object. Propagates `ApiError`; never handles `401`. */
export async function getSettings(signal?: AbortSignal): Promise<PlatformSettings> {
  return normalize(await authedRequest<Partial<PlatformSettings>>('/admin/settings', { signal }))
}

/**
 * `PUT /admin/settings` — partial update: send only the keys that changed
 * (numbers as JS numbers, never strings). Resolves with the full updated object
 * on `200`. Propagates `ApiError`.
 */
export async function updateSettings(patch: SettingsPatch): Promise<PlatformSettings> {
  return normalize(
    await authedRequest<Partial<PlatformSettings>>('/admin/settings', {
      method: 'PUT',
      body: patch,
    }),
  )
}
