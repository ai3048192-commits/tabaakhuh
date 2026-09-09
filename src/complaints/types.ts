/**
 * Complaints & Suggestions shapes.
 *
 * ⚠️ PROVISIONAL CONTRACT — `/admin/complaints*` is not yet in
 * `admin-dashboard-api.md`. Shapes follow the proposal in
 * `backend-requirements.md` §ب and may change when the backend spec is finalised.
 */

export type ComplaintType = 'complaint' | 'suggestion'
export type ComplaintStatus = 'open' | 'resolved'

/** One row in the list. */
export interface Complaint {
  id: number
  type: ComplaintType
  subject: string
  body: string
  customer_id: number
  order_id: number | null
  status: ComplaintStatus
  /** ISO 8601. */
  created_at: string
}

/** One message in a complaint's thread (from `GET /admin/complaints/{id}`). */
export interface ThreadMessage {
  id: number
  author: 'customer' | 'admin'
  body: string
  created_at: string
}

/** `GET /admin/complaints/{id}` payload. */
export interface ComplaintDetail extends Complaint {
  thread: ThreadMessage[]
}

export interface ComplaintsPage {
  items: Complaint[]
  page: number
  per_page: number
  total: number
}

export interface ComplaintsFilters {
  type: ComplaintType | 'all'
  status: ComplaintStatus | 'all'
}

export type ComplaintsScreenStatus = 'loading' | 'ready' | 'error'
