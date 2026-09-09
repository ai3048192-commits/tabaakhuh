/**
 * Cook-review shapes. Field names mirror `admin-dashboard-api.md` Phase 2.
 */

export interface CookApplication {
  id: number
  store_name: string
  /**
   * Cook's personal name (distinct from `store_name`). The current
   * `GET /admin/cooks/pending` payload does not carry it (see
   * `admin-dashboard-api.md` Phase 2); when the backend starts sending it, the
   * review UI shows it alongside the store name.
   */
  name?: string | null
  bio: string
  avatar_url: string | null
  national_id_front_url: string | null
  national_id_back_url: string | null
  banner_url: string | null
  city_id: number
  area: string
  address_text: string
  lat: number
  lng: number
  delivery_radius_km: number
  is_open: boolean
  approval_status: 'pending' | 'approved' | 'rejected'
  rejection_reason: string | null
  rating_avg: number
  rating_count: number
}

export interface SignedContract {
  template_version: string
  signed_file_url: string
  /** ISO 8601. Primary queue sort key (FR-011). */
  signed_at: string
}

/** One row of `GET /admin/cooks/pending`. */
export interface RawPendingCook {
  cook_profile: CookApplication
  contract: SignedContract | null
}

export interface PendingCookEntry {
  profile: CookApplication
  contract: SignedContract | null
}

export type DocumentKind = 'id_front' | 'id_back' | 'avatar' | 'banner' | 'contract'

export interface DocumentRef {
  kind: DocumentKind
  url: string | null
  label: string
}

export type DecisionOutcome =
  | { ok: true; storeName: string }
  | { ok: false; reason: 'not_pending'; message: string }
  | { ok: false; reason: 'not_found' }
  | { ok: false; reason: 'transient' }

export type CardStatus = 'idle' | 'confirming' | 'submitting' | 'error'
