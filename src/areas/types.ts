/**
 * A delivery area inside a city (e.g. مدينة نصر inside القاهرة), from
 * `GET /admin/areas?city_id=`. `delivery_fee` is the flat price the platform
 * contracted with its drivers for that area — every delivered order to an
 * address in it is charged exactly this, and it's what the customer (cart),
 * the cook (order) and the driver (offer) all see.
 */
export interface Area {
  id: number
  city_id: number
  name_ar: string
  name_en: string
  delivery_fee: number
  is_active: boolean
}

/** `POST /admin/areas` body. */
export interface NewAreaInput {
  city_id: number
  name_ar: string
  name_en: string
  delivery_fee: number
}

/** `PUT /admin/areas/{id}` body — any subset, at least one field. */
export type AreaChanges = Partial<Pick<NewAreaInput, 'name_ar' | 'name_en' | 'delivery_fee'>>

/** Result of a create / edit / status-change attempt. */
export type AreaMutationOutcome =
  | { ok: true }
  | {
      ok: false
      reason: 'validation'
      fieldErrors: { name_ar?: string; name_en?: string; delivery_fee?: string }
      message: string
    }
  | { ok: false; reason: 'not_found' }
  | { ok: false; reason: 'transient' }

export type LoadStatus = 'loading' | 'ready' | 'error'
