/**
 * Complaints & Suggestions shapes (`/admin/complaints*`). The screen lists
 * the people who wrote in (`/admin/complaints/senders`); opening one lists
 * everything they sent (`/admin/complaints?user_id=`).
 */

export type ComplaintType = 'complaint' | 'suggestion'
export type ComplaintStatus = 'open' | 'resolved'
export type SenderRole = 'customer' | 'cook' | 'driver'

/** Who sent a message — null when the account no longer exists. */
export interface ComplaintSenderRef {
  id: number
  name: string | null
  role: SenderRole
  avatar_url: string | null
}

/** One row in the list. */
export interface Complaint {
  id: number
  type: ComplaintType
  subject: string
  body: string
  customer_id: number
  sender: ComplaintSenderRef | null
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

/** One row of `GET /admin/complaints/senders` — a person and their counts. */
export interface ComplaintSender {
  user_id: number
  name: string | null
  role: SenderRole | null
  avatar_url: string | null
  total: number
  /** Still open (open or pending). */
  open_count: number
  complaints_count: number
  suggestions_count: number
  /** ISO 8601 — their latest message. */
  last_at: string | null
}

export interface Paged<T> {
  items: T[]
  page: number
  per_page: number
  total: number
}

export type ComplaintsPage = Paged<Complaint>
export type SendersPage = Paged<ComplaintSender>

export interface ComplaintsFilters {
  type: ComplaintType | 'all'
  status: ComplaintStatus | 'all'
  role: SenderRole | 'all'
}

export type ComplaintsScreenStatus = 'loading' | 'ready' | 'error'
