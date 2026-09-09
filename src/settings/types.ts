/**
 * Platform Settings shapes — `admin-dashboard-api.md` §6 (backend branch
 * `feat/admin-users-management`, commit f3f1dd0). `GET /admin/settings` returns
 * all 15 keys type-resolved; `PUT /admin/settings` is partial (any subset,
 * ≥1 key). Client-only shapes — the dashboard's in-memory view, not DB rows.
 */

/** The whole settings object, from `GET /admin/settings` and `PUT /admin/settings`. */
export interface PlatformSettings {
  delivery_fee: number
  commission_percent: number
  min_order_total: number
  first_order_discount_enabled: boolean
  cashback_enabled: boolean
  store_name: string | null
  support_email: string | null
  support_phone: string | null
  logo_url: string | null
  icon_url: string | null
  notif_push_enabled: boolean
  notif_new_orders_enabled: boolean
  notif_sms_cooks_enabled: boolean
  notif_order_status_enabled: boolean
  default_delivery_radius_km: number | null
}

/** A partial update — any subset of {@link PlatformSettings}, at least one key. */
export type SettingsPatch = Partial<PlatformSettings>

/** Result of a failed client-side fee-field check; `null` means the input is acceptable. */
export type FeeError =
  | 'required'
  | 'not_a_number'
  | 'negative'
  | 'too_many_decimals'
  | null

export interface FeeValidation {
  /** The parsed amount when `error === null`; also populated for `negative` / `too_many_decimals`. */
  value: number | null
  error: FeeError
}

/**
 * Outcome of a save attempt. `validation` covers both a client pre-submit block
 * and a backend `422`; `transient` covers offline / `5xx` / any unexpected status.
 * There is no `not_found` — `/admin/settings` is a singleton.
 */
export type SettingsMutationOutcome =
  | { ok: true; message: string }
  | { ok: false; reason: 'validation'; message: string }
  | { ok: false; reason: 'transient' }

export type SettingsStatus = 'loading' | 'ready' | 'error'
