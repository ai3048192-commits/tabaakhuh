/**
 * Driver-review shapes. Field names mirror `admin-dashboard-api.md` Phase 3.
 * Unlike the cook queue, `GET /admin/drivers/pending` returns a flat array of
 * these objects (no wrapper, no nested contract).
 */

export interface DriverApplication {
  id: number
  /**
   * Applicant's display name. The current `GET /admin/drivers/pending` payload
   * does not carry it (see `admin-dashboard-api.md` Phase 3); when the backend
   * starts sending it, the review UI shows it in place of the `#id` label.
   */
  name?: string | null
  vehicle_type: string
  vehicle_model: string
  vehicle_year: number
  vehicle_color: string
  vehicle_plate_no: string
  vehicle_plate_letters: string
  national_id_front_url: string | null
  national_id_back_url: string | null
  license_url: string | null
  city_id: number
  /** `YYYY-MM-DD`. Displayed as a date only — no age computation (FR-003c). */
  birth_date: string
  is_available: boolean
  /** ISO 8601. Primary queue sort key (FR-010). */
  submitted_at: string
  approval_status: 'pending' | 'approved' | 'rejected'
  rejection_reason: string | null
  rating_avg: number
  rating_count: number
}

/** The three verification images every driver application carries. */
export type DriverDocumentKind = 'id_front' | 'id_back' | 'license'

export interface DocumentRef {
  kind: DriverDocumentKind
  url: string | null
  label: string
}

export type DecisionOutcome =
  | { ok: true; message: string }
  | { ok: false; reason: 'not_pending'; message: string }
  | { ok: false; reason: 'not_found' }
  | { ok: false; reason: 'transient' }
  | { ok: false; reason: 'validation'; message: string }

export type CardStatus = 'idle' | 'confirming' | 'submitting' | 'error'
