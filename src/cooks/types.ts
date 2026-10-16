import type { Applicant } from '../review/types'

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
  /** From the row's `applicant` — the cook's contact details. */
  phone?: string | null
  email?: string | null
  bio: string
  /**
   * Where the cook receives custom-order deposits (spec 068). Optional — shown
   * only when the cook payload carries them.
   */
  payment_vodafone_cash_number?: string | null
  payment_instapay_address?: string | null
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
  /** Short-lived link that opens the file in place (viewer / new tab). */
  signed_file_url: string | null
  /** Same file as a download. Absent on older API builds. */
  download_url?: string | null
  /** What the file is, from its uploaded type — the URL often can't say. */
  file_kind?: 'pdf' | 'image'
  /** ISO 8601. Primary queue sort key (FR-011). */
  signed_at: string
  /**
   * `digital` = read and signed inside the app (the file is the PDF the
   * server generated, and the signer fields below are set); `upload` = a
   * paper contract signed by hand and uploaded. Absent on older API builds.
   */
  signing_method?: 'digital' | 'upload'
  signer_name?: string | null
  signer_national_id?: string | null
  /** SHA-256 of the exact text she signed — printed on the PDF too. */
  content_hash?: string | null
  signer_ip?: string | null
  signer_device?: string | null
  signer_app_version?: string | null
  /** Keys of the clauses she ticked. */
  acknowledgements?: string[]
}

/** One row of `GET /admin/cooks/pending`. */
export interface RawPendingCook {
  cook_profile: CookApplication
  contract: SignedContract | null
  /** The account behind the application (absent on older API builds). */
  applicant?: Applicant | null
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
  /** How to render it, when the backend says (the contract's `file_kind`). */
  media?: 'image' | 'pdf'
}

export type DecisionOutcome =
  | { ok: true; storeName: string }
  | { ok: false; reason: 'not_pending'; message: string }
  | { ok: false; reason: 'not_found' }
  | { ok: false; reason: 'transient' }

export type CardStatus = 'idle' | 'confirming' | 'submitting' | 'error'
